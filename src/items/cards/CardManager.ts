import { Player } from '../../Player';
import { InputManager } from '../../InputManager';
import { resetInputDebounce } from '../../ui/UiUtils';
import { Card, CardDefinitions, CardRarity } from './Card';
import { CardCollection } from './CardCollection';

// --- Constants ---
const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_BG: '#2a2a2a',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB',
    CARD_BG: '#1a1a1a',
    NORMAL: '#aaaaaa',
    UNCOMMON: '#4ec9ff',
    SPECIAL: '#ff69b4',
    COLLECTED: '#44ff44',
    MISSING: '#444444'
};

const STYLES = {
    FONT_FAMILY: '"Share Tech", Arial, sans-serif',
    BORDER_RADIUS: '10px',
    BORDER_WIDTH: '2px',
    WINDOW_PADDING: '20px',
    PANEL_PADDING: '20px',
    GRID_GAP: '10px'
};

type ViewMode = 'menu' | 'openPack' | 'viewAlbums' | 'viewAlbum';

export class CardManager {
    private static instance: CardManager;
    
    container!: HTMLDivElement;
    isVisible: boolean = false;
    
    // UI Elements
    private mainContent!: HTMLDivElement;
    private packCountDisplay!: HTMLDivElement;
    
    // Navigation state
    private viewMode: ViewMode = 'menu';
    private selectedMenuIndex: number = 0;
    private selectedAlbumIndex: number = 0;
    private currentAlbum: string = '';
    private revealedCards: Card[] = [];
    private revealIndex: number = 0;
    
    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastSelectState: boolean = false;
    private lastCancelState: boolean = false;
    
    private cardCollection: CardCollection;
    
    private constructor() {
        this.cardCollection = CardCollection.Instance;
        this.createUI();
    }
    
    public static get Instance(): CardManager {
        return this.instance || (this.instance = new this());
    }
    
    private createUI() {
        // Main Container Overlay
        this.container = this.createOverlay();
        document.body.appendChild(this.container);
        
        // Main Window
        const windowDiv = this.createWindow();
        this.container.appendChild(windowDiv);
        
        // Title
        const titleDiv = document.createElement('div');
        titleDiv.innerText = 'CARD COLLECTION';
        Object.assign(titleDiv.style, {
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.SPECIAL,
            fontFamily: STYLES.FONT_FAMILY,
            padding: '10px',
            borderBottom: `2px solid ${COLORS.SEPARATOR}`,
            marginBottom: '15px'
        });
        windowDiv.appendChild(titleDiv);
        
        // Pack count display
        this.packCountDisplay = document.createElement('div');
        Object.assign(this.packCountDisplay.style, {
            textAlign: 'center',
            fontSize: '18px',
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            marginBottom: '15px'
        });
        windowDiv.appendChild(this.packCountDisplay);
        
        // Main content area
        this.mainContent = document.createElement('div');
        Object.assign(this.mainContent.style, {
            flex: '1',
            overflowY: 'auto',
            fontFamily: STYLES.FONT_FAMILY
        });
        windowDiv.appendChild(this.mainContent);
        
        // Controls hint
        const controlsDiv = document.createElement('div');
        controlsDiv.innerHTML = '<span class="key-icon">↑↓</span> / <span class="btn-icon xbox-dpad">D-Pad</span> Navigate | <span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Select | <span class="key-icon">ESC</span> / <span class="btn-icon xbox-b">B</span> Back';
        Object.assign(controlsDiv.style, {
            textAlign: 'center',
            fontSize: '14px',
            color: COLORS.SEPARATOR,
            fontFamily: STYLES.FONT_FAMILY,
            padding: '10px',
            borderTop: `2px solid ${COLORS.SEPARATOR}`,
            marginTop: '10px'
        });
        windowDiv.appendChild(controlsDiv);
    }
    
    private createOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: COLORS.OVERLAY,
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
        });
        return overlay;
    }
    
    private createWindow(): HTMLDivElement {
        const windowDiv = document.createElement('div');
        Object.assign(windowDiv.style, {
            backgroundColor: COLORS.WINDOW_BG,
            border: `${STYLES.BORDER_WIDTH} solid ${COLORS.BORDER}`,
            borderRadius: STYLES.BORDER_RADIUS,
            padding: STYLES.WINDOW_PADDING,
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: STYLES.FONT_FAMILY
        });
        return windowDiv;
    }
    
    private getRarityColor(rarity: CardRarity): string {
        switch (rarity) {
            case CardRarity.NORMAL:
                return COLORS.NORMAL;
            case CardRarity.UNCOMMON:
                return COLORS.UNCOMMON;
            case CardRarity.SPECIAL:
                return COLORS.SPECIAL;
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
                backgroundColor: this.selectedMenuIndex === index ? COLORS.ITEM_SELECTED : COLORS.PANEL_BG,
                color: item.enabled ? COLORS.TEXT : '#666',
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
            color: COLORS.TEXT,
            marginTop: '20px'
        });
        this.mainContent.appendChild(progressDiv);
    }
    
    private renderOpenPack() {
        this.mainContent.innerHTML = '';
        
        if (this.revealIndex < this.revealedCards.length) {
            const card = this.revealedCards[this.revealIndex];
            const isNew = this.cardCollection.addCard(card);
            
            const cardDiv = document.createElement('div');
            Object.assign(cardDiv.style, {
                padding: '40px',
                margin: '20px auto',
                maxWidth: '400px',
                backgroundColor: COLORS.CARD_BG,
                border: `4px solid ${this.getRarityColor(card.rarity)}`,
                borderRadius: '15px',
                textAlign: 'center'
            });
            
            const albumText = document.createElement('div');
            albumText.innerText = card.album;
            Object.assign(albumText.style, {
                fontSize: '32px',
                fontWeight: 'bold',
                color: this.getRarityColor(card.rarity),
                marginBottom: '10px'
            });
            cardDiv.appendChild(albumText);
            
            const slotText = document.createElement('div');
            slotText.innerText = `Card #${card.slot}`;
            Object.assign(slotText.style, {
                fontSize: '24px',
                color: COLORS.TEXT,
                marginBottom: '15px'
            });
            cardDiv.appendChild(slotText);
            
            const rarityText = document.createElement('div');
            rarityText.innerText = card.rarity.toUpperCase();
            Object.assign(rarityText.style, {
                fontSize: '20px',
                color: this.getRarityColor(card.rarity),
                marginBottom: '15px'
            });
            cardDiv.appendChild(rarityText);
            
            const statusText = document.createElement('div');
            statusText.innerText = isNew ? '✨ NEW! ✨' : 'DUPLICATE';
            Object.assign(statusText.style, {
                fontSize: '22px',
                fontWeight: 'bold',
                color: isNew ? COLORS.COLLECTED : '#888',
                marginTop: '10px'
            });
            cardDiv.appendChild(statusText);
            
            this.mainContent.appendChild(cardDiv);
            
            const continueText = document.createElement('div');
            continueText.innerText = `Card ${this.revealIndex + 1} / 5`;
            Object.assign(continueText.style, {
                textAlign: 'center',
                fontSize: '16px',
                color: COLORS.SEPARATOR,
                marginTop: '20px'
            });
            this.mainContent.appendChild(continueText);
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
                backgroundColor: this.selectedAlbumIndex === index ? COLORS.ITEM_SELECTED : COLORS.PANEL_BG,
                color: COLORS.TEXT,
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
            color: COLORS.TEXT,
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
                backgroundColor: collected ? COLORS.PANEL_BG : COLORS.MISSING,
                border: `2px solid ${this.getRarityColor(card.rarity)}`,
                borderRadius: '5px',
                textAlign: 'center',
                opacity: collected ? '1' : '0.4'
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
            rarityText.innerText = card.rarity.charAt(0).toUpperCase();
            Object.assign(rarityText.style, {
                fontSize: '14px',
                color: COLORS.TEXT,
                marginTop: '5px'
            });
            cardDiv.appendChild(rarityText);
            
            if (collected) {
                const checkmark = document.createElement('div');
                checkmark.innerText = '✓';
                Object.assign(checkmark.style, {
                    fontSize: '24px',
                    color: COLORS.COLLECTED,
                    marginTop: '5px'
                });
                cardDiv.appendChild(checkmark);
            }
            
            gridDiv.appendChild(cardDiv);
        });
        
        this.mainContent.appendChild(gridDiv);
    }
    
    public show() {
        if (this.isVisible) return;
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.viewMode = 'menu';
        this.selectedMenuIndex = 0;
        resetInputDebounce(this as any);
    }
    
    public hide() {
        if (!this.isVisible) return;
        this.isVisible = false;
        this.container.style.display = 'none';
        resetInputDebounce(this as any);
    }
    
    private render(player: Player) {
        this.packCountDisplay.innerText = `Booster Packs: ${player.boosterPacks}`;
        
        switch (this.viewMode) {
            case 'menu':
                this.renderMenu(player);
                break;
            case 'openPack':
                this.renderOpenPack();
                break;
            case 'viewAlbums':
                this.renderAlbumList();
                break;
            case 'viewAlbum':
                this.renderAlbumDetail();
                break;
        }
    }
    
    public update(player: Player, input: InputManager) {
        if (!this.isVisible) return;
        
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
        if (this.viewMode === 'menu') {
            this.selectedMenuIndex = Math.max(0, this.selectedMenuIndex - 1);
        } else if (this.viewMode === 'viewAlbums') {
            this.selectedAlbumIndex = Math.max(0, this.selectedAlbumIndex - 1);
        }
    }
    
    private handleNavigateDown() {
        if (this.viewMode === 'menu') {
            this.selectedMenuIndex = Math.min(1, this.selectedMenuIndex + 1);
        } else if (this.viewMode === 'viewAlbums') {
            const maxIndex = CardDefinitions.getAlbums().length - 1;
            this.selectedAlbumIndex = Math.min(maxIndex, this.selectedAlbumIndex + 1);
        }
    }
    
    private handleSelect(player: Player) {
        if (this.viewMode === 'menu') {
            if (this.selectedMenuIndex === 0 && player.boosterPacks > 0) {
                // Open pack
                player.boosterPacks -= 1;
                this.revealedCards = [];
                for (let i = 0; i < 5; i++) {
                    this.revealedCards.push(CardDefinitions.getRandomCard());
                }
                this.revealIndex = 0;
                this.viewMode = 'openPack';
            } else if (this.selectedMenuIndex === 1) {
                // View albums
                this.viewMode = 'viewAlbums';
                this.selectedAlbumIndex = 0;
            }
        } else if (this.viewMode === 'openPack') {
            // Advance to next card or return to menu
            this.revealIndex++;
            if (this.revealIndex >= this.revealedCards.length) {
                this.viewMode = 'menu';
            }
        } else if (this.viewMode === 'viewAlbums') {
            // Open specific album
            const albums = CardDefinitions.getAlbums();
            this.currentAlbum = albums[this.selectedAlbumIndex];
            this.viewMode = 'viewAlbum';
        }
    }
    
    private handleCancel() {
        if (this.viewMode === 'menu') {
            this.hide();
        } else if (this.viewMode === 'openPack') {
            // Can't cancel during pack opening, must view all cards
            return;
        } else if (this.viewMode === 'viewAlbums') {
            this.viewMode = 'menu';
        } else if (this.viewMode === 'viewAlbum') {
            this.viewMode = 'viewAlbums';
        }
    }
}
