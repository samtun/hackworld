import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { WeaponRepository } from './weapons/WeaponRepository';
import { WeaponType } from './weapons/WeaponType';
import { WeaponItem } from './weapons/WeaponItem';
import { WeaponBonusCalculator } from './weapons/WeaponBonusCalculator';
import { ChipRepository } from './chips/ChipRepository';
import { ChipType } from './chips/Chip';
import { CoreRepository } from './cores/CoreRepository';
import { ItemLevelHelper } from './ItemLevelHelper';
import { getHint, HintConfigs } from '../ui/InputHints';
import { ItemDrop } from './ItemDrop';
import { ItemDropManager } from './ItemDropManager';
import { WeaponDrop } from './weapons/WeaponDrop';
import { ChipDrop } from './chips/ChipDrop';
import { CoreDrop } from './cores/CoreDrop';
import { PotionDrop } from './potions/PotionDrop';
import { PotionType, determinePotionLevel } from './potions/PotionDefinitions';
import { MoneyDrop } from './bits/MoneyDrop';
import { Tier } from './TierManager';

/** Intermediate descriptor for a chest loot entry. */
export type ChestLootEntry =
    | { type: 'weapon'; weaponId: string; weaponType: WeaponType; name: string; damage: number; buyPrice: number; sellPrice: number; level: number; damageFactor: number; tierName: Tier }
    | { type: 'chip'; chipId: string; name: string; chipType: ChipType; buyPrice: number; sellPrice: number; level: number }
    | { type: 'core'; coreId: string; name: string; buyPrice: number; sellPrice: number; level: number }
    | { type: 'potion'; potionType: PotionType; level: number }
    | { type: 'money'; amount: number };

/** Configuration for a single loot chest placement. */
export interface LootChestConfig {
    x: number;
    y: number;
    z: number;
    /**
     * Bonus factor applied to item tier randomization.
     * Higher values increase the chance of better tiers (default: 1.0).
     */
    itemQualityFactor?: number;
}

/** Color for chests containing ZeroDay or Leet tier weapons. */
const HIGH_TIER_COLOR = 0xFF8C00;
/** Color for chests without high-tier weapons. */
const NORMAL_COLOR = 0x8B7355;

/**
 * A loot chest that the player can open via interaction (Enter / A).
 * Once opened, spawns 1–3 item drops in front of the chest that the player
 * can pick up. The chest color reflects the quality of items it contains:
 * orange for ZeroDay/Leet tier weapons, gray/brown otherwise.
 */
export class LootChest {
    /** Group containing the base box and the lid. */
    mesh: THREE.Group;
    body: CANNON.Body;
    isOpened: boolean = false;

    private scene: THREE.Scene;
    private world: CANNON.World;
    private itemQualityFactor: number;
    private lootEntries: ChestLootEntry[] | null = null;

    private baseMesh!: THREE.Mesh;
    private lidMesh!: THREE.Mesh;

    /** Width of the chest box. */
    private static readonly WIDTH = 1;
    /** Height of the base portion. */
    private static readonly BASE_HEIGHT = 0.5;
    /** Height of the lid portion. */
    private static readonly LID_HEIGHT = 0.3;
    /** Depth of the chest box. */
    private static readonly DEPTH = 0.8;
    /** Interaction range (distance from player). */
    private static readonly INTERACTION_RANGE = 2.5;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        position: CANNON.Vec3,
        itemQualityFactor: number = 1.0,
    ) {
        this.scene = scene;
        this.world = world;
        this.itemQualityFactor = itemQualityFactor;

        this.mesh = new THREE.Group();
        this.mesh.position.set(position.x, position.y, position.z);

        // Base (lower box)
        const baseGeo = new THREE.BoxGeometry(
            LootChest.WIDTH,
            LootChest.BASE_HEIGHT,
            LootChest.DEPTH,
        );
        const baseMat = new THREE.MeshStandardMaterial({ color: NORMAL_COLOR });
        this.baseMesh = new THREE.Mesh(baseGeo, baseMat);
        this.baseMesh.position.y = LootChest.BASE_HEIGHT / 2;
        this.baseMesh.castShadow = true;
        this.baseMesh.receiveShadow = true;
        this.mesh.add(this.baseMesh);

        // Lid (upper box, hinged at the back edge)
        const lidGeo = new THREE.BoxGeometry(
            LootChest.WIDTH,
            LootChest.LID_HEIGHT,
            LootChest.DEPTH,
        );
        const lidMat = new THREE.MeshStandardMaterial({ color: NORMAL_COLOR });
        this.lidMesh = new THREE.Mesh(lidGeo, lidMat);
        // Translate geometry so the pivot sits at the back-bottom edge.
        // Geometry extends forward (+Z) and upward (+Y) from the pivot.
        this.lidMesh.geometry.translate(0, LootChest.LID_HEIGHT / 2, LootChest.DEPTH / 2);
        // Place the pivot at the back-top of the base
        this.lidMesh.position.set(0, LootChest.BASE_HEIGHT, -LootChest.DEPTH / 2);
        this.lidMesh.castShadow = true;
        this.lidMesh.receiveShadow = true;
        this.mesh.add(this.lidMesh);

        scene.add(this.mesh);

        // Physics body (static, blocks movement). Collider extends 2m high to
        // prevent the player from jumping on top of the chest.
        const colliderHeight = 2;
        const shape = new CANNON.Box(
            new CANNON.Vec3(LootChest.WIDTH / 2, colliderHeight / 2, LootChest.DEPTH / 2),
        );
        this.body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        this.body.addShape(shape);
        this.body.position.set(position.x, position.y + colliderHeight / 2, position.z);
        world.addBody(this.body);
    }

    /** Check if the player is close enough to interact. */
    isPlayerNearby(playerPosition: THREE.Vector3): boolean {
        const dx = this.mesh.position.x - playerPosition.x;
        const dz = this.mesh.position.z - playerPosition.z;
        return Math.sqrt(dx * dx + dz * dz) < LootChest.INTERACTION_RANGE;
    }

    /** Get the interaction hint text. */
    getInteractionHint(inputManager: InputManager): string {
        return getHint(HintConfigs.openChest, inputManager);
    }

    /**
     * Pre-generate loot and set the chest color based on contents.
     * Safe to call multiple times; only runs on first invocation.
     */
    prepareLoot(player: Player): void {
        if (this.lootEntries !== null) return;
        this.lootEntries = this.generateLoot(player, this.itemQualityFactor);
        this.applyChestColor(this.lootEntries);
    }

    /**
     * Open the chest, visually open the lid, and spawn item drops
     * in front of the chest toward the player.
     */
    open(player: Player): void {
        if (this.isOpened) return;
        this.isOpened = true;
        this.prepareLoot(player);
        this.showOpenedLid();
        this.spawnDrops(this.lootEntries!);
    }

    /** Clean up all resources when the stage is cleared. */
    cleanup(): void {
        this.scene.remove(this.mesh);
        this.baseMesh.geometry.dispose();
        (this.baseMesh.material as THREE.Material).dispose();
        this.lidMesh.geometry.dispose();
        (this.lidMesh.material as THREE.Material).dispose();
        this.world.removeBody(this.body);
    }

    /** Visually open the lid by rotating it back ~100 degrees around the back hinge. */
    private showOpenedLid(): void {
        this.lidMesh.rotation.x = -100 * (Math.PI / 180);
    }

    /**
     * Set the chest color based on whether it contains any ZeroDay or Leet tier weapons.
     */
    private applyChestColor(loot: ChestLootEntry[]): void {
        const hasHighTier = loot.some(entry =>
            entry.type === 'weapon' && (entry.tierName === Tier.ZERODAY || entry.tierName === Tier.LEET),
        );
        const color = hasHighTier ? HIGH_TIER_COLOR : NORMAL_COLOR;
        (this.baseMesh.material as THREE.MeshStandardMaterial).color.setHex(color);
        (this.lidMesh.material as THREE.MeshStandardMaterial).color.setHex(color);
    }

    /**
     * Spawn item drops in front of the chest (+Z direction), in a row
     * centered 1m ahead with 1m spacing along the X axis.
     */
    private spawnDrops(loot: ChestLootEntry[]): void {
        if (loot.length === 0) return;

        const chestPos = this.mesh.position;
        // Center point 1m in front of the chest (+Z is the front)
        const centerX = chestPos.x;
        const centerY = chestPos.y + 0.5;
        const centerZ = chestPos.z + 1;

        const count = loot.length;
        const dropManager = ItemDropManager.Instance;

        for (let i = 0; i < count; i++) {
            // Spread items along X, centered on the chest
            const offset = (i - (count - 1) / 2);
            const pos = new CANNON.Vec3(
                centerX + offset,
                centerY,
                centerZ,
            );
            const drop = this.createDrop(loot[i], pos);
            if (drop) {
                dropManager.addDrop(drop);
            }
        }
    }

    /** Create a concrete ItemDrop from a loot entry at the given position. */
    private createDrop(entry: ChestLootEntry, position: CANNON.Vec3): ItemDrop | null {
        switch (entry.type) {
            case 'weapon':
                return new WeaponDrop(
                    entry.weaponId, this.scene, position,
                    entry.weaponType, entry.name, entry.damage,
                    entry.buyPrice, entry.sellPrice, entry.level, entry.damageFactor,
                );
            case 'chip':
                return new ChipDrop(
                    this.scene, position,
                    entry.chipId, entry.name, entry.chipType,
                    entry.buyPrice, entry.sellPrice, entry.level,
                );
            case 'core':
                return new CoreDrop(
                    this.scene, position,
                    entry.coreId, entry.name,
                    entry.buyPrice, entry.sellPrice, entry.level,
                );
            case 'potion':
                return new PotionDrop(this.scene, position, entry.potionType, entry.level);
            case 'money':
                return new MoneyDrop(this.scene, position, entry.amount);
        }
    }

    // -----------------------------------------------------------------------
    // Loot generation
    // -----------------------------------------------------------------------

    /**
     * Generate 1–3 loot entries: one guaranteed item, then 15% chance
     * for a second and 4% chance for a third.
     */
    private generateLoot(player: Player, qualityFactor: number): ChestLootEntry[] {
        const entries: ChestLootEntry[] = [];

        const first = this.generateSingleEntry(player, qualityFactor);
        if (first) entries.push(first);

        if (Math.random() < 0.15) {
            const second = this.generateSingleEntry(player, qualityFactor);
            if (second) entries.push(second);
        }

        if (Math.random() < 0.04) {
            const third = this.generateSingleEntry(player, qualityFactor);
            if (third) entries.push(third);
        }

        return entries;
    }

    private generateSingleEntry(player: Player, qualityFactor: number): ChestLootEntry | null {
        const roll = Math.random();
        if (roll < 0.25) {
            return this.generateWeaponEntry(player, qualityFactor);
        } else if (roll < 0.45) {
            return this.generateChipEntry(player);
        } else if (roll < 0.65) {
            return this.generateCoreEntry(player);
        } else if (roll < 0.80) {
            return { type: 'potion', potionType: PotionType.HP, level: determinePotionLevel(player.level) };
        } else if (roll < 0.90) {
            return { type: 'potion', potionType: PotionType.TP, level: determinePotionLevel(player.level) };
        } else {
            return this.generateMoneyEntry(player);
        }
    }

    private generateWeaponEntry(player: Player, qualityFactor: number): ChestLootEntry | null {
        const allTypes = [WeaponType.SWORD, WeaponType.DUAL_BLADE, WeaponType.LANCE, WeaponType.HAMMER];
        const weaponType = allTypes[Math.floor(Math.random() * allTypes.length)];
        const playerTech = player.getTechForWeapon(weaponType);

        let baseLevel = 1;
        for (let i = 0; i < WeaponItem.WEAPON_LEVELS.length; i++) {
            if (playerTech >= WeaponItem.WEAPON_LEVELS[i].requiredTech) {
                baseLevel = i + 1;
            } else {
                break;
            }
        }

        const weaponItem = WeaponRepository.Instance.getWeaponByTypeAndLevel(weaponType, baseLevel);
        if (!weaponItem) return null;

        const bonusMultiplier = this.generateQualityBoostedMultiplier(qualityFactor);
        const result = WeaponBonusCalculator.Instance.applyWeaponBonus(weaponItem, bonusMultiplier);
        const damageFactor = weaponItem.damage > 0 ? result.damage / weaponItem.damage : 1;

        return {
            type: 'weapon',
            weaponId: result.id,
            weaponType: result.weaponType,
            name: result.name,
            damage: result.damage,
            buyPrice: result.buyPrice,
            sellPrice: result.sellPrice,
            level: result.level,
            damageFactor,
            tierName: result.tier.name,
        };
    }

    private generateChipEntry(player: Player): ChestLootEntry | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const chipItem = ChipRepository.Instance.getRandomChipOfLevel(level);
        if (!chipItem) return null;
        return {
            type: 'chip',
            chipId: chipItem.id,
            name: chipItem.name,
            chipType: chipItem.chipType,
            buyPrice: chipItem.buyPrice,
            sellPrice: chipItem.sellPrice,
            level,
        };
    }

    private generateCoreEntry(player: Player): ChestLootEntry | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return null;
        return {
            type: 'core',
            coreId: coreItem.id,
            name: coreItem.name,
            buyPrice: coreItem.buyPrice,
            sellPrice: coreItem.sellPrice,
            level,
        };
    }

    private generateMoneyEntry(player: Player): ChestLootEntry {
        const safeLevel = Math.max(1, player.level);
        const levelBonus = Math.pow(Math.log10(safeLevel), 2) / 400;
        const chances = [
            { amount: 500, baseChance: 0.01 },
            { amount: 200, baseChance: 0.05 },
            { amount: 100, baseChance: 0.10 },
        ];
        const random = Math.random();
        let cumulative = 0;
        for (const { amount, baseChance } of chances) {
            cumulative += Math.min(1.0, baseChance + levelBonus);
            if (random < cumulative) return { type: 'money', amount };
        }
        return { type: 'money', amount: 10 };
    }

    /**
     * Generate a bonus multiplier boosted by the quality factor.
     * Higher quality factors shift the distribution upward.
     */
    private generateQualityBoostedMultiplier(qualityFactor: number): number {
        // Base random in [-0.55, +0.61]  (same spread as WeaponDropStrategy)
        const raw = 1.16 * Math.random() - 0.55;
        // Use a curve to keep values close to 1 more common, but allow up to ~1.5x for high rolls with high quality factors
        const baseBonus = Math.sign(raw) * Math.pow(Math.abs(raw), 3.4);
        const bonus = Math.min(1 + baseBonus * qualityFactor, 1.5);
        console.log(`Dropping weapon with raw bonus: ${baseBonus.toFixed(3)}, quality factor: ${qualityFactor.toFixed(2)}, final bonus: ${bonus.toFixed(3)}`);
        return bonus;
    }
}
