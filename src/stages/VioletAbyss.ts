import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';

export class VioletAbyss extends BaseStage {
    private static id: string = "violetAbyss";
    private static name: string = "Network Matrix";
    private static description: string = "The communication hub - eliminate the spreading malware";

    id = VioletAbyss.id;
    name = VioletAbyss.name;
    description = VioletAbyss.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 1, 0);

    static getMetadata(): { id: string; name: string; description: string; stageIndex?: number } {
        return {
            id: VioletAbyss.id,
            name: VioletAbyss.name,
            description: VioletAbyss.description,
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

        // Portal back to Lobby
        this.createPortal(new CANNON.Vec3(12, 0.02, 12), 0x0088ff, Lobby.getMetadata().id);

        // Different dungeon layout with more obstacles
        this.createBox(3, 2, 3, new CANNON.Vec3(-8, 1, -8));
        this.createBox(2, 2, 5, new CANNON.Vec3(8, 1, -8));
        this.createBox(5, 1, 2, new CANNON.Vec3(-8, 0.5, 8));

        // Spawn more enemies - harder stage
        this.spawnEnemy(new CANNON.Vec3(6, 0.5, 6));
        this.spawnEnemy(new CANNON.Vec3(-6, 0.5, 6));
        this.spawnEnemy(new CANNON.Vec3(6, 0.5, -6));
        this.spawnEnemy(new CANNON.Vec3(-6, 0.5, -6));
        this.spawnEnemy(new CANNON.Vec3(0, 0.5, -10));
    }
}
