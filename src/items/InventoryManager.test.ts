import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../InputManager', () => ({
    InputManager: {
        Instance: {
            isNavigateUpPressed: vi.fn().mockReturnValue(false),
            isNavigateDownPressed: vi.fn().mockReturnValue(false),
            isSelectPressed: vi.fn().mockReturnValue(false),
            isCancelPressed: vi.fn().mockReturnValue(false),
        }
    }
}));
vi.mock('../ui/UiUtils', () => ({ shakeElement: vi.fn(), resetInputDebounce: vi.fn() }));
vi.mock('../ui/InputHints', () => ({ getHint: vi.fn().mockReturnValue(''), HintConfigs: { inventoryNavigate: 'inventoryNavigate' } }));
vi.mock('../ui/MenuManager', () => ({
    MenuManager: {
        Instance: {
            createOverlay: vi.fn(() => { const d = document.createElement('div'); d.style.display = 'none'; return d; }),
            createGridWindow: vi.fn(() => document.createElement('div')),
            createPanel: vi.fn(() => document.createElement('div')),
        }
    },
    MENU_COLORS: {
        COST_COLOR: '#ffd700', MAXED_COLOR: '#ff6666', TEXT: '#fff', TRANSPARENT: 'transparent',
        ITEM_SELECTED: '#888', ITEM_HOVER: '#666', PANEL_STATS: '#424242', PANEL_LOOT: '#555',
        PANEL_EQUIPPED: '#90a4ae', PANEL_TRADER: '#4a3520', XDATA_COLOR: '#00ffff',
        NAME_TEXT: '#ffd700', SPECIAL: '#ff69b4', NORMAL: '#aaaaaa', UNCOMMON: '#4ec9ff',
        COLLECTED: '#44ff44', MISSING: '#444444', SEPARATOR: '#666'
    },
    MENU_STYLES: { FONT_FAMILY: 'Arial', Z_INDEX: 1000, Z_INDEX_HINTS: 1100 },
}));
vi.mock('../ui/UIManager', () => ({
    UIManager: { Instance: { showControlHints: vi.fn(), hideControlHints: vi.fn() } }
}));
vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: {
            playUiOpen: vi.fn(),
            playUiClose: vi.fn(),
            playMenuNavigate: vi.fn(),
            playEquip: vi.fn(),
            playInsufficient: vi.fn(),
        }
    }
}));
vi.mock('../ui/StatIcons', () => ({
    ICON_HP: '', ICON_TP: '', ICON_STRENGTH: '', ICON_DEFENSE: '', ICON_AGILITY: '', ICON_LUCK: '',
    ICON_BITS: '', ICON_NEXTLVL: '', ICON_XDATA: '', ICON_BOOSTER: '',
    getWeaponIcon: vi.fn().mockReturnValue(''), getSkillTechIcon: vi.fn().mockReturnValue(''),
}));
vi.mock('./ItemDisplay', () => ({ formatItemLabel: vi.fn((item: any) => item?.name || '') }));
vi.mock('./ItemDetailsPanel', () => ({ ItemDetailsPanel: { generateHTML: vi.fn().mockReturnValue('<div>details</div>') } }));
vi.mock('../Player', () => ({ Player: class { } }));

import { InventoryManager } from './InventoryManager';
import { AudioManager } from '../AudioManager';
import { EquippableItem } from './EquippableItem';
import { WeaponType } from './weapons/WeaponType';
import { SkillTechType } from '../player/skills/SkillType';

// jsdom does not implement scrollIntoView
HTMLElement.prototype.scrollIntoView = vi.fn();

function makeInventoryManager() {
    const mgr = Object.create((InventoryManager as any).prototype) as any;

    const container = document.createElement('div');
    container.style.display = 'none';

    Object.assign(mgr, {
        isVisible: false,
        container,
        statsText: document.createElement('div'),
        lootList: document.createElement('div'),
        lootPanel: document.createElement('div'),
        itemDetailsPanel: document.createElement('div'),
        selectedIndex: 0,
        itemElements: [],
        needsRender: false,
        lastNavigateUpState: false,
        lastNavigateDownState: false,
        lastSelectState: false,
        lastCancelState: false,
        statsScrollPanel: null,
        menuManager: {},
        uiManager: { showControlHints: vi.fn(), hideControlHints: vi.fn() },
    });
    return mgr;
}

function makePlayer(inventory: any[] = [], techOverrides: Partial<Record<WeaponType, number>> = {}, skillTechOverrides: Partial<Record<SkillTechType, number>> = {}) {
    const tech = {
        [WeaponType.SWORD]: 0,
        [WeaponType.DUAL_BLADE]: 0,
        [WeaponType.LANCE]: 0,
        [WeaponType.HAMMER]: 0,
        ...techOverrides,
    };
    const skillTech = {
        [SkillTechType.RECOVERY]: 0,
        [SkillTechType.BLAST]: 0,
        [SkillTechType.RANGED]: 0,
        ...skillTechOverrides,
    };
    return {
        id: 'p1',
        level: 5,
        exp: 100, expRequired: 500,
        hp: 80, maxHp: 100,
        tp: 40, maxTp: 60,
        xData: 50, boosterPacks: 0, bits: 1000,
        strength: 5, defense: 3, agility: 2, luck: 1,
        statPointsAvailable: 0,
        strengthPoints: 0, defensePoints: 0, agilityPoints: 0, luckPoints: 0,
        strengthUpgrades: 0, defenseUpgrades: 0, agilityUpgrades: 0, luckUpgrades: 0,
        hpUpgrades: 0, tpUpgrades: 0,
        tech, skillTech,
        inventory,
        skills: [],
        getWeaponTier: vi.fn(),
        getSkillTier: vi.fn(),
        getBaseStatValue: vi.fn().mockReturnValue(1),
        getCriticalChance: vi.fn().mockReturnValue(0.01),
        weaponDropBonusFactor: 1.0,
        luckDropChanceBonus: 0.01,
        addStatPoint: vi.fn().mockReturnValue(true),
        generateStatsHTML: undefined,
    } as any;
}

function makeEquippableItem(canEquip: boolean) {
    const item = Object.create(EquippableItem.prototype) as EquippableItem & {
        name: string;
        equip: ReturnType<typeof vi.fn>;
        unequip: ReturnType<typeof vi.fn>;
        canEquip: ReturnType<typeof vi.fn>;
    };
    Object.assign(item, {
        name: 'Test Item',
        isEquipped: false,
        equip: vi.fn(),
        unequip: vi.fn(),
        canEquip: vi.fn().mockReturnValue(canEquip),
    });
    return item;
}

describe('InventoryManager', () => {
    let mgr: any;

    beforeEach(() => {
        mgr = makeInventoryManager();
        vi.clearAllMocks();
        // Re-assign fresh uiManager after clearAllMocks
        mgr.uiManager = { showControlHints: vi.fn(), hideControlHints: vi.fn() };
    });

    // toggle() tests
    describe('toggle()', () => {
        it('sets isVisible=true when not visible', () => {
            mgr.toggle();
            expect(mgr.isVisible).toBe(true);
        });

        it('sets container display to flex when opening', () => {
            mgr.toggle();
            expect(mgr.container.style.display).toBe('flex');
        });

        it('plays the shared open sound when opening', () => {
            mgr.toggle();
            expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
        });

        it('resets selectedIndex to 0 when opening', () => {
            mgr.selectedIndex = 3;
            mgr.toggle();
            expect(mgr.selectedIndex).toBe(0);
        });

        it('sets needsRender=true when opening', () => {
            mgr.toggle();
            expect(mgr.needsRender).toBe(true);
        });

        it('sets isVisible=false when visible', () => {
            mgr.isVisible = true;
            mgr.container.style.display = 'flex';
            mgr.toggle();
            expect(mgr.isVisible).toBe(false);
        });

        it('sets container display to none when closing', () => {
            mgr.isVisible = true;
            mgr.container.style.display = 'flex';
            mgr.toggle();
            expect(mgr.container.style.display).toBe('none');
        });

        it('calls hideControlHints when closing', () => {
            mgr.isVisible = true;
            mgr.toggle();
            expect(mgr.uiManager.hideControlHints).toHaveBeenCalled();
        });

        it('plays the shared close sound when closing', () => {
            mgr.isVisible = true;
            mgr.container.style.display = 'flex';
            mgr.toggle();
            expect(AudioManager.Instance.playUiClose).toHaveBeenCalledOnce();
        });
    });

    // update() tests
    describe('update()', () => {
        it('returns immediately when not visible', () => {
            mgr.isVisible = false;
            mgr.needsRender = false;
            const player = makePlayer();
            mgr.update(player);
            expect(mgr.needsRender).toBe(false);
        });

        it('does not modify lootList when not visible', () => {
            mgr.isVisible = false;
            const player = makePlayer([{ name: 'Sword' }]);
            mgr.lootList.innerHTML = 'unchanged';
            mgr.update(player);
            expect(mgr.lootList.innerHTML).toBe('unchanged');
        });

        it('calls render when visible and needsRender=true', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            const player = makePlayer();
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('<div>stats</div>');
            (mgr as any).attachStatButtonListeners = vi.fn();
            mgr.update(player);
            expect((mgr as any).generateStatsHTML).toHaveBeenCalledWith(player);
        });

        it('sets needsRender=false after rendering', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            mgr.update(makePlayer());
            expect(mgr.needsRender).toBe(false);
        });

        it('calls showControlHints when input is provided', () => {
            mgr.isVisible = true;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            const input = {
                isNavigateUpPressed: vi.fn().mockReturnValue(false),
                isNavigateDownPressed: vi.fn().mockReturnValue(false),
                isSelectPressed: vi.fn().mockReturnValue(false),
                isCancelPressed: vi.fn().mockReturnValue(false),
                getRightThumbstickY: vi.fn().mockReturnValue(0),
            } as any;
            mgr.update(makePlayer(), input);
            expect(mgr.uiManager.showControlHints).toHaveBeenCalled();
        });

        it('does not call showControlHints when no input provided', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            mgr.update(makePlayer());
            expect(mgr.uiManager.showControlHints).not.toHaveBeenCalled();
        });
    });

    // render() via update() - loot list
    describe('render() via update()', () => {
        function setupRender(mgrInstance: any) {
            (mgrInstance as any).generateStatsHTML = vi.fn().mockReturnValue('<div>stats</div>');
            (mgrInstance as any).attachStatButtonListeners = vi.fn();
            mgrInstance.isVisible = true;
            mgrInstance.needsRender = true;
        }

        it('populates lootList with one element per inventory item', () => {
            setupRender(mgr);
            const player = makePlayer([{ name: 'Sword' }, { name: 'Shield' }]);
            mgr.update(player);
            expect(mgr.itemElements.length).toBe(2);
        });

        it('renders empty lootList for empty inventory', () => {
            setupRender(mgr);
            mgr.update(makePlayer([]));
            expect(mgr.itemElements.length).toBe(0);
        });

        it('highlights selected item', () => {
            setupRender(mgr);
            mgr.selectedIndex = 1;
            const player = makePlayer([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
            mgr.update(player);
            expect(mgr.itemElements[1].style.backgroundColor).toBe('rgb(136, 136, 136)');
        });

        it('updates statsText via generateStatsHTML', () => {
            setupRender(mgr);
            mgr.update(makePlayer());
            expect((mgr as any).generateStatsHTML).toHaveBeenCalled();
        });

        it('calls attachStatButtonListeners after render', () => {
            setupRender(mgr);
            mgr.update(makePlayer());
            expect((mgr as any).attachStatButtonListeners).toHaveBeenCalled();
        });
    });

    // Navigation tests
    describe('navigation via update()', () => {
        function makeInput(overrides: Partial<{ up: boolean, down: boolean, select: boolean, cancel: boolean }> = {}) {
            return {
                isNavigateUpPressed: vi.fn().mockReturnValue(overrides.up ?? false),
                isNavigateDownPressed: vi.fn().mockReturnValue(overrides.down ?? false),
                isSelectPressed: vi.fn().mockReturnValue(overrides.select ?? false),
                isCancelPressed: vi.fn().mockReturnValue(overrides.cancel ?? false),
                getRightThumbstickY: vi.fn().mockReturnValue(0),
            } as any;
        }

        it('increments selectedIndex on navigateDown press', () => {
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            mgr.lastNavigateDownState = false;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            const player = makePlayer([{ name: 'A' }, { name: 'B' }]);
            mgr.update(player, makeInput({ down: true }));
            expect(mgr.selectedIndex).toBe(1);
        });

        it('plays the shared navigate sound when focus changes', () => {
            mgr.isVisible = true;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            const player = makePlayer([{ name: 'A' }, { name: 'B' }]);
            mgr.update(player, makeInput({ down: true }));
            expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('decrements selectedIndex on navigateUp press', () => {
            mgr.isVisible = true;
            mgr.selectedIndex = 1;
            mgr.lastNavigateUpState = false;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            const player = makePlayer([{ name: 'A' }, { name: 'B' }]);
            mgr.update(player, makeInput({ up: true }));
            expect(mgr.selectedIndex).toBe(0);
        });

        it('does not go below index 0 on navigateUp', () => {
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            mgr.lastNavigateUpState = false;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            mgr.update(makePlayer([{ name: 'A' }]), makeInput({ up: true }));
            expect(mgr.selectedIndex).toBe(0);
        });

        it('closes inventory on cancel press', () => {
            mgr.isVisible = true;
            mgr.lastCancelState = false;
            mgr.update(makePlayer(), makeInput({ cancel: true }));
            expect(mgr.isVisible).toBe(false);
        });

        it('plays the equip sound when equipping a valid item', () => {
            mgr.isVisible = true;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            const item = makeEquippableItem(true);
            const player = makePlayer([item]);
            mgr.update(player, makeInput({ select: true }));
            expect(item.equip).toHaveBeenCalledWith(player);
            expect(AudioManager.Instance.playEquip).toHaveBeenCalledOnce();
        });

        it('plays the failure sound when an item cannot be equipped', () => {
            mgr.isVisible = true;
            (mgr as any).generateStatsHTML = vi.fn().mockReturnValue('');
            (mgr as any).attachStatButtonListeners = vi.fn();
            const item = makeEquippableItem(false);
            const player = makePlayer([item]);
            mgr.update(player, makeInput({ select: true }));
            expect(AudioManager.Instance.playInsufficient).toHaveBeenCalledOnce();
        });
    });

    // generateStatsHTML() tech level display tests
    describe('generateStatsHTML() tech level labels', () => {
        it('shows α for weapon tech at 0 (below β threshold)', () => {
            const player = makePlayer([], { [WeaponType.SWORD]: 0 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('0 | <span style="font-style:italic;color:#BBB;">α</span>');
        });

        it('shows β for weapon tech at 60 (β threshold)', () => {
            const player = makePlayer([], { [WeaponType.SWORD]: 60 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('60 | <span style="font-style:italic;color:#BBB;">β</span>');
        });

        it('shows γ for weapon tech at 280 (γ threshold)', () => {
            const player = makePlayer([], { [WeaponType.DUAL_BLADE]: 280 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('280 | <span style="font-style:italic;color:#BBB;">γ</span>');
        });

        it('shows ω for weapon tech at max level threshold', () => {
            const player = makePlayer([], { [WeaponType.HAMMER]: 4500 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('4500 | <span style="font-style:italic;color:#BBB;">ω</span>');
        });

        it('shows Stable for skill tech below 120', () => {
            const player = makePlayer([], {}, { [SkillTechType.RECOVERY]: 0 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('0 | <span style="font-style:italic;color:#BBB;">Stable</span>');
        });

        it('shows Maintained for skill tech at 121', () => {
            const player = makePlayer([], {}, { [SkillTechType.BLAST]: 61 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('61 | <span style="font-style:italic;color:#BBB;">Maintained</span>');
        });

        it('shows ZeroDay for skill tech at 880', () => {
            const player = makePlayer([], {}, { [SkillTechType.RANGED]: 880 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('880 | <span style="font-style:italic;color:#BBB;">ZeroDay</span>');
        });

        it('shows Leet for skill tech at 1200', () => {
            const player = makePlayer([], {}, { [SkillTechType.RANGED]: 1800 });
            const html = (mgr as any).generateStatsHTML(player);
            expect(html).toContain('1800 | <span style="font-style:italic;color:#BBB;">Leet</span>');
        });
    });
});
