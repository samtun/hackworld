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

import {
    getWeaponIcon,
    getSkillTechIcon,
    ICON_HP, ICON_TP, ICON_STRENGTH, ICON_DEFENSE, ICON_AGILITY, ICON_LUCK,
    ICON_BITS, ICON_NEXTLVL, ICON_XDATA, ICON_BOOSTER,
    ICON_SWORD, ICON_DUAL_BLADE, ICON_LANCE, ICON_HAMMER,
    ICON_RECOVERY, ICON_BLAST, ICON_RANGED,
    ICON_CORE, ICON_CHIP,
} from './StatIcons';
import { WeaponType } from '../items/weapons/WeaponType';
import { SkillTechType } from '../player/skills/SkillType';

describe('getWeaponIcon', () => {
    it('returns non-empty string for SWORD', () => {
        expect(getWeaponIcon(WeaponType.SWORD)).toContain('svg');
    });

    it('returns non-empty string for DUAL_BLADE', () => {
        expect(getWeaponIcon(WeaponType.DUAL_BLADE)).toContain('svg');
    });

    it('returns non-empty string for LANCE', () => {
        expect(getWeaponIcon(WeaponType.LANCE)).toContain('svg');
    });

    it('returns non-empty string for HAMMER', () => {
        expect(getWeaponIcon(WeaponType.HAMMER)).toContain('svg');
    });

    it('returns empty string for unknown weapon type', () => {
        expect(getWeaponIcon('unknown' as any)).toBe('');
    });
});

describe('getSkillTechIcon', () => {
    it('returns non-empty string for RECOVERY', () => {
        expect(getSkillTechIcon(SkillTechType.RECOVERY)).toContain('svg');
    });

    it('returns non-empty string for BLAST', () => {
        expect(getSkillTechIcon(SkillTechType.BLAST)).toContain('svg');
    });

    it('returns non-empty string for RANGED', () => {
        expect(getSkillTechIcon(SkillTechType.RANGED)).toContain('svg');
    });

    it('returns empty string for unknown skill tech type', () => {
        expect(getSkillTechIcon('unknown' as any)).toBe('');
    });
});

describe('exported icon constants', () => {
    it('stat icons are non-empty strings', () => {
        expect(ICON_HP).toBeTruthy();
        expect(ICON_TP).toBeTruthy();
        expect(ICON_STRENGTH).toBeTruthy();
        expect(ICON_DEFENSE).toBeTruthy();
        expect(ICON_AGILITY).toBeTruthy();
        expect(ICON_LUCK).toBeTruthy();
    });

    it('misc icons are non-empty strings', () => {
        expect(ICON_BITS).toBeTruthy();
        expect(ICON_NEXTLVL).toBeTruthy();
        expect(ICON_XDATA).toBeTruthy();
        expect(ICON_BOOSTER).toBeTruthy();
    });

    it('weapon icons are non-empty strings', () => {
        expect(ICON_SWORD).toBeTruthy();
        expect(ICON_DUAL_BLADE).toBeTruthy();
        expect(ICON_LANCE).toBeTruthy();
        expect(ICON_HAMMER).toBeTruthy();
    });

    it('skill tech icons are non-empty strings', () => {
        expect(ICON_RECOVERY).toBeTruthy();
        expect(ICON_BLAST).toBeTruthy();
        expect(ICON_RANGED).toBeTruthy();
    });

    it('item type icons are non-empty strings', () => {
        expect(ICON_CORE).toBeTruthy();
        expect(ICON_CHIP).toBeTruthy();
    });
});
