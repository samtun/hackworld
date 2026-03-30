import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';

export class SecurityCore extends BaseStage {
    private static id: string = "securityCore";
    private static name: string = "Security Core";
    private static description: string = "The heart of the security system";

    id = SecurityCore.id;
    name = SecurityCore.name;
    description = SecurityCore.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 3, max: 5 },
        combatRoomSize: { minWidth: 13, maxWidth: 33, minDepth: 13, maxDepth: 33 },
        finalRoomSize: { minWidth: 20, maxWidth: 39, minDepth: 20, maxDepth: 39 },
        enemyCount: { min: 2, max: 8, areaPerEnemy: 50, largeFraction: 0.35 },
        obstacleCount: { min: 1, max: 3 },
        hasBoss: true,
        lootRoomCount: { min: 1, max: 2 },
        chestsPerLootRoom: 3,
        chestQualityFactor: 1.2,
        chestInTeleporterRoom: true,
        barrelCount: { min: 1, max: 4 },
        trapConfig: {
            count: { min: 1, max: 3 },
            width: { min: 2, max: 5 },
            length: { min: 2, max: 5 },
            damage: 12,
            patterns: [
                [1000, 1500],
                [600, 800, 600, 1500],
                [400, 600, 400, 600, 400, 2000],
                [],
            ],
        },
    };

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: SecurityCore.id,
            name: SecurityCore.name,
            description: SecurityCore.description,
            requiredProgress: 3 // Unlocked after finishing NetworkMatrix and talking to Mainframe again
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

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Generate room-based procedural layout
        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(SecurityCore.generationConfig);

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

        // Spawn enemies with room assignments so aggro is room-gated
        this.spawnEnemiesFromLayout(layout);

        // Build loot chests, breakable barrels, and electric traps
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }
}
