type AudioBus = 'music' | 'sfx';
type FootstepSource = 'player' | 'enemy';
type CombatSource = 'player' | 'enemy';
type CardRevealRarity = 'normal' | 'uncommon' | 'special';

/**
 * Minimum gain used as the start/end value in amplitude envelopes to avoid
 * audio clicks (exponential ramps cannot go to zero). Exported so that the
 * Sound Editor tool can reference it in generated `playTone()` snippets.
 */
export const ENVELOPE_MIN_GAIN = 0.0001;
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

    // ── To retune sounds: run `npm run dev:sound-editor`, compose there, then paste ──
    // ── the generated playTone()/playNoise() calls directly into the methods below.  ──
    // ── For arpeggio-style sounds the editor won't replicate the glide ratio; add a  ──
    // ── comment like '// glide ratio 1.05' next to the last argument of each tone.   ──

    playFootstep(source: FootstepSource): void {
        if (source === 'player') {
            this.playNoise(0.07, 0.055, 1500, 180, 0);
            this.playTone(92, 0.06, 'triangle', 0.055, ENVELOPE_MIN_GAIN, 0);
        } else {
            this.playNoise(0.07, 0.042, 900, 110, 0);
            this.playTone(64, 0.06, 'sine', 0.042, ENVELOPE_MIN_GAIN, 0);
        }
    }

    playJump(): void {
        this.playTone(260, 0.2, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0, 720);
        this.playTone(520, 0.08, 'sine', 0.03, ENVELOPE_MIN_GAIN, 0.03, 780);
    }

    playAttack(source: CombatSource, charged: boolean = false): void {
        if (charged) {
            this.playNoise(0.18, 0.11, 3600, 260, 0);
            this.playTone(180, 0.22, 'sawtooth', 0.12, ENVELOPE_MIN_GAIN, 0, 520);
            this.playTone(540, 0.14, 'triangle', 0.055, ENVELOPE_MIN_GAIN, 0.03, 860);
        } else if (source === 'player') {
            this.playNoise(0.07, 0.07, 4200, 420, 0);
            this.playTone(540, 0.09, 'square', 0.1, ENVELOPE_MIN_GAIN, 0, 260);
            this.playTone(880, 0.05, 'triangle', 0.038, ENVELOPE_MIN_GAIN, 0.02, 660);
        } else {
            this.playNoise(0.12, 0.08, 1000, 90, 0);
            this.playTone(150, 0.16, 'sawtooth', 0.09, ENVELOPE_MIN_GAIN, 0, 96);
            this.playTone(90, 0.12, 'square', 0.045, ENVELOPE_MIN_GAIN, 0.02, 70);
        }
    }

    playDamage(source: CombatSource): void {
        if (source === 'player') {
            this.playNoise(0.11, 0.085, 3600, 500, 0);
            this.playTone(760, 0.11, 'square', 0.06, ENVELOPE_MIN_GAIN, 0, 280);
        } else {
            this.playNoise(0.09, 0.07, 1600, 140, 0);
            this.playTone(210, 0.11, 'triangle', 0.055, ENVELOPE_MIN_GAIN, 0, 120);
        }
    }

    playDeath(source: CombatSource): void {
        if (source === 'player') {
            this.playNoise(0.2, 0.09, 1200, 120, 0);
            this.playTone(180, 0.45, 'sawtooth', 0.09, ENVELOPE_MIN_GAIN, 0, 36);
        } else {
            this.playNoise(0.2, 0.065, 1200, 120, 0);
            this.playTone(120, 0.45, 'triangle', 0.065, ENVELOPE_MIN_GAIN, 0, 24);
        }
    }

    playDialogueTick(): void {
        this.playNoise(0.025, 0.03, 4500, 1200, 0);
        this.playTone(1400, 0.03, 'square', 0.018, ENVELOPE_MIN_GAIN, 0);
    }

    playMenuNavigate(): void {
        this.playTone(1046.5, 0.05, 'triangle', 0.035, ENVELOPE_MIN_GAIN, 0);
        this.playTone(1318.51, 0.05, 'sine', 0.022, ENVELOPE_MIN_GAIN, 0.02);
    }

    playBuy(): void {
        // glide ratio 1.03 applied to each note
        this.playTone(523.25, 0.12, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0, 539.0475);
        this.playTone(659.25, 0.12, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0.04, 679.0275);
        this.playTone(783.99, 0.12, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0.08, 807.5097);
    }

    playSell(): void {
        // glide ratio 0.96 applied to each note (descending glide)
        this.playTone(659.25, 0.1, 'sine', 0.05, ENVELOPE_MIN_GAIN, 0, 632.88);
        this.playTone(523.25, 0.1, 'sine', 0.05, ENVELOPE_MIN_GAIN, 0.035, 502.32);
        this.playTone(392, 0.1, 'sine', 0.05, ENVELOPE_MIN_GAIN, 0.07, 376.32);
    }

    playUpgrade(): void {
        this.playNoise(0.04, 0.025, 5200, 800, 0.02);
        // glide ratio 1.05 applied to each note
        this.playTone(392, 0.14, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0, 411.6);
        this.playTone(523.25, 0.14, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0.045, 549.4125);
        this.playTone(659.25, 0.14, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0.09, 692.2125);
        this.playTone(783.99, 0.14, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0.135, 823.1895);
    }

    playInsufficient(): void {
        this.playNoise(0.035, 0.018, 2800, 500, 0);
        // glide ratio 0.94 applied to each note (descending glide)
        this.playTone(311.13, 0.12, 'square', 0.045, ENVELOPE_MIN_GAIN, 0, 292.4622);
        this.playTone(246.94, 0.12, 'square', 0.045, ENVELOPE_MIN_GAIN, 0.05, 232.1236);
    }

    playLaserBeamSkill(): void {
        this.playNoise(0.06, 0.025, 5200, 900, 0);
        this.playTone(720, 0.14, 'sawtooth', 0.07, ENVELOPE_MIN_GAIN, 0, 1440);
        this.playTone(1440, 0.08, 'triangle', 0.035, ENVELOPE_MIN_GAIN, 0.03, 1960);
    }

    playHealingSkill(): void {
        // glide ratio 1.04 applied to each note
        this.playTone(523.25, 0.16, 'triangle', 0.05, ENVELOPE_MIN_GAIN, 0, 544.18);
        this.playTone(659.25, 0.16, 'triangle', 0.05, ENVELOPE_MIN_GAIN, 0.04, 685.62);
        this.playTone(783.99, 0.16, 'triangle', 0.05, ENVELOPE_MIN_GAIN, 0.08, 815.3496);
    }

    playAreaAttackSkill(): void {
        this.playNoise(0.08, 0.035, 1800, 140, 0);
        this.playTone(164.81, 0.16, 'sawtooth', 0.08, ENVELOPE_MIN_GAIN, 0, 110);
        this.playTone(246.94, 0.12, 'square', 0.045, ENVELOPE_MIN_GAIN, 0.04, 196);
    }

    playEquip(): void {
        // glide ratio 1.03 applied to each note
        this.playTone(392, 0.1, 'triangle', 0.05, ENVELOPE_MIN_GAIN, 0, 403.76);
        this.playTone(587.33, 0.1, 'triangle', 0.05, ENVELOPE_MIN_GAIN, 0.03, 604.9499);
        this.playTone(783.99, 0.1, 'triangle', 0.05, ENVELOPE_MIN_GAIN, 0.06, 807.5097);
    }

    playUiOpen(): void {
        // glide ratio 1.04 applied to each note
        this.playTone(392, 0.1, 'triangle', 0.04, ENVELOPE_MIN_GAIN, 0, 407.68);
        this.playTone(523.25, 0.1, 'triangle', 0.04, ENVELOPE_MIN_GAIN, 0.035, 544.18);
    }

    playUiClose(): void {
        // glide ratio 0.96 applied to each note (descending glide)
        this.playTone(523.25, 0.09, 'sine', 0.032, ENVELOPE_MIN_GAIN, 0, 502.32);
        this.playTone(392, 0.09, 'sine', 0.032, ENVELOPE_MIN_GAIN, 0.03, 376.32);
    }

    playCardReveal(rarity: CardRevealRarity): void {
        switch (rarity) {
            case 'normal':
                this.playTone(440, 0.09, 'triangle', 0.05, ENVELOPE_MIN_GAIN, 0, 659.25);
                break;
            case 'uncommon':
                // glide ratio 1.06 applied to each note
                this.playTone(523.25, 0.12, 'triangle', 0.055, ENVELOPE_MIN_GAIN, 0, 554.645);
                this.playTone(659.25, 0.12, 'triangle', 0.055, ENVELOPE_MIN_GAIN, 0.04, 698.805);
                break;
            case 'special':
                this.playNoise(0.05, 0.02, 4800, 900, 0);
                // glide ratio 1.08 applied to each note
                this.playTone(659.25, 0.14, 'sawtooth', 0.065, ENVELOPE_MIN_GAIN, 0, 711.99);
                this.playTone(783.99, 0.14, 'sawtooth', 0.065, ENVELOPE_MIN_GAIN, 0.045, 846.7092);
                this.playTone(1046.5, 0.14, 'sawtooth', 0.065, ENVELOPE_MIN_GAIN, 0.09, 1130.22);
                break;
        }
    }

    playAlbumComplete(): void {
        this.playNoise(0.08, 0.018, 5400, 1000, 0);
        // glide ratio 1.04; first 3 notes triangle, last 2 sawtooth
        this.playTone(392, 0.18, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0, 407.68);
        this.playTone(523.25, 0.18, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0.05, 544.18);
        this.playTone(659.25, 0.18, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0.1, 685.62);
        this.playTone(783.99, 0.18, 'sawtooth', 0.07, ENVELOPE_MIN_GAIN, 0.15, 815.3496);
        this.playTone(1046.5, 0.18, 'sawtooth', 0.07, ENVELOPE_MIN_GAIN, 0.2, 1088.36);
    }

    playLevelUp(): void {
        this.playNoise(0.06, 0.022, 5600, 1000, 0);
        // glide ratio 1.05; first 2 notes triangle, last 2 sawtooth
        this.playTone(523.25, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0, 549.4125);
        this.playTone(659.25, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0.045, 692.2125);
        this.playTone(783.99, 0.16, 'sawtooth', 0.07, ENVELOPE_MIN_GAIN, 0.09, 823.1895);
        this.playTone(1046.5, 0.16, 'sawtooth', 0.07, ENVELOPE_MIN_GAIN, 0.135, 1098.825);
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
        // glide ratio 1.12 applied to each note
        this.playTone(261.63, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0, 292.0256);
        this.playTone(392, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0.08, 439.04);
        this.playTone(523.25, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0.16, 586.04);
    }

    playBossSpawn(): void {
        this.playNoise(0.28, 0.075, 1400, 90, 0);
        this.playTone(98, 0.5, 'sawtooth', 0.1, ENVELOPE_MIN_GAIN, 0, 49);
        this.playTone(146.83, 0.35, 'square', 0.055, ENVELOPE_MIN_GAIN, 0.12, 110);
    }

    playStageCleared(): void {
        this.playTone(261.63, 0.22, 'triangle', 0.085, ENVELOPE_MIN_GAIN, 0);
        this.playTone(329.63, 0.22, 'triangle', 0.085, ENVELOPE_MIN_GAIN, 0.07);
        this.playTone(392, 0.22, 'triangle', 0.085, ENVELOPE_MIN_GAIN, 0.14);
        this.playTone(523.25, 0.22, 'triangle', 0.085, ENVELOPE_MIN_GAIN, 0.21);
    }

    playBarrelBreak(): void {
        this.playNoise(0.12, 0.08, 2200, 180, 0);
        this.playTone(110, 0.18, 'square', 0.075, ENVELOPE_MIN_GAIN, 0, 72);
        this.playTone(180, 0.08, 'triangle', 0.035, ENVELOPE_MIN_GAIN, 0.03, 120);
    }

    playItemPickup(): void {
        this.playTone(659.25, 0.08, 'triangle', 0.06, ENVELOPE_MIN_GAIN, 0);
        this.playTone(987.77, 0.1, 'sine', 0.045, ENVELOPE_MIN_GAIN, 0.05);
    }

    playChestOpen(): void {
        // glide ratio 1.08 applied to each note
        this.playTone(196, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0, 211.68);
        this.playTone(246.94, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0.05, 266.6952);
        this.playTone(329.63, 0.16, 'triangle', 0.07, ENVELOPE_MIN_GAIN, 0.1, 356.0004);
    }

    private registerUnlockHandlers(): void {
        if (this.unlockHandlersRegistered || typeof window === 'undefined') return;
        this.unlockHandlersRegistered = true;

        const unlock = () => this.unlock();
        window.addEventListener('pointerdown', unlock, { capture: true });
        window.addEventListener('keydown', unlock, { capture: true });
        window.addEventListener('touchstart', unlock, { passive: true, capture: true });
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

    private getStageMusicDispatch(stageId: string): { play: () => void; loopMs: number } {
        switch (stageId) {
            case 'startScreen':          return { play: () => this.playStartScreenMusic(),          loopMs: 1680 };
            case 'lobby':                return { play: () => this.playLobbyMusic(),                loopMs: 1360 };
            case 'networkMatrix':        return { play: () => this.playNetworkMatrixMusic(),        loopMs: 1450 };
            case 'packetForge':          return { play: () => this.playPacketForgeMusic(),          loopMs: 1250 };
            case 'cipherNull':           return { play: () => this.playCipherNullMusic(),           loopMs: 1550 };
            case 'cipherNullDepth2':     return { play: () => this.playCipherNullDepth2Music(),     loopMs: 1300 };
            case 'securityCore':         return { play: () => this.playSecurityCoreMusic(),         loopMs: 1300 };
            case 'securityCoreDepth2':   return { play: () => this.playSecurityCoreDepth2Music(),   loopMs: 1100 };
            case 'securityCoreDepth3':   return { play: () => this.playSecurityCoreDepth3Music(),   loopMs: 975  };
            case 'kernelTerminus':       return { play: () => this.playKernelTerminusMusic(),       loopMs: 1200 };
            case 'kernelTerminusDepth2': return { play: () => this.playKernelTerminusDepth2Music(), loopMs: 1025 };
            case 'kernelTerminusDepth3': return { play: () => this.playKernelTerminusDepth3Music(), loopMs: 900  };
            case 'gameTest':             return { play: () => this.playGameTestMusic(),             loopMs: 1040 };
            default: {
                console.warn(`[AudioManager] Unknown stageId "${stageId}", falling back to lobby music.`);
                return { play: () => this.playLobbyMusic(), loopMs: 1360 };
            }
        }
    }

    private startStageMusicIfPossible(): void {
        const context = this.ensureAudioContext();
        if (!context || context.state !== 'running' || !this.currentStageId || this.playingStageId === this.currentStageId) {
            return;
        }

        const { play, loopMs } = this.getStageMusicDispatch(this.currentStageId);
        this.playingStageId = this.currentStageId;
        play();
        this.musicPulseInterval = window.setInterval(play, loopMs);
    }

    // ── Stage music phrases — each method schedules the full phrase via delays.        ──
    // ── To retune: compose in `npm run dev:sound-editor` (port 5174), paste the       ──
    // ── generated playTone() calls here, and append `, undefined, 'music'` to each   ──
    // ── call so it is routed to the music bus rather than the SFX bus.                ──

    private playStartScreenMusic(): void {
        // 4 × 420 ms phrase (loop: 1680 ms)
        this.playTone(174.61, 0.34,  'triangle', 0.065, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(261.63, 0.306, 'sine',     0.03,  ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(220,    0.34,  'triangle', 0.065, ENVELOPE_MIN_GAIN, 0.42, undefined, 'music');
        this.playTone(329.63, 0.306, 'sine',     0.03,  ENVELOPE_MIN_GAIN, 0.46, undefined, 'music');
        this.playTone(261.63, 0.34,  'triangle', 0.065, ENVELOPE_MIN_GAIN, 0.84, undefined, 'music');
        this.playTone(349.23, 0.306, 'sine',     0.03,  ENVELOPE_MIN_GAIN, 0.88, undefined, 'music');
        this.playTone(293.66, 0.34,  'triangle', 0.065, ENVELOPE_MIN_GAIN, 1.26, undefined, 'music');
        this.playTone(392,    0.306, 'sine',     0.03,  ENVELOPE_MIN_GAIN, 1.3,  undefined, 'music');
    }

    private playLobbyMusic(): void {
        // 4 × 340 ms phrase (loop: 1360 ms)
        this.playTone(220,    0.22,  'triangle', 0.07,  ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(329.63, 0.198, 'sine',     0.028, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(277.18, 0.22,  'triangle', 0.07,  ENVELOPE_MIN_GAIN, 0.34, undefined, 'music');
        this.playTone(369.99, 0.198, 'sine',     0.028, ENVELOPE_MIN_GAIN, 0.38, undefined, 'music');
        this.playTone(329.63, 0.22,  'triangle', 0.07,  ENVELOPE_MIN_GAIN, 0.68, undefined, 'music');
        this.playTone(440,    0.198, 'sine',     0.028, ENVELOPE_MIN_GAIN, 0.72, undefined, 'music');
        this.playTone(440,    0.22,  'triangle', 0.07,  ENVELOPE_MIN_GAIN, 1.02, undefined, 'music');
        this.playTone(554.37, 0.198, 'sine',     0.028, ENVELOPE_MIN_GAIN, 1.06, undefined, 'music');
    }

    private playNetworkMatrixMusic(): void {
        // 5 × 290 ms phrase (loop: 1450 ms)
        this.playTone(220,    0.16,  'square',   0.074, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(146.83, 0.144, 'triangle', 0.024, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(277.18, 0.16,  'square',   0.074, ENVELOPE_MIN_GAIN, 0.29, undefined, 'music');
        this.playTone(174.61, 0.144, 'triangle', 0.024, ENVELOPE_MIN_GAIN, 0.33, undefined, 'music');
        this.playTone(369.99, 0.16,  'square',   0.074, ENVELOPE_MIN_GAIN, 0.58, undefined, 'music');
        this.playTone(220,    0.144, 'triangle', 0.024, ENVELOPE_MIN_GAIN, 0.62, undefined, 'music');
        this.playTone(466.16, 0.16,  'square',   0.074, ENVELOPE_MIN_GAIN, 0.87, undefined, 'music');
        this.playTone(277.18, 0.144, 'triangle', 0.024, ENVELOPE_MIN_GAIN, 0.91, undefined, 'music');
        this.playTone(369.99, 0.16,  'square',   0.074, ENVELOPE_MIN_GAIN, 1.16, undefined, 'music');
        this.playTone(233.08, 0.144, 'triangle', 0.024, ENVELOPE_MIN_GAIN, 1.2,  undefined, 'music');
    }

    private playPacketForgeMusic(): void {
        // 5 × 250 ms phrase (loop: 1250 ms)
        this.playTone(196,    0.17,  'square',   0.076, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(130.81, 0.153, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(246.94, 0.17,  'square',   0.076, ENVELOPE_MIN_GAIN, 0.25, undefined, 'music');
        this.playTone(164.81, 0.153, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.29, undefined, 'music');
        this.playTone(293.66, 0.17,  'square',   0.076, ENVELOPE_MIN_GAIN, 0.5,  undefined, 'music');
        this.playTone(196,    0.153, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.54, undefined, 'music');
        this.playTone(246.94, 0.17,  'square',   0.076, ENVELOPE_MIN_GAIN, 0.75, undefined, 'music');
        this.playTone(164.81, 0.153, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.79, undefined, 'music');
        this.playTone(392,    0.17,  'square',   0.076, ENVELOPE_MIN_GAIN, 1.0,  undefined, 'music');
        this.playTone(220,    0.153, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 1.04, undefined, 'music');
    }

    private playCipherNullMusic(): void {
        // 5 × 310 ms phrase (loop: 1550 ms)
        this.playTone(155.56, 0.19,  'sawtooth', 0.074, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(233.08, 0.171, 'triangle', 0.023, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(185,    0.19,  'sawtooth', 0.074, ENVELOPE_MIN_GAIN, 0.31, undefined, 'music');
        this.playTone(277.18, 0.171, 'triangle', 0.023, ENVELOPE_MIN_GAIN, 0.35, undefined, 'music');
        this.playTone(233.08, 0.19,  'sawtooth', 0.074, ENVELOPE_MIN_GAIN, 0.62, undefined, 'music');
        this.playTone(311.13, 0.171, 'triangle', 0.023, ENVELOPE_MIN_GAIN, 0.66, undefined, 'music');
        this.playTone(207.65, 0.19,  'sawtooth', 0.074, ENVELOPE_MIN_GAIN, 0.93, undefined, 'music');
        this.playTone(277.18, 0.171, 'triangle', 0.023, ENVELOPE_MIN_GAIN, 0.97, undefined, 'music');
        this.playTone(138.59, 0.19,  'sawtooth', 0.074, ENVELOPE_MIN_GAIN, 1.24, undefined, 'music');
        this.playTone(207.65, 0.171, 'triangle', 0.023, ENVELOPE_MIN_GAIN, 1.28, undefined, 'music');
    }

    private playCipherNullDepth2Music(): void {
        // 5 × 260 ms phrase (loop: 1300 ms)
        this.playTone(155.56, 0.17,  'sawtooth', 0.084, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(233.08, 0.153, 'triangle', 0.026, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(185,    0.17,  'sawtooth', 0.084, ENVELOPE_MIN_GAIN, 0.26, undefined, 'music');
        this.playTone(277.18, 0.153, 'triangle', 0.026, ENVELOPE_MIN_GAIN, 0.3,  undefined, 'music');
        this.playTone(233.08, 0.17,  'sawtooth', 0.084, ENVELOPE_MIN_GAIN, 0.52, undefined, 'music');
        this.playTone(311.13, 0.153, 'triangle', 0.026, ENVELOPE_MIN_GAIN, 0.56, undefined, 'music');
        this.playTone(207.65, 0.17,  'sawtooth', 0.084, ENVELOPE_MIN_GAIN, 0.78, undefined, 'music');
        this.playTone(277.18, 0.153, 'triangle', 0.026, ENVELOPE_MIN_GAIN, 0.82, undefined, 'music');
        this.playTone(138.59, 0.17,  'sawtooth', 0.084, ENVELOPE_MIN_GAIN, 1.04, undefined, 'music');
        this.playTone(207.65, 0.153, 'triangle', 0.026, ENVELOPE_MIN_GAIN, 1.08, undefined, 'music');
    }

    private playSecurityCoreMusic(): void {
        // 5 × 260 ms phrase (loop: 1300 ms)
        this.playTone(130.81, 0.18,  'sawtooth', 0.08,  ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(196,    0.162, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(164.81, 0.18,  'sawtooth', 0.08,  ENVELOPE_MIN_GAIN, 0.26, undefined, 'music');
        this.playTone(246.94, 0.162, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.3,  undefined, 'music');
        this.playTone(220,    0.18,  'sawtooth', 0.08,  ENVELOPE_MIN_GAIN, 0.52, undefined, 'music');
        this.playTone(311.13, 0.162, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.56, undefined, 'music');
        this.playTone(261.63, 0.18,  'sawtooth', 0.08,  ENVELOPE_MIN_GAIN, 0.78, undefined, 'music');
        this.playTone(369.99, 0.162, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 0.82, undefined, 'music');
        this.playTone(174.61, 0.18,  'sawtooth', 0.08,  ENVELOPE_MIN_GAIN, 1.04, undefined, 'music');
        this.playTone(246.94, 0.162, 'sawtooth', 0.024, ENVELOPE_MIN_GAIN, 1.08, undefined, 'music');
    }

    private playSecurityCoreDepth2Music(): void {
        // 5 × 220 ms phrase (loop: 1100 ms)
        this.playTone(130.81, 0.17,  'sawtooth', 0.087, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(196,    0.153, 'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(164.81, 0.17,  'sawtooth', 0.087, ENVELOPE_MIN_GAIN, 0.22, undefined, 'music');
        this.playTone(246.94, 0.153, 'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.26, undefined, 'music');
        this.playTone(220,    0.17,  'sawtooth', 0.087, ENVELOPE_MIN_GAIN, 0.44, undefined, 'music');
        this.playTone(311.13, 0.153, 'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.48, undefined, 'music');
        this.playTone(261.63, 0.17,  'sawtooth', 0.087, ENVELOPE_MIN_GAIN, 0.66, undefined, 'music');
        this.playTone(369.99, 0.153, 'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.7,  undefined, 'music');
        this.playTone(174.61, 0.17,  'sawtooth', 0.087, ENVELOPE_MIN_GAIN, 0.88, undefined, 'music');
        this.playTone(246.94, 0.153, 'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.92, undefined, 'music');
    }

    private playSecurityCoreDepth3Music(): void {
        // 5 × 195 ms phrase (loop: 975 ms)
        this.playTone(130.81, 0.16,  'sawtooth', 0.095, ENVELOPE_MIN_GAIN, 0,     undefined, 'music');
        this.playTone(196,    0.144, 'square',   0.028, ENVELOPE_MIN_GAIN, 0.04,  undefined, 'music');
        this.playTone(164.81, 0.16,  'sawtooth', 0.095, ENVELOPE_MIN_GAIN, 0.195, undefined, 'music');
        this.playTone(246.94, 0.144, 'square',   0.028, ENVELOPE_MIN_GAIN, 0.235, undefined, 'music');
        this.playTone(220,    0.16,  'sawtooth', 0.095, ENVELOPE_MIN_GAIN, 0.39,  undefined, 'music');
        this.playTone(311.13, 0.144, 'square',   0.028, ENVELOPE_MIN_GAIN, 0.43,  undefined, 'music');
        this.playTone(261.63, 0.16,  'sawtooth', 0.095, ENVELOPE_MIN_GAIN, 0.585, undefined, 'music');
        this.playTone(369.99, 0.144, 'square',   0.028, ENVELOPE_MIN_GAIN, 0.625, undefined, 'music');
        this.playTone(174.61, 0.16,  'sawtooth', 0.095, ENVELOPE_MIN_GAIN, 0.78,  undefined, 'music');
        this.playTone(246.94, 0.144, 'square',   0.028, ENVELOPE_MIN_GAIN, 0.82,  undefined, 'music');
    }

    private playKernelTerminusMusic(): void {
        // 5 × 240 ms phrase (loop: 1200 ms)
        this.playTone(123.47, 0.2,   'sawtooth', 0.086, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(185,    0.18,  'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(164.81, 0.2,   'sawtooth', 0.086, ENVELOPE_MIN_GAIN, 0.24, undefined, 'music');
        this.playTone(246.94, 0.18,  'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.28, undefined, 'music');
        this.playTone(220,    0.2,   'sawtooth', 0.086, ENVELOPE_MIN_GAIN, 0.48, undefined, 'music');
        this.playTone(329.63, 0.18,  'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.52, undefined, 'music');
        this.playTone(293.66, 0.2,   'sawtooth', 0.086, ENVELOPE_MIN_GAIN, 0.72, undefined, 'music');
        this.playTone(392,    0.18,  'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 0.76, undefined, 'music');
        this.playTone(329.63, 0.2,   'sawtooth', 0.086, ENVELOPE_MIN_GAIN, 0.96, undefined, 'music');
        this.playTone(440,    0.18,  'sawtooth', 0.026, ENVELOPE_MIN_GAIN, 1.0,  undefined, 'music');
    }

    private playKernelTerminusDepth2Music(): void {
        // 5 × 205 ms phrase (loop: 1025 ms)
        this.playTone(123.47, 0.18,  'sawtooth', 0.096, ENVELOPE_MIN_GAIN, 0,     undefined, 'music');
        this.playTone(185,    0.162, 'sawtooth', 0.028, ENVELOPE_MIN_GAIN, 0.04,  undefined, 'music');
        this.playTone(164.81, 0.18,  'sawtooth', 0.096, ENVELOPE_MIN_GAIN, 0.205, undefined, 'music');
        this.playTone(246.94, 0.162, 'sawtooth', 0.028, ENVELOPE_MIN_GAIN, 0.245, undefined, 'music');
        this.playTone(220,    0.18,  'sawtooth', 0.096, ENVELOPE_MIN_GAIN, 0.41,  undefined, 'music');
        this.playTone(329.63, 0.162, 'sawtooth', 0.028, ENVELOPE_MIN_GAIN, 0.45,  undefined, 'music');
        this.playTone(293.66, 0.18,  'sawtooth', 0.096, ENVELOPE_MIN_GAIN, 0.615, undefined, 'music');
        this.playTone(392,    0.162, 'sawtooth', 0.028, ENVELOPE_MIN_GAIN, 0.655, undefined, 'music');
        this.playTone(329.63, 0.18,  'sawtooth', 0.096, ENVELOPE_MIN_GAIN, 0.82,  undefined, 'music');
        this.playTone(440,    0.162, 'sawtooth', 0.028, ENVELOPE_MIN_GAIN, 0.86,  undefined, 'music');
    }

    private playKernelTerminusDepth3Music(): void {
        // 5 × 180 ms phrase (loop: 900 ms)
        this.playTone(123.47, 0.16,  'square',   0.105, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(185,    0.144, 'sawtooth', 0.03,  ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(164.81, 0.16,  'square',   0.105, ENVELOPE_MIN_GAIN, 0.18, undefined, 'music');
        this.playTone(246.94, 0.144, 'sawtooth', 0.03,  ENVELOPE_MIN_GAIN, 0.22, undefined, 'music');
        this.playTone(220,    0.16,  'square',   0.105, ENVELOPE_MIN_GAIN, 0.36, undefined, 'music');
        this.playTone(329.63, 0.144, 'sawtooth', 0.03,  ENVELOPE_MIN_GAIN, 0.4,  undefined, 'music');
        this.playTone(293.66, 0.16,  'square',   0.105, ENVELOPE_MIN_GAIN, 0.54, undefined, 'music');
        this.playTone(392,    0.144, 'sawtooth', 0.03,  ENVELOPE_MIN_GAIN, 0.58, undefined, 'music');
        this.playTone(329.63, 0.16,  'square',   0.105, ENVELOPE_MIN_GAIN, 0.72, undefined, 'music');
        this.playTone(440,    0.144, 'sawtooth', 0.03,  ENVELOPE_MIN_GAIN, 0.76, undefined, 'music');
    }

    private playGameTestMusic(): void {
        // 4 × 260 ms phrase (loop: 1040 ms)
        this.playTone(220,    0.18,  'square',   0.076, ENVELOPE_MIN_GAIN, 0,    undefined, 'music');
        this.playTone(293.66, 0.162, 'triangle', 0.025, ENVELOPE_MIN_GAIN, 0.04, undefined, 'music');
        this.playTone(246.94, 0.18,  'square',   0.076, ENVELOPE_MIN_GAIN, 0.26, undefined, 'music');
        this.playTone(329.63, 0.162, 'triangle', 0.025, ENVELOPE_MIN_GAIN, 0.3,  undefined, 'music');
        this.playTone(293.66, 0.18,  'square',   0.076, ENVELOPE_MIN_GAIN, 0.52, undefined, 'music');
        this.playTone(392,    0.162, 'triangle', 0.025, ENVELOPE_MIN_GAIN, 0.56, undefined, 'music');
        this.playTone(369.99, 0.18,  'square',   0.076, ENVELOPE_MIN_GAIN, 0.78, undefined, 'music');
        this.playTone(466.16, 0.162, 'triangle', 0.025, ENVELOPE_MIN_GAIN, 0.82, undefined, 'music');
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

            this.playNoise(0.14, 0.018, 4200, 900, 0);
            this.playTone(primary, 0.26, 'triangle', 0.04, ENVELOPE_MIN_GAIN, 0, primary * 1.08);
            this.playTone(swirl, 0.18, 'sine', 0.025, ENVELOPE_MIN_GAIN, 0.05, swirl * 1.04);
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
        endGain: number = ENVELOPE_MIN_GAIN,
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
        gain.gain.exponentialRampToValueAtTime(Math.max(ENVELOPE_MIN_GAIN, endGain), stopTime);

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
