import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { ProceduralEnvironmentGenerator } from './ProceduralEnvironmentGenerator';

export class NetworkMatrix extends BaseStage {
    private static id: string = "networkMatrix";
    private static name: string = "Network Matrix";
    private static description: string = "The first layer of defense";

    id = NetworkMatrix.id;
    name = NetworkMatrix.name;
    description = NetworkMatrix.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: NetworkMatrix.id,
            name: NetworkMatrix.name,
            description: NetworkMatrix.description,
            requiredProgress: 1 // Unlocked after talking to Mainframe for the first time
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
        const teleporterPos = new CANNON.Vec3(-10, 0, -10);
        this.createTeleporter(teleporterPos, Lobby.getMetadata().id);

        // Procedurally generate obstacles and enemy placements
        const generator = new ProceduralEnvironmentGenerator();
        const exclusionZones = [
            { x: 0, z: 0, radius: 4 },              // Player spawn
            { x: teleporterPos.x, z: teleporterPos.z, radius: 4 }, // Teleporter
        ];
        const layout = generator.generateLayout({
            bounds: { min: -20, max: 20 },
            exclusionZones,
            obstacleCount: { min: 6, max: 10 },
            enemyCounts: {
                regular: { min: 3, max: 5 },
                large: { min: 1, max: 3 },
            },
        });

        for (const obs of layout.obstacles) {
            this.createBox(obs.width, obs.height, obs.depth, new CANNON.Vec3(obs.x, obs.y, obs.z));
        }

        for (const pos of layout.enemyPositions) {
            this.spawnEnemy(new CANNON.Vec3(pos.x, pos.y, pos.z));
        }

        for (const pos of layout.largeEnemyPositions) {
            this.spawnLargeEnemy(new CANNON.Vec3(pos.x, pos.y, pos.z));
        }
    }
}
