import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';
import { TeleporterFactory } from '../props/TeleporterFactory';
import { BreakableBarrelFactory } from '../items/BreakableBarrelFactory';
import { LootChestFactory } from '../items/LootChestFactory';
import { ModelPropFactory } from '../props/ModelPropFactory';
import { ElectricTrapFactory } from '../items/ElectricTrapFactory';
import { EnemyFactory } from '../enemies/EnemyFactory';
import { AudioManager } from '../AudioManager';
import { ItemDropManager } from '../items/ItemDropManager';

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
        teleporterFactory: TeleporterFactory,
        modelPropFactory: ModelPropFactory,
        lootChestFactory: LootChestFactory,
        breakableBarrelFactory: BreakableBarrelFactory,
        electricTrapFactory: ElectricTrapFactory,
        enemyFactory: EnemyFactory,
        audioManager: AudioManager,
        itemDropManager: ItemDropManager,
        stageId: string | undefined,
        defaultStageId: string,
        levelConfigs: Record<string, StageLevelConfig>,
    ) {
        super(
            scene,
            physicsWorld,
            physicsMaterial,
            teleporterFactory,
            modelPropFactory,
            lootChestFactory,
            breakableBarrelFactory,
            electricTrapFactory,
            enemyFactory,
            audioManager,
            itemDropManager
        );
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
        const nextConfig: RoomGenerationConfig = {
            ...base,
            hasBoss: this.levelConfig.hasBoss,
            bossRoomCount: this.levelConfig.bossRoomCount,
            enemyCount: {
                ...base.enemyCount,
                min: Math.floor(base.enemyCount.min * difficulty),
                max: Math.floor(base.enemyCount.max * difficulty),
                eliteFraction: Math.min(tuning.eliteFractionCap, base.enemyCount.eliteFraction + (difficulty - 1) * tuning.eliteFractionGain),
                ...this.getAreaPerEnemyOverride(base.enemyCount.areaPerEnemy, tuning, difficulty),
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
            maxHp: this.scaleDefined(config.maxHp, (value) => Math.floor(value * multiplier)),
            damage: this.scaleDefined(config.damage, (value) => Math.floor(value * multiplier)),
            speed: this.scaleDefined(config.speed, (value) => value * (1 + (multiplier - 1) * tuning.speedDifficultyGain)),
            baseExp: this.scaleDefined(config.baseExp, (value) => Math.floor(value * (1 + (multiplier - 1) * tuning.expDifficultyGain))),
        };
    }

    private getAreaPerEnemyOverride(
        areaPerEnemy: number | undefined,
        tuning: GenerationDifficultyTuning,
        difficulty: number,
    ): { areaPerEnemy: number } | {} {
        if (areaPerEnemy === undefined || tuning.areaPerEnemyMin === undefined || tuning.areaPerEnemyDifficultyGain === undefined) {
            return {};
        }
        return {
            areaPerEnemy: Math.max(
                tuning.areaPerEnemyMin,
                Math.floor(areaPerEnemy / (1 + (difficulty - 1) * tuning.areaPerEnemyDifficultyGain)),
            ),
        };
    }

    private scaleDefined(
        value: number | undefined,
        scale: (value: number) => number,
    ): number | undefined {
        if (value === undefined) return undefined;
        return scale(value);
    }

    private static resolveLevelConfig(
        stageId: string | undefined,
        defaultStageId: string,
        levelConfigs: Record<string, StageLevelConfig>,
    ): StageLevelConfig {
        const resolved = levelConfigs[stageId ?? defaultStageId];
        if (!resolved) {
            throw new Error(`Missing level config for stage "${stageId ?? defaultStageId}"`);
        }
        return resolved;
    }
}
