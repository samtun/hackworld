import { WeaponItem } from './WeaponItem';
import { BaseTrader, TraderUIConfig } from '../BaseTrader';
import { WeaponRepository } from './WeaponRepository';
import { WeaponType } from './WeaponType';
import { Player } from '../../Player';
import { Item } from '../Item';
import { InputManager } from '../../InputManager';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { WEAPON_TIERS } from './WeaponTier';
import { randomMultiplierForTier, applyWeaponBonus } from './WeaponBonusCalculator';

export class WeaponTrader extends BaseTrader {
    static instance: WeaponTrader; // Singleton

    private weaponRepository: WeaponRepository;
    private pendingInventoryInit: boolean = true;

    private static readonly ALL_WEAPON_TYPES = [
        WeaponType.SWORD,
        WeaponType.DUAL_BLADE,
        WeaponType.LANCE,
        WeaponType.HAMMER,
    ];

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

    show() {
        super.show();
    }

    update(player: Player, input?: InputManager) {
        if (this.pendingInventoryInit) {
            this.refreshInventory(player);
            this.pendingInventoryInit = false;
            this.needsRender = true;
        }
        super.update(player, input);
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];
    }

    /**
     * Re-populates the trader inventory using the current player's tech levels.
     * Called each time the trader is opened so the inventory reflects the player's progress.
     */
    private refreshInventory(player: Player): void {
        this.traderInventory = [];

        // One weapon per type at the level that fits the player's current tech
        for (const type of WeaponTrader.ALL_WEAPON_TYPES) {
            const level = this.getBaseWeaponLevel(player.getTechForWeapon(type));
            const weapon = this.weaponRepository.getWeaponByTypeAndLevel(type, level);
            this.traderInventory.push(weapon);
        }

        // Random bonus entries: one per tier with decreasing probability
        for (const tier of WEAPON_TIERS.values()) {
            const type = WeaponTrader.ALL_WEAPON_TYPES[
                Math.floor(Math.random() * WeaponTrader.ALL_WEAPON_TYPES.length)
            ];
            const level = this.getBaseWeaponLevel(player.getTechForWeapon(type));
            const weapon = this.weaponRepository.getWeaponByTypeAndLevel(type, level);

            console.log(`Evaluating ${tier.name} tier for trader inventory: player level ${player.level}, tier min level ${tier.minLevel}, chance ${tier.traderChance}`);
            if (player.level >= tier.minLevel && Math.random() < tier.traderChance) {
                this.traderInventory.push(applyWeaponBonus(weapon, randomMultiplierForTier(tier)));
            } else {
                // Tier chance did not fire – add the base weapon at standard pricing.
                // Base weapons from the repository already carry the STABLE tier.
                this.traderInventory.push(weapon);
            }
        }

        // Sort inventory:
        // 1. Weapon Type
        // 2. Weapon Level
        // 3. Weapon Tier
        (this.traderInventory as WeaponItem[]).sort((a, b) => {
            // 1. Weapon Type order
            if (a.weaponType !== b.weaponType) {
                return WeaponTrader.ALL_WEAPON_TYPES.indexOf(a.weaponType) - WeaponTrader.ALL_WEAPON_TYPES.indexOf(b.weaponType);
            }
            
            // 2. Weapon Level (ascending)
            if (a.level !== b.level) {
                return a.level - b.level;
            }

            // 3. Weapon Tier (descending quality/minPercent)
            const tierA = (a.tier && typeof a.tier.minPercent === 'number') ? a.tier.minPercent : -1000;
            const tierB = (b.tier && typeof b.tier.minPercent === 'number') ? b.tier.minPercent : -1000;
            return tierB - tierA;
        });
    }

    /**
     * Returns the highest weapon level the player can equip for the given tech value.
     */
    private getBaseWeaponLevel(playerTech: number): number {
        let baseLevel = 1;
        for (let i = 0; i < WeaponItem.WEAPON_LEVELS.length; i++) {
            if (playerTech >= WeaponItem.WEAPON_LEVELS[i].requiredTech) {
                baseLevel = i + 1;
            } else {
                break;
            }
        }
        return baseLevel;
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof WeaponItem);
    }
}
