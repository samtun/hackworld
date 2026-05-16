import * as Tone from 'tone';

type FootstepSource = 'player' | 'enemy';
type CombatSource = 'player' | 'enemy';
type ToneJSDuration = string | number;
type ToneJSNote = string | number;

type TriggerableSynth = {
    triggerAttackRelease: (note: ToneJSNote, duration: ToneJSDuration, time?: number, velocity?: number) => void;
};

// A slight 80ms offset keeps the harmony behind the lead note so the music
// feels layered without turning back into the constant drone the earlier
// implementation had.
const MUSIC_HARMONY_DELAY_SECONDS = 0.08;

// Tone.js trigger velocities are normalized note intensities (0-1), used here
// to keep related sounds grouped and easy to rebalance without retuning synth
// settings in every method.
const AUDIO_VELOCITY = {
    footsteps: {
        playerNoise: 0.18,
        enemyNoise: 0.12,
        playerTone: 0.38,
        enemyTone: 0.34,
    },
    jump: {
        primary: 0.72,
        accent: 0.38,
    },
    attack: {
        chargedNoise: 0.34,
        chargedPrimary: 0.82,
        chargedAccent: 0.58,
        playerNoise: 0.2,
        playerPrimary: 0.78,
        playerAccent: 0.42,
        enemyNoise: 0.22,
        enemyPrimary: 0.74,
        enemyAccent: 0.4,
    },
    damage: {
        playerNoise: 0.26,
        enemyNoise: 0.18,
        playerTone: 0.52,
        enemyTone: 0.5,
    },
    death: {
        playerNoise: 0.32,
        enemyNoise: 0.28,
        playerPrimary: 0.6,
        playerAccent: 0.5,
        enemyPrimary: 0.56,
        enemyAccent: 0.44,
    },
    ui: {
        dialogue: 0.35,
        teleportPrimary: 0.46,
        teleportAccent: 0.4,
        teleportPad: 0.24,
        stageClearPrimary: 0.4,
        stageClearSecondary: 0.38,
        stageClearTertiary: 0.36,
        stageClearPad: 0.26,
    },
    bossSpawn: {
        noise: 0.3,
        primary: 0.76,
        accent: 0.5,
    },
    breakables: {
        barrelNoise: 0.26,
        barrelPrimary: 0.72,
        barrelAccent: 0.42,
        pickupPrimary: 0.65,
        pickupAccent: 0.24,
        chestPrimary: 0.56,
        chestSecondary: 0.48,
        chestAccent: 0.42,
    },
} as const;

interface StageMusicProfile {
    leadNotes: string[];
    harmonyNotes?: string[];
    pulseIntervalSeconds: number;
    leadDuration: string;
    harmonyDuration: string;
    leadVelocity: number;
    harmonyVelocity: number;
}

const STAGE_MUSIC: Record<string, StageMusicProfile> = {
    startScreen: {
        leadNotes: ['F3', 'A3', 'C4', 'D4'],
        harmonyNotes: ['A4', 'C5', 'E5', 'F5'],
        pulseIntervalSeconds: 0.72,
        leadDuration: '4n',
        harmonyDuration: '2n',
        leadVelocity: 0.7,
        harmonyVelocity: 0.38,
    },
    lobby: {
        leadNotes: ['A3', 'C#4', 'E4', 'A4'],
        harmonyNotes: ['E4', 'A4', 'C#5', 'E5'],
        pulseIntervalSeconds: 0.56,
        leadDuration: '8n',
        harmonyDuration: '4n',
        leadVelocity: 0.75,
        harmonyVelocity: 0.34,
    },
    networkMatrix: {
        leadNotes: ['G3', 'A3', 'C4', 'D4'],
        harmonyNotes: ['D4', 'E4', 'G4', 'A4'],
        pulseIntervalSeconds: 0.48,
        leadDuration: '8n',
        harmonyDuration: '8n',
        leadVelocity: 0.78,
        harmonyVelocity: 0.28,
    },
    packetForge: {
        leadNotes: ['B3', 'D#4', 'F#4', 'D#4'],
        harmonyNotes: ['F#4', 'A4', 'B4', 'A4'],
        pulseIntervalSeconds: 0.44,
        leadDuration: '8n',
        harmonyDuration: '8n',
        leadVelocity: 0.82,
        harmonyVelocity: 0.26,
    },
    cipherNull: {
        leadNotes: ['E3', 'G3', 'A#3', 'F3'],
        harmonyNotes: ['G4', 'A#4', 'D5', 'C5'],
        pulseIntervalSeconds: 0.52,
        leadDuration: '8n',
        harmonyDuration: '4n',
        leadVelocity: 0.74,
        harmonyVelocity: 0.3,
    },
    securityCore: {
        leadNotes: ['D3', 'G3', 'A3', 'D4'],
        harmonyNotes: ['A3', 'D4', 'F4', 'A4'],
        pulseIntervalSeconds: 0.42,
        leadDuration: '8n',
        harmonyDuration: '8n',
        leadVelocity: 0.84,
        harmonyVelocity: 0.24,
    },
    kernelTerminus: {
        leadNotes: ['C3', 'F3', 'G3', 'C4'],
        harmonyNotes: ['G3', 'C4', 'D#4', 'G4'],
        pulseIntervalSeconds: 0.4,
        leadDuration: '8n',
        harmonyDuration: '8n',
        leadVelocity: 0.86,
        harmonyVelocity: 0.24,
    },
    gameTest: {
        leadNotes: ['A3', 'B3', 'D4', 'F#4'],
        harmonyNotes: ['D4', 'F#4', 'A4', 'C#5'],
        pulseIntervalSeconds: 0.46,
        leadDuration: '8n',
        harmonyDuration: '8n',
        leadVelocity: 0.8,
        harmonyVelocity: 0.28,
    },
};

export class AudioManager {
    private static instance: AudioManager;

    private unlockHandlersRegistered = false;
    private currentStageId: string | null = null;
    private playingStageId: string | null = null;
    private musicPulseInterval: number | null = null;

    private masterBus: Tone.Gain | null = null;
    private musicBus: Tone.Gain | null = null;
    private sfxBus: Tone.Gain | null = null;
    private musicChorus: Tone.Chorus | null = null;
    private musicReverb: Tone.Freeverb | null = null;
    private sfxDelay: Tone.FeedbackDelay | null = null;
    private sfxReverb: Tone.Freeverb | null = null;

    private musicLeadSynth: Tone.PolySynth | null = null;
    private musicPadSynth: Tone.PolySynth | null = null;
    private playerSynth: Tone.Synth | null = null;
    private enemySynth: Tone.MonoSynth | null = null;
    private playerImpactSynth: Tone.FMSynth | null = null;
    private enemyImpactSynth: Tone.MembraneSynth | null = null;
    private impactNoiseSynth: Tone.NoiseSynth | null = null;
    private uiSynth: Tone.Synth | null = null;
    private pickupSynth: Tone.PluckSynth | null = null;
    private barrelSynth: Tone.MembraneSynth | null = null;
    private chestSynth: Tone.FMSynth | null = null;

    public static get Instance(): AudioManager {
        return this.instance || (this.instance = new this());
    }

    private constructor() {
        this.registerUnlockHandlers();
    }

    unlock(): void {
        if (!this.ensureAudioGraph()) return;

        const contextState = Tone.getContext().rawContext.state;
        if (contextState === 'running') {
            this.startStageMusicIfPossible();
            return;
        }

        void Tone.start().then(() => {
            this.startStageMusicIfPossible();
        }).catch(() => undefined);
    }

    setStageMusic(stageId: string): void {
        this.currentStageId = stageId;
        if (this.playingStageId === stageId) return;

        this.stopStageMusic();
        this.startStageMusicIfPossible();
    }

    playFootstep(source: FootstepSource): void {
        const time = this.getAudioTime();
        if (time === null) return;

        this.impactNoiseSynth?.triggerAttackRelease(
            '32n',
            time,
            source === 'player' ? AUDIO_VELOCITY.footsteps.playerNoise : AUDIO_VELOCITY.footsteps.enemyNoise,
        );
        if (source === 'player') {
            this.playerSynth?.triggerAttackRelease('G2', '32n', time, AUDIO_VELOCITY.footsteps.playerTone);
            return;
        }

        this.enemySynth?.triggerAttackRelease('D2', '32n', time, AUDIO_VELOCITY.footsteps.enemyTone);
    }

    playJump(): void {
        this.triggerSynth(this.playerSynth, 'C4', '8n', 0, AUDIO_VELOCITY.jump.primary);
        this.triggerSynth(this.playerImpactSynth, 'G4', '16n', 0.05, AUDIO_VELOCITY.jump.accent);
    }

    playAttack(source: CombatSource, charged: boolean = false): void {
        if (charged) {
            this.triggerNoise('16n', 0, AUDIO_VELOCITY.attack.chargedNoise);
            this.triggerSynth(this.playerImpactSynth, 'C3', '8n', 0, AUDIO_VELOCITY.attack.chargedPrimary);
            this.triggerSynth(this.playerSynth, 'G4', '8n', 0.04, AUDIO_VELOCITY.attack.chargedAccent);
            return;
        }

        if (source === 'player') {
            this.triggerNoise('32n', 0, AUDIO_VELOCITY.attack.playerNoise);
            this.triggerSynth(this.playerSynth, 'E5', '16n', 0, AUDIO_VELOCITY.attack.playerPrimary);
            this.triggerSynth(this.playerImpactSynth, 'B4', '32n', 0.03, AUDIO_VELOCITY.attack.playerAccent);
            return;
        }

        this.triggerNoise('16n', 0, AUDIO_VELOCITY.attack.enemyNoise);
        this.triggerSynth(this.enemySynth, 'G2', '8n', 0, AUDIO_VELOCITY.attack.enemyPrimary);
        this.triggerSynth(this.enemyImpactSynth, 'C2', '16n', 0.02, AUDIO_VELOCITY.attack.enemyAccent);
    }

    playDamage(source: CombatSource): void {
        this.triggerNoise('16n', 0, source === 'player' ? AUDIO_VELOCITY.damage.playerNoise : AUDIO_VELOCITY.damage.enemyNoise);
        if (source === 'player') {
            this.triggerSynth(this.playerImpactSynth, 'A4', '16n', 0, AUDIO_VELOCITY.damage.playerTone);
            return;
        }

        this.triggerSynth(this.enemyImpactSynth, 'E2', '8n', 0, AUDIO_VELOCITY.damage.enemyTone);
    }

    playDeath(source: CombatSource): void {
        this.triggerNoise('8n', 0, source === 'player' ? AUDIO_VELOCITY.death.playerNoise : AUDIO_VELOCITY.death.enemyNoise);
        if (source === 'player') {
            this.triggerSynth(this.playerImpactSynth, 'C4', '4n', 0, AUDIO_VELOCITY.death.playerPrimary);
            this.triggerSynth(this.playerSynth, 'A2', '4n', 0.06, AUDIO_VELOCITY.death.playerAccent);
            return;
        }

        this.triggerSynth(this.enemyImpactSynth, 'C2', '4n', 0, AUDIO_VELOCITY.death.enemyPrimary);
        this.triggerSynth(this.enemySynth, 'F1', '4n', 0.04, AUDIO_VELOCITY.death.enemyAccent);
    }

    playDialogueTick(): void {
        this.triggerSynth(this.uiSynth, 'E6', '32n', 0, AUDIO_VELOCITY.ui.dialogue);
    }

    playTeleport(): void {
        this.triggerSynth(this.uiSynth, 'C5', '16n', 0, AUDIO_VELOCITY.ui.teleportPrimary);
        this.triggerSynth(this.uiSynth, 'G5', '16n', 0.06, AUDIO_VELOCITY.ui.teleportAccent);
        this.triggerSynth(this.musicPadSynth, 'C6', '8n', 0.12, AUDIO_VELOCITY.ui.teleportPad);
    }

    playBossSpawn(): void {
        this.triggerNoise('8n', 0, AUDIO_VELOCITY.bossSpawn.noise);
        this.triggerSynth(this.enemySynth, 'D2', '2n', 0, AUDIO_VELOCITY.bossSpawn.primary);
        this.triggerSynth(this.enemyImpactSynth, 'A1', '4n', 0.08, AUDIO_VELOCITY.bossSpawn.accent);
    }

    playStageCleared(): void {
        this.triggerSynth(this.uiSynth, 'C5', '16n', 0, AUDIO_VELOCITY.ui.stageClearPrimary);
        this.triggerSynth(this.uiSynth, 'E5', '16n', 0.08, AUDIO_VELOCITY.ui.stageClearSecondary);
        this.triggerSynth(this.uiSynth, 'G5', '16n', 0.16, AUDIO_VELOCITY.ui.stageClearTertiary);
        this.triggerSynth(this.musicPadSynth, 'C6', '8n', 0.24, AUDIO_VELOCITY.ui.stageClearPad);
    }

    playBarrelBreak(): void {
        this.triggerNoise('16n', 0, AUDIO_VELOCITY.breakables.barrelNoise);
        this.triggerSynth(this.barrelSynth, 'C2', '8n', 0, AUDIO_VELOCITY.breakables.barrelPrimary);
        this.triggerSynth(this.barrelSynth, 'G1', '16n', 0.04, AUDIO_VELOCITY.breakables.barrelAccent);
    }

    playItemPickup(): void {
        this.triggerSynth(this.pickupSynth, 'C5', '16n', 0, AUDIO_VELOCITY.breakables.pickupPrimary);
        this.triggerSynth(this.uiSynth, 'G5', '32n', 0.05, AUDIO_VELOCITY.breakables.pickupAccent);
    }

    playChestOpen(): void {
        this.triggerSynth(this.chestSynth, 'C4', '16n', 0, AUDIO_VELOCITY.breakables.chestPrimary);
        this.triggerSynth(this.chestSynth, 'E4', '16n', 0.06, AUDIO_VELOCITY.breakables.chestSecondary);
        this.triggerSynth(this.chestSynth, 'A4', '8n', 0.12, AUDIO_VELOCITY.breakables.chestAccent);
    }

    private registerUnlockHandlers(): void {
        if (this.unlockHandlersRegistered || typeof window === 'undefined') return;
        this.unlockHandlersRegistered = true;

        const unlock = () => this.unlock();
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
        window.addEventListener('touchstart', unlock, { passive: true });
    }

    private ensureAudioGraph(): boolean {
        if (typeof window === 'undefined') return false;
        if (this.masterBus) return true;

        this.masterBus = new Tone.Gain(0.92).toDestination();
        this.musicBus = new Tone.Gain(0.62);
        this.sfxBus = new Tone.Gain(1.18);

        this.musicChorus = new Tone.Chorus({
            frequency: 0.18,
            delayTime: 2.8,
            depth: 0.2,
            wet: 0.16,
        }).start();
        this.musicReverb = new Tone.Freeverb({
            roomSize: 0.82,
            dampening: 2600,
            wet: 0.2,
        });
        this.musicBus.connect(this.masterBus);
        this.musicBus.connect(this.musicChorus);
        this.musicChorus.connect(this.musicReverb);
        this.musicReverb.connect(this.masterBus);

        this.sfxDelay = new Tone.FeedbackDelay({
            delayTime: 0.12,
            feedback: 0.16,
            wet: 0.08,
        });
        this.sfxReverb = new Tone.Freeverb({
            roomSize: 0.5,
            dampening: 3200,
            wet: 0.12,
        });
        this.sfxBus.connect(this.masterBus);
        this.sfxBus.connect(this.sfxDelay);
        this.sfxDelay.connect(this.sfxReverb);
        this.sfxReverb.connect(this.masterBus);

        this.musicLeadSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.02,
                decay: 0.16,
                sustain: 0.25,
                release: 0.6,
            },
        }).connect(this.musicBus);
        this.musicPadSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.05,
                decay: 0.2,
                sustain: 0.35,
                release: 1.1,
            },
        }).connect(this.musicBus);

        this.playerSynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.001,
                decay: 0.08,
                sustain: 0.08,
                release: 0.12,
            },
        }).connect(this.sfxBus);
        this.enemySynth = new Tone.MonoSynth({
            oscillator: { type: 'square' },
            envelope: {
                attack: 0.001,
                decay: 0.12,
                sustain: 0.1,
                release: 0.14,
            },
            filterEnvelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0.1,
                release: 0.12,
                baseFrequency: 180,
                octaves: 3.2,
            },
        }).connect(this.sfxBus);
        this.playerImpactSynth = new Tone.FMSynth({
            harmonicity: 1.5,
            modulationIndex: 4,
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.001,
                decay: 0.12,
                sustain: 0,
                release: 0.14,
            },
            modulation: { type: 'square' },
            modulationEnvelope: {
                attack: 0.001,
                decay: 0.08,
                sustain: 0,
                release: 0.1,
            },
        }).connect(this.sfxBus);
        this.enemyImpactSynth = new Tone.MembraneSynth({
            pitchDecay: 0.02,
            octaves: 6,
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.001,
                decay: 0.24,
                sustain: 0,
                release: 0.14,
            },
        }).connect(this.sfxBus);
        this.impactNoiseSynth = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: {
                attack: 0.001,
                decay: 0.08,
                sustain: 0,
            },
        }).connect(this.sfxBus);
        this.uiSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.05,
                sustain: 0,
                release: 0.08,
            },
        }).connect(this.sfxBus);
        this.pickupSynth = new Tone.PluckSynth({
            attackNoise: 1.2,
            dampening: 3000,
            resonance: 0.82,
        }).connect(this.sfxBus);
        this.barrelSynth = new Tone.MembraneSynth({
            pitchDecay: 0.01,
            octaves: 8,
            oscillator: { type: 'sawtooth' },
            envelope: {
                attack: 0.001,
                decay: 0.18,
                sustain: 0,
                release: 0.1,
            },
        }).connect(this.sfxBus);
        this.chestSynth = new Tone.FMSynth({
            harmonicity: 2,
            modulationIndex: 6,
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.002,
                decay: 0.14,
                sustain: 0.12,
                release: 0.2,
            },
            modulation: { type: 'sine' },
            modulationEnvelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0,
                release: 0.12,
            },
        }).connect(this.sfxBus);

        return true;
    }

    private startStageMusicIfPossible(): void {
        if (!this.ensureAudioGraph() || Tone.getContext().rawContext.state !== 'running' || !this.currentStageId || this.playingStageId === this.currentStageId) {
            return;
        }

        const profile = STAGE_MUSIC[this.currentStageId] ?? STAGE_MUSIC.lobby;
        let pulseIndex = 0;
        const playPulse = () => {
            const note = profile.leadNotes[pulseIndex % profile.leadNotes.length];
            const harmonyNote = profile.harmonyNotes?.[pulseIndex % (profile.harmonyNotes?.length ?? 1)];
            const now = Tone.now();

            this.musicLeadSynth?.triggerAttackRelease(note, profile.leadDuration, now, profile.leadVelocity);
            if (harmonyNote !== undefined) {
                this.musicPadSynth?.triggerAttackRelease(
                    harmonyNote,
                    profile.harmonyDuration,
                    now + MUSIC_HARMONY_DELAY_SECONDS,
                    profile.harmonyVelocity,
                );
            }

            pulseIndex++;
        };

        this.playingStageId = this.currentStageId;
        playPulse();
        this.musicPulseInterval = window.setInterval(playPulse, profile.pulseIntervalSeconds * 1000);
    }

    private stopStageMusic(): void {
        if (this.musicPulseInterval !== null) {
            window.clearInterval(this.musicPulseInterval);
            this.musicPulseInterval = null;
        }

        this.musicLeadSynth?.releaseAll();
        this.musicPadSynth?.releaseAll();
        this.playingStageId = null;
    }

    private getAudioTime(delay: number = 0): number | null {
        if (!this.ensureAudioGraph()) return null;
        if (Tone.getContext().rawContext.state !== 'running') return null;

        return Tone.now() + delay;
    }

    private triggerSynth(
        synth: TriggerableSynth | null,
        note: ToneJSNote,
        duration: ToneJSDuration,
        delay: number,
        velocity: number,
    ): void {
        const time = this.getAudioTime(delay);
        if (time === null || synth === null) return;

        synth.triggerAttackRelease(note, duration, time, velocity);
    }

    private triggerNoise(duration: ToneJSDuration, delay: number, velocity: number): void {
        const time = this.getAudioTime(delay);
        if (time === null || this.impactNoiseSynth === null) return;

        this.impactNoiseSynth.triggerAttackRelease(duration, time, velocity);
    }
}
