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
        alphas: Float32Array;
        count: number;
    };
    color: THREE.Color;
    destination: string;
    
    private readonly PARTICLE_COUNT = 150;
    private readonly RING_RADIUS = 1.0; // Match portal radius
    private readonly PARTICLE_LIFETIME = 3.0; // seconds
    private readonly RISE_SPEED = 1.2; // upward velocity
    private readonly SPIN_SPEED = 2.5; // radians per second
    private readonly TURBULENCE_STRENGTH = 0.2;
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
            alphas: new Float32Array(this.PARTICLE_COUNT),
            count: this.PARTICLE_COUNT
        };

        // Initialize particles
        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            this.resetParticle(i);
        }

        // Create particle geometry and material
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particleSystem.positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: this.color,
            size: 0.2,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(this.particles);
    }

    /**
     * Reset a particle to its initial state on the outer ring
     */
    private resetParticle(index: number): void {
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
        
        // Random lifetime for staggered respawn
        this.particleSystem.lifetimes[index] = Math.random() * this.PARTICLE_LIFETIME;
        
        // Initialize alpha
        this.particleSystem.alphas[index] = 1.0;
    }

    /**
     * Update particle positions and lifetimes
     */
    update(deltaTime: number): void {
        this.time += deltaTime;
        const portalPos = this.mesh.position;

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            
            // Update lifetime
            this.particleSystem.lifetimes[i] -= deltaTime;
            
            // Reset if particle died
            if (this.particleSystem.lifetimes[i] <= 0) {
                this.resetParticle(i);
                continue;
            }
            
            // Calculate age factor (0 = just spawned, 1 = about to die)
            const ageFactor = 1 - (this.particleSystem.lifetimes[i] / this.PARTICLE_LIFETIME);
            
            // Spiral upward motion
            this.particleSystem.angles[i] += this.SPIN_SPEED * deltaTime;
            const angle = this.particleSystem.angles[i];
            
            // Gradually expand radius as particle rises
            const currentRadius = this.particleSystem.radii[i] * (1 + ageFactor * 0.2);
            
            // Add turbulence using sine waves
            const turbulenceX = Math.sin(this.time * 3 + i * 0.5) * this.TURBULENCE_STRENGTH * ageFactor;
            const turbulenceZ = Math.cos(this.time * 3 + i * 0.7) * this.TURBULENCE_STRENGTH * ageFactor;
            
            // Update position
            this.particleSystem.positions[i3] = portalPos.x + Math.cos(angle) * currentRadius + turbulenceX;
            this.particleSystem.positions[i3 + 1] += this.RISE_SPEED * deltaTime;
            this.particleSystem.positions[i3 + 2] = portalPos.z + Math.sin(angle) * currentRadius + turbulenceZ;
        }

        // Update the geometry
        const positionAttribute = this.particles.geometry.getAttribute('position');
        (positionAttribute as THREE.BufferAttribute).needsUpdate = true;
    }

    /**
     * Clean up resources
     */
    cleanup(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        scene.remove(this.particles);
        
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        const meshMaterial = this.mesh.material as THREE.Material;
        if (meshMaterial && typeof meshMaterial.dispose === 'function') {
            meshMaterial.dispose();
        }
        
        if (this.particles.geometry) this.particles.geometry.dispose();
        const particleMaterial = this.particles.material as THREE.Material;
        if (particleMaterial && typeof particleMaterial.dispose === 'function') {
            particleMaterial.dispose();
        }
    }
}
