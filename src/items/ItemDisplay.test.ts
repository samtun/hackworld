import { describe, it, expect, vi } from 'vitest';

vi.mock('../assets/icons/hp.svg?raw', () => ({ default: '<svg>hp</svg>' }));
vi.mock('../assets/icons/tp.svg?raw', () => ({ default: '<svg>tp</svg>' }));
vi.mock('../assets/icons/strength.svg?raw', () => ({ default: '<svg>strength</svg>' }));
vi.mock('../assets/icons/defense.svg?raw', () => ({ default: '<svg>defense</svg>' }));
vi.mock('../assets/icons/agility.svg?raw', () => ({ default: '<svg>agility</svg>' }));
vi.mock('../assets/icons/luck.svg?raw', () => ({ default: '<svg>luck</svg>' }));
vi.mock('../assets/icons/bits.svg?raw', () => ({ default: '<svg>bits</svg>' }));
vi.mock('../assets/icons/next-level.svg?raw', () => ({ default: '<svg>next-level</svg>' }));
vi.mock('../assets/icons/xdata.svg?raw', () => ({ default: '<svg>xdata</svg>' }));
vi.mock('../assets/icons/booster.svg?raw', () => ({ default: '<svg>booster</svg>' }));
vi.mock('../assets/icons/sword.svg?raw', () => ({ default: '<svg>sword</svg>' }));
vi.mock('../assets/icons/dual-blade.svg?raw', () => ({ default: '<svg>dual-blade</svg>' }));
vi.mock('../assets/icons/lance.svg?raw', () => ({ default: '<svg>lance</svg>' }));
vi.mock('../assets/icons/hammer.svg?raw', () => ({ default: '<svg>hammer</svg>' }));
vi.mock('../assets/icons/recovery.svg?raw', () => ({ default: '<svg>recovery</svg>' }));
vi.mock('../assets/icons/blast.svg?raw', () => ({ default: '<svg>blast</svg>' }));
vi.mock('../assets/icons/ranged.svg?raw', () => ({ default: '<svg>ranged</svg>' }));
vi.mock('../assets/icons/core.svg?raw', () => ({ default: '<svg>core</svg>' }));
vi.mock('../assets/icons/chip.svg?raw', () => ({ default: '<svg>chip</svg>' }));

import { formatItemLabel } from './ItemDisplay';
import { WeaponItem } from './weapons/WeaponItem';
import { ChipItem } from './chips/ChipItem';
import { CoreItem } from './cores/CoreItem';
import { Item } from './Item';
import { WeaponType } from './weapons/WeaponType';
import { ChipType } from './chips/Chip';
import { Tier } from './TierManager';
import { ItemLevelHelper } from './ItemLevelHelper';
import { CoreType } from './cores/Core';

const stableTier = {
    name: Tier.STABLE,
    minPercent: -3,
    maxPercent: 3,
    rimColor: '#ffffff',
    innerColor: '#999999',
    traderChance: 0.44,
    minLevel: 0,
};

function makeWeapon(level = 1): WeaponItem {
    return new WeaponItem('w1', 'Test Sword', 100, 50, WeaponType.SWORD, 10, 'model.glb', stableTier, level);
}

function makeChip(level = 1): ChipItem {
    return new ChipItem('c1', 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.10 }, level);
}

function makeCore(level = 1): CoreItem {
    return new CoreItem('core1', 'Herald Core', 200, 100, { strength: 3, defense: 2 }, level, CoreType.HERALD);
}

class PlainItem extends Item {
    getType() { return 'plain'; }
    clone() { return new PlainItem(this.id, this.name, this.baseBuyPrice, this.baseSellPrice); }
}

describe('formatItemLabel', () => {
    it('returns a string containing the weapon name and level char for WeaponItem', () => {
        const weapon = makeWeapon(1);
        const levelChar = ItemLevelHelper.getLevelChar(1);
        const label = formatItemLabel(weapon);
        expect(label).toContain(weapon.name);
        expect(label).toContain(levelChar);
    });

    it('returns a string containing the chip name for ChipItem', () => {
        const chip = makeChip(1);
        const label = formatItemLabel(chip);
        expect(label).toContain(chip.name);
    });

    it('returns a string containing the core name for CoreItem', () => {
        const core = makeCore(1);
        const label = formatItemLabel(core);
        expect(label).toContain(core.name);
    });

    it('returns item name for plain Item', () => {
        const item = new PlainItem('p1', 'Plain Item', 10, 5);
        const label = formatItemLabel(item);
        expect(label).toBe('Plain Item');
    });

    it('includes priceText when provided for plain Item', () => {
        const item = new PlainItem('p1', 'Plain Item', 10, 5);
        const label = formatItemLabel(item, ' [100 bits]');
        expect(label).toContain('Plain Item');
        expect(label).toContain('[100 bits]');
    });

    it('includes priceText when provided for WeaponItem', () => {
        const weapon = makeWeapon(1);
        const label = formatItemLabel(weapon, ' [500 bits]');
        expect(label).toContain(weapon.name);
        expect(label).toContain('[500 bits]');
    });

    it('includes priceText when provided for ChipItem', () => {
        const chip = makeChip(2);
        const label = formatItemLabel(chip, ' [200 bits]');
        expect(label).toContain(chip.name);
        expect(label).toContain('[200 bits]');
    });

    it('wraps WeaponItem label in a colored span', () => {
        const weapon = makeWeapon(1);
        const label = formatItemLabel(weapon);
        expect(label).toContain('<span style="color:');
    });
});
