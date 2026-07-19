import { delay, inject, singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import * as THREE from "three";
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
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
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