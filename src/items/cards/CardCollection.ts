import { Card, CardDefinitions } from './Card';

/**
 * Manages the player's card collection
 * Tracks which cards have been collected
 */
export class CardCollection {
    private static instance: CardCollection;
    
    // Set of collected card IDs in format "album-slot" (e.g., "A.001-1")
    private collectedCards: Set<string> = new Set();

    private constructor() {}

    public static get Instance(): CardCollection {
        return this.instance || (this.instance = new this());
    }

    /**
     * Get unique card ID
     */
    private getCardId(card: Card): string {
        return `${card.album}-${card.slot}`;
    }

    /**
     * Add a card to the collection
     * @returns true if this is a new card, false if already collected
     */
    addCard(card: Card): boolean {
        const cardId = this.getCardId(card);
        if (this.collectedCards.has(cardId)) {
            return false; // Duplicate
        }
        this.collectedCards.add(cardId);
        return true; // New card
    }

    /**
     * Check if a card has been collected
     */
    hasCard(card: Card): boolean {
        return this.collectedCards.has(this.getCardId(card));
    }

    /**
     * Get total number of collected cards
     */
    getTotalCollected(): number {
        return this.collectedCards.size;
    }

    /**
     * Get total number of cards in the game
     */
    getTotalCards(): number {
        return CardDefinitions.getAllCards().length;
    }

    /**
     * Get collection progress for a specific album
     */
    getAlbumProgress(album: string): { collected: number; total: number } {
        const albumCards = CardDefinitions.getAlbumCards(album);
        const collected = albumCards.filter(card => this.hasCard(card)).length;
        return { collected, total: albumCards.length };
    }

    /**
     * Get collection data for saving
     */
    getSaveData(): string[] {
        return Array.from(this.collectedCards);
    }

    /**
     * Load collection from save data
     */
    loadSaveData(data: string[]): void {
        this.collectedCards = new Set(data);
    }

    /**
     * Clear all collected cards
     */
    clear(): void {
        this.collectedCards.clear();
    }
}
