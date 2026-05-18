import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../InputManager', () => ({
    InputManager: { Instance: {
        isNavigateUpPressed: vi.fn().mockReturnValue(false),
        isNavigateDownPressed: vi.fn().mockReturnValue(false),
        isSelectPressed: vi.fn().mockReturnValue(false),
        isCancelPressed: vi.fn().mockReturnValue(false),
    }}
}));
vi.mock('../../ui/UiUtils', () => ({
    resetInputDebounce: vi.fn(),
    shakeElement: vi.fn(),
}));
vi.mock('../../ui/InputHints', () => ({
    getHint: vi.fn().mockReturnValue(''),
    HintConfigs: { upgradeClose: 'upgradeClose' },
}));
vi.mock('../../ui/MenuManager', () => ({
    MenuManager: { Instance: {
        createOverlay: vi.fn(() => {
            const d = document.createElement('div');
            d.style.display = 'none';
            return d;
        }),
        createFlexWindow: vi.fn(() => document.createElement('div')),
        createPanel: vi.fn(() => document.createElement('div')),
        createTitle: vi.fn(() => document.createElement('div')),
    }},
    MENU_COLORS: { COST_COLOR: '#ffd700', MAXED_COLOR: '#ff6666', TEXT: '#fff', TRANSPARENT: 'transparent', ITEM_SELECTED: '#888', ITEM_HOVER: '#666', XDATA_COLOR: '#00ffff', PANEL_BG: '#111', BORDER: '#333', SEPARATOR: '#444' },
    MENU_STYLES: { FONT_FAMILY: 'Arial', Z_INDEX: 1000, Z_INDEX_HINTS: 1100, BORDER_RADIUS: '8px', BORDER_WIDTH: '1px' },
}));
vi.mock('../../ui/UIManager', () => ({
    UIManager: { Instance: {
        showControlHints: vi.fn(),
        hideControlHints: vi.fn(),
    }}
}));
vi.mock('../../AudioManager', () => ({
    AudioManager: {
        Instance: {
            playMenuNavigate: vi.fn(),
            playUpgrade: vi.fn(),
            playInsufficient: vi.fn(),
            playUiOpen: vi.fn(),
            playUiClose: vi.fn(),
        },
    },
}));
vi.mock('../../ui/StatIcons', () => ({
    ICON_HP: '<svg>hp</svg>', ICON_TP: '<svg>tp</svg>',
    ICON_STRENGTH: '<svg>strength</svg>', ICON_DEFENSE: '<svg>defense</svg>',
    ICON_AGILITY: '<svg>agility</svg>', ICON_LUCK: '<svg>luck</svg>',
    ICON_BITS: '', ICON_NEXTLVL: '', ICON_XDATA: '', ICON_BOOSTER: '',
    getWeaponIcon: vi.fn().mockReturnValue(''), getSkillTechIcon: vi.fn().mockReturnValue(''),
}));
vi.mock('../../Player', () => ({ Player: class {} }));

import { XDataUpgradeManager } from './XDataUpgradeManager';
import { resetInputDebounce } from '../../ui/UiUtils';
import { AudioManager } from '../../AudioManager';

// jsdom does not implement scrollIntoView
HTMLElement.prototype.scrollIntoView = vi.fn();

function makeManager() {
    const mgr = Object.create((XDataUpgradeManager as any).prototype) as any;

    const container = document.createElement('div');
    container.style.display = 'none';
    const xDataDisplay = document.createElement('div');
    const statList = document.createElement('div');

    Object.assign(mgr, {
        isVisible: false,
        container,
        xDataDisplay,
        statList,
        itemElements: [],
        selectedIndex: 0,
        needsRender: false,
        lastNavigateUpState: false,
        lastNavigateDownState: false,
        lastSelectState: false,
        lastCancelState: false,
        stats: [
            { type: 'strength', label: 'Strength', description: 'Increases weapon damage', upgradeEffect: '+1 per upgrade' },
            { type: 'defense', label: 'Defense', description: 'Reduces damage taken', upgradeEffect: '+1 per upgrade' },
            { type: 'hp', label: 'HP', description: 'Increases max health', upgradeEffect: '+5 per upgrade' },
        ],
        menuManager: { createPanel: vi.fn(() => document.createElement('div')) },
        uiManager: { showControlHints: vi.fn(), hideControlHints: vi.fn() },
    });
    return mgr;
}

function makePlayer(overrides = {}) {
    return {
        xData: 100,
        strengthUpgrades: 0, defenseUpgrades: 0, agilityUpgrades: 0, luckUpgrades: 0,
        hpUpgrades: 0, tpUpgrades: 0,
        maxHp: 170, maxTp: 60,
        getBaseStatValue: vi.fn().mockReturnValue(1),
        getUpgradeCost: vi.fn().mockReturnValue(10),
        upgradeWithXData: vi.fn().mockReturnValue(true),
        ...overrides,
    } as any;
}

describe('XDataUpgradeManager', () => {
    let mgr: any;

    beforeEach(() => {
        mgr = makeManager();
        vi.clearAllMocks();
    });

    // show() tests
    describe('show()', () => {
        it('sets isVisible=true', () => {
            mgr.show();
            expect(mgr.isVisible).toBe(true);
        });

        it('sets container.style.display to flex', () => {
            mgr.show();
            expect(mgr.container.style.display).toBe('flex');
        });

        it('resets selectedIndex to 0', () => {
            mgr.selectedIndex = 2;
            mgr.show();
            expect(mgr.selectedIndex).toBe(0);
        });

        it('sets needsRender=true', () => {
            mgr.show();
            expect(mgr.needsRender).toBe(true);
        });

        it('calls resetInputDebounce', () => {
            mgr.show();
            expect(resetInputDebounce).toHaveBeenCalledWith(mgr);
        });

        it('plays the UI open sound when shown from hidden', () => {
            mgr.show();
            expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
        });
    });

    // hide() tests
    describe('hide()', () => {
        it('sets isVisible=false', () => {
            mgr.isVisible = true;
            mgr.hide();
            expect(mgr.isVisible).toBe(false);
        });

        it('sets container.style.display to none', () => {
            mgr.container.style.display = 'flex';
            mgr.hide();
            expect(mgr.container.style.display).toBe('none');
        });

        it('calls uiManager.hideControlHints', () => {
            mgr.hide();
            expect(mgr.uiManager.hideControlHints).toHaveBeenCalled();
        });

        it('plays the UI close sound when hidden from visible', () => {
            mgr.isVisible = true;
            mgr.hide();
            expect(AudioManager.Instance.playUiClose).toHaveBeenCalledOnce();
        });
    });

    // toggle() tests
    describe('toggle()', () => {
        it('calls hide() when visible', () => {
            mgr.isVisible = true;
            const hideSpy = vi.spyOn(mgr, 'hide');
            mgr.toggle();
            expect(hideSpy).toHaveBeenCalled();
        });

        it('calls show() when not visible', () => {
            mgr.isVisible = false;
            const showSpy = vi.spyOn(mgr, 'show');
            mgr.toggle();
            expect(showSpy).toHaveBeenCalled();
        });

        it('flips isVisible from false to true', () => {
            mgr.isVisible = false;
            mgr.toggle();
            expect(mgr.isVisible).toBe(true);
        });

        it('flips isVisible from true to false', () => {
            mgr.isVisible = true;
            mgr.toggle();
            expect(mgr.isVisible).toBe(false);
        });
    });

    describe('getCurrentUpgradeLevel()', () => {
        it('returns the matching upgrade level for each supported stat type', () => {
            const player = makePlayer({
                strengthUpgrades: 1,
                defenseUpgrades: 2,
                agilityUpgrades: 3,
                luckUpgrades: 4,
                hpUpgrades: 5,
                tpUpgrades: 6,
            });

            expect(mgr.getCurrentUpgradeLevel(player, 'strength')).toBe(1);
            expect(mgr.getCurrentUpgradeLevel(player, 'defense')).toBe(2);
            expect(mgr.getCurrentUpgradeLevel(player, 'agility')).toBe(3);
            expect(mgr.getCurrentUpgradeLevel(player, 'luck')).toBe(4);
            expect(mgr.getCurrentUpgradeLevel(player, 'hp')).toBe(5);
            expect(mgr.getCurrentUpgradeLevel(player, 'tp')).toBe(6);
        });

        it('throws for an unsupported stat type', () => {
            expect(() => mgr.getCurrentUpgradeLevel(makePlayer(), 'invalid')).toThrow('Unsupported stat type: invalid');
        });
    });

    // update() tests
    describe('update()', () => {
        it('returns immediately when not visible, needsRender stays false', () => {
            mgr.isVisible = false;
            mgr.needsRender = false;
            const player = makePlayer();
            mgr.update(player);
            expect(mgr.needsRender).toBe(false);
        });

        it('does not call render when not visible', () => {
            mgr.isVisible = false;
            const player = makePlayer();
            // xDataDisplay.innerText unchanged means render was not called
            mgr.xDataDisplay.innerText = 'untouched';
            mgr.update(player);
            expect(mgr.xDataDisplay.innerText).toBe('untouched');
        });

        it('calls render and updates xDataDisplay when visible and needsRender=true', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            const player = makePlayer({ xData: 42 });
            mgr.update(player);
            expect(mgr.xDataDisplay.innerText).toContain('42');
        });

        it('sets needsRender=false after rendering', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(mgr.needsRender).toBe(false);
        });

        it('calls uiManager.showControlHints when input is provided', () => {
            mgr.isVisible = true;
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(false),
                isNavigateDownPressed: vi.fn().mockReturnValue(false),
                isSelectPressed: vi.fn().mockReturnValue(false),
                isCancelPressed: vi.fn().mockReturnValue(false),
            } as any;
            mgr.update(makePlayer(), input);
            expect(mgr.uiManager.showControlHints).toHaveBeenCalled();
        });

        it('does not call showControlHints when no input is provided', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(mgr.uiManager.showControlHints).not.toHaveBeenCalled();
        });
    });

    // render() via update() - stat list population
    describe('render() via update()', () => {
        it('populates statList with one element per stat', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(mgr.itemElements.length).toBe(mgr.stats.length);
        });

        it('highlights the selected item', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.selectedIndex = 1;
            mgr.update(makePlayer());
            expect(mgr.itemElements[1].style.backgroundColor).toBe('rgb(136, 136, 136)');
        });

        it('shows X-Data amount in xDataDisplay', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer({ xData: 999 }));
            expect(mgr.xDataDisplay.innerText).toContain('999');
        });

        it('shows upgrade cost text for non-maxed stats', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(mgr.statList.innerHTML).toContain('Cost:');
        });
    });

    // Navigation via handleNavigation (through update)
    describe('navigation via update()', () => {
        it('increments selectedIndex on navigateDown press', () => {
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            mgr.lastNavigateDownState = false;
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(false),
                isNavigateDownPressed: vi.fn().mockReturnValue(true),
                isSelectPressed: vi.fn().mockReturnValue(false),
                isCancelPressed: vi.fn().mockReturnValue(false),
            } as any;
            mgr.update(makePlayer(), input);
            expect(mgr.selectedIndex).toBe(1);
            expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('decrements selectedIndex on navigateUp press', () => {
            mgr.isVisible = true;
            mgr.selectedIndex = 2;
            mgr.lastNavigateUpState = false;
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(true),
                isNavigateDownPressed: vi.fn().mockReturnValue(false),
                isSelectPressed: vi.fn().mockReturnValue(false),
                isCancelPressed: vi.fn().mockReturnValue(false),
            } as any;
            mgr.update(makePlayer(), input);
            expect(mgr.selectedIndex).toBe(1);
        });

        it('does not go below index 0 on navigateUp', () => {
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            mgr.lastNavigateUpState = false;
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(true),
                isNavigateDownPressed: vi.fn().mockReturnValue(false),
                isSelectPressed: vi.fn().mockReturnValue(false),
                isCancelPressed: vi.fn().mockReturnValue(false),
            } as any;
            mgr.update(makePlayer(), input);
            expect(mgr.selectedIndex).toBe(0);
        });

        it('hides manager on cancel press', () => {
            mgr.isVisible = true;
            mgr.lastCancelState = false;
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(false),
                isNavigateDownPressed: vi.fn().mockReturnValue(false),
                isSelectPressed: vi.fn().mockReturnValue(false),
                isCancelPressed: vi.fn().mockReturnValue(true),
            } as any;
            mgr.update(makePlayer(), input);
            expect(mgr.isVisible).toBe(false);
        });

        it('calls upgradeWithXData on select press', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.selectedIndex = 0;
            mgr.lastSelectState = false;
            const player = makePlayer();
            // Populate itemElements first by rendering
            mgr.update(player);
            mgr.needsRender = false;
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(false),
                isNavigateDownPressed: vi.fn().mockReturnValue(false),
                isSelectPressed: vi.fn().mockReturnValue(true),
                isCancelPressed: vi.fn().mockReturnValue(false),
            } as any;
            mgr.lastSelectState = false;
            mgr.update(player, input);
            expect(player.upgradeWithXData).toHaveBeenCalledWith(mgr.stats[0].type);
            expect(AudioManager.Instance.playUpgrade).toHaveBeenCalledOnce();
        });

        it('plays the insufficient sound when upgrade fails due to low X-Data', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.selectedIndex = 0;
            const player = makePlayer({
                xData: 5,
                getUpgradeCost: vi.fn().mockReturnValue(10),
                upgradeWithXData: vi.fn().mockReturnValue(false),
            });
            mgr.update(player);
            mgr.needsRender = false;
            mgr.shakeItem = vi.fn();
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(false),
                isNavigateDownPressed: vi.fn().mockReturnValue(false),
                isSelectPressed: vi.fn().mockReturnValue(true),
                isCancelPressed: vi.fn().mockReturnValue(false),
            } as any;
            mgr.lastSelectState = false;
            mgr.update(player, input);
            expect(AudioManager.Instance.playInsufficient).toHaveBeenCalledOnce();
        });
    });
});
