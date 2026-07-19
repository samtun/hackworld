import { delay, inject, singleton } from "tsyringe";
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { Npc } from "./Npc";
import { AssetManager } from "../AssetManager";
import { GameProgressManager } from "../GameProgressManager";
import { MainframeNpc } from "./MainframeNpc";
import { NpcRegistry } from "./NpcRegistry";

@singleton()
export class NpcFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
        private readonly assetManager: AssetManager,
        private readonly gameProgressManager: GameProgressManager,
        private readonly npcRegistry: NpcRegistry,
    ) { }

    public createNpc(
        modelAsset: string,
        name: string,
        interactionHint: string,
        position: CANNON.Vec3,
        dialogue: string[],
        onInteract: () => void
    ): Npc {
        return new Npc(
            this.assetManager,
            this.npcRegistry,
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            modelAsset,
            name,
            interactionHint,
            position,
            dialogue,
            onInteract
        );
    }

    public createMainframeNpc(
        position: CANNON.Vec3,) {
        return new MainframeNpc(
            this.gameProgressManager,
            this.assetManager,
            this.npcRegistry,
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            position
        );
    }
}