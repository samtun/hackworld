import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { StageWithLevels } from './StageWithLevels';
import type { StageLevelConfig } from './StageWithLevels';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';
import { EnemyType } from '../enemies/EnemyType';
import { getDungeonPropDefinitions } from './DungeonPropCatalog';

export class KernelTerminus extends StageWithLevels {
    private static id: string = 'kernelTerminus';
    private static name: string = 'Kernel Terminus';
    private static description: string = 'The terminal breach where VIRUS-ZERO hardens into core predators';
    private static readonly depth2Id: string = 'kernelTerminusDepth2';
    private static readonly depth3Id: string = 'kernelTerminusDepth3';
    private static readonly levelConfigs: Record<string, StageLevelConfig> = {
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

    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 2400,
        speed: 4.25,
        damage: 1400,
        baseExp: 620,
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
        maxHp: 3600,
        speed: 4.55,
        damage: 2500,
        baseExp: 850,
        itemDropChance: 0.46,
        techDropRateFactor: 2.0,
        xDataDropChanceWeight: 3.2,
        criticalChance: 0.09,
        criticalHitMultiplier: 1.8,
        blockChance: 0.36,
        size: 3.6,
        color: 0x78333d,
    };

    private static readonly regularPodEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 1700,
        speed: 3.15,
        damage: 1300,
        baseExp: 680,
        size: 2.35,
        color: 0x8a46c2,
    };

    private static readonly elitePodEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 2550,
        speed: 3.35,
        damage: 2350,
        baseExp: 930,
        size: 2.95,
        color: 0xac65eb,
    };

    private static readonly bossConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 14500,
        speed: 4.95,
        damage: 3200,
        baseExp: 3400,
        itemDropChance: 1,
        techDropRateFactor: 2.5,
        xDataDropChanceWeight: 5.7,
        criticalChance: 0.11,
        criticalHitMultiplier: 2.0,
        blockChance: 0.4,
        size: 5.1,
        color: 0x9f4654,
    };

    private static readonly obstacleProps = getDungeonPropDefinitions([
        'holoprojector', 'coolingtanklarge', 'dataspire', 'serverrack', 'coolingtank'
    ]);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 14, max: 18 },
        combatRoomSize: { minWidth: 14, maxWidth: 36, minDepth: 14, maxDepth: 36 },
        finalRoomSize: { minWidth: 24, maxWidth: 42, minDepth: 24, maxDepth: 42 },
        enemyCount: { min: 3, max: 8, areaPerEnemy: 55, eliteFraction: 0.45 },
        obstacleCount: { min: 2, max: 5 },
        obstacleProps: KernelTerminus.obstacleProps,
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
            damage: 4000,
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
        super(scene, physicsWorld, physicsMaterial, stageId, KernelTerminus.id, KernelTerminus.levelConfigs);
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
            'models/brute_enemy.glb',
            'models/stalker_enemy.glb',
            'models/pod_enemy.glb',
            ...this.getDungeonPropAssets(KernelTerminus.obstacleProps),
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

    protected override getAvailableEnemyTypes(spawnType: EnemySpawnType): readonly EnemyType[] {
        return spawnType === EnemySpawnType.Boss
            ? [EnemyType.Brute]
            : [EnemyType.Brute, EnemyType.Pod, EnemyType.Stalker];
    }

    protected override getEnemyTypeConfig(
        enemyType: EnemyType,
        spawnType: EnemySpawnType,
    ): Partial<EnemyArchetypeConfig> {
        if (enemyType !== EnemyType.Pod) {
            return {};
        }
        const baseConfig = spawnType === EnemySpawnType.Elite
            ? KernelTerminus.elitePodEnemyConfig
            : KernelTerminus.regularPodEnemyConfig;
        return this.scaleEnemyConfig(baseConfig);
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return this.scaleEnemyConfig(KernelTerminus.bossConfig);
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(
            this.buildGenerationConfig(KernelTerminus.generationConfig, {
                eliteFractionCap: 0.9,
                eliteFractionGain: 0.22,
                areaPerEnemyMin: 24,
                areaPerEnemyDifficultyGain: 0.4,
                trapDamageGain: 0.9,
            }),
        );
        this.setMinimapLayout(layout.minimapLayout, false);

        this.setSpawnPositionInFrontOfLobbyReturnTeleporter(layout);
        this.dungeonRooms = layout.rooms;

        this.buildFloorFromLayout(layout, this.levelConfig.floorColor);
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), this.levelConfig.teleporterDestination, false);

        // Lobby return teleporter at spawn – always active so players can leave at any time
        this.createLobbyReturnTeleporter(layout);

        this.spawnEnemiesFromLayout(layout);
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }

    protected override scaleEnemyConfig(config: Partial<EnemyArchetypeConfig>): Partial<EnemyArchetypeConfig> {
        return super.scaleEnemyConfig(config, { speedDifficultyGain: 0.15, expDifficultyGain: 0.8 });
    }
}
