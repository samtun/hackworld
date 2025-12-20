import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';

export class Dungeon1 extends BaseDungeon {
    id = 'dungeon';
    name = 'Crimson Depths';
    description = 'A dark dungeon with red hues';

    static getMetadata() {
        return {
            id: 'dungeon',
            name: 'Crimson Depths',
            description: 'A dark dungeon with red hues'
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
        console.log("Loading Dungeon 1...");

        // Darker Floor - Dark Red
        this.createFloor(40, 0x330000);

        // Portal back to Lobby
        this.createPortal(new CANNON.Vec3(-10, 0.05, -10), 0x0000ff, 'lobby');

        // Dungeon Obstacles
        this.createBox(4, 1, 4, new CANNON.Vec3(5, 0.5, 5));
        this.createBox(1, 4, 1, new CANNON.Vec3(-5, 2, 5));

        // Spawn Enemies
        this.spawnEnemy(new CANNON.Vec3(5, 2, -5));
        this.spawnEnemy(new CANNON.Vec3(-5, 2, -5));
        this.spawnEnemy(new CANNON.Vec3(8, 2, 8));

        // Spawn Large Enemies
        this.spawnLargeEnemy(new CANNON.Vec3(0, 2, 10));
        this.spawnLargeEnemy(new CANNON.Vec3(10, 2, 0));
    }
}
