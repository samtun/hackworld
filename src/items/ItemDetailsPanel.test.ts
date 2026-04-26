import { describe, it, expect } from 'vitest';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { WeaponItem } from './weapons/WeaponItem';
import { CoreItem } from './cores/CoreItem';
import { ChipItem } from './chips/ChipItem';
import { ChipType } from './chips/Chip';
import { WeaponType } from './weapons/WeaponType';
import { Tier, TierManager } from './TierManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTierDef(t: Tier) {
    return TierManager.Instance.tiers.get(t)!;
}

function makeWeapon(damage: number, id = 'w1'): WeaponItem {
    return new WeaponItem(id, 'Sword', 100, 50, WeaponType.SWORD, damage, 'model.glb', getTierDef(Tier.STABLE), 1);
}

function makeCore(stats: { strength?: number; defense?: number; agility?: number }, id = 'c1'): CoreItem {
    return new CoreItem(id, 'Herald Core', 200, 100, stats, 1);
}

function makeChip(stats: { weaponRangeMultiplier?: number; walkSpeedMultiplier?: number; luckMultiplier?: number; criticalDamageMultiplier?: number; healingMultiplier?: number }, id = 'ch1'): ChipItem {
    return new ChipItem(id, 'Firewire', 150, 75, ChipType.FIREWIRE, stats, 1);
}

// ─── generateHTML – no comparison ────────────────────────────────────────────

describe('ItemDetailsPanel.generateHTML – no equipped item', () => {
    it('returns empty string for undefined item', () => {
        expect(ItemDetailsPanel.generateHTML(undefined)).toBe('');
    });

    it('shows weapon damage without delta badge', () => {
        const html = ItemDetailsPanel.generateHTML(makeWeapon(30));
        expect(html).toContain('Damage');
        expect(html).toContain('30');
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });

    it('shows core stats without delta badge', () => {
        const html = ItemDetailsPanel.generateHTML(makeCore({ strength: 16, defense: -5 }));
        expect(html).toContain('+16');
        expect(html).toContain('-5');
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });

    it('shows chip multiplier without delta badge', () => {
        const html = ItemDetailsPanel.generateHTML(makeChip({ weaponRangeMultiplier: 1.1 }));
        expect(html).toContain('+10%');
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });
});

// ─── generateHTML – same item equipped (no delta) ────────────────────────────

describe('ItemDetailsPanel.generateHTML – same item is equipped', () => {
    it('shows no delta badge when selected item IS the equipped item', () => {
        const weapon = makeWeapon(30);
        const html = ItemDetailsPanel.generateHTML(weapon, weapon);
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });

    it('shows no delta badge for a core when it is its own equipped item', () => {
        const core = makeCore({ strength: 10 });
        const html = ItemDetailsPanel.generateHTML(core, core);
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });
});

// ─── generateHTML – WeaponItem comparison ────────────────────────────────────

describe('ItemDetailsPanel.generateHTML – weapon comparison', () => {
    it('shows green ▲ badge when new weapon has higher damage', () => {
        const newWeapon = makeWeapon(50, 'w2');
        const equipped = makeWeapon(30, 'w1');
        const html = ItemDetailsPanel.generateHTML(newWeapon, equipped);
        expect(html).toContain('▲');
        expect(html).toContain('+20');
        expect(html).toContain('#44ff44');
    });

    it('shows red ▼ badge when new weapon has lower damage', () => {
        const newWeapon = makeWeapon(20, 'w2');
        const equipped = makeWeapon(30, 'w1');
        const html = ItemDetailsPanel.generateHTML(newWeapon, equipped);
        expect(html).toContain('▼');
        expect(html).toContain('-10');
        expect(html).toContain('#ff4444');
    });

    it('shows no delta badge when damage is equal', () => {
        const newWeapon = makeWeapon(30, 'w2');
        const equipped = makeWeapon(30, 'w1');
        const html = ItemDetailsPanel.generateHTML(newWeapon, equipped);
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });

    it('does not show delta on non-damage rows (Type, Tier, Price)', () => {
        const newWeapon = makeWeapon(50, 'w2');
        const equipped = makeWeapon(30, 'w1');
        const html = ItemDetailsPanel.generateHTML(newWeapon, equipped);
        // Only one delta badge total (for Damage)
        const badgeCount = (html.match(/▲|▼/g) || []).length;
        expect(badgeCount).toBe(1);
    });
});

// ─── generateHTML – CoreItem comparison ──────────────────────────────────────

describe('ItemDetailsPanel.generateHTML – core comparison', () => {
    it('shows positive deltas in green', () => {
        const newCore = makeCore({ strength: 16, defense: 5 }, 'c2');
        const equipped = makeCore({ strength: 3, defense: 14 }, 'c1');
        const html = ItemDetailsPanel.generateHTML(newCore, equipped);
        // Strength: 16 - 3 = +13
        expect(html).toContain('▲');
        expect(html).toContain('+13');
        // Defense: 5 - 14 = -9
        expect(html).toContain('▼');
        expect(html).toContain('-9');
    });

    it('includes stat row for a stat present only on equipped item (with loss shown)', () => {
        // New core has no agility, equipped has agility: 22
        const newCore = makeCore({ strength: 10 }, 'c2');
        const equipped = makeCore({ strength: 10, agility: 22 }, 'c1');
        const html = ItemDetailsPanel.generateHTML(newCore, equipped);
        // Agility row should appear as "0" with a ▼ -22 badge
        expect(html).toContain('Agility');
        expect(html).toContain('▼');
        expect(html).toContain('-22');
    });

    it('includes stat row for a stat present only on new item (as gain)', () => {
        // New core has agility, equipped does not
        const newCore = makeCore({ strength: 5, agility: 15 }, 'c2');
        const equipped = makeCore({ strength: 5 }, 'c1');
        const html = ItemDetailsPanel.generateHTML(newCore, equipped);
        expect(html).toContain('Agility');
        expect(html).toContain('▲');
        expect(html).toContain('+15');
    });

    it('shows no delta badge when stats are identical', () => {
        const newCore = makeCore({ strength: 10 }, 'c2');
        const equipped = makeCore({ strength: 10 }, 'c1');
        const html = ItemDetailsPanel.generateHTML(newCore, equipped);
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });

    it('correctly computes delta when new item has a negative stat value', () => {
        // New core: defense -3, equipped core: defense 5 → delta = -3 - 5 = -8
        const newCore = makeCore({ defense: -3 }, 'c2');
        const equipped = makeCore({ defense: 5 }, 'c1');
        const html = ItemDetailsPanel.generateHTML(newCore, equipped);
        expect(html).toContain('▼');
        expect(html).toContain('-8');
        expect(html).toContain('#ff4444');
    });

    it('does not compare against a weapon or chip passed as equippedItem', () => {
        const newCore = makeCore({ strength: 10 });
        const weapon = makeWeapon(30);
        const html = ItemDetailsPanel.generateHTML(newCore, weapon);
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });
});

// ─── generateHTML – ChipItem comparison ──────────────────────────────────────

describe('ItemDetailsPanel.generateHTML – chip comparison', () => {
    it('shows positive percentage-point delta in green', () => {
        const newChip = makeChip({ walkSpeedMultiplier: 1.12 }, 'ch2');
        const equipped = makeChip({ walkSpeedMultiplier: 1.10 }, 'ch1');
        const html = ItemDetailsPanel.generateHTML(newChip, equipped);
        expect(html).toContain('▲');
        expect(html).toContain('+2%');
        expect(html).toContain('#44ff44');
    });

    it('shows negative percentage-point delta in red', () => {
        const newChip = makeChip({ luckMultiplier: 1.05 }, 'ch2');
        const equipped = makeChip({ luckMultiplier: 1.20 }, 'ch1');
        const html = ItemDetailsPanel.generateHTML(newChip, equipped);
        expect(html).toContain('▼');
        expect(html).toContain('-15%');
        expect(html).toContain('#ff4444');
    });

    it('shows row with +0% and loss delta when new chip lacks a multiplier the equipped has', () => {
        const newChip = makeChip({ weaponRangeMultiplier: 1.10 }, 'ch2');
        const equipped = makeChip({ weaponRangeMultiplier: 1.10, healingMultiplier: 1.25 }, 'ch1');
        const html = ItemDetailsPanel.generateHTML(newChip, equipped);
        expect(html).toContain('Healing');
        expect(html).toContain('+0%');
        expect(html).toContain('▼');
        expect(html).toContain('-25%');
    });

    it('shows row with delta gain when equipped chip lacks a multiplier the new has', () => {
        const newChip = makeChip({ criticalDamageMultiplier: 1.20 }, 'ch2');
        const equipped = makeChip({ walkSpeedMultiplier: 1.10 }, 'ch1');
        const html = ItemDetailsPanel.generateHTML(newChip, equipped);
        // criticalDamageMultiplier gain: +20% (1.20 vs 1.00)
        expect(html).toContain('Crit Damage');
        expect(html).toContain('▲');
        expect(html).toContain('+20%');
        // walkSpeedMultiplier loss: -10% (1.00 vs 1.10)
        expect(html).toContain('Walk Speed');
        expect(html).toContain('▼');
        expect(html).toContain('-10%');
    });

    it('shows no delta badge when multiplier values are equal', () => {
        const newChip = makeChip({ weaponRangeMultiplier: 1.10 }, 'ch2');
        const equipped = makeChip({ weaponRangeMultiplier: 1.10 }, 'ch1');
        const html = ItemDetailsPanel.generateHTML(newChip, equipped);
        expect(html).not.toContain('▲');
        expect(html).not.toContain('▼');
    });

    it('rounds fractional percentage-point differences correctly', () => {
        // 1.11 - 1.10 → 0.010...* 100 ≈ 1.000... → rounds to 1
        const newChip = makeChip({ walkSpeedMultiplier: 1.11 }, 'ch2');
        const equipped = makeChip({ walkSpeedMultiplier: 1.10 }, 'ch1');
        const html = ItemDetailsPanel.generateHTML(newChip, equipped);
        expect(html).toContain('▲');
        expect(html).toContain('+1%');
    });
});
