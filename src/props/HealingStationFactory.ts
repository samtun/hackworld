import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { HealingStation } from "./HealingStation";
import { AudioManager } from "../AudioManager";
import { HealingSystem } from "../systems/HealingSystem";
import { ModelColliderLoader } from "../ModelColliderLoader";
import { AssetManager } from "../AssetManager";
import { delay, inject, singleton } from 'tsyringe';

@singleton()
export class HealingStationFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
        private readonly healingSystem: HealingSystem,
        private readonly audioManager: AudioManager,
        private readonly modelColliderLoader: ModelColliderLoader,
        private readonly assetManager: AssetManager
    ) { }

    public createHealingStation(position: CANNON.Vec3): HealingStation {
        return new HealingStation(
            position,
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            this.modelColliderLoader,
            this.assetManager,
            this.healingSystem,
            this.audioManager
        );
    }
}