import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../InputManager', () => ({
    InputManager: {
        Instance: {
            isNavigateUpPressed: vi.fn().mockReturnValue(false),
            isNavigateDownPressed: vi.fn().mockReturnValue(false),
            isSelectPressed: vi.fn().mockReturnValue(false),
            isCancelPressed: vi.fn().mockReturnValue(false),
        }
    }
}));
vi.mock('../../ui/UiUtils', () => ({
    resetInputDebounce: vi.fn(),
}));
vi.mock('../../ui/InputHints', () => ({
    getHint: vi.fn().mockReturnValue(''),
    HintConfigs: { menuNavigate: 'menuNavigate' },
}));
vi.mock('../../ui/MenuManager', () => ({
    MenuManager: {
        Instance: {
            createOverlay: vi.fn(() => {
                const d = document.createElement('div');
                d.style.display = 'none';
                return d;
            }),
            createFlexWindow: vi.fn(() => document.createElement('div')),
            createTitle: vi.fn(() => document.createElement('div')),
        }
    },
    MENU_COLORS: {
        TEXT: '#fff', PANEL_BG: '#111', ITEM_SELECTED: '#888', SPECIAL: '#ff0',
        NORMAL: '#aaa', UNCOMMON: '#0f0', MISSING: '#333', CARD_BG: '#222',
    },
    MENU_STYLES: { FONT_FAMILY: 'Arial' },
}));
vi.mock('../../ui/UIManager', () => ({
    UIManager: {
        Instance: {
            showControlHints: vi.fn(),
            hideControlHints: vi.fn(),
            showAlbumCompleteBanner: vi.fn(),
        }
    }
}));
vi.mock('../../AudioManager', () => ({
    AudioManager: {
        Instance: {
            playMenuNavigate: vi.fn(),
            playUiOpen: vi.fn(),
            playUiClose: vi.fn(),
            playCardReveal: vi.fn(),
            playAlbumComplete: vi.fn(),
        },
    },
}));
vi.mock('./CardCollection', () => ({
    CardCollection: {
        Instance: {
            getTotalCollected: vi.fn().mockReturnValue(0),
            getTotalCards: vi.fn().mockReturnValue(72),
            getAlbumProgress: vi.fn().mockReturnValue({ collected: 0, total: 8 }),
            hasCard: vi.fn().mockReturnValue(false),
            addCard: vi.fn().mockReturnValue(true),
            isAlbumComplete: vi.fn().mockReturnValue(false),
        }
    }
}));
vi.mock('./Card', () => ({
    CardRarity: { NORMAL: 'normal', UNCOMMON: 'uncommon', SPECIAL: 'special' },
    Album: {
        A001: 'A.001', A002: 'A.002', A003: 'A.003',
        B001: 'B.001', B002: 'B.002', B003: 'B.003',
        C001: 'C.001', C002: 'C.002', C003: 'C.003',
    },
    CardDefinitions: {
        getAlbums: vi.fn().mockReturnValue(['A.001', 'A.002']),
        getAlbumCards: vi.fn().mockReturnValue([]),
        getRandomCard: vi.fn().mockReturnValue({ album: 'A.001', slot: 1, rarity: 'normal' }),
    },
}));
vi.mock('./ViewMode', () => ({
    ViewMode: { MENU: 'menu', OPEN_PACK: 'openPack', VIEW_ALBUMS: 'viewAlbums', VIEW_ALBUM: 'viewAlbum' },
}));

import { CardManager } from './CardManager';
import { ViewMode } from './ViewMode';
import { AudioManager } from '../../AudioManager';

function makeManager(overrides: Record<string, any> = {}): any {
    const mgr = Object.create((CardManager as any).prototype) as any;

    const container = document.createElement('div');
    container.style.display = 'none';
    const mainContent = document.createElement('div');
    const packCountDisplay = document.createElement('div');

    Object.assign(mgr, {
        isVisible: false,
        container,
        mainContent,
        packCountDisplay,
        viewMode: ViewMode.MENU,
        selectedMenuIndex: 0,
        selectedAlbumIndex: 0,
        currentAlbum: 'A.001',
        revealedCards: [],
        flippedCardIndices: new Set(),
        flippingInProgress: false,
        needsRender: false,
        lastNavigateUpState: false,
        lastNavigateDownState: false,
        lastSelectState: false,
        lastCancelState: false,
        currentInputManager: undefined,
        lightboxVisible: false,
        lightboxOverlay: document.createElement('div'),
        cardCollection: {
            getTotalCollected: vi.fn().mockReturnValue(0),
            getTotalCards: vi.fn().mockReturnValue(72),
            getAlbumProgress: vi.fn().mockReturnValue({ collected: 0, total: 8 }),
            hasCard: vi.fn().mockReturnValue(false),
            addCard: vi.fn().mockReturnValue(true),
            isAlbumComplete: vi.fn().mockReturnValue(false),
        },
        uiManager: {
            showControlHints: vi.fn(),
            hideControlHints: vi.fn(),
            showAlbumCompleteBanner: vi.fn(),
        },
        ...overrides,
    });

    return mgr;
}

function makeInput(overrides: Record<string, any> = {}): any {
    return {
        isNavigateUpPressed: vi.fn().mockReturnValue(false),
        isNavigateDownPressed: vi.fn().mockReturnValue(false),
        isSelectPressed: vi.fn().mockReturnValue(false),
        isCancelPressed: vi.fn().mockReturnValue(false),
        ...overrides,
    };
}

function makePlayer(overrides: Record<string, any> = {}): any {
    return {
        boosterPacks: 0,
        ...overrides,
    };
}

describe('CardManager', () => {
    let mgr: any;

    beforeEach(() => {
        mgr = makeManager();
        vi.clearAllMocks();
    });

    describe('show()', () => {
        it('sets needsRender=true', () => {
            mgr.show();
            expect(mgr.needsRender).toBe(true);
        });

        it('sets isVisible=true', () => {
            mgr.show();
            expect(mgr.isVisible).toBe(true);
        });

        it('plays the UI open sound when shown from hidden', () => {
            mgr.show();
            expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
        });

        it('is a no-op when already visible', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            mgr.viewMode = ViewMode.VIEW_ALBUMS;
            mgr.container.style.display = 'flex';
            mgr.show();
            expect(mgr.needsRender).toBe(false);
            expect(mgr.viewMode).toBe(ViewMode.VIEW_ALBUMS); // viewMode not reset
            expect(mgr.container.style.display).toBe('flex'); // display not changed
        });
    });

    describe('hide()', () => {
        it('plays the UI close sound when hidden from visible', () => {
            mgr.isVisible = true;
            mgr.hide();
            expect(AudioManager.Instance.playUiClose).toHaveBeenCalledOnce();
        });
    });

    describe('update()', () => {
        it('returns immediately when not visible', () => {
            mgr.isVisible = false;
            mgr.needsRender = false;
            const renderSpy = vi.spyOn(mgr, 'render' as any);
            mgr.update(makePlayer(), makeInput());
            expect(renderSpy).not.toHaveBeenCalled();
        });

        it('does not call render when no input is pressed and needsRender=false', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            const renderSpy = vi.spyOn(mgr, 'render' as any);
            mgr.update(makePlayer(), makeInput());
            expect(renderSpy).not.toHaveBeenCalled();
        });

        it('calls render when needsRender=true even with no input', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            const renderSpy = vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            mgr.update(makePlayer(), makeInput());
            expect(renderSpy).toHaveBeenCalledOnce();
        });

        it('sets needsRender=false after rendering', () => {
            mgr.isVisible = true;
            mgr.needsRender = true;
            vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            mgr.update(makePlayer(), makeInput());
            expect(mgr.needsRender).toBe(false);
        });

        it('sets needsRender=true and calls render when navigateUp fires', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            mgr.selectedMenuIndex = 1;
            const renderSpy = vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            const input = makeInput({ isNavigateUpPressed: vi.fn().mockReturnValue(true) });
            mgr.update(makePlayer(), input);
            expect(mgr.selectedMenuIndex).toBe(0);
            expect(renderSpy).toHaveBeenCalledOnce();
            expect(mgr.needsRender).toBe(false);
            expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('sets needsRender=true and calls render when navigateDown fires', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            mgr.selectedMenuIndex = 0;
            const renderSpy = vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            const input = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            mgr.update(makePlayer(), input);
            expect(mgr.selectedMenuIndex).toBe(1);
            expect(renderSpy).toHaveBeenCalledOnce();
            expect(AudioManager.Instance.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('sets needsRender=true and calls render when select fires', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            const renderSpy = vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            const input = makeInput({ isSelectPressed: vi.fn().mockReturnValue(true) });
            mgr.update(makePlayer({ boosterPacks: 0 }), input);
            expect(renderSpy).toHaveBeenCalledOnce();
        });

        it('sets needsRender=true and calls render when cancel fires', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            const renderSpy = vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            const input = makeInput({ isCancelPressed: vi.fn().mockReturnValue(true) });
            mgr.update(makePlayer(), input);
            expect(renderSpy).toHaveBeenCalledOnce();
        });

        it('does not re-render on second frame when no input is held', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            const renderSpy = vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            const input = makeInput();
            mgr.update(makePlayer(), input);
            mgr.update(makePlayer(), input);
            expect(renderSpy).not.toHaveBeenCalled();
        });

        it('only renders once per debounced button press (not on every held frame)', () => {
            mgr.isVisible = true;
            mgr.needsRender = false;
            const renderSpy = vi.spyOn(mgr, 'render' as any).mockImplementation(() => {});
            // First frame: button pressed
            const inputDown = makeInput({ isNavigateDownPressed: vi.fn().mockReturnValue(true) });
            mgr.update(makePlayer(), inputDown);
            // Second frame: button still held
            mgr.update(makePlayer(), inputDown);
            expect(renderSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('selection and reveal audio', () => {
        it('plays the UI open sound when opening the album list', () => {
            mgr.viewMode = ViewMode.MENU;
            mgr.selectedMenuIndex = 1;

            (mgr as any).handleSelect(makePlayer());

            expect(mgr.viewMode).toBe(ViewMode.VIEW_ALBUMS);
            expect(AudioManager.Instance.playUiOpen).toHaveBeenCalledOnce();
        });

        it('plays the UI close sound when backing out of an album list', () => {
            mgr.viewMode = ViewMode.VIEW_ALBUMS;

            (mgr as any).handleCancel();

            expect(mgr.viewMode).toBe(ViewMode.MENU);
            expect(AudioManager.Instance.playUiClose).toHaveBeenCalledOnce();
        });

        it('plays rarity-specific reveal sounds for each flipped card', async () => {
            vi.useFakeTimers();
            mgr.revealedCards = [
                { album: 'A.001', slot: 1, rarity: 'normal' },
                { album: 'A.001', slot: 2, rarity: 'special' },
            ];
            mgr.render = vi.fn();
            mgr.cardCollection.isAlbumComplete = vi.fn().mockReturnValue(false);

            const promise = (mgr as any).startCardFlipAnimation(makePlayer());
            await vi.runAllTimersAsync();
            await promise;

            expect(AudioManager.Instance.playCardReveal).toHaveBeenNthCalledWith(1, 'normal');
            expect(AudioManager.Instance.playCardReveal).toHaveBeenNthCalledWith(2, 'special');
            vi.useRealTimers();
        });

        it('plays the album completion sound when a pack finishes an album', async () => {
            vi.useFakeTimers();
            mgr.revealedCards = [
                { album: 'A.001', slot: 1, rarity: 'normal' },
            ];
            mgr.render = vi.fn();
            let completionChecks = 0;
            mgr.cardCollection.isAlbumComplete = vi.fn().mockImplementation(() => {
                completionChecks++;
                return completionChecks > 1;
            });

            const promise = (mgr as any).startCardFlipAnimation(makePlayer());
            await vi.runAllTimersAsync();
            await promise;

            expect(mgr.uiManager.showAlbumCompleteBanner).toHaveBeenCalledOnce();
            expect(AudioManager.Instance.playAlbumComplete).toHaveBeenCalledOnce();
            vi.useRealTimers();
        });
    });
});
