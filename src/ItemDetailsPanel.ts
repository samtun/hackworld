import { Item } from './InventoryManager';
import { WeaponType } from './Weapon';

interface ItemDetail {
    label: string;
    value: string | number;
}

/**
 * Utility class for generating item details HTML
 * Provides a unified way to display item information across different UIs
 */
export class ItemDetailsPanel {
    private static readonly SEPARATOR_COLOR = '#BBBBBB';

    /**
     * Generate HTML for item details based on item type
     */
    static generateHTML(item?: Item): string {
        if (!item) {
            return '';
        }

        const details = this.getItemDetails(item);
        
        if (details.length === 0) {
            return '';
        }

        return details.map(detail => `
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>${detail.label}</span> <span>${detail.value}</span>
            </div>
        `).join(`<div style="height: 1px; background-color: ${this.SEPARATOR_COLOR}; width: 100%;"></div>`);
    }

    /**
     * Get item details as an array of label-value pairs
     */
    private static getItemDetails(item: Item): ItemDetail[] {
        switch (item.type) {
            case 'weapon':
                return this.getWeaponDetails(item);
            case 'core':
                return this.getCoreDetails(item);
            case 'chip':
                return this.getChipDetails(item);
            default:
                return [];
        }
    }

    /**
     * Get details for weapon items
     */
    private static getWeaponDetails(item: Item): ItemDetail[] {
        if (!item.weaponType) {
            return [];
        }

        const typeLabel = this.getWeaponTypeLabel(item.weaponType);
        const damage = item.damage || 10; // Use item's damage value

        return [
            { label: 'Type', value: typeLabel },
            { label: 'Damage', value: damage }
        ];
    }

    /**
     * Get details for core items
     */
    private static getCoreDetails(item: Item): ItemDetail[] {
        if (!item.coreStats) {
            return [];
        }

        const details: ItemDetail[] = [];

        this.addStatIfPresent(details, 'Strength', item.coreStats.strength);
        this.addStatIfPresent(details, 'Defense', item.coreStats.defense);
        this.addStatIfPresent(details, 'Speed', item.coreStats.speed);

        return details;
    }

    /**
     * Helper method to add a stat to the details array if it's defined and non-zero
     */
    private static addStatIfPresent(details: ItemDetail[], label: string, value: number | undefined) {
        if (value !== undefined && value !== 0) {
            const sign = value > 0 ? '+' : '';
            details.push({ label, value: `${sign}${value}` });
        }
    }

    /**
     * Get details for chip items
     */
    private static getChipDetails(_item: Item): ItemDetail[] {
        // Chips don't have details yet, but we can extend this in the future
        return [];
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
