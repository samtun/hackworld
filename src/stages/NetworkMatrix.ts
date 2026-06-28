import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';
import { getDungeonPropDefinitions } from './DungeonPropCatalog';

export class NetworkMatrix extends BaseStage {
    private static id: string = "networkMatrix";
    private static name: string = "Network Matrix";
    private static description: string = "The first layer of defense";

    id = NetworkMatrix.id;
    name = NetworkMatrix.name;
    description = NetworkMatrix.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 60,
        speed: 3,
        damage: 10,
        baseExp: 10,
        itemDropChance: 0.08,
        techDropRateFactor: 1.0,
        xDataDropChanceWeight: 1.0,
        criticalChance: 0.04,
        criticalHitMultiplier: 1.2,
        blockChance: 0.2,
        size: 1.75,
        color: 0x0d2f18,
    };

    private static readonly eliteEnemyConfig: Partial<EnemyArchetypeConfig> = {
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
        color: 0x204a2e,
    };

    private static readonly obstacleProps = getDungeonPropDefinitions([
        'router',
        'serverrack',
        'barrier',
        'energycells',
        'cabletray',
        'cabletraybow',
    ]);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 5, max: 7 },
        combatRoomSize: { minWidth: 13, maxWidth: 20, minDepth: 13, maxDepth: 20 },
        finalRoomSize: { minWidth: 16, maxWidth: 24, minDepth: 16, maxDepth: 24 },
        enemyCount: { min: 1, max: 4, areaPerEnemy: 70, eliteFraction: 0.15 },
        obstacleCount: { min: 1, max: 2 },
        obstacleProps: NetworkMatrix.obstacleProps,
        hasBoss: false,
        lootRoomCount: { min: 1, max: 1 },
        chestsPerLootRoom: 1,
        chestQualityFactor: 1.0,
        chestInTeleporterRoom: true,
        barrelCount: { min: 1, max: 3 },
        trapConfig: {
            count: { min: 1, max: 2 },
            width: { min: 2, max: 4 },
            length: { min: 2, max: 4 },
            damage: 8,
            patterns: [
                [1500, 2000],
                [800, 1200, 800, 2000],
                [],
            ],
        },
    };

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: NetworkMatrix.id,
            name: NetworkMatrix.name,
            description: NetworkMatrix.description,
            requiredProgress: 1 // Unlocked after talking to Mainframe for the first time
        };
    }

    /**
     * Get assets required by this dungeon
     */
    getRequiredAssets(): string[] {
        return [
            'models/brute_enemy.glb',
            'models/stalker_enemy.glb',
            ...this.getDungeonPropAssets(NetworkMatrix.obstacleProps),
        ];
    }

    protected override getEnemyConfig(
        spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite,
    ): Partial<EnemyArchetypeConfig> {
        return spawnType === EnemySpawnType.Elite
            ? NetworkMatrix.eliteEnemyConfig
            : NetworkMatrix.regularEnemyConfig;
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Generate room-based procedural layout
        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(NetworkMatrix.generationConfig);
        this.setMinimapLayout(layout.minimapLayout, false);

        // Spawn the player in front of the centred lobby return teleporter
        this.setSpawnPositionInFrontOfLobbyReturnTeleporter(layout);

        // Register rooms for per-room enemy aggro and teleporter activation
        this.dungeonRooms = layout.rooms;

        // Floor segments for each room and corridor
        this.buildFloorFromLayout(layout);

        // Build walls (with transparency shader) and obstacles
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        // Teleporter in the final room – starts inactive until all enemies are defeated
        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), Lobby.getMetadata().id, false);

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
}
