import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../WallShaderUtils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../WallShaderUtils')>();
    return {
        ...actual,
        updateWallUniforms: vi.fn(),
    };
});

import { updateWallUniforms } from '../WallShaderUtils';
import { BaseStage } from './BaseStage';

describe('BaseStage transparency updates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('tracks transparency-enabled entities on the stage', () => {
        const stage = Object.create(BaseStage.prototype) as any;
        stage.wallMaterials = [];
        const entity = {
            enableWallTransparency: vi.fn(),
        };

        stage.trackTransparencyEntity(entity);

        expect(entity.enableWallTransparency).toHaveBeenCalledWith(stage.wallMaterials);
    });

    it('updates transparency uniforms even when no procedural dungeon layout is active', () => {
        const stage = Object.create(BaseStage.prototype) as any;
        Object.assign(stage, {
            teleporters: [],
            npcs: new Set(),
            mixers: [],
            props: [],
            breakableBarrels: [],
            electricTraps: [],
            enemies: [],
            dungeonRooms: [],
            wallMaterials: [new THREE.MeshStandardMaterial()],
            shaderTime: 0,
        });

        const player = { position: new THREE.Vector3(1, 2, 3) } as any;
        const cameraPosition = new THREE.Vector3(4, 5, 6);

        stage.update(0.25, player, false, cameraPosition);

        expect(updateWallUniforms).toHaveBeenCalledWith(
            stage.wallMaterials,
            player.position,
            cameraPosition,
            0.25,
        );
    });
});
