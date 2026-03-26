import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';

export class NetworkMatrix extends BaseStage {
    private static id: string = "networkMatrix";
    private static name: string = "Network Matrix";
    private static description: string = "The first layer of defense";

    id = NetworkMatrix.id;
    name = NetworkMatrix.name;
    description = NetworkMatrix.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private static readonly generationConfig: RoomGenerationConfig = {
        combatRoomCount: { min: 2, max: 4 },
        combatRoomSize: { minWidth: 13, maxWidth: 20, minDepth: 13, maxDepth: 20 },
        finalRoomSize: { minWidth: 16, maxWidth: 24, minDepth: 16, maxDepth: 24 },
        enemyCount: { min: 2, max: 6, areaPerEnemy: 60, largeFraction: 0.25 },
        obstacleCount: { min: 1, max: 2 },
        hasBoss: false,
    };

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

        // Generate room-based procedural layout
        const generator = new RoomBasedDungeonGenerator();
        const layout = generator.generate(NetworkMatrix.generationConfig);

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
