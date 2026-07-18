import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { singleton } from 'tsyringe';
import { Teleporter } from "./Teleporter";
import { AudioManager } from '../AudioManager';
import { AssetManager } from '../AssetManager';
import { NpcRegistry } from '../npcs/NpcRegistry';

@singleton()
export class TeleporterFactory {
    constructor(
        private readonly scene: THREE.Scene,
        private readonly world: CANNON.World,
        private readonly physicsMaterial: CANNON.Material,
        private readonly audioManager: AudioManager,
        private readonly assetManager: AssetManager,
        private readonly npcRegistry: NpcRegistry
    ) { }

    public createTeleporter(position: CANNON.Vec3, targetStageId: string, startActive: boolean = true, hint: string = 'Enter'): Teleporter {
        return new Teleporter(
            this.scene,
            this.world,
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