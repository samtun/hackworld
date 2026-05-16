type AudioBus = 'music' | 'sfx';
type FootstepSource = 'player' | 'enemy';
type CombatSource = 'player' | 'enemy';

interface StageMusicProfile {
    pulseFrequencies: number[];
    harmonyFrequencies?: number[];
    pulseIntervalMs: number;
    pulseType: OscillatorType;
    harmonyType: OscillatorType;
    pulseDuration: number;
    pulseGain: number;
    harmonyGain: number;
}

const STAGE_MUSIC: Record<string, StageMusicProfile> = {
    startScreen: {
        pulseFrequencies: [174.61, 220, 261.63, 293.66],
        harmonyFrequencies: [261.63, 329.63, 349.23, 392],
        pulseIntervalMs: 420,
        pulseType: 'triangle',
        harmonyType: 'sine',
        pulseDuration: 0.34,
        pulseGain: 0.065,
        harmonyGain: 0.03,
    },
    lobby: {
        pulseFrequencies: [220, 277.18, 329.63, 440],
        harmonyFrequencies: [329.63, 369.99, 440, 554.37],
        pulseIntervalMs: 340,
        pulseType: 'triangle',
        harmonyType: 'sine',
        pulseDuration: 0.22,
        pulseGain: 0.07,
        harmonyGain: 0.028,
    },
    networkMatrix: {
        pulseFrequencies: [196, 220, 261.63, 293.66],
        harmonyFrequencies: [293.66, 329.63, 392, 440],
        pulseIntervalMs: 300,
        pulseType: 'square',
        harmonyType: 'triangle',
        pulseDuration: 0.18,
        pulseGain: 0.072,
        harmonyGain: 0.024,
    },
    packetForge: {
        pulseFrequencies: [246.94, 311.13, 369.99, 311.13],
        harmonyFrequencies: [369.99, 415.3, 466.16, 415.3],
        pulseIntervalMs: 280,
        pulseType: 'square',
        harmonyType: 'triangle',
        pulseDuration: 0.16,
        pulseGain: 0.075,
        harmonyGain: 0.022,
    },
    cipherNull: {
        pulseFrequencies: [164.81, 196, 233.08, 174.61],
        harmonyFrequencies: [246.94, 261.63, 311.13, 261.63],
        pulseIntervalMs: 320,
        pulseType: 'triangle',
        harmonyType: 'sine',
        pulseDuration: 0.2,
        pulseGain: 0.068,
        harmonyGain: 0.024,
    },
    securityCore: {
        pulseFrequencies: [146.83, 196, 220, 293.66],
        harmonyFrequencies: [220, 293.66, 329.63, 392],
        pulseIntervalMs: 260,
        pulseType: 'square',
        harmonyType: 'triangle',
        pulseDuration: 0.17,
        pulseGain: 0.078,
        harmonyGain: 0.022,
    },
    kernelTerminus: {
        pulseFrequencies: [130.81, 174.61, 196, 261.63],
        harmonyFrequencies: [196, 233.08, 261.63, 349.23],
        pulseIntervalMs: 240,
        pulseType: 'sawtooth',
        harmonyType: 'triangle',
        pulseDuration: 0.16,
        pulseGain: 0.082,
        harmonyGain: 0.022,
    },
    gameTest: {
        pulseFrequencies: [220, 246.94, 293.66, 369.99],
        harmonyFrequencies: [293.66, 329.63, 392, 466.16],
        pulseIntervalMs: 260,
        pulseType: 'square',
        harmonyType: 'triangle',
        pulseDuration: 0.18,
        pulseGain: 0.076,
        harmonyGain: 0.025,
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
        const gain = source === 'player' ? 0.055 : 0.042;
        const frequency = source === 'player' ? 92 : 64;
        this.playNoise(0.07, gain, source === 'player' ? 1500 : 900, source === 'player' ? 180 : 110, 0);
        this.playTone(frequency, 0.06, source === 'player' ? 'triangle' : 'sine', gain, 0.0001);
    }

    playJump(): void {
        this.playTone(260, 0.2, 'triangle', 0.07, 0.0001, 0, 720);
        this.playTone(520, 0.08, 'sine', 0.03, 0.0001, 0.03, 780);
    }

    playAttack(source: CombatSource, charged: boolean = false): void {
        if (charged) {
            this.playNoise(0.18, 0.11, 3600, 260, 0);
            this.playTone(180, 0.22, 'sawtooth', 0.12, 0.0001, 0, 520);
            this.playTone(540, 0.14, 'triangle', 0.055, 0.0001, 0.03, 860);
            return;
        }

        if (source === 'player') {
            this.playNoise(0.07, 0.07, 4200, 420, 0);
            this.playTone(540, 0.09, 'square', 0.1, 0.0001, 0, 260);
            this.playTone(880, 0.05, 'triangle', 0.038, 0.0001, 0.02, 660);
            return;
        }

        this.playNoise(0.12, 0.08, 1000, 90, 0);
        this.playTone(150, 0.16, 'sawtooth', 0.09, 0.0001, 0, 96);
        this.playTone(90, 0.12, 'square', 0.045, 0.0001, 0.02, 70);
    }

    playDamage(source: CombatSource): void {
        if (source === 'player') {
            this.playNoise(0.11, 0.085, 3600, 500, 0);
            this.playTone(760, 0.11, 'square', 0.06, 0.0001, 0, 280);
            return;
        }

        this.playNoise(0.09, 0.07, 1600, 140, 0);
        this.playTone(210, 0.11, 'triangle', 0.055, 0.0001, 0, 120);
    }

    playDeath(source: CombatSource): void {
        const frequency = source === 'player' ? 180 : 120;
        const gain = source === 'player' ? 0.09 : 0.065;
        this.playNoise(0.2, gain, 1200, 120, 0);
        this.playTone(frequency, 0.45, source === 'player' ? 'sawtooth' : 'triangle', gain, 0.0001, 0, frequency * 0.2);
    }

    playDialogueTick(): void {
        this.playNoise(0.025, 0.03, 4500, 1200, 0);
        this.playTone(1400, 0.03, 'square', 0.018, 0.0001);
    }

    playTeleport(): void {
        [261.63, 392, 523.25].forEach((frequency, index) => {
            const delay = index * 0.08;
            this.playTone(frequency, 0.16, 'triangle', 0.07, 0.0001, delay, frequency * 1.12);
        });
    }

    playBossSpawn(): void {
        this.playNoise(0.28, 0.075, 1400, 90, 0);
        this.playTone(98, 0.5, 'sawtooth', 0.1, 0.0001, 0, 49);
        this.playTone(146.83, 0.35, 'square', 0.055, 0.0001, 0.12, 110);
    }

    playStageCleared(): void {
        [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
            this.playTone(frequency, 0.22, 'triangle', 0.085, 0.0001, index * 0.07);
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

        this.masterGain.gain.value = 1.0;
        this.musicGain.gain.value = 0.45;
        this.sfxGain.gain.value = 1.2;

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
        let pulseIndex = 0;
        const playPulse = () => {
            const frequency = profile.pulseFrequencies[pulseIndex % profile.pulseFrequencies.length];
            const harmonyFrequency = profile.harmonyFrequencies?.[pulseIndex % (profile.harmonyFrequencies?.length ?? 1)];
            pulseIndex++;
            this.playTone(frequency, profile.pulseDuration, profile.pulseType, profile.pulseGain, 0.0001, 0, undefined, 'music');
            if (harmonyFrequency !== undefined) {
                this.playTone(
                    harmonyFrequency,
                    Math.max(0.08, profile.pulseDuration * 0.9),
                    profile.harmonyType,
                    profile.harmonyGain,
                    0.0001,
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
