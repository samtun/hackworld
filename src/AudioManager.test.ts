import { describe, expect, it } from 'vitest';
import { STAGE_MUSIC } from './AudioManager';

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
});
