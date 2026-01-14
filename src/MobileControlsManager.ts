import nipplejs, { JoystickManager } from 'nipplejs';
import * as THREE from 'three';

/**
 * Manages mobile touch controls including virtual joystick and action buttons
 */
export class MobileControlsManager {
    private static instance: MobileControlsManager;

    private joystickManager?: JoystickManager;
    private joystickContainer!: HTMLDivElement;
    private buttonsContainer!: HTMLDivElement;
    private inventoryButton!: HTMLButtonElement;
    private closeButton!: HTMLButtonElement;

    // Button elements
    private jumpButton!: HTMLButtonElement;
    private attackButton!: HTMLButtonElement;

    // Input state
    public movementVector: THREE.Vector2 = new THREE.Vector2(0, 0);
    public isJumpPressed: boolean = false;
    public isAttackPressed: boolean = false;
    public isInventoryPressed: boolean = false;
    public isCancelPressed: boolean = false;

    // Track previous states for edge detection
    private previousJumpState: boolean = false;
    private previousAttackState: boolean = false;
    private previousInventoryState: boolean = false;

    // Mobile detection
    private isMobileDevice: boolean = false;

    private constructor() {
        // Check if device is mobile
        this.isMobileDevice = this.detectMobile();

        if (!this.isMobileDevice) {
            // Don't create controls on desktop
            return;
        }

        // Create joystick container
        this.joystickContainer = document.createElement('div');
        this.joystickContainer.id = 'mobile-joystick';
        this.joystickContainer.className = 'mobile-joystick-container';
        document.body.appendChild(this.joystickContainer);

        // Initialize nipplejs joystick
        this.joystickManager = nipplejs.create({
            zone: this.joystickContainer,
            mode: 'static',
            position: { left: '80px', bottom: '80px' },
            color: 'cyan',
            size: 120,
            restOpacity: 0.5,
        });

        // Setup joystick event listeners
        this.joystickManager.on('move', (_evt: any, data: any) => {
            const force = Math.min(data.force, 1); // Cap at 1
            const angle = data.angle.radian;

            // Convert polar coordinates to cartesian
            // Note: nipplejs uses standard math coords, we need game coords
            // In nipplejs: 0° is right, 90° is up
            // We want: positive X = right, negative Y = up (screen coords)
            this.movementVector.x = Math.cos(angle) * force;
            this.movementVector.y = -Math.sin(angle) * force;
        });

        this.joystickManager.on('end', () => {
            this.movementVector.set(0, 0);
        });

        // Create buttons container (right side)
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.className = 'mobile-buttons-container';
        document.body.appendChild(this.buttonsContainer);

        // Create action buttons (A for Jump, X for Attack)
        // Using Xbox controller button names for consistency
        this.jumpButton = this.createButton('A', 'mobile-jump-btn');
        this.closeButton = this.createButton('B', 'mobile-close-btn');
        this.attackButton = this.createButton('X', 'mobile-attack-btn');

        this.buttonsContainer.appendChild(this.jumpButton);
        this.buttonsContainer.appendChild(this.closeButton);
        this.buttonsContainer.appendChild(this.attackButton);

        // Setup button event listeners
        this.setupButtonListeners(this.jumpButton, 'isJumpPressed');
        this.setupButtonListeners(this.attackButton, 'isAttackPressed');
        this.setupButtonListeners(this.closeButton, 'isCancelPressed');

        // Create inventory button (top center) - using Select button convention
        this.inventoryButton = this.createButton('', 'mobile-inventory-btn');
        document.body.appendChild(this.inventoryButton);
        this.setupButtonListeners(this.inventoryButton, 'isInventoryPressed');
    }

    public static get Instance(): MobileControlsManager {
        if (!MobileControlsManager.instance) {
            MobileControlsManager.instance = new MobileControlsManager();
        }
        return MobileControlsManager.instance;
    }

    private detectMobile(): boolean {
        // Check for URL parameter to force mobile mode (useful for testing)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mobile') === 'true') {
            return true;
        }

        // Check for touch support AND screen size
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 1024; // Tablets and phones

        // Show controls only if device has touch AND is small screen
        // This prevents showing on desktops (even in responsive mode without actual touch hardware)
        return hasTouchScreen && isSmallScreen;
    }

    private createButton(label: string, className: string): HTMLButtonElement {
        const button = document.createElement('button');
        button.textContent = label;
        button.className = `mobile-control-btn ${className}`;

        return button;
    }

    private setupButtonListeners(button: HTMLButtonElement, stateKey: 'isJumpPressed' | 'isAttackPressed' | 'isInventoryPressed' | 'isCancelPressed') {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this[stateKey] = true;
        });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this[stateKey] = false;
        });

        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this[stateKey] = false;
        });
    }

    /**
     * Check if a button was just pressed this frame (edge detection)
     */
    public wasJustPressed(button: 'jump' | 'attack' | 'inventory'): boolean {
        switch (button) {
            case 'jump':
                return this.isJumpPressed && !this.previousJumpState;
            case 'attack':
                return this.isAttackPressed && !this.previousAttackState;
            case 'inventory':
                return this.isInventoryPressed && !this.previousInventoryState;
            default:
                return false;
        }
    }

    /**
     * Check if a button was just released this frame
     */
    public wasJustReleased(button: 'jump' | 'attack' | 'inventory'): boolean {
        switch (button) {
            case 'jump':
                return !this.isJumpPressed && this.previousJumpState;
            case 'attack':
                return !this.isAttackPressed && this.previousAttackState;
            case 'inventory':
                return !this.isInventoryPressed && this.previousInventoryState;
            default:
                return false;
        }
    }

    /**
     * Update state tracking - call at end of each frame
     */
    public updateState() {
        this.previousJumpState = this.isJumpPressed;
        this.previousAttackState = this.isAttackPressed;
        this.previousInventoryState = this.isInventoryPressed;
    }

    /**
     * Show or hide mobile controls
     */
    public setVisible(visible: boolean) {
        if (!this.isMobileDevice) return;

        const display = visible ? 'block' : 'none';
        if (this.joystickContainer) this.joystickContainer.style.display = display;
        if (this.buttonsContainer) this.buttonsContainer.style.display = display;
        if (this.inventoryButton) this.inventoryButton.style.display = display;
        if (this.closeButton) this.closeButton.style.display = display;
    }

    /**
     * Check if mobile controls are active on this device
     */
    public get isMobile(): boolean {
        return this.isMobileDevice;
    }

    /**
     * Cleanup resources
     */
    public destroy() {
        if (this.joystickManager) {
            this.joystickManager.destroy();
        }

        if (this.joystickContainer && this.joystickContainer.parentNode) {
            this.joystickContainer.parentNode.removeChild(this.joystickContainer);
        }

        if (this.buttonsContainer && this.buttonsContainer.parentNode) {
            this.buttonsContainer.parentNode.removeChild(this.buttonsContainer);
        }

        if (this.inventoryButton && this.inventoryButton.parentNode) {
            this.inventoryButton.parentNode.removeChild(this.inventoryButton);
        }

        if (this.closeButton && this.closeButton.parentNode) {
            this.closeButton.parentNode.removeChild(this.closeButton);
        }
    }
}
