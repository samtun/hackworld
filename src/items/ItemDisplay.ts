import { Item } from './Item';
import { ItemLevelHelper } from './ItemLevelHelper';
import { WeaponItem } from './weapons/WeaponItem';
import { ChipItem } from './chips/ChipItem';
import { CoreItem } from './cores/CoreItem';

// Return an HTML-safe label for an item, including price text if provided.
export function formatItemLabel(item: Item, priceText: string = ''): string {
    if (item instanceof WeaponItem || item instanceof ChipItem || item instanceof CoreItem) {
        // Show the item's level as greek character
        const char = ItemLevelHelper.getLevelChar(item.level);
        return `${escapeHtml(item.name)} <i style="font-style:italic;">${escapeHtml(char)}</i>${escapeHtml(priceText)}`;
    }
    return `${escapeHtml(item.name)}${escapeHtml(priceText)}`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
