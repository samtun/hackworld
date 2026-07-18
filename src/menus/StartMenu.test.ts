import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: {
            playMenuNavigate: vi.fn(),
        },
    },
}));

import { StartMenu } from './StartMenu';
import { AudioManager } from '../AudioManager';

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
});
