import { delay, inject, singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import { AssetManager } from "../../AssetManager";
import { Weapon } from "./Weapon";
import { WeaponType } from "./WeaponType";

@singleton()
export class WeaponFactory {
    constructor(
        private readonly assetManager: AssetManager,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
    ) { }

    public createWeapon(model: string, weaponType: WeaponType, damage: number): Weapon {
        return new Weapon(this.assetManager, model, weaponType, damage, this.physicsWorld);
    }
}