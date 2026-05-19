import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('audio unlock handlers', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', {
            getItem: vi.fn().mockReturnValue(null),
            setItem: vi.fn(),
        });
    });

    it('still unlocks audio when the start-screen touch event stops propagation', () => {
        const manager = Object.create((AudioManager as any).prototype) as any;
        Object.assign(manager, {
            unlockHandlersRegistered: false,
            unlock: vi.fn(),
        });

        manager.registerUnlockHandlers();

        const startScreen = document.createElement('div');
        startScreen.addEventListener('touchstart', (event) => {
            event.stopPropagation();
        });
        document.body.appendChild(startScreen);

        startScreen.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true }));

        expect(manager.unlock).toHaveBeenCalledOnce();

        startScreen.remove();
    });
});
