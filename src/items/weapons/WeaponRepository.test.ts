import { describe, it, expect } from 'vitest';
import { WeaponRepository } from './WeaponRepository';
import { WeaponType } from './WeaponType';

describe('WeaponRepository', () => {
    const repo = WeaponRepository.Instance;

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(WeaponRepository.Instance).toBe(repo);
        });
    });

    describe('getAllWeapons', () => {
        it('returns a non-empty list of weapons', () => {
            const weapons = repo.getAllWeapons();
            expect(weapons.length).toBeGreaterThan(0);
        });

        it('returns clones (not the internal instances)', () => {
            repo.getAllWeapons();
            // two calls produce different object references
            const weapons2 = repo.getAllWeapons();
            expect(weapons2[0]).not.toBe(repo.getAllWeapons()[0]);
        });

        it('all weapons have valid weapon types', () => {
            const validTypes = Object.values(WeaponType);
            for (const w of repo.getAllWeapons()) {
                expect(validTypes).toContain(w.weaponType);
            }
        });
    });

    describe('getWeaponByTypeAndLevel', () => {
        it('returns a weapon for a valid type and level 1', () => {
            const weapon = repo.getWeaponByTypeAndLevel(WeaponType.SWORD, 1);
            expect(weapon).toBeDefined();
            expect(weapon.weaponType).toBe(WeaponType.SWORD);
            expect(weapon.level).toBe(1);
        });

        it('throws for an invalid level', () => {
            expect(() => repo.getWeaponByTypeAndLevel(WeaponType.SWORD, 999)).toThrow();
        });

        it('throws for level 0', () => {
            expect(() => repo.getWeaponByTypeAndLevel(WeaponType.SWORD, 0)).toThrow();
        });
    });

    describe('getRandomWeaponOfLevel', () => {
        it('returns a weapon for a valid level', () => {
            const weapon = repo.getRandomWeaponOfLevel(1);
            expect(weapon).toBeDefined();
            expect(weapon!.level).toBe(1);
        });

        it('returns undefined for an out-of-range level', () => {
            expect(repo.getRandomWeaponOfLevel(999)).toBeUndefined();
        });

        it('returns undefined for level 0', () => {
            expect(repo.getRandomWeaponOfLevel(0)).toBeUndefined();
        });
    });

    describe('getWeaponById', () => {
        it('returns a weapon for a known id', () => {
            const allWeapons = repo.getAllWeapons();
            const target = allWeapons[0];
            const found = repo.getWeaponById(target.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(target.id);
        });

        it('returns undefined for an unknown id', () => {
            expect(repo.getWeaponById('non-existent-id')).toBeUndefined();
        });
    });

    describe('getWeaponsByType', () => {
        it('returns only weapons of the requested type', () => {
            const swords = repo.getWeaponsByType(WeaponType.SWORD);
            expect(swords.length).toBeGreaterThan(0);
            for (const w of swords) {
                expect(w.weaponType).toBe(WeaponType.SWORD);
            }
        });
    });
});
