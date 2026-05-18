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
    delay: number;      // additional audio start offset in seconds
    glideTo: number | null; // target noteIdx, or null
}

interface NoiseEvent {
    id: string;
    startTime: number;
    duration: number;
    gain: number;
    delay: number;
    lowpass: number;
    highpass: number;
}

// ── Chromatic scale C6→C3 (top = high, bottom = low) ─────────────────────────
const NOTES: { name: string; freq: number }[] = [
    { name: 'C6',  freq: 1046.50 }, { name: 'B5',  freq: 987.77  },
    { name: 'A#5', freq: 932.33  }, { name: 'A5',  freq: 880.00  },
    { name: 'G#5', freq: 830.61  }, { name: 'G5',  freq: 783.99  },
    { name: 'F#5', freq: 739.99  }, { name: 'F5',  freq: 698.46  },
    { name: 'E5',  freq: 659.25  }, { name: 'D#5', freq: 622.25  },
    { name: 'D5',  freq: 587.33  }, { name: 'C#5', freq: 554.37  },
    { name: 'C5',  freq: 523.25  }, { name: 'B4',  freq: 493.88  },
    { name: 'A#4', freq: 466.16  }, { name: 'A4',  freq: 440.00  },
    { name: 'G#4', freq: 415.30  }, { name: 'G4',  freq: 392.00  },
    { name: 'F#4', freq: 369.99  }, { name: 'F4',  freq: 349.23  },
    { name: 'E4',  freq: 329.63  }, { name: 'D#4', freq: 311.13  },
    { name: 'D4',  freq: 293.66  }, { name: 'C#4', freq: 277.18  },
    { name: 'C4',  freq: 261.63  }, { name: 'B3',  freq: 246.94  },
    { name: 'A#3', freq: 233.08  }, { name: 'A3',  freq: 220.00  },
    { name: 'G#3', freq: 207.65  }, { name: 'G3',  freq: 196.00  },
    { name: 'F#3', freq: 185.00  }, { name: 'F3',  freq: 174.61  },
    { name: 'E3',  freq: 164.81  }, { name: 'D#3', freq: 155.56  },
    { name: 'D3',  freq: 146.83  }, { name: 'C#3', freq: 138.59  },
    { name: 'C3',  freq: 130.81  },
];

// ── Layout constants ──────────────────────────────────────────────────────────
const PPS              = 120;   // pixels per second
const ROW_H            = 22;   // row height px
const NOISE_H          = 23;   // noise strip height px
const RULER_H          = 22;   // ruler height px (larger for bigger font)
const MIN_SECS         = 10;   // minimum timeline width in seconds
const ENV_MIN          = 0.0001;
const AUTOSCROLL_MARGIN = 80;  // px from right edge before auto-scroll kicks in

// ── State ─────────────────────────────────────────────────────────────────────
let tones: ToneEvent[]   = [];
let noises: NoiseEvent[] = [];
let scrollX    = 0;      // horizontal scroll in px
let editingId: string | null = null;
let editingKind: 'tone' | 'noise' = 'tone';
let isPlaying  = false;
let playhead   = 0;      // seconds
let rafId: number | null = null;
let audioCtx: AudioContext | null = null;
let cfgDur    = 0.25;
let cfgType: OscType = 'triangle';
let cfgGain   = 0.06;
let cfgDelay  = 0.0;
let cfgGlide: number | null = null;
let cfgBpm    = 120;    // beats per minute

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tlCanvas    = document.getElementById('tl-canvas')    as HTMLCanvasElement;
const noiseCanvas = document.getElementById('noise-canvas') as HTMLCanvasElement;
const rulerCanvas = document.getElementById('ruler-canvas') as HTMLCanvasElement;
const editorOuter = document.getElementById('editor-outer') as HTMLDivElement;
const tlClip      = document.getElementById('tl-clip')      as HTMLDivElement;
const noiseClip   = document.getElementById('noise-clip')   as HTMLDivElement;
const rulerClip   = document.getElementById('ruler-clip')   as HTMLDivElement;
const keyCol      = document.getElementById('key-col')      as HTMLDivElement;
const playBtn     = document.getElementById('play-btn')     as HTMLButtonElement;
const stopBtn     = document.getElementById('stop-btn')     as HTMLButtonElement;
const clearBtn    = document.getElementById('clear-btn')    as HTMLButtonElement;
const exportBtn   = document.getElementById('export-btn')   as HTMLButtonElement;
const cfgDurEl    = document.getElementById('cfg-dur')      as HTMLInputElement;
const cfgBpmEl    = document.getElementById('cfg-bpm')      as HTMLInputElement;
const cfgTypeEl   = document.getElementById('cfg-type')     as HTMLSelectElement;
const cfgGainEl   = document.getElementById('cfg-gain')     as HTMLInputElement;
const cfgGainV    = document.getElementById('cfg-gain-v')   as HTMLSpanElement;
const cfgDelayEl  = document.getElementById('cfg-delay')    as HTMLInputElement;
const cfgDelayV   = document.getElementById('cfg-delay-v')  as HTMLSpanElement;
const cfgGlideEl  = document.getElementById('cfg-glide')    as HTMLSelectElement;
const popup       = document.getElementById('popup')        as HTMLDivElement;
const popupTitle  = document.getElementById('popup-title')  as HTMLHeadingElement;
const ppDur       = document.getElementById('pp-dur')       as HTMLInputElement;
const ppType      = document.getElementById('pp-type')      as HTMLSelectElement;
const ppTypeRow   = document.getElementById('pp-type-row')  as HTMLDivElement;
const ppGain      = document.getElementById('pp-gain')      as HTMLInputElement;
const ppGainV     = document.getElementById('pp-gain-v')    as HTMLSpanElement;
const ppDelay     = document.getElementById('pp-delay')     as HTMLInputElement;
const ppDelayV    = document.getElementById('pp-delay-v')   as HTMLSpanElement;
const ppGlide     = document.getElementById('pp-glide')     as HTMLSelectElement;
const ppGlideRow  = document.getElementById('pp-glide-row') as HTMLDivElement;
const ppLpRow     = document.getElementById('pp-lp-row')    as HTMLDivElement;
const ppLp        = document.getElementById('pp-lp')        as HTMLInputElement;
const ppHpRow     = document.getElementById('pp-hp-row')    as HTMLDivElement;
const ppHp        = document.getElementById('pp-hp')        as HTMLInputElement;
const ppSave      = document.getElementById('pp-save')      as HTMLButtonElement;
const ppDel       = document.getElementById('pp-del')       as HTMLButtonElement;
const ppX         = document.getElementById('popup-x')      as HTMLButtonElement;
const codeTa      = document.getElementById('code-ta')      as HTMLTextAreaElement;
const copyBtn     = document.getElementById('copy-btn')     as HTMLButtonElement;
const hscrollBar  = document.getElementById('hscroll-bar')  as HTMLDivElement;
const hscrollInner = document.getElementById('hscroll-inner') as HTMLDivElement;

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid(): string { return Math.random().toString(36).slice(2, 9); }

function fmt(n: number): string { return parseFloat(n.toFixed(5)).toString(); }

/** Duration of one beat in seconds at the current BPM. */
function beatDur(): number { return 60 / cfgBpm; }

/** Return the CSS-pixel width of the visible timeline area. */
function visibleW(): number { return tlClip.clientWidth || 800; }

/** Total virtual timeline width in px (based on event extents). */
function virtualW(): number {
    const maxT = Math.max(
        MIN_SECS,
        ...tones.map(e  => e.startTime + e.delay + e.duration + 2),
        ...noises.map(e => e.startTime + e.delay + e.duration + 2),
    );
    return maxT * PPS;
}

// ── Canvas scaling ────────────────────────────────────────────────────────────
function setCanvas(c: HTMLCanvasElement, cssW: number, cssH: number): void {
    const dpr = window.devicePixelRatio || 1;
    c.width  = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    c.style.width  = `${cssW}px`;
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
        const isC   = n.name.startsWith('C') && !sharp;
        if (isC) div.classList.add('key-c');
        else if (sharp) div.classList.add('key-sharp');
        else div.classList.add('key-nat');
        div.style.height = `${ROW_H}px`;
        div.textContent = n.name;
        keyCol.appendChild(div);
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
    const tlH    = NOTES.length * ROW_H;
    const tlW    = visibleW();
    const nW     = noiseClip.clientWidth  || tlW;
    const rW     = rulerClip.clientWidth  || tlW;
    setCanvas(tlCanvas,    tlW, tlH);
    setCanvas(noiseCanvas, nW,  NOISE_H);
    setCanvas(rulerCanvas, rW,  RULER_H);
}

// ── Grid helpers ───────────────────────────────────────────────────────────────
function drawGrid(cx: CanvasRenderingContext2D, w: number, h: number): void {
    const bd = beatDur();
    const startBeat = Math.floor(scrollX / PPS / bd);
    const endBeat   = Math.ceil((scrollX + w) / PPS / bd) + 1;
    for (let beat = startBeat; beat <= endBeat; beat++) {
        const x     = Math.round(beat * bd * PPS - scrollX) + 0.5;
        const isBar = beat % 4 === 0;
        cx.strokeStyle = isBar ? '#2e4870' : '#1a3050';
        cx.lineWidth   = isBar ? 1 : 0.5;
        cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke();
    }
}

// ── Render ruler ───────────────────────────────────────────────────────────────
function renderRuler(): void {
    const w  = rulerClip.clientWidth  || 800;
    const cx = ctx2d(rulerCanvas);
    cx.clearRect(0, 0, w, RULER_H);
    cx.fillStyle = '#09090e';
    cx.fillRect(0, 0, w, RULER_H);

    const bd = beatDur();
    const startBeat = Math.floor(scrollX / PPS / bd);
    const endBeat   = Math.ceil((scrollX + w) / PPS / bd) + 1;
    cx.font = '10px monospace'; cx.textAlign = 'left';

    for (let beat = startBeat; beat <= endBeat; beat++) {
        const x     = Math.round(beat * bd * PPS - scrollX) + 0.5;
        const isBar = beat % 4 === 0;
        cx.strokeStyle = isBar ? '#303858' : '#1a2030';
        cx.lineWidth   = isBar ? 1 : 0.5;
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

// ── Render main timeline ───────────────────────────────────────────────────────
function renderTimeline(): void {
    const w  = visibleW();
    const h  = NOTES.length * ROW_H;
    const cx = ctx2d(tlCanvas);
    cx.clearRect(0, 0, w, h);

    // Row backgrounds
    NOTES.forEach((n, i) => {
        const y     = i * ROW_H;
        const sharp = n.name.includes('#');
        const isC   = n.name.startsWith('C') && !sharp;
        cx.fillStyle = isC ? '#0f1828' : sharp ? '#0a0f18' : '#0d1420';
        cx.fillRect(0, y, w, ROW_H);
        cx.fillStyle = '#141a26';
        cx.fillRect(0, y + ROW_H - 1, w, 1);
    });

    // Grid
    drawGrid(cx, w, h);

    // Tone blocks
    for (const ev of tones) {
        const x    = ev.startTime * PPS - scrollX;
        const bw   = Math.max(6, ev.duration * PPS);
        const y    = ev.noteIdx * ROW_H + 2;
        const bh   = ROW_H - 4;
        if (x + bw < 0 || x > w) continue;

        const sel  = ev.id === editingId;
        cx.fillStyle   = sel ? '#2da0cc' : '#1c6e8e';
        cx.strokeStyle = sel ? '#60d8f8' : '#30a8d0';
        cx.lineWidth   = sel ? 2 : 1;
        roundRect(cx, x, y, bw, bh, 3);
        cx.fill(); cx.stroke();

        if (bw > 18) {
            cx.fillStyle = '#a0d8f0'; cx.font = '10px monospace'; cx.textAlign = 'left';
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

    // Playhead
    if (isPlaying || playhead > 0) {
        const px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600bb';
        cx.fillRect(px - 1, 0, 2, h);
    }
}

// ── Render noise strip ─────────────────────────────────────────────────────────
function renderNoise(): void {
    const w  = noiseClip.clientWidth || 800;
    const cx = ctx2d(noiseCanvas);
    cx.clearRect(0, 0, w, NOISE_H);
    cx.fillStyle = '#080812'; cx.fillRect(0, 0, w, NOISE_H);

    drawGrid(cx, w, NOISE_H);

    for (const ev of noises) {
        const x   = ev.startTime * PPS - scrollX;
        const bw  = Math.max(6, ev.duration * PPS);
        const y   = 2; const bh = NOISE_H - 4;
        if (x + bw < 0 || x > w) continue;

        const sel = ev.id === editingId;
        cx.fillStyle   = sel ? '#aa5099' : '#7a3f6e';
        cx.strokeStyle = sel ? '#d080c8' : '#b060a0';
        cx.lineWidth   = sel ? 2 : 1;
        roundRect(cx, x, y, bw, bh, 3);
        cx.fill(); cx.stroke();
    }

    if (isPlaying || playhead > 0) {
        const px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600bb';
        cx.fillRect(px - 1, 0, 2, NOISE_H);
    }
}

function roundRect(cx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    cx.beginPath();
    cx.moveTo(x + rr, y);
    cx.lineTo(x + w - rr, y);   cx.arcTo(x + w, y,     x + w, y + rr,     rr);
    cx.lineTo(x + w, y + h - rr); cx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    cx.lineTo(x + rr, y + h);   cx.arcTo(x,     y + h, x,     y + h - rr, rr);
    cx.lineTo(x, y + rr);       cx.arcTo(x,     y,     x + rr, y,         rr);
    cx.closePath();
}

// ── Scrollbar sync ─────────────────────────────────────────────────────────────
let ignoreHscrollEvent = false;

function syncScrollbar(): void {
    hscrollInner.style.width = `${virtualW()}px`;
    ignoreHscrollEvent = true;
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
    const t   = (cx + scrollX) / PPS;
    const row = Math.floor(cy / ROW_H);
    for (const ev of tones) {
        if (ev.noteIdx === row && t >= ev.startTime && t <= ev.startTime + ev.duration)
            return ev;
    }
    return null;
}

function hitNoise(cx: number): NoiseEvent | null {
    const t = (cx + scrollX) / PPS;
    for (const ev of noises) {
        if (t >= ev.startTime && t <= ev.startTime + ev.duration) return ev;
    }
    return null;
}

// ── Canvas coordinate helper ───────────────────────────────────────────────────
function canvasXY(canvas: HTMLCanvasElement, e: MouseEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

// ── Timeline mouse events ──────────────────────────────────────────────────────
function onTlDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const { x, y } = canvasXY(tlCanvas, e);

    const hit = hitTone(x, y);
    if (hit) {
        e.stopPropagation();
        openPopup(hit.id, 'tone', e.clientX, e.clientY);
    } else {
        const row = Math.floor(y / ROW_H);
        const t   = Math.max(0, (x + scrollX) / PPS);
        if (row >= 0 && row < NOTES.length) addTone(row, t);
    }
}

function onTlCtx(e: MouseEvent): void {
    e.preventDefault();
    const { x, y } = canvasXY(tlCanvas, e);
    const hit = hitTone(x, y);
    if (hit) { tones = tones.filter(t => t.id !== hit.id); closePopup(); render(); }
}

// ── Noise mouse events ─────────────────────────────────────────────────────────
function onNoiseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const { x } = canvasXY(noiseCanvas, e);

    const hit = hitNoise(x);
    if (hit) {
        e.stopPropagation();
        openPopup(hit.id, 'noise', e.clientX, e.clientY);
    } else {
        addNoise(Math.max(0, (x + scrollX) / PPS));
    }
}

function onNoiseCtx(e: MouseEvent): void {
    e.preventDefault();
    const { x } = canvasXY(noiseCanvas, e);
    const hit = hitNoise(x);
    if (hit) { noises = noises.filter(n => n.id !== hit.id); closePopup(); render(); }
}

// ── Horizontal wheel scroll ────────────────────────────────────────────────────
function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    scrollX = Math.max(0, scrollX + delta);
    render();
}

// ── Grid snap ─────────────────────────────────────────────────────────────────
/** Snap a time value to the closest beat BEFORE the given time (floor snap). */
function snapToGrid(t: number): number {
    const bd = beatDur();
    return Math.floor(t / bd) * bd;
}

// ── Add events ─────────────────────────────────────────────────────────────────
function addTone(noteIdx: number, startTime: number): void {
    tones.push({ id: uid(), noteIdx, startTime: snapToGrid(startTime), duration: cfgDur, type: cfgType, gain: cfgGain, delay: cfgDelay, glideTo: cfgGlide });
    render();
}

function addNoise(startTime: number): void {
    noises.push({ id: uid(), startTime: snapToGrid(startTime), duration: cfgDur, gain: cfgGain, delay: cfgDelay, lowpass: 2200, highpass: 100 });
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
        ppDur.value   = String(ev.duration);
        ppType.value  = ev.type;
        ppGain.value  = String(ev.gain);  ppGainV.textContent  = ev.gain.toFixed(2);
        ppDelay.value = String(ev.delay); ppDelayV.textContent = ev.delay.toFixed(1) + 's';
        ppGlide.value = ev.glideTo !== null ? String(ev.glideTo) : '';
    } else {
        const ev = noises.find(n => n.id === id)!;
        popupTitle.textContent = 'Edit Noise';
        ppTypeRow.style.display = 'none'; ppGlideRow.style.display = 'none';
        ppLpRow.style.display = ''; ppHpRow.style.display = '';
        ppDur.value   = String(ev.duration);
        ppGain.value  = String(ev.gain);  ppGainV.textContent  = ev.gain.toFixed(2);
        ppDelay.value = String(ev.delay); ppDelayV.textContent = ev.delay.toFixed(1) + 's';
        ppLp.value    = String(ev.lowpass);
        ppHp.value    = String(ev.highpass);
    }

    popup.style.display = 'block';
    const pw = 240; const ph = popup.scrollHeight + 20;
    let px = mx + 10; let py = my - 20;
    if (px + pw > window.innerWidth)  px = mx - pw - 10;
    if (py + ph > window.innerHeight) py = window.innerHeight - ph - 8;
    popup.style.left = `${Math.max(4, px)}px`;
    popup.style.top  = `${Math.max(4, py)}px`;
    render();
}

function closePopup(): void {
    editingId = null; popup.style.display = 'none'; render();
}

function savePopup(): void {
    if (!editingId) return;
    const dur   = Math.max(0.05, parseFloat(ppDur.value) || 0.1);
    const gain  = parseFloat(ppGain.value);
    const delay = parseFloat(ppDelay.value);

    if (editingKind === 'tone') {
        const ev = tones.find(t => t.id === editingId);
        if (ev) {
            ev.duration = dur; ev.type = ppType.value as OscType;
            ev.gain = gain; ev.delay = delay;
            ev.glideTo = ppGlide.value ? parseInt(ppGlide.value) : null;
        }
    } else {
        const ev = noises.find(n => n.id === editingId);
        if (ev) {
            ev.duration = dur; ev.gain = gain; ev.delay = delay;
            ev.lowpass  = parseFloat(ppLp.value) || 2200;
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
        const ch  = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
        cachedNoiseBuffer = buf;
    }
    return cachedNoiseBuffer;
}

function schedTone(ctx: AudioContext, freq: number, dur: number, type: OscType, gain: number, startAt: number, glidedFreq: number | null): void {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    const att = Math.min(0.02, dur * 0.35);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (glidedFreq !== null && glidedFreq > 0)
        osc.frequency.exponentialRampToValueAtTime(glidedFreq, startAt + dur);
    g.gain.setValueAtTime(ENV_MIN, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(ENV_MIN, gain), startAt + att);
    g.gain.exponentialRampToValueAtTime(ENV_MIN, startAt + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + dur);
}

function schedNoise(ctx: AudioContext, dur: number, gain: number, lp: number, hp: number, startAt: number): void {
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx);
    const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = hp;
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass';  lpf.frequency.value = lp;
    const g   = ctx.createGain();
    g.gain.setValueAtTime(ENV_MIN, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(ENV_MIN, gain), startAt + 0.01);
    g.gain.exponentialRampToValueAtTime(ENV_MIN, startAt + dur);
    src.connect(hpf); hpf.connect(lpf); lpf.connect(g); g.connect(ctx.destination);
    src.start(startAt); src.stop(startAt + dur);
}

function startPlayback(): void {
    if (isPlaying) stopPlayback();
    const ctx  = getCtx();
    const now  = ctx.currentTime;
    playhead   = 0;

    tones.forEach(ev => {
        const freq  = NOTES[ev.noteIdx].freq;
        const glide = ev.glideTo !== null ? NOTES[ev.glideTo].freq : null;
        schedTone(ctx, freq, ev.duration, ev.type, ev.gain, now + ev.startTime + ev.delay, glide);
    });
    noises.forEach(ev => {
        schedNoise(ctx, ev.duration, ev.gain, ev.lowpass, ev.highpass, now + ev.startTime + ev.delay);
    });

    const maxT = Math.max(
        0,
        ...tones.map(e  => e.startTime + e.delay + e.duration),
        ...noises.map(e => e.startTime + e.delay + e.duration),
    );

    isPlaying = true;
    playBtn.disabled = true; stopBtn.disabled = false;

    function tick(): void {
        if (!isPlaying) return;
        playhead = ctx.currentTime - now;

        // Auto-scroll to follow playhead
        const pxPos = playhead * PPS;
        const vw    = visibleW();
        if (pxPos - scrollX > vw - AUTOSCROLL_MARGIN) scrollX = Math.max(0, pxPos - AUTOSCROLL_MARGIN);

        render();
        if (playhead > maxT + 0.4) { stopPlayback(); return; }
        rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
}

function stopPlayback(): void {
    isPlaying = false;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    playhead = 0;
    playBtn.disabled = false; stopBtn.disabled = true;
    render();
}

// ── Code export ────────────────────────────────────────────────────────────────
function generateCode(): string {
    if (tones.length === 0 && noises.length === 0) return '// No events on the timeline yet.';

    const events: { t: number; line: string }[] = [];

    tones.forEach(ev => {
        const freq  = NOTES[ev.noteIdx].freq;
        const glide = ev.glideTo !== null ? NOTES[ev.glideTo].freq : null;
        const at    = fmt(ev.startTime + ev.delay);
        const glideArg = glide !== null ? `, ${fmt(glide)}` : '';
        events.push({ t: ev.startTime,
            line: `this.playTone(${fmt(freq)}, ${fmt(ev.duration)}, '${ev.type}', ${fmt(ev.gain)}, ENVELOPE_MIN_GAIN, ${at}${glideArg}); // ${NOTES[ev.noteIdx].name}` });
    });

    noises.forEach(ev => {
        const at = fmt(ev.startTime + ev.delay);
        events.push({ t: ev.startTime,
            line: `this.playNoise(${fmt(ev.duration)}, ${fmt(ev.gain)}, ${fmt(ev.lowpass)}, ${fmt(ev.highpass)}, ${at});` });
    });

    events.sort((a, b) => a.t - b.t);
    return [
        '// ── Paste into your AudioManager play*() method ──────────────',
        '// ENVELOPE_MIN_GAIN is exported from src/AudioManager.ts',
        ...events.map(e => e.line),
    ].join('\n');
}

// ── Init ───────────────────────────────────────────────────────────────────────
function init(): void {
    buildKeyCol();
    buildGlideOptions(cfgGlideEl, true);
    buildGlideOptions(ppGlide,    true);
    resizeAll();
    render();

    window.addEventListener('resize', () => { resizeAll(); render(); });

    // Toolbar
    cfgDurEl.addEventListener('change',  () => { cfgDur   = parseFloat(cfgDurEl.value)  || 0.25; });
    cfgBpmEl.addEventListener('change',  () => { cfgBpm   = Math.max(40, Math.min(300, parseFloat(cfgBpmEl.value) || 120)); cfgBpmEl.value = String(cfgBpm); render(); });
    cfgTypeEl.addEventListener('change', () => { cfgType  = cfgTypeEl.value as OscType; });
    cfgGainEl.addEventListener('input',  () => { cfgGain  = parseFloat(cfgGainEl.value); cfgGainV.textContent  = cfgGain.toFixed(2); });
    cfgDelayEl.addEventListener('input', () => { cfgDelay = parseFloat(cfgDelayEl.value); cfgDelayV.textContent = cfgDelay.toFixed(1) + 's'; });
    cfgGlideEl.addEventListener('change',() => { cfgGlide = cfgGlideEl.value ? parseInt(cfgGlideEl.value) : null; });

    // Popup live preview
    ppGain.addEventListener('input',  () => { ppGainV.textContent  = parseFloat(ppGain.value).toFixed(2); });
    ppDelay.addEventListener('input', () => { ppDelayV.textContent = parseFloat(ppDelay.value).toFixed(1) + 's'; });

    // Popup actions
    ppSave.addEventListener('click', savePopup);
    ppDel.addEventListener('click',  () => {
        if (!editingId) return;
        tones  = tones.filter(t => t.id !== editingId);
        noises = noises.filter(n => n.id !== editingId);
        closePopup();
    });
    ppX.addEventListener('click', closePopup);

    // Header buttons
    playBtn.addEventListener('click',   startPlayback);
    stopBtn.addEventListener('click',   stopPlayback);
    clearBtn.addEventListener('click',  () => {
        stopPlayback(); tones = []; noises = []; scrollX = 0; closePopup(); render();
    });
    exportBtn.addEventListener('click', () => {
        codeTa.value = generateCode(); codeTa.select();
    });
    copyBtn.addEventListener('click', () => navigator.clipboard.writeText(codeTa.value));

    // Timeline interaction
    tlCanvas.addEventListener('mousedown', onTlDown);
    tlCanvas.addEventListener('contextmenu', onTlCtx);
    noiseCanvas.addEventListener('mousedown', onNoiseDown);
    noiseCanvas.addEventListener('contextmenu', onNoiseCtx);

    // Horizontal scroll via wheel
    const EDITABLE = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
    const isEditable = (t: EventTarget | null): boolean =>
        t instanceof Element && EDITABLE.has(t.tagName);

    tlClip.addEventListener('wheel',    onWheel, { passive: false });
    noiseClip.addEventListener('wheel', onWheel, { passive: false });
    editorOuter.addEventListener('wheel', (e: WheelEvent) => {
        if (!isEditable(e.target)) { onWheel(e); }
    }, { passive: false });

    // Horizontal scrollbar
    hscrollBar.addEventListener('scroll', () => {
        if (ignoreHscrollEvent) return;
        scrollX = hscrollBar.scrollLeft;
        render();
    });

    // Space = Play / Stop
    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && !isEditable(e.target)) {
            e.preventDefault();
            if (isPlaying) stopPlayback(); else startPlayback();
        }
    });

    // Close popup on outside click
    window.addEventListener('mousedown', e => {
        if (editingId && !popup.contains(e.target as Node)) closePopup();
    }, true);
}

init();
