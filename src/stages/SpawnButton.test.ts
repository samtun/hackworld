import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SpawnButton } from './SpawnButton';
import { mockDeep } from 'vitest-mock-extended';
import { InputManager } from '../controls/InputManager';

interface SpawnButtonTestOverrides {
    position?: CANNON.Vec3,
    callback?: () => {}
};

function makeButton(overrides: SpawnButtonTestOverrides = {}): SpawnButton {
    const defaultCallback = () => { };
    const button = new SpawnButton(
        mockDeep<THREE.Scene>(),
        mockDeep<CANNON.World>(),
        mockDeep<CANNON.Material>(),
        mockDeep<InputManager>(),
        overrides.position ?? new CANNON.Vec3(),
        "TestButton",
        "Spawn Enemy",
        0xFFFFFF,
        overrides.callback ?? defaultCallback
    );
    return button;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SpawnButton', () => {

    // ── isPlayerNearby ──

    describe('isPlayerNearby', () => {
        it.each([
            [1, true],
            [1.4, true],
            [1.5, false],
            [2.0, false]
        ])('returns true when player is within 1.5 units', (distance: number, isNear: boolean) => {
            const { Vector3 } = require('three');
            const button = makeButton({ position: new CANNON.Vec3(0, 0, 0) });
            expect(button.isPlayerNearby(new Vector3(0, 0, distance))).toBe(isNear);
        });
    });

    // ── interact ──

    describe('interact', () => {
        it('calls the interactionCallback', () => {
            const cb = vi.fn();
            const button = makeButton({ callback: cb });
            button.interact();
            expect(cb).toHaveBeenCalledOnce();
        });
    });

    // ── getInteractionHint ──

    describe('getInteractionHint', () => {
        it('returns formatted hint text from getHint', () => {
            const button = makeButton();
            const hint = button.getInteractionHint();
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
            const button = makeButton();
            const geoDisposeSpy = vi.spyOn((button as any).mesh.geometry, 'dispose');
            const matDisposeSpy = vi.spyOn((button as any).mesh.material, 'dispose');
            button.cleanup(scene, world);
            expect(scene.remove).toHaveBeenCalledOnce();
            expect(geoDisposeSpy).toHaveBeenCalledOnce();
            expect(matDisposeSpy).toHaveBeenCalledOnce();
            expect(world.removeBody).toHaveBeenCalledWith((button as any).body);
            vi.restoreAllMocks();
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
