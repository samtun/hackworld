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

export class SecurityCore extends StageWithLevels {
    private static id: string = 'securityCore';
    private static name: string = 'Security Core';
    private static description: string = 'The heart of the security system';
    private static readonly depth2Id: string = 'securityCoreDepth2';
    private static readonly depth3Id: string = 'securityCoreDepth3';
    private static readonly levelConfigs: Record<string, StageLevelConfig> = {
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

    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 1900,
        speed: 4.05,
        damage: 950,
        baseExp: 400,
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
        maxHp: 2600,
        speed: 4.35,
        damage: 1700,
        baseExp: 580,
        itemDropChance: 0.40,
        techDropRateFactor: 1.7,
        xDataDropChanceWeight: 2.5,
        criticalChance: 0.07,
        criticalHitMultiplier: 1.6,
        blockChance: 0.28,
        size: 3.1,
        color: 0x4e2a78,
    };

    private static readonly regularPodEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 1350,
        speed: 3.0,
        damage: 900,
        baseExp: 430,
        size: 2.15,
        color: 0x743db6,
    };

    private static readonly elitePodEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 1850,
        speed: 3.25,
        damage: 1600,
        baseExp: 620,
        size: 2.65,
        color: 0x9159dc,
    };

    private static readonly bossConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 9200,
        speed: 4.75,
        damage: 2300,
        baseExp: 2200,
        itemDropChance: 1,
        techDropRateFactor: 2.0,
        xDataDropChanceWeight: 4.4,
        criticalChance: 0.09,
        criticalHitMultiplier: 1.75,
        blockChance: 0.32,
        size: 4.4,
        color: 0x6f3da6,
    };

    private static readonly obstacleProps = getDungeonPropDefinitions([
        'dronechargingstation', 'dronechargingstationanimated', 'pipes', 'vent', 'serverrack'
    ]);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 12, max: 15 },
        combatRoomSize: { minWidth: 13, maxWidth: 33, minDepth: 13, maxDepth: 33 },
        finalRoomSize: { minWidth: 20, maxWidth: 39, minDepth: 20, maxDepth: 39 },
        enemyCount: { min: 2, max: 5, areaPerEnemy: 70, eliteFraction: 0.4 },
        obstacleCount: { min: 2, max: 4 },
        obstacleProps: SecurityCore.obstacleProps,
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
            damage: 2500,
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
        super(scene, physicsWorld, physicsMaterial, stageId, SecurityCore.id, SecurityCore.levelConfigs);
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
            'models/brute_enemy.glb',
            'models/stalker_enemy.glb',
            'models/pod_enemy.glb',
            ...this.getDungeonPropAssets(SecurityCore.obstacleProps),
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
            ? SecurityCore.elitePodEnemyConfig
            : SecurityCore.regularPodEnemyConfig;
        return this.scaleEnemyConfig(baseConfig);
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return this.scaleEnemyConfig(SecurityCore.bossConfig);
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Generate room-based procedural layout
        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(
            this.buildGenerationConfig(SecurityCore.generationConfig, {
                eliteFractionCap: 0.85,
                eliteFractionGain: 0.25,
                areaPerEnemyMin: 30,
                areaPerEnemyDifficultyGain: 0.35,
                trapDamageGain: 0.85,
            }),
        );
        this.setMinimapLayout(layout.minimapLayout, false);

        // Spawn the player in front of the centred lobby return teleporter
        this.setSpawnPositionInFrontOfLobbyReturnTeleporter(layout);

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
        this.createLobbyReturnTeleporter(layout);

        // Spawn enemies with room assignments so aggro is room-gated
        this.spawnEnemiesFromLayout(layout);

        // Build loot chests, breakable barrels, and electric traps
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }

    protected override scaleEnemyConfig(config: Partial<EnemyArchetypeConfig>): Partial<EnemyArchetypeConfig> {
        return super.scaleEnemyConfig(config, { speedDifficultyGain: 0.14, expDifficultyGain: 0.75 });
    }
}
