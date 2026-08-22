import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BaseStage } from './BaseStage';
import { AudioManager } from '../AudioManager';
import { mockDeep } from 'vitest-mock-extended';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { EnemyFactory } from '../enemies/EnemyFactory';
import { BreakableBarrelFactory } from '../items/BreakableBarrelFactory';
import { ElectricTrapFactory } from '../items/ElectricTrapFactory';
import { ItemDropManager } from '../items/ItemDropManager';
import { LootChestFactory } from '../items/LootChestFactory';
import { ModelPropFactory } from '../props/ModelPropFactory';
import { TeleporterFactory } from '../props/TeleporterFactory';
import { DungeonRoom } from './RoomBasedDungeonGenerator';
import { Player } from '../player/Player';

class TestStage extends BaseStage {
    id: string = "test_stage";
    name: string = "Test";
    description: string = "test";
    environmentMap: string = "";
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0);
    load(): Promise<void> {
        return Promise.resolve();
    }
}

describe('BaseStage teleporter activation audio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('plays the stage-clear sound when the teleporter activates', () => {
        const audioManager = mockDeep<AudioManager>();
        const stage = new TestStage(
            mockDeep<THREE.Scene>(),
            mockDeep<CANNON.World>(),
            mockDeep<CANNON.Material>(),
            mockDeep<TeleporterFactory>(),
            mockDeep<ModelPropFactory>(),
            mockDeep<LootChestFactory>(),
            mockDeep<BreakableBarrelFactory>(),
            mockDeep<ElectricTrapFactory>(),
            mockDeep<EnemyFactory>(),
            audioManager,
            mockDeep<ItemDropManager>(),
        );
        const teleporter = {
            isActive: false,
            activate: vi.fn(),
            updateWithPlayerPosition: vi.fn(),
        };
        const player = {
            position: new THREE.Vector3(),
            body: {
                position: new CANNON.Vec3()
            }
        } as unknown as Player;

        Object.assign(stage, {
            teleporters: [teleporter],
            enemies: [],
            roomPendingSpawnData: new Map(),
            totalExpectedEnemies: 4,
            dungeonRooms: [mockDeep<DungeonRoom>()]
        });

        stage.update(16, player, new THREE.Vector3());

        expect(audioManager.playStageCleared).toHaveBeenCalledOnce();
        expect(teleporter.activate).toHaveBeenCalledOnce();
    });
});
