import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { HealingStation } from "./HealingStation";
import { AudioManager } from "../AudioManager";
import { HealingSystem } from "../systems/HealingSystem";
import { ModelColliderLoader } from "../ModelColliderLoader";
import { AssetManager } from "../AssetManager";
import { singleton } from 'tsyringe';

@singleton()
export class HealingStationFactory {
    constructor(
        private readonly scene: THREE.Scene,
        private readonly world: CANNON.World,
        private readonly physicsMaterial: CANNON.Material,
        private readonly healingSystem: HealingSystem,
        private readonly audioManager: AudioManager,
        private readonly modelColliderLoader: ModelColliderLoader,
        private readonly assetManager: AssetManager
    ) { }

    public createHealingStation(position: CANNON.Vec3): HealingStation {
        return new HealingStation(
            position,
            this.scene,
            this.world,
            this.physicsMaterial,
            this.modelColliderLoader,
            this.assetManager,
            this.healingSystem,
            this.audioManager
        );
    }
}