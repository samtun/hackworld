import * as THREE from 'three';
import { createParticleShaderMaterial, updateParticleScaleFactor } from './ParticleShaderUtils';
import { Npc } from './npcs/Npc';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Callback type for teleporter interactions
 * @param destination - The destination stage ID or 'selection' for dungeon selection
 */
export type TeleporterCallback = (destination: string) => void;

/**
 * Teleporter entity with particle effects
 * Extends Npc to provide collision and interaction hints
 * Particles emit from the teleporter and move along the Z axis
 */
export class Teleporter extends Npc {
    particles!: THREE.Points;
    particleSystem!: {
        positions: Float32Array;
        velocities: Float32Array;
        lifetimes: Float32Array;
        initialX: Float32Array;
        initialY: Float32Array;
        initialSizes: Float32Array;
        sizes: Float32Array;
        count: number;
    };
    color!: THREE.Color;

    private readonly PARTICLE_COUNT = 300;
    private readonly SPAWN_RADIUS = 2.5;
    private readonly PARTICLE_LIFETIME = 1.3; // seconds
    private readonly Z_TRAVEL_DISTANCE = 0.9;
    private readonly Z_OFFSET = 1.3;
    private readonly BASE_PARTICLE_SIZE = 0.3;
    private time: number = 0;

    private playerIsClose: boolean = false;
    private readonly INTERACTION_RANGE: number = 1.7;

    // Static callback for handling teleporter interactions
    private static teleporterCallback: TeleporterCallback | null = null;

    /**
     * Set the global teleporter callback (called by Game)
     */
    static setTeleporterCallback(callback: TeleporterCallback): void {
        Teleporter.teleporterCallback = callback;
    }

    constructor(
        scene: THREE.Scene,
        world: RAPIER.World,
        physicsMaterial: any,
        position: THREE.Vector3,
        destination: string
    ) {
        // Call Npc constructor with teleporter-specific settings
        super(
            scene,
            world,
            physicsMaterial,
            'models/teleporter.glb',
            `Teleporter_${destination}`,
            'Enter',
            position,
            [], // No dialogue for teleporters
            () => {
                // Use the static callback when interacted with
                if (Teleporter.teleporterCallback) {
                    Teleporter.teleporterCallback(destination);
                }
            }
        );

        // Store destination in mesh userData for backwards compatibility
        this.mesh.userData = { destination };

        // Blue color for particles
        this.color = new THREE.Color(0x44BBff);

        // Initialize particle system
        this.particleSystem = {
            positions: new Float32Array(this.PARTICLE_COUNT * 3),
            velocities: new Float32Array(this.PARTICLE_COUNT * 3),
            lifetimes: new Float32Array(this.PARTICLE_COUNT),
            initialX: new Float32Array(this.PARTICLE_COUNT),
            initialY: new Float32Array(this.PARTICLE_COUNT),
            initialSizes: new Float32Array(this.PARTICLE_COUNT),
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
    }

    /**
     * Check if player is within interaction range
     */
    override isPlayerNearby(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.position.x, this.position.y, this.position.z + this.Z_OFFSET)
        );
        this.playerIsClose =  dist < this.INTERACTION_RANGE;
        return this.playerIsClose; // Interaction range
    }

    /**
     * Reset a particle to its initial state
     * @param index - Particle index
     * @param isInitialSpawn - If true, staggers the spawn time for initial setup
     */
    private resetParticle(index: number, isInitialSpawn: boolean = false): void {
        const teleporterPos = this.mesh.position;

        // Random position within spawn radius (circular distribution)
        const offsetX = this.SPAWN_RADIUS * (Math.random() - 0.5);
        const offsetY = this.SPAWN_RADIUS * (Math.random() - 0.5) + 1.0;

        // Store initial X/Y offsets for this particle
        this.particleSystem.initialX[index] = offsetX;
        this.particleSystem.initialY[index] = offsetY;

        // Position at teleporter location (particles will move in -Z direction)
        const i3 = index * 3;
        this.particleSystem.positions[i3] = teleporterPos.x + offsetX;
        this.particleSystem.positions[i3 + 1] = teleporterPos.y + offsetY;
        this.particleSystem.positions[i3 + 2] = teleporterPos.z + this.Z_OFFSET; // Start at Z = 0 (relative to teleporter)

        // Set lifetime with variation to prevent synchronized spawning
        if (isInitialSpawn) {
            // Stagger initial particles throughout their lifetime for smooth startup
            this.particleSystem.lifetimes[index] = Math.random() * this.PARTICLE_LIFETIME;
        } else {
            // Respawned particles start with full lifetime plus small random variation
            this.particleSystem.lifetimes[index] = this.PARTICLE_LIFETIME * (0.95 + Math.random() * 0.1);
        }

        // Initialize size to maximum
        const initialSize = this.BASE_PARTICLE_SIZE + (Math.random() * 0.2 - 0.1);
        this.particleSystem.sizes[index] = initialSize;
        this.particleSystem.initialSizes[index] = initialSize;
    }

    /**
     * Update particle positions and lifetimes
     */
    update(deltaTime: number): void {
        // Call base class update for animation mixers
        super.update(deltaTime);

        // Cap deltaTime to prevent synchronization issues when tab is inactive
        const cappedDeltaTime = Math.min(deltaTime, 0.1); // Cap at 100ms (10 FPS)

        this.time += cappedDeltaTime;
        const teleporterPos = this.mesh.position;

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const i3 = i * 3;

            // Update lifetime
            this.particleSystem.lifetimes[i] -= cappedDeltaTime;

            // Reset if particle died
            if (this.particleSystem.lifetimes[i] <= 0) {
                this.resetParticle(i);
                continue;
            }

            const playerCloseFactor = this.playerIsClose ? 2.0 : 1.0;
            // Calculate age factor (0 = just spawned, 1 = about to die)
            const ageFactor = 1 - (this.particleSystem.lifetimes[i] / this.PARTICLE_LIFETIME);

            // Calculate Z offset based on age (moves from -2 to +2)
            const zOffset = this.Z_OFFSET - ageFactor * this.Z_TRAVEL_DISTANCE * playerCloseFactor;

            // Update position - X and Y stay fixed at initial offset, only Z changes
            this.particleSystem.positions[i3] = teleporterPos.x + this.particleSystem.initialX[i];
            this.particleSystem.positions[i3 + 1] = teleporterPos.y + this.particleSystem.initialY[i];
            this.particleSystem.positions[i3 + 2] = teleporterPos.z + zOffset;

            // Update size - decrease as particle ages (reaches 0 at the end)
            this.particleSystem.sizes[i] = this.particleSystem.initialSizes[i] * (1 - ageFactor * playerCloseFactor);
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
     * Get the destination of this teleporter
     */
    get destination(): string {
        return this.mesh.userData.destination;
    }

    /**
     * Clean up resources
     */
    cleanup(scene: THREE.Scene, world: RAPIER.World): void {
        // Call parent cleanup for mesh and physics body
        super.cleanup(scene, world);

        // Clean up particles
        scene.remove(this.particles);
        if (this.particles.geometry) this.particles.geometry.dispose();
        const particleMaterial = this.particles.material as THREE.ShaderMaterial;
        if (particleMaterial) {
            particleMaterial.dispose();
        }
    }
}
