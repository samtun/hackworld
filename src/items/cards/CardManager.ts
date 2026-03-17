import { Player } from '../../Player';
import { InputManager } from '../../InputManager';
import { resetInputDebounce } from '../../ui/UiUtils';
import { Card, CardDefinitions, CardRarity } from './Card';
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

    // Navigation state
    private viewMode: ViewMode = ViewMode.MENU;
    private selectedMenuIndex: number = 0;
    private selectedAlbumIndex: number = 0;
    private currentAlbum: string = '';
    private revealedCards: Card[] = [];
    private flippedCardIndices: Set<number> = new Set(); // Track which cards have been flipped
    private flippingInProgress: boolean = false; // Track if flip animation is in progress

    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
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
            fontFamily: MENU_STYLES.FONT_FAMILY
        });
        windowDiv.appendChild(this.mainContent);
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
            this.revealedCards.forEach((card) => {
                // Outer container for 3D perspective
                const cardContainer = document.createElement('div');
                Object.assign(cardContainer.style, {
                    perspective: '1000px',
                    minWidth: '150px',
                    minHeight: '200px'
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

                // Card front (face up)
                const cardFront = document.createElement('div');
                Object.assign(cardFront.style, {
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    padding: '20px',
                    backgroundColor: MENU_COLORS.CARD_BG,
                    border: `3px solid ${this.getRarityColor(card.rarity)}`,
                    borderRadius: '10px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxSizing: 'border-box'
                });

                const isNew = !this.cardCollection.hasCard(card);

                const albumText = document.createElement('div');
                albumText.innerText = card.album;
                Object.assign(albumText.style, {
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: this.getRarityColor(card.rarity),
                    marginBottom: '8px'
                });
                cardFront.appendChild(albumText);

                const slotText = document.createElement('div');
                slotText.innerText = `#${card.slot}`;
                Object.assign(slotText.style, {
                    fontSize: '18px',
                    color: MENU_COLORS.TEXT,
                    marginBottom: '8px'
                });
                cardFront.appendChild(slotText);

                const rarityText = document.createElement('div');
                rarityText.innerText = card.rarity.toUpperCase();
                Object.assign(rarityText.style, {
                    fontSize: '14px',
                    color: this.getRarityColor(card.rarity),
                    marginBottom: '8px'
                });
                cardFront.appendChild(rarityText);
                // Reserve space for status to keep consistent card layout
                const statusContainer = document.createElement('div');
                Object.assign(statusContainer.style, {
                    height: '30px',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                });

                if (isNew) {
                    const statusText = document.createElement('div');
                    statusText.innerText = '✨ NEW';
                    Object.assign(statusText.style, {
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#888'
                    });
                    statusContainer.appendChild(statusText);
                }

                cardFront.appendChild(statusContainer);

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

        // Update transforms for existing cards
        const flippers = cardsContainer.querySelectorAll('.card-flipper');
        flippers.forEach((flipper, index) => {
            const isFlipped = this.flippedCardIndices.has(index);
            (flipper as HTMLElement).style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
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
        const gridDiv = document.createElement('div');
        Object.assign(gridDiv.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px'
        });

        cards.forEach(card => {
            const collected = this.cardCollection.hasCard(card);
            const cardDiv = document.createElement('div');
            Object.assign(cardDiv.style, {
                padding: '15px',
                backgroundColor: collected ? MENU_COLORS.PANEL_BG : MENU_COLORS.MISSING,
                border: `2px solid ${this.getRarityColor(card.rarity)}`,
                borderRadius: '5px',
                textAlign: 'center',
                opacity: collected ? '1' : '0.4',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100px',
                justifyContent: 'center'
            });

            const slotText = document.createElement('div');
            slotText.innerText = `#${card.slot}`;
            Object.assign(slotText.style, {
                fontSize: '20px',
                fontWeight: 'bold',
                color: this.getRarityColor(card.rarity)
            });
            cardDiv.appendChild(slotText);

            const rarityText = document.createElement('div');
            rarityText.innerText = card.rarity.toUpperCase();
            Object.assign(rarityText.style, {
                fontSize: '14px',
                color: MENU_COLORS.TEXT,
                marginTop: '5px'
            });
            cardDiv.appendChild(rarityText);

            // Always create checkmark container to maintain consistent height
            const checkmark = document.createElement('div');
            checkmark.innerText = collected ? '✓' : '';
            Object.assign(checkmark.style, {
                fontSize: '24px',
                color: MENU_COLORS.COLLECTED,
                marginTop: '5px',
                height: '29px' // Reserve space for checkmark
            });
            cardDiv.appendChild(checkmark);

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
    private static readonly ALBUM_REWARDS: Record<string, string> = {
        'A.001': 'REWARD: Chip prices -5% / Chip sell value +5%',
        'A.002': 'REWARD: Core prices -5% / Core sell value +5%',
        'A.003': 'REWARD: Weapon prices -8% / Weapon sell value +8% / +5% tier bonus in trader stock',
        'B.001': 'REWARD: Item drop chance +2%',
        'B.002': 'REWARD: Item drop chance +3% / Weapon drop quality +2%',
        'B.003': 'REWARD: Item drop chance +5% / Weapon drop quality +5%',
        'C.001': 'REWARD: +5% chance for multi-XData drops',
        'C.002': 'REWARD: All skill cooldowns permanently reduced by 10%',
        'C.003': 'REWARD: Maximum weapon damage bonus ceiling increased by +10% (up to +35%)',
    };

    /** Characters used for obfuscation */
    private static readonly GLITCH_CHARS = '!@#$%^&*<>?/|\\{}[]~`';

    /**
     * Builds a partially-revealed reward description div.
     * The fraction of characters revealed equals (collected / total).
     * When the album is complete the description is shown in full.
     */
    private createRewardDescriptionDiv(album: string): HTMLDivElement {
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
                    obfuscated += CardManager.GLITCH_CHARS[
                        Math.floor(Math.random() * CardManager.GLITCH_CHARS.length)
                    ];
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
        resetInputDebounce(this as any);
    }

    public hide() {
        if (!this.isVisible) return;
        this.isVisible = false;
        this.container.style.display = 'none';
        this.uiManager.hideControlHints();
        resetInputDebounce(this as any);
    }

    private render(player: Player) {
        this.packCountDisplay.innerText = `Booster Packs: ${player.boosterPacks}`;

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

        // Update centralized control hints based on input method
        this.uiManager.showControlHints(getHint(HintConfigs.menuNavigate, input));

        const navigateUp = input.isNavigateUpPressed();
        const navigateDown = input.isNavigateDownPressed();
        const select = input.isSelectPressed();
        const cancel = input.isCancelPressed();

        // Debounced navigation
        if (navigateUp && !this.lastNavigateUpState) {
            this.handleNavigateUp();
        }
        this.lastNavigateUpState = navigateUp;

        if (navigateDown && !this.lastNavigateDownState) {
            this.handleNavigateDown();
        }
        this.lastNavigateDownState = navigateDown;

        if (select && !this.lastSelectState) {
            this.handleSelect(player);
        }
        this.lastSelectState = select;

        if (cancel && !this.lastCancelState) {
            this.handleCancel();
        }
        this.lastCancelState = cancel;

        // Always render
        this.render(player);
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

        // Add cards to collection before flipping
        this.revealedCards.forEach(card => {
            this.cardCollection.addCard(card);
        });

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
}
