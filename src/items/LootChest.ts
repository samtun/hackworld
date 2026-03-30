import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Item } from './Item';
import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { WeaponRepository } from './weapons/WeaponRepository';
import { WeaponType } from './weapons/WeaponType';
import { WeaponItem } from './weapons/WeaponItem';
import { WeaponBonusCalculator } from './weapons/WeaponBonusCalculator';
import { ChipRepository } from './chips/ChipRepository';
import { CoreRepository } from './cores/CoreRepository';
import { ItemLevelHelper } from './ItemLevelHelper';
import { getHint } from '../ui/InputHints';
import { ChestUI } from './ChestUI';

/** Configuration for a single loot chest placement. */
export interface LootChestConfig {
    x: number;
    y: number;
    z: number;
    /** Number of items in the chest (default: 3). */
    itemCount?: number;
    /**
     * Bonus factor applied to item tier randomization.
     * Higher values increase the chance of better tiers (default: 1.0).
     */
    itemQualityFactor?: number;
}

/**
 * A loot chest that the player can open via interaction (Enter / A).
 * Once opened, shows a chest inventory UI where the player can freely
 * take items (no purchase required).
 */
export class LootChest {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    isOpened: boolean = false;

    private scene: THREE.Scene;
    private world: CANNON.World;
    private chestItems: Item[] = [];
    private chestUI: ChestUI | null = null;
    private itemCount: number;
    private itemQualityFactor: number;

    /** Width of the chest box. */
    private static readonly WIDTH = 1;
    /** Height of the chest box. */
    private static readonly HEIGHT = 0.8;
    /** Depth of the chest box. */
    private static readonly DEPTH = 0.8;
    /** Interaction range (distance from player). */
    private static readonly INTERACTION_RANGE = 2.5;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        position: CANNON.Vec3,
        itemCount: number = 3,
        itemQualityFactor: number = 1.0,
    ) {
        this.scene = scene;
        this.world = world;
        this.itemCount = itemCount;
        this.itemQualityFactor = itemQualityFactor;

        // Visual: simple chest box
        const geo = new THREE.BoxGeometry(
            LootChest.WIDTH,
            LootChest.HEIGHT,
            LootChest.DEPTH,
        );
        const mat = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(position.x, position.y + LootChest.HEIGHT / 2, position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);

        // Physics body (static, blocks movement)
        const shape = new CANNON.Box(
            new CANNON.Vec3(LootChest.WIDTH / 2, LootChest.HEIGHT / 2, LootChest.DEPTH / 2),
        );
        this.body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        this.body.addShape(shape);
        this.body.position.set(position.x, position.y + LootChest.HEIGHT / 2, position.z);
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
        const hintConfig = {
            keyboard: '<span class="key-icon">ENTER</span> Open Chest',
            controller: '<span class="btn-icon xbox-a">A</span> Open Chest',
        };
        return getHint(hintConfig, inputManager);
    }

    /** Open the chest and show the UI. Generates loot based on the player's current stats. */
    open(player: Player): void {
        if (this.isOpened) return;
        this.isOpened = true;
        // Change colour to indicate opened
        (this.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x8B6914);

        // Generate loot at open time based on the player's current level/tech
        this.generateLoot(player, this.itemCount, this.itemQualityFactor);
        this.chestUI = new ChestUI(this.chestItems);
        this.chestUI.show();
    }

    /** Whether the chest UI is currently visible. */
    get isUIVisible(): boolean {
        return this.chestUI?.isVisible ?? false;
    }

    /** Update the chest UI (navigation, rendering). */
    updateUI(player: Player, input: InputManager): void {
        this.chestUI?.update(player, input);
    }

    /** Clean up all resources when the stage is cleared. */
    cleanup(): void {
        this.chestUI?.hide();
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.world.removeBody(this.body);
    }

    // -----------------------------------------------------------------------
    // Loot generation
    // -----------------------------------------------------------------------

    private generateLoot(player: Player, itemCount: number, qualityFactor: number): void {
        for (let i = 0; i < itemCount; i++) {
            const item = this.generateSingleItem(player, qualityFactor);
            if (item) this.chestItems.push(item);
        }
    }

    private generateSingleItem(player: Player, qualityFactor: number): Item | null {
        const roll = Math.random();
        if (roll < 0.40) {
            return this.generateWeapon(player, qualityFactor);
        } else if (roll < 0.70) {
            return this.generateChip(player);
        } else {
            return this.generateCore(player);
        }
    }

    private generateWeapon(player: Player, qualityFactor: number): Item | null {
        const allTypes = [WeaponType.SWORD, WeaponType.DUAL_BLADE, WeaponType.LANCE, WeaponType.HAMMER];
        const weaponType = allTypes[Math.floor(Math.random() * allTypes.length)];
        const playerTech = player.getTechForWeapon(weaponType);

        // Determine weapon level (same as WeaponDropStrategy)
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

        // Generate a tier-boosted bonus multiplier
        const bonusMultiplier = this.generateQualityBoostedMultiplier(qualityFactor);
        const result = WeaponBonusCalculator.Instance.applyWeaponBonus(weaponItem, bonusMultiplier);
        return result;
    }

    private generateChip(player: Player): Item | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const chipItem = ChipRepository.Instance.getRandomChipOfLevel(level);
        if (!chipItem) return null;
        return chipItem;
    }

    private generateCore(player: Player): Item | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return null;
        return coreItem;
    }

    /**
     * Generate a bonus multiplier boosted by the quality factor.
     * Higher quality factors shift the distribution upward.
     */
    private generateQualityBoostedMultiplier(qualityFactor: number): number {
        // Base random in [-0.55, +0.61]  (same spread as WeaponDropStrategy)
        const raw = 1.16 * Math.random() - 0.55;
        // Apply quality factor to boost the positive end
        const boosted = raw * qualityFactor;
        return 1 + Math.sign(boosted) * Math.pow(Math.abs(boosted), 3.4);
    }
}
