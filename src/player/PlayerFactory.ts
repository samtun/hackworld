import { delay, inject, singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { Player } from "./Player";
import { InputManager } from "../controls/InputManager";
import { FloatingIndicatorManager } from "../FloatingIndicatorManager";
import { AudioManager } from "../AudioManager";
import { CardCollection } from "../items/cards/CardCollection";
import { AssetManager } from "../AssetManager";
import { TierManager } from "../items/TierManager";
import { WeaponRepository } from "../items/weapons/WeaponRepository";
import { SkillFactory } from "./skills/SkillFactory";
import { WeaponFactory } from "../items/weapons/WeaponFactory";

@singleton()
export class PlayerFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
        private readonly inputManager: InputManager,
        private readonly assetManager: AssetManager,
        private readonly floatingIndicatorManager: FloatingIndicatorManager,
        private readonly tierManager: TierManager,
        private readonly weaponRepository: WeaponRepository,
        private readonly cardCollection: CardCollection,
        private readonly audioManager: AudioManager,
        private readonly skillFactory: SkillFactory,
        private readonly weaponFactory: WeaponFactory,
    ) { }

    public createPlayer(spawnPosition: CANNON.Vec3): Player {
        return new Player(
            spawnPosition,
            this.physicsMaterial,
            this.assetManager,
            this.scene,
            this.physicsWorld,
            this.inputManager,
            this.floatingIndicatorManager,
            this.tierManager,
            this.weaponRepository,
            this.cardCollection,
            this.audioManager,
            this.skillFactory,
            this.weaponFactory,
        );
    }
}