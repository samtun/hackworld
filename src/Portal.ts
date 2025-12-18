import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Portal entity with particle effects
 * Particles emit from the outer ring and spiral upward with turbulence
 */
export class Portal {
    mesh: THREE.Mesh;
    particles: THREE.Points;
    particleSystem: {
        positions: Float32Array;
        velocities: Float32Array;
        lifetimes: Float32Array;
        angles: Float32Array;
        radii: Float32Array;
        sizes: Float32Array;
        count: number;
    };
    color: THREE.Color;
    destination: string;

    private readonly PARTICLE_COUNT = 600;
    private readonly RING_RADIUS = 1.0; // Match portal radius
    private readonly PARTICLE_LIFETIME = 3.0; // seconds
    private readonly RISE_SPEED = 1.2; // upward velocity
    private readonly SPIN_SPEED = 2.5; // radians per second
    private readonly TURBULENCE_STRENGTH = 0.6;
    private readonly MAX_PARTICLE_SIZE = 0.35; // Maximum particle size
    private time: number = 0;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, color: number, destination: string) {
        this.color = new THREE.Color(color);
        this.destination = destination;

        // Create portal mesh
        const portalGeo = new THREE.CylinderGeometry(this.RING_RADIUS, this.RING_RADIUS, 0.1, 32);
        const portalMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.5
        });
        this.mesh = new THREE.Mesh(portalGeo, portalMat);
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.userData = { destination };
        scene.add(this.mesh);

        // Initialize particle system
        this.particleSystem = {
            positions: new Float32Array(this.PARTICLE_COUNT * 3),
            velocities: new Float32Array(this.PARTICLE_COUNT * 3),
            lifetimes: new Float32Array(this.PARTICLE_COUNT),
            angles: new Float32Array(this.PARTICLE_COUNT),
            radii: new Float32Array(this.PARTICLE_COUNT),
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
     * Reset a particle to its initial state on the outer ring
     * @param index - Particle index
     * @param isInitialSpawn - If true, staggers the spawn time for initial setup
     */
    private resetParticle(index: number, isInitialSpawn: boolean = false): void {
        const portalPos = this.mesh.position;

        // Random angle around the circle
        const angle = Math.random() * Math.PI * 2;
        this.particleSystem.angles[index] = angle;

        // Start at the outer edge of the ring (with slight variation)
        const radius = this.RING_RADIUS + (Math.random() - 0.5) * 0.1;
        this.particleSystem.radii[index] = radius;

        // Position on the ring at portal height
        const i3 = index * 3;
        this.particleSystem.positions[i3] = portalPos.x + Math.cos(angle) * radius;
        this.particleSystem.positions[i3 + 1] = portalPos.y;
        this.particleSystem.positions[i3 + 2] = portalPos.z + Math.sin(angle) * radius;

        // Set lifetime with variation to prevent synchronized spawning
        if (isInitialSpawn) {
            // Stagger initial particles throughout their lifetime for smooth startup
            this.particleSystem.lifetimes[index] = Math.random() * this.PARTICLE_LIFETIME;
        } else {
            // Respawned particles start with full lifetime plus small random variation
            // This prevents all particles from dying at the same time and spawning in chunks
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
        // Large deltaTime spikes (e.g. from tab switching) would cause all particles
        // to die simultaneously and respawn in chunks
        const cappedDeltaTime = Math.min(deltaTime, 0.1); // Cap at 100ms (10 FPS)

        this.time += cappedDeltaTime;
        const portalPos = this.mesh.position;

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

            // Spiral upward motion
            this.particleSystem.angles[i] += this.SPIN_SPEED * cappedDeltaTime;
            const angle = this.particleSystem.angles[i];

            // Gradually expand radius as particle rises
            const currentRadius = this.particleSystem.radii[i] * (1 + ageFactor * 0.8);

            // Add turbulence using sine waves
            const turbulenceX = Math.sin(this.time * 3 + i * 0.5) * this.TURBULENCE_STRENGTH * ageFactor;
            const turbulenceZ = Math.cos(this.time * 3 + i * 0.7) * this.TURBULENCE_STRENGTH * ageFactor;

            // Update position - calculate Y based on age factor to avoid accumulation
            this.particleSystem.positions[i3] = portalPos.x + Math.cos(angle) * currentRadius + turbulenceX;
            this.particleSystem.positions[i3 + 1] = portalPos.y + (ageFactor * this.RISE_SPEED * this.PARTICLE_LIFETIME);
            this.particleSystem.positions[i3 + 2] = portalPos.z + Math.sin(angle) * currentRadius + turbulenceZ;

            // Update size - decrease as particle ages (reaches 0 at the top)
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
