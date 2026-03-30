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
import { getHint, HintConfigs } from '../ui/InputHints';
import { ChestUI } from './ChestUI';

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

/**
 * A loot chest that the player can open via interaction (Enter / A).
 * Once opened, shows a chest inventory UI where the player can freely
 * take items (no purchase required). The chest can be reopened as many
 * times as desired, as long as items remain.
 */
export class LootChest {
    /** Group containing the base box and the lid. */
    mesh: THREE.Group;
    body: CANNON.Body;
    isOpened: boolean = false;

    private scene: THREE.Scene;
    private world: CANNON.World;
    private chestItems: Item[] = [];
    private chestUI: ChestUI | null = null;
    private itemQualityFactor: number;

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
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
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
        const lidMat = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
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
     * Open or reopen the chest and show the UI.
     * The first time, loot is generated based on the player's current stats.
     * Subsequent opens reshow the same remaining contents.
     */
    open(player: Player): void {
        // Generate loot on first open
        if (!this.isOpened) {
            this.isOpened = true;
            this.showOpenedLid();
            this.generateLoot(player, this.itemQualityFactor);
            this.chestUI = new ChestUI(this.chestItems);
        }
        this.chestUI!.show();
    }

    /** Whether the chest UI is currently visible. */
    get isUIVisible(): boolean {
        return this.chestUI?.isVisible ?? false;
    }

    /** Whether the chest still has items remaining. */
    get hasItems(): boolean {
        return this.chestItems.length > 0;
    }

    /** Update the chest UI (navigation, rendering). */
    updateUI(player: Player, input: InputManager): void {
        this.chestUI?.update(player, input);
    }

    /** Clean up all resources when the stage is cleared. */
    cleanup(): void {
        this.chestUI?.hide();
        this.scene.remove(this.mesh);
        this.baseMesh.geometry.dispose();
        (this.baseMesh.material as THREE.Material).dispose();
        this.lidMesh.geometry.dispose();
        (this.lidMesh.material as THREE.Material).dispose();
        this.world.removeBody(this.body);
    }

    /** Visually open the lid by rotating it back ~100 degrees around the back hinge. */
    private showOpenedLid(): void {
        // Negative X rotation swings the lid upward and backward from the back-edge pivot,
        // keeping it above the base geometry.
        this.lidMesh.rotation.x = -100 * (Math.PI / 180);
        // Darken the base slightly to indicate opened state
        (this.baseMesh.material as THREE.MeshStandardMaterial).color.setHex(0x8B6914);
    }

    // -----------------------------------------------------------------------
    // Loot generation
    // -----------------------------------------------------------------------

    /**
     * Generate loot items. Base count is 1-2, then 2-3 additional items each
     * with decreasing probability (60%, 35%, 15%).
     */
    private generateLoot(player: Player, qualityFactor: number): void {
        // Base items: always 1, 50% chance of 2
        const baseCount = Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < baseCount; i++) {
            const item = this.generateSingleItem(player, qualityFactor);
            if (item) this.chestItems.push(item);
        }

        // Additional items with decreasing probability
        const additionalChances = [0.60, 0.35, 0.15];
        for (const chance of additionalChances) {
            if (Math.random() < chance) {
                const item = this.generateSingleItem(player, qualityFactor);
                if (item) this.chestItems.push(item);
            }
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
