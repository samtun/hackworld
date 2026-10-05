import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { RoomBasedDungeonGenerator } from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';

export abstract class GeneratedStage extends BaseStage {
    protected async loadGeneratedStage(
        generationConfig: RoomGenerationConfig,
        teleporterDestination: string,
        floorColor?: number,
    ): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        const layout = new RoomBasedDungeonGenerator().generate(generationConfig);
        this.setMinimapLayout(layout.minimapLayout, false);
        this.setSpawnPositionInFrontOfLobbyReturnTeleporter(layout);
        this.dungeonRooms = layout.rooms;

        this.buildFloorFromLayout(layout, floorColor);
        this.buildWallsFromLayout(layout);
        this.buildObstaclesFromLayout(layout);

        const teleporterPosition = layout.teleporterPosition;
        this.createTeleporter(
            new CANNON.Vec3(teleporterPosition.x, layout.teleporterElevation, teleporterPosition.z),
            teleporterDestination,
            false,
        );
        this.createLobbyReturnTeleporter(layout);

        this.spawnEnemiesFromLayout(layout);
        this.buildChestsFromLayout(layout);
        this.buildBarrelsFromLayout(layout);
        this.buildMinimapDropFromLayout(layout);
        this.buildTrapsFromLayout(layout);
    }
}