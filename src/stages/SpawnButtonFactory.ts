import { singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import { SpawnButton } from "./SpawnButton";
import type { InputManager } from "../controls/InputManager";
import type * as THREE from "three";

@singleton()
export class SpawnButtonFactory {
    constructor(
        private readonly scene: THREE.Scene,
        private readonly physicsWorld: CANNON.World,
        private readonly physicsMaterial: CANNON.Material,
        private readonly inputManager: InputManager,
    ) { }

    public createSpawnButton(
        position: CANNON.Vec3,
        name: string,
        hintText: string,
        color: number,
        callback: () => void
    ) {
        return new SpawnButton(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            this.inputManager,
            position,
            name,
            hintText,
            color,
            callback
        );
    }
}