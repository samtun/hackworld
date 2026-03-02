import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./InputManager', () => ({
    InputManager: {
        Instance: {
            isNavigateLeftPressed: vi.fn().mockReturnValue(false),
            isNavigateRightPressed: vi.fn().mockReturnValue(false),
            isSelectPressed: vi.fn().mockReturnValue(false),
            isCancelPressed: vi.fn().mockReturnValue(false),
        },
    },
}));
vi.mock('./ui/UiUtils', () => ({
    resetInputDebounce: vi.fn(),
    shakeElement: vi.fn(),
}));
vi.mock('./ui/InputHints', () => ({
    getHint: vi.fn().mockReturnValue(''),
}));
vi.mock('./ui/MenuManager', () => ({
    MenuManager: {
        Instance: {
            createOverlay: vi.fn(() => document.createElement('div')),
            createFlexWindow: vi.fn(() => document.createElement('div')),
            createTitle: vi.fn(() => document.createElement('div')),
            createButton: vi.fn(() => document.createElement('div')),
        },
    },
    MENU_COLORS: { COST_COLOR: '#ffd700' },
    MENU_STYLES: { FONT_FAMILY: 'Arial', Z_INDEX: 1000, Z_INDEX_HINTS: 1100 },
}));
vi.mock('./ui/UIManager', () => ({
    UIManager: {
        Instance: {
            showControlHints: vi.fn(),
            hideControlHints: vi.fn(),
        },
    },
}));

import { SaveManagerUI } from './SaveManagerUI';

function makeSaveManagerUI(overrides: Record<string, unknown> = {}) {
    const ui = Object.create((SaveManagerUI as any).prototype) as any;
    Object.assign(ui, {
        isVisible: false,
        container: Object.assign(document.createElement('div'), { style: { display: 'none' } }),
        saveButton: document.createElement('div'),
        loadButton: document.createElement('div'),
        resetButton: document.createElement('div'),
        fileInput: document.createElement('input'),
        playtimeDisplay: document.createElement('div'),
        saveStatusText: Object.assign(document.createElement('div'), { style: { display: 'none' } }),
        autoCloseTimer: undefined,
        lastSelectState: false,
        lastNavigateLeftState: false,
        lastNavigateRightState: false,
        selectedButton: 'save',
        saveCallback: undefined,
        loadCallback: undefined,
        resetCallback: undefined,
        menuManager: { highlightButton: vi.fn(), unhighlightButton: vi.fn(), createButton: vi.fn(() => document.createElement('div')) },
        uiManager: { showControlHints: vi.fn(), hideControlHints: vi.fn() },
        updateButtonHighlight: vi.fn(),
        ...overrides,
    });
    return ui;
}

function makeInput(overrides: Partial<{
    isNavigateLeftPressed: () => boolean;
    isNavigateRightPressed: () => boolean;
    isSelectPressed: () => boolean;
    isCancelPressed: () => boolean;
}> = {}) {
    return {
        isNavigateLeftPressed: vi.fn().mockReturnValue(false),
        isNavigateRightPressed: vi.fn().mockReturnValue(false),
        isSelectPressed: vi.fn().mockReturnValue(false),
        isCancelPressed: vi.fn().mockReturnValue(false),
        ...overrides,
    };
}

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
        expect(ui.saveCallback).toBe(onSave);
        expect(ui.loadCallback).toBe(onLoad);
        expect(ui.resetCallback).toBe(onReset);
    });

    it('updates playtimeDisplay.textContent with given playtime', () => {
        const ui = makeSaveManagerUI();
        ui.show('02:34:56', vi.fn(), vi.fn(), vi.fn());
        expect(ui.playtimeDisplay.textContent).toBe('Playtime: 02:34:56');
    });

    it('hides saveStatusText', () => {
        const ui = makeSaveManagerUI();
        ui.saveStatusText.style.display = 'block';
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        expect(ui.saveStatusText.style.display).toBe('none');
    });

    it('resets selectedButton to save', () => {
        const ui = makeSaveManagerUI({ selectedButton: 'reset' });
        ui.show('00:00:00', vi.fn(), vi.fn(), vi.fn());
        expect(ui.selectedButton).toBe('save');
    });
});

// ─── hide ────────────────────────────────────────────────────────────────────

describe('hide', () => {
    it('sets isVisible to false', () => {
        const ui = makeSaveManagerUI({ isVisible: true });
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
        const ui = makeSaveManagerUI({
            saveCallback: vi.fn(),
            loadCallback: vi.fn(),
            resetCallback: vi.fn(),
        });
        ui.hide();
        expect(ui.saveCallback).toBeUndefined();
        expect(ui.loadCallback).toBeUndefined();
        expect(ui.resetCallback).toBeUndefined();
    });

    it('calls uiManager.hideControlHints', () => {
        const ui = makeSaveManagerUI();
        ui.hide();
        expect(ui.uiManager.hideControlHints).toHaveBeenCalledOnce();
    });

    it('clears autoCloseTimer if set', () => {
        vi.useFakeTimers();
        const ui = makeSaveManagerUI();
        ui.autoCloseTimer = window.setTimeout(() => {}, 9999);
        ui.hide();
        expect(ui.autoCloseTimer).toBeUndefined();
        vi.useRealTimers();
    });
});

// ─── update – visibility guard ───────────────────────────────────────────────

describe('update visibility guard', () => {
    it('does nothing when isVisible is false', () => {
        const ui = makeSaveManagerUI({ isVisible: false });
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('save'); // unchanged
    });
});

// ─── update – navigation ─────────────────────────────────────────────────────

describe('update navigation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('navigates right from save to load', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'save', lastNavigateRightState: false });
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('load');
    });

    it('navigates right from load to reset', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'load', lastNavigateRightState: false });
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('reset');
    });

    it('cannot navigate right past reset', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'reset', lastNavigateRightState: false });
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('reset');
    });

    it('navigates left from load to save', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'load', lastNavigateLeftState: false });
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('save');
    });

    it('navigates left from reset to load', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'reset', lastNavigateLeftState: false });
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('load');
    });

    it('cannot navigate left past save', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'save', lastNavigateLeftState: false });
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('save');
    });

    it('debounces right navigation (held = no change)', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'save', lastNavigateRightState: true });
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('save');
    });

    it('debounces left navigation (held = no change)', () => {
        const ui = makeSaveManagerUI({ isVisible: true, selectedButton: 'load', lastNavigateLeftState: true });
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(ui.selectedButton).toBe('load');
    });
});

// ─── update – select ─────────────────────────────────────────────────────────

describe('update select', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('calls saveCallback when save is selected and select pressed', () => {
        const onSave = vi.fn();
        const ui = makeSaveManagerUI({
            isVisible: true,
            selectedButton: 'save',
            lastSelectState: false,
            saveCallback: onSave,
        });
        const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(onSave).toHaveBeenCalledOnce();
    });

    it('calls resetCallback when reset is selected and select pressed', () => {
        const onReset = vi.fn();
        const ui = makeSaveManagerUI({
            isVisible: true,
            selectedButton: 'reset',
            lastSelectState: false,
            resetCallback: onReset,
        });
        const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(onReset).toHaveBeenCalledOnce();
    });

    it('clicks fileInput when load is selected and select pressed', () => {
        const fileInput = document.createElement('input');
        const clickSpy = vi.spyOn(fileInput, 'click');
        const ui = makeSaveManagerUI({
            isVisible: true,
            selectedButton: 'load',
            lastSelectState: false,
            fileInput,
        });
        const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(clickSpy).toHaveBeenCalledOnce();
    });

    it('debounces select (held = no action)', () => {
        const onSave = vi.fn();
        const ui = makeSaveManagerUI({
            isVisible: true,
            selectedButton: 'save',
            lastSelectState: true,
            saveCallback: onSave,
        });
        const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(onSave).not.toHaveBeenCalled();
    });
});

// ─── update – cancel ─────────────────────────────────────────────────────────

describe('update cancel', () => {
    it('calls hide when cancel is pressed', () => {
        const ui = makeSaveManagerUI({ isVisible: true });
        const hideSpy = vi.spyOn(ui, 'hide');
        const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
        ui.update(input);
        expect(hideSpy).toHaveBeenCalledOnce();
    });

    it('does not call hide when cancel is not pressed', () => {
        const ui = makeSaveManagerUI({ isVisible: true });
        const hideSpy = vi.spyOn(ui, 'hide');
        const input = makeInput();
        ui.update(input);
        expect(hideSpy).not.toHaveBeenCalled();
    });
});
