import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PauseMenu, PauseMenuCallbacks } from './PauseMenu';
import { InputManager } from './InputManager';

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

function makeCallbacks(): PauseMenuCallbacks & { continueCalled: boolean; restartCalled: boolean; ssaoState: boolean } {
    const cbs = {
        continueCalled: false,
        restartCalled: false,
        ssaoState: true,
        onContinue: () => { cbs.continueCalled = true; },
        onToggleSSAO: () => { cbs.ssaoState = !cbs.ssaoState; return cbs.ssaoState; },
        onRestartArea: () => { cbs.restartCalled = true; },
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
        menu = new PauseMenu(input, true, callbacks);
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

    it('renders Continue, SSAO, and Restart Area options', () => {
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Continue');
        expect(text).toContain('SSAO');
        expect(text).toContain('Restart Area');
    });

    it('shows SSAO status as "on" when ssaoEnabled is true', () => {
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('SSAO on');
    });

    it('shows SSAO status as "off" when ssaoEnabled is false', () => {
        menu.destroy();
        menu = new PauseMenu(input, false, callbacks);
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('SSAO off');
    });

    it('SSAO status span has the correct colour', () => {
        const span = document.querySelector('[data-pause-menu] span[style*="color"]');
        expect(span).not.toBeNull();
        expect((span as HTMLElement)?.style.color).toContain('51, 221, 255');
    });

    it('destroy() removes overlay from DOM', () => {
        const beforeCount = document.querySelectorAll('[data-pause-menu]').length;
        menu.destroy();
        const afterCount = document.querySelectorAll('[data-pause-menu]').length;
        expect(afterCount).toBe(beforeCount - 1);
    });

    describe('Restart Area availability', () => {
        it('shows Restart Area as enabled by default', () => {
            menu.show();
            const items = document.querySelectorAll('[data-pause-menu] [data-index]');
            const restartEl = items[2] as HTMLElement;
            expect(restartEl.style.cursor).toBe('pointer');
        });

        it('shows Restart Area as disabled when restartEnabled is false', () => {
            menu.show(false);
            const items = document.querySelectorAll('[data-pause-menu] [data-index]');
            const restartEl = items[2] as HTMLElement;
            expect(restartEl.style.cursor).toBe('default');
            expect(restartEl.style.color).toContain('85, 85, 85');
        });

        it('shows Restart Area as enabled when restartEnabled is true', () => {
            menu.show(true);
            const items = document.querySelectorAll('[data-pause-menu] [data-index]');
            const restartEl = items[2] as HTMLElement;
            expect(restartEl.style.cursor).toBe('pointer');
        });
    });
});
