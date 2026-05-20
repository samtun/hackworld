import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseMesh } from './BaseMesh';
import { HealingSystem } from './systems/HealingSystem';
import { IHealingStation } from './systems/IHealingStation';
import { createParticleShaderMaterial, updateParticleScaleFactor } from './ParticleShaderUtils';
import { AudioManager } from './AudioManager';
import { AssetManager } from './AssetManager';

/**
 * HealingStation entity with upward-moving particle effects
 * Particles rise straight up (not spinning) at a slower speed
 * Particle speed increases during healing
 */
export class HealingStation extends BaseMesh implements IHealingStation {
    world: CANNON.World;
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
    private readonly SIZE = 2.8; // Size
    private readonly PARTICLE_LIFETIME = 1.8; // seconds
    private readonly NORMAL_RISE_SPEED = 0.3; // Default rise speed
    private readonly HEALING_RISE_SPEED = 2.4; // Faster rise speed during healing
    private readonly MAX_PARTICLE_SIZE = 0.5;
    private readonly MAX_DELTA_TIME = 0.1; // Cap delta time to prevent particle synchronization
    private time: number = 0;

    constructor(scene: THREE.Scene, world: CANNON.World, physicsMaterial: CANNON.Material, position: CANNON.Vec3) {
        super('models/healing_station.glb');
        this.world = world;
        this.color = new THREE.Color(0x00AAFF);
        this.mesh.position.set(position.x, position.y, position.z);

        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.material instanceof THREE.MeshStandardMaterial && child.material.name === 'Panel') {
                    child.material.emissive = new THREE.Color(0xFFFFFF);
                    child.material.emissiveMap = child.material.map;
                    child.material.emissiveIntensity = 0.8;
                    child.material.color = this.color;
                }
            }
        });
        scene.add(this.mesh);

        // Load and add collider meshes
        const colliderGltf = AssetManager.Instance.get('models/healing_station_collider.glb');
        colliderGltf.scene.clone().traverse((child) => {
            if (child instanceof THREE.Mesh) {
                console.log('Adding healing station collider shape for', child.name);
                const body = this.createColliderFromMesh(child, physicsMaterial);
                const bodyPosition = position.clone().addScaledVector(1, new CANNON.Vec3(child.position.x, child.position.y, child.position.z));
                body.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z)
                world.addBody(body);
            }
        });

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

        // Create shader material with screen-independent particle sizing
        const particleMaterial = createParticleShaderMaterial(this.color);

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(this.particles);

        // Register with healing system so it can manage player healing
        HealingSystem.Instance.register(this);
    }

    private createColliderFromMesh(mesh: THREE.Mesh, physicsMaterial: CANNON.Material): CANNON.Body {
        const geometry = mesh.geometry;

        // 1. calculate Bounding Box (if not already done)
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;

        // 2. calculate size (Max - Min)
        const size = new THREE.Vector3();
        box.getSize(size);

        // 3. calculate half-extents considering scaling
        // Cannon needs the radius from the center to the edge
        const halfExtents = new CANNON.Vec3(
            (size.x * mesh.scale.x) / 2,
            (size.y * mesh.scale.y) / 2,
            (size.z * mesh.scale.z) / 2
        );

        const boxShape = new CANNON.Box(halfExtents);

        // 4. Create Body
        const body = new CANNON.Body({
            mass: 0, // Static
            material: physicsMaterial,
        });

        // 5. Consider offset
        // If the geometry center is not at (0,0,0),
        // we need to move the shape within the body.
        const center = new THREE.Vector3();
        box.getCenter(center);
        center.multiply(mesh.scale); // Also apply scaling to the offset

        const cannonOffset = new CANNON.Vec3(center.x, center.y, center.z);
        body.addShape(boxShape, cannonOffset);

        // 6. Synchronize world position and rotation
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        mesh.getWorldPosition(worldPos);
        mesh.getWorldQuaternion(worldQuat);

        body.position.set(worldPos.x, worldPos.y, worldPos.z);
        body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

        return body;
    }

    /**
     * Reset a particle to its initial state on the circle
     * @param index - Particle index
     * @param isInitialSpawn - If true, staggers the spawn time for initial setup
     */
    private resetParticle(index: number, isInitialSpawn: boolean = false): void {
        const stationPos = this.mesh.position;

        // Position on the ring at station height
        const i3 = index * 3;
        this.particleSystem.positions[i3] = stationPos.x + Math.random() * this.SIZE - this.SIZE / 2;
        this.particleSystem.positions[i3 + 1] = stationPos.y;
        this.particleSystem.positions[i3 + 2] = stationPos.z + Math.random() * this.SIZE - this.SIZE / 2;

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
     * Update the particle scale factor for screen-independent sizing
     * Should be called when window is resized
     */
    updateScaleFactor(): void {
        const particleMaterial = this.particles.material as THREE.ShaderMaterial;
        updateParticleScaleFactor(particleMaterial);
    }

    /**
     * Clean up resources
     */
    cleanup(scene: THREE.Scene): void {
        // Unregister from healing system
        HealingSystem.Instance.unregister(this);

        if (this.isHealing) {
            AudioManager.Instance.stopHealingStationLoop();
            this.isHealing = false;
        }

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
        return this.SIZE;
    }

    setHealing(isHealing: boolean): void {
        if (this.isHealing === isHealing) return;

        if (isHealing) {
            this.isHealing = true;
            AudioManager.Instance.startHealingStationLoop();
        } else {
            this.isHealing = false;
            AudioManager.Instance.stopHealingStationLoop();
        }
    }
}
