import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NpcDialogueManager } from './NpcDialogueManager';
import { UIManager } from '../ui/UIManager';
import * as UiUtils from '../ui/UiUtils';
import { AudioManager } from '../AudioManager';
import { InputManager } from '../controls/InputManager';
import { MenuManager } from '../ui/MenuManager';
import { mock, mockDeep } from 'vitest-mock-extended';
import { call } from 'three/examples/jsm/nodes/Nodes.js';

interface NpcDialogueManagerTestOverrides {
    menuManager?: MenuManager,
    uiManager?: UIManager,
    audioManager?: AudioManager,
    inputManager?: InputManager,
    currentLineIndex?: number
}

function makeDialogueManager(overrides: NpcDialogueManagerTestOverrides = {}): NpcDialogueManager {
    const {
        menuManager = mockDeep<MenuManager>({
            createDialogueOverlay: vi.fn().mockReturnValue(document.createElement('div')),
        }),
        uiManager = mockDeep<UIManager>(),
        audioManager = mock<AudioManager>(),
        inputManager = mock<InputManager>(),
        currentLineIndex = 0,
    } = overrides;

    const mgr = new NpcDialogueManager(
        menuManager,
        uiManager,
        audioManager,
        inputManager
    );

    (mgr as any).currentLineIndex = currentLineIndex;

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
            expect((mgr as any).onDialogueCompleteCallback).toBe(cb);
        });

        it('calls updateDialogue on show', () => {
            const mgr = makeDialogueManager();
            const updateDialogueSpy = vi.spyOn((mgr as any), 'updateDialogue');
            mgr.show(makeNpc());
            expect(updateDialogueSpy).toHaveBeenCalled();
        });

        it('calls resetInputDebounce on show', () => {
            const debounceSpy = vi.spyOn(UiUtils, 'resetInputDebounce');
            const mgr = makeDialogueManager();
            mgr.show(makeNpc());
            expect(debounceSpy).toHaveBeenCalledWith(mgr);
        });

        it('plays the dialogue tick when a line is shown', () => {
            const uiManager = mock<UIManager>();
            const audioManager = mock<AudioManager>();
            const mgr = makeDialogueManager({ uiManager: uiManager, audioManager: audioManager });

            mgr.show(makeNpc(['Hello']));
            (mgr as any).updateDialogue();

            expect(audioManager.playDialogueTick).toHaveBeenCalled();
        });
    });

    describe('hide()', () => {
        it('sets isVisible to false', () => {
            const mgr = makeDialogueManager();
            mgr.show(makeNpc());
            mgr.hide();
            expect(mgr.isVisible).toBe(false);
        });

        it('sets display to none', () => {
            const mgr = makeDialogueManager();
            mgr.show(makeNpc());
            mgr.container.style.display = 'flex';
            mgr.hide();
            expect(mgr.container.style.display).toBe('none');
        });

        it('clears currentNpc', () => {
            const mgr = makeDialogueManager();
            mgr.show(makeNpc());
            mgr.hide();
            expect(mgr.currentNpc).toBeNull();
        });

        it('resets currentLineIndex to 0', () => {
            const mgr = makeDialogueManager({ currentLineIndex: 2 });
            mgr.hide();
            expect(mgr.currentLineIndex).toBe(0);
        });

        it('clears onDialogueCompleteCallback', () => {
            const mgr = makeDialogueManager();
            mgr.show(makeNpc(), vi.fn())
            mgr.hide();
            expect((mgr as any).onDialogueCompleteCallback).toBeUndefined();
        });

        it('calls hideControlHints', () => {
            const uiManager = mock<UIManager>();
            const mgr = makeDialogueManager({ uiManager: uiManager });
            mgr.hide();
            expect(uiManager.hideControlHints).toHaveBeenCalled();
        });
    });

    describe('update()', () => {
        function showAndDebounce(mgr: NpcDialogueManager, npc?: any, callback?: () => {}) {
            mgr.show(npc ?? makeNpc(), callback);
            mgr.update();
        }

        it('returns immediately when not visible', () => {
            const inputManager = mock<InputManager>();
            const mgr = makeDialogueManager({ inputManager: inputManager });
            mgr.update();
            expect(inputManager.isSelectPressed).not.toHaveBeenCalled();
        });

        it('calls hide when cancel is pressed', () => {
            const inputManager = mock<InputManager>();
            const mgr = makeDialogueManager({ inputManager: inputManager });
            const hideSpy = vi.spyOn(mgr, 'hide');
            showAndDebounce(mgr);
            inputManager.isCancelPressed.mockReturnValue(true);
            mgr.update();
            expect(hideSpy).toHaveBeenCalled();
        });

        it('does not call hide on cancel if already pressed last frame (debounce)', () => {
            const inputManager = mock<InputManager>();
            inputManager.isCancelPressed.mockReturnValue(true);
            const mgr = makeDialogueManager({ inputManager: inputManager });
            const hideSpy = vi.spyOn(mgr, 'hide');
            mgr.show(makeNpc());
            mgr.update();
            expect(hideSpy).not.toHaveBeenCalled();
        });

        it('advances dialogue when select is pressed and more lines remain', () => {
            const npc = makeNpc(['Line1', 'Line2', 'Line3']);
            const inputManager = mock<InputManager>();
            inputManager.isSelectPressed.mockReturnValue(false);
            const mgr = makeDialogueManager({ inputManager: inputManager });
            const updateDialogueSpy = vi.spyOn((mgr as any), 'updateDialogue');
            showAndDebounce(mgr, npc);

            expect((mgr as any).lastSelectState).toBe(false);
            inputManager.isSelectPressed.mockReturnValue(true);
            mgr.update();
            expect(mgr.currentLineIndex).toBe(1);
            expect(updateDialogueSpy).toHaveBeenCalled();
            expect((mgr as any).lastSelectState).toBe(true);
        });

        it('does not advance on select if already pressed last frame (debounce)', () => {
            const npc = makeNpc(['Line1', 'Line2']);
            const inputManager = mock<InputManager>();
            const mgr = makeDialogueManager({});

            showAndDebounce(mgr, npc);

            inputManager.isSelectPressed.mockReturnValue(true);
            mgr.update();
            expect(mgr.currentLineIndex).toBe(0);
        });

        it('calls hide and callback when on last line and select pressed', () => {
            const npc = makeNpc(['OnlyLine']);
            const inputManager = mock<InputManager>();
            const cb = vi.fn();
            const mgr = makeDialogueManager({ inputManager: inputManager });
            const hideSpy = vi.spyOn(mgr, 'hide');
            showAndDebounce(mgr, npc, cb);

            inputManager.isSelectPressed.mockReturnValue(true);
            mgr.update();
            expect(hideSpy).toHaveBeenCalled();
            expect(npc.markDialogueShown).toHaveBeenCalled();
            expect(cb).toHaveBeenCalled();
        });

        it('calls hide without callback when no callback set on last line', () => {
            const npc = makeNpc(['OnlyLine']);
            const inputManager = mock<InputManager>();
            const mgr = makeDialogueManager({ inputManager: inputManager });
            const hideSpy = vi.spyOn(mgr, 'hide');
            showAndDebounce(mgr, npc);

            inputManager.isSelectPressed.mockReturnValue(true);
            mgr.update();
            expect(() => mgr.update()).not.toThrow();
            expect(hideSpy).toHaveBeenCalled();
        });

        it('calls callback after hide (not before)', () => {
            const npc = makeNpc(['Line']);
            const callOrder: string[] = [];
            const cb = () => callOrder.push('callback');
            const inputManager = mock<InputManager>();
            const mgr = makeDialogueManager({ inputManager: inputManager });
            vi.spyOn(mgr, 'hide').mockImplementation(() => {
                callOrder.push('hide');
                mgr.isVisible = false;
            });
            showAndDebounce(mgr, npc, cb);
            inputManager.isSelectPressed.mockReturnValue(true);
            mgr.update();
            expect(callOrder).toEqual(['hide', 'callback']);
        });

        it('updates lastCancelState after update', () => {
            const inputManager = mock<InputManager>();
            inputManager.isCancelPressed.mockReturnValue(false);
            const mgr = makeDialogueManager({ inputManager: inputManager });
            showAndDebounce(mgr);
            expect((mgr as any).lastCancelState).toBe(false);

            inputManager.isCancelPressed.mockReturnValue(true);
            mgr.update();
            expect((mgr as any).lastCancelState).toBe(true);
        });
    });
});
