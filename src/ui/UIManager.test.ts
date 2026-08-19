import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UIManager } from './UIManager';
import { MobileControlsManager } from '../controls/MobileControlsManager';
import { InputManager } from '../controls/InputManager';
import { StartMenuFactory } from '../menus/StartMenuFactory';
import { PlayerUiFactory } from './PlayerUiFactory';
import { mock, mockDeep } from 'vitest-mock-extended';

interface UIManagerOverrides {
    mobileControlsManager?: MobileControlsManager;
    playerUiFactory?: PlayerUiFactory;
    startMenuFactory?: StartMenuFactory;
    inputManager?: InputManager;
}

function makeUIManager(overrides: UIManagerOverrides = {}) {
    const ui = new UIManager(
        overrides.mobileControlsManager ?? mock<MobileControlsManager>(),
        overrides.playerUiFactory ?? mock<PlayerUiFactory>(),
        overrides.startMenuFactory ?? mock<StartMenuFactory>(),
        overrides.inputManager ?? mockDeep<InputManager>(),
    );

    return ui;
}

function makeMockPui() {
    return {
        flashTPWarning: vi.fn(),
        update: vi.fn(),
        destroy: vi.fn(),
    };
}

function makeMockMinimapContext() {
    const arcCalls: Array<{ color: string; x: number; y: number; radius: number }> = [];
    const fillRectCalls: Array<{ color: string; x: number; y: number; width: number; height: number; composite: string }> = [];
    let fillStyle = '';
    let globalCompositeOperation = 'source-over';

    const ctx = {
        clearRect: vi.fn(),
        fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
            fillRectCalls.push({ color: fillStyle, x, y, width, height, composite: globalCompositeOperation });
        }),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(() => {
            globalCompositeOperation = 'source-over';
        }),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        arc: vi.fn((x: number, y: number, radius: number) => {
            arcCalls.push({ color: fillStyle, x, y, radius });
        }),
    } as any;

    Object.defineProperty(ctx, 'fillStyle', {
        get: () => fillStyle,
        set: (value: string) => {
            fillStyle = value;
        },
    });

    Object.defineProperty(ctx, 'globalCompositeOperation', {
        get: () => globalCompositeOperation,
        set: (value: string) => {
            globalCompositeOperation = value;
        },
    });

    return { ctx, arcCalls, fillRectCalls };
}

describe('UIManager', () => {
    beforeEach(() => {
        // HTML-Struktur vor dem Test schnell aufbauen
        document.body.innerHTML = `
            <div id="start-screen"></div>
            <div id="fade-overlay"></div>
            <div id="loading-screen"></div>
            <div id="progress-bar-fill"></div>
            <div id="version-box"></div>
        `;
    });

    // ─── displayInsufficientTPWarning ───────────────────────────────────────────

    describe('displayInsufficientTPWarning', () => {
        it('calls flashTPWarning on all registered playerUIs', () => {
            const ui = makeUIManager();
            const pui1 = makeMockPui();
            const pui2 = makeMockPui();
            ui.playerUIs.set('p1', pui1 as any);
            ui.playerUIs.set('p2', pui2 as any);

            ui.displayInsufficientTPWarning();

            expect(pui1.flashTPWarning).toHaveBeenCalledOnce();
            expect(pui2.flashTPWarning).toHaveBeenCalledOnce();
        });

        it('does nothing when no playerUIs registered', () => {
            const ui = makeUIManager();
            expect(() => ui.displayInsufficientTPWarning()).not.toThrow();
        });
    });

    // ─── update ─────────────────────────────────────────────────────────────────

    describe('update', () => {
        it('calls pui.update for the matching player', () => {
            const ui = makeUIManager();
            const pui = makeMockPui();
            const player = { id: 'abc' } as any;
            ui.playerUIs.set('abc', pui as any);

            ui.update(player, 0.016);

            expect(pui.update).toHaveBeenCalledWith(player, 0.016);
        });

        it('does nothing when no playerUIs exist', () => {
            const ui = makeUIManager();
            const player = { id: 'abc' } as any;
            expect(() => ui.update(player, 0.016)).not.toThrow();
        });

        it('does nothing when player has no matching UI', () => {
            const ui = makeUIManager();
            const pui = makeMockPui();
            ui.playerUIs.set('other', pui as any);
            const player = { id: 'abc' } as any;

            ui.update(player, 0.016);

            expect(pui.update).not.toHaveBeenCalled();
        });
    });

    describe('minimap teleporter marker', () => {
        it('renders minimap background at 0.5 alpha', () => {
            const { ctx, fillRectCalls } = makeMockMinimapContext();
            const canvas = document.createElement('canvas');
            canvas.width = 240;
            canvas.height = 180;
            (canvas as any).getContext = vi.fn().mockReturnValue(ctx);
            const wrapper = document.createElement('div');
            const ui = makeUIManager();
            (ui as any).minimapCanvas = canvas;
            (ui as any).minimapWrapper = wrapper;
            (ui as any).minimapVisible = true;
            (ui as any).minimapLayout = {
                rects: [],
                bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
            };

            ui.update({ id: 'p1', position: { x: 0, z: 0 } } as any, 0.016);

            expect(
                fillRectCalls.some(call =>
                    call.composite === 'source-over' &&
                    call.color === 'rgba(6, 10, 14, 0.5)' &&
                    call.x === 0 &&
                    call.y === 0 &&
                    call.width === 240 &&
                    call.height === 180),
            ).toBe(true);
        });

        it('renders inactive teleporter marker in inactive color', () => {
            const { ctx, arcCalls } = makeMockMinimapContext();
            const canvas = document.createElement('canvas');
            (canvas as any).getContext = vi.fn().mockReturnValue(ctx);
            const wrapper = document.createElement('div');
            const ui = makeUIManager();
            (ui as any).minimapCanvas = canvas;
            (ui as any).minimapWrapper = wrapper;
            (ui as any).minimapVisible = true;
            (ui as any).minimapLayout = {
                rects: [],
                bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
                teleporter: { x: 3, z: -2, active: false },
            };

            ui.update({ id: 'p1', position: { x: 0, z: 0 } } as any, 0.016);

            expect(arcCalls.some(call => call.color === '#ffedd0')).toBe(true);
            expect(arcCalls.some(call => call.color === '#ffea00')).toBe(true);
        });

        it('renders active teleporter marker in active color', () => {
            const { ctx, arcCalls } = makeMockMinimapContext();
            const canvas = document.createElement('canvas');
            (canvas as any).getContext = vi.fn().mockReturnValue(ctx);
            const wrapper = document.createElement('div');
            const ui = makeUIManager();
            (ui as any).minimapCanvas = canvas;
            (ui as any).minimapWrapper = wrapper;
            (ui as any).minimapVisible = true;
            (ui as any).minimapLayout = {
                rects: [],
                bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
                teleporter: { x: 3, z: -2, active: true },
            };

            ui.update({ id: 'p1', position: { x: 0, z: 0 } } as any, 0.016);

            expect(arcCalls.some(call => call.color === '#df961f')).toBe(true);
            expect(arcCalls.some(call => call.color === '#ffea00')).toBe(true);
        });
    });

    // ─── showInteractionHint ─────────────────────────────────────────────────────

    describe('showInteractionHint', () => {
        it('show=true sets display to block', () => {
            const ui = makeUIManager();
            ui.showInteractionHint(true);
            expect(ui.interactionHint.style.display).toBe('block');
        });

        it('show=false sets display to none', () => {
            const ui = makeUIManager();
            ui.interactionHint.style.display = 'block';
            ui.showInteractionHint(false);
            expect(ui.interactionHint.style.display).toBe('none');
        });

        it('sets custom text as innerHTML', () => {
            const ui = makeUIManager();
            ui.showInteractionHint(true, 'Custom Hint');
            expect(ui.interactionHint.innerHTML).toBe('Custom Hint');
        });

        it('uses default text when no text argument provided', () => {
            const ui = makeUIManager();
            ui.showInteractionHint(true);
            expect(ui.interactionHint.innerHTML).toContain('Interact');
        });
    });

    // ─── showControlHints / hideControlHints ────────────────────────────────────

    describe('showControlHints', () => {
        it('sets display to block and innerHTML', () => {
            const ui = makeUIManager();
            ui.showControlHints('<b>hints</b>');
            expect(ui.controlHints.style.display).toBe('block');
            expect(ui.controlHints.innerHTML).toBe('<b>hints</b>');
        });
    });

    describe('hideControlHints', () => {
        it('sets display to none', () => {
            const ui = makeUIManager();
            ui.controlHints.style.display = 'block';
            ui.hideControlHints();
            expect(ui.controlHints.style.display).toBe('none');
        });
    });

    // ─── showStartScreen / hideStartScreen ──────────────────────────────────────

    describe('showStartScreen', () => {
        it('removes hidden class and sets startScreenShown', () => {
            const ui = makeUIManager();
            ui.startScreen.classList.add('hidden');
            (ui as any).startScreenShown = false;

            ui.showStartScreen();

            expect(ui.startScreen.classList.contains('hidden')).toBe(false);
            expect((ui as any).startScreenShown).toBe(true);
        });

        it('does not show again when already shown', () => {
            const ui = makeUIManager();
            (ui as any).startScreenShown = true;
            ui.startScreen.classList.add('hidden');

            ui.showStartScreen();

            expect(ui.startScreen.classList.contains('hidden')).toBe(true);
        });

        it('calls play on a nested video element', () => {
            const ui = makeUIManager();
            (ui as any).startScreenShown = false;
            const video = document.createElement('video');
            const playSpy = vi.fn().mockResolvedValue(undefined);
            video.play = playSpy;
            ui.startScreen.appendChild(video);

            ui.showStartScreen();

            expect(playSpy).toHaveBeenCalled();
        });
    });

    describe('hideStartScreen', () => {
        it('adds hidden class', () => {
            const ui = makeUIManager();
            ui.hideStartScreen();
            expect(ui.startScreen.classList.contains('hidden')).toBe(true);
        });

        it('resets startScreenTapped to false', () => {
            const ui = makeUIManager();
            (ui as any).startScreenTapped = true;
            ui.hideStartScreen();
            expect((ui as any).startScreenTapped).toBe(false);
        });

        it('calls pause on a nested video element', () => {
            const ui = makeUIManager();
            const video = document.createElement('video');
            const pauseSpy = vi.fn();
            video.pause = pauseSpy;
            ui.startScreen.appendChild(video);

            ui.hideStartScreen();

            expect(pauseSpy).toHaveBeenCalled();
        });
    });

    // ─── hideLoadingScreen / showLoadingScreen ───────────────────────────────────

    describe('hideLoadingScreen', () => {
        it('sets display to none', () => {
            const ui = makeUIManager();
            ui.loadingScreen.style.display = 'flex';
            ui.hideLoadingScreen();
            expect(ui.loadingScreen.style.display).toBe('none');
        });
    });

    describe('showLoadingScreen', () => {
        it('sets display to flex', () => {
            const ui = makeUIManager();
            ui.loadingScreen.style.display = 'none';
            ui.showLoadingScreen();
            expect(ui.loadingScreen.style.display).toBe('flex');
        });

        it('resets progressBarFill width to 0%', () => {
            const ui = makeUIManager();
            ui.progressBarFill.style.width = '75%';
            ui.showLoadingScreen();
            expect(ui.progressBarFill.style.width).toBe('0%');
        });
    });

    // ─── updateLoadingProgress ───────────────────────────────────────────────────

    describe('updateLoadingProgress', () => {
        it('sets progressBarFill to correct percentage', () => {
            const ui = makeUIManager();
            ui.updateLoadingProgress(50, 100);
            expect(ui.progressBarFill.style.width).toBe('50%');
        });

        it('handles total=0 by setting width to 0%', () => {
            const ui = makeUIManager();
            ui.updateLoadingProgress(10, 0);
            expect(ui.progressBarFill.style.width).toBe('0%');
        });

        it('handles full load (100%)', () => {
            const ui = makeUIManager();
            ui.updateLoadingProgress(200, 200);
            expect(ui.progressBarFill.style.width).toBe('100%');
        });
    });

    // ─── showDeathOverlay / hideDeathOverlay ─────────────────────────────────────

    describe('showDeathOverlay', () => {
        it('stores retry and lobby callbacks', () => {
            const ui = makeUIManager();
            const onRetry = vi.fn();
            const onLobby = vi.fn();
            ui.showDeathOverlay(onRetry, onLobby);
            expect((ui as any).retryCallback).toBe(onRetry);
            expect((ui as any).lobbyCallback).toBe(onLobby);
        });

        it('sets deathOverlay display to flex', () => {
            const ui = makeUIManager();
            ui.showDeathOverlay(vi.fn(), vi.fn());
            expect(ui.deathOverlay.style.display).toBe('flex');
        });

        it('resets deathOverlaySelectedIndex to 0', () => {
            const ui = makeUIManager();
            (ui as any).deathOverlaySelectedIndex = 1;
            ui.showDeathOverlay(vi.fn(), vi.fn());
            expect((ui as any).deathOverlaySelectedIndex).toBe(0);
        });

        it('shows penalty text when penalty is provided', () => {
            const ui = makeUIManager();
            ui.showDeathOverlay(vi.fn(), vi.fn(), { bitsLost: 123, expLost: 456 });
            const penaltyEl = (ui as any).deathPenaltyText as HTMLDivElement;
            expect(penaltyEl.style.display).toBe('block');
            expect(penaltyEl.textContent).toBe('You lost: 456 EXP, 123 Bits');
        });

        it('hides penalty text when no penalty is provided', () => {
            const ui = makeUIManager();
            ui.showDeathOverlay(vi.fn(), vi.fn());
            const penaltyEl = (ui as any).deathPenaltyText as HTMLDivElement;
            expect(penaltyEl.style.display).toBe('none');
        });

        it('hides penalty text when both penalty amounts are zero', () => {
            const ui = makeUIManager();
            ui.showDeathOverlay(vi.fn(), vi.fn(), { bitsLost: 0, expLost: 0 });
            const penaltyEl = (ui as any).deathPenaltyText as HTMLDivElement;
            expect(penaltyEl.style.display).toBe('none');
        });
    });

    describe('hideDeathOverlay', () => {
        it('sets opacity to 0', () => {
            const ui = makeUIManager();
            ui.deathOverlay.style.opacity = '1';
            ui.hideDeathOverlay();
            expect(ui.deathOverlay.style.opacity).toBe('0');
        });
    });

    // ─── handleDeathOverlayInput ─────────────────────────────────────────────────

    describe('handleDeathOverlayInput', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        it('does nothing when deathOverlay display is none', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isNavigateRightPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager });
            (ui as any).deathOverlaySelectedIndex = 0;

            ui.handleDeathOverlayInput();

            expect((ui as any).deathOverlaySelectedIndex).toBe(0);
        });

        it('navigates right from index 0 to 1', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isNavigateRightPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 0;
            (ui as any).lastNavigateRightState = false;

            ui.handleDeathOverlayInput();

            expect((ui as any).deathOverlaySelectedIndex).toBe(1);
        });

        it('navigates left from index 1 to 0', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isNavigateLeftPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 1;
            (ui as any).lastNavigateLeftState = false;

            ui.handleDeathOverlayInput();

            expect((ui as any).deathOverlaySelectedIndex).toBe(0);
        });

        it('does not navigate left past index 0', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isNavigateLeftPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 0;
            (ui as any).lastNavigateLeftState = false;

            ui.handleDeathOverlayInput();

            expect((ui as any).deathOverlaySelectedIndex).toBe(0);
        });

        it('does not navigate right past index 1', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isNavigateRightPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 1;
            (ui as any).lastNavigateRightState = false;

            ui.handleDeathOverlayInput();

            expect((ui as any).deathOverlaySelectedIndex).toBe(1);
        });

        it('debounces navigation (held right = no double move)', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isNavigateRightPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 0;
            (ui as any).lastNavigateRightState = true; // already held

            ui.handleDeathOverlayInput();

            expect((ui as any).deathOverlaySelectedIndex).toBe(0);
        });

        it('calls retry callback when select pressed at index 0', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isSelectPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 0;
            (ui as any).lastSelectState = false;
            const onRetry = vi.fn();
            (ui as any).retryCallback = onRetry;

            ui.handleDeathOverlayInput();

            expect(onRetry).toHaveBeenCalledOnce();
        });

        it('calls lobby callback when select pressed at index 1', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isSelectPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 1;
            (ui as any).lastSelectState = false;
            const onLobby = vi.fn();
            (ui as any).lobbyCallback = onLobby;

            ui.handleDeathOverlayInput();

            expect(onLobby).toHaveBeenCalledOnce();
        });

        it('debounces select (held select = no action)', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isSelectPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.deathOverlay.style.display = 'flex';
            (ui as any).deathOverlaySelectedIndex = 0;
            (ui as any).lastSelectState = true; // already held
            const onRetry = vi.fn();
            (ui as any).retryCallback = onRetry;

            ui.handleDeathOverlayInput();

            expect(onRetry).not.toHaveBeenCalled();
        });
    });

    describe('skill unlock overlay', () => {
        it('shows queued unlock content and marks overlay visible', () => {
            const ui = makeUIManager();

            ui.showSkillUnlockOverlay('Laser Skill Unlocked', 'Laser description', '<span class="key-icon">Q</span>');

            expect((ui as any).skillUnlockTitle.textContent).toBe('Laser Skill Unlocked');
            expect((ui as any).skillUnlockDescription.textContent).toBe('Laser description');
            expect((ui as any).skillUnlockHint.innerHTML).toContain('key-icon');
            expect(ui.isSkillUnlockOverlayVisible()).toBe(true);
        });

        it('closes the current unlock and advances to the next on select', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isSelectPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.showSkillUnlockOverlay('Laser Skill Unlocked', 'Laser description', 'laser');
            ui.showSkillUnlockOverlay('Heal Skill Unlocked', 'Heal description', 'heal');
            (ui as any).lastSkillUnlockSelectState = false;

            ui.handleSkillUnlockOverlayInput();

            expect((ui as any).skillUnlockTitle.textContent).toBe('Heal Skill Unlocked');
            expect(ui.isSkillUnlockOverlayVisible()).toBe(true);
        });

        it('closes the overlay when cancel is pressed and queue is empty', () => {
            const inputManager = mockDeep<InputManager>();
            inputManager.isCancelPressed.mockReturnValue(true);
            const ui = makeUIManager({ inputManager: inputManager });
            ui.showSkillUnlockOverlay('Area Skill Unlocked', 'Area description', 'area');
            (ui as any).lastSkillUnlockCancelState = false;

            ui.handleSkillUnlockOverlayInput();

            expect(ui.isSkillUnlockOverlayVisible()).toBe(false);
        });
    });

    // ─── isStartMenuShowing ──────────────────────────────────────────────────────

    describe('isStartMenuShowing', () => {
        it('returns false when startMenu is undefined', () => {
            const ui = makeUIManager();
            expect(ui.isStartMenuShowing()).toBe(false);
        });

        it('returns true when startMenu is set', () => {
            const ui = makeUIManager();
            (ui as any).startMenu = {};
            expect(ui.isStartMenuShowing()).toBe(true);
        });
    });

    // ─── triggerStartTransition ──────────────────────────────────────────────────

    describe('triggerStartTransition', () => {
        it('calls callback directly when fadeOverlay is null', () => {
            const ui = makeUIManager();
            (ui as any).fadeOverlay = null;
            const cb = vi.fn();
            ui.triggerStartTransition(cb);
            expect(cb).toHaveBeenCalledOnce();
        });

        it('calls callback after timeout when fadeOverlay exists', () => {
            vi.useFakeTimers();
            const ui = makeUIManager();
            const cb = vi.fn();

            ui.triggerStartTransition(cb);
            expect(cb).not.toHaveBeenCalled();

            vi.advanceTimersByTime(2000);
            expect(cb).toHaveBeenCalledOnce();
            vi.useRealTimers();
        });

        it('adds active class to fadeOverlay when triggering transition', () => {
            vi.useFakeTimers();
            const ui = makeUIManager();
            const fadeOverlay = ui.fadeOverlay;

            ui.triggerStartTransition(vi.fn());

            expect(fadeOverlay.classList.contains('active')).toBe(true);
            vi.useRealTimers();
        });
    });

    // ─── showAlbumCompleteBanner ─────────────────────────────────────────────────

    describe('showAlbumCompleteBanner', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            // Clean up any album-complete banners appended to body during tests
            document.querySelectorAll('[data-album-complete-banner]').forEach(el => el.parentElement?.removeChild(el));
        });

        it('appends a banner element to document.body', () => {
            const ui = makeUIManager();
            const bodyChildrenBefore = document.body.children.length;

            ui.showAlbumCompleteBanner('A.001', 'Improve buy/sell prices of chips by 5%');

            expect(document.body.children.length).toBe(bodyChildrenBefore + 1);
        });

        it('banner contains the album name in the title', () => {
            const ui = makeUIManager();
            ui.showAlbumCompleteBanner('B.003', 'Raise item drop chance by 5%');

            const banner = (ui as any).albumBanner as HTMLDivElement;
            expect(banner).not.toBeNull();
            expect(banner.textContent).toContain('B.003');
        });

        it('banner contains the reward text', () => {
            const ui = makeUIManager();
            const reward = 'Reduce all skill cooldowns by 10%';
            ui.showAlbumCompleteBanner('C.002', reward);

            const banner = (ui as any).albumBanner as HTMLDivElement;
            expect(banner.textContent).toContain(reward);
        });

        it('starts with opacity 0', () => {
            const ui = makeUIManager();
            ui.showAlbumCompleteBanner('A.001', 'bonus');

            const banner = (ui as any).albumBanner as HTMLDivElement;
            expect(banner.style.opacity).toBe('0');
        });

        it('removes banner from DOM after full display duration', () => {
            const ui = makeUIManager();
            const bodyChildrenBefore = document.body.children.length;

            ui.showAlbumCompleteBanner('A.001', 'bonus');
            expect(document.body.children.length).toBe(bodyChildrenBefore + 1);

            // Advance past total display time (12000 ms)
            vi.advanceTimersByTime(12500);

            expect(document.body.children.length).toBe(bodyChildrenBefore);
            expect((ui as any).albumBanner).toBeNull();
        });

        it('replaces an existing banner when called again before expiry', () => {
            const ui = makeUIManager();
            const bodyChildrenBefore = document.body.children.length;

            ui.showAlbumCompleteBanner('A.001', 'first');
            const firstBanner = (ui as any).albumBanner as HTMLDivElement;
            ui.showAlbumCompleteBanner('B.001', 'second');
            const secondBanner = (ui as any).albumBanner as HTMLDivElement;

            // Only one extra element in the body
            expect(document.body.children.length).toBe(bodyChildrenBefore + 1);
            expect(secondBanner).not.toBe(firstBanner);
            expect(secondBanner.textContent).toContain('second');
        });
    });
});
