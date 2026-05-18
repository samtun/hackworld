import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';

interface KernelTerminusLevelConfig {
    id: string;
    name: string;
    description: string;
    floorColor: number;
    hasBoss: boolean;
    bossRoomCount?: number;
    enemyDifficultyMultiplier: number;
    teleporterDestination: string;
    requiredProgress: number;
}

export class KernelTerminus extends BaseStage {
    private static id: string = 'kernelTerminus';
    private static name: string = 'Kernel Terminus';
    private static description: string = 'The terminal breach where VIRUS-ZERO hardens into core predators';
    private static readonly depth2Id: string = 'kernelTerminusDepth2';
    private static readonly depth3Id: string = 'kernelTerminusDepth3';
    private static readonly levelConfigs: Record<string, KernelTerminusLevelConfig> = {
        [KernelTerminus.id]: {
            id: KernelTerminus.id,
            name: KernelTerminus.name,
            description: 'Kernel Terminus / Layer 1',
            floorColor: 0x2e1118,
            hasBoss: false,
            enemyDifficultyMultiplier: 1,
            teleporterDestination: KernelTerminus.depth2Id,
            requiredProgress: 0,
        },
        [KernelTerminus.depth2Id]: {
            id: KernelTerminus.depth2Id,
            name: `${KernelTerminus.name} // Predator Ring`,
            description: 'Kernel Terminus / Layer 2',
            floorColor: 0x210c12,
            hasBoss: true,
            bossRoomCount: 1,
            enemyDifficultyMultiplier: 1.22,
            teleporterDestination: KernelTerminus.depth3Id,
            requiredProgress: 0,
        },
        [KernelTerminus.depth3Id]: {
            id: KernelTerminus.depth3Id,
            name: `${KernelTerminus.name} // Core Apex`,
            description: 'Kernel Terminus / Layer 3',
            floorColor: 0x15070b,
            hasBoss: true,
            bossRoomCount: 2,
            enemyDifficultyMultiplier: 1.45,
            teleporterDestination: Lobby.getMetadata().id,
            requiredProgress: 9,
        },
    };

    id = KernelTerminus.id;
    name = KernelTerminus.name;
    description = KernelTerminus.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);
    private readonly levelConfig: KernelTerminusLevelConfig;

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 240,
        speed: 4.25,
        damage: 140,
        baseExp: 62,
        itemDropChance: 0.40,
        techDropRateFactor: 1.75,
        xDataDropChanceWeight: 2.7,
        criticalChance: 0.075,
        criticalHitMultiplier: 1.62,
        blockChance: 0.30,
        size: 3.0,
        color: 0x50222a,
    };

    private static readonly eliteEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 360,
        speed: 4.55,
        damage: 250,
        baseExp: 85,
        itemDropChance: 0.46,
        techDropRateFactor: 2.0,
        xDataDropChanceWeight: 3.2,
        criticalChance: 0.09,
        criticalHitMultiplier: 1.8,
        blockChance: 0.36,
        size: 3.6,
        color: 0x78333d,
    };

    private static readonly bossConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 1450,
        speed: 4.95,
        damage: 320,
        baseExp: 340,
        itemDropChance: 1,
        techDropRateFactor: 2.5,
        xDataDropChanceWeight: 5.7,
        criticalChance: 0.11,
        criticalHitMultiplier: 2.0,
        blockChance: 0.4,
        size: 5.1,
        color: 0x9f4654,
    };

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 14, max: 18 },
        combatRoomSize: { minWidth: 14, maxWidth: 36, minDepth: 14, maxDepth: 36 },
        finalRoomSize: { minWidth: 24, maxWidth: 42, minDepth: 24, maxDepth: 42 },
        enemyCount: { min: 3, max: 10, areaPerEnemy: 42, eliteFraction: 0.52 },
        obstacleCount: { min: 2, max: 5 },
        hasBoss: true,
        bossRoomCount: 2,
        lootRoomCount: { min: 3, max: 4 },
        chestsPerLootRoom: 2,
        chestQualityFactor: 1.95,
        chestInTeleporterRoom: true,
        barrelCount: { min: 2, max: 6 },
        trapConfig: {
            count: { min: 3, max: 5 },
            width: { min: 2, max: 6 },
            length: { min: 2, max: 7 },
            damage: 400,
            patterns: [
                [800, 900],
                [450, 550, 450, 900],
                [300, 450, 300, 450, 300, 1200],
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
        this.levelConfig = KernelTerminus.resolveLevelConfig(stageId);
        this.id = this.levelConfig.id;
        this.name = this.levelConfig.name;
        this.description = this.levelConfig.description;
    }

    static getLevelStageIds(): readonly string[] {
        return [KernelTerminus.id, KernelTerminus.depth2Id, KernelTerminus.depth3Id] as const;
    }

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: KernelTerminus.id,
            name: KernelTerminus.name,
            description: KernelTerminus.description,
            requiredProgress: 9,
        };
    }

    getRequiredAssets(): string[] {
        return [
            'models/monster.glb'
        ];
    }

    protected override getEnemyConfig(
        spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite,
    ): Partial<EnemyArchetypeConfig> {
        const baseConfig = spawnType === EnemySpawnType.Elite
            ? KernelTerminus.eliteEnemyConfig
            : KernelTerminus.regularEnemyConfig;
        return this.scaleEnemyConfig(baseConfig);
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return this.scaleEnemyConfig(KernelTerminus.bossConfig);
    }

    override getRequiredProgress(): number {
        return this.levelConfig.requiredProgress;
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(this.buildGenerationConfig());
        this.setMinimapLayout(layout.minimapLayout, false);

        this.spawnPosition.set(layout.spawnPosition.x, layout.spawnElevation + 0.4, layout.spawnPosition.z);
        this.dungeonRooms = layout.rooms;

        this.buildFloorFromLayout(layout, this.levelConfig.floorColor);
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), this.levelConfig.teleporterDestination, false);

        // Lobby return teleporter at spawn – always active so players can leave at any time
        this.createLobbyReturnTeleporter(
            new CANNON.Vec3(layout.spawnPosition.x + 2, layout.spawnElevation, layout.spawnPosition.z),
            Lobby.getMetadata().id
        );

        this.spawnEnemiesFromLayout(layout);
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }

    private static resolveLevelConfig(stageId?: string): KernelTerminusLevelConfig {
        return KernelTerminus.levelConfigs[stageId ?? KernelTerminus.id] ?? KernelTerminus.levelConfigs[KernelTerminus.id];
    }

    private buildGenerationConfig(): RoomGenerationConfig {
        const difficulty = this.levelConfig.enemyDifficultyMultiplier;
        const base = KernelTerminus.generationConfig;
        return {
            ...base,
            hasBoss: this.levelConfig.hasBoss,
            bossRoomCount: this.levelConfig.bossRoomCount,
            enemyCount: {
                ...base.enemyCount,
                min: Math.floor(base.enemyCount.min * difficulty),
                max: Math.floor(base.enemyCount.max * difficulty),
                eliteFraction: Math.min(0.9, base.enemyCount.eliteFraction + (difficulty - 1) * 0.22),
                areaPerEnemy: Math.max(24, Math.floor(base.enemyCount.areaPerEnemy / (1 + (difficulty - 1) * 0.4))),
            },
            ...(base.trapConfig
                ? {
                    trapConfig: {
                        ...base.trapConfig,
                        damage: Math.floor(base.trapConfig.damage * (1 + (difficulty - 1) * 0.9)),
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
            speed: config.speed === undefined ? undefined : config.speed * (1 + (multiplier - 1) * 0.15),
            baseExp: config.baseExp === undefined ? undefined : Math.floor(config.baseExp * (1 + (multiplier - 1) * 0.8)),
        };
    }
}
