type AudioBus = 'music' | 'sfx';
type FootstepSource = 'player' | 'enemy';
type CombatSource = 'player' | 'enemy';
type CardRevealRarity = 'normal' | 'uncommon' | 'special';
type MusicPhrase = readonly number[];

const ENVELOPE_MIN_GAIN = 0.0001;
const DEFAULT_ATTACK_SECONDS = 0.02;
const MAX_ATTACK_PORTION_OF_DURATION = 0.35;
const MIN_GLIDE_FREQUENCY = 1;
const NOISE_BUFFER_DURATION_SECONDS = 0.5;
const HEALING_STATION_LOOP_INTERVAL_MS = 220;
const DEFAULT_MUSIC_GAIN = 0.45;
const DEFAULT_SFX_GAIN = 1.2;
const HEALING_STATION_PRIMARY_FREQUENCIES = [523.25, 659.25, 783.99, 987.77] as const;
const HEALING_STATION_SWIRL_FREQUENCIES = [659.25, 783.99, 880, 1046.5] as const;

export const MUSIC_ENABLED_STORAGE_KEY = 'hackworld_music_enabled';
export const SFX_ENABLED_STORAGE_KEY = 'hackworld_sfx_enabled';

/** A single oscillator layer used in a synthesised sound effect. */
export interface ToneLayer {
    /** Starting frequency in Hz. */
    freq: number;
    /** Duration in seconds. */
    dur: number;
    /** Oscillator waveform. */
    type: OscillatorType;
    /** Peak gain (volume) of the amplitude envelope. */
    gain: number;
    /** Delay before playback starts, in seconds (default 0). */
    delay?: number;
    /** Target frequency to glide to by the end of the duration. */
    glideTo?: number;
}

/** A filtered white-noise layer used in a synthesised sound effect. */
export interface NoiseLayer {
    /** Duration in seconds. */
    dur: number;
    /** Peak gain of the noise amplitude envelope. */
    gain: number;
    /** Low-pass filter cut-off in Hz. */
    lowpass: number;
    /** High-pass filter cut-off in Hz. */
    highpass: number;
    /** Delay before playback starts, in seconds. */
    delay: number;
}

interface StageMusicProfile {
    pulseFrequencies: MusicPhrase;
    harmonyFrequencies?: MusicPhrase;
    pulseIntervalMs: number;
    pulseType: OscillatorType;
    harmonyType: OscillatorType;
    pulseDuration: number;
    pulseGain: number;
    harmonyGain: number;
}

/**
 * Build a stage music profile from a short, hand-authored phrase so it can be
 * extended manually later without any automatic note generation.
 */
function createStageMusicProfile(
    pulsePhrase: MusicPhrase,
    harmonyPhrase: MusicPhrase | undefined,
    pulseIntervalMs: number,
    pulseType: OscillatorType,
    harmonyType: OscillatorType,
    pulseDuration: number,
    pulseGain: number,
    harmonyGain: number,
): StageMusicProfile {
    return {
        pulseFrequencies: pulsePhrase,
        pulseIntervalMs,
        pulseType,
        harmonyType,
        pulseDuration,
        pulseGain,
        harmonyGain,
        ...(harmonyPhrase ? { harmonyFrequencies: harmonyPhrase } : {}),
    };
}

export const STAGE_MUSIC: Record<string, StageMusicProfile> = {
    startScreen: createStageMusicProfile(
        [174.61, 220, 261.63, 293.66],
        [261.63, 329.63, 349.23, 392],
        420,
        'triangle',
        'sine',
        0.34,
        0.065,
        0.03,
    ),
    lobby: createStageMusicProfile(
        [220, 277.18, 329.63, 440],
        [329.63, 369.99, 440, 554.37],
        340,
        'triangle',
        'sine',
        0.22,
        0.07,
        0.028,
    ),
    networkMatrix: createStageMusicProfile(
        [220, 277.18, 369.99, 466.16, 369.99],
        [146.83, 174.61, 220, 277.18, 233.08],
        290,
        'square',
        'triangle',
        0.16,
        0.074,
        0.024,
    ),
    packetForge: createStageMusicProfile(
        [196, 246.94, 293.66, 246.94, 392],
        [130.81, 164.81, 196, 164.81, 220],
        250,
        'square',
        'sawtooth',
        0.17,
        0.076,
        0.024,
    ),
    cipherNull: createStageMusicProfile(
        [155.56, 185, 233.08, 207.65, 138.59],
        [233.08, 277.18, 311.13, 277.18, 207.65],
        310,
        'sawtooth',
        'triangle',
        0.19,
        0.074,
        0.023,
    ),
    securityCore: createStageMusicProfile(
        [130.81, 164.81, 220, 261.63, 174.61],
        [196, 246.94, 311.13, 369.99, 246.94],
        260,
        'sawtooth',
        'sawtooth',
        0.18,
        0.08,
        0.024,
    ),
    kernelTerminus: createStageMusicProfile(
        [123.47, 164.81, 220, 293.66, 329.63],
        [185, 246.94, 329.63, 392, 440],
        240,
        'sawtooth',
        'sawtooth',
        0.2,
        0.086,
        0.026,
    ),
    gameTest: createStageMusicProfile(
        [220, 246.94, 293.66, 369.99],
        [293.66, 329.63, 392, 466.16],
        260,
        'square',
        'triangle',
        0.18,
        0.076,
        0.025,
    ),
};

// ══════════════════════════════════════════════════════════════════════════════
// SOUND PARAMETERS — Edit these numbers to tune each sound effect.
// Run `npm run dev:sound-editor` to compose and preview sounds visually,
// then paste the generated snippet here.
// ══════════════════════════════════════════════════════════════════════════════

export const SFX_PARAMS = {
    // ──── FOOTSTEP ────────────────────────────────────────────────────────────
    footstep: {
        player: {
            noise: { dur: 0.07, gain: 0.055, lowpass: 1500, highpass: 180,  delay: 0 } as NoiseLayer,
            tone:  { freq: 92,  dur: 0.06, type: 'triangle' as OscillatorType, gain: 0.055 } as ToneLayer,
        },
        enemy: {
            noise: { dur: 0.07, gain: 0.042, lowpass: 900,  highpass: 110,  delay: 0 } as NoiseLayer,
            tone:  { freq: 64,  dur: 0.06, type: 'sine'     as OscillatorType, gain: 0.042 } as ToneLayer,
        },
    },
    // ──── JUMP ────────────────────────────────────────────────────────────────
    jump: {
        tones: [
            { freq: 260, dur: 0.2,  type: 'triangle' as OscillatorType, gain: 0.07,  delay: 0,    glideTo: 720 },
            { freq: 520, dur: 0.08, type: 'sine'     as OscillatorType, gain: 0.03,  delay: 0.03, glideTo: 780 },
        ] as ToneLayer[],
    },
    // ──── ATTACK ──────────────────────────────────────────────────────────────
    attack: {
        player: {
            noise: { dur: 0.07, gain: 0.07,  lowpass: 4200, highpass: 420, delay: 0 } as NoiseLayer,
            tones: [
                { freq: 540, dur: 0.09, type: 'square'   as OscillatorType, gain: 0.1,   delay: 0,    glideTo: 260 },
                { freq: 880, dur: 0.05, type: 'triangle' as OscillatorType, gain: 0.038, delay: 0.02, glideTo: 660 },
            ] as ToneLayer[],
        },
        enemy: {
            noise: { dur: 0.12, gain: 0.08,  lowpass: 1000, highpass: 90,  delay: 0 } as NoiseLayer,
            tones: [
                { freq: 150, dur: 0.16, type: 'sawtooth' as OscillatorType, gain: 0.09,  delay: 0,    glideTo: 96 },
                { freq: 90,  dur: 0.12, type: 'square'   as OscillatorType, gain: 0.045, delay: 0.02, glideTo: 70 },
            ] as ToneLayer[],
        },
        charged: {
            noise: { dur: 0.18, gain: 0.11,  lowpass: 3600, highpass: 260, delay: 0 } as NoiseLayer,
            tones: [
                { freq: 180, dur: 0.22, type: 'sawtooth' as OscillatorType, gain: 0.12,  delay: 0,    glideTo: 520 },
                { freq: 540, dur: 0.14, type: 'triangle' as OscillatorType, gain: 0.055, delay: 0.03, glideTo: 860 },
            ] as ToneLayer[],
        },
    },
    // ──── DAMAGE ──────────────────────────────────────────────────────────────
    damage: {
        player: {
            noise: { dur: 0.11, gain: 0.085, lowpass: 3600, highpass: 500, delay: 0 } as NoiseLayer,
            tone:  { freq: 760, dur: 0.11, type: 'square'   as OscillatorType, gain: 0.06,  delay: 0, glideTo: 280 } as ToneLayer,
        },
        enemy: {
            noise: { dur: 0.09, gain: 0.07,  lowpass: 1600, highpass: 140, delay: 0 } as NoiseLayer,
            tone:  { freq: 210, dur: 0.11, type: 'triangle' as OscillatorType, gain: 0.055, delay: 0, glideTo: 120 } as ToneLayer,
        },
    },
    // ──── DEATH ───────────────────────────────────────────────────────────────
    death: {
        player: {
            noise: { dur: 0.2,  gain: 0.09,  lowpass: 1200, highpass: 120, delay: 0 } as NoiseLayer,
            tone:  { freq: 180, dur: 0.45, type: 'sawtooth' as OscillatorType, gain: 0.09,  delay: 0, glideTo: 36 } as ToneLayer,
        },
        enemy: {
            noise: { dur: 0.2,  gain: 0.065, lowpass: 1200, highpass: 120, delay: 0 } as NoiseLayer,
            tone:  { freq: 120, dur: 0.45, type: 'triangle' as OscillatorType, gain: 0.065, delay: 0, glideTo: 24 } as ToneLayer,
        },
    },
    // ──── DIALOGUE TICK ───────────────────────────────────────────────────────
    dialogueTick: {
        noise: { dur: 0.025, gain: 0.03,  lowpass: 4500, highpass: 1200, delay: 0 } as NoiseLayer,
        tone:  { freq: 1400, dur: 0.03, type: 'square' as OscillatorType, gain: 0.018 } as ToneLayer,
    },
    // ──── MENU NAVIGATE ───────────────────────────────────────────────────────
    menuNavigate: {
        tones: [
            { freq: 1046.5,  dur: 0.05, type: 'triangle' as OscillatorType, gain: 0.035, delay: 0    },
            { freq: 1318.51, dur: 0.05, type: 'sine'     as OscillatorType, gain: 0.022, delay: 0.02 },
        ] as ToneLayer[],
    },
    // ──── BUY ─────────────────────────────────────────────────────────────────
    buy: {
        freqs: [523.25, 659.25, 783.99] as number[],
        dur: 0.12, type: 'triangle' as OscillatorType, gain: 0.06, delayStep: 0.04, glideRatio: 1.03 as number | undefined,
    },
    // ──── SELL ────────────────────────────────────────────────────────────────
    sell: {
        freqs: [659.25, 523.25, 392] as number[],
        dur: 0.1, type: 'sine' as OscillatorType, gain: 0.05, delayStep: 0.035, glideRatio: 0.96 as number | undefined,
    },
    // ──── UPGRADE ─────────────────────────────────────────────────────────────
    upgrade: {
        noise: { dur: 0.04, gain: 0.025, lowpass: 5200, highpass: 800, delay: 0.02 } as NoiseLayer,
        freqs: [392, 523.25, 659.25, 783.99] as number[],
        dur: 0.14, type: 'triangle' as OscillatorType, gain: 0.06, delayStep: 0.045, glideRatio: 1.05 as number | undefined,
    },
    // ──── INSUFFICIENT ────────────────────────────────────────────────────────
    insufficient: {
        noise: { dur: 0.035, gain: 0.018, lowpass: 2800, highpass: 500, delay: 0 } as NoiseLayer,
        freqs: [311.13, 246.94] as number[],
        dur: 0.12, type: 'square' as OscillatorType, gain: 0.045, delayStep: 0.05, glideRatio: 0.94 as number | undefined,
    },
    // ──── LASER BEAM SKILL ────────────────────────────────────────────────────
    laserBeamSkill: {
        noise: { dur: 0.06, gain: 0.025, lowpass: 5200, highpass: 900, delay: 0 } as NoiseLayer,
        tones: [
            { freq: 720,  dur: 0.14, type: 'sawtooth' as OscillatorType, gain: 0.07,  delay: 0,    glideTo: 1440 },
            { freq: 1440, dur: 0.08, type: 'triangle' as OscillatorType, gain: 0.035, delay: 0.03, glideTo: 1960 },
        ] as ToneLayer[],
    },
    // ──── HEALING SKILL ───────────────────────────────────────────────────────
    healingSkill: {
        freqs: [523.25, 659.25, 783.99] as number[],
        dur: 0.16, type: 'triangle' as OscillatorType, gain: 0.05, delayStep: 0.04, glideRatio: 1.04 as number | undefined,
    },
    // ──── AREA ATTACK SKILL ───────────────────────────────────────────────────
    areaAttackSkill: {
        noise: { dur: 0.08, gain: 0.035, lowpass: 1800, highpass: 140, delay: 0 } as NoiseLayer,
        tones: [
            { freq: 164.81, dur: 0.16, type: 'sawtooth' as OscillatorType, gain: 0.08,  delay: 0,    glideTo: 110 },
            { freq: 246.94, dur: 0.12, type: 'square'   as OscillatorType, gain: 0.045, delay: 0.04, glideTo: 196 },
        ] as ToneLayer[],
    },
    // ──── EQUIP ───────────────────────────────────────────────────────────────
    equip: {
        freqs: [392, 587.33, 783.99] as number[],
        dur: 0.1, type: 'triangle' as OscillatorType, gain: 0.05, delayStep: 0.03, glideRatio: 1.03 as number | undefined,
    },
    // ──── UI OPEN / CLOSE ─────────────────────────────────────────────────────
    uiOpen: {
        freqs: [392, 523.25] as number[],
        dur: 0.1, type: 'triangle' as OscillatorType, gain: 0.04, delayStep: 0.035, glideRatio: 1.04 as number | undefined,
    },
    uiClose: {
        freqs: [523.25, 392] as number[],
        dur: 0.09, type: 'sine' as OscillatorType, gain: 0.032, delayStep: 0.03, glideRatio: 0.96 as number | undefined,
    },
    // ──── CARD REVEAL ─────────────────────────────────────────────────────────
    cardReveal: {
        normal: {
            tone: { freq: 440, dur: 0.09, type: 'triangle' as OscillatorType, gain: 0.05, glideTo: 659.25 } as ToneLayer,
        },
        uncommon: {
            freqs: [523.25, 659.25] as number[],
            dur: 0.12, type: 'triangle' as OscillatorType, gain: 0.055, delayStep: 0.04, glideRatio: 1.06 as number | undefined,
        },
        special: {
            noise: { dur: 0.05, gain: 0.02, lowpass: 4800, highpass: 900, delay: 0 } as NoiseLayer,
            freqs: [659.25, 783.99, 1046.5] as number[],
            dur: 0.14, type: 'sawtooth' as OscillatorType, gain: 0.065, delayStep: 0.045, glideRatio: 1.08 as number | undefined,
        },
    },
    // ──── ALBUM COMPLETE ──────────────────────────────────────────────────────
    albumComplete: {
        noise: { dur: 0.08, gain: 0.018, lowpass: 5400, highpass: 1000, delay: 0 } as NoiseLayer,
        freqs: [392, 523.25, 659.25, 783.99, 1046.5] as number[],
        dur: 0.18, gain: 0.07, delayStep: 0.05, glideRatio: 1.04 as number | undefined,
        /** First `typeThreshold` notes use `typeBelow`; the rest use `typeAtOrAbove`. */
        typeThreshold: 3, typeBelow: 'triangle' as OscillatorType, typeAtOrAbove: 'sawtooth' as OscillatorType,
    },
    // ──── LEVEL UP ────────────────────────────────────────────────────────────
    levelUp: {
        noise: { dur: 0.06, gain: 0.022, lowpass: 5600, highpass: 1000, delay: 0 } as NoiseLayer,
        freqs: [523.25, 659.25, 783.99, 1046.5] as number[],
        dur: 0.16, gain: 0.07, delayStep: 0.045, glideRatio: 1.05 as number | undefined,
        typeThreshold: 2, typeBelow: 'triangle' as OscillatorType, typeAtOrAbove: 'sawtooth' as OscillatorType,
    },
    // ──── HEALING STATION ─────────────────────────────────────────────────────
    healingStation: {
        noise:   { dur: 0.14, gain: 0.018, lowpass: 4200, highpass: 900, delay: 0    } as NoiseLayer,
        primary: { dur: 0.26, type: 'triangle' as OscillatorType, gain: 0.04,  delay: 0,    glideRatio: 1.08 },
        swirl:   { dur: 0.18, type: 'sine'     as OscillatorType, gain: 0.025, delay: 0.05, glideRatio: 1.04 },
    },
    // ──── TELEPORT ────────────────────────────────────────────────────────────
    teleport: {
        freqs: [261.63, 392, 523.25] as number[],
        dur: 0.16, type: 'triangle' as OscillatorType, gain: 0.07, delayStep: 0.08, glideRatio: 1.12 as number | undefined,
    },
    // ──── BOSS SPAWN ──────────────────────────────────────────────────────────
    bossSpawn: {
        noise: { dur: 0.28, gain: 0.075, lowpass: 1400, highpass: 90, delay: 0 } as NoiseLayer,
        tones: [
            { freq: 98,     dur: 0.5,  type: 'sawtooth' as OscillatorType, gain: 0.1,   delay: 0,    glideTo: 49  },
            { freq: 146.83, dur: 0.35, type: 'square'   as OscillatorType, gain: 0.055, delay: 0.12, glideTo: 110 },
        ] as ToneLayer[],
    },
    // ──── STAGE CLEARED ───────────────────────────────────────────────────────
    stageCleared: {
        freqs: [261.63, 329.63, 392, 523.25] as number[],
        dur: 0.22, type: 'triangle' as OscillatorType, gain: 0.085, delayStep: 0.07, glideRatio: undefined as number | undefined,
    },
    // ──── BARREL BREAK ────────────────────────────────────────────────────────
    barrelBreak: {
        noise: { dur: 0.12, gain: 0.08, lowpass: 2200, highpass: 180, delay: 0 } as NoiseLayer,
        tones: [
            { freq: 110, dur: 0.18, type: 'square'   as OscillatorType, gain: 0.075, delay: 0,    glideTo: 72  },
            { freq: 180, dur: 0.08, type: 'triangle' as OscillatorType, gain: 0.035, delay: 0.03, glideTo: 120 },
        ] as ToneLayer[],
    },
    // ──── ITEM PICKUP ─────────────────────────────────────────────────────────
    itemPickup: {
        tones: [
            { freq: 659.25, dur: 0.08, type: 'triangle' as OscillatorType, gain: 0.06,  delay: 0    },
            { freq: 987.77, dur: 0.1,  type: 'sine'     as OscillatorType, gain: 0.045, delay: 0.05 },
        ] as ToneLayer[],
    },
    // ──── CHEST OPEN ──────────────────────────────────────────────────────────
    chestOpen: {
        freqs: [196, 246.94, 329.63] as number[],
        dur: 0.16, type: 'triangle' as OscillatorType, gain: 0.07, delayStep: 0.05, glideRatio: 1.08 as number | undefined,
    },
};

export class AudioManager {
    private static instance: AudioManager;

    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    private unlockHandlersRegistered = false;
    private currentStageId: string | null = null;
    private playingStageId: string | null = null;
    private musicPulseInterval: number | null = null;
    private healingStationLoopInterval: number | null = null;
    private activeHealingStationCount = 0;
    private musicEnabled = true;
    private sfxEnabled = true;

    public static get Instance(): AudioManager {
        return this.instance || (this.instance = new this());
    }

    private constructor() {
        this.restoreSettings();
        this.registerUnlockHandlers();
    }

    isMusicEnabled(): boolean {
        return this.musicEnabled;
    }

    isSfxEnabled(): boolean {
        return this.sfxEnabled;
    }

    setMusicEnabled(enabled: boolean): void {
        this.musicEnabled = enabled;
        this.persistSetting(MUSIC_ENABLED_STORAGE_KEY, enabled);
        this.updateBusGains();
    }

    setSfxEnabled(enabled: boolean): void {
        this.sfxEnabled = enabled;
        this.persistSetting(SFX_ENABLED_STORAGE_KEY, enabled);
        this.updateBusGains();
    }

    toggleMusicEnabled(): boolean {
        const nextEnabled = !this.musicEnabled;
        this.setMusicEnabled(nextEnabled);
        return nextEnabled;
    }

    toggleSfxEnabled(): boolean {
        const nextEnabled = !this.sfxEnabled;
        this.setSfxEnabled(nextEnabled);
        return nextEnabled;
    }

    unlock(): void {
        const context = this.ensureAudioContext();
        if (!context) return;

        if (context.state === 'suspended') {
            void context.resume().then(() => {
                this.startStageMusicIfPossible();
                this.startHealingStationLoopIfPossible();
            }).catch(() => undefined);
            return;
        }

        this.startStageMusicIfPossible();
        this.startHealingStationLoopIfPossible();
    }

    setStageMusic(stageId: string): void {
        this.currentStageId = stageId;
        if (this.playingStageId === stageId) return;

        this.stopStageMusic();
        this.startStageMusicIfPossible();
    }

    playFootstep(source: FootstepSource): void {
        const { noise: n, tone: t } = SFX_PARAMS.footstep[source];
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN);
    }

    playJump(): void {
        SFX_PARAMS.jump.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo));
    }

    playAttack(source: CombatSource, charged: boolean = false): void {
        const variant = charged ? SFX_PARAMS.attack.charged : SFX_PARAMS.attack[source];
        const n = variant.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        variant.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo));
    }

    playDamage(source: CombatSource): void {
        const { noise: n, tone: t } = SFX_PARAMS.damage[source];
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo);
    }

    playDeath(source: CombatSource): void {
        const { noise: n, tone: t } = SFX_PARAMS.death[source];
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo);
    }

    playDialogueTick(): void {
        const { noise: n, tone: t } = SFX_PARAMS.dialogueTick;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN);
    }

    playMenuNavigate(): void {
        SFX_PARAMS.menuNavigate.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay));
    }

    playBuy(): void {
        const p = SFX_PARAMS.buy;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playSell(): void {
        const p = SFX_PARAMS.sell;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playUpgrade(): void {
        const p = SFX_PARAMS.upgrade;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playInsufficient(): void {
        const p = SFX_PARAMS.insufficient;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playLaserBeamSkill(): void {
        const p = SFX_PARAMS.laserBeamSkill;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo));
    }

    playHealingSkill(): void {
        const p = SFX_PARAMS.healingSkill;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playAreaAttackSkill(): void {
        const p = SFX_PARAMS.areaAttackSkill;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo));
    }

    playEquip(): void {
        const p = SFX_PARAMS.equip;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playUiOpen(): void {
        const p = SFX_PARAMS.uiOpen;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playUiClose(): void {
        const p = SFX_PARAMS.uiClose;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playCardReveal(rarity: CardRevealRarity): void {
        switch (rarity) {
            case 'normal': {
                const t = SFX_PARAMS.cardReveal.normal.tone;
                this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, 0, t.glideTo);
                break;
            }
            case 'uncommon': {
                const p = SFX_PARAMS.cardReveal.uncommon;
                p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
                break;
            }
            case 'special': {
                const p = SFX_PARAMS.cardReveal.special;
                const n = p.noise;
                this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
                p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
                break;
            }
        }
    }

    playAlbumComplete(): void {
        const p = SFX_PARAMS.albumComplete;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.freqs.forEach((f, i) => {
            const type = i < p.typeThreshold ? p.typeBelow : p.typeAtOrAbove;
            this.playTone(f, p.dur, type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined);
        });
    }

    playLevelUp(): void {
        const p = SFX_PARAMS.levelUp;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.freqs.forEach((f, i) => {
            const type = i < p.typeThreshold ? p.typeBelow : p.typeAtOrAbove;
            this.playTone(f, p.dur, type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined);
        });
    }

    startHealingStationLoop(): void {
        this.activeHealingStationCount++;
        this.startHealingStationLoopIfPossible();
    }

    stopHealingStationLoop(): void {
        if (this.activeHealingStationCount <= 0) return;

        this.activeHealingStationCount--;
        if (this.activeHealingStationCount === 0) {
            this.stopHealingStationLoopIfPlaying();
        }
    }

    playTeleport(): void {
        const p = SFX_PARAMS.teleport;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playBossSpawn(): void {
        const p = SFX_PARAMS.bossSpawn;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo));
    }

    playStageCleared(): void {
        const p = SFX_PARAMS.stageCleared;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    playBarrelBreak(): void {
        const p = SFX_PARAMS.barrelBreak;
        const n = p.noise;
        this.playNoise(n.dur, n.gain, n.lowpass, n.highpass, n.delay);
        p.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay, t.glideTo));
    }

    playItemPickup(): void {
        SFX_PARAMS.itemPickup.tones.forEach(t => this.playTone(t.freq, t.dur, t.type, t.gain, ENVELOPE_MIN_GAIN, t.delay));
    }

    playChestOpen(): void {
        const p = SFX_PARAMS.chestOpen;
        p.freqs.forEach((f, i) => this.playTone(f, p.dur, p.type, p.gain, ENVELOPE_MIN_GAIN, i * p.delayStep, p.glideRatio !== undefined ? f * p.glideRatio : undefined));
    }

    private registerUnlockHandlers(): void {
        if (this.unlockHandlersRegistered || typeof window === 'undefined') return;
        this.unlockHandlersRegistered = true;

        const unlock = () => this.unlock();
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
        window.addEventListener('touchstart', unlock, { passive: true });
    }

    private ensureAudioContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (this.audioContext) return this.audioContext;

        const AudioContextConstructor = window.AudioContext
            ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextConstructor) return null;

        this.audioContext = new AudioContextConstructor();
        this.masterGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        this.sfxGain = this.audioContext.createGain();

        this.masterGain.gain.value = 1.0;
        this.updateBusGains();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        this.noiseBuffer = this.getNoiseBuffer(this.audioContext);

        return this.audioContext;
    }

    private startStageMusicIfPossible(): void {
        const context = this.ensureAudioContext();
        if (!context || context.state !== 'running' || !this.currentStageId || this.playingStageId === this.currentStageId) {
            return;
        }

        const profile = STAGE_MUSIC[this.currentStageId] ?? STAGE_MUSIC.lobby;
        let pulseIndex = 0;
        const playPulse = () => {
            const frequency = profile.pulseFrequencies[pulseIndex % profile.pulseFrequencies.length];
            const harmonyFrequency = profile.harmonyFrequencies?.[pulseIndex % (profile.harmonyFrequencies?.length ?? 1)];
            pulseIndex++;
            this.playTone(frequency, profile.pulseDuration, profile.pulseType, profile.pulseGain, ENVELOPE_MIN_GAIN, 0, undefined, 'music');
            if (harmonyFrequency !== undefined) {
                this.playTone(
                    harmonyFrequency,
                    Math.max(0.08, profile.pulseDuration * 0.9),
                    profile.harmonyType,
                    profile.harmonyGain,
                    ENVELOPE_MIN_GAIN,
                    0.04,
                    undefined,
                    'music',
                );
            }
        };

        this.playingStageId = this.currentStageId;
        playPulse();
        this.musicPulseInterval = window.setInterval(playPulse, profile.pulseIntervalMs);
    }

    private stopStageMusic(): void {
        if (this.musicPulseInterval !== null) {
            window.clearInterval(this.musicPulseInterval);
            this.musicPulseInterval = null;
        }

        this.playingStageId = null;
    }

    private startHealingStationLoopIfPossible(): void {
        const context = this.ensureAudioContext();
        if (!context) return;
        if (context.state !== 'running') return;
        if (this.activeHealingStationCount <= 0) return;
        if (this.healingStationLoopInterval !== null) return;

        let pulseIndex = 0;
        const playPulse = () => {
            const primary = HEALING_STATION_PRIMARY_FREQUENCIES[pulseIndex % HEALING_STATION_PRIMARY_FREQUENCIES.length];
            const swirl = HEALING_STATION_SWIRL_FREQUENCIES[pulseIndex % HEALING_STATION_SWIRL_FREQUENCIES.length];
            pulseIndex++;

            const hs = SFX_PARAMS.healingStation;
            const hn = hs.noise;
            this.playNoise(hn.dur, hn.gain, hn.lowpass, hn.highpass, hn.delay);
            this.playTone(primary, hs.primary.dur, hs.primary.type, hs.primary.gain, ENVELOPE_MIN_GAIN, hs.primary.delay, primary * hs.primary.glideRatio);
            this.playTone(swirl,   hs.swirl.dur,   hs.swirl.type,   hs.swirl.gain,   ENVELOPE_MIN_GAIN, hs.swirl.delay,   swirl   * hs.swirl.glideRatio);
        };

        playPulse();
        this.healingStationLoopInterval = window.setInterval(playPulse, HEALING_STATION_LOOP_INTERVAL_MS);
    }

    private stopHealingStationLoopIfPlaying(): void {
        if (this.healingStationLoopInterval !== null) {
            window.clearInterval(this.healingStationLoopInterval);
            this.healingStationLoopInterval = null;
        }
    }

    private playTone(
        frequency: number,
        duration: number,
        type: OscillatorType,
        peakGain: number,
        endGain: number,
        delay: number = 0,
        glideToFrequency?: number,
        bus: AudioBus = 'sfx',
    ): void {
        const context = this.ensureAudioContext();
        if (!context || context.state !== 'running') return;

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startTime = context.currentTime + delay;
        const stopTime = startTime + duration;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        if (glideToFrequency !== undefined && glideToFrequency > MIN_GLIDE_FREQUENCY) {
            oscillator.frequency.exponentialRampToValueAtTime(glideToFrequency, stopTime);
        }

        const attackTime = Math.min(DEFAULT_ATTACK_SECONDS, duration * MAX_ATTACK_PORTION_OF_DURATION);
        gain.gain.setValueAtTime(ENVELOPE_MIN_GAIN, startTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(ENVELOPE_MIN_GAIN, peakGain), startTime + attackTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(ENVELOPE_MIN_GAIN, endGain), stopTime);

        const targetBus = this.getBus(bus);
        if (!targetBus) return;

        oscillator.connect(gain);
        gain.connect(targetBus);
        oscillator.start(startTime);
        oscillator.stop(stopTime);
    }

    private playNoise(
        duration: number,
        peakGain: number,
        lowpassFrequency: number,
        highpassFrequency: number,
        delay: number,
    ): void {
        const context = this.ensureAudioContext();
        if (!context || context.state !== 'running') return;

        const source = context.createBufferSource();
        source.buffer = this.getNoiseBuffer(context);

        const highpass = context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = highpassFrequency;

        const lowpass = context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = lowpassFrequency;

        const gain = context.createGain();
        const startTime = context.currentTime + delay;
        const stopTime = startTime + duration;

        gain.gain.setValueAtTime(ENVELOPE_MIN_GAIN, startTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(ENVELOPE_MIN_GAIN, peakGain), startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(ENVELOPE_MIN_GAIN, stopTime);

        const targetBus = this.getBus('sfx');
        if (!targetBus) return;

        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(targetBus);
        source.start(startTime);
        source.stop(stopTime);
    }

    private getBus(bus: AudioBus): GainNode | null {
        if (!this.audioContext || !this.masterGain || !this.musicGain || !this.sfxGain) {
            return null;
        }

        return bus === 'music' ? this.musicGain : this.sfxGain;
    }

    private restoreSettings(): void {
        if (typeof localStorage === 'undefined') return;

        const savedMusicEnabled = localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY);
        const savedSfxEnabled = localStorage.getItem(SFX_ENABLED_STORAGE_KEY);
        this.musicEnabled = savedMusicEnabled !== 'false';
        this.sfxEnabled = savedSfxEnabled !== 'false';
    }

    private persistSetting(key: string, enabled: boolean): void {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, String(enabled));
    }

    private updateBusGains(): void {
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? DEFAULT_MUSIC_GAIN : 0;
        }
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxEnabled ? DEFAULT_SFX_GAIN : 0;
        }
    }

    private getNoiseBuffer(context: AudioContext): AudioBuffer {
        if (this.noiseBuffer) return this.noiseBuffer;

        const length = Math.max(1, Math.floor(context.sampleRate * NOISE_BUFFER_DURATION_SECONDS));
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const channel = buffer.getChannelData(0);
        // Math.random() is sufficient here because this buffer only needs cheap
        // white-noise variation for synthetic SFX, not statistically secure data.
        for (let i = 0; i < channel.length; i++) {
            channel[i] = Math.random() * 2 - 1;
        }

        this.noiseBuffer = buffer;
        return buffer;
    }
}
