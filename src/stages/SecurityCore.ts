import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';

export class SecurityCore extends BaseStage {
    private static id: string = "securityCore";
    private static name: string = "Security Core";
    private static description: string = "The heart of the security system";

    id = SecurityCore.id;
    name = SecurityCore.name;
    description = SecurityCore.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 3, max: 5 },
        combatRoomSize: { minWidth: 10, maxWidth: 25, minDepth: 10, maxDepth: 25 },
        finalRoomSize: { minWidth: 15, maxWidth: 30, minDepth: 15, maxDepth: 30 },
        enemyCount: { min: 2, max: 8, areaPerEnemy: 25, largeFraction: 0.35 },
        obstacleCount: { min: 1, max: 3 },
        hasBoss: true,
    };

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

        // Generate room-based procedural layout
        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(SecurityCore.generationConfig);

        // Update spawn position from generated layout
        this.spawnPosition.set(layout.spawnPosition.x, 0.4, layout.spawnPosition.z);

        // Register rooms for per-room enemy aggro and teleporter activation
        this.dungeonRooms = layout.rooms;

        // Floor plane sized to cover all rooms and corridors
        const floorW = layout.floorBounds.maxX - layout.floorBounds.minX;
        const floorD = layout.floorBounds.maxZ - layout.floorBounds.minZ;
        const floorCX = (layout.floorBounds.minX + layout.floorBounds.maxX) / 2;
        const floorCZ = (layout.floorBounds.minZ + layout.floorBounds.maxZ) / 2;
        const floorGeo = new THREE.PlaneGeometry(floorW, floorD);
        floorGeo.rotateX(-Math.PI / 2);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.FrontSide });
        const floorPlane = new THREE.Mesh(floorGeo, floorMat);
        floorPlane.position.set(floorCX, 0, floorCZ);
        this.scene.add(floorPlane);
        this.meshes.push(floorPlane);

        // Build walls and obstacles
        for (const wall of layout.walls) {
            this.createBox(
                wall.width,
                wall.height,
                wall.depth,
                new CANNON.Vec3(wall.centerX, wall.centerY, wall.centerZ),
            );
        }
        this.buildObstaclesFromLayout(layout);

        // Teleporter in the final room – starts inactive until all enemies are defeated
        const tp = layout.teleporterPosition;
        this.createTeleporter(new CANNON.Vec3(tp.x, 0, tp.z), Lobby.getMetadata().id, false);

        // Spawn enemies with room assignments so aggro is room-gated
        this.spawnEnemiesFromLayout(layout);
    }
}
