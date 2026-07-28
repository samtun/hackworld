import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseTrader, TraderUIConfig } from './BaseTrader';
import { Item } from './Item';
import { EquippableItem } from './EquippableItem';
import { TraderPanel } from './TraderPanel';
import { AudioManager } from '../AudioManager';
import { mockDeep } from 'vitest-mock-extended';
import { Player } from '../player/Player';
import { MenuManager } from '../ui/MenuManager';
import { InputManager } from '../controls/InputManager';
import { UIManager } from '../ui/UIManager';

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

interface TestTraderOverrides {
    audioManager?: AudioManager;
    menuManager?: MenuManager;
    uiManager?: UIManager;
    inputManager?: InputManager;
    traderUiConfig?: TraderUIConfig;
}

/**
 * Build a TestTrader via Object.create, bypassing the constructor to avoid DOM
 * creation in the node test environment.
 */
function makeTrader(overrides: TestTraderOverrides = {}): TestTrader {
    const {
        audioManager = mockDeep<AudioManager>(),
        menuManager = mockDeep<MenuManager>({
            createOverlay: () => document.createElement('div'),
            createGridWindow: () => document.createElement('div'),
            createPanel: () => document.createElement('div'),
        }),
        uiManager = mockDeep<UIManager>(),
        inputManager = mockDeep<InputManager>(),
        traderUiConfig = {},
    } = overrides;

    const trader = new TestTrader(
        audioManager,
        menuManager,
        uiManager,
        inputManager,
        traderUiConfig
    );

    Object.assign(trader, {
        isVisible: true,
        selectedIndex: 0,
        activePanel: TraderPanel.TRADER,
    });
    return trader;
}

/** Minimal player stub */
function makePlayer(overrides: Record<string, unknown> = {}) {
    const playerMock = mockDeep<Player>({
        bits: 500,
        inventory: [] as Item[],
    });
    Object.assign(playerMock, overrides);
    return playerMock;
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
        const audioManagerMock = mockDeep<AudioManager>();
        trader = makeTrader({ audioManager: audioManagerMock });
        const item = makeSellableItem('i1', 300, 150);
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(200); // unchanged
        expect(player.inventory.length).toBe(0);
        expect(trader.traderInventory.length).toBe(1);
        expect(audioManagerMock.playInsufficient).toHaveBeenCalledOnce();
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
        const audioManagerMock = mockDeep<AudioManager>();
        trader = makeTrader({ audioManager: audioManagerMock });
        const item = makeSellableItem('i1', 100, 50);
        trader.traderInventory = [item];

        (trader as any).handleTransaction(player);

        expect(audioManagerMock.playBuy).toHaveBeenCalledOnce();
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
        const audioManagerMock = mockDeep<AudioManager>();
        trader = makeTrader({ audioManager: audioManagerMock });
        trader.activePanel = TraderPanel.PLAYER;
        const item = makeEquippableItem('e2', 200, 80, true); // equipped
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(100); // unchanged
        expect(player.inventory.length).toBe(1);
        expect(audioManagerMock.playInsufficient).toHaveBeenCalledOnce();
    });

    it('can sell an un-equipped equippable item', () => {
        const item = makeEquippableItem('e3', 200, 80, false); // not equipped
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(player.bits).toBe(180);
        expect(player.inventory.length).toBe(0);
    });

    it('plays the sell sound after a successful sale', () => {
        const audioManagerMock = mockDeep<AudioManager>();
        trader = makeTrader({ audioManager: audioManagerMock });
        trader.activePanel = TraderPanel.PLAYER;
        const item = makeSellableItem('s1', 100, 40);
        player.inventory = [item];

        (trader as any).handleTransaction(player);

        expect(audioManagerMock.playSell).toHaveBeenCalledOnce();
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
function makeTraderWithDOM(overrides: TestTraderOverrides = {}): TestTrader {
    const trader = makeTrader(overrides);
    const container = document.createElement('div');
    container.style.display = 'none';
    (trader as any).container = container;
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
        const audioManagerMock = mockDeep<AudioManager>();
        const trader = makeTraderWithDOM({ audioManager: audioManagerMock });
        trader.isVisible = false;
        (trader as any).show();
        expect(audioManagerMock.playUiOpen).toHaveBeenCalledOnce();
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
        const audioManagerMock = mockDeep<AudioManager>();
        const trader = makeTraderWithDOM({ audioManager: audioManagerMock });
        trader.isVisible = true;
        (trader as any).hide();
        expect(audioManagerMock.playUiClose).toHaveBeenCalledOnce();
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

function makeNavPlayer() {
    return { bits: 1000, inventory: [] as Item[] } as any;
}

describe('BaseTrader.handleNavigation – up/down', () => {
    function makeTraderWithInventory(overrides: TestTraderOverrides = {}) {
        const trader = makeTraderWithDOM(overrides);
        trader.traderInventory = [
            makeSellableItem('a', 50, 25),
            makeSellableItem('b', 50, 25),
            makeSellableItem('c', 50, 25),
        ];
        trader.selectedIndex = 1;
        return trader;
    }

    it('decrements selectedIndex on navigate up', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateUpPressed: vi.fn().mockReturnValue(true),
        });

        const trader = makeTraderWithInventory({ inputManager: inputManagerMock });
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(0);
    });

    it('does not go below 0 on navigate up', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateUpPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithInventory({ inputManager: inputManagerMock });
        trader.selectedIndex = 0;
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(0);
    });

    it('increments selectedIndex on navigate down', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateDownPressed: vi.fn().mockReturnValue(true),
        });
        const audioManagerMock = mockDeep<AudioManager>();
        const trader = makeTraderWithInventory({ inputManager: inputManagerMock, audioManager: audioManagerMock });
        trader.selectedIndex = 0;
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(1);
        expect(audioManagerMock.playMenuNavigate).toHaveBeenCalledOnce();
    });

    it('does not exceed last item index on navigate down', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateDownPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithInventory({ inputManager: inputManagerMock });
        trader.selectedIndex = 2; // last index
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(2);
    });

    it('debounces up navigation when key is held', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateUpPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithInventory({ inputManager: inputManagerMock });
        (trader as any).lastNavigateUpState = true;
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(1); // unchanged
    });

    it('debounces down navigation when key is held', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateDownPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithInventory({ inputManager: inputManagerMock });
        trader.selectedIndex = 0;
        (trader as any).lastNavigateDownState = true;
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(0); // unchanged
    });
});

describe('BaseTrader.handleNavigation – panel switching', () => {
    function makeTraderWithSellableItem(overrides: TestTraderOverrides = {}) {
        const trader = makeTraderWithDOM(overrides);
        trader.traderInventory = [makeSellableItem('x', 50, 25)];
        trader.selectedIndex = 0;
        return trader;
    }

    it('switches activePanel to PLAYER on navigate right', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateRightPressed: vi.fn().mockReturnValue(true),
        });
        const audioManagerMock = mockDeep<AudioManager>();
        const trader = makeTraderWithSellableItem({ inputManager: inputManagerMock, audioManager: audioManagerMock });
        trader.activePanel = TraderPanel.TRADER;
        trader.update(makeNavPlayer());
        expect(trader.activePanel).toBe(TraderPanel.PLAYER);
        expect(audioManagerMock.playMenuNavigate).toHaveBeenCalledOnce();
    });

    it('restores saved playerSelectedIndex when switching to PLAYER panel', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateRightPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithDOM({ inputManager: inputManagerMock });
        trader.activePanel = TraderPanel.TRADER;
        trader.selectedIndex = 2;
        (trader as any).playerSelectedIndex = 3;
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(3);
    });

    it('saves traderSelectedIndex when switching to PLAYER panel', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateRightPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithDOM({ inputManager: inputManagerMock });
        trader.activePanel = TraderPanel.TRADER;
        trader.selectedIndex = 2;
        trader.update(makeNavPlayer());
        expect((trader as any).traderSelectedIndex).toBe(2);
    });

    it('switches activePanel to TRADER on navigate left', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateLeftPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithSellableItem({ inputManager: inputManagerMock });
        trader.activePanel = TraderPanel.PLAYER;
        trader.update(makeNavPlayer());
        expect(trader.activePanel).toBe(TraderPanel.TRADER);
    });

    it('restores saved traderSelectedIndex when switching to TRADER panel', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateLeftPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithSellableItem({ inputManager: inputManagerMock });
        trader.activePanel = TraderPanel.PLAYER;
        trader.selectedIndex = 5;
        (trader as any).traderSelectedIndex = 2;
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(2);
    });

    it('saves playerSelectedIndex when switching to TRADER panel', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateLeftPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithSellableItem({ inputManager: inputManagerMock });
        trader.activePanel = TraderPanel.PLAYER;
        trader.selectedIndex = 5;
        trader.update(makeNavPlayer());
        expect((trader as any).playerSelectedIndex).toBe(5);
    });

    it('does not switch panel when already on TRADER and navigate left is pressed', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateLeftPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithSellableItem({ inputManager: inputManagerMock });
        trader.activePanel = TraderPanel.TRADER;
        trader.selectedIndex = 2;
        trader.update(makeNavPlayer());
        expect(trader.activePanel).toBe(TraderPanel.TRADER);
        expect(trader.selectedIndex).toBe(2);
    });

    it('does not switch panel when already on PLAYER and navigate right is pressed', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isNavigateRightPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithSellableItem({ inputManager: inputManagerMock });
        trader.activePanel = TraderPanel.PLAYER;
        trader.selectedIndex = 3;
        trader.update(makeNavPlayer());
        expect(trader.activePanel).toBe(TraderPanel.PLAYER);
        expect(trader.selectedIndex).toBe(3);
    });
});

describe('BaseTrader.handleNavigation – cancel', () => {
    it('calls hide() when cancel is pressed', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isCancelPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithDOM({ inputManager: inputManagerMock });
        const hideSpy = vi.spyOn(trader, 'hide');
        trader.update(makeNavPlayer());
        expect(hideSpy).toHaveBeenCalledOnce();
    });

    it('does not change selectedIndex when cancel is pressed', () => {
        const inputManagerMock = mockDeep<InputManager>({
            isCancelPressed: vi.fn().mockReturnValue(true),
        });
        const trader = makeTraderWithDOM({ inputManager: inputManagerMock });
        trader.selectedIndex = 1;
        vi.spyOn(trader, 'hide').mockImplementation(() => { });
        trader.update(makeNavPlayer());
        expect(trader.selectedIndex).toBe(1);
    });
});
