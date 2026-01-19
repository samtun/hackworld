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

    static getMetadata(): { id: string; name: string; description: string; stageIndex: number } {
        return {
            id: MovementTest.id,
            name: MovementTest.name,
            description: MovementTest.description,
            stageIndex: -1,
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

        // Teleporter back to Lobby
        this.createTeleporter(new CANNON.Vec3(0, 0, -8), Lobby.getMetadata().id);

        const geo = new THREE.PlaneGeometry(50, 50);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.FrontSide });
        const floorPlane = new THREE.Mesh(geo, mat);
        this.scene.add(floorPlane);
        this.meshes.push(floorPlane);

        // Obstacles
        let yPos = -0.45;
        for (let i = 0; i < 10; i++) {
            this.createBox(2, 1.0, 2, new CANNON.Vec3(4 + i * 2, yPos, 0));
            yPos += i * 0.05;
        }

        let xDepth = 1;
        let accXDepth = xDepth;
        for (let i = 0; i < 10; i++) {
            this.createBox(xDepth, 1, 3, new CANNON.Vec3(-4 - accXDepth, i, 0));
            accXDepth += xDepth;
            xDepth += i * 0.2;
        }

        for (let i = 0; i <= 24; i++) {
            this.createBox(6, 0.5, 2, new CANNON.Vec3(0, 0.5, 4 + i * 2), new CANNON.Quaternion().setFromEuler(0, 0, -Math.PI / 2 + i * 0.2));
        }
    }
}
