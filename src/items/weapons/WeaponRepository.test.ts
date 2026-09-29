import { describe, it, expect } from 'vitest';
import { WeaponRepository } from './WeaponRepository';
import { WeaponType } from './WeaponType';
import { mockDeep } from 'vitest-mock-extended';
import { TierManager } from '../TierManager';

function makeWeaponRepository(): WeaponRepository {
    const tierManager = mockDeep<TierManager>();
    return new WeaponRepository(tierManager);
}

describe('WeaponRepository', () => {
    describe('getAllWeapons', () => {
        it('returns a non-empty list of weapons', () => {
            const repo = makeWeaponRepository();
            const weapons = repo.getAllWeapons();
            expect(weapons.length).toBeGreaterThan(0);
        });

        it('expands each weapon family into all six levels', () => {
            const repo = makeWeaponRepository();

            expect(repo.getAllWeapons()).toHaveLength(30);
            expect(repo.getWeaponById('aegis_sword_alpha')?.level).toBe(1);
            expect(repo.getWeaponById('aegis_sword_omega')?.level).toBe(6);
        });

        it('returns clones (not the internal instances)', () => {
            const repo = makeWeaponRepository();
            repo.getAllWeapons();
            // two calls produce different object references
            const weapons2 = repo.getAllWeapons();
            expect(weapons2[0]).not.toBe(repo.getAllWeapons()[0]);
        });

        it('all weapons have valid weapon types', () => {
            const validTypes = Object.values(WeaponType);
            const repo = makeWeaponRepository();
            for (const w of repo.getAllWeapons()) {
                expect(validTypes).toContain(w.weaponType);
            }
        });
    });

    describe('getWeaponByTypeAndLevel', () => {
        it('returns a weapon for a valid type and level 1', () => {
            const repo = makeWeaponRepository();
            const weapon = repo.getWeaponByTypeAndLevel(WeaponType.SWORD, 1);
            expect(weapon).toBeDefined();
            expect(weapon.weaponType).toBe(WeaponType.SWORD);
            expect(weapon.level).toBe(1);
        });

        it('derives the sell price by rounding down one third of the price', () => {
            const repo = makeWeaponRepository();
            const weapon = repo.getWeaponByTypeAndLevel(WeaponType.SWORD, 1);

            expect(weapon.buyPrice).toBe(100);
            expect(weapon.sellPrice).toBe(33);
        });

        it('loads the price and damage associated with the requested level', () => {
            const repo = makeWeaponRepository();
            const weapon = repo.getWeaponByTypeAndLevel(WeaponType.DUAL_BLADE, 4);

            expect(weapon.buyPrice).toBe(940);
            expect(weapon.sellPrice).toBe(313);
            expect(weapon.damage).toBe(500);
            expect(weapon.id).toBe('rune_blade_delta');
        });

        it('includes the Tampered Blade as a stronger dual blade', () => {
            const repo = makeWeaponRepository();
            const runeBlade = repo.getWeaponById('rune_blade_alpha');
            const tamperedBlade = repo.getWeaponById('tampered_blade_alpha');

            expect(repo.getWeaponsByType(WeaponType.DUAL_BLADE)).toHaveLength(12);
            expect(tamperedBlade?.name).toBe('Tampered Blade');
            expect(tamperedBlade?.weaponType).toBe(WeaponType.DUAL_BLADE);
            expect(tamperedBlade?.model).toBe('models/tampered_blade.glb');
            expect(tamperedBlade?.buyPrice).toBeGreaterThan(runeBlade!.buyPrice);
            expect(tamperedBlade?.damage).toBeGreaterThan(runeBlade!.damage);
        });

        it('throws for an invalid level', () => {
            const repo = makeWeaponRepository();
            expect(() => repo.getWeaponByTypeAndLevel(WeaponType.SWORD, 999)).toThrow();
        });

        it('throws for level 0', () => {
            const repo = makeWeaponRepository();
            expect(() => repo.getWeaponByTypeAndLevel(WeaponType.SWORD, 0)).toThrow();
        });
    });

    describe('getRandomWeaponOfLevel', () => {
        it('returns a weapon for a valid level', () => {
            const repo = makeWeaponRepository();
            const weapon = repo.getRandomWeaponOfLevel(1);
            expect(weapon).toBeDefined();
            expect(weapon!.level).toBe(1);
        });

        it('returns undefined for an out-of-range level', () => {
            const repo = makeWeaponRepository();
            expect(repo.getRandomWeaponOfLevel(999)).toBeUndefined();
        });

        it('returns undefined for level 0', () => {
            const repo = makeWeaponRepository();
            expect(repo.getRandomWeaponOfLevel(0)).toBeUndefined();
        });
    });

    describe('getWeaponById', () => {
        it('returns a weapon for a known id', () => {
            const repo = makeWeaponRepository();
            const allWeapons = repo.getAllWeapons();
            const target = allWeapons[0];
            const found = repo.getWeaponById(target.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(target.id);
        });

        it('returns undefined for an unknown id', () => {
            const repo = makeWeaponRepository();
            expect(repo.getWeaponById('non-existent-id')).toBeUndefined();
        });
    });

    describe('getWeaponsByType', () => {
        it('returns only weapons of the requested type', () => {
            const repo = makeWeaponRepository();
            const swords = repo.getWeaponsByType(WeaponType.SWORD);
            expect(swords.length).toBeGreaterThan(0);
            for (const w of swords) {
                expect(w.weaponType).toBe(WeaponType.SWORD);
            }
        });
    });
});
