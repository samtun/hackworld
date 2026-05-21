export interface NoteDefinition {
    name: string;
    freq: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const A4_MIDI = 69;
const A4_FREQ = 440;

export const DEFAULT_DROPOFF = 0.3;

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

export function clampDropoff(value: number, fallback: number = DEFAULT_DROPOFF): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

export function parseNumberInput(rawValue: string, fallback: number): number {
    const parsed = parseFloat(rawValue);
    return Number.isFinite(parsed) ? parsed : fallback;
}
