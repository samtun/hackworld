import { delay, inject, singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import { BaseStage } from "./BaseStage";
import { TeleporterFactory } from "../props/TeleporterFactory";
import { Lobby } from "./Lobby";
import { NetworkMatrix } from "./NetworkMatrix";
import { HealingStationFactory } from "../props/HealingStationFactory";
import { CipherNull } from "./CipherNull";
import { KernelTerminus } from "./KernelTerminus";
import { SecurityCore } from "./SecurityCore";
import { PacketForge } from "./PacketForge";
import { BreakableBarrelFactory } from "../items/BreakableBarrelFactory";
import { LootChestFactory } from "../items/LootChestFactory";
import { ModelPropFactory } from "../props/ModelPropFactory";
import { AudioManager } from "../AudioManager";
import { EnemyFactory } from "../enemies/EnemyFactory";
import { ElectricTrapFactory } from "../items/ElectricTrapFactory";
import { ItemDropManager } from "../items/ItemDropManager";
import { XDataUpgradeManager } from "../items/xdata/XDataUpgradeManager";
import { SaveManager } from "../SaveManager";
import { CoreTrader } from "../items/cores/CoreTrader";
import { ChipTrader } from "../items/chips/ChipTrader";
import { WeaponTrader } from "../items/weapons/WeaponTrader";
import { CardManager } from "../items/cards/CardManager";
import { GameProgressManager } from "../GameProgressManager";
import { NpcFactory } from "../npcs/NpcFactory";
import * as THREE from "three";
import { GameTest } from "./GameTest";
import { ItemDropFactory } from "../items/ItemDropFactory";
import { SpawnButtonFactory } from "./SpawnButtonFactory";
import { ChipRepository } from "../items/chips/ChipRepository";
import { CoreRepository } from "../items/cores/CoreRepository";

@singleton()
export class StageFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
        private readonly teleporterFactory: TeleporterFactory,
        private readonly healingStationFactory: HealingStationFactory,
        private readonly modelPropFactory: ModelPropFactory,
        private readonly lootChestFactory: LootChestFactory,
        private readonly breakableBarrelFactory: BreakableBarrelFactory,
        private readonly electricTrapFactory: ElectricTrapFactory,
        private readonly enemyFactory: EnemyFactory,
        private readonly audioManager: AudioManager,
        private readonly itemDropManager: ItemDropManager,
        private readonly npcFactory: NpcFactory,
        private readonly gameProgressManager: GameProgressManager,
        private readonly cardManager: CardManager,
        private readonly weaponTrader: WeaponTrader,
        private readonly chipTrader: ChipTrader,
        private readonly coreTrader: CoreTrader,
        private readonly saveManager: SaveManager,
        private readonly xDataUpgradeManager: XDataUpgradeManager,
        private readonly spawnButtonFactory: SpawnButtonFactory,
        private readonly itemDropFactory: ItemDropFactory,
        private readonly coreItemRepository: CoreRepository,
        private readonly chipItemRepository: ChipRepository
    ) { }

    public createStage(stageId: string): BaseStage {
        var depth = 1;
        const depthMatch = stageId.match(/Depth(\d+)$/);
        if (depthMatch) {
            depth = parseInt(depthMatch[1], 10);
        }

        var stageIdWithoutDepth = stageId.replace(/Depth\d+$/, '');
        switch (stageIdWithoutDepth) {
            case NetworkMatrix.getStageMetadata().id:
                return new NetworkMatrix(
                    this.scene,
                    this.physicsWorld,
                    this.physicsMaterial,
                    this.teleporterFactory,
                    this.modelPropFactory,
                    this.lootChestFactory,
                    this.breakableBarrelFactory,
                    this.electricTrapFactory,
                    this.enemyFactory,
                    this.audioManager,
                    this.itemDropManager
                );
            case PacketForge.getStageMetadata().id:
                return new PacketForge(
                    this.scene,
                    this.physicsWorld,
                    this.physicsMaterial,
                    this.teleporterFactory,
                    this.modelPropFactory,
                    this.lootChestFactory,
                    this.breakableBarrelFactory,
                    this.electricTrapFactory,
                    this.enemyFactory,
                    this.audioManager,
                    this.itemDropManager
                );
            case CipherNull.getStageMetadata().id:
                return new CipherNull(
                    this.scene,
                    this.physicsWorld,
                    this.physicsMaterial,
                    this.teleporterFactory,
                    this.modelPropFactory,
                    this.lootChestFactory,
                    this.breakableBarrelFactory,
                    this.electricTrapFactory,
                    this.enemyFactory,
                    this.audioManager,
                    this.itemDropManager,
                    depth == 1 ? CipherNull.getStageMetadata().id : CipherNull.getStageMetadata().id + `Depth${depth}`
                );
            case SecurityCore.getStageMetadata().id:
                return new SecurityCore(
                    this.scene,
                    this.physicsWorld,
                    this.physicsMaterial,
                    this.teleporterFactory,
                    this.modelPropFactory,
                    this.lootChestFactory,
                    this.breakableBarrelFactory,
                    this.electricTrapFactory,
                    this.enemyFactory,
                    this.audioManager,
                    this.itemDropManager,
                    depth == 1 ? SecurityCore.getStageMetadata().id : SecurityCore.getStageMetadata().id + `Depth${depth}`
                );
            case KernelTerminus.getStageMetadata().id:
                return new KernelTerminus(this.scene,
                    this.physicsWorld,
                    this.physicsMaterial,
                    this.teleporterFactory,
                    this.modelPropFactory,
                    this.lootChestFactory,
                    this.breakableBarrelFactory,
                    this.electricTrapFactory,
                    this.enemyFactory,
                    this.audioManager,
                    this.itemDropManager,
                    depth == 1 ? KernelTerminus.getStageMetadata().id : KernelTerminus.getStageMetadata().id + `Depth${depth}`
                );
            case GameTest.getStageMetadata().id:
                return new GameTest(
                    this.scene,
                    this.physicsWorld,
                    this.physicsMaterial,
                    this.teleporterFactory,
                    this.modelPropFactory,
                    this.lootChestFactory,
                    this.breakableBarrelFactory,
                    this.electricTrapFactory,
                    this.enemyFactory,
                    this.audioManager,
                    this.itemDropManager,
                    this.spawnButtonFactory,
                    this.itemDropFactory,
                    this.coreItemRepository,
                    this.chipItemRepository
                );
            case Lobby.getStageMetadata().id:
                return new Lobby(
                    this.scene,
                    this.physicsWorld,
                    this.physicsMaterial,
                    this.teleporterFactory,
                    this.modelPropFactory,
                    this.lootChestFactory,
                    this.breakableBarrelFactory,
                    this.electricTrapFactory,
                    this.enemyFactory,
                    this.audioManager,
                    this.itemDropManager,
                    this.npcFactory,
                    this.gameProgressManager,
                    this.cardManager,
                    this.weaponTrader,
                    this.chipTrader,
                    this.coreTrader,
                    this.saveManager,
                    this.xDataUpgradeManager,
                    this.healingStationFactory
                );
            default:
                throw new Error(`Unknown stage ID: ${stageId}`);
        }
    }
}