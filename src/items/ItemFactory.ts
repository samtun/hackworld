import { singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import { AssetManager } from "../AssetManager";
import { Weapon } from "./weapons/Weapon";
import { WeaponType } from "./weapons/WeaponType";

@singleton()
export class WeaponFactory {
    constructor(
        private readonly assetManager: AssetManager,
        private readonly physicsWorld: CANNON.World,
    ) { }

    public createWeapon(model: string, weaponType: WeaponType, damage: number): Weapon {
        return new Weapon(this.assetManager, model, weaponType, damage, this.physicsWorld);
    }
}