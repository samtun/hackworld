import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';
import { getDungeonPropDefinitions } from './DungeonPropCatalog';

export class PacketForge extends BaseStage {
    private static id: string = "packetForge";
    private static name: string = "Packet Forge";
    private static description: string = "Refinery tunnels overloaded with forged malware packets";

    id = PacketForge.id;
    name = PacketForge.name;
    description = PacketForge.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 90,
        speed: 3.35,
        damage: 35,
        baseExp: 16,
        itemDropChance: 0.16,
        techDropRateFactor: 1.15,
        xDataDropChanceWeight: 1.2,
        criticalChance: 0.045,
        criticalHitMultiplier: 1.28,
        blockChance: 0.21,
        size: 1.95,
        color: 0x123250,
    };

    private static readonly eliteEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 170,
        speed: 3.85,
        damage: 60,
        baseExp: 30,
        itemDropChance: 0.30,
        techDropRateFactor: 1.35,
        xDataDropChanceWeight: 1.8,
        criticalChance: 0.055,
        criticalHitMultiplier: 1.42,
        blockChance: 0.24,
        size: 2.85,
        color: 0x1d4f7a,
    };

    private static readonly bossConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 620,
        speed: 4.35,
        damage: 95,
        baseExp: 145,
        itemDropChance: 1,
        techDropRateFactor: 1.75,
        xDataDropChanceWeight: 3.2,
        criticalChance: 0.075,
        criticalHitMultiplier: 1.58,
        blockChance: 0.28,
        size: 3.8,
        color: 0x2b6aa6,
    };

    private static readonly obstacleProps = getDungeonPropDefinitions([
        'pipes',
        'cabletray',
        'cabletraybow',
        'cabletraycurve',
        'pile',
        'barrier',
    ]);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 6, max: 9 },
        combatRoomSize: { minWidth: 14, maxWidth: 24, minDepth: 14, maxDepth: 24 },
        finalRoomSize: { minWidth: 19, maxWidth: 29, minDepth: 19, maxDepth: 29 },
        enemyCount: { min: 2, max: 5, areaPerEnemy: 62, eliteFraction: 0.25 },
        obstacleCount: { min: 1, max: 3 },
        obstacleProps: PacketForge.obstacleProps,
        hasBoss: true,
        lootRoomCount: { min: 1, max: 2 },
        chestsPerLootRoom: 1,
        chestQualityFactor: 1.2,
        chestInTeleporterRoom: true,
        barrelCount: { min: 1, max: 4 },
        trapConfig: {
            count: { min: 1, max: 3 },
            width: { min: 2, max: 5 },
            length: { min: 2, max: 5 },
            damage: 60,
            patterns: [
                [1200, 1500],
                [700, 900, 700, 1500],
                [500, 700, 500, 700, 500, 1800],
                [],
            ],
        },
    };

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: PacketForge.id,
            name: PacketForge.name,
            description: PacketForge.description,
            requiredProgress: 3,
        };
    }

    getRequiredAssets(): string[] {
        return [
            'models/brute_enemy.glb',
            'models/stalker_enemy.glb',
            ...this.getDungeonPropAssets(PacketForge.obstacleProps),
        ];
    }

    protected override getEnemyConfig(
        spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite,
    ): Partial<EnemyArchetypeConfig> {
        return spawnType === EnemySpawnType.Elite
            ? PacketForge.eliteEnemyConfig
            : PacketForge.regularEnemyConfig;
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return PacketForge.bossConfig;
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(PacketForge.generationConfig);
        this.setMinimapLayout(layout.minimapLayout, false);

        this.spawnPosition.set(layout.spawnPosition.x, layout.spawnElevation + 0.4, layout.spawnPosition.z);
        this.dungeonRooms = layout.rooms;

        this.buildFloorFromLayout(layout, 0x0a1f32);
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), Lobby.getMetadata().id, false);

        // Lobby return teleporter at spawn – always active so players can leave at any time
        this.createCenteredLobbyReturnTeleporter(layout, Lobby.getMetadata().id);

        this.spawnEnemiesFromLayout(layout);
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }
}
