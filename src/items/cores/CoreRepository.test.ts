import { describe, it, expect } from 'vitest';
import { CoreRepository } from './CoreRepository';

describe('CoreRepository', () => {
    const repo = new CoreRepository();

    describe('getAllCores', () => {
        it('returns a non-empty list of cores', () => {
            expect(repo.getAllCores().length).toBeGreaterThan(0);
        });
    });

    describe('getCoreByNameAndLevel', () => {
        it('returns a core for a known name and level', () => {
            const all = repo.getAllCores();
            const target = all[0];
            const found = repo.getCoreByNameAndLevel(target.name, target.level);
            expect(found).toBeDefined();
            expect(found!.name).toBe(target.name);
            expect(found!.level).toBe(target.level);
        });

        it('returns undefined for an unknown name', () => {
            expect(repo.getCoreByNameAndLevel('NonExistentCore', 1)).toBeUndefined();
        });

        it('returns undefined for an out-of-range level', () => {
            expect(repo.getCoreByNameAndLevel('Herald Core', 999)).toBeUndefined();
        });

        it('returns undefined for level 0', () => {
            expect(repo.getCoreByNameAndLevel('Herald Core', 0)).toBeUndefined();
        });
    });

    describe('getRandomCoreOfLevel', () => {
        it('returns a core for a valid level', () => {
            const core = repo.getRandomCoreOfLevel(1);
            expect(core).toBeDefined();
            expect(core!.level).toBe(1);
        });

        it('returns undefined for an out-of-range level', () => {
            expect(repo.getRandomCoreOfLevel(999)).toBeUndefined();
        });

        it('returns undefined for level 0', () => {
            expect(repo.getRandomCoreOfLevel(0)).toBeUndefined();
        });
    });

    describe('getCoreById', () => {
        it('returns a core for a known id', () => {
            const all = repo.getAllCores();
            const target = all[0];
            const found = repo.getCoreById(target.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(target.id);
        });

        it('returns undefined for an unknown id', () => {
            expect(repo.getCoreById('does-not-exist')).toBeUndefined();
        });
    });

    describe('getCoresByName', () => {
        it('returns all cores with a matching name across levels', () => {
            const all = repo.getAllCores();
            const targetName = all[0].name;
            const found = repo.getCoresByName(targetName);
            expect(found.length).toBeGreaterThan(0);
            for (const c of found) {
                expect(c.name).toBe(targetName);
            }
        });

        it('includes the new Phishing and Backdoor core lines', () => {
            const phishing = repo.getCoresByName('Phishing Core');
            const backdoor = repo.getCoresByName('Backdoor Core');

            expect(phishing.length).toBe(6);
            expect(backdoor.length).toBe(6);
            expect(phishing.every(core => core.level >= 1 && core.level <= 6)).toBe(true);
            expect(backdoor.every(core => core.level >= 1 && core.level <= 6)).toBe(true);
        });

        it('returns empty array for an unknown name', () => {
            expect(repo.getCoresByName('NonExistentCore')).toEqual([]);
        });
    });
});
