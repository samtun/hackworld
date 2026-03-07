import { describe, it, expect, beforeEach } from 'vitest';
import { NpcRegistry } from './NpcRegistry';

describe('NpcRegistry', () => {
    let registry: NpcRegistry;

    beforeEach(() => {
        // Reset singleton for test isolation
        (NpcRegistry as any).instance = undefined;
        registry = NpcRegistry.Instance;
    });

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(NpcRegistry.Instance).toBe(registry);
        });
    });

    describe('markDialogueShown / hasShownDialogue', () => {
        it('returns false for an NPC whose dialogue has not been shown', () => {
            expect(registry.hasShownDialogue('SomeNpc')).toBe(false);
        });

        it('returns true after marking dialogue as shown', () => {
            registry.markDialogueShown('SomeNpc');
            expect(registry.hasShownDialogue('SomeNpc')).toBe(true);
        });

        it('never marks The Mainframe dialogue as shown', () => {
            registry.markDialogueShown('The Mainframe');
            expect(registry.hasShownDialogue('The Mainframe')).toBe(false);
        });

        it('The Mainframe always returns false from hasShownDialogue', () => {
            expect(registry.hasShownDialogue('The Mainframe')).toBe(false);
        });
    });

    describe('getShownDialogueList', () => {
        it('returns empty array initially', () => {
            expect(registry.getShownDialogueList()).toEqual([]);
        });

        it('returns list of NPCs whose dialogue has been shown', () => {
            registry.markDialogueShown('NpcA');
            registry.markDialogueShown('NpcB');
            expect(registry.getShownDialogueList()).toContain('NpcA');
            expect(registry.getShownDialogueList()).toContain('NpcB');
            expect(registry.getShownDialogueList()).toHaveLength(2);
        });
    });

    describe('loadDialogueState', () => {
        it('loads NPC names and marks them as shown', () => {
            registry.loadDialogueState(['NpcX', 'NpcY']);
            expect(registry.hasShownDialogue('NpcX')).toBe(true);
            expect(registry.hasShownDialogue('NpcY')).toBe(true);
        });

        it('replaces existing state when loading', () => {
            registry.markDialogueShown('OldNpc');
            registry.loadDialogueState(['NewNpc']);
            expect(registry.hasShownDialogue('OldNpc')).toBe(false);
            expect(registry.hasShownDialogue('NewNpc')).toBe(true);
        });
    });

    describe('reset', () => {
        it('clears all shown dialogue records', () => {
            registry.markDialogueShown('NpcA');
            registry.reset();
            expect(registry.hasShownDialogue('NpcA')).toBe(false);
            expect(registry.getShownDialogueList()).toEqual([]);
        });
    });
});
