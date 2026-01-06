/**
 * NPC Registry - Singleton to track NPC dialogue state across stage loads
 * 
 * This registry persists which NPCs have shown their dialogue to the player,
 * ensuring that dialogue is only shown on the first interaction even when
 * stages are reloaded (e.g., returning to lobby from a dungeon).
 */
export class NpcRegistry {
    private static instance: NpcRegistry;
    
    // Track which NPCs have shown their dialogue by NPC name
    private shownDialogue: Set<string> = new Set<string>();

    private constructor() {
        // Private constructor for singleton
    }

    public static get Instance(): NpcRegistry {
        if (!NpcRegistry.instance) {
            NpcRegistry.instance = new NpcRegistry();
        }
        return NpcRegistry.instance;
    }

    /**
     * Mark an NPC's dialogue as shown
     */
    markDialogueShown(npcName: string): void {
        this.shownDialogue.add(npcName);
    }

    /**
     * Check if an NPC's dialogue has been shown
     */
    hasShownDialogue(npcName: string): boolean {
        return this.shownDialogue.has(npcName);
    }

    /**
     * Get list of NPCs that have shown dialogue (for save system)
     */
    getShownDialogueList(): string[] {
        return Array.from(this.shownDialogue);
    }

    /**
     * Load dialogue state from save data
     */
    loadDialogueState(npcNames: string[]): void {
        this.shownDialogue.clear();
        npcNames.forEach(name => this.shownDialogue.add(name));
    }

    /**
     * Reset all dialogue state (useful for new game)
     */
    reset(): void {
        this.shownDialogue.clear();
    }
}
