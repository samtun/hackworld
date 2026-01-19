import { InputManager } from '../InputManager';
import { Npc } from './Npc';
import { resetInputDebounce } from '../ui/UiUtils';
import { getHint, getKeyboardHint, HintConfigs } from '../ui/InputHints';
import { MenuManager, MENU_COLORS, MENU_STYLES } from '../ui/MenuManager';
import { UIManager } from '../ui/UIManager';

export class NpcDialogueManager {
    private static instance: NpcDialogueManager; // Singleton
    container!: HTMLDivElement;
    isVisible: boolean = false;
    currentNpc: Npc | null = null;
    currentLineIndex: number = 0;

    // UI Elements
    nameBox!: HTMLDivElement;
    dialogueText!: HTMLDivElement;

    // Input tracking for debouncing
    private lastSelectState: boolean = false;
    private lastCancelState: boolean = false;
    
    // Store InputManager for dynamic hints
    private currentInputManager?: InputManager;
    
    // Callback to execute after dialogue completes
    private onDialogueCompleteCallback?: () => void;

    private menuManager: MenuManager;
    private uiManager: UIManager;

    public static get Instance(): NpcDialogueManager {
        return this.instance || (this.instance = new this());
    }

    private constructor() {
        this.menuManager = MenuManager.Instance;
        this.uiManager = UIManager.Instance;
        this.createUI();
    }

    private createUI() {
        // Main Container - Lower third of screen - using MenuManager
        this.container = this.menuManager.createDialogueOverlay();
        document.body.appendChild(this.container);

        // Name Box (Top Left)
        this.nameBox = document.createElement('div');
        Object.assign(this.nameBox.style, {
            backgroundColor: MENU_COLORS.NAME_BG,
            color: MENU_COLORS.NAME_TEXT,
            fontFamily: MENU_STYLES.FONT_FAMILY,
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
            color: MENU_COLORS.TEXT,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            fontSize: '20px',
            lineHeight: '1.6',
            padding: '10px 20px',
            flex: '1',
            display: 'flex',
            alignItems: 'flex-start',
            maxWidth: '90%'
        });
        this.container.appendChild(this.dialogueText);
    }

    /**
     * Show dialogue with an NPC
     */
    show(npc: Npc, onComplete?: () => void) {
        this.isVisible = true;
        this.currentNpc = npc;
        this.currentLineIndex = 0;
        this.onDialogueCompleteCallback = onComplete;
        this.container.style.display = 'flex';
        this.updateDialogue(this.currentInputManager);
        // Reset input state to prevent immediate action on open
        resetInputDebounce(this as any);
    }

    /**
     * Hide dialogue
     */
    hide() {
        this.isVisible = false;
        this.currentNpc = null;
        this.currentLineIndex = 0;
        this.onDialogueCompleteCallback = undefined;
        this.container.style.display = 'none';
        // Hide centralized control hints when dialogue closes
        this.uiManager.hideControlHints();
    }

    /**
     * Update dialogue display
     */
    private updateDialogue(input?: InputManager) {
        if (!this.currentNpc) return;

        this.nameBox.innerText = this.currentNpc.name;
        this.dialogueText.innerText = this.currentNpc.dialogue[this.currentLineIndex];

        // Update centralized control hints based on input method if InputManager is available
        if (input) {
            if (this.currentLineIndex < this.currentNpc.dialogue.length - 1) {
                this.uiManager.showControlHints(getHint(HintConfigs.continueExit, input));
            } else {
                this.uiManager.showControlHints(getHint(HintConfigs.closeExit, input));
            }
        } else {
            // Fallback to keyboard hints if InputManager not available
            if (this.currentLineIndex < this.currentNpc.dialogue.length - 1) {
                this.uiManager.showControlHints(getKeyboardHint(HintConfigs.continueExit));
            } else {
                this.uiManager.showControlHints(getKeyboardHint(HintConfigs.closeExit));
            }
        }
    }

    /**
     * Update input handling
     */
    update(input: InputManager) {
        // Always store input manager for dynamic hints, even when not visible
        this.currentInputManager = input;
        
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
                    // End of dialogue - mark as shown and call callback if provided
                    this.currentNpc.markDialogueShown();
                    const callback = this.onDialogueCompleteCallback;
                    this.hide();
                    
                    // Execute callback after hiding dialogue
                    if (callback) {
                        callback();
                    }
                } else {
                    // Show next line and update hints based on input method
                    this.updateDialogue(input);
                }
            }
        }

        // Update last states for debouncing
        this.lastSelectState = select;
        this.lastCancelState = cancel;
    }
}
