import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';

export class NetworkMatrix extends BaseStage {
    private static id: string = "networkMatrix";
    private static name: string = "Network Matrix";
    private static description: string = "The first layer of defense";

    id = NetworkMatrix.id;
    name = NetworkMatrix.name;
    description = NetworkMatrix.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    static getMetadata(): { id: string; name: string; description: string; stageIndex: number } {
        return {
            id: NetworkMatrix.id,
            name: NetworkMatrix.name,
            description: NetworkMatrix.description,
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
        this.createTeleporter(new CANNON.Vec3(-10, 0, -10), Lobby.getMetadata().id);

        // Dungeon Obstacles
        this.createBox(4, 1, 4, new CANNON.Vec3(5, 0.5, 5));
        this.createBox(1, 4, 1, new CANNON.Vec3(-5, 2, 5));

        // Spawn Enemies
        this.spawnEnemy(new CANNON.Vec3(5, 0.5, -5));
        this.spawnEnemy(new CANNON.Vec3(-5, 0.5, -5));
        this.spawnEnemy(new CANNON.Vec3(8, 0.5, 8));

        // Spawn Large Enemies
        this.spawnLargeEnemy(new CANNON.Vec3(0, 1, 10));
        this.spawnLargeEnemy(new CANNON.Vec3(10, 1, 0));
    }
}
