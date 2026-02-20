import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';

export class SecurityCore extends BaseStage {
    private static id: string = "securityCore";
    private static name: string = "Security Core";
    private static description: string = "The heart of the security system";

    id = SecurityCore.id;
    name = SecurityCore.name;
    description = SecurityCore.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

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

        const geo = new THREE.PlaneGeometry(50, 50);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.FrontSide });
        const floorPlane = new THREE.Mesh(geo, mat);
        this.scene.add(floorPlane);
        this.meshes.push(floorPlane);

        // Teleporter back to Lobby
        this.createTeleporter(new CANNON.Vec3(12, 0, 12), Lobby.getMetadata().id);

        // Different dungeon layout with more obstacles
        this.createBox(3, 2, 3, new CANNON.Vec3(-8, 1, -8));
        this.createBox(2, 2, 5, new CANNON.Vec3(8, 1, -8));
        this.createBox(5, 1, 2, new CANNON.Vec3(-8, 0.5, 8));

        // Spawn enemies
        this.spawnEnemy(new CANNON.Vec3(6, 0.5, 6));
        this.spawnEnemy(new CANNON.Vec3(-6, 0.5, 6));
        this.spawnEnemy(new CANNON.Vec3(6, 0.5, -6));
        this.spawnEnemy(new CANNON.Vec3(-6, 0.5, -6));
        this.spawnEnemy(new CANNON.Vec3(0, 0.5, -10));

        // Spawn boss
        this.spawnBoss(new CANNON.Vec3(30, 0.5, 0));
    }
}
