import { WeaponItem } from './WeaponItem';
import { BaseTrader, TraderUIConfig } from '../BaseTrader';
import { WeaponRepository } from './WeaponRepository';
import { WeaponType } from './WeaponType';
import { Player } from '../../player/Player';
import { Item } from '../Item';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { TierManager } from '../TierManager';
import { WeaponBonusCalculator } from './WeaponBonusCalculator';
import { sortInventory } from '../ItemSorter';
import { CardCollection } from '../cards/CardCollection';
import { Album } from '../cards/Card';
import { AudioManager } from '../../AudioManager';
import { InputManager } from '../../controls/InputManager';
import { MenuManager } from '../../ui/MenuManager';
import { UIManager } from '../../ui/UIManager';
import { singleton } from 'tsyringe';

/** A.003 bonus: 8% buy discount and 8% sell bonus on weapons when collection A.003 is complete */
const A003_DISCOUNT = 0.08;
/** A.003 bonus: +5% tier chance boost for weapons spawned in trader inventory */
const A003_TIER_CHANCE_BONUS = 0.05;

@singleton()
export class WeaponTrader extends BaseTrader {
    private readonly weaponRepository: WeaponRepository;
    private readonly weaponBonusCalculator: WeaponBonusCalculator;
    private readonly tierManager: TierManager;
    private readonly cardCollection: CardCollection;

    private pendingInventoryInit: boolean = true;

    private static readonly ALL_WEAPON_TYPES = [
        WeaponType.SWORD,
        WeaponType.DUAL_BLADE,
        WeaponType.LANCE,
        WeaponType.HAMMER,
    ];

    constructor(
        weaponRepository: WeaponRepository,
        weaponBonusCalculator: WeaponBonusCalculator,
        tierManager: TierManager,
        cardCollection: CardCollection,
        audioManager: AudioManager,
        menuManager: MenuManager,
        uiManager: UIManager,
        inputManager: InputManager,
    ) {
        const cfg: TraderUIConfig = {
            title: 'TRADER',
            traderTitle: "Trader's Goods",
            playerTitle: 'Your Inventory',
            colors: {
                panelTrader: TRADER_UI_COLORS.PANEL_TRADER,
                panelPlayer: TRADER_UI_COLORS.PANEL_PLAYER,
                windowBg: TRADER_UI_COLORS.WINDOW_BG,
                overlay: TRADER_UI_COLORS.OVERLAY,
                separator: TRADER_UI_COLORS.SEPARATOR,
                moneyColor: TRADER_UI_COLORS.MONEY_COLOR,
                text: TRADER_UI_COLORS.TEXT
            }
        };
        super(audioManager, menuManager, uiManager, inputManager, cfg);
        this.weaponRepository = weaponRepository;
        this.weaponBonusCalculator = weaponBonusCalculator;
        this.tierManager = tierManager;
        this.cardCollection = cardCollection;
        this.initializeTraderInventory();
    }

    show() {
        super.show();
    }

    update(player: Player) {
        if (this.pendingInventoryInit) {
            this.refreshInventory(player);
            this.pendingInventoryInit = false;
            this.needsRender = true;
        }
        super.update(player);
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];
    }

    protected getEffectiveBuyPrice(item: Item, _player: Player): number {
        const base = item.buyPrice ?? 0;
        return this.cardCollection.isAlbumComplete(Album.A003)
            ? Math.floor(base * (1 - A003_DISCOUNT))
            : base;
    }

    protected getEffectiveSellPrice(item: Item, _player: Player): number {
        const base = item.sellPrice ?? 0;
        return this.cardCollection.isAlbumComplete(Album.A003)
            ? Math.ceil(base * (1 + A003_DISCOUNT))
            : base;
    }

    /**
     * Re-populates the trader inventory using the current player's tech levels.
     * Called each time the trader is opened so the inventory reflects the player's progress.
     */
    private refreshInventory(player: Player): void {
        this.traderInventory = [];
        const a003Active = this.cardCollection.isAlbumComplete(Album.A003);

        // Random bonus entries
        // Loop 2 times over all tiers to get a good mix of potential weapon items
        for (let i = 0; i < 2; i++) {
            for (const tier of this.tierManager.tiers.values()) {
                const type = WeaponTrader.ALL_WEAPON_TYPES[
                    Math.floor(Math.random() * WeaponTrader.ALL_WEAPON_TYPES.length)
                ];
                const level = this.getBaseWeaponLevel(player.getTechForWeapon(type));
                const weapon = this.weaponRepository.getWeaponByTypeAndLevel(type, level);

                const roll = Math.random();
                // A.003 bonus: increase tier spawn chance by 5%
                const effectiveTierChance = a003Active
                    ? Math.min(1, tier.traderChance + A003_TIER_CHANCE_BONUS)
                    : tier.traderChance;
                console.log(`Evaluating ${tier.name} tier for trader inventory: player level ${player.level}, tier min level ${tier.minLevel}, chance ${effectiveTierChance}, roll ${roll}`);
                if (player.level >= tier.minLevel && roll < effectiveTierChance) {
                    const randomBonus = this.weaponBonusCalculator.randomMultiplierForTier(tier);
                    this.traderInventory.push(
                        this.weaponBonusCalculator.applyWeaponBonus(weapon, randomBonus));
                } else {
                    // Tier chance did not fire – add the base weapon at standard pricing.
                    // Base weapons from the repository already carry the STABLE tier.
                    this.traderInventory.push(weapon);
                }
            }
        }

        sortInventory(this.traderInventory);
    }

    /**
     * Returns the highest weapon level the player can equip for the given tech value.
     */
    private getBaseWeaponLevel(playerTech: number): number {
        return WeaponItem.getLevelForTech(playerTech);
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof WeaponItem);
    }
}
