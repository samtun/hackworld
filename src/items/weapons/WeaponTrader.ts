import { WeaponItem } from './WeaponItem';
import { BaseTrader, TraderUIConfig } from '../BaseTrader';
import { WeaponRepository } from './WeaponRepository';
import { Player } from '../../Player';
import { Item } from '../Item';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { WEAPON_TIERS } from './WeaponTier';

export class WeaponTrader extends BaseTrader {
    static instance: WeaponTrader; // Singleton

    private weaponRepository: WeaponRepository;

    private constructor() {
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
        super(cfg);
        this.weaponRepository = WeaponRepository.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): WeaponTrader {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];

        for (const tier of WEAPON_TIERS.values()) {
            const weapon = this.weaponRepository.getWeaponById('battle_hawk_alpha');
            if (weapon) {
                let bonusFactor = 1.01 + tier.minPercent / 100;
                if (tier.minPercent == -Infinity) {
                    bonusFactor = 0.8; // Cap negative bonus at 50% for display purposes
                }
                this.traderInventory.push(weapon.cloneWith(
                    Math.floor(weapon.damage * bonusFactor),
                    Math.floor(weapon.buyPrice * bonusFactor),
                    Math.floor(weapon.sellPrice * bonusFactor),
                    WEAPON_TIERS.get(tier.name)
                ));
            }
        }

        // Get all weapons from repository (already cloned with unique IDs)
        this.traderInventory.push(...this.weaponRepository.getAllWeapons());
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof WeaponItem);
    }
}
