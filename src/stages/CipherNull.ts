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

export class CipherNull extends StageWithLevels {
    private static id: string = 'cipherNull';
    private static name: string = 'Cipher Null';
    private static description: string = 'Failover archives where encrypted sectors collapse into void';
    private static readonly depth2Id: string = 'cipherNullDepth2';
    private static readonly levelConfigs: Record<string, StageLevelConfig> = {
        [CipherNull.id]: {
            id: CipherNull.id,
            name: CipherNull.name,
            description: 'Cipher Null / Layer 1',
            floorColor: 0x0d2630,
            hasBoss: false,
            enemyDifficultyMultiplier: 1,
            teleporterDestination: CipherNull.depth2Id,
            requiredProgress: 0,
        },
        [CipherNull.depth2Id]: {
            id: CipherNull.depth2Id,
            name: `${CipherNull.name} // Collapse Core`,
            description: 'Cipher Null / Layer 2',
            floorColor: 0x081720,
            hasBoss: true,
            enemyDifficultyMultiplier: 1.2,
            teleporterDestination: Lobby.getMetadata().id,
            requiredProgress: 5,
        },
    };

    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 1300,
        speed: 3.65,
        damage: 600,
        baseExp: 240,
        itemDropChance: 0.23,
        techDropRateFactor: 1.3,
        xDataDropChanceWeight: 1.6,
        criticalChance: 0.05,
        criticalHitMultiplier: 1.35,
        blockChance: 0.22,
        size: 2.2,
        color: 0x11363f,
    };

    private static readonly eliteEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 2100,
        speed: 4.1,
        damage: 1100,
        baseExp: 400,
        itemDropChance: 0.34,
        techDropRateFactor: 1.55,
        xDataDropChanceWeight: 2.2,
        criticalChance: 0.065,
        criticalHitMultiplier: 1.5,
        blockChance: 0.27,
        size: 3.0,
        color: 0x1a515d,
    };

    private static readonly regularPodEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 950,
        speed: 2.7,
        damage: 550,
        baseExp: 255,
        size: 1.95,
        color: 0x603b9c,
    };

    private static readonly elitePodEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 1500,
        speed: 3.05,
        damage: 1000,
        baseExp: 430,
        size: 2.55,
        color: 0x7e55c0,
    };

    private static readonly bossConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 7600,
        speed: 4.55,
        damage: 1600,
        baseExp: 1800,
        itemDropChance: 1,
        techDropRateFactor: 1.9,
        xDataDropChanceWeight: 3.9,
        criticalChance: 0.085,
        criticalHitMultiplier: 1.68,
        blockChance: 0.3,
        size: 4.1,
        color: 0x2a7888,
    };

    private static readonly obstacleProps = getDungeonPropDefinitions([
        'satellitedish', 'vent', 'ac', 'barrier', 'receiverstation'
    ]);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 9, max: 13 },
        combatRoomSize: { minWidth: 14, maxWidth: 30, minDepth: 14, maxDepth: 30 },
        finalRoomSize: { minWidth: 20, maxWidth: 35, minDepth: 20, maxDepth: 35 },
        enemyCount: { min: 2, max: 7, areaPerEnemy: 55, eliteFraction: 0.35 },
        obstacleCount: { min: 2, max: 4 },
        obstacleProps: CipherNull.obstacleProps,
        hasBoss: true,
        lootRoomCount: { min: 2, max: 2 },
        chestsPerLootRoom: 2,
        chestQualityFactor: 1.35,
        chestInTeleporterRoom: true,
        barrelCount: { min: 2, max: 4 },
        trapConfig: {
            count: { min: 2, max: 4 },
            width: { min: 2, max: 5 },
            length: { min: 2, max: 6 },
            damage: 1300,
            patterns: [
                [1000, 1300],
                [600, 700, 600, 1300],
                [450, 600, 450, 600, 450, 1600],
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
        super(scene, physicsWorld, physicsMaterial, stageId, CipherNull.id, CipherNull.levelConfigs);
    }

    static getLevelStageIds(): readonly string[] {
        return [CipherNull.id, CipherNull.depth2Id] as const;
    }

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: CipherNull.id,
            name: CipherNull.name,
            description: CipherNull.description,
            requiredProgress: 5,
        };
    }

    getRequiredAssets(): string[] {
        return [
            'models/brute_enemy.glb',
            'models/stalker_enemy.glb',
            ...this.getDungeonPropAssets(CipherNull.obstacleProps),
        ];
    }

    protected override getEnemyConfig(
        spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite,
    ): Partial<EnemyArchetypeConfig> {
        const baseConfig = spawnType === EnemySpawnType.Elite
            ? CipherNull.eliteEnemyConfig
            : CipherNull.regularEnemyConfig;
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
            ? CipherNull.elitePodEnemyConfig
            : CipherNull.regularPodEnemyConfig;
        return this.scaleEnemyConfig(baseConfig);
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return this.scaleEnemyConfig(CipherNull.bossConfig);
    }

    override getRequiredProgress(): number {
        return this.levelConfig.requiredProgress;
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(
            this.buildGenerationConfig(CipherNull.generationConfig, {
                eliteFractionCap: 0.8,
                eliteFractionGain: 0.2,
                trapDamageGain: 0.8,
            }),
        );
        this.setMinimapLayout(layout.minimapLayout, false);

        this.spawnPosition.set(layout.spawnPosition.x, layout.spawnElevation + 0.4, layout.spawnPosition.z);
        this.dungeonRooms = layout.rooms;

        this.buildFloorFromLayout(layout, this.levelConfig.floorColor);
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), this.levelConfig.teleporterDestination, false);

        this.spawnEnemiesFromLayout(layout);
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }

    protected override scaleEnemyConfig(config: Partial<EnemyArchetypeConfig>): Partial<EnemyArchetypeConfig> {
        return super.scaleEnemyConfig(config, { speedDifficultyGain: 0.12, expDifficultyGain: 0.7 });
    }
}
