import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Breakable } from './Breakable';
import { Player } from '../Player';
import { ItemDrop } from './ItemDrop';
import { WeaponDrop } from './weapons/WeaponDrop';
import { WeaponRepository } from './weapons/WeaponRepository';
import { WeaponType } from './weapons/WeaponType';
import { ChipDrop } from './chips/ChipDrop';
import { ChipRepository } from './chips/ChipRepository';
import { CoreDrop } from './cores/CoreDrop';
import { CoreRepository } from './cores/CoreRepository';
import { MoneyDrop } from './bits/MoneyDrop';
import { ItemLevelHelper } from './ItemLevelHelper';
import { Tier, TierManager } from './TierManager';
import { WeaponItem } from './weapons/WeaponItem';

/** Configuration for a single breakable barrel placement. */
export interface BreakableBarrelConfig {
    x: number;
    y: number;
    z: number;
    /** Maximum weapon tier that can drop from this barrel (default: Overclocked). */
    maxTier?: Tier;
}

/**
 * A barrel that can be destroyed by a single hit from any weapon or skill.
 * Once destroyed it spawns loot (weapons, chips, cores, or bits) on the floor,
 * similar to enemy drops. Does NOT grant tech points.
 */
export class BreakableBarrel implements Breakable {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    isDestroyed: boolean = false;

    private scene: THREE.Scene;
    private world: CANNON.World;
    private maxTier: Tier;

    /** Radius of the barrel cylinder. */
    private static readonly RADIUS = 0.3;
    /** Height of the barrel cylinder. */
    private static readonly HEIGHT = 1;
    /** Number of radial segments. */
    private static readonly RADIAL_SEGMENTS = 8;
    /** Number of height segments. */
    private static readonly HEIGHT_SEGMENTS = 3;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        position: CANNON.Vec3,
        maxTier: Tier = Tier.OVERCLOCKED,
    ) {
        this.scene = scene;
        this.world = world;
        this.maxTier = maxTier;

        // Visual: barrel-shaped cylinder
        const geo = new THREE.CylinderGeometry(
            BreakableBarrel.RADIUS,
            BreakableBarrel.RADIUS,
            BreakableBarrel.HEIGHT,
            BreakableBarrel.RADIAL_SEGMENTS,
            BreakableBarrel.HEIGHT_SEGMENTS,
        );
        const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(position.x, position.y + BreakableBarrel.HEIGHT / 2, position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);

        // Physics body for collision detection (weapon/skill hits) and blocking movement.
        // Body type is KINEMATIC so it participates in trigger collisions with the
        // weapon hitbox (cannon-es skips static-static pairs).
        const shape = new CANNON.Cylinder(
            BreakableBarrel.RADIUS,
            BreakableBarrel.RADIUS,
            BreakableBarrel.HEIGHT,
            BreakableBarrel.RADIAL_SEGMENTS,
        );
        this.body = new CANNON.Body({ mass: 0, material: physicsMaterial, type: CANNON.Body.KINEMATIC });
        this.body.addShape(shape);
        this.body.position.set(position.x, position.y + BreakableBarrel.HEIGHT / 2, position.z);
        (this.body as any).entity = this;
        world.addBody(this.body);
    }

    /** Called when the barrel receives a hit. Destroys the barrel and spawns loot. */
    onHit(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        // Remove visuals and physics
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.world.removeBody(this.body);
    }

    /**
     * Generate a single loot drop from this barrel at its position.
     * Uses the same level/tier logic as enemy drops, minus XData and BoosterPacks.
     * @returns The created ItemDrop, or null if nothing drops.
     */
    generateDrop(scene: THREE.Scene, player: Player): ItemDrop | null {
        const dropPosition = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z,
        );

        // Equal chance for each eligible drop type: weapon, chip, core, money
        const roll = Math.random();
        if (roll < 0.30) {
            return this.generateWeaponDrop(scene, player, dropPosition);
        } else if (roll < 0.55) {
            return this.generateChipDrop(scene, player, dropPosition);
        } else if (roll < 0.80) {
            return this.generateCoreDrop(scene, player, dropPosition);
        } else {
            return this.generateMoneyDrop(scene, player, dropPosition);
        }
    }

    private generateWeaponDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop | null {
        const allTypes = [WeaponType.SWORD, WeaponType.DUAL_BLADE, WeaponType.LANCE, WeaponType.HAMMER];
        const weaponType = allTypes[Math.floor(Math.random() * allTypes.length)];
        const weaponLevel = this.determineWeaponLevel(player.getTechForWeapon(weaponType));
        const weaponItem = WeaponRepository.Instance.getWeaponByTypeAndLevel(weaponType, weaponLevel);
        if (!weaponItem) return null;

        // Generate a bonus multiplier capped to the maxTier
        const bonusMultiplier = this.generateCappedBonusMultiplier();
        const finalDamage = Math.floor(weaponItem.damage * bonusMultiplier);
        const damageFactor = finalDamage / weaponItem.damage;
        const finalBuyPrice = Math.floor(weaponItem.buyPrice * damageFactor);
        const finalSellPrice = Math.floor(weaponItem.sellPrice * damageFactor);

        return new WeaponDrop(
            weaponItem.id, scene, pos, weaponType, weaponItem.name,
            finalDamage, finalBuyPrice, finalSellPrice, weaponLevel, damageFactor,
        );
    }

    private generateChipDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const chipItem = ChipRepository.Instance.getRandomChipOfLevel(level);
        if (!chipItem) return null;
        return new ChipDrop(scene, pos, chipItem.id, chipItem.name, chipItem.chipType, chipItem.buyPrice, chipItem.sellPrice, level);
    }

    private generateCoreDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return null;
        return new CoreDrop(scene, pos, coreItem.id, coreItem.name, coreItem.buyPrice, coreItem.sellPrice, level);
    }

    private generateMoneyDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop {
        const levelBonus = Math.pow(Math.log10(player.level), 2) / 400;
        const chances = [
            { amount: 500, baseChance: 0.01 },
            { amount: 200, baseChance: 0.05 },
            { amount: 100, baseChance: 0.10 },
        ];
        const random = Math.random();
        let cumulative = 0;
        for (const { amount, baseChance } of chances) {
            cumulative += Math.min(1.0, baseChance + levelBonus);
            if (random < cumulative) return new MoneyDrop(scene, pos, amount);
        }
        return new MoneyDrop(scene, pos, 10);
    }

    /**
     * Determine weapon level based on player tech (same logic as WeaponDropStrategy).
     */
    private determineWeaponLevel(playerTech: number): number {
        let baseLevel = 1;
        for (let i = 0; i < WeaponItem.WEAPON_LEVELS.length; i++) {
            if (playerTech >= WeaponItem.WEAPON_LEVELS[i].requiredTech) {
                baseLevel = i + 1;
            } else {
                break;
            }
        }
        return baseLevel;
    }

    /**
     * Generate a weapon bonus multiplier capped so it does not exceed the maxTier.
     */
    private generateCappedBonusMultiplier(): number {
        const tierManager = TierManager.Instance;
        const maxTierDef = tierManager.tiers.get(this.maxTier);
        // Default to OVERCLOCKED max percentage (+12%)
        const maxPercent = maxTierDef ? maxTierDef.maxPercent : 12;
        // Cap the multiplier so the bonus stays below the maxTier boundary
        const cappedMax = isFinite(maxPercent) ? maxPercent : 12;

        // Random bonus: -5% to cappedMax%
        const bonusPercent = -5 + Math.random() * (cappedMax + 5);
        return 1 + bonusPercent / 100;
    }

    /** Clean up resources when the stage is cleared. */
    cleanup(): void {
        if (!this.isDestroyed) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            (this.mesh.material as THREE.Material).dispose();
            this.world.removeBody(this.body);
        }
    }
}
