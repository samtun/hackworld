import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Skill } from './Skill';
import { BaseMesh } from '../BaseMesh';

/**
 * Healing Skill (L1 + B)
 * - Heals 40 HP
 * - 5s cooldown
 */
export class HealingSkill extends Skill {
    private readonly HEAL_AMOUNT = 40;
    private particles: THREE.Mesh[] = [];
    private effectTimer: number = 0;
    private readonly DURATION;
    private healEffect: HealEffect | undefined;

    private activePlayer: Player | null = null;
    private activeScene: THREE.Scene | null = null;
    private spawnedCount: number = 0;

    constructor(duration: number) {
        super('Healing', 0, 20);
        this.DURATION = duration;
    }

    protected execute(player: Player, scene: THREE.Scene, _world: CANNON.World): void {
        console.log('Executing Healing skill');

        // Heal the player
        const actualHeal = Math.min(this.HEAL_AMOUNT, player.maxHp - player.hp);
        player.hp += actualHeal;
        console.log(`Healed ${actualHeal} HP (${player.hp}/${player.maxHp})`);

        // Clean up any existing effects to prevent leaks
        this.cleanupEffects();

        // Setup execution state
        this.activePlayer = player;
        this.activeScene = scene;
        this.spawnedCount = 0;

        // Create visual particle effect
        this.createHealingParticles(player, scene);
    }

    private cleanupEffects(): void {
        if (this.particles.length > 0) {
            this.particles.forEach(particle => {
                particle.parent?.remove(particle);
                particle.geometry.dispose();
                if (particle.material instanceof THREE.Material) {
                    particle.material.dispose();
                } else if (Array.isArray(particle.material)) {
                    particle.material.forEach(m => m.dispose());
                }
            });
            this.particles = [];
        }

        this.effectTimer = 0;
        this.healEffect?.removeFromScene();
        this.activePlayer = null;
        this.activeScene = null;
    }

    private createHealingParticles(player: Player, scene: THREE.Scene): void {
        if (!this.healEffect) {
            this.healEffect = new HealEffect(this.DURATION);
        }
        this.healEffect.setPosition(player.position as any);
        this.healEffect.addToScene(scene);

        this.effectTimer = 0;
    }

    private spawnParticle(player: Player, scene: THREE.Scene): void {
        const healColor = 0x00CC22; // Green healing color
        // Random position around player
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random();
        const height = Math.random() * 0.3;

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
            player.body.position.y + height - player.body.position.y * 0.5,
            player.body.position.z + Math.sin(angle) * radius
        );

        // Store velocity for upward movement
        (particle as any).velocity = new THREE.Vector3(
            0,
            1.2 + Math.random(), // Upward movement
            0
        );

        scene.add(particle);
        this.particles.push(particle);
    }

    update(dt: number): void {
        super.update(dt);

        if (this.activePlayer && this.activeScene) {
            this.effectTimer += dt;
            const maxParticles = 60;
            const spawnDuration = this.DURATION * 0.5;

            // Spawn particles
            if (this.effectTimer <= spawnDuration) {
                const targetCount = Math.floor((this.effectTimer / spawnDuration) * maxParticles);
                const toSpawn = Math.min(targetCount - this.spawnedCount, maxParticles - this.spawnedCount);

                for (let i = 0; i < toSpawn; i++) {
                    this.spawnParticle(this.activePlayer, this.activeScene);
                    this.spawnedCount++;
                }
            } else if (this.spawnedCount < maxParticles) {
                // Ensure all are spawned if we passed the window
                const toSpawn = maxParticles - this.spawnedCount;
                for (let i = 0; i < toSpawn; i++) {
                    this.spawnParticle(this.activePlayer, this.activeScene);
                    this.spawnedCount++;
                }
            }

            const progress = this.effectTimer / this.DURATION;

            if (progress >= 1) {
                // Remove all particles
                this.cleanupEffects();
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

                // Update heal effect animation
                this.healEffect?.update(dt);
            }
        }
    }
}

class HealEffect extends BaseMesh {
    private time: number = 0;
    private duration: number;
    private material: THREE.MeshStandardMaterial | null = null;

    constructor(duration: number) {
        super('models/heal_fx.glb');
        this.duration = duration;
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                this.material = child.material as THREE.MeshStandardMaterial;
            }
        });
    }

    public update(dt: number) {
        super.update(dt);
        this.time += dt;
        const progress = this.time / this.duration;
        const horizontalScale = 1.2 + Math.sin(Math.PI * progress * 4.5) * 0.1;
        this.mesh.scale.copy(new THREE.Vector3(horizontalScale, progress, horizontalScale));
        if (this.material) {
            this.material.opacity = Math.sin(Math.PI * progress);
        }
    }

    public setPosition(pos: CANNON.Vec3) {
        this.mesh.position.set(pos.x, pos.y, pos.z);
    }

    public addToScene(scene: THREE.Scene) {
        this.time = 0;
        this.update(0); // Initialize scale and opacity
        scene.add(this.mesh);
    }

    public removeFromScene() {
        this.mesh.parent?.remove(this.mesh);
    }
}
