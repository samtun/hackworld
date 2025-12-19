import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * HealingStation entity with upward-moving particle effects
 * Particles rise straight up (not spinning) at a slower speed
 * Particle speed increases during healing
 */
export class HealingStation {
    mesh: THREE.Mesh;
    particles: THREE.Points;
    particleSystem: {
        positions: Float32Array;
        velocities: Float32Array;
        lifetimes: Float32Array;
        sizes: Float32Array;
        count: number;
    };
    color: THREE.Color;
    position: CANNON.Vec3;
    positionVector: THREE.Vector3; // Cached Vector3 for range checks
    isHealing: boolean = false;

    private readonly PARTICLE_COUNT = 300;
    private readonly RING_RADIUS = 1.0; // Size
    private readonly PARTICLE_LIFETIME = 1.5; // seconds
    private readonly NORMAL_RISE_SPEED = 0.6; // Default rise speed
    private readonly HEALING_RISE_SPEED = 1.8; // Faster rise speed during healing
    private readonly MAX_PARTICLE_SIZE = 0.5;
    private readonly MAX_DELTA_TIME = 0.1; // Cap delta time to prevent particle synchronization
    private time: number = 0;

    constructor(scene: THREE.Scene, position: CANNON.Vec3) {
        this.color = new THREE.Color(0x00ff00);
        this.position = position;
        this.positionVector = new THREE.Vector3(position.x, position.y, position.z);

        // Create healing station mesh (circle)
        const stationGeo = new THREE.CylinderGeometry(this.RING_RADIUS, this.RING_RADIUS, 0.1, 32);
        const stationMat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.5
        });
        this.mesh = new THREE.Mesh(stationGeo, stationMat);
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

        // Custom shader material for per-particle size control
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: this.color }
            },
            vertexShader: `
                attribute float size;
                
                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
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
     * Update particle positions and lifetimes
     */
    update(deltaTime: number): void {
        // Cap deltaTime to prevent synchronization issues when tab is inactive
        const cappedDeltaTime = Math.min(deltaTime, this.MAX_DELTA_TIME);

        this.time += cappedDeltaTime;
        const stationPos = this.mesh.position;

        // Choose rise speed based on healing state
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
     * Set healing state (changes particle rise speed)
     */
    setHealing(healing: boolean): void {
        this.isHealing = healing;
    }

    /**
     * Check if player is within the healing circle
     */
    isPlayerInRange(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(this.positionVector);
        return dist < this.RING_RADIUS;
    }

    /**
     * Clean up resources
     */
    cleanup(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        scene.remove(this.particles);

        if (this.mesh.geometry) this.mesh.geometry.dispose();
        const meshMaterial = this.mesh.material as THREE.Material;
        if (meshMaterial) {
            meshMaterial.dispose();
        }

        if (this.particles.geometry) this.particles.geometry.dispose();
        const particleMaterial = this.particles.material as THREE.ShaderMaterial;
        if (particleMaterial) {
            particleMaterial.dispose();
        }
    }
}
