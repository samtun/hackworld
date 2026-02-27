import { Item } from './Item';
import { ItemLevelHelper } from './ItemLevelHelper';
import { WeaponItem } from './weapons/WeaponItem';
import { ChipItem } from './chips/ChipItem';
import { CoreItem } from './cores/CoreItem';
import { Tier } from './TierManager';
import { getWeaponIcon, ICON_CORE, ICON_CHIP } from '../ui/StatIcons';

// Return an HTML-safe label for an item, including price text if provided.
export function formatItemLabel(item: Item, priceText: string = ''): string {
    if (item instanceof WeaponItem || item instanceof ChipItem || item instanceof CoreItem) {
        // Show the item's level as greek character
        const char = ItemLevelHelper.getLevelChar(item.level);
        let tierColor = "#ffffff";
        if (item instanceof WeaponItem) {
            // Use slightly different color for broken tier, since the rim color is quite dark
            tierColor = item.tier.name == Tier.BROKEN ? "#C5C5C5" : lightenColor(item.tier.rimColor, 0.5);
        }
        let itemIcon = '';
        if (item instanceof WeaponItem) {
            itemIcon = getWeaponIcon(item.weaponType);
        } else if (item instanceof ChipItem) {
            itemIcon = ICON_CHIP;
        } else if (item instanceof CoreItem) {
            itemIcon = ICON_CORE;
        }
        let label = `${itemIcon}${escapeHtml(item.name)} <i style="font-style:italic;">${escapeHtml(char)}</i>`;
        label = `<span style="color:${escapeHtml(tierColor)}">${label}</span>`;
        return `${label}${priceText}`;
    }
    return `${escapeHtml(item.name)}${priceText}`;
}

/** Blends a hex color towards white by the given amount (0 = unchanged, 1 = white). */
function lightenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, Math.round(r + (255 - r) * amount));
    const ng = Math.min(255, Math.round(g + (255 - g) * amount));
    const nb = Math.min(255, Math.round(b + (255 - b) * amount));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
