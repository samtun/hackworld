import { delay, inject, singleton } from "tsyringe";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { AssetManager } from "../AssetManager";
import { MoneyDrop } from "./bits/MoneyDrop";
import { WeaponDrop } from "./weapons/WeaponDrop";
import { WeaponType } from "./weapons/WeaponType";
import { TierManager } from "./TierManager";
import { ChipDrop } from "./chips/ChipDrop";
import { ChipType } from "./chips/Chip";
import { CoreDrop } from "./cores/CoreDrop";
import { PotionDrop } from "./potions/PotionDrop";
import { PotionType } from "./potions/PotionDefinitions";
import { BoosterPackDrop } from "./cards/BoosterPackDrop";
import { XDataDrop } from "./xdata/XDataDrop";

@singleton()
export class ItemDropFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        private readonly assetManager: AssetManager,
        private readonly tierManager: TierManager
    ) { }

    public createMoneyDrop(position: CANNON.Vec3, amount: number): MoneyDrop {
        return new MoneyDrop(this.assetManager, this.scene, position, amount);
    }

    public createChipDrop(position: CANNON.Vec3, chipId: string, name: string, chipType: ChipType, buyPrice: number, sellPrice: number, level: number) {
        return new ChipDrop(this.scene, this.assetManager, position, chipId, name, chipType, buyPrice, sellPrice, level);
    }

    public createCoreDrop(position: CANNON.Vec3, coreId: string, name: string, buyPrice: number, sellPrice: number, level: number) {
        return new CoreDrop(this.scene, this.assetManager, position, coreId, name, buyPrice, sellPrice, level);
    }

    public createPotionDrop(position: CANNON.Vec3, potionType: PotionType, level: number) {
        return new PotionDrop(this.scene, position, potionType, level);
    }

    public createBoosterPackDrop(position: CANNON.Vec3) {
        return new BoosterPackDrop(this.scene, position);
    }

    public createXDataDrop(position: CANNON.Vec3, amount: number) {
        return new XDataDrop(this.scene, position, amount);
    }

    public createWeaponDrop(
        weaponId: string,
        position: CANNON.Vec3,
        weaponType: WeaponType,
        weaponName: string,
        damage: number,
        buyPrice: number,
        sellPrice: number,
        level: number,
        damageFactor: number
    ): WeaponDrop {
        return new WeaponDrop(
            weaponId,
            position,
            weaponType,
            weaponName,
            damage,
            buyPrice,
            sellPrice,
            level,
            damageFactor,
            this.scene,
            this.assetManager,
            this.tierManager
        );
    }
}