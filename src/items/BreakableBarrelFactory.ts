import { singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import { BreakableBarrel } from "./BreakableBarrel";
import { AudioManager } from "../AudioManager";
import { WeaponRepository } from "./weapons/WeaponRepository";
import { ChipRepository } from "./chips/ChipRepository";
import { CoreRepository } from "./cores/CoreRepository";
import { ItemDropFactory } from "./ItemDropFactory";
import { TierManager } from "./TierManager";

@singleton()
export class BreakableBarrelFactory {
    constructor(
        private readonly scene: THREE.Scene,
        private readonly physicsWorld: CANNON.World,
        private readonly physicsMaterial: CANNON.Material,
        private readonly audioManager: AudioManager,
        private readonly weaponRepository: WeaponRepository,
        private readonly chipRepository: ChipRepository,
        private readonly coreRepository: CoreRepository,
        private readonly tierManager: TierManager,
        private readonly itemDropFactory: ItemDropFactory
    ) { }

    public createBreakableBarrel(position: CANNON.Vec3): BreakableBarrel {
        return new BreakableBarrel(
            this.audioManager,
            this.weaponRepository,
            this.chipRepository,
            this.coreRepository,
            this.tierManager,
            this.itemDropFactory,
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            position,
        );
    }
}