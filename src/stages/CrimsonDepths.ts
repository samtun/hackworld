import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';

export class CrimsonDepths extends BaseStage {
    private static id: string = "crimsonDepths";
    private static name: string = "Security Core";
    private static description: string = "The first layer of defense - cleanse the malware infection";

    id = CrimsonDepths.id;
    name = CrimsonDepths.name;
    description = CrimsonDepths.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: THREE.Vector3 = new THREE.Vector3(0, 3, 0);

    static getMetadata(): { id: string; name: string; description: string; stageIndex: number } {
        return {
            id: CrimsonDepths.id,
            name: CrimsonDepths.name,
            description: CrimsonDepths.description,
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
        this.spawnEnemy(new THREE.Vector3(5, 0.5, -5));
        this.spawnEnemy(new THREE.Vector3(-5, 0.5, -5));
        this.spawnEnemy(new THREE.Vector3(8, 0.5, 8));

        // Spawn Large Enemies
        this.spawnLargeEnemy(new THREE.Vector3(0, 1, 10));
        this.spawnLargeEnemy(new THREE.Vector3(10, 1, 0));
    }
}
