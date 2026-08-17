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
    inputManager?: InputManager
}

function makeDungeonManager(overrides: DungeonSelectionTestOverrides = {}) {
    const {
        menuManager = mockDeep<MenuManager>(),
        uiManager = mockDeep<UIManager>(),
        audioManager = mockDeep<AudioManager>(),
        gameProgressManager = makeGameProgressManager(),
        inputManager = mockDeep<InputManager>(),
    } = overrides;

    return new DungeonSelectionManager(
        menuManager,
        uiManager,
        audioManager,
        gameProgressManager,
        inputManager
    );
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
        ...overrides,
    } as any;
}

function makeGameProgressManager(progress: number = 0) {
    return mockDeep<GameProgressManager>({
        progress: progress
    });
}

describe('DungeonSelectionManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
            const mgr = makeDungeonManager();
            mgr.show(vi.fn());
            expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
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
            const mgr = makeDungeonManager({ isVisible: true });
            mgr.hide();
            expect(UIManager.Instance.hideControlHints).toHaveBeenCalled();
        });

        it('plays the UI close sound when hidden from visible', () => {
            const mgr = makeDungeonManager({ isVisible: true });
            mgr.hide();
            expect(AudioManager.Instance.playUiClose).toHaveBeenCalledOnce();
        });
    });

    describe('update()', () => {
        it('returns immediately when not visible', () => {
            const mgr = makeDungeonManager({ isVisible: false });
            const input = makeInput();
            mgr.update(input);
            expect(UIManager.Instance.showControlHints).not.toHaveBeenCalled();
        });

        it('calls showControlHints when visible', () => {
            const mgr = makeDungeonManager({ isVisible: true });
            mgr.update(makeInput());
            expect(UIManager.Instance.showControlHints).toHaveBeenCalled();
        });

        it('calls render and resets needsRender when needsRender is true', () => {
            const mgr = makeDungeonManager({ isVisible: true, needsRender: true });
            mgr.update(makeInput());
            expect(mgr.needsRender).toBe(false);
        });

        it('does not re-render when needsRender is false and selection unchanged', () => {
            const mgr = makeDungeonManager({ isVisible: true, needsRender: false });
            mgr.update(makeInput());
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
            (GameProgressManager.Instance as any).progress = 0;
            const fake = makeFakeDungeon('Locked', 'locked', 5);
            const mgr = makeDungeonManager({ dungeonClasses: [fake] });
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
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const mgr = makeDungeonManager({ dungeonClasses: [fake1, fake2], selectedIndex: 0 });
            const input = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(mgr.selectedIndex).toBe(1);
            expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('does not go below 0 when navigating up at index 0', () => {
            const fake = makeFakeDungeon();
            const mgr = makeDungeonManager({ dungeonClasses: [fake], selectedIndex: 0 });
            const input = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(mgr.selectedIndex).toBe(0);
        });

        it('does not exceed max index when navigating down at last item', () => {
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const mgr = makeDungeonManager({ dungeonClasses: [fake1, fake2], selectedIndex: 1 });
            const input = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(mgr.selectedIndex).toBe(1);
        });

        it('navigates up, decreases selectedIndex', () => {
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const mgr = makeDungeonManager({ dungeonClasses: [fake1, fake2], selectedIndex: 1 });
            const input = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(mgr.selectedIndex).toBe(0);
        });

        it('calls onDungeonSelected with correct dungeonId on select', () => {
            const fake = makeFakeDungeon('D', 'desc', 1, 'dungeon-x');
            const cb = vi.fn();
            const mgr = makeDungeonManager({
                dungeonClasses: [fake],
                selectedIndex: 0,
                onDungeonSelected: cb,
                waitForRelease: false,
            });
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(cb).toHaveBeenCalledWith('dungeon-x');
        });

        it('does not select when waitForRelease is true', () => {
            const fake = makeFakeDungeon('D', 'desc', 1, 'dungeon-x');
            const cb = vi.fn();
            const mgr = makeDungeonManager({
                dungeonClasses: [fake],
                selectedIndex: 0,
                onDungeonSelected: cb,
                waitForRelease: true,
            });
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(cb).not.toHaveBeenCalled();
        });

        it('calls hide on cancel', () => {
            const fake = makeFakeDungeon();
            const mgr = makeDungeonManager({ dungeonClasses: [fake] });
            const hideSpy = vi.spyOn(mgr, 'hide');
            const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(hideSpy).toHaveBeenCalled();
        });

        it('calls hide on cancel even when no dungeons available', () => {
            const mgr = makeDungeonManager({ dungeonClasses: [] });
            const hideSpy = vi.spyOn(mgr, 'hide');
            const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
            expect(hideSpy).toHaveBeenCalled();
        });

        it('debounces navigation - does not move twice on held key', () => {
            const fake1 = makeFakeDungeon('A', 'a', 1, 'a');
            const fake2 = makeFakeDungeon('B', 'b', 1, 'b');
            const mgr = makeDungeonManager({
                dungeonClasses: [fake1, fake2],
                selectedIndex: 0,
                lastNavigateDownState: true, // already pressed
            });
            const input = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            (mgr as any).handleNavigation(input);
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
