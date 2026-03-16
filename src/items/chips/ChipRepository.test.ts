import { describe, it, expect } from 'vitest';
import { ChipRepository } from './ChipRepository';
import { ChipType } from './Chip';

describe('ChipRepository', () => {
    const repo = ChipRepository.Instance;

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(ChipRepository.Instance).toBe(repo);
        });
    });

    describe('getAllChips', () => {
        it('returns a non-empty list of chips', () => {
            expect(repo.getAllChips().length).toBeGreaterThan(0);
        });

        it('all chips have valid chip types', () => {
            const validTypes = Object.values(ChipType);
            for (const c of repo.getAllChips()) {
                expect(validTypes).toContain(c.chipType);
            }
        });
    });

    describe('getChipByTypeAndLevel', () => {
        it('returns a chip for a valid type and level 1', () => {
            const chip = repo.getChipByTypeAndLevel(ChipType.FIREWIRE, 1);
            expect(chip).toBeDefined();
            expect(chip!.chipType).toBe(ChipType.FIREWIRE);
            expect(chip!.level).toBe(1);
        });

        it('returns undefined for an out-of-range level', () => {
            expect(repo.getChipByTypeAndLevel(ChipType.FIREWIRE, 999)).toBeUndefined();
        });

        it('returns undefined for level 0', () => {
            expect(repo.getChipByTypeAndLevel(ChipType.FIREWIRE, 0)).toBeUndefined();
        });
    });

    describe('getRandomChipOfLevel', () => {
        it('returns a chip for a valid level', () => {
            const chip = repo.getRandomChipOfLevel(1);
            expect(chip).toBeDefined();
            expect(chip!.level).toBe(1);
        });

        it('returns undefined for an out-of-range level', () => {
            expect(repo.getRandomChipOfLevel(999)).toBeUndefined();
        });
    });

    describe('getChipById', () => {
        it('returns a chip for a known id', () => {
            const all = repo.getAllChips();
            const target = all[0];
            const found = repo.getChipById(target.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(target.id);
        });

        it('returns undefined for an unknown id', () => {
            expect(repo.getChipById('does-not-exist')).toBeUndefined();
        });
    });

    describe('getChipsByType', () => {
        it('returns only chips of the requested type', () => {
            const chips = repo.getChipsByType(ChipType.FIREWIRE);
            expect(chips.length).toBeGreaterThan(0);
            for (const c of chips) {
                expect(c.chipType).toBe(ChipType.FIREWIRE);
            }
        });
    });

    describe('getChipByNameAndLevel', () => {
        it('returns a chip for a known name and level', () => {
            const all = repo.getAllChips();
            const target = all[0];
            const found = repo.getChipByNameAndLevel(target.name, target.level);
            expect(found).toBeDefined();
            expect(found!.name).toBe(target.name);
            expect(found!.level).toBe(target.level);
        });

        it('returns undefined for an unknown name', () => {
            expect(repo.getChipByNameAndLevel('NonExistentChip', 1)).toBeUndefined();
        });

        it('returns undefined for an out-of-range level', () => {
            expect(repo.getChipByNameAndLevel('Firewire', 999)).toBeUndefined();
        });
    });
});
