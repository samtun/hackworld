import { describe, it, expect, vi } from 'vitest';
import { BlobShadow } from './BlobShadow';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal BlobShadow instance bypassing the Three.js constructor,
 * consistent with the pattern used for Player, Enemy and Npc tests.
 */
function makeShadow(overrides: Partial<Record<string, unknown>> = {}): BlobShadow {
    const shadow = Object.create(BlobShadow.prototype) as BlobShadow;

    const mesh = {
        position: {
            set: vi.fn((x: number, _y: number, z: number) => {
                mesh.position.x = x;
                mesh.position.z = z;
            }),
            x: 0,
            y: 0,
            z: 0,
        },
        rotation: { x: 0 },
        scale: { set: vi.fn() },
        visible: true,
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() },
    };

    Object.assign(shadow, {
        mesh,
        scene: { add: vi.fn(), remove: vi.fn() },
        ...overrides,
    });

    return shadow;
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
    it('repositions the shadow to the given XZ coordinates at Y=0.02', () => {
        const shadow = makeShadow();
        shadow.update(5, -3);
        expect((shadow as any).mesh.position.set).toHaveBeenCalledWith(5, 0.02, -3);
    });

    it('updates X and Z independently on repeated calls', () => {
        const shadow = makeShadow();
        shadow.update(1, 2);
        shadow.update(9, 4);
        const setFn = (shadow as any).mesh.position.set;
        expect(setFn).toHaveBeenNthCalledWith(1, 1, 0.02, 2);
        expect(setFn).toHaveBeenNthCalledWith(2, 9, 0.02, 4);
    });
});

describe('BlobShadow.setScale', () => {
    it('sets mesh scale uniformly in XZ (X and Y in mesh space)', () => {
        const shadow = makeShadow();
        shadow.setScale(0.5);
        expect((shadow as any).mesh.scale.set).toHaveBeenCalledWith(0.5, 0.5, 1);
    });

    it('restores full scale at 1.0', () => {
        const shadow = makeShadow();
        shadow.setScale(0.5);
        shadow.setScale(1.0);
        expect((shadow as any).mesh.scale.set).toHaveBeenLastCalledWith(1.0, 1.0, 1);
    });
});

describe('BlobShadow.cleanup', () => {
    it('removes the mesh from the scene', () => {
        const shadow = makeShadow();
        shadow.cleanup();
        expect((shadow as any).scene.remove).toHaveBeenCalledWith((shadow as any).mesh);
    });

    it('disposes the geometry', () => {
        const shadow = makeShadow();
        shadow.cleanup();
        expect((shadow as any).mesh.geometry.dispose).toHaveBeenCalledOnce();
    });

    it('disposes the material', () => {
        const shadow = makeShadow();
        shadow.cleanup();
        expect((shadow as any).mesh.material.dispose).toHaveBeenCalledOnce();
    });
});
