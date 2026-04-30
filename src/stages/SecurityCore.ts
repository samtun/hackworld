import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';

export class SecurityCore extends BaseStage {
    private static id: string = "securityCore";
    private static name: string = "Security Core";
    private static description: string = "The heart of the security system";

    id = SecurityCore.id;
    name = SecurityCore.name;
    description = SecurityCore.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

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
        return spawnType === EnemySpawnType.Elite
            ? SecurityCore.eliteEnemyConfig
            : SecurityCore.regularEnemyConfig;
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return SecurityCore.bossConfig;
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Generate room-based procedural layout
        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(SecurityCore.generationConfig);
        this.setMinimapLayout(layout.minimapLayout, false);

        // Update spawn position from generated layout
        this.spawnPosition.set(layout.spawnPosition.x, layout.spawnElevation + 0.4, layout.spawnPosition.z);

        // Register rooms for per-room enemy aggro and teleporter activation
        this.dungeonRooms = layout.rooms;

        // Floor segments for each room and corridor
        this.buildFloorFromLayout(layout, 0x100a28);

        // Build walls (with transparency shader) and obstacles
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        // Teleporter in the final room – starts inactive until all enemies are defeated
        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), Lobby.getMetadata().id, false);

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
}
