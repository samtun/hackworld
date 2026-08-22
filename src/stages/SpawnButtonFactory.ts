import { delay, inject, singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import { SpawnButton } from "./SpawnButton";
import { InputManager } from "../controls/InputManager";
import * as THREE from "three";

@singleton()
export class SpawnButtonFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
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