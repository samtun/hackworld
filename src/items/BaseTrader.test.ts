import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../ui/InputHints', () => ({
    getHint: vi.fn().mockReturnValue(''),
    HintConfigs: { buySellClose: {} },
}));
vi.mock('../ui/UiUtils', () => ({
    resetInputDebounce: vi.fn(),
    shakeElement: vi.fn(),
}));
vi.mock('../ui/MenuManager', () => ({
    MenuManager: {
        Instance: {
            createOverlay: vi.fn(() => document.createElement('div')),
            createGridWindow: vi.fn(() => document.createElement('div')),
            createPanel: vi.fn(() => document.createElement('div')),
        },
    },
    MENU_COLORS: {
        PANEL_TRADER: '#000', PANEL_PLAYER: '#000', COST_COLOR: '#ffd700',
        TEXT: '#fff', SEPARATOR: '#333', WINDOW_BG: '#111',
        ITEM_SELECTED: '#444', TRANSPARENT: 'transparent',
    },
    MENU_STYLES: { FONT_FAMILY: 'Arial', Z_INDEX: 1000 },
}));
vi.mock('../ui/UIManager', () => ({
    UIManager: { Instance: { showControlHints: vi.fn(), hideControlHints: vi.fn() } },
}));
vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: {
            playMenuNavigate: vi.fn(),
            playBuy: vi.fn(),
            playSell: vi.fn(),
            playInsufficient: vi.fn(),
            playUiOpen: vi.fn(),
            playUiClose: vi.fn(),
        },
    },
}));
vi.mock('./ItemDetailsPanel', () => ({
    ItemDetailsPanel: { generateHTML: vi.fn().mockReturnValue('<div>details</div>') },
}));
vi.mock('./ItemDisplay', () => ({
    formatItemLabel: vi.fn((item: any) => item?.name || 'item'),
}));

import { BaseTrader } from './BaseTrader';
import { Item } from './Item';
import { EquippableItem } from './EquippableItem';
import { TraderPanel } from './TraderPanel';
import { AudioManager } from '../AudioManager';

// Every suite in this file shares the same singleton-style mocks, so reset
// them for each test case before assertions run.
beforeEach(() => {
    vi.clearAllMocks();
});

// ─── Minimal concrete Trader for testing (no DOM createUI) ─────────────────

class TestTrader extends BaseTrader {
    protected initializeTraderInventory(): void {
        // Populated by tests directly
    }
}

/**
 * Build a TestTrader via Object.create, bypassing the constructor to avoid DOM
 * creation in the node test environment.
 */
function makeTrader(): TestTrader {
    const trader = Object.create(TestTrader.prototype) as TestTrader;
    Object.assign(trader, {
        isVisible: true,
        selectedIndex: 0,
        activePanel: TraderPanel.TRADER,
        needsRender: false,
        traderInventory: [] as Item[],
        itemElements: [],
        traderSelectedIndex: 0,
        playerSelectedIndex: 0,
        lastNavigateUpState: false,
        lastNavigateDownState: false,
        lastNavigateLeftState: false,
        lastNavigateRightState: false,
        lastSelectState: false,
        // Minimal UI stubs so render() / shakeItem() don't throw
        container: {},
        traderList: { innerHTML: '' },
        playerList: { innerHTML: '' },
        playerMoneyText: { innerText: '' },
        itemDetailsPanel: { innerHTML: '' },
        traderPanel: {},
        playerPanel: {},
        // Stub manager singletons used by BaseTrader.render / BaseTrader.hide
        menuManager: {},
        uiManager: { hideControlHints: vi.fn(), showControlHints: vi.fn() },
    });
    return trader;
}

/** Minimal player stub */
function makePlayer(overrides: Record<string, unknown> = {}) {
    return {
        bits: 500,
        inventory: [] as Item[],
        ...overrides,
    } as any;
}

/** A simple sellable Item for testing */
function makeSellableItem(id: string, buyPrice: number, sellPrice: number): Item {
    return {
        id,
        name: `Item_${id}`,
        buyPrice,
        sellPrice,
        clone: vi.fn(function (this: any) {
            return { ...this, id: `${id}_clone`, clone: this.clone };
        }),
    } as any;
}

/** An equippable item (e.g. weapon) for testing */
function makeEquippableItem(id: string, buyPrice: number, sellPrice: number, equipped = false): EquippableItem {
    const item = Object.create(EquippableItem.prototype) as EquippableItem;
    Object.assign(item, {
        id,
        name: `Equip_${id}`,
        baseBuyPrice: buyPrice,
        baseSellPrice: sellPrice,
        isEquipped: equipped,
        clone: vi.fn(function (this: any) {
            const c = Object.create(EquippableItem.prototype);
            Object.assign(c, { ...this, id: `${id}_clone` });
            c.isEquipped = false;
            return c;
        }),
    });
    return item;
}

// ─── handleTransaction – buy ──────────────────────────────────────────────────

describe('BaseTrader – buy transaction', () => {
    let trader: TestTrader;
    let player: ReturnType<typeof makePlayer>;

    beforeEach(() => {
        trader = makeTrader();
        player = makePlayer({ bits: 200, inventory: [] as Item[] });
    });

    it('deducts item cost from player bits', () => {
        const item = makeSellableItem('i1', 100, 50);
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(100);
    });

    it('adds a clone of the item to player inventory', () => {
        const item = makeSellableItem('i1', 100, 50);
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.inventory.length).toBe(1);
    });

    it('removes the item from trader inventory after purchase', () => {
        const item = makeSellableItem('i1', 100, 50);
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        expect(trader.traderInventory.length).toBe(0);
    });

    it('does not sell if player lacks funds', () => {
        const item = makeSellableItem('i1', 300, 150);
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(200); // unchanged
        expect(player.inventory.length).toBe(0);
        expect(trader.traderInventory.length).toBe(1);
        expect(AudioManager.Instance.playInsufficient).toHaveBeenCalledOnce();
    });

    it('marks bought equippable item as not equipped', () => {
        const item = makeEquippableItem('e1', 100, 50, true); // equipped at trader
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        const bought = player.inventory[0];
        expect((bought as EquippableItem).isEquipped).toBe(false);
    });

    it('adjusts selectedIndex when last item is bought', () => {
        const items = [makeSellableItem('a', 50, 25), makeSellableItem('b', 50, 25)];
        trader.traderInventory = items;
        trader.selectedIndex = 1; // pointing to last item

        (trader as any).handleTransaction(player);

        expect(trader.selectedIndex).toBe(0); // clamped down
    });

    it('plays the buy sound after a successful purchase', () => {
        const item = makeSellableItem('i1', 100, 50);
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        expect(AudioManager.Instance.playBuy).toHaveBeenCalledOnce();
    });
});

// ─── handleTransaction – sell ─────────────────────────────────────────────────

describe('BaseTrader – sell transaction', () => {
    let trader: TestTrader;
    let player: ReturnType<typeof makePlayer>;

    beforeEach(() => {
        trader = makeTrader();
        trader.activePanel = TraderPanel.PLAYER;
        player = makePlayer({ bits: 100, inventory: [] as Item[] });
    });

    it('credits player bits with sell price', () => {
        const item = makeSellableItem('s1', 100, 40);
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(140);
    });

    it('removes the item from player inventory', () => {
        const item = makeSellableItem('s1', 100, 40);
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.inventory.length).toBe(0);
    });

    it('adds a clone of the sold item to trader inventory', () => {
        const item = makeSellableItem('s1', 100, 40);
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(trader.traderInventory.length).toBe(1);
    });

    it('does not sell an equipped item', () => {
        const item = makeEquippableItem('e2', 200, 80, true); // equipped
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(100); // unchanged
        expect(player.inventory.length).toBe(1);
    });

    it('can sell an un-equipped equippable item', () => {
        const item = makeEquippableItem('e3', 200, 80, false); // not equipped
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(180);
        expect(player.inventory.length).toBe(0);
    });

    it('plays the sell sound after a successful sale', () => {
        const item = makeSellableItem('s1', 100, 40);
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(AudioManager.Instance.playSell).toHaveBeenCalledOnce();
    });
});

// ─── traderInventory population ───────────────────────────────────────────────

describe('BaseTrader – trader inventory', () => {
    it('starts with the items provided to the trader', () => {
        const trader = makeTrader();
        trader.traderInventory = [
            makeSellableItem('t1', 100, 50),
            makeSellableItem('t2', 200, 100),
        ];
        expect(trader.traderInventory.length).toBe(2);
    });

    it('shows all trader items for the player to browse', () => {
        const trader = makeTrader();
        trader.traderInventory = [
            makeSellableItem('t1', 100, 50),
            makeSellableItem('t2', 200, 100),
            makeSellableItem('t3', 300, 150),
        ];
        expect(trader.traderInventory.map(i => i.name)).toContain('Item_t1');
        expect(trader.traderInventory.map(i => i.name)).toContain('Item_t3');
    });
});

// ─── show / hide / toggle ──────────────────────────────────────────────────────

/**
 * Build a TestTrader with a container that has a proper style object
 * so show() and hide() don't throw.
 */
function makeTraderWithDOM(): TestTrader {
    const trader = makeTrader();
    (trader as any).container = { style: { display: 'none' } };
    return trader;
}

describe('BaseTrader.show', () => {
    it('sets isVisible to true', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = false;
        (trader as any).show();
        expect(trader.isVisible).toBe(true);
    });

    it('sets container.style.display to "flex"', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = false;
        (trader as any).show();
        expect((trader as any).container.style.display).toBe('flex');
    });

    it('resets selectedIndex to 0', () => {
        const trader = makeTraderWithDOM();
        trader.selectedIndex = 3;
        (trader as any).show();
        expect(trader.selectedIndex).toBe(0);
    });

    it('resets activePanel to TRADER', () => {
        const trader = makeTraderWithDOM();
        trader.activePanel = TraderPanel.PLAYER;
        (trader as any).show();
        expect(trader.activePanel).toBe(TraderPanel.TRADER);
    });

    it('marks needsRender as true', () => {
        const trader = makeTraderWithDOM();
        trader.needsRender = false;
        (trader as any).show();
        expect(trader.needsRender).toBe(true);
    });

    it('resets traderSelectedIndex and playerSelectedIndex to 0', () => {
        const trader = makeTraderWithDOM();
        (trader as any).traderSelectedIndex = 5;
        (trader as any).playerSelectedIndex = 3;
        (trader as any).show();
        expect((trader as any).traderSelectedIndex).toBe(0);
        expect((trader as any).playerSelectedIndex).toBe(0);
    });

    it('plays the UI open sound when shown from hidden', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = false;
        (trader as any).show();
        expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
    });
});

describe('BaseTrader.hide', () => {
    it('sets isVisible to false', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = true;
        (trader as any).hide();
        expect(trader.isVisible).toBe(false);
    });

    it('sets container.style.display to "none"', () => {
        const trader = makeTraderWithDOM();
        (trader as any).container.style.display = 'flex';
        (trader as any).hide();
        expect((trader as any).container.style.display).toBe('none');
    });

    it('calls uiManager.hideControlHints', () => {
        const trader = makeTraderWithDOM();
        (trader as any).hide();
        expect((trader as any).uiManager.hideControlHints).toHaveBeenCalledOnce();
    });

    it('plays the UI close sound when hidden from visible', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = true;
        (trader as any).hide();
        expect(AudioManager.Instance.playUiClose).toHaveBeenCalledOnce();
    });
});

describe('BaseTrader.toggle', () => {
    it('calls show() when currently hidden', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = false;
        const spy = vi.spyOn(trader as any, 'show');
        (trader as any).toggle();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('calls hide() when currently visible', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = true;
        const spy = vi.spyOn(trader as any, 'hide');
        (trader as any).toggle();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('transitions from hidden to visible', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = false;
        (trader as any).toggle();
        expect(trader.isVisible).toBe(true);
    });

    it('transitions from visible to hidden', () => {
        const trader = makeTraderWithDOM();
        trader.isVisible = true;
        (trader as any).toggle();
        expect(trader.isVisible).toBe(false);
    });
});

// ─── handleNavigation ─────────────────────────────────────────────────────────

function makeInput(overrides: Partial<{
    isNavigateUpPressed: () => boolean;
    isNavigateDownPressed: () => boolean;
    isNavigateLeftPressed: () => boolean;
    isNavigateRightPressed: () => boolean;
    isSelectPressed: () => boolean;
    isCancelPressed: () => boolean;
}> = {}) {
    return {
        isNavigateUpPressed: vi.fn().mockReturnValue(false),
        isNavigateDownPressed: vi.fn().mockReturnValue(false),
        isNavigateLeftPressed: vi.fn().mockReturnValue(false),
        isNavigateRightPressed: vi.fn().mockReturnValue(false),
        isSelectPressed: vi.fn().mockReturnValue(false),
        isCancelPressed: vi.fn().mockReturnValue(false),
        ...overrides,
    } as any;
}

function makeNavPlayer() {
    return { bits: 1000, inventory: [] as Item[] } as any;
}

describe('BaseTrader.handleNavigation – up/down', () => {
    let trader: any;

    beforeEach(() => {
        trader = makeTraderWithDOM() as any;
        trader.traderInventory = [
            makeSellableItem('a', 50, 25),
            makeSellableItem('b', 50, 25),
            makeSellableItem('c', 50, 25),
        ];
        trader.selectedIndex = 1;
    });

    it('decrements selectedIndex on navigate up', () => {
        const input = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(0);
    });

    it('does not go below 0 on navigate up', () => {
        trader.selectedIndex = 0;
        const input = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(0);
    });

    it('increments selectedIndex on navigate down', () => {
        trader.selectedIndex = 0;
        const input = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(1);
        expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
    });

    it('does not exceed last item index on navigate down', () => {
        trader.selectedIndex = 2; // last index
        const input = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(2);
    });

    it('debounces up navigation when key is held', () => {
        trader.lastNavigateUpState = true;
        const input = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(1); // unchanged
    });

    it('debounces down navigation when key is held', () => {
        trader.selectedIndex = 0;
        trader.lastNavigateDownState = true;
        const input = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(0); // unchanged
    });
});

describe('BaseTrader.handleNavigation – panel switching', () => {
    let trader: any;

    beforeEach(() => {
        trader = makeTraderWithDOM() as any;
        trader.traderInventory = [makeSellableItem('x', 50, 25)];
        trader.selectedIndex = 0;
        trader.traderSelectedIndex = 0;
        trader.playerSelectedIndex = 0;
    });

    it('switches activePanel to PLAYER on navigate right', () => {
        trader.activePanel = TraderPanel.TRADER;
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.activePanel).toBe(TraderPanel.PLAYER);
        expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
    });

    it('restores saved playerSelectedIndex when switching to PLAYER panel', () => {
        trader.activePanel = TraderPanel.TRADER;
        trader.selectedIndex = 2;
        trader.playerSelectedIndex = 3;
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(3);
    });

    it('saves traderSelectedIndex when switching to PLAYER panel', () => {
        trader.activePanel = TraderPanel.TRADER;
        trader.selectedIndex = 2;
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.traderSelectedIndex).toBe(2);
    });

    it('switches activePanel to TRADER on navigate left', () => {
        trader.activePanel = TraderPanel.PLAYER;
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.activePanel).toBe(TraderPanel.TRADER);
    });

    it('restores saved traderSelectedIndex when switching to TRADER panel', () => {
        trader.activePanel = TraderPanel.PLAYER;
        trader.selectedIndex = 5;
        trader.traderSelectedIndex = 2;
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(2);
    });

    it('saves playerSelectedIndex when switching to TRADER panel', () => {
        trader.activePanel = TraderPanel.PLAYER;
        trader.selectedIndex = 5;
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.playerSelectedIndex).toBe(5);
    });

    it('does not switch panel when already on TRADER and navigate left is pressed', () => {
        trader.activePanel = TraderPanel.TRADER;
        trader.selectedIndex = 2;
        const input = makeInput({ isNavigateLeftPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.activePanel).toBe(TraderPanel.TRADER);
        expect(trader.selectedIndex).toBe(2);
    });

    it('does not switch panel when already on PLAYER and navigate right is pressed', () => {
        trader.activePanel = TraderPanel.PLAYER;
        trader.selectedIndex = 3;
        const input = makeInput({ isNavigateRightPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.activePanel).toBe(TraderPanel.PLAYER);
        expect(trader.selectedIndex).toBe(3);
    });
});

describe('BaseTrader.handleNavigation – cancel', () => {
    it('calls hide() when cancel is pressed', () => {
        const trader = makeTraderWithDOM() as any;
        const hideSpy = vi.spyOn(trader, 'hide');
        const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(hideSpy).toHaveBeenCalledOnce();
    });

    it('does not change selectedIndex when cancel is pressed', () => {
        const trader = makeTraderWithDOM() as any;
        trader.selectedIndex = 1;
        vi.spyOn(trader, 'hide').mockImplementation(() => {});
        const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
        (trader as any).handleNavigation(makeNavPlayer(), input);
        expect(trader.selectedIndex).toBe(1);
    });
});
