export enum CardRarity {
    NORMAL = 'normal',
    UNCOMMON = 'uncommon',
    SPECIAL = 'special'
}

export enum Album {
    A001 = 'A.001',
    A002 = 'A.002',
    A003 = 'A.003',
    B001 = 'B.001',
    B002 = 'B.002',
    B003 = 'B.003',
    C001 = 'C.001',
    C002 = 'C.002',
    C003 = 'C.003',
}

export interface Card {
    album: Album;
    slot: number;   // 1-8
    rarity: CardRarity;
}

/**
 * Define all cards in the game
 */
export class CardDefinitions {
    private static readonly ALBUMS: Record<Album, CardRarity[]> = {
        [Album.A001]: [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON
        ],
        [Album.A002]: [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON
        ],
        [Album.A003]: [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON
        ],
        [Album.B001]: [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        [Album.B002]: [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL
        ],
        [Album.B003]: [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        [Album.C001]: [
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        [Album.C002]: [
            CardRarity.NORMAL,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.UNCOMMON,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL,
            CardRarity.SPECIAL
        ],
        [Album.C003]: [
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
    static getAlbums(): Album[] {
        return Object.values(Album);
    }

    /**
     * Get cards for a specific album
     */
    static getAlbumCards(album: Album): Card[] {
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
