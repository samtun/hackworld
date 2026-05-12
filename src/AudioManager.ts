type AudioBus = 'music' | 'sfx';
type FootstepSource = 'player' | 'enemy';
type CombatSource = 'player' | 'enemy';

interface StageMusicProfile {
    bassFrequency: number;
    padFrequency: number;
    pulseFrequencies: number[];
    pulseIntervalMs: number;
    bassType: OscillatorType;
    padType: OscillatorType;
    pulseType: OscillatorType;
}

const STAGE_MUSIC: Record<string, StageMusicProfile> = {
    lobby: {
        bassFrequency: 110,
        padFrequency: 220,
        pulseFrequencies: [220, 277.18, 329.63, 440],
        pulseIntervalMs: 340,
        bassType: 'sine',
        padType: 'triangle',
        pulseType: 'triangle',
    },
    networkMatrix: {
        bassFrequency: 98,
        padFrequency: 196,
        pulseFrequencies: [196, 220, 261.63, 293.66],
        pulseIntervalMs: 300,
        bassType: 'triangle',
        padType: 'sine',
        pulseType: 'square',
    },
    packetForge: {
        bassFrequency: 123.47,
        padFrequency: 246.94,
        pulseFrequencies: [246.94, 311.13, 369.99, 311.13],
        pulseIntervalMs: 280,
        bassType: 'sawtooth',
        padType: 'triangle',
        pulseType: 'square',
    },
    cipherNull: {
        bassFrequency: 82.41,
        padFrequency: 164.81,
        pulseFrequencies: [164.81, 196, 233.08, 174.61],
        pulseIntervalMs: 320,
        bassType: 'triangle',
        padType: 'sine',
        pulseType: 'triangle',
    },
    securityCore: {
        bassFrequency: 73.42,
        padFrequency: 146.83,
        pulseFrequencies: [146.83, 196, 220, 293.66],
        pulseIntervalMs: 260,
        bassType: 'sawtooth',
        padType: 'triangle',
        pulseType: 'square',
    },
    kernelTerminus: {
        bassFrequency: 65.41,
        padFrequency: 130.81,
        pulseFrequencies: [130.81, 174.61, 196, 261.63],
        pulseIntervalMs: 240,
        bassType: 'square',
        padType: 'triangle',
        pulseType: 'sawtooth',
    },
    gameTest: {
        bassFrequency: 110,
        padFrequency: 220,
        pulseFrequencies: [220, 246.94, 293.66, 369.99],
        pulseIntervalMs: 260,
        bassType: 'triangle',
        padType: 'triangle',
        pulseType: 'square',
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
    private musicOscillators: OscillatorNode[] = [];

    public static get Instance(): AudioManager {
        return this.instance || (this.instance = new this());
    }

    private constructor() {
        this.registerUnlockHandlers();
    }

    unlock(): void {
        const context = this.ensureAudioContext();
        if (!context) return;

        if (context.state === 'suspended') {
            void context.resume().then(() => {
                this.startStageMusicIfPossible();
            }).catch(() => undefined);
            return;
        }

        this.startStageMusicIfPossible();
    }

    setStageMusic(stageId: string): void {
        this.currentStageId = stageId;
        if (this.playingStageId === stageId) return;

        this.stopStageMusic();
        this.startStageMusicIfPossible();
    }

    playFootstep(source: FootstepSource): void {
        const gain = source === 'player' ? 0.03 : 0.02;
        const frequency = source === 'player' ? 72 : 58;
        this.playNoise(0.07, gain, 1200, 140, 0);
        this.playTone(frequency, 0.05, 'triangle', gain, 0.0001);
    }

    playJump(): void {
        this.playTone(220, 0.18, 'triangle', 0.035, 0.0001, 0, 660);
    }

    playAttack(source: CombatSource, charged: boolean = false): void {
        const baseGain = source === 'player' ? 0.05 : 0.035;
        const startFrequency = charged ? 140 : source === 'player' ? 210 : 160;
        const endFrequency = charged ? 420 : source === 'player' ? 120 : 90;
        this.playNoise(charged ? 0.16 : 0.1, baseGain, 3000, 250, 0);
        this.playTone(startFrequency, charged ? 0.18 : 0.12, charged ? 'sawtooth' : 'square', baseGain, 0.0001, 0, endFrequency);
    }

    playDamage(source: CombatSource): void {
        const frequency = source === 'player' ? 170 : 130;
        const gain = source === 'player' ? 0.05 : 0.035;
        this.playNoise(0.12, gain, 1800, 180, 0);
        this.playTone(frequency, 0.14, 'square', gain, 0.0001, 0, frequency * 0.55);
    }

    playDeath(source: CombatSource): void {
        const frequency = source === 'player' ? 180 : 120;
        const gain = source === 'player' ? 0.06 : 0.04;
        this.playNoise(0.2, gain, 1200, 120, 0);
        this.playTone(frequency, 0.45, 'sawtooth', gain, 0.0001, 0, frequency * 0.2);
    }

    playDialogueTick(): void {
        this.playNoise(0.025, 0.018, 4000, 1200, 0);
        this.playTone(1400, 0.03, 'square', 0.01, 0.0001);
    }

    playTeleport(): void {
        [261.63, 392, 523.25].forEach((frequency, index) => {
            const delay = index * 0.08;
            this.playTone(frequency, 0.16, 'triangle', 0.04, 0.0001, delay, frequency * 1.12);
        });
    }

    playBossSpawn(): void {
        this.playNoise(0.28, 0.04, 1400, 90, 0);
        this.playTone(98, 0.5, 'sawtooth', 0.06, 0.0001, 0, 49);
        this.playTone(146.83, 0.35, 'square', 0.03, 0.0001, 0.12, 110);
    }

    playStageCleared(): void {
        [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
            this.playTone(frequency, 0.22, 'triangle', 0.05, 0.0001, index * 0.07);
        });
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

        this.masterGain.gain.value = 0.8;
        this.musicGain.gain.value = 0.22;
        this.sfxGain.gain.value = 0.7;

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);

        return this.audioContext;
    }

    private startStageMusicIfPossible(): void {
        const context = this.ensureAudioContext();
        if (!context || context.state !== 'running' || !this.currentStageId || this.playingStageId === this.currentStageId) {
            return;
        }

        const profile = STAGE_MUSIC[this.currentStageId] ?? STAGE_MUSIC.lobby;
        const bass = context.createOscillator();
        const bassGain = context.createGain();
        bass.type = profile.bassType;
        bass.frequency.value = profile.bassFrequency;
        bassGain.gain.value = 0.04;
        bass.connect(bassGain);
        bassGain.connect(this.getBus('music'));
        bass.start();

        const pad = context.createOscillator();
        const padGain = context.createGain();
        pad.type = profile.padType;
        pad.frequency.value = profile.padFrequency;
        pad.detune.value = 6;
        padGain.gain.value = 0.025;
        pad.connect(padGain);
        padGain.connect(this.getBus('music'));
        pad.start();

        this.musicOscillators.push(bass, pad);
        this.playingStageId = this.currentStageId;

        let pulseIndex = 0;
        const playPulse = () => {
            const frequency = profile.pulseFrequencies[pulseIndex % profile.pulseFrequencies.length];
            pulseIndex++;
            this.playTone(frequency, 0.18, profile.pulseType, 0.03, 0.0001, 0, undefined, 'music');
        };

        playPulse();
        this.musicPulseInterval = window.setInterval(playPulse, profile.pulseIntervalMs);
    }

    private stopStageMusic(): void {
        if (this.musicPulseInterval !== null) {
            window.clearInterval(this.musicPulseInterval);
            this.musicPulseInterval = null;
        }

        for (const oscillator of this.musicOscillators) {
            try {
                oscillator.stop();
            } catch {
                // noop
            }
        }

        this.musicOscillators = [];
        this.playingStageId = null;
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
        if (glideToFrequency !== undefined) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, glideToFrequency), stopTime);
        }

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endGain), stopTime);

        oscillator.connect(gain);
        gain.connect(this.getBus(bus));
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

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.getBus('sfx'));
        source.start(startTime);
        source.stop(stopTime);
    }

    private getBus(bus: AudioBus): GainNode {
        const context = this.ensureAudioContext();
        if (!context || !this.masterGain || !this.musicGain || !this.sfxGain) {
            throw new Error('Audio bus requested before audio context initialization');
        }

        return bus === 'music' ? this.musicGain : this.sfxGain;
    }

    private getNoiseBuffer(context: AudioContext): AudioBuffer {
        if (this.noiseBuffer) return this.noiseBuffer;

        const length = Math.max(1, Math.floor(context.sampleRate * 0.5));
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < channel.length; i++) {
            channel[i] = Math.random() * 2 - 1;
        }

        this.noiseBuffer = buffer;
        return buffer;
    }
}
