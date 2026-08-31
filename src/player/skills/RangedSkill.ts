import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Enemy } from '../../enemies/Enemy';
import { Skill } from './Skill';
import { SkillTechType } from './SkillType';
import { Tier } from '../../items/TierManager';
import { AudioManager } from '../../AudioManager';
import { AssetManager } from '../../AssetManager';
import { RangedFx } from './RangedFx';
import { UIManager } from '../../ui/UIManager';
import { PhysicsBodyKind, PhysicsBodyMetadataManager } from '../../PhysicsBodyMetadata';
/**
 * Ranged Skill
 */
export class RangedSkill extends Skill {
    private readonly BASE_DAMAGE = 200;
    private readonly BASE_RADIUS = 1;
    private readonly DURATION: number = 0.6;
    private readonly RANGE = 10;
    private effectTimer: number = 0;
    private fxAsset: RangedFx | undefined;
    private fxAssetLeft: RangedFx | undefined; // Leet: +25° beam
    private fxAssetRight: RangedFx | undefined; // Leet: -25° beam
    private isBeingExecuted: boolean = false;

    private world: CANNON.World | undefined;
    private player: Player | undefined;
    private startPos: CANNON.Vec3 | undefined;
    private forward: THREE.Vector3 | undefined;
    private forward2: THREE.Vector3 | undefined; // Leet extra beam direction
    private forward3: THREE.Vector3 | undefined; // Leet extra beam direction
    private hitEnemies: Set<Enemy> = new Set();
    private hitEnemies2: Set<Enemy> = new Set(); // Leet: +25° beam
    private hitEnemies3: Set<Enemy> = new Set(); // Leet: -25° beam
    private effectiveDamage: number = this.BASE_DAMAGE;
    private effectiveRadius: number = this.BASE_RADIUS;
    private isLeet: boolean = false;

    private assetManager: AssetManager;

    constructor(
        onCompletedCallback: () => void,
        assetManager: AssetManager,
        audioManager: AudioManager,
        uiManager: UIManager,
        private readonly physicsBodyMetadataManager: PhysicsBodyMetadataManager,
    ) {
        super('Ranged', 5, 250, onCompletedCallback, 'images/ui_icons/ranged.png', audioManager, uiManager);
        this.assetManager = assetManager;
    }

    getEffectiveTpCost(player: Player): number {
        return Math.round(this.tpCost * this.getTpMultiplier(player.getSkillTier(SkillTechType.RANGED)));
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
        console.log('Executing ranged skill');
        this.audioManager.playRangedSkill();

        const tier = player.getSkillTier(SkillTechType.RANGED);
        this.effectiveDamage = this.BASE_DAMAGE * this.getDamageMultiplier(tier);
        this.effectiveRadius = tier === Tier.OVERCLOCKED || tier === Tier.ZERODAY || tier === Tier.LEET
            ? this.BASE_RADIUS * 1.5
            : this.BASE_RADIUS;
        this.isLeet = tier === Tier.LEET;

        this.world = world;
        this.player = player;
        this.hitEnemies.clear();
        this.hitEnemies2.clear();
        this.hitEnemies3.clear();

        // Get player's forward direction
        this.forward = player.getForwardDirection();

        // Create laser visual starting position (in front of player)
        this.startPos = new CANNON.Vec3(
            player.body.position.x + this.forward.x * 0.5,
            player.body.position.y + 0.5,
            player.body.position.z + this.forward.z * 0.5
        );

        this.isBeingExecuted = true;
        this.effectTimer = 0;
        this.createVisual(player, scene, this.startPos, this.forward, tier);
    }

    private getDamageMultiplier(tier: Tier): number {
        switch (tier) {
            case Tier.MAINTAINED: return 3;
            case Tier.OVERCLOCKED: return 6;
            case Tier.ZERODAY: return 12;
            case Tier.LEET: return 20;
            default: return 1;
        }
    }

    private createVisual(player: Player, scene: THREE.Scene, startPos: CANNON.Vec3, forward: THREE.Vector3, tier: Tier): void {
        const startVec = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
        this.fxAsset = new RangedFx(
            this.DURATION,
            this.RANGE,
            player.getRotationY(),
            startVec,
            forward,
            this.assetManager);
        this.fxAsset.addToScene(scene);

        // Leet tier: two extra beams at ±25° in the y-axis direction
        if (tier === Tier.LEET) {
            const angle = Math.PI * 25 / 180;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            this.forward2 = new THREE.Vector3(
                forward.x * cosA + forward.z * sinA,
                0,
                -forward.x * sinA + forward.z * cosA
            ).normalize();

            this.forward3 = new THREE.Vector3(
                forward.x * cosA - forward.z * sinA,
                0,
                forward.x * sinA + forward.z * cosA
            ).normalize();

            this.fxAssetLeft = new RangedFx(
                this.DURATION,
                this.RANGE,
                player.getRotationY() + angle,
                startVec,
                this.forward2,
                this.assetManager);
            this.fxAssetLeft.addToScene(scene);

            this.fxAssetRight = new RangedFx(
                this.DURATION,
                this.RANGE,
                player.getRotationY() - angle,
                startVec,
                this.forward3,
                this.assetManager);
            this.fxAssetRight.addToScene(scene);
        }
    }

    update(dt: number): void {
        super.update(dt);
        if (!this.isBeingExecuted || !this.world || !this.startPos || !this.forward || !this.player) {
            return;
        }

        this.effectTimer += dt;
        const progress = this.effectTimer / this.DURATION;

        // Calculate current beam length based on progress (matching visual effect), clamped to RANGE
        const currentLength = Math.min(this.RANGE * Math.pow(progress, 2), this.RANGE);

        // Check for hits on all active beams
        this.checkBeamHits(currentLength, this.startPos, this.forward, this.hitEnemies);
        if (this.isLeet && this.forward2 && this.forward3) {
            this.checkBeamHits(currentLength, this.startPos, this.forward2, this.hitEnemies2);
            this.checkBeamHits(currentLength, this.startPos, this.forward3, this.hitEnemies3);
        }

        if (progress >= 1) {
            this.cleanup();
        } else {
            this.fxAsset?.update(dt);
            this.fxAssetLeft?.update(dt);
            this.fxAssetRight?.update(dt);
        }
    }

    private checkBeamHits(currentLength: number, startPos: CANNON.Vec3, forward: THREE.Vector3, hitEnemies: Set<Enemy>): void {
        if (!this.world || !this.player) return;

        for (const body of this.world.bodies) {
            const metadata = this.physicsBodyMetadataManager.getPhysicsBodyMetadata(body);
            if (metadata?.kind === PhysicsBodyKind.Enemy && !metadata.entity.isDead && !metadata.entity.isDying) {
                const entity = metadata.entity;
                if (hitEnemies.has(entity)) continue;

                for (let distance = 0; distance <= currentLength; distance += 1) {
                    const checkPos = new CANNON.Vec3(
                        startPos.x + forward.x * distance,
                        startPos.y,
                        startPos.z + forward.z * distance
                    );

                    const dx = body.position.x - checkPos.x;
                    const dy = body.position.y - checkPos.y;
                    const dz = body.position.z - checkPos.z;
                    const distanceToBeam = Math.sqrt(dx * dx + dz * dz);

                    if (distanceToBeam <= this.effectiveRadius && Math.abs(dy) <= 2) {
                        const isCriticalHit = Math.random() < this.player.getCriticalChance();
                        const damage = Math.floor(isCriticalHit ? this.effectiveDamage * this.player.getCriticalHitDamageMultiplier() : this.effectiveDamage);
                        entity.takeDamage(damage, isCriticalHit, this.player.body.position);
                        hitEnemies.add(entity);
                        this.player.tryIncrementSkillTech(SkillTechType.RANGED);
                        console.log(`Ranged skill hit enemy for ${damage} damage`);
                        break;
                    }
                }
            } else if (metadata?.kind === PhysicsBodyKind.Breakable && !metadata.entity.isDestroyed) {
                const entity = metadata.entity;
                for (let distance = 0; distance <= currentLength; distance += 1) {
                    const checkPos = new CANNON.Vec3(
                        startPos.x + forward.x * distance,
                        startPos.y,
                        startPos.z + forward.z * distance
                    );
                    const dx = body.position.x - checkPos.x;
                    const dz = body.position.z - checkPos.z;
                    const distanceToBeam = Math.sqrt(dx * dx + dz * dz);
                    if (distanceToBeam <= this.effectiveRadius && this.player.onBreakableHit) {
                        this.player.onBreakableHit(entity);
                        break;
                    }
                }
            }
        }
    }

    cleanup(): void {
        this.effectTimer = 0;
        this.fxAsset?.removeFromScene();
        this.fxAsset = undefined;
        this.fxAssetLeft?.removeFromScene();
        this.fxAssetLeft = undefined;
        this.fxAssetRight?.removeFromScene();
        this.fxAssetRight = undefined;
        this.isBeingExecuted = false;
        this.isLeet = false;

        this.world = undefined;
        this.player = undefined;
        this.startPos = undefined;
        this.forward = undefined;
        this.forward2 = undefined;
        this.forward3 = undefined;
        this.hitEnemies.clear();
        this.hitEnemies2.clear();
        this.hitEnemies3.clear();

        this.onCompletedCallback?.();
    }
}
