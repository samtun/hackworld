export interface NoteDefinition {
    name: string;
    freq: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const A4_MIDI = 69;
const A4_FREQ = 440;

export const DEFAULT_DROPOFF = 0.3;

/**
 * Build a descending chromatic note list spanning the inclusive octave range.
 *
 * @param minOctave Lowest octave to include.
 * @param maxOctave Highest octave to include.
 * @returns Notes ordered from highest pitch to lowest pitch.
 */
export function buildChromaticNotes(minOctave: number, maxOctave: number): NoteDefinition[] {
    const notes: NoteDefinition[] = [];
    const minMidi = 12 * (minOctave + 1);
    const maxMidi = 12 * (maxOctave + 1);

    for (let midi = maxMidi; midi >= minMidi; midi--) {
        const octave = Math.floor(midi / 12) - 1;
        const noteName = NOTE_NAMES[midi % 12];
        notes.push({
            name: `${noteName}${octave}`,
            freq: A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12),
        });
    }

    return notes;
}

/**
 * Clamp a dropoff value to the supported [0, 1] range.
 *
 * @param value Raw dropoff value.
 * @param fallback Value to use when the input is not finite.
 * @returns A safe dropoff value for editor state and playback.
 */
export function clampDropoff(value: number, fallback: number = DEFAULT_DROPOFF): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

/**
 * Parse a numeric input field while preserving valid zero values.
 *
 * @param rawValue String value read from an input element.
 * @param fallback Value to use when parsing fails.
 * @returns The parsed number or the fallback when invalid.
 */
export function parseNumberInput(rawValue: string, fallback: number): number {
    const parsed = parseFloat(rawValue);
    return Number.isFinite(parsed) ? parsed : fallback;
}
