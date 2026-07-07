import { describe, it, expect, vi } from 'vitest';
import { BlobShadow } from './BlobShadow';
import { Mesh, Scene } from 'three';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal BlobShadow instance bypassing the Three.js constructor,
 * consistent with the pattern used for Player, Enemy and Npc tests.
 */
function makeShadow(mesh?: THREE.Mesh, scene?: THREE.Scene, overrides: Partial<Record<string, unknown>> = {}): BlobShadow {
    const shadow = Object.create(BlobShadow.prototype) as BlobShadow;
    mesh ??= makeMesh();
    scene ??= makeScene();

    Object.assign(shadow, {
        mesh,
        scene,
        ...overrides,
    });

    return shadow;
}

function makeMesh(): THREE.Mesh {
    const mesh = (Object.create(Mesh.prototype) as THREE.Mesh);
    Object.assign(mesh, {
        position: {
            set: vi.fn((x: number, _y: number, z: number) => {
                mesh.position.x = x;
                mesh.position.z = z;
            }),
            x: 0,
            y: 0,
            z: 0,
        },
        quaternion: { setFromUnitVectors: vi.fn() },
        scale: { set: vi.fn() },
        visible: true,
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() },
    });
    return mesh;
}

function makeScene(): THREE.Scene {
    const scene = (Object.create(Scene.prototype) as THREE.Scene);
    Object.assign(scene, {
        add: vi.fn(),
        remove: vi.fn(),
    });
    return scene;
}

// ─── BlobShadow ───────────────────────────────────────────────────────────────

describe('BlobShadow.visible', () => {
    it('returns true when mesh.visible is true', () => {
        const shadow = makeShadow();
        expect(shadow.visible).toBe(true);
    });

    it('returns false after setting visible to false', () => {
        const shadow = makeShadow();
        shadow.visible = false;
        expect(shadow.visible).toBe(false);
    });

    it('returns true after toggling back to true', () => {
        const shadow = makeShadow();
        shadow.visible = false;
        shadow.visible = true;
        expect(shadow.visible).toBe(true);
    });
});

describe('BlobShadow.update', () => {
    it('positions the shadow at x, y+offset, z for a flat surface', () => {
        const mesh = makeMesh();
        const shadow = makeShadow(mesh);
        shadow.update(5, 3, -3);
        // Y = floor hit Y (3) + SHADOW_Y_OFFSET (0.02) * normal.y (1) = 3.02
        expect(mesh.position.set).toHaveBeenCalledWith(5, 3.02, -3);
    });

    it('updates position independently on repeated calls', () => {
        const mesh = makeMesh();
        const shadow = makeShadow(mesh);
        shadow.update(1, 0, 2);
        shadow.update(9, 5, 4);
        const setFn = mesh.position.set;
        expect(setFn).toHaveBeenNthCalledWith(1, 1, 0.02, 2);
        expect(setFn).toHaveBeenNthCalledWith(2, 9, 5.02, 4);
    });

    it('calls setFromUnitVectors to orient the shadow circle', () => {
        const mesh = makeMesh();
        const shadow = makeShadow(mesh);
        shadow.update(0, 0, 0);
        expect(mesh.quaternion.setFromUnitVectors).toHaveBeenCalledOnce();
    });
});

describe('BlobShadow.setScale', () => {
    it('sets mesh scale uniformly in XZ (X and Y in mesh space)', () => {
        const mesh = makeMesh();
        const shadow = makeShadow(mesh);
        shadow.setScale(0.5);
        expect(mesh.scale.set).toHaveBeenCalledWith(0.5, 0.5, 1);
    });

    it('restores full scale at 1.0', () => {
        const mesh = makeMesh();
        const shadow = makeShadow(mesh);
        shadow.setScale(0.5);
        shadow.setScale(1.0);
        expect(mesh.scale.set).toHaveBeenLastCalledWith(1.0, 1.0, 1);
    });
});

describe('BlobShadow.cleanup', () => {
    it('removes the mesh from the scene', () => {
        const mesh = makeMesh();
        const scene = makeScene();
        const shadow = makeShadow(mesh, scene);
        shadow.cleanup();
        expect(scene.remove).toHaveBeenCalledWith(mesh);
    });

    it('disposes the geometry', () => {
        const mesh = makeMesh();
        const shadow = makeShadow(mesh);
        shadow.cleanup();
        expect(mesh.geometry.dispose).toHaveBeenCalledOnce();
    });

    it('disposes the material', () => {
        const mesh = makeMesh();
        const shadow = makeShadow(mesh);
        shadow.cleanup();
        expect((mesh.material as THREE.Material).dispose).toHaveBeenCalledOnce();
    });
});
