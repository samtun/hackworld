import { Item } from './Item';
import { ItemLevelHelper } from './ItemLevelHelper';
import { WeaponItem } from './weapons/WeaponItem';
import { ChipItem } from './chips/ChipItem';
import { CoreItem } from './cores/CoreItem';
import { Tier } from './TierManager';
import { getWeaponIcon, getChipIcon, ICON_CORE } from '../ui/StatIcons';

// Return an HTML-safe label for an item, including price text if provided.
export function formatItemLabel(item: Item, priceText: string = ''): string {
    if (item instanceof WeaponItem || item instanceof ChipItem || item instanceof CoreItem) {
        // Show the item's level as greek character
        const char = ItemLevelHelper.getLevelChar(item.level);
        let tierColor = "#ffffff";
        if (item instanceof WeaponItem) {
            // Use slightly different color for broken tier, since the rim color is quite dark
            tierColor = item.tier.name == Tier.BROKEN ? "#CCCCCC" : item.tier.rimColor;
        }
        let itemIcon = '';
        if (item instanceof WeaponItem) {
            itemIcon = getWeaponIcon(item.weaponType);
        } else if (item instanceof ChipItem) {
            itemIcon = getChipIcon(item.chipType);
        } else if (item instanceof CoreItem) {
            itemIcon = ICON_CORE;
        }
        let label = `${itemIcon}${escapeHtml(item.name)} <i style="font-style:italic;">${escapeHtml(char)}</i>`;
        label = `<span style="color:${escapeHtml(tierColor)}">${label}</span>`;
        return `${label}${priceText}`;
    }
    return `${escapeHtml(item.name)}${priceText}`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
