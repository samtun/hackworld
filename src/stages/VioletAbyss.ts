import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';

export class VioletAbyss extends BaseDungeon {
    id = 'violetAbyss';
    name = 'Violet Abyss';
    description = 'A mysterious purple realm';

    static getMetadata() {
        return {
            id: 'violetAbyss',
            name: 'Violet Abyss',
            description: 'A mysterious purple realm'
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

    load(): void {
        this.clear();
        console.log("Loading Dungeon 2...");

        // Different themed floor - Dark Purple
        this.createFloor(50, 0x1a0033);

        // Portal back to Lobby
        this.createPortal(new CANNON.Vec3(12, 0.05, 12), 0x0000ff, Lobby.getMetadata().id);

        // Different dungeon layout with more obstacles
        this.createBox(3, 2, 3, new CANNON.Vec3(-8, 1, -8));
        this.createBox(2, 2, 5, new CANNON.Vec3(8, 1, -8));
        this.createBox(5, 1, 2, new CANNON.Vec3(-8, 0.5, 8));

        // Spawn more enemies - harder stage
        this.spawnEnemy(new CANNON.Vec3(6, 2, 6));
        this.spawnEnemy(new CANNON.Vec3(-6, 2, 6));
        this.spawnEnemy(new CANNON.Vec3(6, 2, -6));
        this.spawnEnemy(new CANNON.Vec3(-6, 2, -6));
        this.spawnEnemy(new CANNON.Vec3(0, 2, -10));
    }
}
