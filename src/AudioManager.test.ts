import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager, MUSIC_ENABLED_STORAGE_KEY, SFX_ENABLED_STORAGE_KEY } from './AudioManager';

describe('audio settings persistence', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn().mockReturnValue(null),
            setItem: vi.fn(),
        });
    });

    it('persists music enabled state to localStorage', () => {
        const manager = Object.create((AudioManager as any).prototype) as any;
        Object.assign(manager, {
            musicEnabled: true,
            sfxEnabled: true,
            musicGain: null,
            sfxGain: null,
        });

        manager.setMusicEnabled(false);

        expect(localStorage.setItem).toHaveBeenCalledWith(MUSIC_ENABLED_STORAGE_KEY, 'false');
        expect(manager.isMusicEnabled()).toBe(false);
    });

    it('persists sound effects enabled state to localStorage', () => {
        const manager = Object.create((AudioManager as any).prototype) as any;
        Object.assign(manager, {
            musicEnabled: true,
            sfxEnabled: true,
            musicGain: null,
            sfxGain: null,
        });

        manager.setSfxEnabled(false);

        expect(localStorage.setItem).toHaveBeenCalledWith(SFX_ENABLED_STORAGE_KEY, 'false');
        expect(manager.isSfxEnabled()).toBe(false);
    });
});

describe('stage music transitions', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('stops active stage-music oscillators immediately when stage music is stopped', () => {
        const manager = Object.create((AudioManager as any).prototype) as any;
        const stopA = vi.fn();
        const stopB = vi.fn().mockImplementation(() => {
            throw new DOMException('already stopped', 'InvalidStateError');
        });
        const disconnectA = vi.fn();
        const disconnectB = vi.fn();
        const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

        Object.assign(manager, {
            musicPulseInterval: 1234,
            playingStageId: 'startScreen',
            activeMusicOscillators: new Set([
                { stop: stopA, disconnect: disconnectA },
                { stop: stopB, disconnect: disconnectB },
            ]),
        });

        manager.stopStageMusic();

        expect(clearIntervalSpy).toHaveBeenCalledWith(1234);
        expect(stopA).toHaveBeenCalledWith(0);
        expect(stopB).toHaveBeenCalledWith(0);
        expect(disconnectA).toHaveBeenCalledTimes(1);
        expect(disconnectB).toHaveBeenCalledTimes(1);
        expect(manager.activeMusicOscillators.size).toBe(0);
        expect(manager.musicPulseInterval).toBeNull();
        expect(manager.playingStageId).toBeNull();
    });
});
