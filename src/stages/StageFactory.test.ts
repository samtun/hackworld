import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { StageFactory } from './StageFactory';
import { mock } from 'vitest-mock-extended';
import { AudioManager } from '../AudioManager';
import { EnemyFactory } from '../enemies/EnemyFactory';
import { GameProgressManager } from '../GameProgressManager';
import { BreakableBarrelFactory } from '../items/BreakableBarrelFactory';
import { CardManager } from '../items/cards/CardManager';
import { ChipRepository } from '../items/chips/ChipRepository';
import { ChipTrader } from '../items/chips/ChipTrader';
import { CoreRepository } from '../items/cores/CoreRepository';
import { CoreTrader } from '../items/cores/CoreTrader';
import { ElectricTrapFactory } from '../items/ElectricTrapFactory';
import { ItemDropFactory } from '../items/ItemDropFactory';
import { ItemDropManager } from '../items/ItemDropManager';
import { LootChestFactory } from '../items/LootChestFactory';
import { WeaponTrader } from '../items/weapons/WeaponTrader';
import { XDataUpgradeManager } from '../items/xdata/XDataUpgradeManager';
import { NpcFactory } from '../npcs/NpcFactory';
import { HealingStationFactory } from '../props/HealingStationFactory';
import { ModelPropFactory } from '../props/ModelPropFactory';
import { TeleporterFactory } from '../props/TeleporterFactory';
import { SaveManager } from '../SaveManager';
import { SpawnButtonFactory } from './SpawnButtonFactory';

describe('creates stage with fitting requiredProgress for multilevel stages', () => {
    it.each([
        ['cipherNull', 0],
        ['cipherNullDepth2', 5],
        ['securityCore', 0],
        ['securityCoreDepth2', 0],
        ['securityCoreDepth3', 7],
        ['kernelTerminus', 0],
        ['kernelTerminusDepth2', 0],
        ['kernelTerminusDepth3', 9],
    ] as const)('sets required progress for %s', (stageId, expectedProgress) => {
        const stageFactory = new StageFactory(
            mock<THREE.Scene>(),
            mock<CANNON.World>(),
            mock<CANNON.Material>(),
            mock<TeleporterFactory>(),
            mock<HealingStationFactory>(),
            mock<ModelPropFactory>(),
            mock<LootChestFactory>(),
            mock<BreakableBarrelFactory>(),
            mock<ElectricTrapFactory>(),
            mock<EnemyFactory>(),
            mock<AudioManager>(),
            mock<ItemDropManager>(),
            mock<NpcFactory>(),
            mock<GameProgressManager>(),
            mock<CardManager>(),
            mock<WeaponTrader>(),
            mock<ChipTrader>(),
            mock<CoreTrader>(),
            mock<SaveManager>(),
            mock<XDataUpgradeManager>(),
            mock<SpawnButtonFactory>(),
            mock<ItemDropFactory>(),
            mock<CoreRepository>(),
            mock<ChipRepository>()
        );
        const stage = stageFactory.createStage(stageId);
        expect(stage.id).toBe(stageId);
        expect(stage.getRequiredProgress()).toBe(expectedProgress);
    });
});
