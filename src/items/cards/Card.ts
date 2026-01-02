export enum CardRarity {
    NORMAL = 'normal',
    UNCOMMON = 'uncommon',
    SPECIAL = 'special'
}

export interface Card {
    album: string;  // e.g., 'A.001', 'B.002', 'C.003'
    slot: number;   // 1-8
    rarity: CardRarity;
}

/**
 * Define all cards in the game
 */
export class CardDefinitions {
    private static readonly ALBUMS: Record<string, CardRarity[]> = {
        'A.001': [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON
        ],
        'A.002': [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON
        ],
        'A.003': [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON
        ],
        'B.001': [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        'B.002': [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL
        ],
        'B.003': [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        'C.001': [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        'C.002': [
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        'C.003': [
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ]
    };

    /**
     * Get all defined albums
     */
    static getAlbums(): string[] {
        return Object.keys(this.ALBUMS);
    }

    /**
     * Get cards for a specific album
     */
    static getAlbumCards(album: string): Card[] {
        const rarities = this.ALBUMS[album];
        if (!rarities) return [];

        return rarities.map((rarity, index) => ({
            album,
            slot: index + 1,
            rarity
        }));
    }

    /**
     * Get all cards in the game
     */
    static getAllCards(): Card[] {
        const allCards: Card[] = [];
        for (const album of this.getAlbums()) {
            allCards.push(...this.getAlbumCards(album));
        }
        return allCards;
    }

    /**
     * Get a random card based on rarity weights
     */
    static getRandomCard(): Card {
        const allCards = this.getAllCards();
        
        // Weight cards by rarity: normal = 70%, uncommon = 25%, special = 5%
        const weights: Record<CardRarity, number> = {
            [CardRarity.NORMAL]: 70,
            [CardRarity.UNCOMMON]: 25,
            [CardRarity.SPECIAL]: 5
        };

        const weightedCards: Card[] = [];
        for (const card of allCards) {
            const weight = weights[card.rarity];
            for (let i = 0; i < weight; i++) {
                weightedCards.push(card);
            }
        }

        const randomIndex = Math.floor(Math.random() * weightedCards.length);
        return weightedCards[randomIndex];
    }
}
