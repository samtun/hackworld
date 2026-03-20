import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { ProceduralEnvironmentGenerator } from './ProceduralEnvironmentGenerator';

export class SecurityCore extends BaseStage {
    private static id: string = "securityCore";
    private static name: string = "Security Core";
    private static description: string = "The heart of the security system";

    id = SecurityCore.id;
    name = SecurityCore.name;
    description = SecurityCore.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: SecurityCore.id,
            name: SecurityCore.name,
            description: SecurityCore.description,
            requiredProgress: 3 // Unlocked after finishing NetworkMatrix and talking to Mainframe again
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
        const teleporterPos = new CANNON.Vec3(12, 0, 12);
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
            obstacleCount: { min: 8, max: 12 },
            enemyCounts: {
                regular: { min: 4, max: 6 },
                large: { min: 1, max: 2 },
                boss: 1,
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

        for (const pos of layout.bossPositions) {
            this.spawnBoss(new CANNON.Vec3(pos.x, pos.y, pos.z));
        }
    }
}
