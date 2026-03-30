import { Item } from './Item';
import { WeaponItem } from './weapons/WeaponItem';

/** Type ordering: Weapons first, then Cores, then Chips. */
const TYPE_ORDER: Record<string, number> = { weapon: 0, core: 1, chip: 2 };

/**
 * Sorts an inventory array in-place using the standard ordering:
 *   1. Item type – Weapons → Cores → Chips (unknown types sort last)
 *   2. Level   – high to low
 *   3. Tier    – high to low (weapons only; non-weapons are equal)
 */
export function sortInventory(items: Item[]): void {
    items.sort((a, b) => {
        // 1. Item type
        const typeA = TYPE_ORDER[a.getType()] ?? 99;
        const typeB = TYPE_ORDER[b.getType()] ?? 99;
        if (typeA !== typeB) return typeA - typeB;

        // 2. Level (high to low)
        const levelA = 'level' in a ? (a as any).level as number : 0;
        const levelB = 'level' in b ? (b as any).level as number : 0;
        if (levelA !== levelB) return levelB - levelA;

        // 3. Tier (high to low, weapons only – higher minPercent = better tier)
        if (a instanceof WeaponItem && b instanceof WeaponItem) {
            const tierA = a.tier?.minPercent ?? -Infinity;
            const tierB = b.tier?.minPercent ?? -Infinity;
            return tierB - tierA;
        }

        return 0;
    });
}
