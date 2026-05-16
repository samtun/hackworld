import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: {
            setStageMusic: vi.fn(),
        },
    },
}));

import { Game } from './Game';
import { Lobby } from './stages';
import { AudioManager } from './AudioManager';

describe('Game audio scene flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('switches to start screen music when the initial load completes', () => {
        const game = Object.create(Game.prototype) as Game;
        Object.assign(game, {
            ui: {
                hideLoadingScreen: vi.fn(),
                showStartScreen: vi.fn(),
            },
            initializeEntities: vi.fn(),
            animate: vi.fn(),
        });

        (game as any).onInitialLoadComplete();

        expect(AudioManager.Instance.setStageMusic).toHaveBeenCalledWith('startScreen');
    });

    it('switches to lobby music after the intro ends', () => {
        const game = Object.create(Game.prototype) as Game;
        Object.assign(game, {
            currentScene: 'lore',
            isTransitioning: true,
            input: {
                initializeMobileControls: vi.fn(),
                consumeJump: vi.fn(),
            },
            clock: {
                getDelta: vi.fn(),
            },
        });

        (game as any).continueAfterIntro();

        expect(game.currentScene).toBe(Lobby.getMetadata().id);
        expect(AudioManager.Instance.setStageMusic).toHaveBeenCalledWith(Lobby.getMetadata().id);
    });
});
