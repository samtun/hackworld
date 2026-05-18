/**
 * HackWorld Sound Editor — main.ts
 *
 * A standalone tool for composing synthetic sound effects using the Web Audio
 * API.  Layers (tone + noise) are built in the UI, previewed live, then
 * exported as code snippets ready to paste into src/AudioManager.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type OscType = 'sine' | 'triangle' | 'square' | 'sawtooth';

interface ToneLayer {
    freq: number;
    dur: number;
    type: OscType;
    gain: number;
    delay: number;
    glideTo: number | null;
}

interface NoiseLayer {
    dur: number;
    gain: number;
    lowpass: number;
    highpass: number;
    delay: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const toneLayers: ToneLayer[] = [];
const noiseLayers: NoiseLayer[] = [];

let audioCtx: AudioContext | null = null;
let activeNodes: AudioNode[] = [];

let musicInterval: ReturnType<typeof setInterval> | null = null;
let musicPulseIndex = 0;

let sfxCodeTab: 'raw' | 'params' = 'raw';

// ─────────────────────────────────────────────────────────────────────────────
// Audio context helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAudioCtx(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        void audioCtx.resume();
    }
    return audioCtx;
}

const ENVELOPE_MIN = 0.0001;

function playTone(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    dur: number,
    type: OscType,
    peakGain: number,
    delay: number,
    glideTo: number | null,
): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const startTime = ctx.currentTime + delay;
    const stopTime = startTime + dur;
    const attackTime = Math.min(0.02, dur * 0.35);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (glideTo !== null && glideTo > 1) {
        osc.frequency.exponentialRampToValueAtTime(glideTo, stopTime);
    }

    gainNode.gain.setValueAtTime(ENVELOPE_MIN, startTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(ENVELOPE_MIN, peakGain), startTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(ENVELOPE_MIN, stopTime);

    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start(startTime);
    osc.stop(stopTime);

    activeNodes.push(osc, gainNode);
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
        ch[i] = Math.random() * 2 - 1;
    }
    return buf;
}

function playNoise(
    ctx: AudioContext,
    dest: AudioNode,
    dur: number,
    peakGain: number,
    lowpass: number,
    highpass: number,
    delay: number,
): void {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;

    const gainNode = ctx.createGain();
    const startTime = ctx.currentTime + delay;
    const stopTime = startTime + dur;

    gainNode.gain.setValueAtTime(ENVELOPE_MIN, startTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(ENVELOPE_MIN, peakGain), startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(ENVELOPE_MIN, stopTime);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(dest);
    src.start(startTime);
    src.stop(stopTime);

    activeNodes.push(src, gainNode, hp, lp);
}

// ─────────────────────────────────────────────────────────────────────────────
// SFX preview
// ─────────────────────────────────────────────────────────────────────────────

function playSfxPreview(): void {
    const ctx = getAudioCtx();
    activeNodes = [];

    noiseLayers.forEach(n => {
        playNoise(ctx, ctx.destination, n.dur, n.gain, n.lowpass, n.highpass, n.delay);
    });
    toneLayers.forEach(t => {
        playTone(ctx, ctx.destination, t.freq, t.dur, t.type, t.gain, t.delay, t.glideTo);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Code generation
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    // Format numbers: remove trailing zeros but keep enough precision
    return parseFloat(n.toFixed(5)).toString();
}

function generateRawCalls(): string {
    if (toneLayers.length === 0 && noiseLayers.length === 0) {
        return '// No layers added yet.\n// Add tone or noise layers above, then copy this snippet.';
    }

    const lines: string[] = ['// ── Paste into your AudioManager play*() method ──────────────'];

    noiseLayers.forEach(n => {
        lines.push(
            `this.playNoise(${fmt(n.dur)}, ${fmt(n.gain)}, ${fmt(n.lowpass)}, ${fmt(n.highpass)}, ${fmt(n.delay)});`,
        );
    });

    toneLayers.forEach(t => {
        const glideArg = t.glideTo !== null ? `, ${fmt(t.glideTo)}` : '';
        const delayArg = (t.delay !== 0 || glideArg) ? `, ${fmt(t.delay)}` : '';
        lines.push(
            `this.playTone(${fmt(t.freq)}, ${fmt(t.dur)}, '${t.type}', ${fmt(t.gain)}, ENVELOPE_MIN_GAIN${delayArg}${glideArg});`,
        );
    });

    return lines.join('\n');
}

function generateParamsEntry(): string {
    if (toneLayers.length === 0 && noiseLayers.length === 0) {
        return '// No layers added yet.';
    }

    const lines: string[] = [
        '// ── Paste into SFX_PARAMS in src/AudioManager.ts ─────────────',
        'mySfxName: {',
    ];

    if (noiseLayers.length > 0) {
        noiseLayers.forEach((n, i) => {
            const key = noiseLayers.length === 1 ? 'noise' : `noise${i + 1}`;
            lines.push(
                `    ${key}: { dur: ${fmt(n.dur)}, gain: ${fmt(n.gain)}, lowpass: ${fmt(n.lowpass)}, highpass: ${fmt(n.highpass)}, delay: ${fmt(n.delay)} } as NoiseLayer,`,
            );
        });
    }

    if (toneLayers.length === 1) {
        const t = toneLayers[0];
        const glidePart = t.glideTo !== null ? `, glideTo: ${fmt(t.glideTo)}` : '';
        const delayPart = t.delay !== 0 ? `, delay: ${fmt(t.delay)}` : '';
        lines.push(
            `    tone: { freq: ${fmt(t.freq)}, dur: ${fmt(t.dur)}, type: '${t.type}' as OscillatorType, gain: ${fmt(t.gain)}${delayPart}${glidePart} } as ToneLayer,`,
        );
    } else if (toneLayers.length > 1) {
        lines.push('    tones: [');
        toneLayers.forEach(t => {
            const glidePart = t.glideTo !== null ? `, glideTo: ${fmt(t.glideTo)}` : '';
            const delayPart = `, delay: ${fmt(t.delay)}`;
            lines.push(
                `        { freq: ${fmt(t.freq)}, dur: ${fmt(t.dur)}, type: '${t.type}' as OscillatorType, gain: ${fmt(t.gain)}${delayPart}${glidePart} },`,
            );
        });
        lines.push('    ] as ToneLayer[],');
    }

    lines.push('},');
    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Music profile code generation
// ─────────────────────────────────────────────────────────────────────────────

function generateMusicCode(): string {
    const name = (document.getElementById('m-name') as HTMLInputElement).value.trim() || 'myStage';
    const pulseRaw = (document.getElementById('m-pulse') as HTMLInputElement).value;
    const harmonyRaw = (document.getElementById('m-harmony') as HTMLInputElement).value.trim();
    const interval = (document.getElementById('m-interval') as HTMLInputElement).value;
    const pulseType = (document.getElementById('m-pulse-type') as HTMLSelectElement).value;
    const harmonyType = (document.getElementById('m-harmony-type') as HTMLSelectElement).value;
    const dur = (document.getElementById('m-dur') as HTMLInputElement).value;
    const pgain = (document.getElementById('m-pgain') as HTMLInputElement).value;
    const hgain = (document.getElementById('m-hgain') as HTMLInputElement).value;

    const pulseFreqs = pulseRaw.split(',').map(s => s.trim()).filter(Boolean).join(', ');
    const hasHarmony = harmonyRaw.length > 0;
    const harmonyFreqs = hasHarmony
        ? harmonyRaw.split(',').map(s => s.trim()).filter(Boolean).join(', ')
        : '';

    const harmonyArg = hasHarmony ? `[${harmonyFreqs}]` : 'undefined';

    const lines = [
        `// ── Paste into STAGE_MUSIC in src/AudioManager.ts ─────────────`,
        `${name}: createStageMusicProfile(`,
        `    [${pulseFreqs}],      // pulsePhrase`,
        `    ${harmonyArg},  // harmonyPhrase`,
        `    ${interval},           // pulseIntervalMs`,
        `    '${pulseType}',        // pulseType`,
        `    '${harmonyType}',      // harmonyType`,
        `    ${dur},               // pulseDuration`,
        `    ${pgain},             // pulseGain`,
        `    ${hgain},             // harmonyGain`,
        `),`,
    ];
    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Music preview
// ─────────────────────────────────────────────────────────────────────────────

function getMusicParams() {
    const pulseRaw = (document.getElementById('m-pulse') as HTMLInputElement).value;
    const harmonyRaw = (document.getElementById('m-harmony') as HTMLInputElement).value.trim();
    const interval = parseInt((document.getElementById('m-interval') as HTMLInputElement).value, 10) || 340;
    const pulseType = (document.getElementById('m-pulse-type') as HTMLSelectElement).value as OscType;
    const harmonyType = (document.getElementById('m-harmony-type') as HTMLSelectElement).value as OscType;
    const dur = parseFloat((document.getElementById('m-dur') as HTMLInputElement).value) || 0.22;
    const pgain = parseFloat((document.getElementById('m-pgain') as HTMLInputElement).value) || 0.07;
    const hgain = parseFloat((document.getElementById('m-hgain') as HTMLInputElement).value) || 0.028;

    const pulseFreqs = pulseRaw.split(',').map(s => parseFloat(s.trim())).filter(f => !isNaN(f) && f > 0);
    const harmonyFreqs = harmonyRaw
        ? harmonyRaw.split(',').map(s => parseFloat(s.trim())).filter(f => !isNaN(f) && f > 0)
        : [];

    return { pulseFreqs, harmonyFreqs, interval, pulseType, harmonyType, dur, pgain, hgain };
}

function playMusicLoop(): void {
    const ctx = getAudioCtx();
    const params = getMusicParams();
    if (params.pulseFreqs.length === 0) return;

    musicPulseIndex = 0;

    const tick = () => {
        const pf = params.pulseFreqs[musicPulseIndex % params.pulseFreqs.length];
        const hf = params.harmonyFreqs.length > 0
            ? params.harmonyFreqs[musicPulseIndex % params.harmonyFreqs.length]
            : null;
        musicPulseIndex++;

        playTone(ctx, ctx.destination, pf, params.dur, params.pulseType, params.pgain, 0, null);
        if (hf !== null) {
            playTone(ctx, ctx.destination, hf, Math.max(0.08, params.dur * 0.9), params.harmonyType, params.hgain, 0.04, null);
        }
    };

    tick();
    musicInterval = setInterval(tick, params.interval);
}

function stopMusicLoop(): void {
    if (musicInterval !== null) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer DOM helpers
// ─────────────────────────────────────────────────────────────────────────────

function createField(label: string, type: 'number' | 'text', attrs: Record<string, string | number> = {}): { wrap: HTMLElement; input: HTMLInputElement } {
    const wrap = document.createElement('div');
    wrap.className = 'field';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const input = document.createElement('input');
    input.type = type;
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'value') input.value = String(v);
        else input.setAttribute(k, String(v));
    });

    input.addEventListener('input', updateSfxCode);

    wrap.appendChild(lbl);
    wrap.appendChild(input);
    return { wrap, input };
}

function createSelectField(label: string, options: string[], selected: string): { wrap: HTMLElement; select: HTMLSelectElement } {
    const wrap = document.createElement('div');
    wrap.className = 'field';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const sel = document.createElement('select');
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = o.textContent = opt;
        if (opt === selected) o.selected = true;
        sel.appendChild(o);
    });
    sel.addEventListener('change', updateSfxCode);

    wrap.appendChild(lbl);
    wrap.appendChild(sel);
    return { wrap, select: sel };
}

function addToneLayer(): void {
    const layer: ToneLayer = { freq: 440, dur: 0.2, type: 'sine', gain: 0.05, delay: 0, glideTo: null };
    toneLayers.push(layer);
    renderToneLayer(layer, toneLayers.length - 1);
    updateToneCount();
    updateSfxCode();
}

function addNoiseLayer(): void {
    const layer: NoiseLayer = { dur: 0.1, gain: 0.04, lowpass: 2000, highpass: 500, delay: 0 };
    noiseLayers.push(layer);
    renderNoiseLayer(layer, noiseLayers.length - 1);
    updateSfxCode();
}

function renderToneLayer(layer: ToneLayer, index: number): void {
    const container = document.getElementById('tone-layers')!;

    const card = document.createElement('div');
    card.className = 'layer-card tone-card';
    card.dataset.index = String(index);

    const header = document.createElement('div');
    header.className = 'layer-header';

    const label = document.createElement('span');
    label.className = 'layer-label';
    label.textContent = `Tone ${index + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn danger';
    removeBtn.textContent = '✕ Remove';
    removeBtn.addEventListener('click', () => {
        toneLayers.splice(index, 1);
        card.remove();
        reindexLayers('tone');
        updateToneCount();
        updateSfxCode();
    });

    header.appendChild(label);
    header.appendChild(removeBtn);

    const fields = document.createElement('div');
    fields.className = 'fields';

    const { wrap: fq, input: iqFreq } = createField('Freq (Hz)', 'number', { min: 1, max: 20000, step: 0.01, value: layer.freq });
    iqFreq.addEventListener('input', () => { layer.freq = parseFloat(iqFreq.value) || 440; });

    const { wrap: fd, input: iqDur } = createField('Duration (s)', 'number', { min: 0.01, max: 10, step: 0.01, value: layer.dur });
    iqDur.addEventListener('input', () => { layer.dur = parseFloat(iqDur.value) || 0.2; });

    const { wrap: ft, select: stType } = createSelectField('Type', ['sine', 'triangle', 'square', 'sawtooth'], layer.type);
    stType.addEventListener('change', () => { layer.type = stType.value as OscType; });

    const { wrap: fg, input: iqGain } = createField('Gain', 'number', { min: 0, max: 1, step: 0.001, value: layer.gain });
    iqGain.addEventListener('input', () => { layer.gain = parseFloat(iqGain.value) || 0.05; });

    const { wrap: fdy, input: iqDelay } = createField('Delay (s)', 'number', { min: 0, max: 10, step: 0.01, value: layer.delay });
    iqDelay.addEventListener('input', () => { layer.delay = parseFloat(iqDelay.value) || 0; });

    const { wrap: fgt, input: iqGlide } = createField('Glide To (Hz, 0=off)', 'number', { min: 0, max: 20000, step: 0.01, value: layer.glideTo ?? 0 });
    iqGlide.addEventListener('input', () => {
        const v = parseFloat(iqGlide.value);
        layer.glideTo = v > 0 ? v : null;
        updateSfxCode();
    });

    [fq, fd, ft, fg, fdy, fgt].forEach(w => fields.appendChild(w));
    card.appendChild(header);
    card.appendChild(fields);
    container.appendChild(card);
}

function renderNoiseLayer(layer: NoiseLayer, index: number): void {
    const container = document.getElementById('noise-layers')!;

    const card = document.createElement('div');
    card.className = 'layer-card noise-card';
    card.dataset.index = String(index);

    const header = document.createElement('div');
    header.className = 'layer-header';

    const label = document.createElement('span');
    label.className = 'layer-label';
    label.textContent = `Noise ${index + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn danger';
    removeBtn.textContent = '✕ Remove';
    removeBtn.addEventListener('click', () => {
        noiseLayers.splice(index, 1);
        card.remove();
        reindexLayers('noise');
        updateSfxCode();
    });

    header.appendChild(label);
    header.appendChild(removeBtn);

    const fields = document.createElement('div');
    fields.className = 'fields';

    const { wrap: fd, input: iqDur } = createField('Duration (s)', 'number', { min: 0.01, max: 5, step: 0.005, value: layer.dur });
    iqDur.addEventListener('input', () => { layer.dur = parseFloat(iqDur.value) || 0.1; });

    const { wrap: fg, input: iqGain } = createField('Gain', 'number', { min: 0, max: 1, step: 0.001, value: layer.gain });
    iqGain.addEventListener('input', () => { layer.gain = parseFloat(iqGain.value) || 0.04; });

    const { wrap: flp, input: iqLp } = createField('Lowpass (Hz)', 'number', { min: 20, max: 20000, step: 10, value: layer.lowpass });
    iqLp.addEventListener('input', () => { layer.lowpass = parseFloat(iqLp.value) || 2000; });

    const { wrap: fhp, input: iqHp } = createField('Highpass (Hz)', 'number', { min: 20, max: 20000, step: 10, value: layer.highpass });
    iqHp.addEventListener('input', () => { layer.highpass = parseFloat(iqHp.value) || 500; });

    const { wrap: fdy, input: iqDelay } = createField('Delay (s)', 'number', { min: 0, max: 5, step: 0.01, value: layer.delay });
    iqDelay.addEventListener('input', () => { layer.delay = parseFloat(iqDelay.value) || 0; });

    [fd, fg, flp, fhp, fdy].forEach(w => fields.appendChild(w));
    card.appendChild(header);
    card.appendChild(fields);
    container.appendChild(card);
}

function reindexLayers(type: 'tone' | 'noise'): void {
    const container = document.getElementById(type === 'tone' ? 'tone-layers' : 'noise-layers')!;
    const cards = container.querySelectorAll<HTMLElement>('.layer-card');
    cards.forEach((card, i) => {
        card.dataset.index = String(i);
        const lbl = card.querySelector('.layer-label');
        if (lbl) lbl.textContent = `${type === 'tone' ? 'Tone' : 'Noise'} ${i + 1}`;
    });
}

function updateToneCount(): void {
    const el = document.getElementById('tone-count');
    if (el) el.textContent = String(toneLayers.length);
}

function updateSfxCode(): void {
    const ta = document.getElementById('sfx-code') as HTMLTextAreaElement;
    ta.value = sfxCodeTab === 'raw' ? generateRawCalls() : generateParamsEntry();
}

// ─────────────────────────────────────────────────────────────────────────────
// Wiring
// ─────────────────────────────────────────────────────────────────────────────

function initTabs(): void {
    document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panelId = `panel-${btn.dataset.tab}`;
            document.getElementById(panelId)?.classList.add('active');
        });
    });
}

function initCodeTabs(): void {
    document.querySelectorAll<HTMLButtonElement>('.code-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sfxCodeTab = btn.dataset.codetab as 'raw' | 'params';
            updateSfxCode();
        });
    });
}

function initSfxPanel(): void {
    document.getElementById('add-tone-btn')!.addEventListener('click', addToneLayer);
    document.getElementById('add-noise-btn')!.addEventListener('click', addNoiseLayer);

    document.getElementById('play-sfx-btn')!.addEventListener('click', () => {
        playSfxPreview();
    });

    document.getElementById('stop-sfx-btn')!.addEventListener('click', () => {
        activeNodes.forEach(n => {
            try { (n as OscillatorNode | AudioBufferSourceNode).stop?.(); } catch { /* already stopped */ }
        });
        activeNodes = [];
    });

    document.getElementById('clear-sfx-btn')!.addEventListener('click', () => {
        toneLayers.length = 0;
        noiseLayers.length = 0;
        document.getElementById('tone-layers')!.innerHTML = '';
        document.getElementById('noise-layers')!.innerHTML = '';
        updateToneCount();
        updateSfxCode();
    });

    document.getElementById('copy-sfx-btn')!.addEventListener('click', () => {
        const ta = document.getElementById('sfx-code') as HTMLTextAreaElement;
        void navigator.clipboard.writeText(ta.value).then(() => {
            const btn = document.getElementById('copy-sfx-btn')!;
            const orig = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        });
    });
}

function initMusicPanel(): void {
    const playBtn = document.getElementById('play-music-btn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop-music-btn') as HTMLButtonElement;

    playBtn.addEventListener('click', () => {
        stopMusicLoop();
        playMusicLoop();
        playBtn.disabled = true;
        stopBtn.disabled = false;
        updateMusicCode();
    });

    stopBtn.addEventListener('click', () => {
        stopMusicLoop();
        playBtn.disabled = false;
        stopBtn.disabled = true;
    });

    document.getElementById('copy-music-btn')!.addEventListener('click', () => {
        const ta = document.getElementById('music-code') as HTMLTextAreaElement;
        void navigator.clipboard.writeText(ta.value).then(() => {
            const btn = document.getElementById('copy-music-btn')!;
            const orig = btn.textContent;
            btn.textContent = '✓ Copied!';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        });
    });

    // Update code snippet whenever any music field changes
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        '#panel-music input, #panel-music select',
    ).forEach(el => {
        el.addEventListener('input', updateMusicCode);
        el.addEventListener('change', updateMusicCode);
    });

    updateMusicCode();
}

function updateMusicCode(): void {
    const ta = document.getElementById('music-code') as HTMLTextAreaElement;
    ta.value = generateMusicCode();
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

initTabs();
initCodeTabs();
initSfxPanel();
initMusicPanel();
updateSfxCode();
