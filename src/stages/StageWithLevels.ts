import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';

export interface StageLevelConfig {
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

interface GenerationDifficultyTuning {
    eliteFractionCap: number;
    eliteFractionGain: number;
    areaPerEnemyMin?: number;
    areaPerEnemyDifficultyGain?: number;
    trapDamageGain: number;
}

interface EnemyScaleTuning {
    speedDifficultyGain: number;
    expDifficultyGain: number;
}

export abstract class StageWithLevels extends BaseStage {
    id: string;
    name: string;
    description: string;
    protected readonly levelConfig: StageLevelConfig;

    constructor(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        stageId: string | undefined,
        defaultStageId: string,
        levelConfigs: Record<string, StageLevelConfig>,
    ) {
        super(scene, physicsWorld, physicsMaterial);
        this.levelConfig = StageWithLevels.resolveLevelConfig(stageId, defaultStageId, levelConfigs);
        this.id = this.levelConfig.id;
        this.name = this.levelConfig.name;
        this.description = this.levelConfig.description;
    }

    override getRequiredProgress(): number {
        return this.levelConfig.requiredProgress;
    }

    protected buildGenerationConfig(
        base: RoomGenerationConfig,
        tuning: GenerationDifficultyTuning,
    ): RoomGenerationConfig {
        const difficulty = this.levelConfig.enemyDifficultyMultiplier;
        const areaPerEnemy = base.enemyCount.areaPerEnemy;
        const nextConfig: RoomGenerationConfig = {
            ...base,
            hasBoss: this.levelConfig.hasBoss,
            bossRoomCount: this.levelConfig.bossRoomCount,
            enemyCount: {
                ...base.enemyCount,
                min: Math.floor(base.enemyCount.min * difficulty),
                max: Math.floor(base.enemyCount.max * difficulty),
                eliteFraction: Math.min(tuning.eliteFractionCap, base.enemyCount.eliteFraction + (difficulty - 1) * tuning.eliteFractionGain),
                ...(areaPerEnemy !== undefined && tuning.areaPerEnemyMin !== undefined && tuning.areaPerEnemyDifficultyGain !== undefined
                    ? {
                        areaPerEnemy: Math.max(
                            tuning.areaPerEnemyMin,
                            Math.floor(areaPerEnemy / (1 + (difficulty - 1) * tuning.areaPerEnemyDifficultyGain)),
                        ),
                    }
                    : {}),
            },
        };

        if (base.trapConfig) {
            nextConfig.trapConfig = {
                ...base.trapConfig,
                damage: Math.floor(base.trapConfig.damage * (1 + (difficulty - 1) * tuning.trapDamageGain)),
            };
        }

        return nextConfig;
    }

    protected scaleEnemyConfig(
        config: Partial<EnemyArchetypeConfig>,
        tuning: EnemyScaleTuning,
    ): Partial<EnemyArchetypeConfig> {
        const multiplier = this.levelConfig.enemyDifficultyMultiplier;
        return {
            ...config,
            maxHp: config.maxHp === undefined ? undefined : Math.floor(config.maxHp * multiplier),
            damage: config.damage === undefined ? undefined : Math.floor(config.damage * multiplier),
            speed: config.speed === undefined ? undefined : config.speed * (1 + (multiplier - 1) * tuning.speedDifficultyGain),
            baseExp: config.baseExp === undefined ? undefined : Math.floor(config.baseExp * (1 + (multiplier - 1) * tuning.expDifficultyGain)),
        };
    }

    private static resolveLevelConfig(
        stageId: string | undefined,
        defaultStageId: string,
        levelConfigs: Record<string, StageLevelConfig>,
    ): StageLevelConfig {
        return levelConfigs[stageId ?? defaultStageId] ?? levelConfigs[defaultStageId];
    }
}
