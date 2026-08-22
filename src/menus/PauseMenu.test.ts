import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PauseMenu, PauseMenuCallbacks, PERFORMANCE_MODE_STORAGE_KEY, CONTROL_HINTS_STORAGE_KEY } from './PauseMenu';
import { InputManager } from '../controls/InputManager';
import { AudioManager } from '../AudioManager';
import { mockDeep } from 'vitest-mock-extended';

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

interface PauseMenuTestOverrides {
    inputManager?: InputManager,
    audioManager?: AudioManager,
    performanceModeEnabled?: boolean,
    controlHintsEnabled?: boolean,
    callbacks?: PauseMenuCallbacks,
}

function makePauseMenu(overrides: PauseMenuTestOverrides = {}): PauseMenu {
    const {
        inputManager = mockDeep<InputManager>(),
        audioManager = mockDeep<AudioManager>(),
        performanceModeEnabled = false,
        controlHintsEnabled = true,
        callbacks = makeCallbacks(),
    } = overrides;

    return new PauseMenu(inputManager, audioManager, performanceModeEnabled, controlHintsEnabled, callbacks);
}

describe('PauseMenu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('starts hidden', () => {
        const menu = makePauseMenu();
        expect(menu.visible).toBe(false);
    });

    it('becomes visible after show()', () => {
        const menu = makePauseMenu();
        menu.show();
        expect(menu.visible).toBe(true);
    });

    it('plays the UI open sound when shown', () => {
        const audioManager = mockDeep<AudioManager>();
        const menu = makePauseMenu({ audioManager: audioManager });
        menu.show();
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
    });

    it('becomes hidden after hide()', () => {
        const menu = makePauseMenu();
        menu.show();
        menu.hide();
        expect(menu.visible).toBe(false);
    });

    it('plays the UI close sound when hidden', () => {
        const audioManager = mockDeep<AudioManager>();
        const menu = makePauseMenu({ audioManager: audioManager });
        menu.show();
        menu.hide();
        expect(audioManager.playUiClose).toHaveBeenCalledOnce();
    });

    it('show() is idempotent when already visible', () => {
        const audioManager = mockDeep<AudioManager>();
        const menu = makePauseMenu({ audioManager: audioManager });
        menu.show();
        menu.show();
        expect(menu.visible).toBe(true);
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
    });

    it('hide() is idempotent when already hidden', () => {
        const audioManager = mockDeep<AudioManager>();
        const menu = makePauseMenu({ audioManager: audioManager });
        menu.hide();
        expect(menu.visible).toBe(false);
        expect(audioManager.playUiClose).not.toHaveBeenCalled();
    });

    it('creates an overlay element in the DOM', () => {
        makePauseMenu();
        const overlay = document.querySelector('[data-pause-menu]');
        expect(overlay).not.toBeNull();
    });

    it('renders the Execution Paused title', () => {
        const menu = makePauseMenu();
        menu.show();
        const overlay = document.querySelector('[data-pause-menu]');
        expect(overlay?.textContent).toContain('Execution Paused');
    });

    it('renders Continue, Performance Mode, Show Control Hints, Music, and Sound Effects options', () => {
        makePauseMenu();
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay!.textContent;
        expect(text).toContain('Continue');
        expect(text).toContain('Performance Mode');
        expect(text).toContain('Show Control Hints');
        expect(text).toContain('Music');
        expect(text).toContain('Sound Effects');
        expect(text).not.toContain('Restart Area');
    });

    it('shows Performance Mode status as "off" when performanceModeEnabled is false', () => {
        makePauseMenu();
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay!.textContent;
        expect(text).toContain('Performance Mode off');
    });

    it('shows Performance Mode status as "on" when performanceModeEnabled is true', () => {
        const audioManager = mockDeep<AudioManager>();
        makePauseMenu({ performanceModeEnabled: true, audioManager: audioManager });
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay!.textContent;
        expect(text).toContain('Performance Mode on');
    });

    it('Performance Mode status span has the correct colour', () => {
        makePauseMenu();
        const span = document.querySelector('[data-pause-menu] span[style*="color"]');
        expect(span).not.toBeNull();
        expect((span as HTMLElement)?.style.color).toContain('#33DDFF');
    });

    it('shows Show Control Hints status as "yes" when controlHintsEnabled is true', () => {
        makePauseMenu();
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Show Control Hints: yes');
    });

    it('shows Show Control Hints status as "no" when controlHintsEnabled is false', () => {
        makePauseMenu({ controlHintsEnabled: false });
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Show Control Hints: no');
    });

    it('shows Music status as "on" when musicEnabled is true', () => {
        const audioManager = mockDeep<AudioManager>();
        audioManager.isMusicEnabled.mockReturnValue(true);
        makePauseMenu({ audioManager: audioManager });
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Music on');
    });

    it('shows Sound Effects status as "on" when sound effects are enabled', () => {
        const audioManager = mockDeep<AudioManager>();
        audioManager.isSfxEnabled.mockReturnValue(true);
        makePauseMenu({ audioManager: audioManager });
        const overlay = document.querySelector('[data-pause-menu]');
        const text = overlay?.textContent ?? '';
        expect(text).toContain('Sound Effects on');
    });

    it('Control Hints status span has the correct colour', () => {
        makePauseMenu();
        const spans = document.querySelectorAll('[data-pause-menu] span[style*="color"]');
        // Second coloured span belongs to Control Hints
        expect(spans.length).toBeGreaterThanOrEqual(2);
        expect((spans[1] as HTMLElement)?.style.color).toContain('#33DDFF');
    });

    it('destroy() removes overlay from DOM', () => {
        const menu = makePauseMenu();
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
        const audioManager = mockDeep<AudioManager>();
        const menu = makePauseMenu({ audioManager: audioManager });
        (menu as any).navigate(1);
        expect(audioManager.playMenuNavigate).toHaveBeenCalledOnce();
    });

    it('toggles music from the pause menu and updates the label', () => {
        const audioManager = mockDeep<AudioManager>();
        audioManager.isMusicEnabled.mockReturnValue(true);
        const menu = makePauseMenu({ audioManager: audioManager });
        audioManager.toggleMusicEnabled.mockReturnValue(false);
        (menu as any).selectedIndex = 4;

        (menu as any).confirm();

        expect(audioManager.toggleMusicEnabled).toHaveBeenCalledOnce();
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
        expect(document.querySelector('[data-pause-menu]')?.textContent).toContain('Music off');
    });

    it('toggles sound effects from the pause menu and updates the label', () => {
        const audioManager = mockDeep<AudioManager>();
        audioManager.isSfxEnabled.mockReturnValue(true);
        const menu = makePauseMenu({ audioManager: audioManager });
        audioManager.toggleSfxEnabled.mockReturnValue(false);
        audioManager.isSfxEnabled.mockReturnValue(false);
        (menu as any).selectedIndex = 5;

        (menu as any).confirm();

        expect(audioManager.toggleSfxEnabled).toHaveBeenCalledOnce();
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
        expect(document.querySelector('[data-pause-menu]')?.textContent).toContain('Sound Effects off');
    });

    describe('controller mapping popup', () => {
        it('shows the controller mapping popup when the menu item is confirmed', () => {
            const menu = makePauseMenu();
            (menu as any).selectedIndex = 1; // 'controllermapping'
            (menu as any).confirm();

            expect((menu as any).controllerMappingVisible).toBe(true);
            expect((menu as any).controllerMappingEl.style.display).toBe('flex');
        });

        it('plays the UI open sound when showing the controller mapping popup', () => {
            const audioManager = mockDeep<AudioManager>();
            const menu = makePauseMenu({ audioManager: audioManager });
            (menu as any).selectedIndex = 1;
            (menu as any).confirm();

            expect(audioManager.playUiOpen).toHaveBeenCalled();
        });

        it('hides the controller mapping popup and plays close sound when hideControllerMapping is called', () => {
            const audioManager = mockDeep<AudioManager>();
            const menu = makePauseMenu({ audioManager: audioManager });
            (menu as any).selectedIndex = 1;
            (menu as any).confirm();
            vi.clearAllMocks();

            (menu as any).hideControllerMapping();

            expect((menu as any).controllerMappingVisible).toBe(false);
            expect((menu as any).controllerMappingEl.style.opacity).toBe('0');
            expect(audioManager.playUiClose).toHaveBeenCalledOnce();
        });

        it('sets prevCancel to true when closing the popup so the pause menu does not also close', () => {
            const audioManager = mockDeep<AudioManager>();
            const menu = makePauseMenu({ audioManager: audioManager });
            (menu as any).selectedIndex = 1;
            (menu as any).confirm();

            (menu as any).hideControllerMapping();

            expect((menu as any).prevCancel).toBe(true);
        });

        it('renders the ESC/B close hint inside the controller mapping popup', () => {
            const menu = makePauseMenu();
            const mappingEl = (menu as any).controllerMappingEl as HTMLDivElement;
            expect(mappingEl.innerHTML).toContain('ESC');
            expect(mappingEl.innerHTML).toContain('B');
            expect(mappingEl.innerHTML).toContain('Close');
        });

        it('renders an img element with the controller mapping image source', () => {
            const menu = makePauseMenu();
            const mappingEl = (menu as any).controllerMappingEl as HTMLDivElement;
            const img = mappingEl.querySelector('img');
            expect(img).not.toBeNull();
            expect(img?.src).toContain('controller_mapping.png');
        });

        it('resets the controller mapping state when the pause menu is hidden', () => {
            const menu = makePauseMenu();
            (menu as any).selectedIndex = 1;
            (menu as any).confirm();
            expect((menu as any).controllerMappingVisible).toBe(true);

            menu.show();
            menu.hide();

            expect((menu as any).controllerMappingVisible).toBe(false);
            expect((menu as any).controllerMappingEl.style.display).toBe('none');
        });
    });
});
