import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import { WeaponDrop } from '../items/weapons/WeaponDrop';
import { WeaponType } from '../items/weapons/WeaponType';
import { PotionDrop } from '../items/potions/PotionDrop';
import { PotionType } from '../items/potions/PotionDefinitions';
import { ItemDropManager } from '../items/ItemDropManager';
import { ItemDrop } from '../items/ItemDrop';
import { Player } from '../Player';
import { SpawnButton } from './SpawnButton';
import { Npc } from '../npcs/Npc';
import { CoreDrop } from '../items/cores/CoreDrop';
import { CoreRepository } from '../items/cores/CoreRepository';
import { ChipDrop } from '../items/chips/ChipDrop';
import { ChipRepository } from '../items/chips/ChipRepository';
import { MoneyDrop } from '../items/bits/MoneyDrop';
import { XDataDrop } from '../items/xdata/XDataDrop';
import { BoosterPackDrop } from '../items/cards/BoosterPackDrop';
import { BreakableBarrel } from '../items/BreakableBarrel';
import { LootChest } from '../items/LootChest';
import { Enemy } from '../enemies/Enemy';
import { BossEnemy } from '../enemies/BossEnemy';
import { ElectricTrap } from '../items/ElectricTrap';
import { AudioManager } from '../AudioManager';
import { DEFAULT_ENEMY_TYPE, type EnemyType } from '../enemies/EnemyType';
import type { EnemySpawnPoint } from './RoomBasedDungeonGenerator';
import { ModelProp } from '../ModelProp';
import {
    DUNGEON_PROP_ASSET_PATHS,
    DUNGEON_PROP_DEFINITIONS,
} from './DungeonPropCatalog';

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Generic spawn config for any test item drop that auto-respawns. */
interface TestDropSpawnConfig {
    position: CANNON.Vec3;
    /** Factory that creates a fresh drop instance at the configured position. */
    create: (scene: THREE.Scene, position: CANNON.Vec3) => ItemDrop;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Respawn delay in seconds for collected test items. */
const RESPAWN_DELAY = 3;

/** Floor size for the entire test stage. */
const FLOOR_SIZE = 120;

// ─── Area origins ─────────────────────────────────────────────────────────────

/** Enemy spawn button area */
const BUTTON_AREA_X = 0;
const BUTTON_AREA_Z = 8;
/** Distance from buttons to enemy spawn zone (just outside aggro range of 15). */
const ENEMY_SPAWN_OFFSET_Z = 17;
/** Padding around the spawn area indicator plane. */
const SPAWN_AREA_PADDING = 3;

/** Item grid area */
const ITEM_GRID_X = 5;
const ITEM_GRID_Z = -10;
const ITEM_GRID_SPACING = 2;

/** Barrel / chest area */
const BARREL_POS = new CANNON.Vec3(12, 0, 0);
const CHEST_POS = new CANNON.Vec3(14, 0, 0);

/** Aegis Sword pricing used for test weapon drops. */
const AEGIS_SWORD_BUY_PRICE = 100;
const AEGIS_SWORD_SELL_PRICE = 50;

/* Traps area */
const TRAPS_AREA_X = 12;
const TRAPS_AREA_Z = -5;

/** Props grid area (opposite side from item grid) */
const PROP_GRID_X = -5;
const PROP_GRID_Z = -10;
const PROP_GRID_SPACING = 4;
const PROP_GRID_COLS = 4;

// ─── GameTest ─────────────────────────────────────────────────────────────────

export class GameTest extends BaseStage {
    private static id: string = "gameTest";
    private static name: string = "Game Test";
    private static description: string = "A test stage for game mechanics";

    id = GameTest.id;
    name = GameTest.name;
    description = GameTest.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    /** Unified drop spawn configs (weapons, cores, chips, money, xdata, potions, booster). */
    private dropSpawnConfigs: TestDropSpawnConfig[] = [];
    /** Maps live drops → their spawn config so we can detect pickup and respawn. */
    private activeDrops: Map<ItemDrop, TestDropSpawnConfig> = new Map();
    /** Pending respawn timers. */
    private dropRespawnTimers: { config: TestDropSpawnConfig; timer: number }[] = [];

    /** Barrel respawn tracking. */
    private barrelRespawnTimer = -1;
    private barrelDestroyed = false;

    /** Chest respawn tracking. */
    private chestRespawnTimer = -1;
    private chestEmptied = false;

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: GameTest.id,
            name: GameTest.name,
            description: GameTest.description,
            requiredProgress: -1,
        };
    }

    getRequiredAssets(): string[] {
        return [
            'models/brute_enemy.glb',
            'models/stalker_enemy.glb',
            ...DUNGEON_PROP_ASSET_PATHS,
        ];
    }

    clear(): void {
        this.dropSpawnConfigs = [];
        this.activeDrops.clear();
        this.dropRespawnTimers = [];
        this.barrelRespawnTimer = -1;
        this.barrelDestroyed = false;
        this.chestRespawnTimer = -1;
        this.chestEmptied = false;
        super.clear();
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Teleporter back to Lobby
        this.createTeleporter(new CANNON.Vec3(0, 0, -3), Lobby.getMetadata().id);

        // Ground plane
        const geo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.FrontSide });
        const floorPlane = new THREE.Mesh(geo, mat);
        this.scene.add(floorPlane);
        this.meshes.push(floorPlane);

        // Build the test areas
        this.buildEnemySpawnArea();
        this.buildItemGrid();
        this.buildBarrelChestArea();
        this.buildTrapsArea();
        this.buildPropsGrid();
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  Update
    // ───────────────────────────────────────────────────────────────────────────

    update(dt: number, player: Player, anyMenuOpen: boolean, cameraPosition?: THREE.Vector3): void {
        super.update(dt, player, anyMenuOpen, cameraPosition);

        this.tickDropRespawns(dt);
        this.tickBarrelRespawn(dt);
        this.tickChestRespawn(dt);
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  Enemy Spawn Buttons
    // ───────────────────────────────────────────────────────────────────────────

    private buildEnemySpawnArea(): void {
        const spawnZ = BUTTON_AREA_Z + ENEMY_SPAWN_OFFSET_Z;

        const addButton = (xOffset: number, label: string, color: number, spawn: (pos: CANNON.Vec3) => void) => {
            const btn = new SpawnButton(
                this.scene, this.physicsWorld, this.physicsMaterial,
                new CANNON.Vec3(BUTTON_AREA_X + xOffset, 0, BUTTON_AREA_Z),
                label, `Spawn ${label}`, color,
                () => spawn(new CANNON.Vec3(BUTTON_AREA_X + xOffset, 0.5, spawnZ)),
            );
            // SpawnButton duck-types the Npc interface used by Game.ts interaction loop
            this.npcs.add(btn as unknown as Npc);
        };

        addButton(-2, 'Enemy', 0xff3333, (pos) => this.spawnEnemy(pos));
        addButton(0, 'Elite Enemy', 0xff8800, (pos) => this.spawnEnemy(pos, EnemySpawnType.Elite));
        addButton(2, 'Boss', 0xaa00ff, (pos) => this.spawnBoss(pos));

        // Indicator plane spanning the button row and the spawn zone
        const minX = BUTTON_AREA_X - 2 - SPAWN_AREA_PADDING;
        const maxX = BUTTON_AREA_X + 2 + SPAWN_AREA_PADDING;
        const minZ = BUTTON_AREA_Z - SPAWN_AREA_PADDING;
        const maxZ = spawnZ + SPAWN_AREA_PADDING;
        const planeW = maxX - minX;
        const planeD = maxZ - minZ;
        const planeCX = (minX + maxX) / 2;
        const planeCZ = (minZ + maxZ) / 2;

        const planeGeo = new THREE.PlaneGeometry(planeW, planeD);
        planeGeo.rotateX(-Math.PI / 2);
        const planeMat = new THREE.MeshStandardMaterial({
            color: 0x334455,
            transparent: true,
            opacity: 0.35,
            side: THREE.FrontSide,
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMat);
        planeMesh.position.set(planeCX, 0.01, planeCZ);
        planeMesh.receiveShadow = true;
        this.scene.add(planeMesh);
        this.meshes.push(planeMesh);
    }

    protected override spawnEnemy(
        position: CANNON.Vec3,
        spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite = EnemySpawnType.Regular,
        _spawn?: EnemySpawnPoint,
        enemyType: EnemyType = DEFAULT_ENEMY_TYPE,
    ): void {
        const enemy = new Enemy(this.scene, this.physicsWorld, position, this.physicsMaterial, spawnType === EnemySpawnType.Elite ? {
            maxHp: 150,
            speed: 3.75,
            damage: 15,
            baseExp: 25,
            itemDropChance: 0.30,
            techDropRateFactor: 1.3,
            xDataDropChanceWeight: 1.5,
            criticalChance: 0.05,
            criticalHitMultiplier: 1.4,
            blockChance: 0.2,
            size: 2.75,
            color: 0x663300,
        } : {}, enemyType);
        enemy.update(0);
        this.enemies.push(enemy);
    }

    protected override spawnBoss(
        position: CANNON.Vec3,
        _spawn?: EnemySpawnPoint,
        enemyType: EnemyType = DEFAULT_ENEMY_TYPE,
    ): void {
        const boss = new BossEnemy(this.scene, this.physicsWorld, position, this.physicsMaterial, {}, enemyType);
        boss.update(0);
        this.enemies.push(boss);
        AudioManager.Instance.playBossSpawn();
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  Item Drop Grid
    // ───────────────────────────────────────────────────────────────────────────

    private buildItemGrid(): void {
        const S = ITEM_GRID_SPACING;
        let col = 0;
        let row = 0;

        const pos = () => new CANNON.Vec3(ITEM_GRID_X + col * S, 0.5, ITEM_GRID_Z - row * S);
        const next = () => { col++; };
        const nextRow = () => { col = 0; row++; };

        // Row 0: Aegis Sword – one per tier
        const weaponConfigs: { damage: number; level: number; factor: number }[] = [
            { damage: 8, level: 1, factor: 0.80 },  // Broken
            { damage: 10, level: 1, factor: 1.00 },  // Stable
            { damage: 10, level: 1, factor: 1.05 },  // Maintained
            { damage: 11, level: 1, factor: 1.10 },  // Overclocked
            { damage: 12, level: 1, factor: 1.15 },  // ZeroDay
            { damage: 12, level: 1, factor: 1.20 },  // Leet
        ];
        for (const wc of weaponConfigs) {
            this.addDropConfig(pos(), (scene, p) =>
                new WeaponDrop('aegis_sword_alpha', scene, p, WeaponType.SWORD,
                    'Aegis Sword', wc.damage, AEGIS_SWORD_BUY_PRICE, AEGIS_SWORD_SELL_PRICE, wc.level, wc.factor));
            next();
        }
        nextRow();

        // Row 1: Core, Chip, Booster Pack
        const coreRepo = CoreRepository.Instance;
        const core = coreRepo.getCoreByNameAndLevel('Herald Core', 1);
        if (core) {
            this.addDropConfig(pos(), (scene, p) =>
                new CoreDrop(scene, p, core.id, core.name, core.buyPrice, core.sellPrice, core.level));
        }
        next();

        const chipRepo = ChipRepository.Instance;
        const chip = chipRepo.getChipByNameAndLevel('Firewire', 1);
        if (chip) {
            this.addDropConfig(pos(), (scene, p) =>
                new ChipDrop(scene, p, chip.id, chip.name, chip.chipType, chip.buyPrice, chip.sellPrice, chip.level));
        }
        next();

        this.addDropConfig(pos(), (scene, p) => new BoosterPackDrop(scene, p));
        nextRow();

        // Row 2: Money – all available amounts
        for (const amount of [10, 100, 200, 500]) {
            this.addDropConfig(pos(), (scene, p) => new MoneyDrop(scene, p, amount));
            next();
        }
        nextRow();

        // Row 3: XData – all available amounts
        for (const amount of [1, 5, 20, 100]) {
            this.addDropConfig(pos(), (scene, p) => new XDataDrop(scene, p, amount));
            next();
        }
        nextRow();

        // Row 4: HP Potions (levels 1–6)
        for (let level = 1; level <= 6; level++) {
            this.addDropConfig(pos(), (scene, p) => new PotionDrop(scene, p, PotionType.HP, level));
            next();
        }
        nextRow();

        // Row 5: TP Potions (levels 1–6)
        for (let level = 1; level <= 6; level++) {
            this.addDropConfig(pos(), (scene, p) => new PotionDrop(scene, p, PotionType.TP, level));
            next();
        }

        // Spawn all configured drops
        for (const config of this.dropSpawnConfigs) {
            this.spawnTestDrop(config);
        }
    }

    /** Register a drop config and remember it for respawning. */
    private addDropConfig(
        position: CANNON.Vec3,
        create: (scene: THREE.Scene, position: CANNON.Vec3) => ItemDrop,
    ): void {
        this.dropSpawnConfigs.push({ position, create });
    }

    /** Create a drop from config, register with ItemDropManager, and track it. */
    private spawnTestDrop(config: TestDropSpawnConfig): void {
        const drop = config.create(this.scene, config.position.clone());
        ItemDropManager.Instance.addDrop(drop);
        this.activeDrops.set(drop, config);
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  Barrel & Chest
    // ───────────────────────────────────────────────────────────────────────────

    private buildBarrelChestArea(): void {
        this.spawnBarrel();
        this.spawnChest();
    }

    private spawnBarrel(): void {
        const barrel = new BreakableBarrel(
            this.scene, this.physicsWorld, this.physicsMaterial, BARREL_POS);
        this.breakableBarrels.push(barrel);
        this.barrelDestroyed = false;
    }

    private spawnChest(): void {
        const chest = new LootChest(
            this.scene, this.physicsWorld, this.physicsMaterial, CHEST_POS);
        this.lootChests.push(chest);
        this.chestEmptied = false;
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  Traps
    // ───────────────────────────────────────────────────────────────────────────

    private buildTrapsArea(): void {
        this.electricTraps.push(new ElectricTrap(this.scene, {
            x: TRAPS_AREA_X,
            y: 0,
            z: TRAPS_AREA_Z,
            width: 1,
            length: 1,
            damage: 10,
            activationInterval: [1000, 1000],
        }));
        this.electricTraps.push(new ElectricTrap(this.scene, {
            x: TRAPS_AREA_X + 3,
            y: 0,
            z: TRAPS_AREA_Z,
            width: 2,
            length: 1,
            damage: 10,
            activationInterval: [500, 500, 1000, 500, 3000, 500],
        }));
        this.electricTraps.push(new ElectricTrap(this.scene, {
            x: TRAPS_AREA_X + 6,
            y: 0,
            z: TRAPS_AREA_Z,
            width: 2,
            length: 1,
            damage: 10,
            activationInterval: [],
        }));
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  Props Grid
    // ───────────────────────────────────────────────────────────────────────────

    private buildPropsGrid(): void {
        DUNGEON_PROP_DEFINITIONS.forEach(({ modelName }, i) => {
            const col = i % PROP_GRID_COLS;
            const row = Math.floor(i / PROP_GRID_COLS);
            const x = PROP_GRID_X - col * PROP_GRID_SPACING;
            const z = PROP_GRID_Z - row * PROP_GRID_SPACING;
            const prop = new ModelProp(
                `props/${modelName}`,
                this.scene,
                this.physicsWorld,
                this.physicsMaterial,
                new THREE.Vector3(x, 0, z),
            );
            this.trackTransparencyEntity(prop);
            this.props.push(prop);
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  Respawn tick helpers
    // ───────────────────────────────────────────────────────────────────────────

    /** Detect picked-up drops and tick their respawn timers. */
    private tickDropRespawns(dt: number): void {
        for (const [drop, config] of this.activeDrops) {
            if (!drop.mesh.parent) {
                this.activeDrops.delete(drop);
                this.dropRespawnTimers.push({ config, timer: RESPAWN_DELAY });
            }
        }

        for (let i = this.dropRespawnTimers.length - 1; i >= 0; i--) {
            this.dropRespawnTimers[i].timer -= dt;
            if (this.dropRespawnTimers[i].timer <= 0) {
                this.spawnTestDrop(this.dropRespawnTimers[i].config);
                this.dropRespawnTimers.splice(i, 1);
            }
        }
    }

    /** Detect barrel destruction and respawn after delay. */
    private tickBarrelRespawn(dt: number): void {
        if (!this.barrelDestroyed) {
            const barrel = this.breakableBarrels.find(b => b.isDestroyed);
            if (barrel) {
                this.barrelDestroyed = true;
                this.barrelRespawnTimer = RESPAWN_DELAY;
            }
        }

        if (this.barrelRespawnTimer >= 0) {
            this.barrelRespawnTimer -= dt;
            if (this.barrelRespawnTimer <= 0) {
                // Remove all destroyed barrels
                for (const b of this.breakableBarrels) {
                    b.cleanup();
                }
                this.breakableBarrels = [];
                this.spawnBarrel();
                this.barrelRespawnTimer = -1;
            }
        }
    }

    /** Detect emptied chest and respawn after delay. */
    private tickChestRespawn(dt: number): void {
        if (!this.chestEmptied) {
            const chest = this.lootChests.find(c => c.isOpened);
            if (chest) {
                this.chestEmptied = true;
                this.chestRespawnTimer = RESPAWN_DELAY;
            }
        }

        if (this.chestRespawnTimer >= 0) {
            this.chestRespawnTimer -= dt;
            if (this.chestRespawnTimer <= 0) {
                for (const c of this.lootChests) {
                    c.cleanup();
                }
                this.lootChests = [];
                this.spawnChest();
                this.chestRespawnTimer = -1;
            }
        }
    }
}
