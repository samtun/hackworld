import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseTrader } from './BaseTrader';
import { Item } from './Item';
import { EquippableItem } from './EquippableItem';
import { TraderPanel } from './TraderPanel';

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
        expect(trader.uiManager.hideControlHints).toHaveBeenCalledOnce();
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
