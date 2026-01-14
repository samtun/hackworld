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
    public isInteractPressed: boolean = false;
    public isInventoryPressed: boolean = false;
    public isCancelPressed: boolean = false;

    // Track previous states for edge detection
    private previousJumpState: boolean = false;
    private previousAttackState: boolean = false;
    private previousInteractState: boolean = false;
    private previousInventoryState: boolean = false;

    // Mobile detection
    private isMobileDevice: boolean = false;
    
    // Menu state tracking
    private isMenuOpen: boolean = false;

    // Screen tap handler for interaction
    private screenTapHandler?: (e: TouchEvent) => void;
    private lastTapTime: number = 0;
    private readonly TAP_DEBOUNCE_MS = 200; // Prevent rapid taps

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

        // Create action buttons (Jump and Attack only)
        this.jumpButton = this.createButton('Jump', 'mobile-jump-btn');
        this.attackButton = this.createButton('Attack', 'mobile-attack-btn');

        this.buttonsContainer.appendChild(this.jumpButton);
        this.buttonsContainer.appendChild(this.attackButton);

        // Setup button event listeners
        this.setupButtonListeners(this.jumpButton, 'isJumpPressed');
        this.setupButtonListeners(this.attackButton, 'isAttackPressed');

        // Create inventory button (top center)
        this.inventoryButton = this.createButton('Inventory', 'mobile-inventory-btn');
        document.body.appendChild(this.inventoryButton);
        this.setupButtonListeners(this.inventoryButton, 'isInventoryPressed');

        // Create close button (top center, initially hidden)
        this.closeButton = this.createButton('Close', 'mobile-close-btn');
        this.closeButton.style.display = 'none'; // Hidden by default
        document.body.appendChild(this.closeButton);
        this.setupButtonListeners(this.closeButton, 'isCancelPressed');

        // Setup screen tap for interaction
        // Any tap on the screen (not on a button/joystick) triggers interaction
        // But only when no menu is open (to avoid interfering with menu button selection)
        this.screenTapHandler = (e: TouchEvent) => {
            // Don't trigger interaction when a menu is open
            if (this.isMenuOpen) {
                return;
            }
            
            // Debounce rapid taps
            const now = Date.now();
            if (now - this.lastTapTime < this.TAP_DEBOUNCE_MS) {
                return;
            }
            this.lastTapTime = now;

            // Check if tap is on a control element
            const target = e.target as HTMLElement;
            const isOnControl = target.closest('.mobile-joystick-container') ||
                target.closest('.mobile-buttons-container') ||
                target.closest('.mobile-inventory-btn') ||
                target.closest('.mobile-close-btn') ||
                target.classList.contains('mobile-control-btn');

            if (!isOnControl) {
                // Trigger interaction
                this.isInteractPressed = true;
                // Auto-release after a short delay
                setTimeout(() => {
                    this.isInteractPressed = false;
                }, 100);
            }
        };

        document.addEventListener('touchstart', this.screenTapHandler);
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

        // Prevent default touch behaviors
        button.addEventListener('touchstart', (e) => e.preventDefault());

        return button;
    }

    private setupButtonListeners(button: HTMLButtonElement, stateKey: 'isJumpPressed' | 'isAttackPressed' | 'isInteractPressed' | 'isInventoryPressed' | 'isCancelPressed') {
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
    public wasJustPressed(button: 'jump' | 'attack' | 'interact' | 'inventory'): boolean {
        switch (button) {
            case 'jump':
                return this.isJumpPressed && !this.previousJumpState;
            case 'attack':
                return this.isAttackPressed && !this.previousAttackState;
            case 'interact':
                return this.isInteractPressed && !this.previousInteractState;
            case 'inventory':
                return this.isInventoryPressed && !this.previousInventoryState;
            default:
                return false;
        }
    }

    /**
     * Check if a button was just released this frame
     */
    public wasJustReleased(button: 'jump' | 'attack' | 'interact' | 'inventory'): boolean {
        switch (button) {
            case 'jump':
                return !this.isJumpPressed && this.previousJumpState;
            case 'attack':
                return !this.isAttackPressed && this.previousAttackState;
            case 'interact':
                return !this.isInteractPressed && this.previousInteractState;
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
        this.previousInteractState = this.isInteractPressed;
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
        // Don't hide inventory/close buttons here, they're managed by setMenuOpen
    }

    /**
     * Show close button when menu is open, show inventory button when closed
     */
    public setMenuOpen(isOpen: boolean) {
        if (!this.isMobileDevice) return;
        
        // Track menu state to disable screen-wide interaction when menus are open
        this.isMenuOpen = isOpen;

        if (isOpen) {
            // Show close button, hide inventory button
            if (this.inventoryButton) this.inventoryButton.style.display = 'none';
            if (this.closeButton) this.closeButton.style.display = 'block';
        } else {
            // Show inventory button, hide close button
            if (this.inventoryButton) this.inventoryButton.style.display = 'block';
            if (this.closeButton) this.closeButton.style.display = 'none';
        }
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

        if (this.screenTapHandler) {
            document.removeEventListener('touchstart', this.screenTapHandler);
        }
    }
}
