import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';

export class SecurityCore extends BaseStage {
    private static id: string = "securityCore";
    private static name: string = "Security Core";
    private static description: string = "The central security hub";

    id = SecurityCore.id;
    name = SecurityCore.name;
    description = SecurityCore.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

    static getMetadata(): { id: string; name: string; description: string; stageIndex: number } {
        return {
            id: SecurityCore.id,
            name: SecurityCore.name,
            description: SecurityCore.description,
            stageIndex: 2 // Second dungeon stage
        };
    }

    /**
     * Get assets required by this dungeon
     */
    getRequiredAssets(): string[] {
        return [
            'models/monster.glb'
        ];
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Teleporter back to Lobby
        this.createTeleporter(new THREE.Vector3(12, 0, 12), Lobby.getMetadata().id);

        // Different dungeon layout with more obstacles
        this.createBox(3, 2, 3, new THREE.Vector3(-8, 1, -8));
        this.createBox(2, 2, 5, new THREE.Vector3(8, 1, -8));
        this.createBox(5, 1, 2, new THREE.Vector3(-8, 0.5, 8));

        // Spawn more enemies - harder stage
        this.spawnEnemy(new THREE.Vector3(6, 2, 6));
        this.spawnEnemy(new THREE.Vector3(-6, 2, 6));
        this.spawnEnemy(new THREE.Vector3(6, 2, -6));
        this.spawnEnemy(new THREE.Vector3(-6, 2, -6));
        this.spawnEnemy(new THREE.Vector3(0, 2, -10));
    }
}
