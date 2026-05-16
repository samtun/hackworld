import { describe, expect, it } from 'vitest';
import { STAGE_MUSIC, buildLongMusicLoop, buildMusicVariation, transposeFrequency } from './AudioManager';

const MIN_STAGE_MUSIC_LOOP_DURATION_MS = 60_000;

describe('STAGE_MUSIC', () => {
    it('keeps every loop at least one minute long before repeating', () => {
        Object.values(STAGE_MUSIC).forEach((profile) => {
            expect(profile.pulseFrequencies.length * profile.pulseIntervalMs).toBeGreaterThanOrEqual(MIN_STAGE_MUSIC_LOOP_DURATION_MS);
            if (profile.harmonyFrequencies) {
                expect(profile.harmonyFrequencies.length * profile.pulseIntervalMs).toBeGreaterThanOrEqual(MIN_STAGE_MUSIC_LOOP_DURATION_MS);
            }
        });
    });

    it('only contains positive frequencies after expansion', () => {
        Object.values(STAGE_MUSIC).forEach((profile) => {
            profile.pulseFrequencies.forEach((frequency) => {
                expect(frequency).toBeGreaterThan(0);
            });
            profile.harmonyFrequencies?.forEach((frequency) => {
                expect(frequency).toBeGreaterThan(0);
            });
        });
    });
});

describe('music loop helpers', () => {
    it('transposes frequencies with deterministic rounding', () => {
        expect(transposeFrequency(220, 2)).toBe(246.94);
    });

    it('mirrors even cycles without repeating the turnaround note', () => {
        expect(buildMusicVariation([100, 200, 300, 400], 0)).toEqual([100, 200, 300, 400, 300, 200, 100]);
    });

    it('mirrors odd cycles without repeating the opening note', () => {
        const transposedPhrase = [100, 200, 300, 400].map((frequency) => transposeFrequency(frequency, 2));
        expect(buildMusicVariation([100, 200, 300, 400], 1)).toEqual([
            ...transposedPhrase,
            ...transposedPhrase.slice(1).reverse(),
        ]);
    });

    it('builds loops to the exact required note count across multiple cycles', () => {
        expect(buildLongMusicLoop([100, 200, 300, 400], 5_000)).toEqual([
            100, 200, 300, 400, 300, 200, 100,
            112.25, 224.49, 336.74, 448.98, 448.98,
        ]);
    });
});
