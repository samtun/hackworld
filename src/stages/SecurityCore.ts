import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';

interface SecurityCoreLevelConfig {
    id: string;
    name: string;
    description: string;
    floorColor: number;
    hasBoss: boolean;
    enemyDifficultyMultiplier: number;
    teleporterDestination: string;
    requiredProgress: number;
}

export class SecurityCore extends BaseStage {
    private static id: string = 'securityCore';
    private static name: string = 'Security Core';
    private static description: string = 'The heart of the security system';
    private static readonly depth2Id: string = 'securityCoreDepth2';
    private static readonly depth3Id: string = 'securityCoreDepth3';
    private static readonly levelConfigs: Record<string, SecurityCoreLevelConfig> = {
        [SecurityCore.id]: {
            id: SecurityCore.id,
            name: SecurityCore.name,
            description: 'Security Core / Layer 1',
            floorColor: 0x100a28,
            hasBoss: false,
            enemyDifficultyMultiplier: 1,
            teleporterDestination: SecurityCore.depth2Id,
            requiredProgress: 0,
        },
        [SecurityCore.depth2Id]: {
            id: SecurityCore.depth2Id,
            name: `${SecurityCore.name} // Lockstream`,
            description: 'Security Core / Layer 2',
            floorColor: 0x0b071c,
            hasBoss: false,
            enemyDifficultyMultiplier: 1.18,
            teleporterDestination: SecurityCore.depth3Id,
            requiredProgress: 0,
        },
        [SecurityCore.depth3Id]: {
            id: SecurityCore.depth3Id,
            name: `${SecurityCore.name} // Root Citadel`,
            description: 'Security Core / Layer 3',
            floorColor: 0x060412,
            hasBoss: true,
            enemyDifficultyMultiplier: 1.35,
            teleporterDestination: Lobby.getMetadata().id,
            requiredProgress: 7,
        },
    };

    id = SecurityCore.id;
    name = SecurityCore.name;
    description = SecurityCore.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);
    private readonly levelConfig: SecurityCoreLevelConfig;

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 190,
        speed: 4.05,
        damage: 95,
        baseExp: 40,
        itemDropChance: 0.34,
        techDropRateFactor: 1.5,
        xDataDropChanceWeight: 2.0,
        criticalChance: 0.06,
        criticalHitMultiplier: 1.5,
        blockChance: 0.24,
        size: 2.55,
        color: 0x2b1648,
    };

    private static readonly eliteEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 260,
        speed: 4.35,
        damage: 170,
        baseExp: 58,
        itemDropChance: 0.40,
        techDropRateFactor: 1.7,
        xDataDropChanceWeight: 2.5,
        criticalChance: 0.07,
        criticalHitMultiplier: 1.6,
        blockChance: 0.28,
        size: 3.1,
        color: 0x4e2a78,
    };

    private static readonly bossConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 920,
        speed: 4.75,
        damage: 230,
        baseExp: 220,
        itemDropChance: 1,
        techDropRateFactor: 2.0,
        xDataDropChanceWeight: 4.4,
        criticalChance: 0.09,
        criticalHitMultiplier: 1.75,
        blockChance: 0.32,
        size: 4.4,
        color: 0x6f3da6,
    };

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 12, max: 15 },
        combatRoomSize: { minWidth: 13, maxWidth: 33, minDepth: 13, maxDepth: 33 },
        finalRoomSize: { minWidth: 20, maxWidth: 39, minDepth: 20, maxDepth: 39 },
        enemyCount: { min: 2, max: 8, areaPerEnemy: 48, eliteFraction: 0.45 },
        obstacleCount: { min: 2, max: 4 },
        hasBoss: true,
        lootRoomCount: { min: 2, max: 3 },
        chestsPerLootRoom: 2,
        chestQualityFactor: 1.55,
        chestInTeleporterRoom: true,
        barrelCount: { min: 2, max: 5 },
        trapConfig: {
            count: { min: 2, max: 4 },
            width: { min: 2, max: 6 },
            length: { min: 2, max: 6 },
            damage: 250,
            patterns: [
                [900, 1400],
                [500, 700, 500, 1200],
                [350, 500, 350, 500, 350, 1600],
                [],
            ],
        },
    };

    constructor(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        stageId?: string,
    ) {
        super(scene, physicsWorld, physicsMaterial);
        this.levelConfig = SecurityCore.resolveLevelConfig(stageId);
        this.id = this.levelConfig.id;
        this.name = this.levelConfig.name;
        this.description = this.levelConfig.description;
    }

    static getLevelStageIds(): readonly string[] {
        return [SecurityCore.id, SecurityCore.depth2Id, SecurityCore.depth3Id] as const;
    }

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: SecurityCore.id,
            name: SecurityCore.name,
            description: SecurityCore.description,
            requiredProgress: 7 // Unlocked after finishing Cipher Null and talking to Mainframe again
        };
    }

    /**
     * Get assets required by this dungeon
     */
    getRequiredAssets(): string[] {
        return [
            'models/monster.glb'
        ];
    }

    protected override getEnemyConfig(
        spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite,
    ): Partial<EnemyArchetypeConfig> {
        const baseConfig = spawnType === EnemySpawnType.Elite
            ? SecurityCore.eliteEnemyConfig
            : SecurityCore.regularEnemyConfig;
        return this.scaleEnemyConfig(baseConfig);
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return this.scaleEnemyConfig(SecurityCore.bossConfig);
    }

    override getRequiredProgress(): number {
        return this.levelConfig.requiredProgress;
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Generate room-based procedural layout
        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(this.buildGenerationConfig());
        this.setMinimapLayout(layout.minimapLayout, false);

        // Update spawn position from generated layout
        this.spawnPosition.set(layout.spawnPosition.x, layout.spawnElevation + 0.4, layout.spawnPosition.z);

        // Register rooms for per-room enemy aggro and teleporter activation
        this.dungeonRooms = layout.rooms;

        // Floor segments for each room and corridor
        this.buildFloorFromLayout(layout, this.levelConfig.floorColor);

        // Build walls (with transparency shader) and obstacles
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        // Teleporter in the final room – starts inactive until all enemies are defeated
        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), this.levelConfig.teleporterDestination, false);

        // Lobby return teleporter at spawn – always active so players can leave at any time
        this.createLobbyReturnTeleporter(
            new CANNON.Vec3(layout.spawnPosition.x + 2, layout.spawnElevation, layout.spawnPosition.z),
            Lobby.getMetadata().id
        );

        // Spawn enemies with room assignments so aggro is room-gated
        this.spawnEnemiesFromLayout(layout);

        // Build loot chests, breakable barrels, and electric traps
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }

    private static resolveLevelConfig(stageId?: string): SecurityCoreLevelConfig {
        return SecurityCore.levelConfigs[stageId ?? SecurityCore.id] ?? SecurityCore.levelConfigs[SecurityCore.id];
    }

    private buildGenerationConfig(): RoomGenerationConfig {
        const difficulty = this.levelConfig.enemyDifficultyMultiplier;
        const base = SecurityCore.generationConfig;
        return {
            ...base,
            hasBoss: this.levelConfig.hasBoss,
            enemyCount: {
                ...base.enemyCount,
                min: Math.max(base.enemyCount.min, Math.floor(base.enemyCount.min * difficulty)),
                max: Math.max(base.enemyCount.max, Math.floor(base.enemyCount.max * difficulty)),
                eliteFraction: Math.min(0.85, base.enemyCount.eliteFraction + (difficulty - 1) * 0.25),
                areaPerEnemy: Math.max(30, Math.floor(base.enemyCount.areaPerEnemy / (1 + (difficulty - 1) * 0.35))),
            },
            ...(base.trapConfig
                ? {
                    trapConfig: {
                        ...base.trapConfig,
                        damage: Math.floor(base.trapConfig.damage * (1 + (difficulty - 1) * 0.85)),
                    },
                }
                : {}),
        };
    }

    private scaleEnemyConfig(config: Partial<EnemyArchetypeConfig>): Partial<EnemyArchetypeConfig> {
        const multiplier = this.levelConfig.enemyDifficultyMultiplier;
        return {
            ...config,
            maxHp: config.maxHp === undefined ? undefined : Math.floor(config.maxHp * multiplier),
            damage: config.damage === undefined ? undefined : Math.floor(config.damage * multiplier),
            speed: config.speed === undefined ? undefined : config.speed * (1 + (multiplier - 1) * 0.14),
            baseExp: config.baseExp === undefined ? undefined : Math.floor(config.baseExp * (1 + (multiplier - 1) * 0.75)),
        };
    }
}
