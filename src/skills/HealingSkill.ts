import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Skill } from './Skill';
import { AssetManager } from '../AssetManager';

/**
 * Healing Skill (L1 + B)
 * - Heals 40 HP
 * - 5s cooldown
 */
export class HealingSkill extends Skill {
    private readonly HEAL_AMOUNT = 40;
    private particles: THREE.Mesh[] = [];
    private particleTimer: number = 0;
    private readonly PARTICLE_LIFETIME = 0.8;

    constructor() {
        super('Healing', 0, 20);
    }

    protected execute(player: Player, scene: THREE.Scene, _world: CANNON.World): void {
        console.log('Executing Healing skill');

        // Heal the player
        const actualHeal = Math.min(this.HEAL_AMOUNT, player.maxHp - player.hp);
        player.hp += actualHeal;
        console.log(`Healed ${actualHeal} HP (${player.hp}/${player.maxHp})`);

        // Create visual particle effect
        this.createHealingParticles(player, scene);
    }

    private createHealingParticles(player: Player, scene: THREE.Scene): void {
        // Create healing particle effect (green/white glow)
        const particleCount = 60;
        const healColor = 0x00CC22; // Green healing color

        for (let i = 0; i < particleCount; i++) {
            // Random position around player
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random();
            const height = Math.random() * 0.5;

            const geometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 8, 8);
            const material = new THREE.MeshStandardMaterial({
                color: healColor,
                emissive: healColor,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.9
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(
                player.body.position.x + Math.cos(angle) * radius,
                player.body.position.y + height,
                player.body.position.z + Math.sin(angle) * radius
            );

            // Store velocity for upward movement
            (particle as any).velocity = new THREE.Vector3(
                0,
                2 + Math.random() * 2, // Upward movement
                0
            );

            scene.add(particle);
            this.particles.push(particle);
        }

        const healFx = AssetManager.Instance.get('models/heal_fx.glb');
        const fxMesh = healFx.scene.clone();
        fxMesh.position.set(
            player.body.position.x,
            player.body.position.y,
            player.body.position.z
        );
        scene.add(fxMesh);

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
                    material.opacity = (1 - progress) * 0.9;

                    // Move particles upward
                    const velocity = (particle as any).velocity;
                    if (velocity) {
                        particle.position.y += velocity.y * dt;
                    }
                });
            }
        }
    }
}
