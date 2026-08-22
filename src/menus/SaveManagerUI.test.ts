import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveManagerUI } from './SaveManagerUI';
import { AudioManager } from '../AudioManager';
import { InputManager } from '../controls/InputManager';
import { UIManager } from '../ui/UIManager';
import { MenuManager } from '../ui/MenuManager';
import { mockDeep } from 'vitest-mock-extended';

interface SaveManagerUITestOverrides {
    menuManager?: MenuManager,
    uiManager?: UIManager,
    audioManager?: AudioManager,
    inputManager?: InputManager,
}

function makeSaveManagerUI(overrides: SaveManagerUITestOverrides = {}) {
    const {
        menuManager = overrides.menuManager ?? mockDeep<MenuManager>({
            createOverlay: vi.fn().mockReturnValue(document.createElement('div')),
            createFlexWindow: vi.fn().mockReturnValue(document.createElement('div')),
            createTitle: vi.fn().mockReturnValue(document.createElement('div')),
        }),
        uiManager = overrides.uiManager ?? mockDeep<UIManager>(),
        audioManager = overrides.audioManager ?? mockDeep<AudioManager>(),
        inputManager = overrides.inputManager ?? mockDeep<InputManager>(),
    } = overrides;

    return new SaveManagerUI(
        menuManager,
        uiManager,
        audioManager,
        inputManager
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── show ────────────────────────────────────────────────────────────────────

describe('show', () => {
    it('sets isVisible to true', () => {
        const ui = makeSaveManagerUI();
        ui.show('01:00:00', vi.fn(), vi.fn(), vi.fn());
        expect(ui.isVisible).toBe(true);
    });

    it('sets container display to flex', () => {
        const ui = makeSaveManagerUI();
        ui.show('01:00:00', vi.fn(), vi.fn(), vi.fn());
        expect(ui.container.style.display).toBe('flex');
    });

    it('stores all callbacks', () => {
        const ui = makeSaveManagerUI();
        const onSave = vi.fn();
        const onLoad = vi.fn();
        const onReset = vi.fn();
        ui.show('01:00:00', onSave, onLoad, onReset);
        expect((ui as any).saveCallback).toBe(onSave);
        expect((ui as any).loadCallback).toBe(onLoad);
        expect((ui as any).resetCallback).toBe(onReset);
    });

    it('updates playtimeDisplay.textContent with given playtime', () => {
        const ui = makeSaveManagerUI();
        ui.show('02:34:56', vi.fn(), vi.fn(), vi.fn());
        expect((ui as any).playtimeDisplay.textContent).toBe('Playtime: 02:34:56');
    });

    it('hides saveStatusText', () => {
        const ui = makeSaveManagerUI();
        (ui as any).saveStatusText.style.display = 'block';
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        expect((ui as any).saveStatusText.style.display).toBe('none');
    });

    it('resets selectedButton to save', () => {
        const ui = makeSaveManagerUI();
        (ui as any).selectedButton = 'reset';
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        expect((ui as any).selectedButton).toBe('save');
    });

    it('plays the UI open sound when shown from hidden', () => {
        const audioManager = mockDeep<AudioManager>();
        const ui = makeSaveManagerUI({ audioManager });
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
    });
});

// ─── hide ────────────────────────────────────────────────────────────────────

describe('hide', () => {
    it('sets isVisible to false', () => {
        const ui = makeSaveManagerUI();
        (ui as any).isVisible = true;
        ui.hide();
        expect(ui.isVisible).toBe(false);
    });

    it('sets container display to none', () => {
        const ui = makeSaveManagerUI();
        ui.container.style.display = 'flex';
        ui.hide();
        expect(ui.container.style.display).toBe('none');
    });

    it('clears all callbacks', () => {
        const ui = makeSaveManagerUI();
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        ui.hide();
        expect((ui as any).saveCallback).toBeUndefined();
        expect((ui as any).loadCallback).toBeUndefined();
        expect((ui as any).resetCallback).toBeUndefined();
    });

    it('calls uiManager.hideControlHints', () => {
        const uiManager = mockDeep<UIManager>();
        const ui = makeSaveManagerUI({ uiManager: uiManager });
        ui.hide();
        expect(uiManager.hideControlHints).toHaveBeenCalledOnce();
    });

    it('clears autoCloseTimer if set', () => {
        vi.useFakeTimers();
        const ui = makeSaveManagerUI();
        (ui as any).autoCloseTimer = window.setTimeout(() => { }, 9999);
        ui.hide();
        expect((ui as any).autoCloseTimer).toBeUndefined();
        vi.useRealTimers();
    });

    it('plays the UI close sound when hidden from visible', () => {
        const audioManager = mockDeep<AudioManager>();
        const ui = makeSaveManagerUI({ audioManager: audioManager });
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        ui.hide();
        expect(audioManager.playUiClose).toHaveBeenCalledOnce();
    });
});

// ─── update – visibility guard ───────────────────────────────────────────────

describe('update visibility guard', () => {
    it('does nothing when isVisible is false', () => {
        const inputManager = mockDeep<InputManager>();
        inputManager.isNavigateRightPressed.mockReturnValue(true);
        const ui = makeSaveManagerUI({ inputManager: inputManager });
        ui.update();
        expect((ui as any).selectedButton).toBe('save'); // unchanged
    });
});

// ─── update – navigation ─────────────────────────────────────────────────────

describe('update navigation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    function showSaveManagerUiAndResetDebounce(ui: SaveManagerUI) {
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        ui.update(); // Update once to ensure input debounce is reset
    }

    it('navigates right from save to load to reset, no further and back to save', () => {
        const audioManager = mockDeep<AudioManager>();
        const inputManager = mockDeep<InputManager>();
        const ui = makeSaveManagerUI({ audioManager: audioManager, inputManager: inputManager });
        showSaveManagerUiAndResetDebounce(ui);

        // 1. RIGHT: Trigger first right navigation to move from save -> load
        inputManager.isNavigateRightPressed.mockReturnValue(true);
        ui.update();

        // reset debounce to allow another navigation
        inputManager.isNavigateRightPressed.mockReturnValue(false);
        ui.update();
        expect(audioManager.playMenuNavigate).toHaveBeenCalledOnce();
        expect((ui as any).selectedButton).toBe('load');

        // 2. RIGHT:Trigger second right navigation to move from load -> reset
        inputManager.isNavigateRightPressed.mockReturnValue(true);
        ui.update();
        expect((ui as any).selectedButton).toBe('reset');
        expect(audioManager.playMenuNavigate).toHaveBeenCalledTimes(2);

        // reset debounce to allow another navigation
        inputManager.isNavigateRightPressed.mockReturnValue(false);
        ui.update();

        // 3. RIGHT: Trigger third right navigation to check no further movement past reset
        inputManager.isNavigateRightPressed.mockReturnValue(true);
        ui.update();
        expect((ui as any).selectedButton).toBe('reset');
        expect(audioManager.playMenuNavigate).toHaveBeenCalledTimes(2);

        // reset debounce to allow another navigation
        inputManager.isNavigateRightPressed.mockReturnValue(false);
        ui.update();

        // 1. LEFT: Trigger left navigation to move from reset -> load
        inputManager.isNavigateLeftPressed.mockReturnValue(true);
        ui.update();
        expect((ui as any).selectedButton).toBe('load');
        expect(audioManager.playMenuNavigate).toHaveBeenCalledTimes(3);

        // reset debounce to allow another navigation
        inputManager.isNavigateLeftPressed.mockReturnValue(false);
        ui.update();

        // 2. LEFT: Trigger left navigation to move from load -> save
        inputManager.isNavigateLeftPressed.mockReturnValue(true);
        ui.update();
        expect((ui as any).selectedButton).toBe('save');
        expect(audioManager.playMenuNavigate).toHaveBeenCalledTimes(4);

        // reset debounce to allow another navigation
        inputManager.isNavigateLeftPressed.mockReturnValue(false);
        ui.update();

        // 3. LEFT: Trigger left navigation to check no further movement past save
        inputManager.isNavigateLeftPressed.mockReturnValue(true);
        ui.update();
        expect((ui as any).selectedButton).toBe('save');
        expect(audioManager.playMenuNavigate).toHaveBeenCalledTimes(4);
    });

    it('debounces right navigation (held = no change)', () => {
        const audioManager = mockDeep<AudioManager>();
        const inputManager = mockDeep<InputManager>();
        const ui = makeSaveManagerUI({ audioManager: audioManager, inputManager: inputManager });
        showSaveManagerUiAndResetDebounce(ui);
        inputManager.isNavigateRightPressed.mockReturnValue(true);

        // Update 3 times to simulate holding the right navigation button
        ui.update();
        ui.update();
        ui.update();

        // Expect the selection to only have changed once, and the audio to have played once
        expect((ui as any).selectedButton).toBe('load');
        expect(audioManager.playMenuNavigate).toHaveBeenCalledOnce();
    });

    it('debounces left navigation (held = no change)', () => {
        const audioManager = mockDeep<AudioManager>();
        const inputManager = mockDeep<InputManager>();
        const ui = makeSaveManagerUI({ audioManager: audioManager, inputManager: inputManager });
        showSaveManagerUiAndResetDebounce(ui);
        inputManager.isNavigateRightPressed.mockReturnValue(true);

        // 1. RIGHT: Trigger first right navigation to move from save -> load
        inputManager.isNavigateRightPressed.mockReturnValue(true);
        ui.update();

        // reset debounce to allow another navigation
        inputManager.isNavigateRightPressed.mockReturnValue(false);
        ui.update();

        // 2. RIGHT:Trigger second right navigation to move from load -> reset
        inputManager.isNavigateRightPressed.mockReturnValue(true);
        ui.update();

        // reset debounce to allow another navigation
        inputManager.isNavigateRightPressed.mockReturnValue(false);
        ui.update();

        // Update 3 times to simulate holding the left navigation button
        inputManager.isNavigateLeftPressed.mockReturnValue(true);
        ui.update();
        ui.update();
        ui.update();

        // Expect the selection to only have changed once, and the audio to have played once
        expect((ui as any).selectedButton).toBe('load');
        expect(audioManager.playMenuNavigate).toHaveBeenCalledTimes(3);
    });
});

// ─── update – select ─────────────────────────────────────────────────────────

describe('update select', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('calls saveCallback when save is selected and select pressed', () => {
        const onSave = vi.fn();
        const audioManager = mockDeep<AudioManager>();
        const inputManager = mockDeep<InputManager>();
        inputManager.isSelectPressed.mockReturnValue(true);
        const ui = makeSaveManagerUI({ audioManager: audioManager, inputManager: inputManager });
        (ui as any).saveCallback = onSave;
        (ui as any).isVisible = true;
        (ui as any).selectedButton = 'save';
        (ui as any).lastSelectState = false;

        ui.update();
        expect(onSave).toHaveBeenCalledOnce();
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
    });

    it('calls resetCallback when reset is selected and select pressed', () => {
        const onReset = vi.fn();
        const audioManager = mockDeep<AudioManager>();
        const inputManager = mockDeep<InputManager>();
        inputManager.isSelectPressed.mockReturnValue(true);
        const ui = makeSaveManagerUI({ audioManager: audioManager, inputManager: inputManager });
        (ui as any).resetCallback = onReset;
        (ui as any).isVisible = true;
        (ui as any).selectedButton = 'reset';
        (ui as any).lastSelectState = false;

        ui.update();
        expect(onReset).toHaveBeenCalledOnce();
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
    });

    it('clicks fileInput when load is selected and select pressed', () => {
        const audioManager = mockDeep<AudioManager>();
        const inputManager = mockDeep<InputManager>();
        inputManager.isSelectPressed.mockReturnValue(true);
        const ui = makeSaveManagerUI({ audioManager: audioManager, inputManager: inputManager });
        (ui as any).isVisible = true;
        (ui as any).selectedButton = 'load';
        (ui as any).lastSelectState = false;
        const clickSpy = vi.spyOn((ui as any).fileInput, 'click');

        ui.update();
        expect(clickSpy).toHaveBeenCalledOnce();
        expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
    });

    it('debounces select (held = no action)', () => {
        const onSave = vi.fn();
        const inputManager = mockDeep<InputManager>();
        inputManager.isSelectPressed.mockReturnValue(true);
        const ui = makeSaveManagerUI({ inputManager: inputManager });
        ui.show('01:00:00', onSave, vi.fn(), vi.fn());
        ui.update();
        expect(onSave).not.toHaveBeenCalled();
    });
});

// ─── update – cancel ─────────────────────────────────────────────────────────

describe('update cancel', () => {
    it('calls hide when cancel is pressed', () => {
        const inputManager = mockDeep<InputManager>();
        const ui = makeSaveManagerUI({ inputManager: inputManager });
        const hideSpy = vi.spyOn(ui, 'hide');
        ui.show('01:00:00', vi.fn(), vi.fn(), vi.fn());

        inputManager.isCancelPressed.mockReturnValue(true);
        ui.update();
        expect(hideSpy).toHaveBeenCalledOnce();
    });

    it('does not call hide when cancel is not pressed', () => {
        const ui = makeSaveManagerUI();
        const hideSpy = vi.spyOn(ui, 'hide');
        ui.show('01:00:00', vi.fn(), vi.fn(), vi.fn());
        ui.update();
        expect(hideSpy).not.toHaveBeenCalled();
    });
});
