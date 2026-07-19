import { delay, inject, singleton } from "tsyringe";
import { AssetManager } from "../AssetManager";
import { ModelColliderLoader } from "../ModelColliderLoader";
import { ModelProp } from "./ModelProp";
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

@singleton()
export class ModelPropFactory {
    constructor(
        private readonly modelColliderLoader: ModelColliderLoader,
        private readonly assetManager: AssetManager,
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material
    ) { }

    public createModelProp(
        modelName: string,
        position?: THREE.Vector3,
        rotation?: THREE.Euler,
        onScene?: (mesh: THREE.Group) => void
    ): ModelProp {
        return new ModelProp(
            this.modelColliderLoader,
            this.assetManager,
            modelName,
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            position,
            rotation,
            onScene
        );
    }
}