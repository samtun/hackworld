import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../InputManager', () => ({
    InputManager: { Instance: {} }
}));
vi.mock('../ui/MenuManager', () => ({
    MenuManager: {
        Instance: {
            createDialogueOverlay: vi.fn(() => { const d = document.createElement('div'); d.style.display = 'none'; return d; }),
        }
    },
    MENU_COLORS: { NAME_BG: 'rgba(0,0,0,0.7)', NAME_TEXT: '#ffd700', TEXT: '#fff', SEPARATOR: '#BBBBBB' },
    MENU_STYLES: { FONT_FAMILY: 'Arial' },
}));
vi.mock('../ui/UIManager', () => ({
    UIManager: {
        Instance: {
            showControlHints: vi.fn(),
            hideControlHints: vi.fn(),
        }
    }
}));
vi.mock('../ui/InputHints', () => ({
    getHint: vi.fn().mockReturnValue(''),
    getKeyboardHint: vi.fn().mockReturnValue(''),
    HintConfigs: { continueExit: 'continueExit', closeExit: 'closeExit' },
}));
vi.mock('../ui/UiUtils', () => ({
    resetInputDebounce: vi.fn(),
}));

import { NpcDialogueManager } from './NpcDialogueManager';
import { UIManager } from '../ui/UIManager';
import { resetInputDebounce } from '../ui/UiUtils';

function makeDialogueManager(overrides: Record<string, unknown> = {}) {
    const mgr = Object.create((NpcDialogueManager as any).prototype) as any;

    const container = document.createElement('div');
    container.style.display = 'none';

    Object.assign(mgr, {
        isVisible: false,
        container,
        currentNpc: null,
        currentLineIndex: 0,
        nameBox: document.createElement('div'),
        dialogueText: document.createElement('div'),
        lastSelectState: false,
        lastCancelState: false,
        currentInputManager: undefined,
        onDialogueCompleteCallback: undefined,
        menuManager: {},
        uiManager: UIManager.Instance,
        ...overrides,
    });

    (mgr as any).updateDialogue = vi.fn();

    return mgr;
}

function makeNpc(lines = ['Hello!', 'Goodbye!']) {
    return {
        id: 'npc1',
        name: 'TestNpc',
        dialogue: lines,
        markDialogueShown: vi.fn(),
    } as any;
}

function makeInput(overrides: Record<string, unknown> = {}) {
    return {
        isSelectPressed: vi.fn().mockReturnValue(false),
        isCancelPressed: vi.fn().mockReturnValue(false),
        isControllerConnected: vi.fn().mockReturnValue(false),
        isMobile: false,
        ...overrides,
    } as any;
}

describe('NpcDialogueManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('show()', () => {
        it('sets isVisible to true and display to flex', () => {
            const mgr = makeDialogueManager();
            const npc = makeNpc();
            mgr.show(npc);
            expect(mgr.isVisible).toBe(true);
            expect(mgr.container.style.display).toBe('flex');
        });

        it('stores the npc reference', () => {
            const mgr = makeDialogueManager();
            const npc = makeNpc();
            mgr.show(npc);
            expect(mgr.currentNpc).toBe(npc);
        });

        it('resets currentLineIndex to 0', () => {
            const mgr = makeDialogueManager({ currentLineIndex: 3 });
            mgr.show(makeNpc());
            expect(mgr.currentLineIndex).toBe(0);
        });

        it('stores onComplete callback', () => {
            const mgr = makeDialogueManager();
            const cb = vi.fn();
            mgr.show(makeNpc(), cb);
            expect(mgr.onDialogueCompleteCallback).toBe(cb);
        });

        it('calls updateDialogue on show', () => {
            const mgr = makeDialogueManager();
            mgr.show(makeNpc());
            expect(mgr.updateDialogue).toHaveBeenCalled();
        });

        it('calls resetInputDebounce on show', () => {
            const mgr = makeDialogueManager();
            mgr.show(makeNpc());
            expect(resetInputDebounce).toHaveBeenCalledWith(mgr);
        });
    });

    describe('hide()', () => {
        it('sets isVisible to false', () => {
            const mgr = makeDialogueManager({ isVisible: true });
            mgr.hide();
            expect(mgr.isVisible).toBe(false);
        });

        it('sets display to none', () => {
            const mgr = makeDialogueManager({ isVisible: true });
            mgr.container.style.display = 'flex';
            mgr.hide();
            expect(mgr.container.style.display).toBe('none');
        });

        it('clears currentNpc', () => {
            const mgr = makeDialogueManager({ currentNpc: makeNpc() });
            mgr.hide();
            expect(mgr.currentNpc).toBeNull();
        });

        it('resets currentLineIndex to 0', () => {
            const mgr = makeDialogueManager({ currentLineIndex: 2 });
            mgr.hide();
            expect(mgr.currentLineIndex).toBe(0);
        });

        it('clears onDialogueCompleteCallback', () => {
            const mgr = makeDialogueManager({ onDialogueCompleteCallback: vi.fn() });
            mgr.hide();
            expect(mgr.onDialogueCompleteCallback).toBeUndefined();
        });

        it('calls hideControlHints', () => {
            const mgr = makeDialogueManager();
            mgr.hide();
            expect(UIManager.Instance.hideControlHints).toHaveBeenCalled();
        });
    });

    describe('update()', () => {
        it('returns immediately when not visible', () => {
            const mgr = makeDialogueManager({ isVisible: false });
            const input = makeInput();
            mgr.update(input);
            expect(input.isSelectPressed).not.toHaveBeenCalled();
        });

        it('stores currentInputManager even when not visible', () => {
            const mgr = makeDialogueManager({ isVisible: false });
            const input = makeInput();
            mgr.update(input);
            expect(mgr.currentInputManager).toBe(input);
        });

        it('calls hide when cancel is pressed', () => {
            const mgr = makeDialogueManager({ isVisible: true, currentNpc: makeNpc() });
            const hideSpy = vi.spyOn(mgr, 'hide');
            const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(hideSpy).toHaveBeenCalled();
        });

        it('does not call hide on cancel if already pressed last frame (debounce)', () => {
            const mgr = makeDialogueManager({
                isVisible: true,
                currentNpc: makeNpc(),
                lastCancelState: true,
            });
            const hideSpy = vi.spyOn(mgr, 'hide');
            const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(hideSpy).not.toHaveBeenCalled();
        });

        it('advances dialogue when select is pressed and more lines remain', () => {
            const npc = makeNpc(['Line1', 'Line2', 'Line3']);
            const mgr = makeDialogueManager({ isVisible: true, currentNpc: npc, currentLineIndex: 0 });
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(mgr.currentLineIndex).toBe(1);
            expect(mgr.updateDialogue).toHaveBeenCalledWith(input);
        });

        it('does not advance on select if already pressed last frame (debounce)', () => {
            const npc = makeNpc(['Line1', 'Line2']);
            const mgr = makeDialogueManager({
                isVisible: true,
                currentNpc: npc,
                currentLineIndex: 0,
                lastSelectState: true,
            });
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(mgr.currentLineIndex).toBe(0);
        });

        it('calls hide and callback when on last line and select pressed', () => {
            const npc = makeNpc(['OnlyLine']);
            const cb = vi.fn();
            const mgr = makeDialogueManager({
                isVisible: true,
                currentNpc: npc,
                currentLineIndex: 0,
                onDialogueCompleteCallback: cb,
            });
            const hideSpy = vi.spyOn(mgr, 'hide');
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(hideSpy).toHaveBeenCalled();
            expect(npc.markDialogueShown).toHaveBeenCalled();
            expect(cb).toHaveBeenCalled();
        });

        it('calls hide without callback when no callback set on last line', () => {
            const npc = makeNpc(['OnlyLine']);
            const mgr = makeDialogueManager({
                isVisible: true,
                currentNpc: npc,
                currentLineIndex: 0,
                onDialogueCompleteCallback: undefined,
            });
            const hideSpy = vi.spyOn(mgr, 'hide');
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            expect(() => mgr.update(input)).not.toThrow();
            expect(hideSpy).toHaveBeenCalled();
        });

        it('calls callback after hide (not before)', () => {
            const npc = makeNpc(['Line']);
            const callOrder: string[] = [];
            const mgr = makeDialogueManager({
                isVisible: true,
                currentNpc: npc,
                currentLineIndex: 0,
            });
            vi.spyOn(mgr, 'hide').mockImplementation(() => {
                callOrder.push('hide');
                mgr.isVisible = false;
            });
            mgr.onDialogueCompleteCallback = vi.fn(() => callOrder.push('callback'));
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(callOrder).toEqual(['hide', 'callback']);
        });

        it('updates lastSelectState after update', () => {
            const mgr = makeDialogueManager({ isVisible: true, currentNpc: makeNpc() });
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(mgr.lastSelectState).toBe(true);
        });

        it('updates lastCancelState after update', () => {
            const mgr = makeDialogueManager({ isVisible: true, currentNpc: makeNpc() });
            const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            mgr.update(input);
            expect(mgr.lastCancelState).toBe(true);
        });
    });
});
