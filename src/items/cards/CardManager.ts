import { Player } from '../../Player';
import { InputManager } from '../../InputManager';
import { resetInputDebounce } from '../../ui/UiUtils';
import { Card, CardDefinitions, CardRarity, Album } from './Card';
import { CardCollection } from './CardCollection';
import { ViewMode } from './ViewMode';
import { getHint, HintConfigs } from '../../ui/InputHints';
import { MenuManager, MENU_COLORS, MENU_STYLES } from '../../ui/MenuManager';
import { UIManager } from '../../ui/UIManager';

export class CardManager {
    private static instance: CardManager;

    container!: HTMLDivElement;
    isVisible: boolean = false;

    // UI Elements
    private mainContent!: HTMLDivElement;
    private packCountDisplay!: HTMLDivElement;
    private lightboxOverlay!: HTMLDivElement;

    // Navigation state
    private viewMode: ViewMode = ViewMode.MENU;
    private selectedMenuIndex: number = 0;
    private selectedAlbumIndex: number = 0;
    private currentAlbum: Album = Album.A001;
    private revealedCards: Card[] = [];
    private flippedCardIndices: Set<number> = new Set(); // Track which cards have been flipped
    private flippingInProgress: boolean = false; // Track if flip animation is in progress

    // Lightbox state
    private lightboxVisible: boolean = false;
    private lightboxCards: Card[] = [];
    private lightboxIndex: number = 0;
    // Render dirty flag
    needsRender: boolean = false;

    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastNavigateLeftState: boolean = false;
    private lastNavigateRightState: boolean = false;
    private lastSelectState: boolean = false;
    private lastCancelState: boolean = false;

    private cardCollection: CardCollection;
    private currentInputManager?: InputManager; // Store input manager for dynamic hints
    private menuManager: MenuManager;
    private uiManager: UIManager;

    private constructor() {
        this.cardCollection = CardCollection.Instance;
        this.menuManager = MenuManager.Instance;
        this.uiManager = UIManager.Instance;
        this.createUI();
    }

    public static get Instance(): CardManager {
        return this.instance || (this.instance = new this());
    }

    private createUI() {
        // Main Container Overlay
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        // Main Window
        const windowDiv = this.menuManager.createFlexWindow('column', {
            maxWidth: '800px',
            width: '90%',
        });
        this.container.appendChild(windowDiv);

        // Title
        const titleDiv = this.menuManager.createTitle('CARD COLLECTION', MENU_COLORS.SPECIAL);
        windowDiv.appendChild(titleDiv);

        // Pack count display
        this.packCountDisplay = document.createElement('div');
        Object.assign(this.packCountDisplay.style, {
            textAlign: 'center',
            fontSize: '18px',
            color: MENU_COLORS.TEXT,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            marginBottom: '15px'
        });
        windowDiv.appendChild(this.packCountDisplay);

        // Main content area
        this.mainContent = document.createElement('div');
        Object.assign(this.mainContent.style, {
            flex: '1',
            overflowY: 'auto',
            overflowX: 'hidden', // prevent horizontal scrollbar from hover scale at right edge
            fontFamily: MENU_STYLES.FONT_FAMILY
        });
        windowDiv.appendChild(this.mainContent);

        // CSS for card hover scale effect
        const cardHoverStyle = document.createElement('style');
        cardHoverStyle.textContent = `
            .card-hoverable {
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            .card-hoverable:hover {
                transform: scale(1.1);
                z-index: 10;
                position: relative;
            }
        `;
        document.head.appendChild(cardHoverStyle);

        // Lightbox overlay — rendered above the card manager (z-index 1200)
        this.lightboxOverlay = document.createElement('div');
        Object.assign(this.lightboxOverlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1200',
            flexDirection: 'column',
        });
        document.body.appendChild(this.lightboxOverlay);
    }

    private getRarityColor(rarity: CardRarity): string {
        switch (rarity) {
            case CardRarity.NORMAL:
                return MENU_COLORS.NORMAL;
            case CardRarity.UNCOMMON:
                return MENU_COLORS.UNCOMMON;
            case CardRarity.SPECIAL:
                return MENU_COLORS.SPECIAL;
        }
    }

    /**
     * Returns the expected image path for a card.
     * Convention: images/cards/{album}/{album}.{slot}.png
     * The image may or may not exist; the browser will silently ignore a missing background-image.
     * Inputs are derived from controlled enum values and integer slot numbers, so no sanitization is required.
     */
    public static getCardImagePath(card: Card): string {
        return `images/cards/${card.album}/${card.album}.${card.slot}.png`;
    }

    /**
     * Returns CSS properties that apply the card's image as a cover background.
     * Used consistently across both the pack-opening view and the album detail view.
     */
    private static getCardImageStyles(card: Card): Partial<CSSStyleDeclaration> {
        return {
            backgroundImage: `url(${CardManager.getCardImagePath(card)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        };
    }

    private renderMenu(player: Player) {
        this.mainContent.innerHTML = '';

        const menuItems = [
            { label: 'Open Booster Pack', enabled: player.boosterPacks > 0 },
            { label: 'View Albums', enabled: true }
        ];

        menuItems.forEach((item, index) => {
            const menuItem = document.createElement('div');
            menuItem.innerText = item.label;
            Object.assign(menuItem.style, {
                padding: '15px',
                margin: '5px 0',
                backgroundColor: this.selectedMenuIndex === index ? MENU_COLORS.ITEM_SELECTED : MENU_COLORS.PANEL_BG,
                color: item.enabled ? MENU_COLORS.TEXT : '#666',
                fontSize: '20px',
                borderRadius: '5px',
                cursor: item.enabled ? 'pointer' : 'not-allowed',
                textAlign: 'center'
            });
            this.mainContent.appendChild(menuItem);
        });

        // Show collection progress
        const progressDiv = document.createElement('div');
        const collected = this.cardCollection.getTotalCollected();
        const total = this.cardCollection.getTotalCards();
        progressDiv.innerHTML = `<br><strong>Collection Progress:</strong> ${collected} / ${total} cards`;
        Object.assign(progressDiv.style, {
            textAlign: 'center',
            fontSize: '16px',
            color: MENU_COLORS.TEXT,
            marginTop: '20px'
        });
        this.mainContent.appendChild(progressDiv);
    }

    private renderOpenPack() {
        const containerId = 'pack-cards-container';
        let cardsContainer = document.getElementById(containerId) as HTMLDivElement;

        if (!cardsContainer) {
            this.mainContent.innerHTML = '';

            // Title
            const titleDiv = document.createElement('div');
            titleDiv.innerText = 'Pack Contents';
            Object.assign(titleDiv.style, {
                textAlign: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                color: MENU_COLORS.TEXT,
                marginBottom: '20px'
            });
            this.mainContent.appendChild(titleDiv);

            // Container for all cards in a single row
            cardsContainer = document.createElement('div');
            cardsContainer.id = containerId;
            Object.assign(cardsContainer.style, {
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                marginBottom: '20px',
                flexWrap: 'nowrap' // Keep all cards in a single row
            });

            // Display all 4 cards
            this.revealedCards.forEach((card, cardIndex) => {
                // Outer container for 3D perspective
                const cardContainer = document.createElement('div');
                Object.assign(cardContainer.style, {
                    perspective: '1000px',
                    width: '150px',
                    aspectRatio: '360 / 539',
                    flexShrink: '0',
                });
                cardContainer.addEventListener('click', () => {
                    if (this.flippedCardIndices.has(cardIndex)) {
                        this.openLightbox(this.revealedCards, cardIndex);
                    }
                });

                // Inner flipper element
                const cardFlipper = document.createElement('div');
                cardFlipper.className = 'card-flipper';
                Object.assign(cardFlipper.style, {
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transition: 'transform 0.6s',
                    transformStyle: 'preserve-3d',
                    transform: 'rotateY(0deg)'
                });

                // Card back (face down)
                const cardBack = document.createElement('div');
                Object.assign(cardBack.style, {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    padding: '20px',
                    backgroundColor: MENU_COLORS.CARD_BG,
                    border: '3px solid #666',
                    borderRadius: '10px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    backfaceVisibility: 'hidden',
                    boxSizing: 'border-box'
                });

                const backText = document.createElement('div');
                backText.innerText = '?';
                Object.assign(backText.style, {
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#666'
                });
                cardBack.appendChild(backText);

                // Card front (face up) — image only, no text labels
                const cardFront = document.createElement('div');
                Object.assign(cardFront.style, {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: MENU_COLORS.CARD_BG,
                    ...CardManager.getCardImageStyles(card),
                    border: `3px solid ${this.getRarityColor(card.rarity)}`,
                    borderRadius: '10px',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxSizing: 'border-box'
                });

                // Assemble the card structure
                cardFlipper.appendChild(cardBack);
                cardFlipper.appendChild(cardFront);
                cardContainer.appendChild(cardFlipper);
                cardsContainer.appendChild(cardContainer);
            });

            this.mainContent.appendChild(cardsContainer);

            // Instructions
            const instructionsText = document.createElement('div');
            instructionsText.id = 'pack-instructions';
            Object.assign(instructionsText.style, {
                textAlign: 'center',
                fontSize: '16px',
                color: MENU_COLORS.SEPARATOR,
                marginTop: '10px'
            });
            this.mainContent.appendChild(instructionsText);
        }

        // Update transforms for existing cards and hover class (only on revealed cards)
        const flippers = cardsContainer.querySelectorAll('.card-flipper');
        flippers.forEach((flipper, index) => {
            const isFlipped = this.flippedCardIndices.has(index);
            (flipper as HTMLElement).style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
            const container = flipper.parentElement;
            if (container) {
                if (isFlipped) {
                    container.classList.add('card-hoverable');
                } else {
                    container.classList.remove('card-hoverable');
                }
            }
        });

        // Update instructions text
        const instructionsText = document.getElementById('pack-instructions');
        if (instructionsText && this.currentInputManager) {
            const allFlipped = this.flippedCardIndices.size === this.revealedCards.length;
            if (this.flippingInProgress) {
                instructionsText.innerText = 'Revealing cards...';
            } else if (allFlipped) {
                instructionsText.innerHTML = getHint(HintConfigs.continuePack, this.currentInputManager);
            } else {
                instructionsText.innerHTML = getHint(HintConfigs.revealContinue, this.currentInputManager);
            }
        }
    }

    private renderAlbumList() {
        this.mainContent.innerHTML = '';

        const albums = CardDefinitions.getAlbums();
        albums.forEach((album, index) => {
            const progress = this.cardCollection.getAlbumProgress(album);

            const albumDiv = document.createElement('div');
            albumDiv.innerHTML = `<strong>${album}</strong> - ${progress.collected} / ${progress.total}`;
            Object.assign(albumDiv.style, {
                padding: '15px',
                margin: '5px 0',
                backgroundColor: this.selectedAlbumIndex === index ? MENU_COLORS.ITEM_SELECTED : MENU_COLORS.PANEL_BG,
                color: MENU_COLORS.TEXT,
                fontSize: '18px',
                borderRadius: '5px',
                cursor: 'pointer'
            });
            this.mainContent.appendChild(albumDiv);
        });
    }

    private renderAlbumDetail() {
        this.mainContent.innerHTML = '';

        const titleDiv = document.createElement('div');
        titleDiv.innerText = `Album: ${this.currentAlbum}`;
        Object.assign(titleDiv.style, {
            fontSize: '24px',
            fontWeight: 'bold',
            color: MENU_COLORS.TEXT,
            textAlign: 'center',
            marginBottom: '20px'
        });
        this.mainContent.appendChild(titleDiv);

        const cards = CardDefinitions.getAlbumCards(this.currentAlbum);
        const collectedCards = cards.filter(c => this.cardCollection.hasCard(c));
        // Pre-compute lightbox index for each collected card to avoid O(n²) indexOf in the loop
        const collectedIndexMap = new Map<Card, number>(collectedCards.map((c, i) => [c, i]));
        const gridDiv = document.createElement('div');
        Object.assign(gridDiv.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            padding: '12px', // buffer so right-edge cards scaled 10% stay within the clipping boundary
        });

        cards.forEach(card => {
            const collected = this.cardCollection.hasCard(card);
            const cardDiv = document.createElement('div');
            if (collected) {
                cardDiv.className = 'card-hoverable';
                const lightboxIdx = collectedIndexMap.get(card) ?? 0;
                cardDiv.addEventListener('click', () => {
                    this.openLightbox(collectedCards, lightboxIdx);
                });
            }
            Object.assign(cardDiv.style, {
                boxSizing: 'border-box',
                aspectRatio: '360 / 539',
                backgroundColor: MENU_COLORS.MISSING,
                ...(collected && CardManager.getCardImageStyles(card)),
                border: `2px solid ${this.getRarityColor(card.rarity)}`,
                borderRadius: '5px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
            });

            if (!collected) {
                // Show "?" in the center of uncollected cards
                const questionMark = document.createElement('div');
                questionMark.innerText = '?';
                Object.assign(questionMark.style, {
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#666',
                });
                cardDiv.appendChild(questionMark);
            }

            gridDiv.appendChild(cardDiv);
        });

        this.mainContent.appendChild(gridDiv);

        // Reward description section
        const rewardDiv = this.createRewardDescriptionDiv(this.currentAlbum);
        this.mainContent.appendChild(rewardDiv);
    }

    /**
     * Collection reward descriptions keyed by album.
     * These are the plain-text strings that are revealed as cards are collected.
     */
    private static readonly ALBUM_REWARDS: Record<Album, string> = {
        [Album.A001]: 'Improve buy/sell prices of chips  by 5%',
        [Album.A002]: 'Improve buy/sell prices of cores  by 5%',
        [Album.A003]: 'Improve weapon buy/sell prices by 8% and raise higher tier weapon spawn rate for traders stock by 5%',
        [Album.B001]: 'Raise item drop chance by 2%',
        [Album.B002]: 'Raise item drop chance by 3% and improve weapon drop quality by 2%',
        [Album.B003]: 'Raise item drop chance by 5% and improve weapon drop quality by 5%',
        [Album.C001]: 'Raise chance for high value XData drops by 5%',
        [Album.C002]: 'Reduce all skill cooldowns by 10%',
        [Album.C003]: 'Raise maximum dropped weapon damage bonus ceiling by 10%',
    };

    /**
     * Returns the plain-text reward description for a completed album.
     * @param album - the album identifier
     */
    public static getAlbumReward(album: Album): string {
        return CardManager.ALBUM_REWARDS[album] ?? '';
    }

    /**
     * Builds a partially-revealed reward description div.
     * The fraction of characters revealed equals (collected / total).
     * When the album is complete the description is shown in full.
     * Hidden characters are replaced with ▓ to avoid flickering from randomisation.
     */
    private createRewardDescriptionDiv(album: Album): HTMLDivElement {
        const rewardDiv = document.createElement('div');
        Object.assign(rewardDiv.style, {
            marginTop: '20px',
            padding: '12px',
            backgroundColor: MENU_COLORS.PANEL_BG,
            borderRadius: '5px',
            border: `1px solid ${MENU_COLORS.SEPARATOR}`,
            fontFamily: 'monospace',
            fontSize: '14px',
            letterSpacing: '0.5px'
        });

        const label = document.createElement('div');
        label.innerText = 'COLLECTION BONUS';
        Object.assign(label.style, {
            fontSize: '12px',
            color: MENU_COLORS.SEPARATOR,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
        });
        rewardDiv.appendChild(label);

        const progress = this.cardCollection.getAlbumProgress(album);
        const plainText = CardManager.ALBUM_REWARDS[album] ?? '';
        const isComplete = progress.total > 0 && progress.collected === progress.total;

        const revealFraction = progress.total > 0 ? progress.collected / progress.total : 0;
        const revealedCount = Math.floor(revealFraction * plainText.length);

        const textSpan = document.createElement('span');
        if (isComplete) {
            textSpan.innerText = plainText;
            Object.assign(textSpan.style, { color: MENU_COLORS.COLLECTED });
        } else {
            let obfuscated = '';
            for (let i = 0; i < plainText.length; i++) {
                if (i < revealedCount) {
                    obfuscated += plainText[i];
                } else if (plainText[i] === ' ') {
                    obfuscated += ' ';
                } else {
                    obfuscated += '▓';
                }
            }
            textSpan.innerText = obfuscated;
            Object.assign(textSpan.style, { color: MENU_COLORS.TEXT });
        }

        rewardDiv.appendChild(textSpan);
        return rewardDiv;
    }

    public show() {
        if (this.isVisible) return;
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.viewMode = ViewMode.MENU;
        this.selectedMenuIndex = 0;
        this.needsRender = true;
        resetInputDebounce(this as any);
    }

    public hide() {
        if (!this.isVisible) return;
        this.isVisible = false;
        this.container.style.display = 'none';
        this.closeLightbox();
        this.uiManager.hideControlHints();
        resetInputDebounce(this as any);
    }

    private render(player: Player) {
        // Show pack count only on the main menu and pack reveal views
        const showPackCount = this.viewMode === ViewMode.MENU || this.viewMode === ViewMode.OPEN_PACK;
        this.packCountDisplay.style.display = showPackCount ? '' : 'none';
        if (showPackCount) {
            this.packCountDisplay.innerText = `Booster Packs: ${player.boosterPacks}`;
        }

        switch (this.viewMode) {
            case ViewMode.MENU:
                this.renderMenu(player);
                break;
            case ViewMode.OPEN_PACK:
                this.renderOpenPack();
                break;
            case ViewMode.VIEW_ALBUMS:
                this.renderAlbumList();
                break;
            case ViewMode.VIEW_ALBUM:
                this.renderAlbumDetail();
                break;
        }
    }

    public update(player: Player, input: InputManager) {
        if (!this.isVisible) return;

        // Store input manager for dynamic hints
        this.currentInputManager = input;

        // Lightbox input handling takes priority over all other navigation
        if (this.lightboxVisible) {
            const navLeft = input.isNavigateLeftPressed();
            const navRight = input.isNavigateRightPressed();
            const cancel = input.isCancelPressed();

            if (navLeft && !this.lastNavigateLeftState) {
                this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxCards.length) % this.lightboxCards.length;
                this.renderLightbox();
            }
            this.lastNavigateLeftState = navLeft;

            if (navRight && !this.lastNavigateRightState) {
                this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxCards.length;
                this.renderLightbox();
            }
            this.lastNavigateRightState = navRight;

            if (cancel && !this.lastCancelState) {
                this.closeLightbox();
            }
            this.lastCancelState = cancel;
            return;
        }

        // Update centralized control hints based on input method
        this.uiManager.showControlHints(getHint(HintConfigs.menuNavigate, input));

        const navigateUp = input.isNavigateUpPressed();
        const navigateDown = input.isNavigateDownPressed();
        const select = input.isSelectPressed();
        const cancel = input.isCancelPressed();

        // Debounced navigation
        if (navigateUp && !this.lastNavigateUpState) {
            this.handleNavigateUp();
            this.needsRender = true;
        }
        this.lastNavigateUpState = navigateUp;

        if (navigateDown && !this.lastNavigateDownState) {
            this.handleNavigateDown();
            this.needsRender = true;
        }
        this.lastNavigateDownState = navigateDown;

        if (select && !this.lastSelectState) {
            this.handleSelect(player);
            this.needsRender = true;
        }
        this.lastSelectState = select;

        if (cancel && !this.lastCancelState) {
            this.handleCancel();
            this.needsRender = true;
        }
        this.lastCancelState = cancel;

        // Only re-render if needed
        if (this.needsRender) {
            this.render(player);
            this.needsRender = false;
        }
    }

    private handleNavigateUp() {
        if (this.viewMode === ViewMode.MENU) {
            this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
        } else if (this.viewMode === ViewMode.VIEW_ALBUMS) {
            this.selectedAlbumIndex = Math.max(0, this.selectedAlbumIndex - 1);
        }
    }

    private handleNavigateDown() {
        if (this.viewMode === ViewMode.MENU) {
            this.selectedMenuIndex = Math.min(1, this.selectedMenuIndex + 1);
        } else if (this.viewMode === ViewMode.VIEW_ALBUMS) {
            const maxIndex = CardDefinitions.getAlbums().length - 1;
            this.selectedAlbumIndex = Math.min(maxIndex, this.selectedAlbumIndex + 1);
        }
    }

    private handleSelect(player: Player) {
        if (this.viewMode === ViewMode.MENU) {
            if (this.selectedMenuIndex === 0 && player.boosterPacks > 0) {
                // Open pack - generate 4 random cards
                player.boosterPacks -= 1;
                this.revealedCards = [];
                for (let i = 0; i < 4; i++) {
                    this.revealedCards.push(CardDefinitions.getRandomCard());
                }
                this.flippedCardIndices.clear();
                this.flippingInProgress = false;
                this.viewMode = ViewMode.OPEN_PACK;

                // Start flipping immediately
                this.startCardFlipAnimation(player);
            } else if (this.selectedMenuIndex === 1) {
                // View albums
                this.viewMode = ViewMode.VIEW_ALBUMS;
                this.selectedAlbumIndex = 0;
            }
        } else if (this.viewMode === ViewMode.OPEN_PACK) {
            const allFlipped = this.flippedCardIndices.size === this.revealedCards.length;
            if (allFlipped && !this.flippingInProgress) {
                // Return to menu after all cards are flipped
                this.viewMode = ViewMode.MENU;
            }
        } else if (this.viewMode === ViewMode.VIEW_ALBUMS) {
            // Open specific album
            const albums = CardDefinitions.getAlbums();
            this.currentAlbum = albums[this.selectedAlbumIndex];
            this.viewMode = ViewMode.VIEW_ALBUM;
        }
    }

    private async startCardFlipAnimation(player: Player) {
        this.flippingInProgress = true;
        this.render(player);

        // Record which albums were already complete before adding new cards
        const albums = CardDefinitions.getAlbums();
        const alreadyComplete = new Set(albums.filter(a => this.cardCollection.isAlbumComplete(a)));

        // Add cards to collection before flipping
        this.revealedCards.forEach(card => {
            this.cardCollection.addCard(card);
        });

        // Show a banner for each album that just became complete
        for (const album of albums) {
            if (!alreadyComplete.has(album) && this.cardCollection.isAlbumComplete(album)) {
                const reward = CardManager.ALBUM_REWARDS[album] ?? '';
                this.uiManager.showAlbumCompleteBanner(album, reward);
            }
        }

        // Flip cards one by one with a delay
        for (let i = 0; i < this.revealedCards.length; i++) {
            // Wait 400ms between each card flip
            await new Promise(resolve => setTimeout(resolve, 400));
            this.flippedCardIndices.add(i);
            // Re-render to show the flipped state
            this.render(player);
        }

        this.flippingInProgress = false;
        this.render(player);
    }

    private handleCancel() {
        if (this.viewMode === ViewMode.MENU) {
            this.hide();
        } else if (this.viewMode === ViewMode.OPEN_PACK) {
            // Allow canceling after all cards are flipped
            const allFlipped = this.flippedCardIndices.size === this.revealedCards.length;
            if (allFlipped && !this.flippingInProgress) {
                this.viewMode = ViewMode.MENU;
            }
        } else if (this.viewMode === ViewMode.VIEW_ALBUMS) {
            this.viewMode = ViewMode.MENU;
        } else if (this.viewMode === ViewMode.VIEW_ALBUM) {
            this.viewMode = ViewMode.VIEW_ALBUMS;
        }
    }

    private openLightbox(cards: Card[], index: number): void {
        this.lightboxCards = cards;
        this.lightboxIndex = index;
        this.lightboxVisible = true;
        this.lightboxOverlay.style.display = 'flex';
        resetInputDebounce(this as any);
        this.renderLightbox();
    }

    private closeLightbox(): void {
        this.lightboxVisible = false;
        this.lightboxOverlay.style.display = 'none';
        resetInputDebounce(this as any);
    }

    private renderLightbox(): void {
        this.lightboxOverlay.innerHTML = '';
        const card = this.lightboxCards[this.lightboxIndex];
        if (!card) return;

        // Full card image without the dark overlay used in thumbnails — the lightbox is
        // the focus view so the image should be shown at full fidelity.
        const imgDiv = document.createElement('div');
        Object.assign(imgDiv.style, {
            width: '300px',
            aspectRatio: '360 / 539',
            backgroundImage: `url(${CardManager.getCardImagePath(card)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            border: `3px solid ${this.getRarityColor(card.rarity)}`,
            boxShadow: '0 0 40px rgba(0,0,0,0.8)',
        });
        this.lightboxOverlay.appendChild(imgDiv);

        // Card info below the image
        const infoDiv = document.createElement('div');
        Object.assign(infoDiv.style, {
            marginTop: '16px',
            textAlign: 'center',
            fontFamily: MENU_STYLES.FONT_FAMILY,
        });
        const albumLabel = document.createElement('div');
        albumLabel.innerText = `${card.album} #${card.slot}`;
        Object.assign(albumLabel.style, {
            fontSize: '20px',
            fontWeight: 'bold',
            color: this.getRarityColor(card.rarity),
        });
        const rarityLabel = document.createElement('div');
        rarityLabel.innerText = card.rarity.toUpperCase();
        Object.assign(rarityLabel.style, {
            fontSize: '14px',
            color: this.getRarityColor(card.rarity),
            marginTop: '4px',
        });
        infoDiv.appendChild(albumLabel);
        infoDiv.appendChild(rarityLabel);
        this.lightboxOverlay.appendChild(infoDiv);

        // Navigation hint
        const hintDiv = document.createElement('div');
        Object.assign(hintDiv.style, {
            marginTop: '16px',
            fontSize: '14px',
            color: MENU_COLORS.SEPARATOR,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            textAlign: 'center',
        });
        const posInfo = this.lightboxCards.length > 1
            ? `${this.lightboxIndex + 1} / ${this.lightboxCards.length} &nbsp;&nbsp;`
            : '';
        if (this.currentInputManager) {
            hintDiv.innerHTML = posInfo + getHint({
                keyboard: '<span class="key-icon">←</span> <span class="key-icon">→</span> Navigate &nbsp; <span class="key-icon">ESC</span> Close',
                controller: '<span class="btn-icon">◄</span> <span class="btn-icon">►</span> Navigate &nbsp; <span class="btn-icon xbox-b">B</span> Close',
            }, this.currentInputManager);
        }
        this.lightboxOverlay.appendChild(hintDiv);
    }
}
