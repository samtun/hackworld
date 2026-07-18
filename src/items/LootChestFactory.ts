import { singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import { LootChest } from "./LootChest";
import { AudioManager } from "../AudioManager";
import { WeaponBonusCalculator } from "./weapons/WeaponBonusCalculator";
import { WeaponRepository } from "./weapons/WeaponRepository";
import { ItemDropManager } from "./ItemDropManager";
import { ItemDropFactory } from "./ItemDropFactory";
import { CoreRepository } from "./cores/CoreRepository";
import { ChipRepository } from "./chips/ChipRepository";

@singleton()
export class LootChestFactory {
    constructor(
        private readonly scene: THREE.Scene,
        private readonly world: CANNON.World,
        private readonly physicsMaterial: CANNON.Material,
        private readonly audioManager: AudioManager,
        private readonly itemDropManager: ItemDropManager,
        private readonly weaponRepository: WeaponRepository,
        private readonly weaponBonusCalculator: WeaponBonusCalculator,
        private readonly chipRepository: ChipRepository,
        private readonly coreRepository: CoreRepository,
        private readonly itemDropFactory: ItemDropFactory
    ) { }

    public createLootChest(position: CANNON.Vec3, itemQualityFactor: number = 1.0): LootChest {
        return new LootChest(
            this.audioManager,
            this.itemDropManager,
            this.weaponRepository,
            this.weaponBonusCalculator,
            this.chipRepository,
            this.coreRepository,
            this.itemDropFactory,
            this.scene,
            this.world,
            this.physicsMaterial,
            position,
            itemQualityFactor,
        );
    }
}