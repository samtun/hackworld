import { InputManager } from './InputManager';

/**
 * UI Manager for the save system
 * Provides an interface for confirming and executing save operations
 */
export class SaveManagerUI {
    private static instance: SaveManagerUI; // Singleton

    container!: HTMLDivElement;
    isVisible: boolean = false;
    private saveCallback?: () => void;

    // UI Elements
    private confirmButton!: HTMLDivElement;
    private playtimeDisplay!: HTMLDivElement;
    private saveStatusText!: HTMLDivElement;
    private autoCloseTimer?: number;
    private lastSelectState: boolean = false;

    private constructor() {
        this.createUI();
    }

    public static get Instance(): SaveManagerUI {
        return this.instance || (this.instance = new this());
    }

    private createUI(): void {
        // Main Container Overlay
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.display = 'none';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '1000';
        this.container.style.fontFamily = '"Share Tech", Arial, sans-serif';

        // Window
        const window = document.createElement('div');
        window.style.backgroundColor = '#333';
        window.style.border = '2px solid #000';
        window.style.borderRadius = '10px';
        window.style.padding = '30px';
        window.style.minWidth = '400px';
        window.style.color = '#fff';

        // Title
        const title = document.createElement('div');
        title.textContent = 'Save Manager';
        title.style.fontSize = '28px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';
        window.appendChild(title);

        // Info text
        const infoText = document.createElement('div');
        infoText.textContent = 'Save your current game progress?';
        infoText.style.fontSize = '16px';
        infoText.style.marginBottom = '15px';
        infoText.style.textAlign = 'center';
        window.appendChild(infoText);

        // Playtime display
        this.playtimeDisplay = document.createElement('div');
        this.playtimeDisplay.style.fontSize = '18px';
        this.playtimeDisplay.style.marginBottom = '25px';
        this.playtimeDisplay.style.textAlign = 'center';
        this.playtimeDisplay.style.color = '#ffd700';
        window.appendChild(this.playtimeDisplay);

        // Save status text (shown after save)
        this.saveStatusText = document.createElement('div');
        this.saveStatusText.style.fontSize = '14px';
        this.saveStatusText.style.marginBottom = '15px';
        this.saveStatusText.style.textAlign = 'center';
        this.saveStatusText.style.color = '#00ff00';
        this.saveStatusText.style.display = 'none';
        window.appendChild(this.saveStatusText);

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '20px';

        // Confirm button
        this.confirmButton = document.createElement('div');
        this.confirmButton.textContent = 'Save Game';
        this.confirmButton.style.padding = '10px 20px';
        this.confirmButton.style.backgroundColor = '#4CAF50';
        this.confirmButton.style.border = '2px solid #fff';
        this.confirmButton.style.borderRadius = '5px';
        this.confirmButton.style.cursor = 'pointer';
        this.confirmButton.style.fontSize = '16px';
        this.confirmButton.style.textAlign = 'center';
        buttonContainer.appendChild(this.confirmButton);

        window.appendChild(buttonContainer);

        // Instructions
        const instructions = document.createElement('div');
        instructions.innerHTML = '<span class="key-icon">LEFT</span> / <span class="key-icon">RIGHT</span> / <span class="btn-icon xbox-dpad">D-PAD</span> Navigate | <span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Select | <span class="key-icon">ESC</span> / <span class="btn-icon xbox-b">B</span> Cancel';
        instructions.style.marginTop = '20px';
        instructions.style.fontSize = '12px';
        instructions.style.textAlign = 'center';
        instructions.style.color = '#aaa';
        window.appendChild(instructions);

        this.container.appendChild(window);
        document.body.appendChild(this.container);
    }

    /**
     * Show the save manager UI
     * @param playtime - Current playtime formatted as HH:MM:SS
     * @param onSave - Callback to execute when save is confirmed
     */
    show(playtime: string, onSave: () => void): void {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.saveCallback = onSave;
        this.playtimeDisplay.textContent = `Playtime: ${playtime}`;
        this.saveStatusText.style.display = 'none';

        // Reset input states to prevent immediate action on open
        import('./ui/UiUtils').then(m => m.resetInputDebounce(this as any));
    }

    /**
     * Hide the save manager UI
     */
    hide(): void {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.saveCallback = undefined;

        // Clear auto-close timer if it exists
        if (this.autoCloseTimer !== undefined) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = undefined;
        }
    }

    /**
     * Update the UI state and handle input
     * @param input - Input manager for handling user input
     */
    update(input: InputManager): void {
        if (!this.isVisible) return;


        // Selection
        const isSelectPressed = input.isSelectPressed();
        if (isSelectPressed && !this.lastSelectState && this.saveCallback) {
            this.saveCallback();
            this.showSaveSuccess();
            // Auto-close after showing success message
            this.autoCloseTimer = window.setTimeout(() => {
                this.hide();
            }, 1500);
        }

        this.lastSelectState = isSelectPressed;

        // Cancel with ESC/B button
        const isCancelPressed = input.isCancelPressed();
        if (isCancelPressed) {
            this.hide();
        }
    }

    /**
     * Show save success message
     */
    private showSaveSuccess(): void {
        this.saveStatusText.textContent = 'Game saved successfully!';
        this.saveStatusText.style.display = 'block';
    }
}
