import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { Skill } from './Skill';

/**
 * Area Attack Skill (L1 + X)
 * - Deals 18 damage per hit
 * - 5m range (circular around player)
 * - 10s cooldown
 */
export class AreaAttackSkill extends Skill {
    private readonly DAMAGE = 18;
    private readonly RANGE = 5;
    private particles: THREE.Mesh[] = [];
    private particleTimer: number = 0;
    private readonly PARTICLE_LIFETIME = 0.6;

    constructor() {
        super('Area Attack', 10, 30); // 10s cooldown, no TP cost
    }

    protected execute(player: Player, scene: THREE.Scene, world: CANNON.World): void {
        console.log('Executing Area Attack skill');

        // Find all enemies within range
        const hitEnemies = new Set<Enemy>();

        for (const body of world.bodies) {
            const entity = (body as any).entity;
            if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                const dx = body.position.x - player.body.position.x;
                const dz = body.position.z - player.body.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance <= this.RANGE) {
                    // Hit!
                    entity.takeDamage(this.DAMAGE, player.body.position);
                    hitEnemies.add(entity);
                    console.log(`Area attack hit enemy for ${this.DAMAGE} damage`);
                }
            }
        }

        // Create visual particle effect
        this.createAreaParticles(player, scene);
    }

    private createAreaParticles(player: Player, scene: THREE.Scene): void {
        // Create area attack particle effect (red/orange explosion)
        const particleCount = 80;
        const attackColor = 0xff4444; // Red/orange attack color

        for (let i = 0; i < particleCount; i++) {
            // Random spherical coordinates for explosion direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.5; // Only upper hemisphere

            // Convert to Cartesian coordinates for velocity
            const randomSeed = Math.random();
            const speed = 5 + randomSeed * 3;
            const vx = speed * Math.sin(phi) * Math.cos(theta);
            const vy = speed * Math.sin(phi) * Math.sin(theta) * 0.3 + 2;
            const vz = speed * Math.cos(phi);

            // Create particle
            const particleSize = 0.08 + (1 - randomSeed) * 0.12;
            const geometry = new THREE.SphereGeometry(particleSize, 8, 8);
            const material = new THREE.MeshStandardMaterial({
                color: attackColor,
                emissive: attackColor,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 1.0
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                player.body.position.x,
                player.body.position.y + 0.3,
                player.body.position.z
            );
            particle.scale.set(1, 0.5, 1);

            // Store velocity
            (particle as any).velocity = new THREE.Vector3(vx, vy, vz);

            scene.add(particle);
            this.particles.push(particle);
        }

        // Add a central shockwave ring effect
        const ringGeometry = new THREE.TorusGeometry(0.5, 0.1, 8, 16);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: attackColor,
            emissive: attackColor,
            emissiveIntensity: 3,
            transparent: true,
            opacity: 0.9
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(
            player.body.position.x,
            player.body.position.y + 0.2,
            player.body.position.z
        );
        ring.rotation.x = Math.PI / 2;

        // Store initial scale for animation
        (ring as any).initialScale = 0.5;
        (ring as any).isRing = true;

        scene.add(ring);
        this.particles.push(ring);

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
                // Update particle positions and fade out
                this.particles.forEach(particle => {
                    const material = particle.material as THREE.MeshStandardMaterial;
                    material.opacity = 1 - progress;

                    // Check if this is a ring for special animation
                    if ((particle as any).isRing) {
                        // Expand the ring outward
                        const scale = (particle as any).initialScale + progress * this.RANGE * 0.4;
                        particle.scale.set(scale, scale, scale);
                    } else {
                        // Move particles outward
                        const velocity = (particle as any).velocity;
                        if (velocity) {
                            particle.position.x += velocity.x * dt;
                            particle.position.y += velocity.y * dt;
                            particle.position.z += velocity.z * dt;

                            // Apply gravity to particles
                            velocity.y -= 9.8 * dt;
                        }
                    }
                });
            }
        }
    }
}
