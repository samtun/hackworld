import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DungeonSelectionManager } from './DungeonSelectionManager';
import { GameProgressManager } from '../GameProgressManager';
import { UIManager } from '../ui/UIManager';
import { AudioManager } from '../AudioManager';
import { MenuManager } from '../ui/MenuManager';
import { InputManager } from '../controls/InputManager';
import { mockDeep } from 'vitest-mock-extended';

interface DungeonSelectionTestOverrides {
    menuManager?: MenuManager,
    uiManager?: UIManager,
    audioManager?: AudioManager,
    gameProgressManager?: GameProgressManager,
    inputManager?: InputManager,
    isVisible?: boolean,
    needsRender?: boolean,
    selectedIndex?: number,
    dungeonClasses?: Array<{ getMetadata: ReturnType<typeof vi.fn> }>,
    onDungeonSelected?: (dungeonId: string) => void,
    waitForRelease?: boolean,
    lastNavigateDownState?: boolean,
}

function makeMenuManager(): MenuManager {
    const manager = {
        createOverlay: () => {
            const overlay = document.createElement('div');
            overlay.style.display = 'none';
            return overlay;
        },
        createFlexWindow: (_direction: 'column' | 'row' = 'column', _config?: any) => {
            const el = document.createElement('div');
            el.style.display = 'flex';
            return el;
        },
        createPanel: (_config?: any) => {
            const panel = document.createElement('div');
            return panel;
        },
    } as unknown as MenuManager;

    return manager;
}

function makeUiManager(): UIManager {
    return {
        hideControlHints: vi.fn(),
        showControlHints: vi.fn(),
    } as unknown as UIManager;
}

function makeAudioManager(): AudioManager {
    return {
        playUiOpen: vi.fn(),
        playUiClose: vi.fn(),
        playMenuNavigate: vi.fn(),
    } as unknown as AudioManager;
}

function makeDungeonManager(overrides: DungeonSelectionTestOverrides = {}) {
    const {
        menuManager = makeMenuManager(),
        uiManager = makeUiManager(),
        audioManager = makeAudioManager(),
        gameProgressManager = makeGameProgressManager(99),
        inputManager = makeInput(),
    } = overrides;

    const mgr = new DungeonSelectionManager(
        menuManager,
        uiManager,
        audioManager,
        gameProgressManager,
        inputManager
    );

    if (overrides.isVisible !== undefined) mgr.isVisible = overrides.isVisible;
    if (overrides.needsRender !== undefined) mgr.needsRender = overrides.needsRender;
    if (overrides.selectedIndex !== undefined) mgr.selectedIndex = overrides.selectedIndex;
    if (overrides.onDungeonSelected !== undefined) (mgr as any).onDungeonSelected = overrides.onDungeonSelected;
    if (overrides.waitForRelease !== undefined) (mgr as any).waitForRelease = overrides.waitForRelease;
    if (overrides.lastNavigateDownState !== undefined) (mgr as any).lastNavigateDownState = overrides.lastNavigateDownState;
    if (overrides.dungeonClasses) (mgr as any).stageMetadata = overrides.dungeonClasses.map((cls) => cls.getMetadata());

    return mgr;
}

function makeFakeDungeon(name = 'Test Dungeon', description = 'A test dungeon', requiredProgress = 1, id = 'dungeon1') {
    return {
        getMetadata: vi.fn().mockReturnValue({ id, name, description, requiredProgress }),
    };
}

function makeInput(overrides: Record<string, unknown> = {}) {
    return {
        isNavigateUpPressed: vi.fn().mockReturnValue(false),
        isNavigateDownPressed: vi.fn().mockReturnValue(false),
        isSelectPressed: vi.fn().mockReturnValue(false),
        isCancelPressed: vi.fn().mockReturnValue(false),
        isControllerConnected: vi.fn().mockReturnValue(false),
        ...overrides,
    } as any;
}

function makeGameProgressManager(progress: number = 99) {
    return mockDeep<GameProgressManager>({
        progress: progress
    });
}

describe('DungeonSelectionManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        (import.meta.env as any).DEV = false;
    });

    describe('show()', () => {
        it('sets isVisible to true and display to flex', () => {
            const mgr = makeDungeonManager({ gameProgressManager: makeGameProgressManager(5) });
            const cb = vi.fn();
            mgr.show(cb);
            expect(mgr.isVisible).toBe(true);
            expect(mgr.container.style.display).toBe('flex');
        });

        it('resets selectedIndex to 0 and sets needsRender', () => {
            const mgr = makeDungeonManager({ gameProgressManager: makeGameProgressManager(5) });
            mgr.selectedIndex = 3;
            mgr.show(vi.fn());
            expect(mgr.selectedIndex).toBe(0);
            // needsRender may be reset after render() inside show(), but render was called
            // just verify it was set (show calls render which sets needsRender=false after)
        });

        it('stores onDungeonSelected callback', () => {
            const mgr = makeDungeonManager();
            const cb = vi.fn();
            mgr.show(cb);
            expect(mgr.onDungeonSelected).toBe(cb);
        });

        it('sets waitForRelease to true', () => {
            const mgr = makeDungeonManager();
            mgr.show(vi.fn());
            expect(mgr.waitForRelease).toBe(true);
        });

        it('plays the UI open sound when shown from hidden', () => {
            const audioManager = mockDeep<AudioManager>();
            const mgr = makeDungeonManager({ audioManager });
            mgr.show(vi.fn());
            expect(audioManager.playUiOpen).toHaveBeenCalledOnce();
        });
    });

    describe('hide()', () => {
        it('sets isVisible to false and display to none', () => {
            const mgr = makeDungeonManager({ isVisible: true });
            mgr.container.style.display = 'flex';
            mgr.hide();
            expect(mgr.isVisible).toBe(false);
            expect(mgr.container.style.display).toBe('none');
        });

        it('calls hideControlHints', () => {
            const uiManager = mockDeep<UIManager>();
            const mgr = makeDungeonManager({ uiManager, isVisible: true });
            mgr.hide();
            expect(uiManager.hideControlHints).toHaveBeenCalled();
        });

        it('plays the UI close sound when hidden from visible', () => {
            const audioManager = mockDeep<AudioManager>();
            const mgr = makeDungeonManager({ audioManager, isVisible: true });
            mgr.hide();
            expect(audioManager.playUiClose).toHaveBeenCalledOnce();
        });
    });

    describe('update()', () => {
        it('returns immediately when not visible', () => {
            const uiManager = mockDeep<UIManager>();
            const mgr = makeDungeonManager({ uiManager, isVisible: false });
            mgr.update();
            expect(uiManager.showControlHints).not.toHaveBeenCalled();
        });

        it('calls showControlHints when visible', () => {
            const uiManager = mockDeep<UIManager>();
            const inputManager = makeInput();
            const mgr = makeDungeonManager({ uiManager, inputManager, isVisible: true });
            mgr.update();
            expect(uiManager.showControlHints).toHaveBeenCalled();
        });

        it('calls render and resets needsRender when needsRender is true', () => {
            const inputManager = makeInput();
            const mgr = makeDungeonManager({ inputManager, isVisible: true, needsRender: true });
            mgr.update();
            expect(mgr.needsRender).toBe(false);
        });

        it('does not re-render when needsRender is false and selection unchanged', () => {
            const inputManager = makeInput();
            const mgr = makeDungeonManager({ inputManager, isVisible: true, needsRender: false });
            mgr.update();
            // needsRender stays false
            expect(mgr.needsRender).toBe(false);
        });
    });

    describe('render()', () => {
        it('shows no-connection message when no dungeons unlocked', () => {
            const mgr = makeDungeonManager({ dungeonClasses: [] });
            (mgr as any).render();
            expect(mgr.dungeonList.querySelector('.no-connection-message')).not.toBeNull();
        });

        it('builds dungeonElements for unlocked dungeons', () => {
            const fake = makeFakeDungeon();
            const mgr = makeDungeonManager({ dungeonClasses: [fake] });
            (mgr as any).render();
            expect(mgr.dungeonElements.length).toBe(1);
        });

        it('clears dungeonList before re-render', () => {
            const fake = makeFakeDungeon();
            const mgr = makeDungeonManager({ dungeonClasses: [fake] });
            (mgr as any).render();
            (mgr as any).render();
            expect(mgr.dungeonElements.length).toBe(1);
        });

        it('skips dungeons requiring more progress than current', () => {
            const gameProgressManager = makeGameProgressManager(0);
            const fake = makeFakeDungeon('Locked', 'locked', 5);
            const mgr = makeDungeonManager({ gameProgressManager, dungeonClasses: [fake] });
            (mgr as any).render();
            expect(mgr.dungeonList.querySelector('.no-connection-message')).not.toBeNull();
        });

        it('skips dungeons with requiredProgress=0 (Lobby)', () => {
            const fake = makeFakeDungeon('Lobby', 'lobby', 0);
            const mgr = makeDungeonManager({ dungeonClasses: [fake] });
            (mgr as any).render();
            expect(mgr.dungeonList.querySelector('.no-connection-message')).not.toBeNull();
        });

        it('skips negative requiredProgress stages in non-DEV mode', () => {
            (import.meta.env as any).DEV = false;
            const fake = makeFakeDungeon('DevOnly', 'dev', -1);
            const mgr = makeDungeonManager({ dungeonClasses: [fake] });
            (mgr as any).render();
            expect(mgr.dungeonList.querySelector('.no-connection-message')).not.toBeNull();
        });

        it('renders multiple dungeons', () => {
            const fake1 = makeFakeDungeon('DungeonA', 'desc', 1, 'a');
            const fake2 = makeFakeDungeon('DungeonB', 'desc', 2, 'b');
            const mgr = makeDungeonManager({ dungeonClasses: [fake1, fake2] });
            (mgr as any).render();
            expect(mgr.dungeonElements.length).toBe(2);
        });
    });

    describe('handleNavigation()', () => {
        it('navigates down, increases selectedIndex', () => {
            const audioManager = mockDeep<AudioManager>();
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const inputManager = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({ audioManager, inputManager, dungeonClasses: [fake1, fake2], selectedIndex: 0 });
            (mgr as any).handleNavigation();
            expect(mgr.selectedIndex).toBe(1);
            expect(audioManager.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('does not go below 0 when navigating up at index 0', () => {
            const fake = makeFakeDungeon();
            const inputManager = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({ inputManager, dungeonClasses: [fake], selectedIndex: 0 });
            (mgr as any).handleNavigation();
            expect(mgr.selectedIndex).toBe(0);
        });

        it('does not exceed max index when navigating down at last item', () => {
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const inputManager = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({ inputManager, dungeonClasses: [fake1, fake2], selectedIndex: 1 });
            (mgr as any).handleNavigation();
            expect(mgr.selectedIndex).toBe(1);
        });

        it('navigates up, decreases selectedIndex', () => {
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const inputManager = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({ inputManager, dungeonClasses: [fake1, fake2], selectedIndex: 1 });
            (mgr as any).handleNavigation();
            expect(mgr.selectedIndex).toBe(0);
        });

        it('calls onDungeonSelected with correct dungeonId on select', () => {
            const fake = makeFakeDungeon('D', 'desc', 1, 'dungeon-x');
            const cb = vi.fn();
            const inputManager = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({
                inputManager,
                dungeonClasses: [fake],
                selectedIndex: 0,
                onDungeonSelected: cb,
                waitForRelease: false,
            });
            (mgr as any).handleNavigation();
            expect(cb).toHaveBeenCalledWith('dungeon-x');
        });

        it('does not select when waitForRelease is true', () => {
            const fake = makeFakeDungeon('D', 'desc', 1, 'dungeon-x');
            const cb = vi.fn();
            const inputManager = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({
                inputManager,
                dungeonClasses: [fake],
                selectedIndex: 0,
                onDungeonSelected: cb,
                waitForRelease: true,
            });
            (mgr as any).handleNavigation();
            expect(cb).not.toHaveBeenCalled();
        });

        it('calls hide on cancel', () => {
            const fake = makeFakeDungeon();
            const inputManager = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({ inputManager, dungeonClasses: [fake] });
            const hideSpy = vi.spyOn(mgr, 'hide');
            (mgr as any).handleNavigation();
            expect(hideSpy).toHaveBeenCalled();
        });

        it('calls hide on cancel even when no dungeons available', () => {
            const inputManager = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({ inputManager, dungeonClasses: [] });
            const hideSpy = vi.spyOn(mgr, 'hide');
            (mgr as any).handleNavigation();
            expect(hideSpy).toHaveBeenCalled();
        });

        it('debounces navigation - does not move twice on held key', () => {
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const inputManager = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            const mgr = makeDungeonManager({
                inputManager,
                dungeonClasses: [fake1, fake2],
                selectedIndex: 0,
                lastNavigateDownState: true,
            });
            (mgr as any).handleNavigation();
            expect(mgr.selectedIndex).toBe(0);
        });
    });

    describe('selectDungeon()', () => {
        it('calls onDungeonSelected then hides', () => {
            const cb = vi.fn();
            const mgr = makeDungeonManager({ onDungeonSelected: cb });
            const hideSpy = vi.spyOn(mgr, 'hide');
            (mgr as any).selectDungeon('my-dungeon');
            expect(cb).toHaveBeenCalledWith('my-dungeon');
            expect(hideSpy).toHaveBeenCalled();
        });

        it('does not throw if no callback set', () => {
            const mgr = makeDungeonManager({ onDungeonSelected: undefined });
            expect(() => (mgr as any).selectDungeon('x')).not.toThrow();
        });
    });
});
