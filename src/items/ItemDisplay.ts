import { Item } from './Item';
import { WeaponItem } from './WeaponItem';
import type { Player } from '../Player';
import { Weapon } from './Weapon';

// Return an HTML-safe label for an item, including price text if provided.
export function formatItemLabel(item: Item, player: Player, priceText: string = ''): string {
    if (item instanceof WeaponItem) {
        // Show the weapon's own fixed level as greek character
        const char = Weapon.getLevelChar(item.level);
        return `${escapeHtml(item.name)} <i style="font-style:italic;">${escapeHtml(char)}</i>${escapeHtml(priceText)}`;
    }
    return `${escapeHtml(item.name)}${escapeHtml(priceText)}`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
