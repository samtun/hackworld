import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }
    const mockPositionAttr = {
        count: 0,
        getX: vi.fn().mockReturnValue(0),
        getY: vi.fn().mockReturnValue(0),
        getZ: vi.fn().mockReturnValue(0),
        setX: vi.fn(),
        setZ: vi.fn(),
        needsUpdate: false,
    };
    return {
        Vector3: V3,
        BoxGeometry: class { dispose = vi.fn(); },
        CylinderGeometry: class {
            dispose = vi.fn();
            attributes = { position: mockPositionAttr };
            computeVertexNormals = vi.fn();
        },
        MeshStandardMaterial: class { color = { setHex: vi.fn() }; dispose = vi.fn(); },
        Mesh: class {
            position = new V3();
            castShadow = false;
            receiveShadow = false;
            geometry = { dispose: vi.fn(), attributes: { position: mockPositionAttr }, computeVertexNormals: vi.fn() };
            material = { dispose: vi.fn() };
        },
        Material: class {},
    };
});

vi.mock('cannon-es', () => {
    class Vec3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }
    return {
        Vec3,
        Box: class {},
        Cylinder: class {},
        Body: class {
            addShape = vi.fn();
            position = new Vec3();
        },
    };
});

import { BreakableBarrel } from './BreakableBarrel';

function makeBarrel(): { barrel: BreakableBarrel; scene: any; world: any } {
    const scene = { add: vi.fn(), remove: vi.fn() } as any;
    const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
    const CANNON = require('cannon-es');
    const barrel = new BreakableBarrel(scene, world, {} as any, new CANNON.Vec3(5, 0, 5));
    return { barrel, scene, world };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BreakableBarrel', () => {
    it('starts not destroyed', () => {
        const { barrel } = makeBarrel();
        expect(barrel.isDestroyed).toBe(false);
    });

    it('sets entity reference on body', () => {
        const { barrel } = makeBarrel();
        expect((barrel.body as any).entity).toBe(barrel);
    });

    it('onHit sets isDestroyed to true and removes mesh + body', () => {
        const { barrel, scene, world } = makeBarrel();
        barrel.onHit();
        expect(barrel.isDestroyed).toBe(true);
        expect(scene.remove).toHaveBeenCalled();
        expect(world.removeBody).toHaveBeenCalled();
    });

    it('onHit is idempotent (second call is ignored)', () => {
        const { barrel, scene } = makeBarrel();
        barrel.onHit();
        const removeCalls = scene.remove.mock.calls.length;
        barrel.onHit();
        expect(scene.remove.mock.calls.length).toBe(removeCalls);
    });

    it('cleanup removes mesh and body when not destroyed', () => {
        const { barrel, scene, world } = makeBarrel();
        barrel.cleanup();
        expect(scene.remove).toHaveBeenCalled();
        expect(world.removeBody).toHaveBeenCalled();
    });

    it('cleanup does not double-remove when already destroyed', () => {
        const { barrel, scene } = makeBarrel();
        barrel.onHit();
        const removeCalls = scene.remove.mock.calls.length;
        barrel.cleanup();
        expect(scene.remove.mock.calls.length).toBe(removeCalls);
    });
});
