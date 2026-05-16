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

    it('gives each dungeon stage a distinct opening motif', () => {
        const stageIds = ['networkMatrix', 'packetForge', 'cipherNull', 'securityCore', 'kernelTerminus'] as const;
        const motifs = stageIds.map((stageId) => STAGE_MUSIC[stageId].pulseFrequencies.slice(0, 5).join(','));

        expect(new Set(motifs).size).toBe(stageIds.length);
    });

    it('ramps up the saw-like synth character from early to late stages', () => {
        expect(STAGE_MUSIC.networkMatrix).toMatchObject({ pulseType: 'square', harmonyType: 'triangle' });
        expect(STAGE_MUSIC.packetForge).toMatchObject({ pulseType: 'square', harmonyType: 'sawtooth' });
        expect(STAGE_MUSIC.cipherNull).toMatchObject({ pulseType: 'sawtooth', harmonyType: 'triangle' });
        expect(STAGE_MUSIC.securityCore).toMatchObject({ pulseType: 'sawtooth', harmonyType: 'sawtooth' });
        expect(STAGE_MUSIC.kernelTerminus).toMatchObject({ pulseType: 'sawtooth', harmonyType: 'sawtooth' });
        expect(STAGE_MUSIC.kernelTerminus.pulseGain).toBeGreaterThan(STAGE_MUSIC.networkMatrix.pulseGain);
        expect(STAGE_MUSIC.kernelTerminus.harmonyGain).toBeGreaterThan(STAGE_MUSIC.packetForge.harmonyGain);
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
