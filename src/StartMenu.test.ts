import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: {
            playMenuNavigate: vi.fn(),
            playUiOpen: vi.fn(),
            isMusicEnabled: vi.fn().mockReturnValue(true),
            isSfxEnabled: vi.fn().mockReturnValue(true),
            toggleMusicEnabled: vi.fn(),
            setSfxEnabled: vi.fn(),
        },
    },
}));

import { StartMenu } from './StartMenu';
import { AudioManager } from './AudioManager';

function makeInput() {
    return {
        isNavigateUpPressed: vi.fn().mockReturnValue(false),
        isNavigateDownPressed: vi.fn().mockReturnValue(false),
        isSelectPressed: vi.fn().mockReturnValue(false),
    } as any;
}

describe('StartMenu', () => {
    let container: HTMLDivElement;
    let menu: StartMenu;

    beforeEach(() => {
        vi.clearAllMocks();
        container = document.createElement('div');
        document.body.appendChild(container);
        menu = new StartMenu(container, makeInput(), true, vi.fn());
    });

    afterEach(() => {
        menu.destroy();
        container.remove();
    });

    it('plays the navigation sound when moving between start menu options', () => {
        (menu as any).navigate(1);
        expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
    });

    it('toggles the music option and updates the label', () => {
        (AudioManager.Instance.toggleMusicEnabled as any).mockImplementation(() => {
            (AudioManager.Instance.isMusicEnabled as any).mockReturnValue(false);
            return false;
        });
        (menu as any).selectedIndex = 3;

        (menu as any).confirm();

        expect(AudioManager.Instance.toggleMusicEnabled).toHaveBeenCalledOnce();
        expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
        expect((menu as any).itemEls[3].textContent).toBe('Music off');
    });

    it('toggles sound effects on from the main menu option', () => {
        (AudioManager.Instance.isSfxEnabled as any).mockReturnValue(false);
        (AudioManager.Instance.setSfxEnabled as any).mockImplementation(() => {
            (AudioManager.Instance.isSfxEnabled as any).mockReturnValue(true);
        });
        (menu as any).selectedIndex = 4;

        (menu as any).confirm();

        expect(AudioManager.Instance.setSfxEnabled).toHaveBeenCalledWith(true);
        expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
        expect((menu as any).itemEls[4].textContent).toBe('Sound Effects on');
    });
});
