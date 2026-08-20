import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { StartMenu } from './StartMenu';
import { AudioManager } from '../AudioManager';
import { mock } from 'vitest-mock-extended';
import { InputManager } from '../controls/InputManager';

describe('StartMenu', () => {
    beforeEach(() => {
        // 1. Fake timers to test requestAnimationFrame
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('plays the navigation sound when moving between start menu options', () => {
        const audioManager = mock<AudioManager>();
        const inputManager = mock<InputManager>();
        inputManager.isNavigateDownPressed.mockReturnValue(true);
        new StartMenu(inputManager, audioManager, document.createElement('div'), false, vi.fn());

        // Start animation loop and progress 1 frame
        requestAnimationFrame(vi.fn());
        vi.advanceTimersByTime(16);

        expect(audioManager.playMenuNavigate).toHaveBeenCalledOnce();
    });
});
