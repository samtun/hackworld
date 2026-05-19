/**
 * HackWorld Sound Editor — DAW Timeline (main.ts)
 *
 * Piano-roll style canvas editor. Beat grid on X axis, chromatic scale on Y axis.
 * Scroll horizontally via mouse wheel or the scrollbar. Space = Play/Stop.
 * Click to add tones/noise, click to edit, right-click to delete.
 * Animated playhead during playback. Exports AudioManager snippets.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// ── Chromatic scale C6→C3 (top = high, bottom = low) ─────────────────────────
var NOTES = [
    { name: 'C6', freq: 1046.50 }, { name: 'B5', freq: 987.77 },
    { name: 'A#5', freq: 932.33 }, { name: 'A5', freq: 880.00 },
    { name: 'G#5', freq: 830.61 }, { name: 'G5', freq: 783.99 },
    { name: 'F#5', freq: 739.99 }, { name: 'F5', freq: 698.46 },
    { name: 'E5', freq: 659.25 }, { name: 'D#5', freq: 622.25 },
    { name: 'D5', freq: 587.33 }, { name: 'C#5', freq: 554.37 },
    { name: 'C5', freq: 523.25 }, { name: 'B4', freq: 493.88 },
    { name: 'A#4', freq: 466.16 }, { name: 'A4', freq: 440.00 },
    { name: 'G#4', freq: 415.30 }, { name: 'G4', freq: 392.00 },
    { name: 'F#4', freq: 369.99 }, { name: 'F4', freq: 349.23 },
    { name: 'E4', freq: 329.63 }, { name: 'D#4', freq: 311.13 },
    { name: 'D4', freq: 293.66 }, { name: 'C#4', freq: 277.18 },
    { name: 'C4', freq: 261.63 }, { name: 'B3', freq: 246.94 },
    { name: 'A#3', freq: 233.08 }, { name: 'A3', freq: 220.00 },
    { name: 'G#3', freq: 207.65 }, { name: 'G3', freq: 196.00 },
    { name: 'F#3', freq: 185.00 }, { name: 'F3', freq: 174.61 },
    { name: 'E3', freq: 164.81 }, { name: 'D#3', freq: 155.56 },
    { name: 'D3', freq: 146.83 }, { name: 'C#3', freq: 138.59 },
    { name: 'C3', freq: 130.81 },
];
// ── Beat duration fractions (stored value = beat multiplier, e.g. 0.25 = 1/4 beat) ─
var BEAT_FRACTIONS = [
    { label: '1/8', value: 1 / 8 },
    { label: '1/4', value: 1 / 4 },
    { label: '1/2', value: 1 / 2 },
    { label: '1/1', value: 1 },
    { label: '2', value: 2 },
    { label: '4', value: 4 },
    { label: '8', value: 8 },
];
// Computed once at startup for duration-resize clamping.
var MIN_DURATION_BEATS = BEAT_FRACTIONS.reduce(function (min, frac) { return Math.min(min, frac.value); }, Number.POSITIVE_INFINITY);
// ── Noise track labels ────────────────────────────────────────────────────────
var NOISE_TRACK_LABELS = ['A', 'B', 'C'];
// ── Layout constants ──────────────────────────────────────────────────────────
var PPS = 120; // pixels per second
var ROW_H = 22; // row height px
var NOISE_H = 23; // noise strip height px
var RULER_H = 22; // ruler height px (larger for bigger font)
var MIN_SECS = 10; // minimum timeline width in seconds
var ENV_MIN = 0.0001;
var AUTOSCROLL_MARGIN = 80; // px from right edge before auto-scroll kicks in
var LOOP_LOOKAHEAD = 0.3; // seconds — schedule next loop pass this far ahead
var STOP_GRACE = 0.4; // seconds past maxT before auto-stopping non-looped play
var MIN_LOOP_PERIOD = 0.001; // minimum loop period to prevent division by zero
var MIN_BPM = 40;
var MAX_BPM = 300;
var HANDLE_HEIGHT_RATIO = 0.6;
// ── State ─────────────────────────────────────────────────────────────────────
var tones = [];
/** Flat collection of all noise events; each event carries its own row (0=A, 1=B, 2=C). */
var noises = [];
var scrollH = 0; // horizontal scroll in px
var editingId = null;
var editingKind = 'tone';
var isPlaying = false;
var playhead = 0; // seconds
var rafId = null;
var audioCtx = null;
var cfgDur = 1; // beat multiplier: 1 = 1 full beat (1/1)
var cfgType = 'triangle';
var cfgGain = 0.06;
var cfgDropoff = 0.3; // 0.1 = fast decay, 1.0 = hold constant
var cfgGlide = null;
var cfgBpm = 120; // beats per minute
var cfgLoop = true; // loop playback (on by default)
var cfgLowpass = 2200; // default noise lowpass Hz
var cfgHighpass = 100; // default noise highpass Hz
var cfgSnap = 0.25; // snap unit as beat multiplier (0.25 = 1/4 beat)
// ── Selection & drag state ────────────────────────────────────────────────────
var selectedIds = new Set();
var dragMoveState = null;
var resizeState = null;
var selRectState = null;
// ── DOM refs ──────────────────────────────────────────────────────────────────
var tlCanvas = document.getElementById('tl-canvas');
var noiseCanvas = document.getElementById('noise-canvas');
var noiseClip = document.getElementById('noise-clip');
var noiseKeyCol = document.getElementById('noise-key-col');
var rulerCanvas = document.getElementById('ruler-canvas');
var editorOuter = document.getElementById('editor-outer');
var tlClip = document.getElementById('tl-clip');
var rulerClip = document.getElementById('ruler-clip');
var keyCol = document.getElementById('key-col');
var playBtn = document.getElementById('play-btn');
var stopBtn = document.getElementById('stop-btn');
var clearBtn = document.getElementById('clear-btn');
var exportBtn = document.getElementById('export-btn');
var jsonBtn = document.getElementById('json-btn');
var cfgLoopEl = document.getElementById('cfg-loop');
var cfgDurEl = document.getElementById('cfg-dur');
var cfgBpmEl = document.getElementById('cfg-bpm');
var cfgTypeEl = document.getElementById('cfg-type');
var cfgGainEl = document.getElementById('cfg-gain');
var cfgDropoffEl = document.getElementById('cfg-dropoff');
var cfgDropoffV = document.getElementById('cfg-dropoff-v');
var cfgGlideEl = document.getElementById('cfg-glide');
var cfgLpEl = document.getElementById('cfg-lp');
var cfgHpEl = document.getElementById('cfg-hp');
var cfgSnapEl = document.getElementById('cfg-snap');
var popup = document.getElementById('popup');
var popupTitle = document.getElementById('popup-title');
var ppDur = document.getElementById('pp-dur');
var ppType = document.getElementById('pp-type');
var ppTypeRow = document.getElementById('pp-type-row');
var ppGain = document.getElementById('pp-gain');
var ppDropoff = document.getElementById('pp-dropoff');
var ppDropoffV = document.getElementById('pp-dropoff-v');
var ppDropoffRow = document.getElementById('pp-dropoff-row');
var ppGlide = document.getElementById('pp-glide');
var ppGlideRow = document.getElementById('pp-glide-row');
var ppLpRow = document.getElementById('pp-lp-row');
var ppLp = document.getElementById('pp-lp');
var ppHpRow = document.getElementById('pp-hp-row');
var ppHp = document.getElementById('pp-hp');
var ppSave = document.getElementById('pp-save');
var ppDel = document.getElementById('pp-del');
var ppX = document.getElementById('popup-x');
// Selection panel
var selPanel = document.getElementById('sel-panel');
var selPanelX = document.getElementById('sel-x');
var selCountEl = document.getElementById('sel-count');
var selDur = document.getElementById('sel-dur');
var selTypeRow = document.getElementById('sel-type-row');
var selType = document.getElementById('sel-type');
var selGain = document.getElementById('sel-gain');
var selDropoff = document.getElementById('sel-dropoff');
var selDropoffV = document.getElementById('sel-dropoff-v');
var selGlideRow = document.getElementById('sel-glide-row');
var selGlide = document.getElementById('sel-glide');
var selLpRow = document.getElementById('sel-lp-row');
var selLp = document.getElementById('sel-lp');
var selHpRow = document.getElementById('sel-hp-row');
var selHp = document.getElementById('sel-hp');
var selApplyBtn = document.getElementById('sel-apply');
var selDelBtn = document.getElementById('sel-del');
var codeTa = document.getElementById('code-ta');
var copyBtn = document.getElementById('copy-btn');
var codeSection = document.getElementById('code-section');
var codeHdr = document.getElementById('code-hdr');
var hscrollBar = document.getElementById('hscroll-bar');
var hscrollInner = document.getElementById('hscroll-inner');
// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }
function fmt(n) { return parseFloat(n.toFixed(5)).toString(); }
/** Find a noise event by id. */
function findNoiseById(id) {
    var _a;
    return (_a = noises.find(function (n) { return n.id === id; })) !== null && _a !== void 0 ? _a : null;
}
/** Remove events with the given ids from the noise collection. */
function removeNoisesById(ids) {
    noises = noises.filter(function (n) { return !ids.has(n.id); });
}
/** Determine the current selected event kind. */
function getSelectionKind() {
    var toneIds = new Set(tones.map(function (t) { return t.id; }));
    var noiseIds = new Set(noises.map(function (n) { return n.id; }));
    var hasTone = false;
    var hasNoise = false;
    for (var _i = 0, selectedIds_1 = selectedIds; _i < selectedIds_1.length; _i++) {
        var id = selectedIds_1[_i];
        if (!hasTone && toneIds.has(id))
            hasTone = true;
        if (!hasNoise && noiseIds.has(id))
            hasNoise = true;
        if (hasTone && hasNoise)
            return 'mixed';
    }
    if (hasTone)
        return 'tone';
    if (hasNoise)
        return 'noise';
    return 'none';
}
/** Add a clicked node to selection while enforcing tone/noise separation. */
function shiftSelectNode(id, kind) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
        return;
    }
    var selectionKind = getSelectionKind();
    var mustReset = selectionKind === 'mixed' ||
        (kind === 'tone' && selectionKind === 'noise') ||
        (kind === 'noise' && selectionKind === 'tone');
    if (mustReset) {
        selectedIds = new Set([id]);
        return;
    }
    selectedIds.add(id);
}
/** Snap a beat duration to the nearest configured beat fraction. */
function snapDurationToFraction(durationBeats) {
    var clamped = Math.max(MIN_DURATION_BEATS, durationBeats);
    var best = BEAT_FRACTIONS[0].value;
    var bestDist = Math.abs(clamped - best);
    for (var _i = 0, BEAT_FRACTIONS_1 = BEAT_FRACTIONS; _i < BEAT_FRACTIONS_1.length; _i++) {
        var frac = BEAT_FRACTIONS_1[_i];
        var dist = Math.abs(clamped - frac.value);
        if (dist < bestDist) {
            best = frac.value;
            bestDist = dist;
        }
    }
    return best;
}
/** Duration of one beat in seconds at the current BPM. */
function beatDur() { return 60 / cfgBpm; }
/** Return the CSS-pixel width of the visible timeline area. */
function visibleW() { return tlClip.clientWidth || 800; }
/** Total virtual timeline width in px (based on event extents). */
function virtualW() {
    var bd = beatDur();
    var maxT = Math.max.apply(Math, __spreadArray(__spreadArray([MIN_SECS], tones.map(function (e) { return e.startTime + e.duration * bd + 2; }), false), noises.map(function (e) { return e.startTime + e.duration * bd + 2; }), false));
    return maxT * PPS;
}
// ── Canvas scaling ────────────────────────────────────────────────────────────
function setCanvas(c, cssW, cssH) {
    var dpr = window.devicePixelRatio || 1;
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    c.style.width = "".concat(cssW, "px");
    c.style.height = "".concat(cssH, "px");
}
function ctx2d(c) {
    var ctx = c.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
}
// ── Build key column labels ────────────────────────────────────────────────────
function buildKeyCol() {
    keyCol.innerHTML = '';
    NOTES.forEach(function (n) {
        var div = document.createElement('div');
        div.className = 'key-lbl';
        var sharp = n.name.includes('#');
        var isC = n.name.startsWith('C') && !sharp;
        if (isC)
            div.classList.add('key-c');
        else if (sharp)
            div.classList.add('key-sharp');
        else
            div.classList.add('key-nat');
        div.style.height = "".concat(ROW_H, "px");
        div.textContent = n.name;
        keyCol.appendChild(div);
    });
}
// ── Build noise key column labels ─────────────────────────────────────────────
function buildNoiseKeyCol() {
    noiseKeyCol.innerHTML = '';
    NOISE_TRACK_LABELS.forEach(function (lbl) {
        var div = document.createElement('div');
        div.className = 'noise-row-lbl';
        div.style.height = "".concat(NOISE_H, "px");
        div.textContent = lbl;
        noiseKeyCol.appendChild(div);
    });
}
function buildDurationOptions(sel, defaultValue) {
    sel.innerHTML = '';
    BEAT_FRACTIONS.forEach(function (f) {
        var o = document.createElement('option');
        o.value = String(f.value);
        o.textContent = f.label;
        if (f.value === defaultValue)
            o.selected = true;
        sel.appendChild(o);
    });
}
// ── Populate glide selectors ───────────────────────────────────────────────────
function buildGlideOptions(sel, includeNone) {
    sel.innerHTML = '';
    if (includeNone) {
        var o = document.createElement('option');
        o.value = '';
        o.textContent = 'None';
        sel.appendChild(o);
    }
    NOTES.forEach(function (n, i) {
        var o = document.createElement('option');
        o.value = String(i);
        o.textContent = n.name;
        sel.appendChild(o);
    });
}
// ── Resize all canvases ────────────────────────────────────────────────────────
function resizeAll() {
    var tlH = NOTES.length * ROW_H;
    var tlW = visibleW();
    var rW = rulerClip.clientWidth || tlW;
    setCanvas(tlCanvas, tlW, tlH);
    setCanvas(rulerCanvas, rW, RULER_H);
    var nW = noiseClip.clientWidth || tlW;
    setCanvas(noiseCanvas, nW, NOISE_TRACK_LABELS.length * NOISE_H);
}
// ── Grid helpers ───────────────────────────────────────────────────────────────
function drawGrid(cx, w, h) {
    var bd = beatDur();
    var startBeat = Math.floor(scrollX / PPS / bd);
    var endBeat = Math.ceil((scrollX + w) / PPS / bd) + 1;
    for (var beat = startBeat; beat <= endBeat; beat++) {
        var x = Math.round(beat * bd * PPS - scrollX) + 0.5;
        var isBar = beat % 4 === 0;
        cx.strokeStyle = isBar ? '#2e4870' : '#1a3050';
        cx.lineWidth = isBar ? 1 : 0.5;
        cx.beginPath();
        cx.moveTo(x, 0);
        cx.lineTo(x, h);
        cx.stroke();
    }
}
// ── Render ruler ───────────────────────────────────────────────────────────────
function renderRuler() {
    var w = rulerClip.clientWidth || 800;
    var cx = ctx2d(rulerCanvas);
    cx.clearRect(0, 0, w, RULER_H);
    cx.fillStyle = '#09090e';
    cx.fillRect(0, 0, w, RULER_H);
    var bd = beatDur();
    var startBeat = Math.floor(scrollX / PPS / bd);
    var endBeat = Math.ceil((scrollX + w) / PPS / bd) + 1;
    cx.font = '10px monospace';
    cx.textAlign = 'left';
    for (var beat = startBeat; beat <= endBeat; beat++) {
        var x = Math.round(beat * bd * PPS - scrollX) + 0.5;
        var isBar = beat % 4 === 0;
        cx.strokeStyle = isBar ? '#303858' : '#1a2030';
        cx.lineWidth = isBar ? 1 : 0.5;
        cx.beginPath();
        cx.moveTo(x, isBar ? 0 : RULER_H - 6);
        cx.lineTo(x, RULER_H);
        cx.stroke();
        if (isBar) {
            cx.fillStyle = '#7080a0';
            cx.fillText("".concat(Math.floor(beat / 4) + 1), x + 3, 13);
        }
    }
    // Playhead on ruler
    if (isPlaying) {
        var px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600cc';
        cx.fillRect(px - 1, 0, 2, RULER_H);
    }
}
function toneNodeGeometry(ev, bd) {
    var bh = ROW_H - 4;
    return {
        x: ev.startTime * PPS - scrollX,
        bw: Math.max(6, ev.duration * bd * PPS),
        y: ev.noteIdx * ROW_H + 2,
        bh: bh,
        handleSize: bh * HANDLE_HEIGHT_RATIO,
    };
}
function noiseNodeGeometry(ev, bd) {
    var bh = NOISE_H - 4;
    return {
        x: ev.startTime * PPS - scrollX,
        bw: Math.max(6, ev.duration * bd * PPS),
        y: ev.row * NOISE_H + 2,
        bh: bh,
        handleSize: bh * HANDLE_HEIGHT_RATIO,
    };
}
// ── Render main timeline ───────────────────────────────────────────────────────
function renderTimeline() {
    var w = visibleW();
    var h = NOTES.length * ROW_H;
    var cx = ctx2d(tlCanvas);
    cx.clearRect(0, 0, w, h);
    // Row backgrounds
    NOTES.forEach(function (n, i) {
        var y = i * ROW_H;
        var sharp = n.name.includes('#');
        var isC = n.name.startsWith('C') && !sharp;
        cx.fillStyle = isC ? '#0f1828' : sharp ? '#0a0f18' : '#0d1420';
        cx.fillRect(0, y, w, ROW_H);
        cx.fillStyle = '#141a26';
        cx.fillRect(0, y + ROW_H - 1, w, 1);
    });
    // Grid
    drawGrid(cx, w, h);
    // Tone blocks
    var bd = beatDur();
    for (var _i = 0, tones_1 = tones; _i < tones_1.length; _i++) {
        var ev = tones_1[_i];
        var _a = toneNodeGeometry(ev, bd), x = _a.x, bw = _a.bw, y = _a.y, bh = _a.bh, handleSize = _a.handleSize;
        if (x + bw < 0 || x > w)
            continue;
        var isSel = selectedIds.has(ev.id);
        var isEd = ev.id === editingId;
        cx.fillStyle = isSel ? '#2a6e7e' : (isEd ? '#2da0cc' : '#1c6e8e');
        cx.strokeStyle = isSel ? '#ffd600' : (isEd ? '#60d8f8' : '#30a8d0');
        cx.lineWidth = isSel ? 2 : (isEd ? 2 : 1);
        roundRect(cx, x, y, bw, bh, 3);
        cx.fill();
        cx.stroke();
        drawDurationHandle(cx, x + bw, y + bh / 2, handleSize, isSel, '#1b2a3a');
        if (bw > 18) {
            cx.fillStyle = isSel ? '#ffd600' : '#a0d8f0';
            cx.font = '10px monospace';
            cx.textAlign = 'left';
            cx.fillText(NOTES[ev.noteIdx].name, x + 4, y + bh / 2 + 3);
        }
        // Glide indicator
        if (ev.glideTo !== null && ev.glideTo !== ev.noteIdx) {
            var sy = y + bh / 2;
            var ty = ev.glideTo * ROW_H + ROW_H / 2;
            cx.strokeStyle = '#ffd60080';
            cx.lineWidth = 1;
            cx.beginPath();
            cx.moveTo(x + bw, sy);
            cx.lineTo(x + bw, ty);
            cx.stroke();
        }
    }
    // Selection rectangle overlay (on tone canvas)
    if (selRectState && selRectState.active && selRectState.canvas === 'tone') {
        var rx0 = Math.min(selRectState.absX0, selRectState.absX1) - scrollX;
        var rx1 = Math.max(selRectState.absX0, selRectState.absX1) - scrollX;
        // absY values are canvas-relative; draw directly without scrollTop adjustment
        var ry0 = Math.min(selRectState.absY0, selRectState.absY1);
        var ry1 = Math.max(selRectState.absY0, selRectState.absY1);
        cx.fillStyle = 'rgba(0,229,255,0.08)';
        cx.strokeStyle = 'rgba(0,229,255,0.65)';
        cx.lineWidth = 1;
        cx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        cx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }
    // Playhead
    if (isPlaying || playhead > 0) {
        var px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600bb';
        cx.fillRect(px - 1, 0, 2, h);
    }
}
// ── Render unified noise section ───────────────────────────────────────────────
function renderNoise() {
    var totalH = NOISE_TRACK_LABELS.length * NOISE_H;
    var w = noiseClip.clientWidth || 800;
    var cx = ctx2d(noiseCanvas);
    cx.clearRect(0, 0, w, totalH);
    cx.fillStyle = '#080812';
    cx.fillRect(0, 0, w, totalH);
    drawGrid(cx, w, totalH);
    // Subtle row separators
    cx.fillStyle = '#141a26';
    for (var i = 1; i < NOISE_TRACK_LABELS.length; i++) {
        cx.fillRect(0, i * NOISE_H - 1, w, 1);
    }
    var bd = beatDur();
    for (var _i = 0, noises_1 = noises; _i < noises_1.length; _i++) {
        var ev = noises_1[_i];
        var _a = noiseNodeGeometry(ev, bd), x = _a.x, bw = _a.bw, y = _a.y, bh = _a.bh, handleSize = _a.handleSize;
        if (x + bw < 0 || x > w)
            continue;
        var isSel = selectedIds.has(ev.id);
        var isEd = ev.id === editingId;
        cx.fillStyle = isSel ? '#7a3f9e' : (isEd ? '#aa5099' : '#7a3f6e');
        cx.strokeStyle = isSel ? '#ffd600' : (isEd ? '#d080c8' : '#b060a0');
        cx.lineWidth = isSel ? 2 : (isEd ? 2 : 1);
        roundRect(cx, x, y, bw, bh, 3);
        cx.fill();
        cx.stroke();
        drawDurationHandle(cx, x + bw, y + bh / 2, handleSize, isSel, '#2a1630');
    }
    // Selection rectangle overlay
    if (selRectState && selRectState.active && selRectState.canvas === 'noise') {
        var rx0 = Math.min(selRectState.absX0, selRectState.absX1) - scrollX;
        var rx1 = Math.max(selRectState.absX0, selRectState.absX1) - scrollX;
        var ry0 = Math.min(selRectState.absY0, selRectState.absY1);
        var ry1 = Math.max(selRectState.absY0, selRectState.absY1);
        cx.fillStyle = 'rgba(0,229,255,0.08)';
        cx.strokeStyle = 'rgba(0,229,255,0.65)';
        cx.lineWidth = 1;
        cx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        cx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }
    if (isPlaying || playhead > 0) {
        var px = Math.round(playhead * PPS - scrollX);
        cx.fillStyle = '#ffd600bb';
        cx.fillRect(px - 1, 0, 2, totalH);
    }
}
function roundRect(cx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    cx.beginPath();
    cx.moveTo(x + rr, y);
    cx.lineTo(x + w - rr, y);
    cx.arcTo(x + w, y, x + w, y + rr, rr);
    cx.lineTo(x + w, y + h - rr);
    cx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    cx.lineTo(x + rr, y + h);
    cx.arcTo(x, y + h, x, y + h - rr, rr);
    cx.lineTo(x, y + rr);
    cx.arcTo(x, y, x + rr, y, rr);
    cx.closePath();
}
function drawDurationHandle(cx, centerX, centerY, size, isSelected, fill) {
    var half = size / 2;
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
function pointInDiamond(px, py, centerX, centerY, size) {
    var half = size / 2;
    // Defensive guard against accidental zero-sized handles.
    if (half <= 0)
        return false;
    return (Math.abs(px - centerX) / half) + (Math.abs(py - centerY) / half) <= 1;
}
// ── Scrollbar sync ─────────────────────────────────────────────────────────────
var ignoreHscrollEvent = false;
function syncScrollbar() {
    ignoreHscrollEvent = true;
    hscrollInner.style.width = "".concat(virtualW(), "px");
    hscrollBar.scrollLeft = scrollX;
    ignoreHscrollEvent = false;
}
// ── Master render ──────────────────────────────────────────────────────────────
function render() {
    renderRuler();
    renderTimeline();
    renderNoise();
    syncScrollbar();
}
// ── Hit-testing ────────────────────────────────────────────────────────────────
function hitTone(cx, cy) {
    var t = (cx + scrollX) / PPS;
    var bd = beatDur();
    var row = Math.floor(cy / ROW_H);
    for (var _i = 0, tones_2 = tones; _i < tones_2.length; _i++) {
        var ev = tones_2[_i];
        if (ev.noteIdx === row && t >= ev.startTime && t <= ev.startTime + ev.duration * bd)
            return ev;
    }
    return null;
}
function hitToneHandle(cx, cy) {
    var bd = beatDur();
    for (var _i = 0, tones_3 = tones; _i < tones_3.length; _i++) {
        var ev = tones_3[_i];
        var _a = toneNodeGeometry(ev, bd), x = _a.x, bw = _a.bw, y = _a.y, bh = _a.bh, handleSize = _a.handleSize;
        if (pointInDiamond(cx, cy, x + bw, y + bh / 2, handleSize))
            return ev;
    }
    return null;
}
function hitNoise(cx, cy) {
    var row = Math.floor(cy / NOISE_H);
    var t = (cx + scrollX) / PPS;
    var bd = beatDur();
    for (var _i = 0, noises_2 = noises; _i < noises_2.length; _i++) {
        var ev = noises_2[_i];
        if (ev.row === row && t >= ev.startTime && t <= ev.startTime + ev.duration * bd)
            return ev;
    }
    return null;
}
function hitNoiseHandle(cx, cy) {
    var bd = beatDur();
    for (var _i = 0, noises_3 = noises; _i < noises_3.length; _i++) {
        var ev = noises_3[_i];
        var _a = noiseNodeGeometry(ev, bd), x = _a.x, bw = _a.bw, y = _a.y, bh = _a.bh, handleSize = _a.handleSize;
        if (pointInDiamond(cx, cy, x + bw, y + bh / 2, handleSize))
            return ev;
    }
    return null;
}
function hitNoiseRow(cy) {
    return Math.min(NOISE_TRACK_LABELS.length - 1, Math.max(0, Math.floor(cy / NOISE_H)));
}
// ── Canvas coordinate helper ───────────────────────────────────────────────────
function canvasXY(canvas, e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}
// ── Timeline mouse events ──────────────────────────────────────────────────────
var DRAG_THRESHOLD = 5; // px before a movement is considered a drag
function onTlDown(e) {
    if (e.button !== 0)
        return;
    var _a = canvasXY(tlCanvas, e), x = _a.x, y = _a.y;
    // Keep Shift+click semantics for selection toggle/additive flows; don't start resize with Shift held.
    var handleHit = !e.shiftKey ? hitToneHandle(x, y) : null;
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
    var hit = hitTone(x, y);
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
        var origPositions = new Map();
        var _loop_1 = function (id) {
            var t = tones.find(function (t) { return t.id === id; });
            if (t)
                origPositions.set(id, { startTime: t.startTime, noteIdx: t.noteIdx });
            var nf = findNoiseById(id);
            if (nf)
                origPositions.set(id, { startTime: nf.startTime, noteIdx: 0 });
        };
        for (var _i = 0, selectedIds_2 = selectedIds; _i < selectedIds_2.length; _i++) {
            var id = selectedIds_2[_i];
            _loop_1(id);
        }
        dragMoveState = {
            origPositions: origPositions,
            singleId: hit.id, singleKind: 'tone',
            startClientX: e.clientX, startClientY: e.clientY, moved: false,
        };
        render();
    }
    else {
        // Empty space: start selection rect / pending add
        var row = Math.floor(y / ROW_H);
        var absT = Math.max(0, (x + scrollX) / PPS);
        // y from getBoundingClientRect is already canvas-relative; no scrollTop adjustment needed.
        var additive = e.shiftKey;
        var hadSelection = selectedIds.size > 0;
        var baseSelection = new Set(selectedIds);
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
            additive: additive,
            baseSelection: baseSelection,
        };
        render();
    }
}
function onTlCtx(e) {
    e.preventDefault();
    var _a = canvasXY(tlCanvas, e), x = _a.x, y = _a.y;
    var hit = hitTone(x, y);
    if (hit) {
        tones = tones.filter(function (t) { return t.id !== hit.id; });
        selectedIds.delete(hit.id);
        updateSelPanel();
        closePopup();
        render();
    }
}
// ── Noise mouse events ─────────────────────────────────────────────────────────
function onNoiseDown(e) {
    if (e.button !== 0)
        return;
    var _a = canvasXY(noiseCanvas, e), x = _a.x, y = _a.y;
    // Keep Shift+click semantics for selection toggle/additive flows; don't start resize with Shift held.
    var handleHit = !e.shiftKey ? hitNoiseHandle(x, y) : null;
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
    var hit = hitNoise(x, y);
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
        var origPositions = new Map();
        var _loop_2 = function (id) {
            var t = tones.find(function (t) { return t.id === id; });
            if (t)
                origPositions.set(id, { startTime: t.startTime, noteIdx: t.noteIdx });
            var nf = findNoiseById(id);
            if (nf)
                origPositions.set(id, { startTime: nf.startTime, noteIdx: 0 });
        };
        for (var _i = 0, selectedIds_3 = selectedIds; _i < selectedIds_3.length; _i++) {
            var id = selectedIds_3[_i];
            _loop_2(id);
        }
        dragMoveState = {
            origPositions: origPositions,
            singleId: hit.id, singleKind: 'noise',
            startClientX: e.clientX, startClientY: e.clientY, moved: false,
        };
        render();
    }
    else {
        var absT = Math.max(0, (x + scrollX) / PPS);
        var additive = e.shiftKey;
        var hadSelection = selectedIds.size > 0;
        var baseSelection = new Set(selectedIds);
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
            additive: additive,
            baseSelection: baseSelection,
        };
        render();
    }
}
function onNoiseCtx(e) {
    e.preventDefault();
    var _a = canvasXY(noiseCanvas, e), x = _a.x, y = _a.y;
    var hit = hitNoise(x, y);
    if (hit) {
        removeNoisesById(new Set([hit.id]));
        selectedIds.delete(hit.id);
        updateSelPanel();
        closePopup();
        render();
    }
}
// ── Global mouse move / up (drag & selection rect) ────────────────────────────
function onGlobalMove(e) {
    if (resizeState) {
        var deltaSecs = (e.clientX - resizeState.startClientX) / PPS;
        var event_1 = resizeState.kind === 'tone'
            ? tones.find(function (t) { return t.id === resizeState.id; })
            : findNoiseById(resizeState.id);
        if (!event_1)
            return;
        var durationBeats = resizeState.origDuration + (deltaSecs / beatDur());
        event_1.duration = snapDurationToFraction(durationBeats);
        render();
        return;
    }
    if (dragMoveState) {
        var dx = e.clientX - dragMoveState.startClientX;
        var dy = e.clientY - dragMoveState.startClientY;
        if (!dragMoveState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            dragMoveState.moved = true;
        }
        if (dragMoveState.moved) {
            var dtSecs = dx / PPS;
            var dRow = Math.round(dy / ROW_H);
            var _loop_3 = function (id, orig) {
                var newT = snapToGrid(orig.startTime + dtSecs);
                var tone = tones.find(function (t) { return t.id === id; });
                if (tone) {
                    tone.startTime = newT;
                    tone.noteIdx = Math.max(0, Math.min(NOTES.length - 1, orig.noteIdx + dRow));
                }
                var noiseFound = findNoiseById(id);
                if (noiseFound)
                    noiseFound.startTime = newT;
            };
            for (var _i = 0, _a = dragMoveState.origPositions; _i < _a.length; _i++) {
                var _b = _a[_i], id = _b[0], orig = _b[1];
                _loop_3(id, orig);
            }
            render();
        }
        return;
    }
    if (selRectState) {
        if (selRectState.canvas === 'tone') {
            var _c = canvasXY(tlCanvas, e), x = _c.x, y = _c.y;
            selRectState.absX1 = x + scrollX;
            // y from getBoundingClientRect is already canvas-relative; no scrollTop adjustment needed.
            selRectState.absY1 = y;
        }
        else {
            var _d = canvasXY(noiseCanvas, e), x = _d.x, y = _d.y;
            selRectState.absX1 = x + scrollX;
            selRectState.absY1 = y;
        }
        var dx = selRectState.absX1 - selRectState.absX0;
        var dy = selRectState.absY1 - selRectState.absY0;
        if (!selRectState.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            selRectState.active = true;
        }
        render();
    }
}
function onGlobalUp(_e) {
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
        }
        else if (dragMoveState.moved) {
            updateSelPanel();
        }
        dragMoveState = null;
        render();
        return;
    }
    if (selRectState) {
        if (selRectState.active) {
            finalizeSelection(selRectState);
        }
        else if (selRectState.addOnClick) {
            // Click (no drag): add tone or noise
            if (selRectState.canvas === 'tone' && selRectState.addRow >= 0 && selRectState.addRow < NOTES.length) {
                addTone(selRectState.addRow, selRectState.addTime);
            }
            else if (selRectState.canvas === 'noise') {
                addNoise(selRectState.addRow, selRectState.addTime);
            }
        }
        selRectState = null;
        render();
    }
}
// ── Selection finalisation ─────────────────────────────────────────────────────
function finalizeSelection(rect) {
    var x0 = Math.min(rect.absX0, rect.absX1);
    var x1 = Math.max(rect.absX0, rect.absX1);
    var y0 = Math.min(rect.absY0, rect.absY1);
    var y1 = Math.max(rect.absY0, rect.absY1);
    var bd = beatDur();
    var nextSelection = rect.additive ? new Set(rect.baseSelection) : new Set();
    if (rect.canvas === 'tone') {
        for (var _i = 0, tones_4 = tones; _i < tones_4.length; _i++) {
            var ev = tones_4[_i];
            var ex0 = ev.startTime * PPS;
            var ex1 = ex0 + ev.duration * bd * PPS;
            var ey0 = ev.noteIdx * ROW_H;
            var ey1 = ey0 + ROW_H;
            if (ex1 >= x0 && ex0 <= x1 && ey1 >= y0 && ey0 <= y1)
                nextSelection.add(ev.id);
        }
    }
    else {
        // Noise canvas: select all noise events whose time range overlaps the selection
        for (var _a = 0, noises_4 = noises; _a < noises_4.length; _a++) {
            var ev = noises_4[_a];
            var ex0 = ev.startTime * PPS;
            var ex1 = ex0 + ev.duration * bd * PPS;
            if (ex1 >= x0 && ex0 <= x1)
                nextSelection.add(ev.id);
        }
    }
    selectedIds = nextSelection;
    updateSelPanel();
}
// ── Horizontal wheel scroll ────────────────────────────────────────────────────
function onWheel(e) {
    // Shift + vertical scroll → horizontal timeline scroll
    if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        scrollX = Math.max(0, scrollX + e.deltaY);
        render();
    }
    else if (e.deltaX !== 0) {
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
function snapToGrid(t) {
    var snapUnit = cfgSnap * beatDur();
    if (snapUnit <= 0)
        return Math.max(0, t);
    return Math.max(0, Math.round(t / snapUnit) * snapUnit);
}
/**
 * Snap a time value to the last grid point at or before t (floor snap).
 * Used when placing new notes so the note always starts on the beat grid
 * line immediately to the left of the click position.
 */
function snapToGridFloor(t) {
    var snapUnit = cfgSnap * beatDur();
    if (snapUnit <= 0)
        return Math.max(0, t);
    return Math.max(0, Math.floor(t / snapUnit) * snapUnit);
}
// ── Add events ─────────────────────────────────────────────────────────────────
function addTone(noteIdx, startTime) {
    tones.push({ id: uid(), noteIdx: noteIdx, startTime: snapToGridFloor(startTime), duration: cfgDur, type: cfgType, gain: cfgGain, dropoff: cfgDropoff, glideTo: cfgGlide });
    render();
}
function addNoise(row, startTime) {
    noises.push({ id: uid(), row: row, startTime: snapToGridFloor(startTime), duration: cfgDur, gain: cfgGain, dropoff: cfgDropoff, lowpass: cfgLowpass, highpass: cfgHighpass });
    render();
}
// ── Popup ──────────────────────────────────────────────────────────────────────
function openPopup(id, kind, mx, my) {
    var _a, _b, _c, _d;
    editingId = id;
    editingKind = kind;
    if (kind === 'tone') {
        var ev = tones.find(function (t) { return t.id === id; });
        popupTitle.textContent = "Edit Tone \u2014 ".concat(NOTES[ev.noteIdx].name);
        ppTypeRow.style.display = '';
        ppGlideRow.style.display = '';
        ppLpRow.style.display = 'none';
        ppHpRow.style.display = 'none';
        ppDropoffRow.style.display = '';
        ppDur.value = String(ev.duration);
        ppType.value = ev.type;
        ppGain.value = String(ev.gain);
        ppDropoff.value = String((_a = ev.dropoff) !== null && _a !== void 0 ? _a : 0.3);
        ppDropoffV.textContent = ((_b = ev.dropoff) !== null && _b !== void 0 ? _b : 0.3).toFixed(2);
        ppGlide.value = ev.glideTo !== null ? String(ev.glideTo) : '';
    }
    else {
        var ev = findNoiseById(id);
        popupTitle.textContent = 'Edit Noise';
        ppTypeRow.style.display = 'none';
        ppGlideRow.style.display = 'none';
        ppLpRow.style.display = '';
        ppHpRow.style.display = '';
        ppDropoffRow.style.display = '';
        ppDur.value = String(ev.duration);
        ppGain.value = String(ev.gain);
        ppDropoff.value = String((_c = ev.dropoff) !== null && _c !== void 0 ? _c : 0.3);
        ppDropoffV.textContent = ((_d = ev.dropoff) !== null && _d !== void 0 ? _d : 0.3).toFixed(2);
        ppLp.value = String(ev.lowpass);
        ppHp.value = String(ev.highpass);
    }
    popup.style.display = 'block';
    var pw = 240;
    var ph = popup.scrollHeight + 20;
    var px = mx + 10;
    var py = my - 20;
    if (px + pw > window.innerWidth)
        px = mx - pw - 10;
    if (py + ph > window.innerHeight)
        py = window.innerHeight - ph - 8;
    popup.style.left = "".concat(Math.max(4, px), "px");
    popup.style.top = "".concat(Math.max(4, py), "px");
    render();
}
function closePopup() {
    editingId = null;
    popup.style.display = 'none';
    render();
}
function savePopup() {
    if (!editingId)
        return;
    var dur = parseFloat(ppDur.value) || 1;
    var gain = parseFloat(ppGain.value);
    var dropoff = Math.max(0.1, Math.min(1, parseFloat(ppDropoff.value) || 0.3));
    if (editingKind === 'tone') {
        var ev = tones.find(function (t) { return t.id === editingId; });
        if (ev) {
            ev.duration = dur;
            ev.type = ppType.value;
            ev.gain = gain;
            ev.dropoff = dropoff;
            ev.glideTo = ppGlide.value ? parseInt(ppGlide.value) : null;
        }
    }
    else {
        var ev = editingId ? findNoiseById(editingId) : null;
        if (ev) {
            ev.duration = dur;
            ev.gain = gain;
            ev.dropoff = dropoff;
            ev.lowpass = parseFloat(ppLp.value) || 2200;
            ev.highpass = parseFloat(ppHp.value) || 100;
        }
    }
    closePopup();
}
// ── Audio ──────────────────────────────────────────────────────────────────────
function getCtx() {
    if (!audioCtx)
        audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended')
        void audioCtx.resume();
    return audioCtx;
}
/** Cached noise buffer — reused across all scheduled noise events. */
var cachedNoiseBuffer = null;
function noiseBuffer(ctx) {
    if (!cachedNoiseBuffer || cachedNoiseBuffer.sampleRate !== ctx.sampleRate) {
        var len = Math.floor(ctx.sampleRate * 0.5);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var ch = buf.getChannelData(0);
        for (var i = 0; i < len; i++)
            ch[i] = Math.random() * 2 - 1;
        cachedNoiseBuffer = buf;
    }
    return cachedNoiseBuffer;
}
function schedTone(ctx, freq, dur, type, gain, dropoff, startAt, glidedFreq) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var att = Math.min(0.02, dur * 0.35);
    var endGain = Math.max(ENV_MIN, gain * dropoff);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    if (glidedFreq !== null && glidedFreq > 0)
        osc.frequency.exponentialRampToValueAtTime(glidedFreq, startAt + dur);
    g.gain.setValueAtTime(ENV_MIN, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(ENV_MIN, gain), startAt + att);
    g.gain.exponentialRampToValueAtTime(endGain, startAt + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + dur);
}
function schedNoise(ctx, dur, gain, dropoff, lp, hp, startAt) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    var hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = hp;
    var lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = lp;
    var g = ctx.createGain();
    var endGain = Math.max(ENV_MIN, gain * dropoff);
    g.gain.setValueAtTime(ENV_MIN, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(ENV_MIN, gain), startAt + 0.01);
    g.gain.exponentialRampToValueAtTime(endGain, startAt + dur);
    src.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(g);
    g.connect(ctx.destination);
    src.start(startAt);
    src.stop(startAt + dur);
}
function startPlayback() {
    if (isPlaying)
        stopPlayback();
    if (tones.length === 0 && noises.length === 0)
        return; // Nothing to play
    var ctx = getCtx();
    /**
     * Schedule all CURRENT tones and noises at the given absolute offset.
     * Reads tones/noises/BPM fresh each call so that edits made while playing
     * are automatically picked up on the next scheduled loop pass.
     * Returns the total duration of the scheduled pass.
     */
    function schedulePassFresh(offset) {
        var bd = beatDur();
        var passDur = Math.max.apply(Math, __spreadArray(__spreadArray([MIN_LOOP_PERIOD], tones.map(function (e) { return e.startTime + e.duration * bd; }), false), noises.map(function (e) { return e.startTime + e.duration * bd; }), false));
        tones.forEach(function (ev) {
            var _a;
            var freq = NOTES[ev.noteIdx].freq;
            var glide = ev.glideTo !== null ? NOTES[ev.glideTo].freq : null;
            schedTone(ctx, freq, ev.duration * bd, ev.type, ev.gain, (_a = ev.dropoff) !== null && _a !== void 0 ? _a : 0.3, offset + ev.startTime, glide);
        });
        noises.forEach(function (ev) {
            var _a;
            schedNoise(ctx, ev.duration * bd, ev.gain, (_a = ev.dropoff) !== null && _a !== void 0 ? _a : 0.3, ev.lowpass, ev.highpass, offset + ev.startTime);
        });
        return passDur;
    }
    // Schedule pass 1 immediately.
    var absStart = ctx.currentTime;
    var pass1Dur = schedulePassFresh(absStart);
    var scheduled = [{ abs: absStart, dur: pass1Dur }];
    if (cfgLoop) {
        // Pre-schedule a second pass immediately for a seamless first loop boundary.
        var p2Abs = absStart + pass1Dur;
        scheduled.push({ abs: p2Abs, dur: schedulePassFresh(p2Abs) });
    }
    isPlaying = true;
    playBtn.disabled = true;
    stopBtn.disabled = false;
    function tick() {
        if (!isPlaying)
            return;
        var now = ctx.currentTime;
        if (cfgLoop) {
            // Pop completed passes, always keeping at least one as the "current" pass.
            while (scheduled.length > 1 && now >= scheduled[0].abs + scheduled[0].dur) {
                scheduled.shift();
                scrollX = 0; // reset horizontal view on each loop wrap
            }
            playhead = now - scheduled[0].abs;
            // Extend the audio schedule when the last queued pass is about to end.
            // Uses fresh timeline data so edits appear on the upcoming pass.
            var last = scheduled[scheduled.length - 1];
            if (now >= last.abs + last.dur - LOOP_LOOKAHEAD) {
                var newAbs = last.abs + last.dur;
                scheduled.push({ abs: newAbs, dur: schedulePassFresh(newAbs) });
            }
        }
        else {
            playhead = now - absStart;
            if (playhead > pass1Dur + STOP_GRACE) {
                stopPlayback();
                return;
            }
        }
        // Auto-scroll to follow playhead
        var pxPos = playhead * PPS;
        var vw = visibleW();
        if (pxPos - scrollX > vw - AUTOSCROLL_MARGIN)
            scrollX = Math.max(0, pxPos - AUTOSCROLL_MARGIN);
        render();
        rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
}
function stopPlayback() {
    isPlaying = false;
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    playhead = 0;
    playBtn.disabled = false;
    stopBtn.disabled = true;
    // Close the audio context to immediately silence all scheduled nodes
    if (audioCtx) {
        void audioCtx.close();
        audioCtx = null;
        cachedNoiseBuffer = null; // buffer belongs to the closed context
    }
    render();
}
// ── Code export ────────────────────────────────────────────────────────────────
function generateCode() {
    var totalNoises = noises.length;
    if (tones.length === 0 && totalNoises === 0)
        return '// No events on the timeline yet.';
    var events = [];
    var bd = beatDur();
    // Compute loop period (max event end time)
    var passDur = Math.max.apply(Math, __spreadArray(__spreadArray([], tones.map(function (e) { return e.startTime + e.duration * bd; }), false), noises.map(function (e) { return e.startTime + e.duration * bd; }), false));
    tones.forEach(function (ev) {
        var _a;
        var freq = NOTES[ev.noteIdx].freq;
        var glide = ev.glideTo !== null ? NOTES[ev.glideTo].freq : null;
        var dur = ev.duration * bd;
        var at = fmt(ev.startTime);
        var endGain = fmt(Math.max(ENV_MIN, ev.gain * ((_a = ev.dropoff) !== null && _a !== void 0 ? _a : 0.3)));
        var glideArg = glide !== null ? ", ".concat(fmt(glide)) : '';
        events.push({
            t: ev.startTime,
            line: "this.playTone(".concat(fmt(freq), ", ").concat(fmt(dur), ", '").concat(ev.type, "', ").concat(fmt(ev.gain), ", ").concat(endGain, ", ").concat(at).concat(glideArg, "); // ").concat(NOTES[ev.noteIdx].name)
        });
    });
    noises.forEach(function (ev) {
        var _a;
        var dur = ev.duration * bd;
        var at = fmt(ev.startTime);
        var endGain = fmt(Math.max(ENV_MIN, ev.gain * ((_a = ev.dropoff) !== null && _a !== void 0 ? _a : 0.3)));
        events.push({
            t: ev.startTime,
            line: "this.playNoise(".concat(fmt(dur), ", ").concat(fmt(ev.gain), ", ").concat(fmt(ev.lowpass), ", ").concat(fmt(ev.highpass), ", ").concat(at, ", ").concat(endGain, ");")
        });
    });
    events.sort(function (a, b) { return a.t - b.t; });
    var header = [
        '// ── Paste into your AudioManager play*() method ──────────────',
    ];
    if (cfgLoop) {
        header.push("// Loop period: ".concat(fmt(passDur), "s at ").concat(cfgBpm, " BPM \u2014 use as loop interval"));
    }
    return __spreadArray(__spreadArray([], header, true), events.map(function (e) { return e.line; }), true).join('\n');
}
// ── JSON export & import ───────────────────────────────────────────────────────
function downloadJson() {
    var payload = JSON.stringify({ version: 3, bpm: cfgBpm, tones: tones, noises: noises }, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'hackworld-sound.json';
    a.click();
    URL.revokeObjectURL(url);
}
function loadFromJson(raw) {
    var data;
    try {
        data = JSON.parse(raw);
    }
    catch (e) {
        alert('Could not parse JSON file: ' + e.message);
        return;
    }
    if (!Array.isArray(data.tones)) {
        alert('Not a valid HackWorld DAW file (missing tones array).');
        return;
    }
    // Accept v3 (flat noises[] with row field), v2 (noiseTracks: 3 arrays), v1 (noises: single array).
    var rawNoises;
    if (data.version === 3 && Array.isArray(data.noises)) {
        rawNoises = data.noises;
    }
    else if (Array.isArray(data.noiseTracks)) {
        // v2 → flatten, tagging each event with its track index as row
        rawNoises = data.noiseTracks.flatMap(function (track, i) {
            return track.map(function (ev) { return (__assign(__assign({}, ev), { row: i })); });
        });
    }
    else if (Array.isArray(data.noises)) {
        // v1 → all events go to row 0 (NOISE A)
        rawNoises = data.noises.map(function (ev) { return (__assign(__assign({}, ev), { row: 0 })); });
    }
    else {
        rawNoises = [];
    }
    // Validate and filter tone events to ensure required fields are present
    var validTones = data.tones.filter(function (t) {
        return typeof t.id === 'string' &&
            typeof t.noteIdx === 'number' &&
            typeof t.startTime === 'number' &&
            typeof t.duration === 'number' &&
            typeof t.type === 'string' &&
            typeof t.gain === 'number';
    }).map(function (t) { return ({
        id: t.id,
        noteIdx: t.noteIdx,
        startTime: t.startTime,
        duration: t.duration,
        type: t.type,
        gain: t.gain,
        dropoff: typeof t.dropoff === 'number' ? t.dropoff : 0.3,
        glideTo: typeof t.glideTo === 'number' ? t.glideTo : null,
    }); });
    var validNoises = rawNoises.filter(function (n) {
        return typeof n.id === 'string' &&
            typeof n.startTime === 'number' &&
            typeof n.duration === 'number' &&
            typeof n.gain === 'number';
    }).map(function (n) { return ({
        id: n.id,
        row: typeof n.row === 'number' ? Math.max(0, Math.min(NOISE_TRACK_LABELS.length - 1, n.row)) : 0,
        startTime: n.startTime,
        duration: n.duration,
        gain: n.gain,
        dropoff: typeof n.dropoff === 'number' ? n.dropoff : 0.3,
        lowpass: typeof n.lowpass === 'number' ? n.lowpass : 2200,
        highpass: typeof n.highpass === 'number' ? n.highpass : 100,
    }); });
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
function consensus(values) {
    if (values.length === 0)
        return null;
    var first = values[0];
    return values.every(function (v) { return v === first; }) ? first : null;
}
/** Populate and show/hide the selection property panel. */
function updateSelPanel() {
    if (selectedIds.size === 0) {
        selPanel.style.display = 'none';
        return;
    }
    selPanel.style.display = 'block';
    selCountEl.textContent = String(selectedIds.size);
    var selTones = tones.filter(function (t) { return selectedIds.has(t.id); });
    var selNoises = noises.filter(function (n) { return selectedIds.has(n.id); });
    var allEvts = __spreadArray(__spreadArray([], selTones, true), selNoises, true);
    var onlyTones = selNoises.length === 0;
    var onlyNoise = selTones.length === 0;
    // Duration (all events)
    buildDurationOptions(selDur, 1);
    var durC = consensus(allEvts.map(function (e) { return e.duration; }));
    if (durC !== null) {
        selDur.value = String(durC);
    }
    else {
        addMixedOption(selDur, selDur);
    }
    // Type (tones only)
    selTypeRow.style.display = selTones.length > 0 ? '' : 'none';
    if (selTones.length > 0) {
        var typeC = consensus(selTones.map(function (t) { return t.type; }));
        selType.value = typeC !== null && typeC !== void 0 ? typeC : '';
    }
    // Gain
    var gainC = consensus(allEvts.map(function (e) { return e.gain; }));
    selGain.value = gainC !== null ? String(gainC) : '';
    selGain.placeholder = gainC !== null ? '' : '–';
    // Dropoff
    var dropC = consensus(allEvts.map(function (e) { var _a; return (_a = e.dropoff) !== null && _a !== void 0 ? _a : 0.3; }));
    selDropoff.value = dropC !== null ? String(dropC) : String(0.3);
    selDropoffV.textContent = dropC !== null ? dropC.toFixed(2) : '–';
    // Glide (tones only, hide if mixed selection)
    selGlideRow.style.display = onlyTones ? '' : 'none';
    if (onlyTones) {
        buildGlideOptions(selGlide, true);
        var glideC = consensus(selTones.map(function (t) { return t.glideTo; }));
        selGlide.value = glideC !== null ? String(glideC) : '';
    }
    // Noise filter fields
    selLpRow.style.display = onlyNoise ? '' : 'none';
    selHpRow.style.display = onlyNoise ? '' : 'none';
    if (onlyNoise) {
        var lpC = consensus(selNoises.map(function (n) { return n.lowpass; }));
        selLp.value = lpC !== null ? String(lpC) : '';
        selLp.placeholder = lpC !== null ? '' : '–';
        var hpC = consensus(selNoises.map(function (n) { return n.highpass; }));
        selHp.value = hpC !== null ? String(hpC) : '';
        selHp.placeholder = hpC !== null ? '' : '–';
    }
}
/**
 * Insert a "–" option at the top of a <select> and select it to indicate
 * mixed values. Reuses an existing "–" option if already present.
 */
function addMixedOption(sel, ref) {
    var _a;
    if (((_a = ref.options[0]) === null || _a === void 0 ? void 0 : _a.value) !== '') {
        var o = document.createElement('option');
        o.value = '';
        o.textContent = '–';
        ref.insertBefore(o, ref.firstChild);
    }
    ref.value = '';
}
/** Apply selection panel values to all selected events. */
function applySelection() {
    var dur = selDur.value !== '' ? parseFloat(selDur.value) : null;
    var gain = selGain.value !== '' ? parseFloat(selGain.value) : null;
    var dropoff = parseFloat(selDropoff.value) || null;
    var _loop_4 = function (id) {
        var tone = tones.find(function (t) { return t.id === id; });
        if (tone) {
            if (dur !== null && !isNaN(dur))
                tone.duration = dur;
            if (gain !== null && !isNaN(gain))
                tone.gain = gain;
            if (dropoff !== null)
                tone.dropoff = Math.max(0.1, Math.min(1, dropoff));
            if (selTypeRow.style.display !== 'none' && selType.value)
                tone.type = selType.value;
            if (selGlideRow.style.display !== 'none') {
                tone.glideTo = selGlide.value !== '' ? parseInt(selGlide.value) : null;
            }
        }
        var noise = findNoiseById(id);
        if (noise) {
            if (dur !== null && !isNaN(dur))
                noise.duration = dur;
            if (gain !== null && !isNaN(gain))
                noise.gain = gain;
            if (dropoff !== null)
                noise.dropoff = Math.max(0.1, Math.min(1, dropoff));
            if (selLpRow.style.display !== 'none' && selLp.value !== '')
                noise.lowpass = parseFloat(selLp.value) || 2200;
            if (selHpRow.style.display !== 'none' && selHp.value !== '')
                noise.highpass = parseFloat(selHp.value) || 100;
        }
    };
    for (var _i = 0, selectedIds_4 = selectedIds; _i < selectedIds_4.length; _i++) {
        var id = selectedIds_4[_i];
        _loop_4(id);
    }
    render();
}
function clearSelection() {
    selectedIds = new Set();
    updateSelPanel();
    render();
}
function init() {
    buildKeyCol();
    buildNoiseKeyCol();
    buildDurationOptions(cfgDurEl, 1); // default 1/1 beat
    buildDurationOptions(ppDur, 1);
    buildDurationOptions(selDur, 1);
    buildGlideOptions(cfgGlideEl, true);
    buildGlideOptions(ppGlide, true);
    buildGlideOptions(selGlide, true);
    resizeAll();
    render();
    window.addEventListener('resize', function () { resizeAll(); render(); });
    // Toolbar
    cfgDurEl.addEventListener('change', function () { cfgDur = parseFloat(cfgDurEl.value) || 1; });
    cfgBpmEl.addEventListener('change', function () { cfgBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, parseFloat(cfgBpmEl.value) || 120)); cfgBpmEl.value = String(cfgBpm); render(); });
    cfgTypeEl.addEventListener('change', function () { cfgType = cfgTypeEl.value; });
    cfgGainEl.addEventListener('input', function () { cfgGain = parseFloat(cfgGainEl.value) || 0; });
    cfgDropoffEl.addEventListener('input', function () { cfgDropoff = parseFloat(cfgDropoffEl.value) || 0.3; cfgDropoffV.textContent = cfgDropoff.toFixed(2); });
    cfgGlideEl.addEventListener('change', function () { cfgGlide = cfgGlideEl.value ? parseInt(cfgGlideEl.value) : null; });
    cfgLpEl.addEventListener('change', function () { cfgLowpass = parseFloat(cfgLpEl.value) || 2200; });
    cfgHpEl.addEventListener('change', function () { cfgHighpass = parseFloat(cfgHpEl.value) || 100; });
    cfgSnapEl.addEventListener('change', function () { cfgSnap = parseFloat(cfgSnapEl.value) || 0.25; });
    // Popup dropoff live preview
    ppDropoff.addEventListener('input', function () { ppDropoffV.textContent = (parseFloat(ppDropoff.value) || 0.3).toFixed(2); });
    // Popup actions
    ppSave.addEventListener('click', savePopup);
    ppDel.addEventListener('click', function () {
        if (!editingId)
            return;
        tones = tones.filter(function (t) { return t.id !== editingId; });
        removeNoisesById(new Set([editingId]));
        selectedIds.delete(editingId);
        updateSelPanel();
        closePopup();
    });
    ppX.addEventListener('click', closePopup);
    // Selection panel
    selDropoff.addEventListener('input', function () { selDropoffV.textContent = (parseFloat(selDropoff.value) || 0.3).toFixed(2); });
    selApplyBtn.addEventListener('click', applySelection);
    selDelBtn.addEventListener('click', function () {
        tones = tones.filter(function (t) { return !selectedIds.has(t.id); });
        removeNoisesById(selectedIds);
        clearSelection();
    });
    selPanelX.addEventListener('click', clearSelection);
    // Header buttons
    playBtn.addEventListener('click', startPlayback);
    stopBtn.addEventListener('click', stopPlayback);
    cfgLoopEl.addEventListener('change', function () { cfgLoop = cfgLoopEl.checked; });
    clearBtn.addEventListener('click', function () {
        stopPlayback();
        tones = [];
        noises = [];
        scrollX = 0;
        closePopup();
        clearSelection();
        render();
    });
    exportBtn.addEventListener('click', function () {
        codeTa.value = generateCode();
        codeTa.select();
    });
    jsonBtn.addEventListener('click', downloadJson);
    copyBtn.addEventListener('click', function () { return navigator.clipboard.writeText(codeTa.value); });
    // Timeline interaction
    tlCanvas.addEventListener('mousedown', onTlDown);
    tlCanvas.addEventListener('contextmenu', onTlCtx);
    // Noise canvas interaction
    noiseCanvas.addEventListener('mousedown', onNoiseDown);
    noiseCanvas.addEventListener('contextmenu', onNoiseCtx);
    noiseClip.addEventListener('wheel', onWheel, { passive: false });
    // Global mouse move / up for drag and selection rect
    window.addEventListener('mousemove', onGlobalMove);
    window.addEventListener('mouseup', onGlobalUp);
    // Horizontal scroll via wheel
    tlClip.addEventListener('wheel', onWheel, { passive: false });
    // Horizontal scrollbar
    hscrollBar.addEventListener('scroll', function () {
        if (ignoreHscrollEvent)
            return;
        scrollX = hscrollBar.scrollLeft;
        render();
    });
    // Space = Play / Stop, Delete = remove selected
    var EDITABLE = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
    var isEditable = function (t) {
        return t instanceof Element && EDITABLE.has(t.tagName);
    };
    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space' && !isEditable(e.target)) {
            e.preventDefault();
            if (isPlaying)
                stopPlayback();
            else
                startPlayback();
        }
        if (e.code === 'Delete' && !isEditable(e.target) && selectedIds.size > 0) {
            e.preventDefault();
            tones = tones.filter(function (t) { return !selectedIds.has(t.id); });
            removeNoisesById(selectedIds);
            clearSelection();
        }
        if (e.code === 'Escape' && !isEditable(e.target)) {
            if (editingId)
                closePopup();
            else if (selectedIds.size > 0)
                clearSelection();
        }
    });
    // Close popup on outside click
    window.addEventListener('mousedown', function (e) {
        if (editingId && !popup.contains(e.target))
            closePopup();
    }, true);
    // JSON drag-and-drop import
    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) {
        var _a;
        e.preventDefault();
        var file = (_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files[0];
        if (!file)
            return;
        var reader = new FileReader();
        reader.onload = function () { return loadFromJson(reader.result); };
        reader.readAsText(file);
    });
    // Code section resize — drag the header bar up/down to change height
    var codeSectionResizing = false;
    var codeResizeStartY = 0;
    var codeResizeStartH = 0;
    codeHdr.addEventListener('mousedown', function (e) {
        codeSectionResizing = true;
        codeResizeStartY = e.clientY;
        codeResizeStartH = codeSection.offsetHeight;
        e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
        if (!codeSectionResizing)
            return;
        var delta = codeResizeStartY - e.clientY; // drag up → bigger
        codeSection.style.height = "".concat(Math.max(40, codeResizeStartH + delta), "px");
    });
    window.addEventListener('mouseup', function () { codeSectionResizing = false; });
}
init();
