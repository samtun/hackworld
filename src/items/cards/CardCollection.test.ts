import { describe, it, expect, beforeEach } from 'vitest';
import { CardCollection } from './CardCollection';
import { Card, CardDefinitions, CardRarity } from './Card';

function makeCard(album: string, slot: number, rarity = CardRarity.NORMAL): Card {
    return { album, slot, rarity };
}

describe('CardCollection', () => {
    let collection: CardCollection;

    beforeEach(() => {
        // Reset the singleton for each test by clearing the instance
        (CardCollection as any).instance = undefined;
        collection = CardCollection.Instance;
    });

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(CardCollection.Instance).toBe(collection);
        });
    });

    describe('addCard', () => {
        it('returns true when adding a new card', () => {
            const card = makeCard('A.001', 1);
            expect(collection.addCard(card)).toBe(true);
        });

        it('returns false when adding a duplicate card', () => {
            const card = makeCard('A.001', 1);
            collection.addCard(card);
            expect(collection.addCard(card)).toBe(false);
        });
    });

    describe('hasCard', () => {
        it('returns false for a card not in the collection', () => {
            expect(collection.hasCard(makeCard('A.001', 1))).toBe(false);
        });

        it('returns true after the card is added', () => {
            const card = makeCard('A.001', 2);
            collection.addCard(card);
            expect(collection.hasCard(card)).toBe(true);
        });
    });

    describe('getTotalCollected', () => {
        it('returns 0 on empty collection', () => {
            expect(collection.getTotalCollected()).toBe(0);
        });

        it('increments as unique cards are added', () => {
            collection.addCard(makeCard('A.001', 1));
            collection.addCard(makeCard('A.001', 2));
            expect(collection.getTotalCollected()).toBe(2);
        });

        it('does not increment for duplicates', () => {
            const card = makeCard('A.001', 1);
            collection.addCard(card);
            collection.addCard(card);
            expect(collection.getTotalCollected()).toBe(1);
        });
    });

    describe('getTotalCards', () => {
        it('returns the total number of cards defined in the game', () => {
            expect(collection.getTotalCards()).toBe(CardDefinitions.getAllCards().length);
        });
    });

    describe('getAlbumProgress', () => {
        it('returns 0 collected and correct total for an empty album', () => {
            const progress = collection.getAlbumProgress('A.001');
            expect(progress.collected).toBe(0);
            expect(progress.total).toBe(8);
        });

        it('counts collected cards within the album', () => {
            collection.addCard(makeCard('A.001', 1));
            collection.addCard(makeCard('A.001', 3));
            const progress = collection.getAlbumProgress('A.001');
            expect(progress.collected).toBe(2);
            expect(progress.total).toBe(8);
        });
    });

    describe('getSaveData / loadSaveData', () => {
        it('round-trips card data through save and load', () => {
            collection.addCard(makeCard('A.001', 1));
            collection.addCard(makeCard('B.001', 4, CardRarity.SPECIAL));
            const saved = collection.getSaveData();

            collection.clear();
            expect(collection.getTotalCollected()).toBe(0);

            collection.loadSaveData(saved);
            expect(collection.getTotalCollected()).toBe(2);
            expect(collection.hasCard(makeCard('A.001', 1))).toBe(true);
            expect(collection.hasCard(makeCard('B.001', 4))).toBe(true);
        });
    });

    describe('clear', () => {
        it('removes all cards from the collection', () => {
            collection.addCard(makeCard('A.001', 1));
            collection.clear();
            expect(collection.getTotalCollected()).toBe(0);
        });
    });

    describe('isAlbumComplete', () => {
        it('returns false when album has no collected cards', () => {
            expect(collection.isAlbumComplete('A.001')).toBe(false);
        });

        it('returns false when album is partially collected', () => {
            collection.addCard(makeCard('A.001', 1));
            collection.addCard(makeCard('A.001', 2));
            expect(collection.isAlbumComplete('A.001')).toBe(false);
        });

        it('returns true when all 8 cards in the album are collected', () => {
            const cards = CardDefinitions.getAlbumCards('A.001');
            cards.forEach(c => collection.addCard(c));
            expect(collection.isAlbumComplete('A.001')).toBe(true);
        });

        it('returns false for an unknown album', () => {
            expect(collection.isAlbumComplete('UNKNOWN')).toBe(false);
        });
    });
});
