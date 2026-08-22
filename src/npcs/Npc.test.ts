import { describe, it, expect, vi } from 'vitest';
import { Npc } from './Npc';
import { NpcRegistry } from './NpcRegistry';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AssetManager } from '../AssetManager';
import { mock, mockDeep } from 'vitest-mock-extended';
import { GLTF } from 'three/examples/jsm/Addons.js';
import { InputManager } from '../controls/InputManager';

interface NpcTestOverrides {
    assetManager?: AssetManager,
    npcRegistry?: NpcRegistry,
    scene?: THREE.Scene,
    physicsWorld?: CANNON.World,
    physicsMaterial?: CANNON.Material,
    modelAsset?: string,
    npcName?: string,
    interactionHint?: string,
    position?: CANNON.Vec3,
    dialogue?: string[],
    interactionCallback?: () => void
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

function makeNpc(overrides: NpcTestOverrides = {}) {
    const defaultPhysicsMaterial = new CANNON.Material('defaultMaterial');
    const finalAssetManager = overrides.assetManager || createDefaultAssetManager();
    const finalPhysicsWorld = overrides.physicsWorld || createDefaultPhysicsWorld(defaultPhysicsMaterial);

    const {
        assetManager = finalAssetManager,
        npcRegistry = mockDeep<NpcRegistry>(),
        scene = mockDeep<THREE.Scene>(),
        physicsWorld = finalPhysicsWorld,
        physicsMaterial = defaultPhysicsMaterial,
        modelAsset = "model.glb",
        npcName = "TestNpc",
        interactionHint = "Talk",
        position = new CANNON.Vec3(0, 0, 0),
        dialogue = ['Hello!'],
        interactionCallback = vi.fn(),
    } = overrides;

    return new Npc(
        assetManager,
        npcRegistry,
        scene,
        physicsWorld,
        physicsMaterial,
        modelAsset,
        npcName,
        interactionHint,
        position,
        dialogue,
        interactionCallback
    );
}

// ─── isPlayerNearby ───────────────────────────────────────────────────────────

describe('Npc.isPlayerNearby', () => {
    it('returns true when player is within 2.5 units', () => {
        const playerPos = new THREE.Vector3(0, 0, 2);
        const npc = makeNpc();
        expect(npc.isPlayerNearby(playerPos)).toBe(true);
    });

    it('returns false when player is beyond 2.5 units', () => {
        const playerPos = new THREE.Vector3(0, 0, 5);
        const npc = makeNpc();
        expect(npc.isPlayerNearby(playerPos)).toBe(false);
    });

    it('returns true at exactly the boundary (distance < 2.5)', () => {
        // distance 2.4 should be true
        const playerPos = new THREE.Vector3(0, 0, 2.4);
        const npc = makeNpc();
        expect(npc.isPlayerNearby(playerPos)).toBe(true);
    });
});

// ─── playerInInteractionRange ─────────────────────────────────────────────────

describe('Npc.playerInInteractionRange', () => {
    it('returns true when player is within 2.0 units', () => {
        const playerPos = new THREE.Vector3(0, 0, 1.5);
        const npc = makeNpc();
        expect(npc.playerInInteractionRange(playerPos)).toBe(true);
    });

    it('returns false when player is beyond 2.0 units', () => {
        const playerPos = new THREE.Vector3(0, 0, 3);
        const npc = makeNpc();
        expect(npc.playerInInteractionRange(playerPos)).toBe(false);
    });

    it('isPlayerNearby has a larger range than playerInInteractionRange', () => {
        // distance 2.2: within isPlayerNearby (2.5) but outside playerInInteractionRange (2.0)
        const playerPos = new THREE.Vector3(0, 0, 2.2);
        const npc = makeNpc();
        expect(npc.isPlayerNearby(playerPos)).toBe(true);
        expect(npc.playerInInteractionRange(playerPos)).toBe(false);
    });
});

// ─── interact ─────────────────────────────────────────────────────────────────

describe('Npc.interact', () => {
    it('calls interactionCallback when set', () => {
        const cb = vi.fn();
        const npc = makeNpc({ interactionCallback: cb });
        npc.interact();
        expect(cb).toHaveBeenCalledOnce();
    });

    it('does not throw when interactionCallback is undefined', () => {
        const npc = makeNpc({ interactionCallback: undefined });
        expect(() => npc.interact()).not.toThrow();
    });
});

// ─── getInteractionHint ───────────────────────────────────────────────────────

describe('Npc.getInteractionHint', () => {
    it('returns the hint string from getHint', () => {
        const npc = makeNpc();
        const hint = npc.getInteractionHint(mockDeep<InputManager>());
        expect(typeof hint).toBe('string');
        expect(hint.length).toBeGreaterThan(0);
    });
});

// ─── hasShownDialogue / markDialogueShown ─────────────────────────────────────

describe('Npc.hasShownDialogue', () => {
    it('delegates to NpcRegistry.hasShownDialogue', () => {
        const npcRegistry = mockDeep<NpcRegistry>();
        const npc = makeNpc({ npcName: 'Guide', npcRegistry: npcRegistry });
        npcRegistry.hasShownDialogue.mockReturnValue(false);
        expect(npc.hasShownDialogue()).toBe(false);
        expect(npcRegistry.hasShownDialogue).toHaveBeenCalledWith('Guide');
    });

    it('returns true when registry says dialogue was shown', () => {
        const npcRegistry = mockDeep<NpcRegistry>();
        const npc = makeNpc({ npcName: 'Merchant', npcRegistry: npcRegistry });
        (npcRegistry.hasShownDialogue as any).mockReturnValue(true);
        expect(npc.hasShownDialogue()).toBe(true);
    });
});

describe('Npc.markDialogueShown', () => {
    it('delegates to NpcRegistry.markDialogueShown', () => {
        const npcRegistry = mockDeep<NpcRegistry>();
        const npc = makeNpc({ npcName: 'Vendor', npcRegistry: npcRegistry });
        npc.markDialogueShown();
        expect(npcRegistry.markDialogueShown).toHaveBeenCalledWith('Vendor');
    });
});

// ─── cleanup ─────────────────────────────────────────────────────────────────

describe('Npc.cleanup', () => {
    it('removes mesh from scene and body from world', () => {
        const npc = makeNpc();
        const scene = { remove: vi.fn() } as any;
        const world = { removeBody: vi.fn() } as any;
        npc.cleanup(scene, world);
        expect(scene.remove).toHaveBeenCalledWith((npc as any).mesh);
        expect(world.removeBody).toHaveBeenCalledWith(npc.body);
    });

    it('calls disposeMesh', () => {
        const npc = makeNpc();
        const scene = { remove: vi.fn() } as any;
        const world = { removeBody: vi.fn() } as any;
        const disposeMeshSpy = vi.spyOn((npc as any), 'disposeMesh');
        npc.cleanup(scene, world);
        expect(disposeMeshSpy).toHaveBeenCalledOnce();
        vi.restoreAllMocks();
    });

    it('does not throw if body is undefined', () => {
        const npc = makeNpc();
        (npc as any).body = undefined;
        const scene = { remove: vi.fn() } as any;
        const world = { removeBody: vi.fn() } as any;
        expect(() => npc.cleanup(scene, world)).not.toThrow();
    });
});
