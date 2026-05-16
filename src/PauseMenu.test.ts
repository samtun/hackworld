import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: {
            playMenuNavigate: vi.fn(),
        },
    },
}));

import { PauseMenu, PauseMenuCallbacks, PERFORMANCE_MODE_STORAGE_KEY, CONTROL_HINTS_STORAGE_KEY } from './PauseMenu';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';

vi.mock('./MobileControlsManager', () => ({
    MobileControlsManager: {
        Instance: {
            isMobile: false,
            movementVector: { x: 0, y: 0 },
            isAttackPressed: false,
            isJumpPressed: false,
            isCancelPressed: false,
            isInventoryPressed: false,
            isPausePressed: false,
            isSkill1Pressed: false,
            isSkill2Pressed: false,
            isSkill3Pressed: false,
            updateState: vi.fn(),
        }
    }
}));

function makeInputManager(): InputManager {
    const im = Object.create(InputManager.prototype) as InputManager;
    Object.assign(im, {
        keys: {} as { [key: string]: boolean },
        gamepadIndex: null,
        mobileControls: undefined,
        previousAttackState: false,
        previousSelectState: false,
        previousSkill1State: false,
        previousSkill2State: false,
        previousSkill3State: false,
        previousBlockState: false,
        previousPauseState: false,
    });
    return im;
}

function makeCallbacks(): PauseMenuCallbacks & { continueCalled: boolean; performanceMode: boolean; controlHints: boolean } {
    const cbs = {
        continueCalled: false,
        performanceMode: false,
        controlHints: true,
        onContinue: () => { cbs.continueCalled = true; },
        onTogglePerformanceMode: () => { cbs.performanceMode = !cbs.performanceMode; return cbs.performanceMode; },
        onToggleControlHints: () => { cbs.controlHints = !cbs.controlHints; return cbs.controlHints; },
    };
    return cbs;
}

describe('PauseMenu', () => {
    let input: InputManager;
    let callbacks: ReturnType<typeof makeCallbacks>;
    let menu: PauseMenu;

    beforeEach(() => {
        input = makeInputManager();
        callbacks = makeCallbacks();
        menu = new PauseMenu(input, false, true, callbacks);
    });

    afterEach(() => {
        menu.destroy();
    });

    it('starts hidden', () => {
        expect(menu.visible).toBe(false);
    });

    it('becomes visible after show()', () => {
        menu.show();
        expect(menu.visible).toBe(true);
    });

    it('becomes hidden after hide()', () => {
        menu.show();
        menu.hide();
        expect(menu.visible).toBe(false);
    });

    it('show() is idempotent when already visible', () => {
        menu.show();
        menu.show();
        expect(menu.visible).toBe(true);
    });

    it('hide() is idempotent when already hidden', () => {
        menu.hide();
        expect(menu.visible).toBe(false);
    });

    it('creates an overlay element in the DOM', () => {
        const overlay = document.querySelector('[data-pause-menu]');
        expect(overlay).not.toBeNull();
    });

    it('renders the Execution Paused title', () => {
        menu.show();
        const overlay = document.querySelector('[data-pause-menu]');
        expect(overlay?.textContent).toContain('Execution Paused');
    });

    it('renders Continue, Performance Mode, and Show Control Hints options', () => {
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Continue');
        expect(text).toContain('Performance Mode');
        expect(text).toContain('Show Control Hints');
        expect(text).not.toContain('Restart Area');
    });

    it('shows Performance Mode status as "off" when performanceModeEnabled is false', () => {
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Performance Mode off');
    });

    it('shows Performance Mode status as "on" when performanceModeEnabled is true', () => {
        menu.destroy();
        menu = new PauseMenu(input, true, true, callbacks);
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Performance Mode on');
    });

    it('Performance Mode status span has the correct colour', () => {
        const span = document.querySelector('[data-pause-menu] span[style*="color"]');
        expect(span).not.toBeNull();
        expect((span as HTMLElement)?.style.color).toContain('51, 221, 255');
    });

    it('shows Show Control Hints status as "yes" when controlHintsEnabled is true', () => {
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Show Control Hints: yes');
    });

    it('shows Show Control Hints status as "no" when controlHintsEnabled is false', () => {
        menu.destroy();
        menu = new PauseMenu(input, false, false, callbacks);
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Show Control Hints: no');
    });

    it('Control Hints status span has the correct colour', () => {
        const spans = document.querySelectorAll('[data-pause-menu] span[style*="color"]');
        // Second coloured span belongs to Control Hints
        expect(spans.length).toBeGreaterThanOrEqual(2);
        expect((spans[1] as HTMLElement)?.style.color).toContain('51, 221, 255');
    });

    it('destroy() removes overlay from DOM', () => {
        const beforeCount = document.querySelectorAll('[data-pause-menu]').length;
        menu.destroy();
        const afterCount = document.querySelectorAll('[data-pause-menu]').length;
        expect(afterCount).toBe(beforeCount - 1);
    });

    describe('PERFORMANCE_MODE_STORAGE_KEY export', () => {
        it('exports the correct localStorage key', () => {
            expect(PERFORMANCE_MODE_STORAGE_KEY).toBe('hackworld_performance_mode');
        });
    });

    describe('CONTROL_HINTS_STORAGE_KEY export', () => {
        it('exports the correct localStorage key', () => {
            expect(CONTROL_HINTS_STORAGE_KEY).toBe('hackworld_control_hints');
        });
    });

    it('plays the navigation sound when moving between pause menu options', () => {
        (menu as any).navigate(1);
        expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
    });
});
