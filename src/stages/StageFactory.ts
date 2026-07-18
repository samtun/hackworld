import { singleton } from "tsyringe";
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

@singleton()
export class StageFactory {
    constructor(private readonly scene: THREE.Scene,
        private readonly physicsWorld: CANNON.World,
        private readonly physicsMaterial: CANNON.Material,
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
    ) { }

    public createStage(stageId: string): BaseStage {
        switch (stageId) {
            case NetworkMatrix.getMetadata().id:
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
            case PacketForge.getMetadata().id:
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
            case CipherNull.getMetadata().id:
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
                    CipherNull.getMetadata().id
                );
            case SecurityCore.getMetadata().id:
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
                    SecurityCore.getMetadata().id
                );
            case KernelTerminus.getMetadata().id:
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
                    KernelTerminus.getMetadata().id
                );
            case Lobby.getMetadata().id:
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