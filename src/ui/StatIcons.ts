import { WeaponType } from '../items/weapons/WeaponType';
import { SkillTechType } from '../skills/SkillTechType';

/**
 * Returns an inline SVG icon string sized to 1em × 1em with currentColor fill,
 * so the icon inherits the surrounding CSS text color automatically.
 */
function icon(svgContent: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width:1em;height:1em;vertical-align:middle;display:inline-block;margin-right:3px;" fill="currentColor">${svgContent}</svg>`;
}

// ─── Stat Icons ───────────────────────────────────────────────────────────────

/** HP – heart */
export const ICON_HP = icon(
    `<path d="M256 432C80 320 16 255 16 175c0-85 60-127 147-127 37 0 77 26 93 56 16-30 56-56 93-56 87 0 147 42 147 127 0 80-74 145-240 257z"/>`
);

/** TP – lightning bolt */
export const ICON_TP = icon(
    `<polygon points="240,60 380,60 300,260 420,260 280,460 140,460 220,260 100,260"/>`
);

/** Strength – dumbbell / barbell */
export const ICON_STRENGTH = icon(
    `<circle cx="120" cy="256" r="76"/><rect x="120" y="222" width="272" height="68" rx="6"/><circle cx="392" cy="256" r="76"/>`
);

/** Defense – heater shield */
export const ICON_DEFENSE = icon(
    `<path d="M256 48L456 160C456 300 376 420 256 480C136 420 56 300 56 160Z"/>`
);

/** Agility – rightward arrow */
export const ICON_AGILITY = icon(
    `<polygon points="80,192 80,320 240,320 240,432 432,256 240,80 240,192"/>`
);

/** Luck – five-point star */
export const ICON_LUCK = icon(
    `<polygon points="256,36 308,185 465,188 340,283 385,434 256,344 127,434 172,283 47,188 204,185"/>`
);

// ─── Misc / Currency Icons ────────────────────────────────────────────────────

/** Bits – hexagonal token ring (digital coin) */
export const ICON_BITS = icon(
    `<path fill-rule="evenodd" d="M256,48 L440,152 L440,360 L256,464 L72,360 L72,152 Z M256,152 L346,204 L346,308 L256,360 L166,308 L166,204 Z"/>`
);

/** Next level XP – upward arrow */
export const ICON_NEXTLVL = icon(
    `<polygon points="256,48 432,248 320,248 320,464 192,464 192,248 80,248"/>`
);

/** X-Data – data chip (square ring) */
export const ICON_XDATA = icon(
    `<path fill-rule="evenodd" d="M80,80 L432,80 L432,432 L80,432 Z M160,160 L352,160 L352,352 L160,352 Z"/>`
);

/** Booster Packs – gift box with ribbon */
export const ICON_BOOSTER = icon(
    `<rect x="56" y="200" width="400" height="280" rx="24"/>` +
    `<rect x="56" y="120" width="400" height="88" rx="24"/>` +
    `<rect x="224" y="120" width="64" height="360"/>`
);

// ─── Weapon Tech Icons (also used as weapon item icons) ───────────────────────

/** Sword – diagonal blade with crossguard */
export const ICON_SWORD = icon(
    `<polygon points="416,68 452,104 104,452 68,416"/>` +
    `<polygon points="244,352 232,364 148,280 160,268"/>`
);

/** Dual Blade – two crossing diagonal bars (X pattern) */
export const ICON_DUAL_BLADE = icon(
    `<polygon points="68,68 148,68 444,364 444,444 364,444 68,148"/>` +
    `<polygon points="364,68 444,68 444,148 148,444 68,444 68,364"/>`
);

/** Lance – long thin shaft with triangular tip */
export const ICON_LANCE = icon(
    `<polygon points="91,471 69,449 369,149 452,88 391,171"/>`
);

/** Hammer – wide rectangular head with thin handle */
export const ICON_HAMMER = icon(
    `<rect x="156" y="56" width="240" height="200" rx="24"/>` +
    `<rect x="228" y="248" width="56" height="240" rx="16"/>`
);

// ─── Skill Tech Icons ─────────────────────────────────────────────────────────

/** Recovery – medical cross */
export const ICON_RECOVERY = icon(
    `<rect x="192" y="56" width="128" height="400" rx="24"/>` +
    `<rect x="56" y="192" width="400" height="128" rx="24"/>`
);

/** Blast – twelve-point starburst / explosion */
export const ICON_BLAST = icon(
    `<polygon points="256,32 296,176 400,80 344,208 488,216 384,296 456,408 320,368 288,504 256,368 224,504 192,368 56,408 128,296 24,216 168,208 112,80 216,176"/>`
);

/** Ranged – bullseye target with crosshair */
export const ICON_RANGED = icon(
    `<circle cx="256" cy="256" r="208" fill="none" stroke="currentColor" stroke-width="48"/>` +
    `<circle cx="256" cy="256" r="120" fill="none" stroke="currentColor" stroke-width="48"/>` +
    `<circle cx="256" cy="256" r="40"/>` +
    `<rect x="232" y="16" width="48" height="480" rx="8"/>` +
    `<rect x="16" y="232" width="480" height="48" rx="8"/>`
);

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/**
 * Returns the inline SVG icon for a given weapon type.
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
 * Returns the inline SVG icon for a given skill tech type.
 */
export function getSkillTechIcon(skillTechType: SkillTechType): string {
    switch (skillTechType) {
        case SkillTechType.RECOVERY: return ICON_RECOVERY;
        case SkillTechType.BLAST:    return ICON_BLAST;
        case SkillTechType.RANGED:   return ICON_RANGED;
        default: return '';
    }
}
