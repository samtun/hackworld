import { WeaponItem } from './WeaponItem';
import { BaseTrader, TraderUIConfig } from '../BaseTrader';
import { WeaponRegistry } from './WeaponRegistry';
import { Player } from '../../Player';
import { Item } from '../Item';
import { TRADER_UI_COLORS } from '../TraderUIConstants';

export class WeaponTrader extends BaseTrader {
    static instance: WeaponTrader; // Singleton

    private weaponRegistry: WeaponRegistry;

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
        this.weaponRegistry = WeaponRegistry.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): WeaponTrader {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];

        for (const weaponDef of this.weaponRegistry.getAllWeapons()) {
            this.traderInventory.push(new WeaponItem(
                crypto.randomUUID(),
                weaponDef.name,
                weaponDef.baseBuyPrice,
                weaponDef.baseSellPrice,
                weaponDef.type,
                weaponDef.baseDamage,
                weaponDef.model,
                1 // default level alpha
            ));
        }

        // Add a test Aegis Sword at Beta level for testing equip restrictions
        const aegis = this.weaponRegistry.getWeaponById('aegis_sword');
        if (aegis) {
            this.traderInventory.push(new WeaponItem(
                'aegis_sword_beta',
                aegis.name,
                aegis.baseBuyPrice * 2,
                aegis.baseSellPrice,
                aegis.type,
                aegis.baseDamage,
                aegis.model,
                2 // beta
            ));
        }
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof WeaponItem);
    }
}
