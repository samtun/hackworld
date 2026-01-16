import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { Skill } from './Skill';

/**
 * Laser Beam Skill (L1 + A)
 * - Ranged attack
 * - Deals 20 damage
 * - 30m range
 * - 1m radius (cylinder collider)
 * - 10s cooldown
 */
export class LaserBeamSkill extends Skill {
    private readonly DAMAGE = 20;
    private readonly RANGE = 30;
    private readonly RADIUS = 1;
    private particles: THREE.Mesh[] = [];
    private particleTimer: number = 0;
    private readonly PARTICLE_LIFETIME = 0.5;

    constructor() {
        super('Laser Beam', 10, 0); // 10s cooldown, no TP cost
    }

    protected execute(player: Player, scene: THREE.Scene, world: CANNON.World): void {
        console.log('Executing Laser Beam skill');

        // Get player's forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(player.mesh.quaternion);
        forward.y = 0;
        forward.normalize();

        // Create laser beam starting position (in front of player)
        const startPos = new CANNON.Vec3(
            player.body.position.x + forward.x * 0.5,
            player.body.position.y + 0.5,
            player.body.position.z + forward.z * 0.5
        );

        // Create cylinder collider for hit detection
        const hitEnemies = new Set<Enemy>();
        
        // Check all enemies in the beam path
        for (let distance = 0; distance <= this.RANGE; distance += 1) {
            const checkPos = new CANNON.Vec3(
                startPos.x + forward.x * distance,
                startPos.y,
                startPos.z + forward.z * distance
            );

            // Check for enemies within radius at this distance
            for (const body of world.bodies) {
                const entity = (body as any).entity;
                if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                    if (hitEnemies.has(entity)) continue;

                    const dx = body.position.x - checkPos.x;
                    const dy = body.position.y - checkPos.y;
                    const dz = body.position.z - checkPos.z;
                    const distanceToBeam = Math.sqrt(dx * dx + dz * dz); // Horizontal distance

                    if (distanceToBeam <= this.RADIUS && Math.abs(dy) <= 2) {
                        // Hit!
                        entity.takeDamage(this.DAMAGE, player.body.position);
                        hitEnemies.add(entity);
                        console.log(`Laser beam hit enemy for ${this.DAMAGE} damage`);
                    }
                }
            }
        }

        // Create visual particle effect
        this.createLaserParticles(player, scene, forward);
    }

    private createLaserParticles(player: Player, scene: THREE.Scene, forward: THREE.Vector3): void {
        // Create a beam-like particle effect
        const particleCount = 30;
        const beamColor = 0x00ffff; // Cyan/blue laser

        for (let i = 0; i < particleCount; i++) {
            const distance = (i / particleCount) * this.RANGE;
            
            // Main beam particles
            const geometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
            const material = new THREE.MeshStandardMaterial({
                color: beamColor,
                emissive: beamColor,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.8
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                player.mesh.position.x + forward.x * distance,
                player.mesh.position.y + 0.5,
                player.mesh.position.z + forward.z * distance
            );

            // Orient particle along beam direction
            const axis = new THREE.Vector3(1, 0, 0);
            const angle = Math.atan2(forward.z, forward.x);
            particle.rotateOnAxis(axis, Math.PI / 2);
            particle.rotateOnAxis(new THREE.Vector3(0, 1, 0), angle - Math.PI / 2);

            scene.add(particle);
            this.particles.push(particle);

            // Add some glow particles around the beam
            if (i % 3 === 0) {
                const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
                const glowMaterial = new THREE.MeshStandardMaterial({
                    color: beamColor,
                    emissive: beamColor,
                    emissiveIntensity: 3,
                    transparent: true,
                    opacity: 0.6
                });

                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.position.copy(particle.position);
                scene.add(glow);
                this.particles.push(glow);
            }
        }

        this.particleTimer = 0;
    }

    update(dt: number): void {
        super.update(dt);

        // Update particles
        if (this.particles.length > 0) {
            this.particleTimer += dt;
            const progress = this.particleTimer / this.PARTICLE_LIFETIME;

            if (progress >= 1) {
                // Remove all particles
                this.particles.forEach(particle => {
                    particle.parent?.remove(particle);
                    particle.geometry.dispose();
                    (particle.material as THREE.Material).dispose();
                });
                this.particles = [];
                this.particleTimer = 0;
            } else {
                // Fade out particles
                this.particles.forEach(particle => {
                    const material = particle.material as THREE.MeshStandardMaterial;
                    material.opacity = 1 - progress;
                });
            }
        }
    }
}
