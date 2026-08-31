import { Item } from './Item';
import { WeaponItem } from './weapons/WeaponItem';
import { CoreItem } from './cores/CoreItem';
import { ChipItem } from './chips/ChipItem';
import { ChipStats } from './chips/Chip';
import { CoreStats } from './cores/Core';
import { WeaponType } from './weapons/WeaponType';

interface ItemDetail {
    label: string;
    value: string | number;
    /** Numeric delta to display as a badge (positive = upgrade, negative = downgrade). */
    delta?: number;
    /** When true the delta is expressed as percentage points (e.g. chip multipliers). */
    isPercentDelta?: boolean;
}

/**
 * Utility class for generating item details HTML
 * Provides a unified way to display item information across different UIs
 */
export class ItemDetailsPanel {
    private static readonly SEPARATOR_COLOR = '#BBBBBB';

    /**
     * Generate HTML for item details based on item type.
     * @param item The highlighted item to display.
     * @param equippedItem The currently equipped item in the same slot.
     *   When provided and different from `item`, each comparable stat row gains
     *   an inline delta badge (▲ green for upgrades, ▼ red for downgrades).
     */
    static generateHTML(item?: Item, equippedItem?: Item): string {
        if (!item) {
            return '';
        }

        // Don't show delta when the highlighted item IS the equipped one
        const compareWith = (equippedItem && equippedItem !== item) ? equippedItem : undefined;
        const details = this.getItemDetails(item, compareWith);

        if (details.length === 0) {
            return '';
        }

        return details.map(detail => {
            const deltaHtml = detail.delta !== undefined && detail.delta !== 0
                ? this.formatDeltaBadge(detail.delta, detail.isPercentDelta ?? false)
                : '';
            return `
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>${detail.label}</span> <span>${detail.value}${deltaHtml}</span>
            </div>
        `;
        }).join(`<div style="height: 1px; background-color: ${this.SEPARATOR_COLOR}; width: 100%;"></div>`);
    }

    /**
     * Format a stat delta as a coloured badge: ▲ +13 (green) or ▼ −9 (red).
     */
    private static formatDeltaBadge(delta: number, isPercent: boolean): string {
        const sign = delta > 0 ? '+' : '';
        const arrow = delta > 0 ? '▲' : '▼';
        const color = delta > 0 ? '#44ff44' : '#ff4444';
        const suffix = isPercent ? '%' : '';
        return ` <span style="color:${color};">${arrow} ${sign}${delta}${suffix}</span>`;
    }

    /**
     * Get item details as an array of label-value pairs.
     * @param equippedItem When provided, stat rows include a delta compared to this item.
     */
    private static getItemDetails(item: Item, equippedItem?: Item): ItemDetail[] {
        if (item instanceof WeaponItem) {
            return this.getWeaponDetails(item, equippedItem instanceof WeaponItem ? equippedItem : undefined);
        } else if (item instanceof CoreItem) {
            return this.getCoreDetails(item, equippedItem instanceof CoreItem ? equippedItem : undefined);
        } else if (item instanceof ChipItem) {
            return this.getChipDetails(item, equippedItem instanceof ChipItem ? equippedItem : undefined);
        }
        return [];
    }

    /**
     * Get details for weapon items
     */
    private static getWeaponDetails(item: WeaponItem, equippedItem?: WeaponItem): ItemDetail[] {
        const typeLabel = this.getWeaponTypeLabel(item.weaponType);
        const damage = item.damage;
        const levelDef = item.getLevelByNumber();
        const damageDelta = equippedItem !== undefined ? item.damage - equippedItem.damage : undefined;

        return [
            { label: 'Type', value: typeLabel },
            { label: 'Tier', value: item.tier.name },
            { label: 'Damage', value: damage, delta: damageDelta },
            { label: 'Required Tech', value: levelDef.requiredTech },
            { label: 'Price', value: `${item.sellPrice} bits` }
        ];
    }

    /**
     * Get details for core items.
     * When `equippedItem` is provided every stat that appears on either item is
     * listed with a delta badge so the player can see exactly what they gain or lose.
     */
    private static getCoreDetails(item: CoreItem, equippedItem?: CoreItem): ItemDetail[] {
        const details: ItemDetail[] = [];

        const levelDef = item.getLevelByNumber();
        details.push({ label: 'Required Player Level', value: levelDef.requiredLevel });

        const stats = item.stats;
        const eStats: CoreStats = equippedItem?.stats ?? {};

        const statDefs: Array<{ key: keyof CoreStats; label: string }> = [
            { key: 'strength', label: 'Strength' },
            { key: 'defense', label: 'Defense' },
            { key: 'agility', label: 'Agility' },
        ];

        for (const { key, label } of statDefs) {
            const newVal = stats[key] ?? 0;
            const equippedVal = equippedItem !== undefined ? (eStats[key] ?? 0) : undefined;
            const shouldShow = newVal !== 0 || (equippedVal !== undefined && equippedVal !== 0);
            if (!shouldShow) continue;
            const sign = newVal > 0 ? '+' : '';
            const value = newVal !== 0 ? `${sign}${newVal}` : '0';
            const delta = equippedVal !== undefined ? newVal - equippedVal : undefined;
            details.push({ label, value, delta });
        }

        const stealEffect = item.getStealEffect();
        if (stealEffect) {
            const chance = item.getHpStealChance() || item.getTpStealChance();
            const chanceText = `${(chance * 100).toFixed(0)}%`;
            const label = stealEffect.resource === 'hp' ? 'HP Steal' : 'TP Steal';
            const effectText = stealEffect.resource === 'hp'
                ? `${(stealEffect.amountPercent * 100).toFixed(1)}% max HP / hit`
                : `${(stealEffect.amountPercent * 100).toFixed(1)}% max TP / hit`;
            details.push({ label, value: `${chanceText} % chance for  ${effectText}` });
        }

        details.push({ label: 'Price', value: `${item.sellPrice} bits` });

        return details;
    }

    /**
     * Get details for chip items.
     * When `equippedItem` is provided every multiplier stat that appears on either
     * chip is listed with a percentage-point delta badge.
     */
    private static getChipDetails(item: ChipItem, equippedItem?: ChipItem): ItemDetail[] {
        const details: ItemDetail[] = [];

        // Add level and requirement info
        const levelDef = item.getLevelByNumber();
        details.push({ label: 'Required Player Level', value: levelDef.requiredLevel });

        const stats = item.stats;
        const eStats: ChipStats = equippedItem?.stats ?? {};

        const multiplierDefs: Array<{ key: keyof ChipStats; label: string }> = [
            { key: 'weaponRangeMultiplier', label: 'Weapon Range' },
            { key: 'walkSpeedMultiplier', label: 'Walk Speed' },
            { key: 'luckMultiplier', label: 'Luck' },
            { key: 'criticalDamageMultiplier', label: 'Crit Damage' },
            { key: 'healingMultiplier', label: 'Healing' },
            { key: 'skillDamageBonus', label: 'Skill damage bonus' },
            { key: 'critChanceMultiplier', label: 'Critical hit chance bonus' }
        ];

        for (const { key, label } of multiplierDefs) {
            const newRaw = stats[key];
            const equippedRaw = equippedItem !== undefined ? eStats[key] : undefined;
            const shouldShow = newRaw !== undefined || (equippedRaw !== undefined);
            if (!shouldShow) continue;

            const nv = newRaw ?? 1.0;
            const ev = equippedRaw ?? 1.0;
            const newPct = ((nv - 1) * 100).toFixed(0);
            const value = `+${newPct}%`;
            // Delta expressed as integer percentage-point difference
            const delta = equippedItem !== undefined ? Math.round((nv - ev) * 100) : undefined;
            details.push({ label, value, delta, isPercentDelta: true });
        }

        details.push({ label: 'Price', value: `${item.sellPrice} bits` });

        return details;
    }

    /**
     * Get human-readable label for weapon type
     */
    private static getWeaponTypeLabel(weaponType: WeaponType): string {
        switch (weaponType) {
            case WeaponType.SWORD:
                return 'Sword';
            case WeaponType.DUAL_BLADE:
                return 'Dual Blade';
            case WeaponType.LANCE:
                return 'Lance';
            case WeaponType.HAMMER:
                return 'Hammer';
            default:
                return 'Unknown';
        }
    }
}
