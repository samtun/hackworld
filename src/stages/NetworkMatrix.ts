import { injectable } from 'tsyringe';
import * as CANNON from 'cannon-es';
import type { StageMetadata } from './BaseStage';
import { GeneratedStage } from './GeneratedStage';
import { Lobby } from './Lobby';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';
import { EnemyType } from '../enemies/EnemyType';
import { getDungeonPropDefinitions } from './DungeonPropCatalog';

@injectable()
export class NetworkMatrix extends GeneratedStage {
    private static id: string = "networkMatrix";
    private static name: string = "Network Matrix";
    private static description: string = "The first layer of defense";

    id = NetworkMatrix.id;
    name = NetworkMatrix.name;
    description = NetworkMatrix.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly regularEnemyConfig: Partial<EnemyArchetypeConfig> = {
        maxHp: 600,
        speed: 3,
        damage: 100,
        baseExp: 100,
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
        maxHp: 1500,
        speed: 3.75,
        damage: 150,
        baseExp: 250,
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
        'serverrack', 'barrier', 'energycells', 'pile'
    ]);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 5, max: 7 },
        combatRoomSize: { minWidth: 13, maxWidth: 20, minDepth: 13, maxDepth: 20 },
        finalRoomSize: { minWidth: 16, maxWidth: 24, minDepth: 16, maxDepth: 24 },
        enemyCount: { min: 1, max: 3, areaPerEnemy: 100, eliteFraction: 0.15 },
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
            damage: 120,
            patterns: [
                [1500, 2000],
                [800, 1200, 800, 2000],
                [],
            ],
        },
    };

    static getStageMetadata(): StageMetadata {
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

    protected override getAvailableEnemyTypes(spawnType: EnemySpawnType): readonly EnemyType[] {
        return spawnType === EnemySpawnType.Boss
            ? [EnemyType.Brute]
            : [EnemyType.Brute];
    }

    async load(): Promise<void> {
        await this.loadGeneratedStage(NetworkMatrix.generationConfig, Lobby.getStageMetadata().id);
    }
}
