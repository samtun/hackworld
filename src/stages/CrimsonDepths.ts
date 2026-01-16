import * as CANNON from 'cannon-es';
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
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 1, 0);

    static getMetadata() {
        return {
            id: CrimsonDepths.id,
            name: CrimsonDepths.name,
            description: CrimsonDepths.description
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

        // Portal back to Lobby
        this.createPortal(new CANNON.Vec3(-10, 0.02, -10), 0x0088ff, Lobby.getMetadata().id);

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
