import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { delay, inject, singleton } from 'tsyringe';
import { Teleporter } from "./Teleporter";
import { AudioManager } from '../AudioManager';
import { AssetManager } from '../AssetManager';
import { NpcRegistry } from '../npcs/NpcRegistry';

@singleton()
export class TeleporterFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
        private readonly audioManager: AudioManager,
        private readonly assetManager: AssetManager,
        private readonly npcRegistry: NpcRegistry
    ) { }

    public createTeleporter(position: CANNON.Vec3, targetStageId: string, startActive: boolean = true, hint: string = 'Enter'): Teleporter {
        return new Teleporter(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            position,
            targetStageId,
            startActive,
            hint,
            this.audioManager,
            this.assetManager,
            this.npcRegistry,
        );
    }
}