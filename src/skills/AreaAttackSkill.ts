import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { Skill } from './Skill';
import { BaseMesh } from '../BaseMesh';
import { SkillTechType } from './SkillTechType';
import { Tier } from '../items/TierManager';
import { isBreakable } from '../items/Breakable';
import { AudioManager } from '../AudioManager';

/**
 * Area Attack Skill
 */
export class AreaAttackSkill extends Skill {
    private readonly BASE_DAMAGE = 320;
    private readonly RANGE = 5;
    private readonly DURATION = 0.8;
    private effectTimer: number = 0;

    private areaAttackEffect: AreaAttackEffect | undefined;
    private isBeingExecuted: boolean = false;

    // Hit Enemies with a time since they were hit
    private hitEnemies: Map<Enemy, number> = new Map<Enemy, number>();
    private world?: CANNON.World | undefined;
    private player?: Player | undefined;

    private effectiveDamage: number = this.BASE_DAMAGE;
    private effectiveWaves: number = 1;

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

    constructor(onCompletedCallback: () => void) {
        super('Area Attack', 10, 300, onCompletedCallback, 'images/ui_icons/area.png');
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
        console.log('Executing Area Attack skill');
        AudioManager.Instance.playAreaAttackSkill();

        const tier = player.getSkillTier(SkillTechType.BLAST);
        this.effectiveDamage = this.BASE_DAMAGE * this.getDamageMultiplier(tier);
        this.effectiveWaves = this.getWavesForTier(tier);

        this.world = world;
        this.player = player;
        this.effectTimer = 0;
        this.hitEnemies = new Map<Enemy, number>();

        // Create visual effect
        this.areaAttackEffect = new AreaAttackEffect(this.DURATION, this.RANGE, this.effectiveWaves);
        this.areaAttackEffect.setPosition(player.position as any);
        this.areaAttackEffect.addToScene(scene);
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
            this.areaAttackEffect?.update(dt);

            for (const body of this.world.bodies) {
                const entity = (body as any).entity;
                if (entity && entity instanceof Enemy && !this.hitEnemies.has(entity) && !entity.isDead && !entity.isDying) {
                    const dx = body.position.x - this.player.body.position.x;
                    const dz = body.position.z - this.player.body.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);

                    if (distance <= scale) {
                        const isCriticalHit = Math.random() < this.player.getCriticalChance();
                        const damage = isCriticalHit ? Math.floor(this.effectiveDamage * this.player.getCriticalHitMultiplier()) : this.effectiveDamage;
                        entity.takeDamage(damage, isCriticalHit, this.player.body.position, 0.2);
                        this.hitEnemies.set(entity, 0);
                        this.player.tryIncrementSkillTech(SkillTechType.BLAST);
                        console.log(`Area attack hit enemy for ${damage} damage`);
                    }
                } else if (isBreakable(entity) && !entity.isDestroyed) {
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
        this.areaAttackEffect?.removeFromScene();
        this.isBeingExecuted = false;
        this.onCompletedCallback();
    }
}

class AreaAttackEffect extends BaseMesh {
    private time: number = 0;
    private duration: number;
    private waves: number;
    private range: number;
    private material: THREE.MeshStandardMaterial | null = null;

    constructor(duration: number, range: number, waves: number) {
        super('models/area_fx.glb');
        this.duration = duration;
        this.range = range;
        this.waves = waves;
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
        const scale = ((this.range * progress) * this.waves) % this.range;
        this.mesh.scale.copy(new THREE.Vector3(scale, scale, scale));
        if (this.material) {
            this.material.opacity = (1.0 - ((progress * this.waves % 1.0) - 0.7) / 0.3);
        }
    }

    public setPosition(pos: CANNON.Vec3) {
        this.mesh.position.set(pos.x, pos.y, pos.z);
    }

    public addToScene(scene: THREE.Scene) {
        this.time = 0;
        this.update(0); // Initialize scale and opacity
        scene.add(this.mesh);
        if (this.material) {
            this.material.opacity = 1.0;
        }
    }

    public removeFromScene() {
        this.mesh.parent?.remove(this.mesh);
    }
}
