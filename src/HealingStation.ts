import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseMesh } from './BaseMesh';
import { HealingSystem } from './systems/HealingSystem';
import { IHealingStation } from './systems/IHealingStation';

/**
 * HealingStation entity with upward-moving particle effects
 * Particles rise straight up (not spinning) at a slower speed
 * Particle speed increases during healing
 */
export class HealingStation extends BaseMesh implements IHealingStation {
    particles: THREE.Points;
    particleSystem: {
        positions: Float32Array;
        velocities: Float32Array;
        lifetimes: Float32Array;
        sizes: Float32Array;
        count: number;
    };
    color: THREE.Color;
    isHealing: boolean = false;

    private readonly PARTICLE_COUNT = 300;
    private readonly RING_RADIUS = 1.3; // Size
    private readonly PARTICLE_LIFETIME = 1.5; // seconds
    private readonly NORMAL_RISE_SPEED = 0.6; // Default rise speed
    private readonly HEALING_RISE_SPEED = 1.8; // Faster rise speed during healing
    private readonly MAX_PARTICLE_SIZE = 0.5;
    private readonly MAX_DELTA_TIME = 0.1; // Cap delta time to prevent particle synchronization
    private readonly CAMERA_FOV_RADIANS = (45 * Math.PI) / 180; // 45 degrees in radians
    private time: number = 0;

    constructor(scene: THREE.Scene, position: CANNON.Vec3) {
        super('models/healing_station.glb');
        this.color = new THREE.Color(0x00ff00);
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Initialize particle system
        this.particleSystem = {
            positions: new Float32Array(this.PARTICLE_COUNT * 3),
            velocities: new Float32Array(this.PARTICLE_COUNT * 3),
            lifetimes: new Float32Array(this.PARTICLE_COUNT),
            sizes: new Float32Array(this.PARTICLE_COUNT),
            count: this.PARTICLE_COUNT
        };

        // Initialize particles with staggered spawn times
        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            this.resetParticle(i, true);
        }

        // Create particle geometry and material
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particleSystem.positions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.particleSystem.sizes, 1));

        // Calculate scale factor for screen-independent particle size
        const scaleFactor = this.calculateScaleFactor();

        // Custom shader material for per-particle size control
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: this.color },
                scaleFactor: { value: scaleFactor }
            },
            vertexShader: `
                attribute float size;
                uniform float scaleFactor;
                
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (scaleFactor / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    float alpha = 1.0 - (dist * 2.0);
                    alpha = alpha * alpha;
                    
                    gl_FragColor = vec4(color, alpha * 0.9);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true
        });

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(this.particles);

        // Register with healing system so it can manage player healing
        HealingSystem.Instance.register(this);
    }

    /**
     * Reset a particle to its initial state on the circle
     * @param index - Particle index
     * @param isInitialSpawn - If true, staggers the spawn time for initial setup
     */
    private resetParticle(index: number, isInitialSpawn: boolean = false): void {
        const stationPos = this.mesh.position;

        // Random angle around the circle
        const angle = Math.random() * Math.PI * 2;

        // Start at random position within the ring (with slight variation)
        const radius = Math.random() * this.RING_RADIUS;

        // Position on the ring at station height
        const i3 = index * 3;
        this.particleSystem.positions[i3] = stationPos.x + Math.cos(angle) * radius;
        this.particleSystem.positions[i3 + 1] = stationPos.y;
        this.particleSystem.positions[i3 + 2] = stationPos.z + Math.sin(angle) * radius;

        // Set lifetime with variation to prevent synchronized spawning
        if (isInitialSpawn) {
            // Stagger initial particles throughout their lifetime for smooth startup
            this.particleSystem.lifetimes[index] = Math.random() * this.PARTICLE_LIFETIME;
        } else {
            // Respawned particles start with full lifetime plus small random variation
            this.particleSystem.lifetimes[index] = this.PARTICLE_LIFETIME * (0.95 + Math.random() * 0.1);
        }

        // Initialize size to maximum
        this.particleSystem.sizes[index] = this.MAX_PARTICLE_SIZE;
    }

    /**
     * Update particle positions, lifetimes, and handle player healing
     * @param deltaTime - Time elapsed since last frame
     * @param player - Player to check for healing
     */
    update(deltaTime: number): void {
        // Cap deltaTime to prevent synchronization issues when tab is inactive
        const cappedDeltaTime = Math.min(deltaTime, this.MAX_DELTA_TIME);

        this.time += cappedDeltaTime;

        // Let BaseMesh handle mixer/animation updates
        super.update(cappedDeltaTime);

        const stationPos = this.mesh.position;

        // Choose rise speed based on healing state (managed by HealingSystem)
        const riseSpeed = this.isHealing ? this.HEALING_RISE_SPEED : this.NORMAL_RISE_SPEED;

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const i3 = i * 3;

            // Update lifetime
            this.particleSystem.lifetimes[i] -= cappedDeltaTime;

            // Reset if particle died
            if (this.particleSystem.lifetimes[i] <= 0) {
                this.resetParticle(i);
                continue;
            }

            // Calculate age factor (0 = just spawned, 1 = about to die)
            const ageFactor = 1 - (this.particleSystem.lifetimes[i] / this.PARTICLE_LIFETIME);

            // Straight upward motion (no spinning)
            const height = ageFactor * riseSpeed * this.PARTICLE_LIFETIME;

            // Rise up
            this.particleSystem.positions[i3 + 1] = stationPos.y + height;

            // Update size - decrease as particle ages
            this.particleSystem.sizes[i] = this.MAX_PARTICLE_SIZE * (1 - ageFactor);
        }

        // Update the geometry attributes
        const positionAttribute = this.particles.geometry.getAttribute('position');
        (positionAttribute as THREE.BufferAttribute).needsUpdate = true;

        const sizeAttribute = this.particles.geometry.getAttribute('size');
        if (sizeAttribute) {
            (sizeAttribute as THREE.BufferAttribute).needsUpdate = true;
        }
    }

    /**
     * Calculate the scale factor for perspective-correct particle sizing
     * Formula: viewportHeight / (2 * tan(fov/2))
     */
    private calculateScaleFactor(): number {
        return window.innerHeight / (2.0 * Math.tan(this.CAMERA_FOV_RADIANS / 2.0));
    }

    /**
     * Update the particle scale factor for screen-independent sizing
     * Should be called when window is resized
     */
    updateScaleFactor(): void {
        const scaleFactor = this.calculateScaleFactor();
        const particleMaterial = this.particles.material as THREE.ShaderMaterial;
        if (particleMaterial && particleMaterial.uniforms.scaleFactor) {
            particleMaterial.uniforms.scaleFactor.value = scaleFactor;
        }
    }

    /**
     * Clean up resources
     */
    cleanup(scene: THREE.Scene): void {
        // Unregister from healing system
        HealingSystem.Instance.unregister(this);

        scene.remove(this.mesh);
        scene.remove(this.particles);

        this.disposeMesh();

        if (this.particles.geometry) this.particles.geometry.dispose();
        const particleMaterial = this.particles.material as THREE.ShaderMaterial;
        if (particleMaterial) {
            particleMaterial.dispose();
        }
    }

    // IHealingStation implementation
    getPosition(): THREE.Vector3 {
        return this.mesh.position;
    }

    getRadius(): number {
        return this.RING_RADIUS;
    }

    setHealing(isHealing: boolean): void {
        this.isHealing = isHealing;
    }
}
