import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Enemy } from '../../enemies/Enemy';
import { Skill } from './Skill';
import { SkillTechType } from './SkillType';
import { Tier } from '../../items/TierManager';
import { AudioManager } from '../../AudioManager';
import { BlastFx } from './BlastFx';
import { AssetManager } from '../../AssetManager';
import { UIManager } from '../../ui/UIManager';
import { PhysicsBodyKind, PhysicsBodyMetadataManager } from '../../PhysicsBodyMetadata';

/**
 * Blast Skill
 */
export class BlastSkill extends Skill {
    private readonly BASE_DAMAGE = 320;
    private readonly RANGE = 5;
    private readonly DURATION = 0.8;
    private effectTimer: number = 0;

    private fx: BlastFx | undefined;
    private isBeingExecuted: boolean = false;

    // Hit Enemies with a time since they were hit
    private hitEnemies: Map<Enemy, number> = new Map<Enemy, number>();
    private world?: CANNON.World | undefined;
    private player?: Player | undefined;

    private effectiveDamage: number = this.BASE_DAMAGE;
    private effectiveWaves: number = 1;

    private assetManager: AssetManager;

    private getWavesForTier(tier: Tier): number {
        switch (tier) {
            case Tier.MAINTAINED: return 2;
            case Tier.OVERCLOCKED: return 3;
            case Tier.ZERODAY: return 3;
            case Tier.LEET: return 4;
            default: return 1;
        }
    }

    private getDamageMultiplier(tier: Tier): number {
        switch (tier) {
            case Tier.MAINTAINED: return 2;
            case Tier.OVERCLOCKED: return 4;
            case Tier.ZERODAY: return 8;
            case Tier.LEET: return 16;
            default: return 1;
        }
    }

    constructor(
        onCompletedCallback: () => void,
        assetManager: AssetManager,
        audioManager: AudioManager,
        uiManager: UIManager,
        private readonly physicsBodyMetadataManager: PhysicsBodyMetadataManager,
    ) {
        super('Blast', 10, 300, onCompletedCallback, 'images/ui_icons/blast.png', audioManager, uiManager);
        this.assetManager = assetManager;
    }

    getEffectiveTpCost(player: Player): number {
        return Math.round(this.tpCost * this.getTpMultiplier(player.getSkillTier(SkillTechType.BLAST)));
    }

    private getTpMultiplier(tier: Tier): number {
        switch (tier) {
            case Tier.MAINTAINED: return 2;
            case Tier.OVERCLOCKED: return 3;
            case Tier.ZERODAY: return 5;
            case Tier.LEET: return 8;
            default: return 1;
        }
    }

    protected execute(player: Player, scene: THREE.Scene, world: CANNON.World): void {
        console.log('Executing Blast skill');
        this.audioManager.playBlastSkill();

        const tier = player.getSkillTier(SkillTechType.BLAST);
        this.effectiveDamage = this.BASE_DAMAGE * this.getDamageMultiplier(tier);
        this.effectiveWaves = this.getWavesForTier(tier);

        this.world = world;
        this.player = player;
        this.effectTimer = 0;
        this.hitEnemies = new Map<Enemy, number>();

        // Create visual effect
        this.fx = new BlastFx(this.DURATION, this.RANGE, this.effectiveWaves, this.assetManager);
        this.fx.setPosition(player.position as any);
        this.fx.addToScene(scene);
        this.isBeingExecuted = true;
    }

    update(dt: number): void {
        super.update(dt);

        if (!this.isBeingExecuted || !this.world || !this.player) {
            return;
        }

        this.effectTimer += dt;
        const progress = this.effectTimer / this.DURATION;
        const scale = ((this.RANGE * progress) * this.effectiveWaves) % this.RANGE;

        // If the enemy was hit longer than DAMAGE_INTERVAL ago make it hittable again
        this.hitEnemies.forEach((timeSinceHit, enemy) => {
            if (timeSinceHit >= this.DURATION / this.effectiveWaves) {
                this.hitEnemies.delete(enemy);
            } else {
                this.hitEnemies.set(enemy, timeSinceHit + dt);
            }
        });

        if (progress >= 1) {
            this.cleanup();
        } else {
            this.fx?.update(dt);

            for (const body of this.world.bodies) {
                const metadata = this.physicsBodyMetadataManager.getPhysicsBodyMetadata(body);
                if (metadata?.kind === PhysicsBodyKind.Enemy && !this.hitEnemies.has(metadata.entity) && !metadata.entity.isDead && !metadata.entity.isDying) {
                    const entity = metadata.entity;
                    const dx = body.position.x - this.player.body.position.x;
                    const dz = body.position.z - this.player.body.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);

                    if (distance <= scale) {
                        const isCriticalHit = Math.random() < this.player.getCriticalChance();
                        const damage = isCriticalHit ? Math.floor(this.effectiveDamage * this.player.getCriticalHitMultiplier()) : this.effectiveDamage;
                        entity.takeDamage(damage, isCriticalHit, this.player.body.position, 0.2);
                        this.hitEnemies.set(entity, 0);
                        this.player.tryIncrementSkillTech(SkillTechType.BLAST);
                        console.log(`Blast hit enemy for ${damage} damage`);
                    }
                } else if (metadata?.kind === PhysicsBodyKind.Breakable && !metadata.entity.isDestroyed) {
                    const entity = metadata.entity;
                    const dx = body.position.x - this.player.body.position.x;
                    const dz = body.position.z - this.player.body.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance <= scale && this.player.onBreakableHit) {
                        this.player.onBreakableHit(entity);
                    }
                }
            }
        }
    }

    cleanup(): void {
        this.effectTimer = 0;
        this.fx?.removeFromScene();
        this.isBeingExecuted = false;
        this.onCompletedCallback?.();
    }
}
