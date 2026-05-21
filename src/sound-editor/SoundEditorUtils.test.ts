import { describe, expect, it } from 'vitest';

import { buildChromaticNotes, clampDropoff, parseNumberInput } from './utils';

describe('sound editor utils', () => {
    it('builds a descending chromatic range from C8 through C1', () => {
        const notes = buildChromaticNotes(1, 8);

        expect(notes).toHaveLength(85);
        expect(notes[0].name).toBe('C8');
        expect(notes[0].freq).toBeCloseTo(4186.009, 3);
        expect(notes[12].name).toBe('C7');
        expect(notes[84].name).toBe('C1');
        expect(notes[84].freq).toBeCloseTo(32.703, 3);
    });

    it('allows zero dropoff while still clamping out-of-range values', () => {
        expect(clampDropoff(0)).toBe(0);
        expect(clampDropoff(-0.2)).toBe(0);
        expect(clampDropoff(1.4)).toBe(1);
        expect(clampDropoff(Number.NaN)).toBe(0.3);
    });

    it('parses zero values without falling back', () => {
        expect(parseNumberInput('0', 0.3)).toBe(0);
        expect(parseNumberInput('', 0.3)).toBe(0.3);
    });
});
