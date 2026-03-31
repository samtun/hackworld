import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        distanceTo(v: V3) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2); }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
        copy(v: any) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    }
    return {
        Vector3: V3,
        Mesh: class { position = new V3(); castShadow = false; receiveShadow = false; geometry = { dispose: vi.fn() }; material = { dispose: vi.fn() }; },
        BoxGeometry: class {},
        MeshStandardMaterial: class { dispose = vi.fn(); },
    };
});

vi.mock('cannon-es', () => {
    class FV3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        clone() { return new FV3(this.x, this.y, this.z); }
    }
    return {
        Vec3: FV3,
        Body: class { position = new FV3(); addShape = vi.fn(); },
        Box: class {},
        Material: class {},
    };
});

vi.mock('../ui/InputHints', () => ({
    getHint: vi.fn((_config: any, _input: any) => '<span>ENTER</span> Spawn Enemy'),
}));

import { SpawnButton } from './SpawnButton';

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeButton(overrides: Record<string, unknown> = {}): SpawnButton {
    const button = Object.create(SpawnButton.prototype) as any;
    Object.assign(button, {
        name: 'TestButton',
        interactionHint: 'Spawn Enemy',
        position: { x: 5, y: 0, z: 10 },
        dialogue: [],
        interactionCallback: vi.fn(),
        mesh: {
            position: { x: 5, y: 0.5, z: 10, set: vi.fn() },
            geometry: { dispose: vi.fn() },
            material: { dispose: vi.fn() },
        },
        body: { position: { x: 5, y: 0.5, z: 10 } },
        ...overrides,
    });
    return button;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SpawnButton', () => {

    // ── isPlayerNearby ──

    describe('isPlayerNearby', () => {
        it('returns true when player is within 2.5 units', () => {
            const { Vector3 } = require('three');
            const button = makeButton({ position: { x: 0, y: 0, z: 0 } });
            expect(button.isPlayerNearby(new Vector3(0, 0, 2))).toBe(true);
        });

        it('returns false when player is beyond 2.5 units', () => {
            const { Vector3 } = require('three');
            const button = makeButton({ position: { x: 0, y: 0, z: 0 } });
            expect(button.isPlayerNearby(new Vector3(0, 0, 3))).toBe(false);
        });

        it('returns true at exact boundary (2.4 units)', () => {
            const { Vector3 } = require('three');
            const button = makeButton({ position: { x: 0, y: 0, z: 0 } });
            expect(button.isPlayerNearby(new Vector3(0, 0, 2.4))).toBe(true);
        });
    });

    // ── interact ──

    describe('interact', () => {
        it('calls the interactionCallback', () => {
            const cb = vi.fn();
            const button = makeButton({ interactionCallback: cb });
            button.interact();
            expect(cb).toHaveBeenCalledOnce();
        });
    });

    // ── getInteractionHint ──

    describe('getInteractionHint', () => {
        it('returns formatted hint text from getHint', () => {
            const button = makeButton();
            const hint = button.getInteractionHint({} as any);
            expect(hint).toContain('Spawn Enemy');
        });
    });

    // ── hasShownDialogue ──

    describe('hasShownDialogue', () => {
        it('always returns true (skips dialogue)', () => {
            const button = makeButton();
            expect(button.hasShownDialogue()).toBe(true);
        });
    });

    // ── dialogue ──

    describe('dialogue', () => {
        it('is an empty array', () => {
            const button = makeButton();
            expect(button.dialogue).toEqual([]);
        });
    });

    // ── cleanup ──

    describe('cleanup', () => {
        it('removes mesh and body from scene and world', () => {
            const scene = { remove: vi.fn() } as any;
            const world = { removeBody: vi.fn() } as any;
            const geoDispose = vi.fn();
            const matDispose = vi.fn();
            const body = {};
            const button = makeButton({
                mesh: {
                    geometry: { dispose: geoDispose },
                    material: { dispose: matDispose },
                },
                body,
            });
            button.cleanup(scene, world);
            expect(scene.remove).toHaveBeenCalledOnce();
            expect(geoDispose).toHaveBeenCalledOnce();
            expect(matDispose).toHaveBeenCalledOnce();
            expect(world.removeBody).toHaveBeenCalledWith(body);
        });
    });

    // ── update ──

    describe('update', () => {
        it('does not throw', () => {
            const button = makeButton();
            expect(() => button.update(0.016)).not.toThrow();
        });
    });

    // ── markDialogueShown ──

    describe('markDialogueShown', () => {
        it('is a no-op that does not throw', () => {
            const button = makeButton();
            expect(() => button.markDialogueShown()).not.toThrow();
        });
    });
});
