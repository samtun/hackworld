import { describe, it, expect } from 'vitest';
import { NpcRegistry } from './NpcRegistry';

describe('NpcRegistry', () => {
    describe('markDialogueShown / hasShownDialogue', () => {
        it('returns false for an NPC whose dialogue has not been shown', () => {
            const registry = new NpcRegistry();
            expect(registry.hasShownDialogue('SomeNpc')).toBe(false);
        });

        it('returns true after marking dialogue as shown', () => {
            const registry = new NpcRegistry();
            registry.markDialogueShown('SomeNpc');
            expect(registry.hasShownDialogue('SomeNpc')).toBe(true);
        });

        it('never marks The Mainframe dialogue as shown', () => {
            const registry = new NpcRegistry();
            registry.markDialogueShown('The Mainframe');
            expect(registry.hasShownDialogue('The Mainframe')).toBe(false);
        });

        it('The Mainframe always returns false from hasShownDialogue', () => {
            const registry = new NpcRegistry();
            expect(registry.hasShownDialogue('The Mainframe')).toBe(false);
        });
    });

    describe('getShownDialogueList', () => {
        it('returns empty array initially', () => {
            const registry = new NpcRegistry();
            expect(registry.getShownDialogueList()).toEqual([]);
        });

        it('returns list of NPCs whose dialogue has been shown', () => {
            const registry = new NpcRegistry();
            registry.markDialogueShown('NpcA');
            registry.markDialogueShown('NpcB');
            expect(registry.getShownDialogueList()).toContain('NpcA');
            expect(registry.getShownDialogueList()).toContain('NpcB');
            expect(registry.getShownDialogueList()).toHaveLength(2);
        });
    });

    describe('loadDialogueState', () => {
        it('loads NPC names and marks them as shown', () => {
            const registry = new NpcRegistry();
            registry.loadDialogueState(['NpcX', 'NpcY']);
            expect(registry.hasShownDialogue('NpcX')).toBe(true);
            expect(registry.hasShownDialogue('NpcY')).toBe(true);
        });

        it('replaces existing state when loading', () => {
            const registry = new NpcRegistry();
            registry.markDialogueShown('OldNpc');
            registry.loadDialogueState(['NewNpc']);
            expect(registry.hasShownDialogue('OldNpc')).toBe(false);
            expect(registry.hasShownDialogue('NewNpc')).toBe(true);
        });
    });

    describe('reset', () => {
        it('clears all shown dialogue records', () => {
            const registry = new NpcRegistry();
            registry.markDialogueShown('NpcA');
            registry.reset();
            expect(registry.hasShownDialogue('NpcA')).toBe(false);
            expect(registry.getShownDialogueList()).toEqual([]);
        });
    });
});
