import { describe, it, expect, vi } from 'vitest';
import { CardDefinitions, CardRarity } from './Card';

describe('CardDefinitions', () => {
    describe('getAlbums', () => {
        it('returns all album keys', () => {
            const albums = CardDefinitions.getAlbums();
            expect(albums).toContain('A.001');
            expect(albums).toContain('B.001');
            expect(albums).toContain('C.001');
            expect(albums.length).toBeGreaterThan(0);
        });
    });

    describe('getAlbumCards', () => {
        it('returns 8 cards for album A.001', () => {
            const cards = CardDefinitions.getAlbumCards('A.001');
            expect(cards).toHaveLength(8);
        });

        it('assigns correct album and sequential slots', () => {
            const cards = CardDefinitions.getAlbumCards('A.001');
            expect(cards[0].album).toBe('A.001');
            expect(cards[0].slot).toBe(1);
            expect(cards[7].slot).toBe(8);
        });

        it('returns empty array for unknown album', () => {
            expect(CardDefinitions.getAlbumCards('UNKNOWN')).toEqual([]);
        });

        it('assigns correct rarities', () => {
            // A.001: slots 1-6 NORMAL, 7-8 UNCOMMON
            const cards = CardDefinitions.getAlbumCards('A.001');
            expect(cards[0].rarity).toBe(CardRarity.NORMAL);
            expect(cards[6].rarity).toBe(CardRarity.UNCOMMON);
        });
    });

    describe('getAllCards', () => {
        it('returns all cards across all albums', () => {
            const allCards = CardDefinitions.getAllCards();
            const albums = CardDefinitions.getAlbums();
            // Should be 8 cards * number of albums
            expect(allCards.length).toBe(albums.length * 8);
        });
    });

    describe('getRandomCard', () => {
        it('returns a valid card', () => {
            const allCards = CardDefinitions.getAllCards();
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const card = CardDefinitions.getRandomCard();
            expect(allCards.some(c => c.album === card.album && c.slot === card.slot)).toBe(true);
            vi.restoreAllMocks();
        });

        it('returns a card with a valid rarity', () => {
            const card = CardDefinitions.getRandomCard();
            expect(Object.values(CardRarity)).toContain(card.rarity);
        });
    });
});
