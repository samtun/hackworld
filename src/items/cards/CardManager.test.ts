import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardManager } from './CardManager';
import { ViewMode } from './ViewMode';
import { AudioManager } from '../../AudioManager';
import { InputManager } from '../../controls/InputManager';
import { MenuManager } from '../../ui/MenuManager';
import { CardCollection } from './CardCollection';
import { UIManager } from '../../ui/UIManager';
import { mockDeep } from 'vitest-mock-extended';
import { Player } from '../../player/Player';

interface CardManagerTestOverrides {
    cardCollection?: CardCollection;
    menuManager?: MenuManager;
    uiManager?: UIManager;
    audioManager?: AudioManager;
    inputManager?: InputManager;
}

function makeCardManager(overrides: CardManagerTestOverrides = {}): CardManager {
    const {
        audioManager = mockDeep<AudioManager>(),
        menuManager = mockDeep<MenuManager>({
            createOverlay: () => document.createElement('div'),
            createGridWindow: () => document.createElement('div'),
            createPanel: () => document.createElement('div'),
            createFlexWindow: () => document.createElement('div'),
            createTitle: () => document.createElement('div'),
        }),
        uiManager = mockDeep<UIManager>(),
        inputManager = mockDeep<InputManager>(),
        cardCollection = mockDeep<CardCollection>(),
    } = overrides;

    const cardManager = new CardManager(cardCollection, menuManager, uiManager, audioManager, inputManager);

    return cardManager;
}

function makePlayer(overrides: Record<string, any> = {}): Player {
    return {
        boosterPacks: 0,
        ...overrides,
    } as any;
}

describe('CardManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('show()', () => {
        it('sets needsRender=true', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({ audioManager: audioManagerMock });
            cardManager.show();
            expect(cardManager.needsRender).toBe(true);
            expect(cardManager.isVisible).toBe(true);
            expect(audioManagerMock.playUiOpen).toHaveBeenCalledOnce();
        });

        it('is a no-op when already visible', () => {
            const cardManager = makeCardManager();
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            (cardManager as any).viewMode = ViewMode.VIEW_ALBUMS;
            cardManager.container.style.display = 'flex';
            cardManager.show();
            expect(cardManager.needsRender).toBe(false);
            expect((cardManager as any).viewMode).toBe(ViewMode.VIEW_ALBUMS); // viewMode not reset
            expect(cardManager.container.style.display).toBe('flex'); // display not changed
        });
    });

    describe('hide()', () => {
        it('plays the UI close sound when hidden from visible', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({ audioManager: audioManagerMock });
            cardManager.isVisible = true;
            cardManager.hide();
            expect(audioManagerMock.playUiClose).toHaveBeenCalledOnce();
        });
    });

    describe('update()', () => {
        it('returns immediately when not visible', () => {
            const cardManager = makeCardManager();
            cardManager.isVisible = false;
            cardManager.needsRender = false;
            const renderSpy = vi.spyOn(cardManager, 'render' as any);
            cardManager.update(makePlayer());
            expect(renderSpy).not.toHaveBeenCalled();
        });

        it('does not call render when no input is pressed and needsRender=false', () => {
            const cardManager = makeCardManager();
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            const renderSpy = vi.spyOn(cardManager, 'render' as any);
            cardManager.update(makePlayer());
            expect(renderSpy).not.toHaveBeenCalled();
        });

        it('calls render when needsRender=true even with no input', () => {
            const cardManager = makeCardManager();
            cardManager.isVisible = true;
            cardManager.needsRender = true;
            const renderSpy = vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            cardManager.update(makePlayer());
            expect(renderSpy).toHaveBeenCalledOnce();
        });

        it('sets needsRender=false after rendering', () => {
            const cardManager = makeCardManager();
            cardManager.isVisible = true;
            cardManager.needsRender = true;
            vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            cardManager.update(makePlayer());
            expect(cardManager.needsRender).toBe(false);
        });

        it('sets needsRender=true and calls render when navigateUp fires', () => {
            const inputManagerMock = mockDeep<InputManager>({
                isNavigateUpPressed: vi.fn().mockReturnValue(true),
            });
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({ inputManager: inputManagerMock, audioManager: audioManagerMock });
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            (cardManager as any).selectedMenuIndex = 1;
            const renderSpy = vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            cardManager.update(makePlayer());
            expect((cardManager as any).selectedMenuIndex).toBe(0);
            expect(renderSpy).toHaveBeenCalledOnce();
            expect(cardManager.needsRender).toBe(false);
            expect(audioManagerMock.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('sets needsRender=true and calls render when navigateDown fires', () => {
            const inputManagerMock = mockDeep<InputManager>({
                isNavigateDownPressed: vi.fn().mockReturnValue(true),
            });
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({ inputManager: inputManagerMock, audioManager: audioManagerMock });
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            (cardManager as any).selectedMenuIndex = 0;
            const renderSpy = vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            cardManager.update(makePlayer());
            expect((cardManager as any).selectedMenuIndex).toBe(1);
            expect(renderSpy).toHaveBeenCalledOnce();
            expect(audioManagerMock.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('sets needsRender=true and calls render when select fires', () => {
            const inputManagerMock = mockDeep<InputManager>({
                isSelectPressed: vi.fn().mockReturnValue(true),
            });
            const cardManager = makeCardManager({ inputManager: inputManagerMock });
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            const renderSpy = vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            cardManager.update(makePlayer({ boosterPacks: 0 }));
            expect(renderSpy).toHaveBeenCalledOnce();
        });

        it('sets needsRender=true and calls render when cancel fires', () => {
            const inputManagerMock = mockDeep<InputManager>({
                isCancelPressed: vi.fn().mockReturnValue(true),
            });
            const cardManager = makeCardManager({ inputManager: inputManagerMock });
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            const renderSpy = vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            cardManager.update(makePlayer());
            expect(renderSpy).toHaveBeenCalledOnce();
        });

        it('does not re-render on second frame when no input is held', () => {
            const cardManager = makeCardManager();
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            const renderSpy = vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            cardManager.update(makePlayer());
            cardManager.update(makePlayer());
            expect(renderSpy).not.toHaveBeenCalled();
        });

        it('only renders once per debounced button press (not on every held frame)', () => {
            const inputManagerMock = mockDeep<InputManager>({
                isNavigateDownPressed: vi.fn().mockReturnValue(true),
            });
            const cardManager = makeCardManager({ inputManager: inputManagerMock });
            cardManager.isVisible = true;
            cardManager.needsRender = false;
            const renderSpy = vi.spyOn(cardManager, 'render' as any).mockImplementation(() => { });
            // First frame: button pressed
            cardManager.update(makePlayer());
            // Second frame: button still held
            cardManager.update(makePlayer());
            expect(renderSpy).toHaveBeenCalledOnce();
        });
    });

    describe('selection and reveal audio', () => {
        it('plays the UI open sound when opening the album list', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({ audioManager: audioManagerMock });
            (cardManager as any).viewMode = ViewMode.MENU;
            (cardManager as any).selectedMenuIndex = 1;

            (cardManager as any).handleSelect(makePlayer());

            expect((cardManager as any).viewMode).toBe(ViewMode.VIEW_ALBUMS);
            expect(audioManagerMock.playUiOpen).toHaveBeenCalledOnce();
        });

        it('plays the UI close sound when backing out of an album list', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({ audioManager: audioManagerMock });
            (cardManager as any).viewMode = ViewMode.VIEW_ALBUMS;

            (cardManager as any).handleCancel();

            expect((cardManager as any).viewMode).toBe(ViewMode.MENU);
            expect(audioManagerMock.playUiClose).toHaveBeenCalledOnce();
        });

        it('plays rarity-specific reveal sounds for each flipped card', async () => {
            vi.useFakeTimers();
            const cardCollectionMock = mockDeep<CardCollection>({
                isAlbumComplete: vi.fn().mockReturnValue(false),
            });
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({ cardCollection: cardCollectionMock, audioManager: audioManagerMock });
            (cardManager as any).revealedCards = [
                { album: 'A.001', slot: 1, rarity: 'normal' },
                { album: 'A.001', slot: 2, rarity: 'special' },
            ];

            const promise = (cardManager as any).startCardFlipAnimation(makePlayer());
            await vi.runAllTimersAsync();
            await promise;

            expect(audioManagerMock.playCardReveal).toHaveBeenNthCalledWith(1, 'normal');
            expect(audioManagerMock.playCardReveal).toHaveBeenNthCalledWith(2, 'special');
            vi.useRealTimers();
        });

        it('plays the album completion sound when a pack finishes an album', async () => {
            vi.useFakeTimers();
            let completionChecks = 0;
            const cardCollectionMock = mockDeep<CardCollection>({
                isAlbumComplete: vi.fn().mockImplementation(() => {
                    completionChecks++;
                    return completionChecks > 1;
                }),
            });
            const uiManagerMock = mockDeep<UIManager>();
            const audioManagerMock = mockDeep<AudioManager>();
            const cardManager = makeCardManager({
                cardCollection: cardCollectionMock,
                uiManager: uiManagerMock,
                audioManager: audioManagerMock,
            });

            (cardManager as any).revealedCards = [
                { album: 'A.001', slot: 1, rarity: 'normal' },
            ];

            const promise = (cardManager as any).startCardFlipAnimation(makePlayer());
            await vi.runAllTimersAsync();
            await promise;

            expect(uiManagerMock.showAlbumCompleteBanner).toHaveBeenCalledOnce();
            expect(audioManagerMock.playAlbumComplete).toHaveBeenCalledOnce();
            vi.useRealTimers();
        });
    });
});
