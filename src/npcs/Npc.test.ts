import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        copy(v: any) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
        distanceTo(v: V3) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2); }
    }
    class FakeMesh {
        position = new V3(); quaternion = { copy: vi.fn() };
        geometry = { dispose: vi.fn() }; material = { dispose: vi.fn() };
        add = vi.fn(); remove = vi.fn(); lookAt = vi.fn(); traverse = vi.fn(); children = [];
    }
    class FakeBox3 {
        setFromObject() { return this; }
        getSize(v: any) { v.x = 1; v.y = 2; v.z = 1; }
        getCenter(v: any) { v.x = 0; v.y = 1; v.z = 0; }
    }
    return {
        Mesh: FakeMesh, Group: FakeMesh, Object3D: FakeMesh, Vector3: V3,
        Box3: FakeBox3,
        Euler: class { x = 0; y = 0; z = 0; constructor(..._: any[]) {} },
        BoxGeometry: class { dispose = vi.fn(); },
        MeshBasicMaterial: class { dispose = vi.fn(); color = { setHSL: vi.fn() }; transparent = false; opacity = 1; },
        AnimationMixer: class {
            update = vi.fn();
            clipAction = vi.fn(() => ({ play: vi.fn(), setLoop: vi.fn(), fadeIn: vi.fn(), reset: vi.fn() }));
        },
        LoopRepeat: 2,
    };
});

vi.mock('cannon-es', () => {
    class FV3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        clone() { return new FV3(this.x, this.y, this.z); }
        copy(v: any) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    }
    class FBody {
        position = new FV3(); velocity = new FV3();
        quaternion = { x: 0, y: 0, z: 0, w: 1 };
        type = 2;
        addShape = vi.fn();
        addEventListener = vi.fn();
    }
    return {
        Vec3: FV3, Body: FBody, World: class { addBody = vi.fn(); removeBody = vi.fn(); },
        Sphere: class {}, Box: class {}, BODY_TYPES: { STATIC: 2 },
        Material: class {},
    };
});

vi.mock('../BaseMesh', () => ({
    BaseMesh: class {
        mesh = {
            position: { x: 0, y: 0, z: 0, copy: vi.fn(), set: vi.fn() },
            quaternion: { copy: vi.fn() },
            add: vi.fn(), remove: vi.fn(),
            geometry: { dispose: vi.fn() }, material: { dispose: vi.fn() },
            lookAt: vi.fn(), traverse: vi.fn(), children: [],
        };
        body = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
        disposeMesh = vi.fn();
        scene: any; world: any;
        update(_dt: number) {}
    },
}));

vi.mock('../AssetManager', () => ({
    AssetManager: {
        Instance: {
            getModel: vi.fn(() => ({
                scene: { clone: vi.fn(() => ({ traverse: vi.fn(), children: [] })), animations: [] },
                animations: [],
            })),
        },
    },
}));

vi.mock('./NpcRegistry', () => ({
    NpcRegistry: {
        Instance: {
            hasShownDialogue: vi.fn().mockReturnValue(false),
            markDialogueShown: vi.fn(),
        },
    },
}));

vi.mock('../ui/InputHints', () => ({
    getHint: vi.fn().mockReturnValue('<span>ENTER</span> Talk'),
}));

import { Npc } from './Npc';
import { NpcRegistry } from './NpcRegistry';

function makeNpc(overrides: Partial<{
    name: string;
    interactionHint: string;
    position: any;
    dialogue: string[];
    interactionCallback: () => void;
}> = {}) {
    const npc = Object.create(Npc.prototype) as any;
    const pos = overrides.position ?? { x: 0, y: 0, z: 0 };
    Object.assign(npc, {
        name: 'TestNpc',
        interactionHint: 'Talk',
        position: pos,
        dialogue: ['Hello!'],
        interactionCallback: undefined,
        mesh: {
            position: { x: 0, y: 0, z: 0, copy: vi.fn(), set: vi.fn() },
            quaternion: { copy: vi.fn() },
            add: vi.fn(), remove: vi.fn(),
            geometry: { dispose: vi.fn() }, material: { dispose: vi.fn() },
            lookAt: vi.fn(), traverse: vi.fn(), children: [],
        },
        body: { position: { x: 0, y: 0, z: 0 } },
        disposeMesh: vi.fn(),
        ...overrides,
    });
    return npc as InstanceType<typeof Npc>;
}

// ─── isPlayerNearby ───────────────────────────────────────────────────────────

describe('Npc.isPlayerNearby', () => {
    let npc: InstanceType<typeof Npc>;

    beforeEach(() => {
        npc = makeNpc({ position: { x: 0, y: 0, z: 0 } });
    });

    it('returns true when player is within 2.5 units', () => {
        const { Vector3 } = require('three');
        const playerPos = new Vector3(0, 0, 2);
        expect(npc.isPlayerNearby(playerPos)).toBe(true);
    });

    it('returns false when player is beyond 2.5 units', () => {
        const { Vector3 } = require('three');
        const playerPos = new Vector3(0, 0, 5);
        expect(npc.isPlayerNearby(playerPos)).toBe(false);
    });

    it('returns true at exactly the boundary (distance < 2.5)', () => {
        const { Vector3 } = require('three');
        // distance 2.4 should be true
        const playerPos = new Vector3(0, 0, 2.4);
        expect(npc.isPlayerNearby(playerPos)).toBe(true);
    });
});

// ─── playerInInteractionRange ─────────────────────────────────────────────────

describe('Npc.playerInInteractionRange', () => {
    let npc: InstanceType<typeof Npc>;

    beforeEach(() => {
        npc = makeNpc({ position: { x: 0, y: 0, z: 0 } });
    });

    it('returns true when player is within 2.0 units', () => {
        const { Vector3 } = require('three');
        const playerPos = new Vector3(0, 0, 1.5);
        expect(npc.playerInInteractionRange(playerPos)).toBe(true);
    });

    it('returns false when player is beyond 2.0 units', () => {
        const { Vector3 } = require('three');
        const playerPos = new Vector3(0, 0, 3);
        expect(npc.playerInInteractionRange(playerPos)).toBe(false);
    });

    it('isPlayerNearby has a larger range than playerInInteractionRange', () => {
        const { Vector3 } = require('three');
        // distance 2.2: within isPlayerNearby (2.5) but outside playerInInteractionRange (2.0)
        const playerPos = new Vector3(0, 0, 2.2);
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
        const inputManager = {} as any;
        const hint = npc.getInteractionHint(inputManager);
        expect(typeof hint).toBe('string');
        expect(hint.length).toBeGreaterThan(0);
    });
});

// ─── hasShownDialogue / markDialogueShown ─────────────────────────────────────

describe('Npc.hasShownDialogue', () => {
    it('delegates to NpcRegistry.hasShownDialogue', () => {
        const npc = makeNpc({ name: 'Guide' });
        (NpcRegistry.Instance.hasShownDialogue as any).mockReturnValue(false);
        expect(npc.hasShownDialogue()).toBe(false);
        expect(NpcRegistry.Instance.hasShownDialogue).toHaveBeenCalledWith('Guide');
    });

    it('returns true when registry says dialogue was shown', () => {
        const npc = makeNpc({ name: 'Merchant' });
        (NpcRegistry.Instance.hasShownDialogue as any).mockReturnValue(true);
        expect(npc.hasShownDialogue()).toBe(true);
    });
});

describe('Npc.markDialogueShown', () => {
    it('delegates to NpcRegistry.markDialogueShown', () => {
        const npc = makeNpc({ name: 'Vendor' });
        npc.markDialogueShown();
        expect(NpcRegistry.Instance.markDialogueShown).toHaveBeenCalledWith('Vendor');
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
        npc.cleanup(scene, world);
        expect((npc as any).disposeMesh).toHaveBeenCalledOnce();
    });

    it('does not throw if body is undefined', () => {
        const npc = makeNpc();
        (npc as any).body = undefined;
        const scene = { remove: vi.fn() } as any;
        const world = { removeBody: vi.fn() } as any;
        expect(() => npc.cleanup(scene, world)).not.toThrow();
    });
});
