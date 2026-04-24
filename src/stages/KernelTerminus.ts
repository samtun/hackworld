import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';

export class KernelTerminus extends BaseStage {
    private static id: string = "kernelTerminus";
    private static name: string = "Kernel Terminus";
    private static description: string = "The terminal breach where VIRUS-ZERO hardens into core predators";

    id = KernelTerminus.id;
    name = KernelTerminus.name;
    description = KernelTerminus.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

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
        return spawnType === EnemySpawnType.Elite
            ? KernelTerminus.eliteEnemyConfig
            : KernelTerminus.regularEnemyConfig;
    }

    protected override getBossConfig(): Partial<EnemyArchetypeConfig> {
        return KernelTerminus.bossConfig;
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(KernelTerminus.generationConfig);
        this.setMinimapLayout(layout.minimapLayout, false);

        this.spawnPosition.set(layout.spawnPosition.x, layout.spawnElevation + 0.4, layout.spawnPosition.z);
        this.dungeonRooms = layout.rooms;

        this.buildFloorFromLayout(layout, 0x2e1118);
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, layout.teleporterElevation, tp.z), Lobby.getMetadata().id, false);

        this.spawnEnemiesFromLayout(layout);
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }
}
