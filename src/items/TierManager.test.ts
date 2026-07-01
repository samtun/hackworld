import { describe, it, expect } from 'vitest';
import { TierManager, Tier } from './TierManager';

describe('TierManager', () => {
    const mgr = TierManager.Instance;

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(TierManager.Instance).toBe(mgr);
        });
    });

    describe('getWeaponTierForMultiplier', () => {
        it('returns BROKEN for a multiplier below -3%', () => {
            // -10% bonus => multiplier 0.90
            expect(mgr.getWeaponTierForMultiplier(0.90).name).toBe(Tier.BROKEN);
        });

        it('returns STABLE for a multiplier within [-3%, +3%)', () => {
            expect(mgr.getWeaponTierForMultiplier(1.00).name).toBe(Tier.STABLE);
            expect(mgr.getWeaponTierForMultiplier(0.98).name).toBe(Tier.STABLE); // -2%
            expect(mgr.getWeaponTierForMultiplier(1.02).name).toBe(Tier.STABLE);
        });

        it('returns MAINTAINED for a multiplier within [+3%, +8%)', () => {
            expect(mgr.getWeaponTierForMultiplier(1.05).name).toBe(Tier.MAINTAINED);
        });

        it('returns OVERCLOCKED for a multiplier within [+8%, +12%)', () => {
            expect(mgr.getWeaponTierForMultiplier(1.10).name).toBe(Tier.OVERCLOCKED);
        });

        it('returns ZERODAY for a multiplier within [+12%, +16%)', () => {
            expect(mgr.getWeaponTierForMultiplier(1.14).name).toBe(Tier.ZERODAY);
        });

        it('returns LEET for a multiplier of +16% or above', () => {
            expect(mgr.getWeaponTierForMultiplier(1.20).name).toBe(Tier.LEET);
        });
    });

    describe('getSkillTierForTech', () => {
        it('returns STABLE for low tech points', () => {
            expect(mgr.getSkillTierForTech(0)).toBe(Tier.STABLE);
            expect(mgr.getSkillTierForTech(59)).toBe(Tier.STABLE);
        });

        it('returns MAINTAINED at 60 tech points', () => {
            expect(mgr.getSkillTierForTech(60)).toBe(Tier.MAINTAINED);
            expect(mgr.getSkillTierForTech(279)).toBe(Tier.MAINTAINED);
        });

        it('returns OVERCLOCKED at 280 tech points', () => {
            expect(mgr.getSkillTierForTech(280)).toBe(Tier.OVERCLOCKED);
            expect(mgr.getSkillTierForTech(879)).toBe(Tier.OVERCLOCKED);
        });

        it('returns ZERODAY at 880 tech points', () => {
            expect(mgr.getSkillTierForTech(880)).toBe(Tier.ZERODAY);
            expect(mgr.getSkillTierForTech(1799)).toBe(Tier.ZERODAY);
        });

        it('returns LEET at 1800 tech points', () => {
            expect(mgr.getSkillTierForTech(1800)).toBe(Tier.LEET);
            expect(mgr.getSkillTierForTech(9999)).toBe(Tier.LEET);
        });
    });
});
