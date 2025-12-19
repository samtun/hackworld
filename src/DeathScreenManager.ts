import { InputManager } from './InputManager';

/**
 * Manages the death screen overlay
 */
export class DeathScreenManager {
    private overlay: HTMLDivElement;
    private messageText: HTMLDivElement;
    private retryButton: HTMLDivElement;
    private lobbyButton: HTMLDivElement;
    private selectedIndex: number = 0;
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastSelectState: boolean = false;
    
    isVisible: boolean = false;
    
    // Callbacks for button actions
    onRetry?: () => void;
    onReturnToLobby?: () => void;

    constructor() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)'; // Start transparent
        this.overlay.style.zIndex = '2000';
        this.overlay.style.display = 'none';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.transition = 'background-color 1s ease-in-out';
        this.overlay.style.fontFamily = '"Share Tech", Arial, sans-serif';
        document.body.appendChild(this.overlay);

        // Create message container
        const messageContainer = document.createElement('div');
        messageContainer.style.display = 'flex';
        messageContainer.style.flexDirection = 'column';
        messageContainer.style.alignItems = 'center';
        messageContainer.style.gap = '40px';
        this.overlay.appendChild(messageContainer);

        // Create message text
        this.messageText = document.createElement('div');
        this.messageText.innerText = 'Compilation failed';
        this.messageText.style.fontSize = '64px';
        this.messageText.style.fontWeight = 'bold';
        this.messageText.style.color = '#8B0000'; // Dark red
        this.messageText.style.textAlign = 'center';
        this.messageText.style.textShadow = '4px 4px 0px #000';
        messageContainer.appendChild(this.messageText);

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.gap = '20px';
        messageContainer.appendChild(buttonsContainer);

        // Create Retry button
        this.retryButton = this.createButton('Retry');
        buttonsContainer.appendChild(this.retryButton);

        // Create Return to Lobby button
        this.lobbyButton = this.createButton('Return to Lobby');
        buttonsContainer.appendChild(this.lobbyButton);
    }

    private createButton(text: string): HTMLDivElement {
        const button = document.createElement('div');
        button.innerText = text;
        button.style.fontSize = '32px';
        button.style.padding = '15px 40px';
        button.style.backgroundColor = '#333';
        button.style.color = '#fff';
        button.style.border = '3px solid #666';
        button.style.borderRadius = '10px';
        button.style.cursor = 'pointer';
        button.style.textAlign = 'center';
        button.style.minWidth = '300px';
        button.style.transition = 'all 0.2s';
        button.style.textShadow = '2px 2px 0px #000';
        return button;
    }

    private updateButtonStates() {
        // Update button styles based on selection
        if (this.selectedIndex === 0) {
            this.retryButton.style.backgroundColor = '#555';
            this.retryButton.style.borderColor = '#fff';
            this.lobbyButton.style.backgroundColor = '#333';
            this.lobbyButton.style.borderColor = '#666';
        } else {
            this.retryButton.style.backgroundColor = '#333';
            this.retryButton.style.borderColor = '#666';
            this.lobbyButton.style.backgroundColor = '#555';
            this.lobbyButton.style.borderColor = '#fff';
        }
    }

    show() {
        console.log('[DeathScreen] Showing death screen');
        this.isVisible = true;
        this.selectedIndex = 0;
        this.overlay.style.display = 'flex';
        
        // Fade in the overlay
        setTimeout(() => {
            this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // 70% opacity
            console.log('[DeathScreen] Overlay background set to black');
        }, 10);

        this.updateButtonStates();
    }

    hide() {
        this.isVisible = false;
        this.overlay.style.display = 'none';
        this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    }

    update(input: InputManager) {
        if (!this.isVisible) return;

        // Navigation
        const isNavigateUp = input.isNavigateUpPressed();
        const isNavigateDown = input.isNavigateDownPressed();

        if (isNavigateUp && !this.lastNavigateUpState) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.updateButtonStates();
        }

        if (isNavigateDown && !this.lastNavigateDownState) {
            this.selectedIndex = Math.min(1, this.selectedIndex + 1);
            this.updateButtonStates();
        }

        this.lastNavigateUpState = isNavigateUp;
        this.lastNavigateDownState = isNavigateDown;

        // Selection
        const isSelectPressed = input.isSelectPressed();
        if (isSelectPressed && !this.lastSelectState) {
            if (this.selectedIndex === 0 && this.onRetry) {
                this.onRetry();
            } else if (this.selectedIndex === 1 && this.onReturnToLobby) {
                this.onReturnToLobby();
            }
        }
        this.lastSelectState = isSelectPressed;
    }
}
