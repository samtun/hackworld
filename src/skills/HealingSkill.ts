import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Skill } from './Skill';
import { BaseMesh } from '../BaseMesh';
import { SkillTechType } from './SkillTechType';
import { Tier } from '../items/TierManager';

/**
 * Healing Skill
 */
export class HealingSkill extends Skill {
    private readonly BASE_HEAL_AMOUNT = 40;
    private readonly BASE_DURATION = 1.5;
    private readonly PARTICLE_COUNT = 60;
    private readonly RECOVERY_DURATION = 10; // Seconds of post-heal recovery at Overclocked+

    private particles: THREE.Mesh[] = [];
    private effectTimer: number = 0;
    private healEffect: HealEffect | undefined;
    private effectiveDuration: number = this.BASE_DURATION;
    private spawnDuration: number = this.BASE_DURATION * 0.5;

    private activePlayer: Player | null = null;
    private activeScene: THREE.Scene | null = null;
    private spawnedCount: number = 0;
    private isBeingExecuted: boolean = false;

    // Post-heal recovery state (Overclocked+)
    private recoveryPlayer: Player | null = null;
    private recoveryRemaining: number = 0;
    private recoveryHealPerSecond: number = 0;

    constructor(onCompletedCallback: () => void) {
        super('Healing', 3, 20, onCompletedCallback, 'images/ui_icons/heal.png');
    }

    protected execute(player: Player, scene: THREE.Scene, _world: CANNON.World): void {
        console.log('Executing Healing skill');

        const tier = player.getSkillTier(SkillTechType.RECOVERY);
        const healAmount = this.getEffectiveHealAmount(tier);

        // Halve execution duration at Maintained and above
        this.effectiveDuration = tier === Tier.STABLE ? this.BASE_DURATION : this.BASE_DURATION / 2;
        this.spawnDuration = this.effectiveDuration * 0.5;

        // Heal the player
        const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
        player.hp += actualHeal;
        console.log(`Healed ${actualHeal} HP (${player.hp}/${player.maxHp})`);

        // Grant Recovery tech point if actual healing occurred
        if (actualHeal > 0) {
            player.tryIncrementSkillTech(SkillTechType.RECOVERY);
        }

        // Setup Overclocked+ recovery HoT
        if (tier === Tier.OVERCLOCKED || tier === Tier.ZERODAY || tier === Tier.LEET) {
            this.recoveryPlayer = player;
            this.recoveryHealPerSecond = healAmount * 0.05;
            this.recoveryRemaining = this.RECOVERY_DURATION;
        }

        // Clean up any existing effects to prevent leaks
        this.cleanup();

        // Setup execution state
        this.activePlayer = player;
        this.activeScene = scene;
        this.spawnedCount = 0;
        this.isBeingExecuted = true;

        // Create visual particle effect
        this.createHealingParticles(player, scene);
    }

    private getEffectiveHealAmount(tier: Tier): number {
        switch (tier) {
            case Tier.MAINTAINED:  return this.BASE_HEAL_AMOUNT * 2;
            case Tier.OVERCLOCKED: return this.BASE_HEAL_AMOUNT * 4;
            case Tier.ZERODAY:     return this.BASE_HEAL_AMOUNT * 6;
            case Tier.LEET:        return this.BASE_HEAL_AMOUNT * 10;
            default:               return this.BASE_HEAL_AMOUNT;
        }
    }

    cleanup(): void {
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
        this.isBeingExecuted = false;

        this.onCompletedCallback();
    }

    private createHealingParticles(player: Player, scene: THREE.Scene): void {
        this.healEffect = new HealEffect(this.effectiveDuration);
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

        // Apply ongoing recovery healing (Overclocked+)
        if (this.recoveryRemaining > 0 && this.recoveryPlayer) {
            this.recoveryRemaining -= dt;
            this.recoveryPlayer.hp = Math.min(
                this.recoveryPlayer.hp + this.recoveryHealPerSecond * dt,
                this.recoveryPlayer.maxHp
            );
            if (this.recoveryRemaining <= 0) {
                this.recoveryPlayer = null;
            }
        }

        if (!this.isBeingExecuted) {
            return;
        }

        if (this.activePlayer && this.activeScene) {
            this.effectTimer += dt;

            // Spawn particles
            if (this.effectTimer <= this.spawnDuration) {
                const targetCount = Math.floor((this.effectTimer / this.spawnDuration) * this.PARTICLE_COUNT);
                const toSpawn = Math.min(targetCount - this.spawnedCount, this.PARTICLE_COUNT - this.spawnedCount);

                for (let i = 0; i < toSpawn; i++) {
                    this.spawnParticle(this.activePlayer, this.activeScene);
                    this.spawnedCount++;
                }
            } else if (this.spawnedCount < this.PARTICLE_COUNT) {
                // Ensure all are spawned if we passed the window
                const toSpawn = this.PARTICLE_COUNT - this.spawnedCount;
                for (let i = 0; i < toSpawn; i++) {
                    this.spawnParticle(this.activePlayer, this.activeScene);
                    this.spawnedCount++;
                }
            }

            const progress = this.effectTimer / this.effectiveDuration;

            if (progress >= 1) {
                this.cleanup();
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

