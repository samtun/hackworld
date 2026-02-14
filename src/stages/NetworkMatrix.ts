import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';

export class NetwrokMatrix extends BaseStage {
    private static id: string = "networkMatrix";
    private static name: string = "Network Matrix";
    private static description: string = "The first layer of defense";

    id = NetwrokMatrix.id;
    name = NetwrokMatrix.name;
    description = NetwrokMatrix.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: THREE.Vector3 = new THREE.Vector3(0, 10, 0);

    static getMetadata(): { id: string; name: string; description: string; stageIndex: number } {
        return {
            id: NetwrokMatrix.id,
            name: NetwrokMatrix.name,
            description: NetwrokMatrix.description,
            stageIndex: 1 // First dungeon stage
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
        this.createTeleporter(new THREE.Vector3(-10, 0, -10), Lobby.getMetadata().id);

        // Dungeon Obstacles
        this.createBox(4, 1, 4, new THREE.Vector3(5, 0.5, 5));
        this.createBox(1, 4, 1, new THREE.Vector3(-5, 2, 5));

        // Spawn Enemies
        this.spawnEnemy(new THREE.Vector3(5, 2, -5));
        this.spawnEnemy(new THREE.Vector3(-5, 2, -5));
        this.spawnEnemy(new THREE.Vector3(8, 2, 8));

        // Spawn Large Enemies
        this.spawnLargeEnemy(new THREE.Vector3(0, 3, 10));
        this.spawnLargeEnemy(new THREE.Vector3(10, 3, 0));
    }
}
