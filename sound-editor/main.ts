import { buildChromaticNotes, clampDropoff, DEFAULT_DROPOFF, parseNumberInput } from './utils';

/**
 * HackWorld Sound Editor — DAW Timeline (main.ts)
 *
 * Piano-roll style canvas editor. Beat grid on X axis, chromatic scale on Y axis.
 * Scroll horizontally via mouse wheel or the scrollbar. Space = Play/Stop.
 * Click to add tones/noise, click to edit, right-click to delete.
 * Animated playhead during playback. Exports AudioManager snippets.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
type OscType = 'sine' | 'triangle' | 'square' | 'sawtooth';

interface ToneEvent {
    id: string;
    noteIdx: number;    // index into NOTES[]
    startTime: number;  // seconds on timeline
    duration: number;
    type: OscType;
    gain: number;
    dropoff: number;    // 0.0 (fast decay) → 1.0 (hold constant)
    glideTo: number | null; // target noteIdx, or null
}

interface NoiseEvent {
    id: string;
    row: number;    // 0 = A, 1 = B, 2 = C
    startTime: number;
    duration: number;
    gain: number;
    dropoff: number;    // 0.0 (fast decay) → 1.0 (hold constant)
    lowpass: number;
    highpass: number;
}

interface ClipboardToneEvent {
    noteIdx: number;
    startTime: number;
    duration: number;
    type: OscType;
    gain: number;
    dropoff: number;
    glideTo: number | null;
}

interface ClipboardNoiseEvent {
    row: number;
    startTime: number;
    duration: number;
    gain: number;
    dropoff: number;
    lowpass: number;
    highpass: number;
}

interface ClipboardSelection {
    minStartTime: number;
    tones: ClipboardToneEvent[];
    noises: ClipboardNoiseEvent[];
}

// ── Chromatic scale C8→C1 (top = high, bottom = low) ─────────────────────────
const NOTES = buildChromaticNotes(1, 8);

// ── Beat duration fractions (stored value = beat multiplier, e.g. 0.25 = 1/4 beat) ─
const BEAT_FRACTIONS: { label: string; value: number }[] = [
    { label: '1/8', value: 1 / 8 },
    { label: '1/4', value: 1 / 4 },
    { label: '1/2', value: 1 / 2 },
    { label: '1/1', value: 1 },
    { label: '2', value: 2 },
    { label: '4', value: 4 },
    { label: '8', value: 8 },
];
// Computed once at startup for duration-resize clamping.
const MIN_DURATION_BEATS = BEAT_FRACTIONS.reduce((min, frac) => Math.min(min, frac.value), Number.POSITIVE_INFINITY);

// ── Noise track labels ────────────────────────────────────────────────────────
const NOISE_TRACK_LABELS = ['A', 'B', 'C'] as const;

// ── Layout constants ──────────────────────────────────────────────────────────
const PPS = 120;   // pixels per second
const ROW_H = 22;   // row height px
const NOISE_H = 23;   // noise strip height px
const RULER_H = 22;   // ruler height px (larger for bigger font)
const MIN_SECS = 10;   // minimum timeline width in seconds
const ENV_MIN = 0.0001;
const AUTOSCROLL_MARGIN = 80;  // px from right edge before auto-scroll kicks in
const LOOP_LOOKAHEAD = 0.3;  // seconds — schedule next loop pass this far ahead
const STOP_GRACE = 0.4;  // seconds past maxT before auto-stopping non-looped play
const MIN_LOOP_PERIOD = 0.001; // minimum loop period to prevent division by zero
const MIN_BPM = 40;
const MAX_BPM = 300;
const HANDLE_HEIGHT_RATIO = 0.6;

// ── State ─────────────────────────────────────────────────────────────────────
let tones: ToneEvent[] = [];
/** Flat collection of all noise events; each event carries its own row (0=A, 1=B, 2=C). */
let noises: NoiseEvent[] = [];
let scrollH = 0;      // horizontal scroll in px
let editingId: string | null = null;
let editingKind: 'tone' | 'noise' = 'tone';
let isPlaying = false;
let playhead = 0;      // seconds
let rafId: number | null = null;
let audioCtx: AudioContext | null = null;
let cfgDur = 1;      // beat multiplier: 1 = 1 full beat (1/1)
let cfgType: OscType = 'triangle';
let cfgGain = 0.06;
let cfgDropoff = DEFAULT_DROPOFF;   // 0.0 = fast decay, 1.0 = hold constant
let cfgGlide: number | null = null;
let cfgBpm = 120;    // beats per minute
let cfgLoop = true;   // loop playback (on by default)
let cfgLowpass = 2200; // default noise lowpass Hz
let cfgHighpass = 100;  // default noise highpass Hz
let cfgSnap = 0.25;   // snap unit as beat multiplier (0.25 = 1/4 beat)
let lastTimelineMouseTime = 0;
let clipboardSelection: ClipboardSelection | null = null;

// ── Selection & drag state ────────────────────────────────────────────────────
let selectedIds: Set<string> = new Set();

type SelectionKind = 'none' | 'tone' | 'noise' | 'mixed';

/** Positions recorded at the start of a drag operation. */
interface DragMoveState {
    /** Per-id original positions before drag started. */
    origPositions: Map<string, { startTime: number; noteIdx: number }>;
    /** Id and kind of the primary event being dragged (for popup-on-click). */
    singleId: string | null;
    singleKind: 'tone' | 'noise' | null;
    startClientX: number;
    startClientY: number;
    moved: boolean;
}
let dragMoveState: DragMoveState | null = null;

/** State while resizing one event duration from its right-edge handle. */
interface ResizeState {
    id: string;
    kind: 'tone' | 'noise';
    startClientX: number;
    origDuration: number;
}
let resizeState: ResizeState | null = null;

/** State while drawing a selection rectangle. */
interface SelRectState {
    /** Absolute timeline X (px), independent of scrollX. */
    absX0: number; absX1: number;
    /** Absolute canvas Y (px from top of canvas), independent of scrollTop. */
    absY0: number; absY1: number;
    /** 'tone' for the tone canvas; 'noise' for the unified noise canvas. */
    canvas: 'tone' | 'noise';
    /** Whether the rect has grown beyond the click-threshold (drag vs. click). */
    active: boolean;
    /** Snapped add target if user just clicks without dragging. */
    addRow: number;
    addTime: number;
    /** Whether click-without-drag should add a new node. */
    addOnClick: boolean;
    /** If true, preserve existing selection and add rectangle hits to it. */
    additive: boolean;
    /** Snapshot of selected ids at rect start for additive mode. */
    baseSelection: Set<string>;
}
let selRectState: SelRectState | null = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tlCanvas = document.getElementById('tl-canvas') as HTMLCanvasElement;
const noiseCanvas = document.getElementById('noise-canvas') as HTMLCanvasElement;
const noiseClip = document.getElementById('noise-clip') as HTMLDivElement;
const noiseKeyCol = document.getElementById('noise-key-col') as HTMLDivElement;
const rulerCanvas = document.getElementById('ruler-canvas') as HTMLCanvasElement;
const editorOuter = document.getElementById('editor-outer') as HTMLDivElement;
const tlClip = document.getElementById('tl-clip') as HTMLDivElement;
const rulerClip = document.getElementById('ruler-clip') as HTMLDivElement;
const keyCol = document.getElementById('key-col') as HTMLDivElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const jsonBtn = document.getElementById('json-btn') as HTMLButtonElement;
const cfgLoopEl = document.getElementById('cfg-loop') as HTMLInputElement;
const cfgDurEl = document.getElementById('cfg-dur') as HTMLSelectElement;
const cfgBpmEl = document.getElementById('cfg-bpm') as HTMLInputElement;
const cfgTypeEl = document.getElementById('cfg-type') as HTMLSelectElement;
const cfgGainEl = document.getElementById('cfg-gain') as HTMLInputElement;
const cfgDropoffEl = document.getElementById('cfg-dropoff') as HTMLInputElement;
const cfgDropoffV = document.getElementById('cfg-dropoff-v') as HTMLSpanElement;
const cfgGlideEl = document.getElementById('cfg-glide') as HTMLSelectElement;
const cfgLpEl = document.getElementById('cfg-lp') as HTMLInputElement;
const cfgHpEl = document.getElementById('cfg-hp') as HTMLInputElement;
const cfgSnapEl = document.getElementById('cfg-snap') as HTMLSelectElement;
const popup = document.getElementById('popup') as HTMLDivElement;
const popupTitle = document.getElementById('popup-title') as HTMLHeadingElement;
const ppDur = document.getElementById('pp-dur') as HTMLSelectElement;
const ppType = document.getElementById('pp-type') as HTMLSelectElement;
const ppTypeRow = document.getElementById('pp-type-row') as HTMLDivElement;
const ppGain = document.getElementById('pp-gain') as HTMLInputElement;
const ppDropoff = document.getElementById('pp-dropoff') as HTMLInputElement;
const ppDropoffV = document.getElementById('pp-dropoff-v') as HTMLSpanElement;
const ppDropoffRow = document.getElementById('pp-dropoff-row') as HTMLDivElement;
const ppGlide = document.getElementById('pp-glide') as HTMLSelectElement;
const ppGlideRow = document.getElementById('pp-glide-row') as HTMLDivElement;
const ppLpRow = document.getElementById('pp-lp-row') as HTMLDivElement;
const ppLp = document.getElementById('pp-lp') as HTMLInputElement;
const ppHpRow = document.getElementById('pp-hp-row') as HTMLDivElement;
const ppHp = document.getElementById('pp-hp') as HTMLInputElement;
const ppSave = document.getElementById('pp-save') as HTMLButtonElement;
const ppDel = document.getElementById('pp-del') as HTMLButtonElement;
const ppX = document.getElementById('popup-x') as HTMLButtonElement;
// Selection panel
const selPanel = document.getElementById('sel-panel') as HTMLDivElement;
const selPanelX = document.getElementById('sel-x') as HTMLButtonElement;
const selCountEl = document.getElementById('sel-count') as HTMLSpanElement;
const selDur = document.getElementById('sel-dur') as HTMLSelectElement;
const selTypeRow = document.getElementById('sel-type-row') as HTMLDivElement;
const selType = document.getElementById('sel-type') as HTMLSelectElement;
const selGain = document.getElementById('sel-gain') as HTMLInputElement;
const selDropoff = document.getElementById('sel-dropoff') as HTMLInputElement;
const selDropoffV = document.getElementById('sel-dropoff-v') as HTMLSpanElement;
const selGlideRow = document.getElementById('sel-glide-row') as HTMLDivElement;
const selGlide = document.getElementById('sel-glide') as HTMLSelectElement;
const selLpRow = document.getElementById('sel-lp-row') as HTMLDivElement;
const selLp = document.getElementById('sel-lp') as HTMLInputElement;
const selHpRow = document.getElementById('sel-hp-row') as HTMLDivElement;
const selHp = document.getElementById('sel-hp') as HTMLInputElement;
const selDelBtn = document.getElementById('sel-del') as HTMLButtonElement;
const codeTa = document.getElementById('code-ta') as HTMLTextAreaElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const codeSection = document.getElementById('code-section') as HTMLDivElement;
const codeHdr = document.getElementById('code-hdr') as HTMLDivElement;
const hscrollBar = document.getElementById('hscroll-bar') as HTMLDivElement;
const hscrollInner = document.getElementById('hscroll-inner') as HTMLDivElement;

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid(): string { return Math.random().toString(36).slice(2, 9); }

function fmt(n: number): string { return parseFloat(n.toFixed(5)).toString(); }

/** Find a noise event by id. */
function findNoiseById(id: string): NoiseEvent | null {
    return noises.find(n => n.id === id) ?? null;
}

/** Remove events with the given ids from the noise collection. */
function removeNoisesById(ids: Set<string>): void {
    noises = noises.filter(n => !ids.has(n.id));
}

/** Determine the current selected event kind. */
function getSelectionKind(): SelectionKind {
    const toneIds = new Set(tones.map(t => t.id));
    const noiseIds = new Set(noises.map(n => n.id));
    let hasTone = false;
    let hasNoise = false;

    for (const id of selectedIds) {
        if (!hasTone && toneIds.has(id)) hasTone = true;
        if (!hasNoise && noiseIds.has(id)) hasNoise = true;
        if (hasTone && hasNoise) return 'mixed';
    }

    if (hasTone) return 'tone';
    if (hasNoise) return 'noise';
    return 'none';
}

/** Add a clicked node to selection while enforcing tone/noise separation. */
function shiftSelectNode(id: string, kind: 'tone' | 'noise'): void {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
        return;
    }
    const selectionKind = getSelectionKind();
    const mustReset =
        selectionKind === 'mixed' ||
        (kind === 'tone' && selectionKind === 'noise') ||
        (kind === 'noise' && selectionKind === 'tone');

    if (mustReset) {
        selectedIds = new Set([id]);
        return;
    }
    selectedIds.add(id);
}

/** Snap a beat duration to the nearest configured beat fraction. */
function snapDurationToFraction(durationBeats: number): number {
    const clamped = Math.max(MIN_DURATION_BEATS, durationBeats);
    let best = BEAT_FRACTIONS[0].value;
    let bestDist = Math.abs(clamped - best);
    for (const frac of BEAT_FRACTIONS) {
        const dist = Math.abs(clamped - frac.value);
        if (dist < bestDist) {
            best = frac.value;
            bestDist = dist;
        }
    }
    return best;
}

/** Duration of one beat in seconds at the current BPM. */
function beatDur(): number { return 60 / cfgBpm; }

/** Return the CSS-pixel width of the visible timeline area. */
function visibleW(): number { return tlClip.clientWidth || 800; }

/** Total virtual timeline width in px (based on event extents). */
function virtualW(): number {
    const bd = beatDur();
    const maxT = Math.max(
        MIN_SECS,
        ...tones.map(e => e.startTime + e.duration * bd + 2),
        ...noises.map(e => e.startTime + e.duration * bd + 2),
    );
    return maxT * PPS;
}

// ── Canvas scaling ────────────────────────────────────────────────────────────
function setCanvas(c: HTMLCanvasElement, cssW: number, cssH: number): void {
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}

// ── Build key column labels ────────────────────────────────────────────────────
function buildKeyCol(): void {
    keyCol.innerHTML = '';
    NOTES.forEach(n => {
        const div = document.createElement('div');
        div.className = 'key-lbl';
        const sharp = n.name.includes('#');
        const isC = n.name.startsWith('C') && !sharp;
        if (isC) div.classList.add('key-c');
        else if (sharp) div.classList.add('key-sharp');
        else div.classList.add('key-nat');
        div.style.height = `${ROW_H}px`;
        div.textContent = n.name;
        keyCol.appendChild(div);
    });
}

// ── Build noise key column labels ─────────────────────────────────────────────
function buildNoiseKeyCol(): void {
    noiseKeyCol.innerHTML = '';
    NOISE_TRACK_LABELS.forEach(lbl => {
        const div = document.createElement('div');
        div.className = 'noise-row-lbl';
        div.style.height = `${NOISE_H}px`;
        div.textContent = lbl;
        noiseKeyCol.appendChild(div);
    });
}


function buildDurationOptions(sel: HTMLSelectElement, defaultValue: number): void {
    sel.innerHTML = '';
    BEAT_FRACTIONS.forEach(f => {
        const o = document.createElement('option');
        o.value = String(f.value);
        o.textContent = f.label;
        if (f.value === defaultValue) o.selected = true;
        sel.appendChild(o);
    });
}

// ── Populate glide selectors ───────────────────────────────────────────────────
function buildGlideOptions(sel: HTMLSelectElement, includeNone: boolean): void {
    sel.innerHTML = '';
    if (includeNone) {
        const o = document.createElement('option');
        o.value = ''; o.textContent = 'None'; sel.appendChild(o);
    }
    NOTES.forEach((n, i) => {
        const o = document.createElement('option');
        o.value = String(i); o.textContent = n.name; sel.appendChild(o);
    });
}

// ── Resize all canvases ────────────────────────────────────────────────────────
function resizeAll(): void {
    const tlH = NOTES.length * ROW_H;
    const tlW = visibleW();
    const rW = rulerClip.clientWidth || tlW;
    setCanvas(tlCanvas, tlW, tlH);
    setCanvas(rulerCanvas, rW, RULER_H);
    const nW = noiseClip.clientWidth || tlW;
    setCanvas(noiseCanvas, nW, NOISE_TRACK_LABELS.length * NOISE_H);
}

// ── Grid helpers ───────────────────────────────────────────────────────────────
function drawGrid(cx: CanvasRenderingContext2D, w: number, h: number): void {
    const bd = beatDur();
    const startBeat = Math.floor(scrollX / PPS / bd);
    const endBeat = Math.ceil((scrollX + w) / PPS / bd) + 1;
    for (let beat = startBeat; beat <= endBeat; beat++) {
        const x = Math.round(beat * bd * PPS - scrollX) + 0.5;
        const isBar = beat % 4 === 0;
        cx.strokeStyle = isBar ? '#2e4870' : '#1a3050';
        cx.lineWidth = isBar ? 1 : 0.5;
        cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke();
    }
}

// ── Render ruler ───────────────────────────────────────────────────────────────
function renderRuler(): void {
    const w = rulerClip.clientWidth || 800;
    const cx = ctx2d(rulerCanvas);
    cx.clearRect(0, 0, w, RULER_H);
    cx.fillStyle = '#09090e';
    cx.fillRect(0, 0, w, RULER_H);

    const bd = beatDur();
    const startBeat = Math.floor(scrollX / PPS / bd);
    const endBeat = Math.ceil((scrollX + w) / PPS / bd) + 1;
    cx.font = '10px monospace'; cx.textAlign = 'left';

    for (let beat = startBeat; beat <= endBeat; beat++) {
        const x = Math.round(beat * bd * PPS - scrollX) + 0.5;
        const isBar = beat % 4 === 0;
        cx.strokeStyle = isBar ? '#303858' : '#1a2030';
        cx.lineWidth = isBar ? 1 : 0.5;
        cx.beginPath();
        cx.moveTo(x, isBar ? 0 : RULER_H - 6);
        cx.lineTo(x, RULER_H); cx.stroke();
        if (isBar) {
            cx.fillStyle = '#7080a0';
            cx.fillText(`${Math.floor(beat / 4) + 1}`, x + 3, 13);
        }
    }
    // Playhead on ruler
    if (isPlaying) {
        const px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600cc';
        cx.fillRect(px - 1, 0, 2, RULER_H);
    }
}

interface NodeGeometry {
    x: number;
    bw: number;
    y: number;
    bh: number;
    handleSize: number;
}

function toneNodeGeometry(ev: ToneEvent, bd: number): NodeGeometry {
    const bh = ROW_H - 4;
    return {
        x: ev.startTime * PPS - scrollX,
        bw: Math.max(6, ev.duration * bd * PPS),
        y: ev.noteIdx * ROW_H + 2,
        bh,
        handleSize: bh * HANDLE_HEIGHT_RATIO,
    };
}

function noiseNodeGeometry(ev: NoiseEvent, bd: number): NodeGeometry {
    const bh = NOISE_H - 4;
    return {
        x: ev.startTime * PPS - scrollX,
        bw: Math.max(6, ev.duration * bd * PPS),
        y: ev.row * NOISE_H + 2,
        bh,
        handleSize: bh * HANDLE_HEIGHT_RATIO,
    };
}

// ── Render main timeline ───────────────────────────────────────────────────────
function renderTimeline(): void {
    const w = visibleW();
    const h = NOTES.length * ROW_H;
    const cx = ctx2d(tlCanvas);
    cx.clearRect(0, 0, w, h);

    // Row backgrounds
    NOTES.forEach((n, i) => {
        const y = i * ROW_H;
        const sharp = n.name.includes('#');
        const isC = n.name.startsWith('C') && !sharp;
        cx.fillStyle = isC ? '#0f1828' : sharp ? '#0a0f18' : '#0d1420';
        cx.fillRect(0, y, w, ROW_H);
        cx.fillStyle = '#141a26';
        cx.fillRect(0, y + ROW_H - 1, w, 1);
    });

    // Grid
    drawGrid(cx, w, h);

    // Tone blocks
    const bd = beatDur();
    for (const ev of tones) {
        const { x, bw, y, bh, handleSize } = toneNodeGeometry(ev, bd);
        if (x + bw < 0 || x > w) continue;

        const isSel = selectedIds.has(ev.id);
        const isEd = ev.id === editingId;
        cx.fillStyle = isSel ? '#2a6e7e' : (isEd ? '#2da0cc' : '#1c6e8e');
        cx.strokeStyle = isSel ? '#ffd600' : (isEd ? '#60d8f8' : '#30a8d0');
        cx.lineWidth = isSel ? 2 : (isEd ? 2 : 1);
        roundRect(cx, x, y, bw, bh, 3);
        cx.fill(); cx.stroke();
        drawDurationHandle(cx, x + bw, y + bh / 2, handleSize, isSel, '#1b2a3a');

        if (bw > 18) {
            cx.fillStyle = isSel ? '#ffd600' : '#a0d8f0'; cx.font = '10px monospace'; cx.textAlign = 'left';
            cx.fillText(NOTES[ev.noteIdx].name, x + 4, y + bh / 2 + 3);
        }
        // Glide indicator
        if (ev.glideTo !== null && ev.glideTo !== ev.noteIdx) {
            const sy = y + bh / 2;
            const ty = ev.glideTo * ROW_H + ROW_H / 2;
            cx.strokeStyle = '#ffd60080'; cx.lineWidth = 1;
            cx.beginPath(); cx.moveTo(x + bw, sy); cx.lineTo(x + bw, ty); cx.stroke();
        }
    }

    // Selection rectangle overlay (on tone canvas)
    if (selRectState && selRectState.active && selRectState.canvas === 'tone') {
        const rx0 = Math.min(selRectState.absX0, selRectState.absX1) - scrollX;
        const rx1 = Math.max(selRectState.absX0, selRectState.absX1) - scrollX;
        // absY values are canvas-relative; draw directly without scrollTop adjustment
        const ry0 = Math.min(selRectState.absY0, selRectState.absY1);
        const ry1 = Math.max(selRectState.absY0, selRectState.absY1);
        cx.fillStyle = 'rgba(0,229,255,0.08)';
        cx.strokeStyle = 'rgba(0,229,255,0.65)';
        cx.lineWidth = 1;
        cx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        cx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }

    // Playhead
    if (isPlaying || playhead > 0) {
        const px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600bb';
        cx.fillRect(px - 1, 0, 2, h);
    }
}

// ── Render unified noise section ───────────────────────────────────────────────
function renderNoise(): void {
    const totalH = NOISE_TRACK_LABELS.length * NOISE_H;
    const w = noiseClip.clientWidth || 800;
    const cx = ctx2d(noiseCanvas);
    cx.clearRect(0, 0, w, totalH);
    cx.fillStyle = '#080812'; cx.fillRect(0, 0, w, totalH);

    drawGrid(cx, w, totalH);

    // Subtle row separators
    cx.fillStyle = '#141a26';
    for (let i = 1; i < NOISE_TRACK_LABELS.length; i++) {
        cx.fillRect(0, i * NOISE_H - 1, w, 1);
    }

    const bd = beatDur();
    for (const ev of noises) {
        const { x, bw, y, bh, handleSize } = noiseNodeGeometry(ev, bd);
        if (x + bw < 0 || x > w) continue;

        const isSel = selectedIds.has(ev.id);
        const isEd = ev.id === editingId;
        cx.fillStyle = isSel ? '#7a3f9e' : (isEd ? '#aa5099' : '#7a3f6e');
        cx.strokeStyle = isSel ? '#ffd600' : (isEd ? '#d080c8' : '#b060a0');
        cx.lineWidth = isSel ? 2 : (isEd ? 2 : 1);
        roundRect(cx, x, y, bw, bh, 3);
        cx.fill(); cx.stroke();
        drawDurationHandle(cx, x + bw, y + bh / 2, handleSize, isSel, '#2a1630');
    }

    // Selection rectangle overlay
    if (selRectState && selRectState.active && selRectState.canvas === 'noise') {
        const rx0 = Math.min(selRectState.absX0, selRectState.absX1) - scrollX;
        const rx1 = Math.max(selRectState.absX0, selRectState.absX1) - scrollX;
        const ry0 = Math.min(selRectState.absY0, selRectState.absY1);
        const ry1 = Math.max(selRectState.absY0, selRectState.absY1);
        cx.fillStyle = 'rgba(0,229,255,0.08)';
        cx.strokeStyle = 'rgba(0,229,255,0.65)';
        cx.lineWidth = 1;
        cx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        cx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }

    if (isPlaying || playhead > 0) {
        const px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600bb';
        cx.fillRect(px - 1, 0, 2, totalH);
    }
}

function roundRect(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    cx.beginPath();
    cx.moveTo(x + rr, y);
    cx.lineTo(x + w - rr, y); cx.arcTo(x + w, y, x + w, y + rr, rr);
    cx.lineTo(x + w, y + h - rr); cx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    cx.lineTo(x + rr, y + h); cx.arcTo(x, y + h, x, y + h - rr, rr);
    cx.lineTo(x, y + rr); cx.arcTo(x, y, x + rr, y, rr);
    cx.closePath();
}

function drawDurationHandle(
    cx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    isSelected: boolean,
    fill: string,
): void {
    const half = size / 2;
    cx.beginPath();
    cx.moveTo(centerX, centerY - half);
    cx.lineTo(centerX + half, centerY);
    cx.lineTo(centerX, centerY + half);
    cx.lineTo(centerX - half, centerY);
    cx.closePath();
    cx.fillStyle = fill;
    cx.strokeStyle = isSelected ? '#ffd600' : '#b8cad8';
    cx.lineWidth = isSelected ? 2 : 1;
    cx.fill();
    cx.stroke();
}

function pointInDiamond(
    px: number,
    py: number,
    centerX: number,
    centerY: number,
    size: number,
): boolean {
    const half = size / 2;
    // Defensive guard against accidental zero-sized handles.
    if (half <= 0) return false;
    return (Math.abs(px - centerX) / half) + (Math.abs(py - centerY) / half) <= 1;
}

// ── Scrollbar sync ─────────────────────────────────────────────────────────────
let ignoreHscrollEvent = false;

function syncScrollbar(): void {
    ignoreHscrollEvent = true;
    hscrollInner.style.width = `${virtualW()}px`;
    hscrollBar.scrollLeft = scrollX;
    ignoreHscrollEvent = false;
}

// ── Master render ──────────────────────────────────────────────────────────────
function render(): void {
    renderRuler();
    renderTimeline();
    renderNoise();
    syncScrollbar();
}

// ── Hit-testing ────────────────────────────────────────────────────────────────
function hitTone(cx: number, cy: number): ToneEvent | null {
    const t = (cx + scrollX) / PPS;
    const bd = beatDur();
    const row = Math.floor(cy / ROW_H);
    for (const ev of tones) {
        if (ev.noteIdx === row && t >= ev.startTime && t <= ev.startTime + ev.duration * bd)
            return ev;
    }
    return null;
}

function hitToneHandle(cx: number, cy: number): ToneEvent | null {
    const bd = beatDur();
    for (const ev of tones) {
        const { x, bw, y, bh, handleSize } = toneNodeGeometry(ev, bd);
        if (pointInDiamond(cx, cy, x + bw, y + bh / 2, handleSize)) return ev;
    }
    return null;
}

function hitNoise(cx: number, cy: number): NoiseEvent | null {
    const row = Math.floor(cy / NOISE_H);
    const t = (cx + scrollX) / PPS;
    const bd = beatDur();
    for (const ev of noises) {
        if (ev.row === row && t >= ev.startTime && t <= ev.startTime + ev.duration * bd) return ev;
    }
    return null;
}

function hitNoiseHandle(cx: number, cy: number): NoiseEvent | null {
    const bd = beatDur();
    for (const ev of noises) {
        const { x, bw, y, bh, handleSize } = noiseNodeGeometry(ev, bd);
        if (pointInDiamond(cx, cy, x + bw, y + bh / 2, handleSize)) return ev;
    }
    return null;
}

function hitNoiseRow(cy: number): number {
    return Math.min(NOISE_TRACK_LABELS.length - 1, Math.max(0, Math.floor(cy / NOISE_H)));
}

// ── Canvas coordinate helper ───────────────────────────────────────────────────
function canvasXY(canvas: HTMLCanvasElement, e: MouseEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function updateTimelineMouseTime(canvas: HTMLCanvasElement, e: MouseEvent): void {
    const { x } = canvasXY(canvas, e);
    lastTimelineMouseTime = Math.max(0, (x + scrollX) / PPS);
}

// ── Timeline mouse events ──────────────────────────────────────────────────────
const DRAG_THRESHOLD = 5; // px before a movement is considered a drag

function onTlDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    updateTimelineMouseTime(tlCanvas, e);
    const { x, y } = canvasXY(tlCanvas, e);

    // Keep Shift+click semantics for selection toggle/additive flows; don't start resize with Shift held.
    const handleHit = !e.shiftKey ? hitToneHandle(x, y) : null;
    if (handleHit) {
        closePopup();
        selectedIds = new Set([handleHit.id]);
        updateSelPanel();
        resizeState = {
            id: handleHit.id,
            kind: 'tone',
            startClientX: e.clientX,
            origDuration: handleHit.duration,
        };
        render();
        return;
    }

    const hit = hitTone(x, y);
    if (hit) {
        e.stopPropagation();
        closePopup();

        if (e.shiftKey) {
            shiftSelectNode(hit.id, 'tone');
            updateSelPanel();
            render();
            return;
        }

        // If the clicked note is already in the selection, drag all selected.
        // Otherwise clear selection and drag just this note.
        if (!selectedIds.has(hit.id)) {
            selectedIds = new Set([hit.id]);
            updateSelPanel();
        }

        const origPositions = new Map<string, { startTime: number; noteIdx: number }>();
        for (const id of selectedIds) {
            const t = tones.find(t => t.id === id);
            if (t) origPositions.set(id, { startTime: t.startTime, noteIdx: t.noteIdx });
            const nf = findNoiseById(id);
            if (nf) origPositions.set(id, { startTime: nf.startTime, noteIdx: 0 });
        }

        dragMoveState = {
            origPositions,
            singleId: hit.id, singleKind: 'tone',
            startClientX: e.clientX, startClientY: e.clientY, moved: false,
        };
        render();
    } else {
        // Empty space: start selection rect / pending add
        const row = Math.floor(y / ROW_H);
        const absT = Math.max(0, (x + scrollX) / PPS);
        // y from getBoundingClientRect is already canvas-relative; no scrollTop adjustment needed.
        const additive = e.shiftKey;
        const hadSelection = selectedIds.size > 0;
        const baseSelection = new Set(selectedIds);
        if (!additive) {
            selectedIds = new Set();
            updateSelPanel();
        }
        closePopup();

        selRectState = {
            absX0: x + scrollX, absX1: x + scrollX,
            absY0: y, absY1: y,
            canvas: 'tone', active: false,
            addRow: row, addTime: snapToGridFloor(absT),
            addOnClick: !hadSelection && !additive,
            additive,
            baseSelection,
        };
        render();
    }
}

function onTlCtx(e: MouseEvent): void {
    e.preventDefault();
    const { x, y } = canvasXY(tlCanvas, e);
    const hit = hitTone(x, y);
    if (hit) {
        tones = tones.filter(t => t.id !== hit.id);
        selectedIds.delete(hit.id);
        updateSelPanel();
        closePopup();
        render();
    }
}

// ── Noise mouse events ─────────────────────────────────────────────────────────
function onNoiseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    updateTimelineMouseTime(noiseCanvas, e);
    const { x, y } = canvasXY(noiseCanvas, e);

    // Keep Shift+click semantics for selection toggle/additive flows; don't start resize with Shift held.
    const handleHit = !e.shiftKey ? hitNoiseHandle(x, y) : null;
    if (handleHit) {
        closePopup();
        selectedIds = new Set([handleHit.id]);
        updateSelPanel();
        resizeState = {
            id: handleHit.id,
            kind: 'noise',
            startClientX: e.clientX,
            origDuration: handleHit.duration,
        };
        render();
        return;
    }

    const hit = hitNoise(x, y);
    if (hit) {
        e.stopPropagation();
        closePopup();

        if (e.shiftKey) {
            shiftSelectNode(hit.id, 'noise');
            updateSelPanel();
            render();
            return;
        }

        if (!selectedIds.has(hit.id)) {
            selectedIds = new Set([hit.id]);
            updateSelPanel();
        }

        const origPositions = new Map<string, { startTime: number; noteIdx: number }>();
        for (const id of selectedIds) {
            const t = tones.find(t => t.id === id);
            if (t) origPositions.set(id, { startTime: t.startTime, noteIdx: t.noteIdx });
            const nf = findNoiseById(id);
            if (nf) origPositions.set(id, { startTime: nf.startTime, noteIdx: 0 });
        }

        dragMoveState = {
            origPositions,
            singleId: hit.id, singleKind: 'noise',
            startClientX: e.clientX, startClientY: e.clientY, moved: false,
        };
        render();
    } else {
        const absT = Math.max(0, (x + scrollX) / PPS);
        const additive = e.shiftKey;
        const hadSelection = selectedIds.size > 0;
        const baseSelection = new Set(selectedIds);
        if (!additive) {
            selectedIds = new Set();
            updateSelPanel();
        }
        closePopup();

        selRectState = {
            absX0: x + scrollX, absX1: x + scrollX,
            absY0: y, absY1: y,
            canvas: 'noise', active: false,
            addRow: hitNoiseRow(y), addTime: snapToGridFloor(absT),
            addOnClick: !hadSelection && !additive,
            additive,
            baseSelection,
        };
        render();
    }
}

function onNoiseCtx(e: MouseEvent): void {
    e.preventDefault();
    const { x, y } = canvasXY(noiseCanvas, e);
    const hit = hitNoise(x, y);
    if (hit) {
        removeNoisesById(new Set([hit.id]));
        selectedIds.delete(hit.id);
        updateSelPanel();
        closePopup();
        render();
    }
}

// ── Global mouse move / up (drag & selection rect) ────────────────────────────
function onGlobalMove(e: MouseEvent): void {
    if (resizeState) {
        const deltaSecs = (e.clientX - resizeState.startClientX) / PPS;
        const event =
            resizeState.kind === 'tone'
                ? tones.find(t => t.id === resizeState.id)
                : findNoiseById(resizeState.id);
        if (!event) return;
        const durationBeats = resizeState.origDuration + (deltaSecs / beatDur());
        event.duration = snapDurationToFraction(durationBeats);
        render();
        return;
    }

    if (dragMoveState) {
        const dx = e.clientX - dragMoveState.startClientX;
        const dy = e.clientY - dragMoveState.startClientY;

        if (!dragMoveState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            dragMoveState.moved = true;
        }

        if (dragMoveState.moved) {
            const dtSecs = dx / PPS;
            const dRow = Math.round(dy / ROW_H);

            for (const [id, orig] of dragMoveState.origPositions) {
                const newT = snapToGrid(orig.startTime + dtSecs);
                const tone = tones.find(t => t.id === id);
                if (tone) {
                    tone.startTime = newT;
                    tone.noteIdx = Math.max(0, Math.min(NOTES.length - 1, orig.noteIdx + dRow));
                }
                const noiseFound = findNoiseById(id);
                if (noiseFound) noiseFound.startTime = newT;
            }
            render();
        }
        return;
    }

    if (selRectState) {
        if (selRectState.canvas === 'tone') {
            const { x, y } = canvasXY(tlCanvas, e);
            selRectState.absX1 = x + scrollX;
            // y from getBoundingClientRect is already canvas-relative; no scrollTop adjustment needed.
            selRectState.absY1 = y;
        } else {
            const { x, y } = canvasXY(noiseCanvas, e);
            selRectState.absX1 = x + scrollX;
            selRectState.absY1 = y;
        }

        const dx = selRectState.absX1 - selRectState.absX0;
        const dy = selRectState.absY1 - selRectState.absY0;
        if (!selRectState.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            selRectState.active = true;
        }
        render();
    }
}

function onGlobalUp(_e: MouseEvent): void {
    if (resizeState) {
        updateSelPanel();
        resizeState = null;
        render();
        return;
    }

    if (dragMoveState) {
        if (!dragMoveState.moved && dragMoveState.singleId && dragMoveState.singleKind) {
            // No drag — keep only selection-panel editing (no per-node popup editor)
            selectedIds = new Set([dragMoveState.singleId]);
            updateSelPanel();
        } else if (dragMoveState.moved) {
            updateSelPanel();
        }
        dragMoveState = null;
        render();
        return;
    }

    if (selRectState) {
        if (selRectState.active) {
            finalizeSelection(selRectState);
        } else if (selRectState.addOnClick) {
            // Click (no drag): add tone or noise
            if (selRectState.canvas === 'tone' && selRectState.addRow >= 0 && selRectState.addRow < NOTES.length) {
                addTone(selRectState.addRow, selRectState.addTime);
            } else if (selRectState.canvas === 'noise') {
                addNoise(selRectState.addRow, selRectState.addTime);
            }
        }
        selRectState = null;
        render();
    }
}

// ── Selection finalisation ─────────────────────────────────────────────────────
function finalizeSelection(rect: SelRectState): void {
    const x0 = Math.min(rect.absX0, rect.absX1);
    const x1 = Math.max(rect.absX0, rect.absX1);
    const y0 = Math.min(rect.absY0, rect.absY1);
    const y1 = Math.max(rect.absY0, rect.absY1);
    const bd = beatDur();

    const nextSelection = rect.additive ? new Set(rect.baseSelection) : new Set<string>();

    if (rect.canvas === 'tone') {
        for (const ev of tones) {
            const ex0 = ev.startTime * PPS;
            const ex1 = ex0 + ev.duration * bd * PPS;
            const ey0 = ev.noteIdx * ROW_H;
            const ey1 = ey0 + ROW_H;
            if (ex1 >= x0 && ex0 <= x1 && ey1 >= y0 && ey0 <= y1) nextSelection.add(ev.id);
        }
    } else {
        // Noise canvas: select all noise events whose time range overlaps the selection
        for (const ev of noises) {
            const ex0 = ev.startTime * PPS;
            const ex1 = ex0 + ev.duration * bd * PPS;
            if (ex1 >= x0 && ex0 <= x1) nextSelection.add(ev.id);
        }
    }
    selectedIds = nextSelection;
    updateSelPanel();
}

// ── Horizontal wheel scroll ────────────────────────────────────────────────────
function onWheel(e: WheelEvent): void {
    // Shift + vertical scroll → horizontal timeline scroll
    if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        scrollX = Math.max(0, scrollX + e.deltaY);
        render();
    } else if (e.deltaX !== 0) {
        // Horizontal trackpad gesture → horizontal timeline scroll
        e.preventDefault();
        scrollX = Math.max(0, scrollX + e.deltaX);
        render();
    }
    // Plain deltaY (no shift) → naturally scrolls editor-outer vertically
}

// ── Grid snap ─────────────────────────────────────────────────────────────────
/**
 * Snap a time value to the nearest snap unit.
 * Uses rounding (not floor) so that dragging feels natural — a note dragged
 * halfway between two snap points snaps to the closest one.
 */
function snapToGrid(t: number): number {
    const snapUnit = cfgSnap * beatDur();
    if (snapUnit <= 0) return Math.max(0, t);
    return Math.max(0, Math.round(t / snapUnit) * snapUnit);
}

/**
 * Snap a time value to the last grid point at or before t (floor snap).
 * Used when placing new notes so the note always starts on the beat grid
 * line immediately to the left of the click position.
 */
function snapToGridFloor(t: number): number {
    const snapUnit = cfgSnap * beatDur();
    if (snapUnit <= 0) return Math.max(0, t);
    return Math.max(0, Math.floor(t / snapUnit) * snapUnit);
}

// ── Add events ─────────────────────────────────────────────────────────────────
function addTone(noteIdx: number, startTime: number): void {
    tones.push({ id: uid(), noteIdx, startTime: snapToGridFloor(startTime), duration: cfgDur, type: cfgType, gain: cfgGain, dropoff: cfgDropoff, glideTo: cfgGlide });
    render();
}

function addNoise(row: number, startTime: number): void {
    noises.push({ id: uid(), row, startTime: snapToGridFloor(startTime), duration: cfgDur, gain: cfgGain, dropoff: cfgDropoff, lowpass: cfgLowpass, highpass: cfgHighpass });
    render();
}

// ── Popup ──────────────────────────────────────────────────────────────────────
function openPopup(id: string, kind: 'tone' | 'noise', mx: number, my: number): void {
    editingId = id; editingKind = kind;

    if (kind === 'tone') {
        const ev = tones.find(t => t.id === id)!;
        popupTitle.textContent = `Edit Tone — ${NOTES[ev.noteIdx].name}`;
        ppTypeRow.style.display = ''; ppGlideRow.style.display = '';
        ppLpRow.style.display = 'none'; ppHpRow.style.display = 'none';
        ppDropoffRow.style.display = '';
        ppDur.value = String(ev.duration);
        ppType.value = ev.type;
        ppGain.value = String(ev.gain);
        ppDropoff.value = String(ev.dropoff ?? DEFAULT_DROPOFF); ppDropoffV.textContent = (ev.dropoff ?? DEFAULT_DROPOFF).toFixed(2);
        ppGlide.value = ev.glideTo !== null ? String(ev.glideTo) : '';
    } else {
        const ev = findNoiseById(id)!;
        popupTitle.textContent = 'Edit Noise';
        ppTypeRow.style.display = 'none'; ppGlideRow.style.display = 'none';
        ppLpRow.style.display = ''; ppHpRow.style.display = '';
        ppDropoffRow.style.display = '';
        ppDur.value = String(ev.duration);
        ppGain.value = String(ev.gain);
        ppDropoff.value = String(ev.dropoff ?? DEFAULT_DROPOFF); ppDropoffV.textContent = (ev.dropoff ?? DEFAULT_DROPOFF).toFixed(2);
        ppLp.value = String(ev.lowpass);
        ppHp.value = String(ev.highpass);
    }

    popup.style.display = 'block';
    const pw = 240; const ph = popup.scrollHeight + 20;
    let px = mx + 10; let py = my - 20;
    if (px + pw > window.innerWidth) px = mx - pw - 10;
    if (py + ph > window.innerHeight) py = window.innerHeight - ph - 8;
    popup.style.left = `${Math.max(4, px)}px`;
    popup.style.top = `${Math.max(4, py)}px`;
    render();
}

function closePopup(): void {
    editingId = null; popup.style.display = 'none'; render();
}

function savePopup(): void {
    if (!editingId) return;
    const dur = parseFloat(ppDur.value) || 1;
    const gain = parseFloat(ppGain.value);
    const dropoff = clampDropoff(parseNumberInput(ppDropoff.value, DEFAULT_DROPOFF));

    if (editingKind === 'tone') {
        const ev = tones.find(t => t.id === editingId);
        if (ev) {
            ev.duration = dur; ev.type = ppType.value as OscType;
            ev.gain = gain; ev.dropoff = dropoff;
            ev.glideTo = ppGlide.value ? parseInt(ppGlide.value) : null;
        }
    } else {
        const ev = editingId ? findNoiseById(editingId) : null;
        if (ev) {
            ev.duration = dur; ev.gain = gain; ev.dropoff = dropoff;
            ev.lowpass = parseFloat(ppLp.value) || 2200;
            ev.highpass = parseFloat(ppHp.value) || 100;
        }
    }
    closePopup();
}

// ── Audio ──────────────────────────────────────────────────────────────────────
function getCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
}

/** Cached noise buffer — reused across all scheduled noise events. */
let cachedNoiseBuffer: AudioBuffer | null = null;

function noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!cachedNoiseBuffer || cachedNoiseBuffer.sampleRate !== ctx.sampleRate) {
        const len = Math.floor(ctx.sampleRate * 0.5);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
        cachedNoiseBuffer = buf;
    }
    return cachedNoiseBuffer;
}

function schedTone(ctx: AudioContext, freq: number, dur: number, type: OscType, gain: number, dropoff: number, startAt: number, glidedFreq: number | null): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const att = Math.min(0.02, dur * 0.35);
    const endGain = Math.max(ENV_MIN, gain * dropoff);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (glidedFreq !== null && glidedFreq > 0)
        osc.frequency.exponentialRampToValueAtTime(glidedFreq, startAt + dur);
    g.gain.setValueAtTime(ENV_MIN, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(ENV_MIN, gain), startAt + att);
    g.gain.exponentialRampToValueAtTime(endGain, startAt + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + dur);
}

function schedNoise(ctx: AudioContext, dur: number, gain: number, dropoff: number, lp: number, hp: number, startAt: number): void {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx);
    const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = hp;
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = lp;
    const g = ctx.createGain();
    const endGain = Math.max(ENV_MIN, gain * dropoff);
    g.gain.setValueAtTime(ENV_MIN, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(ENV_MIN, gain), startAt + 0.01);
    g.gain.exponentialRampToValueAtTime(endGain, startAt + dur);
    src.connect(hpf); hpf.connect(lpf); lpf.connect(g); g.connect(ctx.destination);
    src.start(startAt); src.stop(startAt + dur);
}

function startPlayback(): void {
    if (isPlaying) stopPlayback();
    if (tones.length === 0 && noises.length === 0) return; // Nothing to play

    const ctx = getCtx();

    /**
     * Schedule all CURRENT tones and noises at the given absolute offset.
     * Reads tones/noises/BPM fresh each call so that edits made while playing
     * are automatically picked up on the next scheduled loop pass.
     * Returns the total duration of the scheduled pass.
     */
    function schedulePassFresh(offset: number): number {
        const bd = beatDur();
        const passDur = Math.max(
            MIN_LOOP_PERIOD,
            ...tones.map(e => e.startTime + e.duration * bd),
            ...noises.map(e => e.startTime + e.duration * bd),
        );
        tones.forEach(ev => {
            const freq = NOTES[ev.noteIdx].freq;
            const glide = ev.glideTo !== null ? NOTES[ev.glideTo].freq : null;
            schedTone(ctx, freq, ev.duration * bd, ev.type, ev.gain, ev.dropoff ?? DEFAULT_DROPOFF, offset + ev.startTime, glide);
        });
        noises.forEach(ev => {
            schedNoise(ctx, ev.duration * bd, ev.gain, ev.dropoff ?? DEFAULT_DROPOFF, ev.lowpass, ev.highpass, offset + ev.startTime);
        });
        return passDur;
    }

    // Schedule pass 1 immediately.
    const absStart = ctx.currentTime;
    const pass1Dur = schedulePassFresh(absStart);

    // Queue of pre-scheduled audio passes.  Each record stores the absolute
    // start time and duration of one scheduled pass, and is immutable once
    // pushed.  scheduled[0] is always the pass currently playing (or the most
    // recently started pass), so `playhead = now - scheduled[0].abs` is always
    // accurate regardless of how many lookahead passes have been scheduled.
    interface PassRecord { abs: number; dur: number; }
    const scheduled: PassRecord[] = [{ abs: absStart, dur: pass1Dur }];

    if (cfgLoop) {
        // Pre-schedule a second pass immediately for a seamless first loop boundary.
        const p2Abs = absStart + pass1Dur;
        scheduled.push({ abs: p2Abs, dur: schedulePassFresh(p2Abs) });
    }

    isPlaying = true;
    playBtn.disabled = true; stopBtn.disabled = false;

    function tick(): void {
        if (!isPlaying) return;
        const now = ctx.currentTime;

        if (cfgLoop) {
            // Pop completed passes, always keeping at least one as the "current" pass.
            while (scheduled.length > 1 && now >= scheduled[0].abs + scheduled[0].dur) {
                scheduled.shift();
                scrollX = 0; // reset horizontal view on each loop wrap
            }
            playhead = now - scheduled[0].abs;

            // Extend the audio schedule when the last queued pass is about to end.
            // Uses fresh timeline data so edits appear on the upcoming pass.
            const last = scheduled[scheduled.length - 1];
            if (now >= last.abs + last.dur - LOOP_LOOKAHEAD) {
                const newAbs = last.abs + last.dur;
                scheduled.push({ abs: newAbs, dur: schedulePassFresh(newAbs) });
            }
        } else {
            playhead = now - absStart;
            if (playhead > pass1Dur + STOP_GRACE) { stopPlayback(); return; }
        }

        // Auto-scroll to follow playhead
        const pxPos = playhead * PPS;
        const vw = visibleW();
        if (pxPos - scrollX > vw - AUTOSCROLL_MARGIN) scrollX = Math.max(0, pxPos - AUTOSCROLL_MARGIN);

        render();
        rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
}

function stopPlayback(): void {
    isPlaying = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    playhead = 0;
    playBtn.disabled = false; stopBtn.disabled = true;
    // Close the audio context to immediately silence all scheduled nodes
    if (audioCtx) {
        void audioCtx.close();
        audioCtx = null;
        cachedNoiseBuffer = null; // buffer belongs to the closed context
    }
    render();
}

// ── Code export ────────────────────────────────────────────────────────────────
function generateCode(): string {
    const totalNoises = noises.length;
    if (tones.length === 0 && totalNoises === 0) return '// No events on the timeline yet.';

    const events: { t: number; line: string }[] = [];
    const bd = beatDur();

    // Compute loop period (max event end time)
    const passDur = Math.max(
        ...tones.map(e => e.startTime + e.duration * bd),
        ...noises.map(e => e.startTime + e.duration * bd),
    );

    tones.forEach(ev => {
        const freq = NOTES[ev.noteIdx].freq;
        const glide = ev.glideTo !== null ? NOTES[ev.glideTo].freq : null;
        const dur = ev.duration * bd;
        const at = fmt(ev.startTime);
        const endGain = fmt(Math.max(ENV_MIN, ev.gain * (ev.dropoff ?? DEFAULT_DROPOFF)));
        const glideArg = glide !== null ? `, ${fmt(glide)}` : '';
        events.push({
            t: ev.startTime,
            line: `this.playTone(${fmt(freq)}, ${fmt(dur)}, '${ev.type}', ${fmt(ev.gain)}, ${endGain}, ${at}${glideArg}); // ${NOTES[ev.noteIdx].name}`
        });
    });

    noises.forEach(ev => {
        const dur = ev.duration * bd;
        const at = fmt(ev.startTime);
        const endGain = fmt(Math.max(ENV_MIN, ev.gain * (ev.dropoff ?? DEFAULT_DROPOFF)));
        events.push({
            t: ev.startTime,
            line: `this.playNoise(${fmt(dur)}, ${fmt(ev.gain)}, ${fmt(ev.lowpass)}, ${fmt(ev.highpass)}, ${at}, ${endGain});`
        });
    });

    events.sort((a, b) => a.t - b.t);
    const header = [
        '// ── Paste into your AudioManager play*() method ──────────────',
    ];
    if (cfgLoop) {
        header.push(`// Loop period: ${fmt(passDur)}s at ${cfgBpm} BPM — use as loop interval`);
    }
    return [...header, ...events.map(e => e.line)].join('\n');
}

// ── JSON export & import ───────────────────────────────────────────────────────
function downloadJson(): void {
    const payload = JSON.stringify({ version: 3, bpm: cfgBpm, tones, noises }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hackworld-sound.json'; a.click();
    URL.revokeObjectURL(url);
}

function loadFromJson(raw: string): void {
    let data: { version?: number; bpm?: number; tones?: unknown[]; noises?: unknown[]; noiseTracks?: unknown[][] };
    try { data = JSON.parse(raw); } catch (e) { alert('Could not parse JSON file: ' + (e as Error).message); return; }
    if (!Array.isArray(data.tones)) {
        alert('Not a valid HackWorld DAW file (missing tones array).');
        return;
    }

    // Accept v3 (flat noises[] with row field), v2 (noiseTracks: 3 arrays), v1 (noises: single array).
    let rawNoises: Record<string, unknown>[];
    if (data.version === 3 && Array.isArray(data.noises)) {
        rawNoises = data.noises as Record<string, unknown>[];
    } else if (Array.isArray(data.noiseTracks)) {
        // v2 → flatten, tagging each event with its track index as row
        rawNoises = (data.noiseTracks as unknown[][]).flatMap((track, i) =>
            (track as Record<string, unknown>[]).map(ev => ({ ...ev, row: i }))
        );
    } else if (Array.isArray(data.noises)) {
        // v1 → all events go to row 0 (NOISE A)
        rawNoises = (data.noises as Record<string, unknown>[]).map(ev => ({ ...ev, row: 0 }));
    } else {
        rawNoises = [];
    }

    // Validate and filter tone events to ensure required fields are present
    const validTones: ToneEvent[] = (data.tones as Record<string, unknown>[]).filter(t =>
        typeof t.id === 'string' &&
        typeof t.noteIdx === 'number' &&
        typeof t.startTime === 'number' &&
        typeof t.duration === 'number' &&
        typeof t.type === 'string' &&
        typeof t.gain === 'number'
    ).map(t => ({
        id: t.id as string,
        noteIdx: t.noteIdx as number,
        startTime: t.startTime as number,
        duration: t.duration as number,
        type: t.type as OscType,
        gain: t.gain as number,
        dropoff: typeof t.dropoff === 'number' ? clampDropoff(t.dropoff as number) : DEFAULT_DROPOFF,
        glideTo: typeof t.glideTo === 'number' ? t.glideTo as number : null,
    }));

    const validNoises: NoiseEvent[] = rawNoises.filter(n =>
        typeof n.id === 'string' &&
        typeof n.startTime === 'number' &&
        typeof n.duration === 'number' &&
        typeof n.gain === 'number'
    ).map(n => ({
        id: n.id as string,
        row: typeof n.row === 'number' ? Math.max(0, Math.min(NOISE_TRACK_LABELS.length - 1, n.row as number)) : 0,
        startTime: n.startTime as number,
        duration: n.duration as number,
        gain: n.gain as number,
        dropoff: typeof n.dropoff === 'number' ? clampDropoff(n.dropoff as number) : DEFAULT_DROPOFF,
        lowpass: typeof n.lowpass === 'number' ? n.lowpass as number : 2200,
        highpass: typeof n.highpass === 'number' ? n.highpass as number : 100,
    }));

    stopPlayback();
    tones = validTones;
    noises = validNoises;
    scrollX = 0;
    if (typeof data.bpm === 'number') {
        cfgBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, data.bpm));
        cfgBpmEl.value = String(cfgBpm);
    }
    closePopup();
    render();
}


// ── Selection panel ────────────────────────────────────────────────────────────
/** Return the common value of all elements, or null if they differ. */
function consensus<T>(values: T[]): T | null {
    if (values.length === 0) return null;
    const first = values[0];
    return values.every(v => v === first) ? first : null;
}

/** Populate and show/hide the selection property panel. */
function updateSelPanel(): void {
    if (selectedIds.size === 0) { selPanel.style.display = 'none'; return; }
    selPanel.style.display = 'block';
    selCountEl.textContent = String(selectedIds.size);

    const selTones = tones.filter(t => selectedIds.has(t.id));
    const selNoises = noises.filter(n => selectedIds.has(n.id));
    const allEvts = [...selTones, ...selNoises];
    const onlyTones = selNoises.length === 0;
    const onlyNoise = selTones.length === 0;

    // Duration (all events)
    buildDurationOptions(selDur, 1);
    const durC = consensus(allEvts.map(e => e.duration));
    if (durC !== null) { selDur.value = String(durC); }
    else { addMixedOption(selDur, selDur); }

    // Type (tones only)
    selTypeRow.style.display = selTones.length > 0 ? '' : 'none';
    if (selTones.length > 0) {
        const typeC = consensus(selTones.map(t => t.type));
        selType.value = typeC ?? '';
    }

    // Gain
    const gainC = consensus(allEvts.map(e => e.gain));
    selGain.value = gainC !== null ? String(gainC) : '';
    selGain.placeholder = gainC !== null ? '' : '–';

    // Dropoff
    const dropC = consensus(allEvts.map(e => e.dropoff ?? DEFAULT_DROPOFF));
    selDropoff.value = dropC !== null ? String(dropC) : String(DEFAULT_DROPOFF);
    selDropoffV.textContent = dropC !== null ? dropC.toFixed(2) : '–';

    // Glide (tones only, hide if mixed selection)
    selGlideRow.style.display = onlyTones ? '' : 'none';
    if (onlyTones) {
        buildGlideOptions(selGlide, true);
        const glideC = consensus(selTones.map(t => t.glideTo));
        selGlide.value = glideC !== null ? String(glideC) : '';
    }

    // Noise filter fields
    selLpRow.style.display = onlyNoise ? '' : 'none';
    selHpRow.style.display = onlyNoise ? '' : 'none';
    if (onlyNoise) {
        const lpC = consensus(selNoises.map(n => n.lowpass));
        selLp.value = lpC !== null ? String(lpC) : '';
        selLp.placeholder = lpC !== null ? '' : '–';
        const hpC = consensus(selNoises.map(n => n.highpass));
        selHp.value = hpC !== null ? String(hpC) : '';
        selHp.placeholder = hpC !== null ? '' : '–';
    }
}

/**
 * Insert a "–" option at the top of a <select> and select it to indicate
 * mixed values. Reuses an existing "–" option if already present.
 */
function addMixedOption(sel: HTMLSelectElement, ref: HTMLSelectElement): void {
    if (ref.options[0]?.value !== '') {
        const o = document.createElement('option');
        o.value = ''; o.textContent = '–';
        ref.insertBefore(o, ref.firstChild);
    }
    ref.value = '';
}

function applySelectionField(field: 'duration' | 'type' | 'gain' | 'dropoff' | 'glide' | 'lowpass' | 'highpass'): void {
    const dur = field === 'duration' && selDur.value !== '' ? parseFloat(selDur.value) : null;
    const gain = field === 'gain' && selGain.value !== '' ? parseFloat(selGain.value) : null;
    const dropoff = field === 'dropoff' ? parseFloat(selDropoff.value) : null;
    const lowpass = field === 'lowpass' && selLp.value !== '' ? parseFloat(selLp.value) : null;
    const highpass = field === 'highpass' && selHp.value !== '' ? parseFloat(selHp.value) : null;
    for (const id of selectedIds) {
        const tone = tones.find(t => t.id === id);
        if (tone) {
            if (field === 'duration' && dur !== null && !isNaN(dur)) tone.duration = dur;
            if (field === 'gain' && gain !== null && !isNaN(gain)) tone.gain = gain;
            if (field === 'dropoff' && dropoff !== null && !isNaN(dropoff)) tone.dropoff = clampDropoff(dropoff);
            if (field === 'type' && selTypeRow.style.display !== 'none' && selType.value) tone.type = selType.value as OscType;
            if (field === 'glide' && selGlideRow.style.display !== 'none') {
                tone.glideTo = selGlide.value !== '' ? parseInt(selGlide.value) : null;
            }
        }
        const noise = findNoiseById(id);
        if (noise) {
            if (field === 'duration' && dur !== null && !isNaN(dur)) noise.duration = dur;
            if (field === 'gain' && gain !== null && !isNaN(gain)) noise.gain = gain;
            if (field === 'dropoff' && dropoff !== null && !isNaN(dropoff)) noise.dropoff = clampDropoff(dropoff);
            if (field === 'lowpass' && selLpRow.style.display !== 'none' && lowpass !== null && !isNaN(lowpass)) noise.lowpass = lowpass;
            if (field === 'highpass' && selHpRow.style.display !== 'none' && highpass !== null && !isNaN(highpass)) noise.highpass = highpass;
        }
    }
    render();
}

function copySelectedEvents(): void {
    const copiedTones = tones
        .filter(t => selectedIds.has(t.id))
        .map(t => ({
            noteIdx: t.noteIdx,
            startTime: t.startTime,
            duration: t.duration,
            type: t.type,
            gain: t.gain,
            dropoff: t.dropoff,
            glideTo: t.glideTo,
        }));
    const copiedNoises = noises
        .filter(n => selectedIds.has(n.id))
        .map(n => ({
            row: n.row,
            startTime: n.startTime,
            duration: n.duration,
            gain: n.gain,
            dropoff: n.dropoff,
            lowpass: n.lowpass,
            highpass: n.highpass,
        }));

    const allStartTimes = [...copiedTones.map(t => t.startTime), ...copiedNoises.map(n => n.startTime)];
    if (allStartTimes.length === 0) return;
    clipboardSelection = {
        minStartTime: Math.min(...allStartTimes),
        tones: copiedTones,
        noises: copiedNoises,
    };
}

function pasteCopiedEvents(targetTime: number): void {
    if (!clipboardSelection) return;

    const snappedTarget = snapToGridFloor(targetTime);
    const delta = snappedTarget - clipboardSelection.minStartTime;
    const newSelection = new Set<string>();

    for (const t of clipboardSelection.tones) {
        const id = uid();
        tones.push({
            id,
            noteIdx: t.noteIdx,
            startTime: snapToGridFloor(Math.max(0, t.startTime + delta)),
            duration: t.duration,
            type: t.type,
            gain: t.gain,
            dropoff: t.dropoff,
            glideTo: t.glideTo,
        });
        newSelection.add(id);
    }
    for (const n of clipboardSelection.noises) {
        const id = uid();
        noises.push({
            id,
            row: n.row,
            startTime: snapToGridFloor(Math.max(0, n.startTime + delta)),
            duration: n.duration,
            gain: n.gain,
            dropoff: n.dropoff,
            lowpass: n.lowpass,
            highpass: n.highpass,
        });
        newSelection.add(id);
    }

    selectedIds = newSelection;
    updateSelPanel();
    render();
}

function clearSelection(): void {
    selectedIds = new Set();
    updateSelPanel();
    render();
}

function init(): void {
    buildKeyCol();
    buildNoiseKeyCol();
    buildDurationOptions(cfgDurEl, 1);   // default 1/1 beat
    buildDurationOptions(ppDur, 1);
    buildDurationOptions(selDur, 1);
    buildGlideOptions(cfgGlideEl, true);
    buildGlideOptions(ppGlide, true);
    buildGlideOptions(selGlide, true);
    resizeAll();
    render();

    window.addEventListener('resize', () => { resizeAll(); render(); });

    // Toolbar
    cfgDurEl.addEventListener('change', () => { cfgDur = parseFloat(cfgDurEl.value) || 1; });
    cfgBpmEl.addEventListener('change', () => { cfgBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, parseFloat(cfgBpmEl.value) || 120)); cfgBpmEl.value = String(cfgBpm); render(); });
    cfgTypeEl.addEventListener('change', () => { cfgType = cfgTypeEl.value as OscType; });
    cfgGainEl.addEventListener('input', () => { cfgGain = parseFloat(cfgGainEl.value) || 0; });
    cfgDropoffEl.addEventListener('input', () => { cfgDropoff = clampDropoff(parseNumberInput(cfgDropoffEl.value, DEFAULT_DROPOFF)); cfgDropoffV.textContent = cfgDropoff.toFixed(2); });
    cfgGlideEl.addEventListener('change', () => { cfgGlide = cfgGlideEl.value ? parseInt(cfgGlideEl.value) : null; });
    cfgLpEl.addEventListener('change', () => { cfgLowpass = parseFloat(cfgLpEl.value) || 2200; });
    cfgHpEl.addEventListener('change', () => { cfgHighpass = parseFloat(cfgHpEl.value) || 100; });
    cfgSnapEl.addEventListener('change', () => { cfgSnap = parseFloat(cfgSnapEl.value) || 0.25; });

    // Popup dropoff live preview
    ppDropoff.addEventListener('input', () => { ppDropoffV.textContent = clampDropoff(parseNumberInput(ppDropoff.value, DEFAULT_DROPOFF)).toFixed(2); });

    // Popup actions
    ppSave.addEventListener('click', savePopup);
    ppDel.addEventListener('click', () => {
        if (!editingId) return;
        tones = tones.filter(t => t.id !== editingId);
        removeNoisesById(new Set([editingId]));
        selectedIds.delete(editingId);
        updateSelPanel();
        closePopup();
    });
    ppX.addEventListener('click', closePopup);

    // Selection panel
    selDropoff.addEventListener('input', () => { selDropoffV.textContent = clampDropoff(parseNumberInput(selDropoff.value, DEFAULT_DROPOFF)).toFixed(2); });
    selDur.addEventListener('change', () => applySelectionField('duration'));
    selType.addEventListener('change', () => applySelectionField('type'));
    selGain.addEventListener('input', () => applySelectionField('gain'));
    selDropoff.addEventListener('input', () => applySelectionField('dropoff'));
    selGlide.addEventListener('change', () => applySelectionField('glide'));
    selLp.addEventListener('input', () => applySelectionField('lowpass'));
    selHp.addEventListener('input', () => applySelectionField('highpass'));
    selDelBtn.addEventListener('click', () => {
        tones = tones.filter(t => !selectedIds.has(t.id));
        removeNoisesById(selectedIds);
        clearSelection();
    });
    selPanelX.addEventListener('click', clearSelection);

    // Header buttons
    playBtn.addEventListener('click', startPlayback);
    stopBtn.addEventListener('click', stopPlayback);
    cfgLoopEl.addEventListener('change', () => { cfgLoop = cfgLoopEl.checked; });
    clearBtn.addEventListener('click', () => {
        stopPlayback(); tones = []; noises = []; scrollX = 0; closePopup(); clearSelection(); render();
    });
    exportBtn.addEventListener('click', () => {
        codeTa.value = generateCode(); codeTa.select();
    });
    jsonBtn.addEventListener('click', downloadJson);
    copyBtn.addEventListener('click', () => navigator.clipboard.writeText(codeTa.value));

    // Timeline interaction
    tlCanvas.addEventListener('mousedown', onTlDown);
    tlCanvas.addEventListener('mousemove', e => updateTimelineMouseTime(tlCanvas, e));
    tlCanvas.addEventListener('contextmenu', onTlCtx);

    // Noise canvas interaction
    noiseCanvas.addEventListener('mousedown', onNoiseDown);
    noiseCanvas.addEventListener('mousemove', e => updateTimelineMouseTime(noiseCanvas, e));
    noiseCanvas.addEventListener('contextmenu', onNoiseCtx);
    noiseClip.addEventListener('wheel', onWheel, { passive: false });

    // Global mouse move / up for drag and selection rect
    window.addEventListener('mousemove', onGlobalMove);
    window.addEventListener('mouseup', onGlobalUp);

    // Horizontal scroll via wheel
    tlClip.addEventListener('wheel', onWheel, { passive: false });

    // Horizontal scrollbar
    hscrollBar.addEventListener('scroll', () => {
        if (ignoreHscrollEvent) return;
        scrollX = hscrollBar.scrollLeft;
        render();
    });

    // Space = Play / Stop, Delete = remove selected
    const EDITABLE = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
    const isEditable = (t: EventTarget | null): boolean =>
        t instanceof Element && EDITABLE.has(t.tagName);

    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && !isEditable(e.target)) {
            e.preventDefault();
            if (isPlaying) stopPlayback(); else startPlayback();
        }
        if (e.code === 'Delete' && !isEditable(e.target) && selectedIds.size > 0) {
            e.preventDefault();
            tones = tones.filter(t => !selectedIds.has(t.id));
            removeNoisesById(selectedIds);
            clearSelection();
        }
        if ((e.ctrlKey || e.metaKey) && !isEditable(e.target)) {
            const key = e.key.toLowerCase();
            if (key === 'c') {
                e.preventDefault();
                copySelectedEvents();
            } else if (key === 'v') {
                e.preventDefault();
                pasteCopiedEvents(lastTimelineMouseTime);
            }
        }
        if (e.code === 'Escape' && !isEditable(e.target)) {
            if (editingId) closePopup();
            else if (selectedIds.size > 0) clearSelection();
        }
    });

    // Close popup on outside click
    window.addEventListener('mousedown', e => {
        if (editingId && !popup.contains(e.target as Node)) closePopup();
    }, true);

    // JSON drag-and-drop import
    document.addEventListener('dragover', e => { e.preventDefault(); });
    document.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => loadFromJson(reader.result as string);
        reader.readAsText(file);
    });

    // Code section resize — drag the header bar up/down to change height
    let codeSectionResizing = false;
    let codeResizeStartY = 0;
    let codeResizeStartH = 0;
    codeHdr.addEventListener('mousedown', e => {
        codeSectionResizing = true;
        codeResizeStartY = e.clientY;
        codeResizeStartH = codeSection.offsetHeight;
        e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
        if (!codeSectionResizing) return;
        const delta = codeResizeStartY - e.clientY; // drag up → bigger
        codeSection.style.height = `${Math.max(40, codeResizeStartH + delta)}px`;
    });
    window.addEventListener('mouseup', () => { codeSectionResizing = false; });
}

init();
