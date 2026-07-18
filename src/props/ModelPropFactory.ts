import { singleton } from "tsyringe";
import { AssetManager } from "../AssetManager";
import { ModelColliderLoader } from "../ModelColliderLoader";
import { ModelProp } from "./ModelProp";
import * as CANNON from 'cannon-es';

@singleton()
export class ModelPropFactory {
    constructor(
        private readonly modelColliderLoader: ModelColliderLoader,
        private readonly assetManager: AssetManager,
        private readonly scene: THREE.Scene,
        private readonly physicsWorld: CANNON.World,
        private readonly physicsMaterial: CANNON.Material
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