import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as CANNON from 'cannon-es';
import { MainframeNpc } from './MainframeNpc';
import { GameProgressManager } from '../GameProgressManager';
import { AssetManager } from '../AssetManager';
import { NpcRegistry } from './NpcRegistry';
import { mock, mockDeep } from 'vitest-mock-extended';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/Addons.js';

interface MainframeNpcTestOverride {
    gameProgressManager?: GameProgressManager,
    assetManager?: AssetManager,
    npcRegistry?: NpcRegistry,
    scene?: THREE.Scene,
    physicsWorld?: CANNON.World,
    physicsMaterial?: CANNON.Material,
    position?: CANNON.Vec3
}

function createDefaultPhysicsWorld(defaultPhysicsMaterial: CANNON.Material = new CANNON.Material('defaultMaterial')): CANNON.World {
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({
        mass: 0,
        material: defaultPhysicsMaterial,
    });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    const defaultPhysicsWorld = new CANNON.World();
    defaultPhysicsWorld.addBody(floorBody);
    return defaultPhysicsWorld;
}

function createDefaultAssetManager(): AssetManager {
    const dummyMesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    const dummyRightHandBone = new THREE.Bone();
    dummyRightHandBone.name = 'HandR';

    const dummyScene = new THREE.Group();
    dummyScene.add(dummyMesh);
    dummyScene.add(dummyRightHandBone);

    const gltfMock = mock<GLTF>();
    gltfMock.scene = dummyScene;

    const defaultAssetManagerMock = mockDeep<AssetManager>();
    defaultAssetManagerMock.get.mockReturnValue(gltfMock);
    return defaultAssetManagerMock;
}

function makeMainframeNpc(overrides: MainframeNpcTestOverride = {}) {
    const {
        gameProgressManager = mockDeep<GameProgressManager>(),
        assetManager = createDefaultAssetManager(),
        npcRegistry = mockDeep<NpcRegistry>(),
        scene = mockDeep<THREE.Scene>(),
        physicsWorld = createDefaultPhysicsWorld(),
        physicsMaterial = new CANNON.Material('defaultMaterial'),
        position = new CANNON.Vec3(0, 0, 0)
    } = overrides;

    return new MainframeNpc(
        gameProgressManager,
        assetManager,
        npcRegistry,
        scene,
        physicsWorld,
        physicsMaterial,
        position,
    );
}

describe('MainframeNpc', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it.each([
        { progress: 0 },
        { progress: 2 },
        { progress: 4 },
        { progress: 6 },
        { progress: 8 },
    ]) ('Advances progress when interacting at even progress', ({ progress }) => {
        const gameProgressManager = mock<GameProgressManager>({
            progress: progress
        });
        const npc = makeMainframeNpc({ gameProgressManager: gameProgressManager });
        const updateDialogueSpy = vi.spyOn(npc, 'updateDialogue');

        (npc as any).onInteract();

        expect(gameProgressManager.advanceProgress).toHaveBeenCalledOnce();
        expect(updateDialogueSpy).toHaveBeenCalledOnce();
    });

    it.each([
        { progress: 1 },
        { progress: 3 },
        { progress: 5 },
        { progress: 7 },
        { progress: 9 },
    ]) ('Does not advance progress when interacting at odd progress', ({ progress }) => {
        const gameProgressManager = mock<GameProgressManager>({
            progress: 3
        });
        const npc = makeMainframeNpc({ gameProgressManager: gameProgressManager });
        const updateDialogueSpy = vi.spyOn(npc, 'updateDialogue');

        (npc as any).onInteract();

        expect(gameProgressManager.advanceProgress).not.toHaveBeenCalled();
        expect(updateDialogueSpy).not.toHaveBeenCalled();
    });

    it('dialogue at progress 8 references Kernel Terminus without boss or room terms', () => {
        const dialogue = (MainframeNpc as any).getDialogueForProgress(8) as string[];
        const text = dialogue.join(' ');
        expect(text).toContain('Kernel Terminus');
        expect(text).not.toContain('boss');
        expect(text).not.toContain('room');
    });
});
