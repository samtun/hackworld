import { WeaponType } from '../items/weapons/WeaponType';
import { SkillTechType } from '../skills/SkillTechType';

// SVG files imported as raw strings via Vite's ?raw loader
import hpRaw from '../assets/icons/hp.svg?raw';
import tpRaw from '../assets/icons/tp.svg?raw';
import strengthRaw from '../assets/icons/strength.svg?raw';
import defenseRaw from '../assets/icons/defense.svg?raw';
import agilityRaw from '../assets/icons/agility.svg?raw';
import luckRaw from '../assets/icons/luck.svg?raw';
import bitsRaw from '../assets/icons/bits.svg?raw';
import nextLevelRaw from '../assets/icons/next-level.svg?raw';
import xdataRaw from '../assets/icons/xdata.svg?raw';
import boosterRaw from '../assets/icons/booster.svg?raw';
import swordRaw from '../assets/icons/sword.svg?raw';
import dualBladeRaw from '../assets/icons/dual-blade.svg?raw';
import lanceRaw from '../assets/icons/lance.svg?raw';
import hammerRaw from '../assets/icons/hammer.svg?raw';
import recoveryRaw from '../assets/icons/recovery.svg?raw';
import blastRaw from '../assets/icons/blast.svg?raw';
import rangedRaw from '../assets/icons/ranged.svg?raw';
import coreRaw from '../assets/icons/core.svg?raw';
import chipRaw from '../assets/icons/chip.svg?raw';

/**
 * Injects inline display styles into a raw SVG string so the icon renders
 * at 1em × 1em, vertically aligned with surrounding text, with currentColor fill.
 */
function makeIcon(svgRaw: string): string {
    return svgRaw
        .replace(/<svg /, '<svg style="width:1em;height:1em;vertical-align:middle;display:inline-block;margin-right:3px;" fill="currentColor" ')
        .trim();
}

// ─── Stat Icons ───────────────────────────────────────────────────────────────

export const ICON_HP       = makeIcon(hpRaw);
export const ICON_TP       = makeIcon(tpRaw);
export const ICON_STRENGTH = makeIcon(strengthRaw);
export const ICON_DEFENSE  = makeIcon(defenseRaw);
export const ICON_AGILITY  = makeIcon(agilityRaw);
export const ICON_LUCK     = makeIcon(luckRaw);

// ─── Misc / Currency Icons ────────────────────────────────────────────────────

export const ICON_BITS    = makeIcon(bitsRaw);
export const ICON_NEXTLVL = makeIcon(nextLevelRaw);
export const ICON_XDATA   = makeIcon(xdataRaw);
export const ICON_BOOSTER = makeIcon(boosterRaw);

// ─── Weapon Icons (also used as weapon tech icons) ────────────────────────────

export const ICON_SWORD      = makeIcon(swordRaw);
export const ICON_DUAL_BLADE = makeIcon(dualBladeRaw);
export const ICON_LANCE      = makeIcon(lanceRaw);
export const ICON_HAMMER     = makeIcon(hammerRaw);

// ─── Skill Tech Icons ─────────────────────────────────────────────────────────

export const ICON_RECOVERY = makeIcon(recoveryRaw);
export const ICON_BLAST    = makeIcon(blastRaw);
export const ICON_RANGED   = makeIcon(rangedRaw);

// ─── Item Type Icons ──────────────────────────────────────────────────────────

/** Core – CPU chip with connector pins */
export const ICON_CORE = makeIcon(coreRaw);
/** Chip – IC chip with pins on all sides */
export const ICON_CHIP = makeIcon(chipRaw);

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Returns the icon for a given weapon type.
 * Used both for tech labels in the stats panel and as a prefix icon on weapon items.
 */
export function getWeaponIcon(weaponType: WeaponType): string {
    switch (weaponType) {
        case WeaponType.SWORD:      return ICON_SWORD;
        case WeaponType.DUAL_BLADE: return ICON_DUAL_BLADE;
        case WeaponType.LANCE:      return ICON_LANCE;
        case WeaponType.HAMMER:     return ICON_HAMMER;
        default: return '';
    }
}

/**
 * Returns the icon for a given skill tech type.
 */
export function getSkillTechIcon(skillTechType: SkillTechType): string {
    switch (skillTechType) {
        case SkillTechType.RECOVERY: return ICON_RECOVERY;
        case SkillTechType.BLAST:    return ICON_BLAST;
        case SkillTechType.RANGED:   return ICON_RANGED;
        default: return '';
    }
}

