import { InputManager } from '../InputManager';
import { Npc } from './Npc';

const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.85)',
    TEXT: '#fff',
    NAME_BG: 'rgba(0, 0, 0, 0.7)',
    NAME_TEXT: '#ffd700'
};

const STYLES = {
    FONT_FAMILY: '"Share Tech", Arial, sans-serif'
};

export class NpcDialogueManager {
    private static instance: NpcDialogueManager; // Singleton
    container!: HTMLDivElement;
    isVisible: boolean = false;
    currentNpc: Npc | null = null;
    currentLineIndex: number = 0;

    // UI Elements
    nameBox!: HTMLDivElement;
    dialogueText!: HTMLDivElement;
    continueHint!: HTMLDivElement;

    // Input tracking for debouncing
    private lastSelectState: boolean = false;
    private lastCancelState: boolean = false;

    public static get Instance(): NpcDialogueManager {
        return this.instance || (this.instance = new this());
    }

    private constructor() {
        this.createUI();
    }

    private createUI() {
        // Main Container - Lower third of screen
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            height: '33.33%',
            backgroundColor: COLORS.OVERLAY,
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            padding: '20px',
            boxSizing: 'border-box',
            zIndex: '1000'
        });
        document.body.appendChild(this.container);

        // Name Box (Top Left)
        this.nameBox = document.createElement('div');
        Object.assign(this.nameBox.style, {
            backgroundColor: COLORS.NAME_BG,
            color: COLORS.NAME_TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '10px 20px',
            borderRadius: '5px',
            marginBottom: '10px'
        });
        this.container.appendChild(this.nameBox);

        // Dialogue Text
        this.dialogueText = document.createElement('div');
        Object.assign(this.dialogueText.style, {
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            fontSize: '20px',
            lineHeight: '1.6',
            padding: '10px 20px',
            flex: '1',
            display: 'flex',
            alignItems: 'flex-start',
            maxWidth: '90%'
        });
        this.container.appendChild(this.dialogueText);

        // Continue Hint (Bottom Right)
        this.continueHint = document.createElement('div');
        Object.assign(this.continueHint.style, {
            alignSelf: 'flex-end',
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            fontSize: '16px',
            padding: '10px 20px'
        });
        this.continueHint.innerHTML = '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Continue | <span class="key-icon">ESC</span> / <span class="btn-icon xbox-b">B</span> Exit';
        this.container.appendChild(this.continueHint);
    }

    /**
     * Show dialogue with an NPC
     */
    show(npc: Npc) {
        this.isVisible = true;
        this.currentNpc = npc;
        this.currentLineIndex = 0;
        this.container.style.display = 'flex';
        this.updateDialogue();
        // Reset input state to prevent immediate action on open
        this.lastSelectState = true;
    }

    /**
     * Hide dialogue
     */
    hide() {
        this.isVisible = false;
        this.currentNpc = null;
        this.currentLineIndex = 0;
        this.container.style.display = 'none';
    }

    /**
     * Update dialogue display
     */
    private updateDialogue() {
        if (!this.currentNpc) return;

        this.nameBox.innerText = this.currentNpc.name;
        this.dialogueText.innerText = this.currentNpc.dialogue[this.currentLineIndex];

        // Update continue hint
        if (this.currentLineIndex < this.currentNpc.dialogue.length - 1) {
            this.continueHint.innerHTML = '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Continue | <span class="key-icon">ESC</span> / <span class="btn-icon xbox-b">B</span> Exit';
        } else {
            this.continueHint.innerHTML = '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Close | <span class="key-icon">ESC</span> / <span class="btn-icon xbox-b">B</span> Exit';
        }
    }

    /**
     * Update input handling
     */
    update(input: InputManager) {
        if (!this.isVisible) return;

        const select = input.isSelectPressed();
        const cancel = input.isCancelPressed();

        // Exit dialogue on cancel
        if (cancel && !this.lastCancelState) {
            this.hide();
        }

        // Advance dialogue on select
        if (select && !this.lastSelectState) {
            if (this.currentNpc) {
                this.currentLineIndex++;
                if (this.currentLineIndex >= this.currentNpc.dialogue.length) {
                    // End of dialogue
                    this.hide();
                } else {
                    // Show next line
                    this.updateDialogue();
                }
            }
        }

        // Update last states for debouncing
        this.lastSelectState = select;
        this.lastCancelState = cancel;
    }
}
