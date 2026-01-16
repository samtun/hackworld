import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';

export class MovementTest extends BaseStage {
    private static id: string = "movementTest";
    private static name: string = "Movement Test";
    private static description: string = "A test stage for movement mechanics";

    id = MovementTest.id;
    name = MovementTest.name;
    description = MovementTest.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 1, 0);

    static getMetadata(): { id: string; name: string; description: string; stageIndex?: number } {
        return {
            id: MovementTest.id,
            name: MovementTest.name,
            description: MovementTest.description,
            // No stageIndex - this is a test stage, not part of progression
        };
    }

    /**
     * Get assets required by this dungeon
     */
    getRequiredAssets(): string[] {
        return [];
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Portal back to Lobby
        this.createPortal(new CANNON.Vec3(0, 0.02, 0), 0x0000ff, Lobby.getMetadata().id);

        const geo = new THREE.PlaneGeometry(50, 50);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.FrontSide });
        this.scene.add(new THREE.Mesh(geo, mat));

        // Obstacles
        for (let i = 0; i < 5; i++) {
            this.createBox(2, 0.1, 2, new CANNON.Vec3(4 + i * 2, i * 0.2, 0));
        }

        for (let i = 0; i < 5; i++) {
            this.createBox(2, 1, 2, new CANNON.Vec3(-4 - i * 2, 0.5 + i * 1, 0));
        }

        for (let i = 0; i <= 24; i++) {
            this.createBox(6, 0.5, 2, new CANNON.Vec3(0, 0.5, 4 + i * 2), new CANNON.Quaternion().setFromEuler(0, 0, -Math.PI / 2 + i * 0.2));
        }
    }
}
