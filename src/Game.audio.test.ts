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
            input: {
                initializeMobileControls: vi.fn(),
            },
            ui: {
                hideLoadingScreen: vi.fn(),
                showStartScreen: vi.fn(),
            },
            initializeEntities: vi.fn(),
            animate: vi.fn(),
        });

        (game as any).onInitialLoadComplete();

        expect(game.inputManager.initializeMobileControls).toHaveBeenCalledOnce();
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

        expect(game.currentScene).toBe(Lobby.getStageMetadata().id);
        expect(AudioManager.Instance.setStageMusic).toHaveBeenCalledWith(Lobby.getStageMetadata().id);
    });

    it.each([
        { label: 'A', mobileControls: { isMobile: true, isJumpPressed: true, isCancelPressed: false, isAttackPressed: false } },
        { label: 'B', mobileControls: { isMobile: true, isJumpPressed: false, isCancelPressed: true, isAttackPressed: false } },
        { label: 'X', mobileControls: { isMobile: true, isJumpPressed: false, isCancelPressed: false, isAttackPressed: true } },
    ])('treats mobile $label as valid start-screen advance input', ({ mobileControls }) => {
        const game = Object.create(Game.prototype) as Game;
        Object.assign(game, {
            input: {
                isStartPressed: vi.fn().mockReturnValue(false),
                mobileControls,
            },
        });

        expect((game as any).isStartScreenAdvancePressed()).toBe(true);
    });

    it('does not advance when no mobile face button is pressed', () => {
        const game = Object.create(Game.prototype) as Game;
        Object.assign(game, {
            input: {
                isStartPressed: vi.fn().mockReturnValue(false),
                mobileControls: {
                    isMobile: true,
                    isJumpPressed: false,
                    isCancelPressed: false,
                    isAttackPressed: false,
                },
            },
        });

        expect((game as any).isStartScreenAdvancePressed()).toBe(false);
    });

    it('prefers start button input even without mobile controls', () => {
        const game = Object.create(Game.prototype) as Game;
        Object.assign(game, {
            input: {
                isStartPressed: vi.fn().mockReturnValue(true),
                mobileControls: undefined,
            },
        });

        expect((game as any).isStartScreenAdvancePressed()).toBe(true);
    });
});
