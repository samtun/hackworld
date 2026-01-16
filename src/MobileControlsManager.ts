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
    private skillToggleButton!: HTMLButtonElement;

    // Input state
    public movementVector: THREE.Vector2 = new THREE.Vector2(0, 0);
    public isJumpPressed: boolean = false;
    public isAttackPressed: boolean = false;
    public isInventoryPressed: boolean = false;
    public isCancelPressed: boolean = false;

    // Skill mode state
    private isSkillMode: boolean = false;
    public isSkill1Pressed: boolean = false; // Laser (was Jump/A)
    public isSkill2Pressed: boolean = false; // Heal (was Close/B)
    public isSkill3Pressed: boolean = false; // Area (was Attack/X)

    // Track previous states for edge detection
    private previousJumpState: boolean = false;
    private previousAttackState: boolean = false;
    private previousInventoryState: boolean = false;
    private previousSkill1State: boolean = false;
    private previousSkill2State: boolean = false;
    private previousSkill3State: boolean = false;

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

        // Setup button event listeners with skill mode support
        this.setupButtonListeners(this.jumpButton, 'isJumpPressed', 'isSkill1Pressed');
        this.setupButtonListeners(this.attackButton, 'isAttackPressed', 'isSkill3Pressed');
        this.setupButtonListeners(this.closeButton, 'isCancelPressed', 'isSkill2Pressed');

        // Create skill toggle button (top-left corner near joystick)
        this.skillToggleButton = this.createButton('Skills', 'mobile-skill-toggle-btn');
        document.body.appendChild(this.skillToggleButton);
        this.setupSkillToggleListener();

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

    private setupButtonListeners(button: HTMLButtonElement, normalStateKey: 'isJumpPressed' | 'isAttackPressed' | 'isInventoryPressed' | 'isCancelPressed', skillStateKey?: 'isSkill1Pressed' | 'isSkill2Pressed' | 'isSkill3Pressed') {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isSkillMode && skillStateKey) {
                this[skillStateKey] = true;
            } else {
                this[normalStateKey] = true;
            }
        });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.isSkillMode && skillStateKey) {
                this[skillStateKey] = false;
                // Exit skill mode after using a skill
                this.toggleSkillMode();
            } else {
                this[normalStateKey] = false;
            }
        });

        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            if (this.isSkillMode && skillStateKey) {
                this[skillStateKey] = false;
            } else {
                this[normalStateKey] = false;
            }
        });
    }

    private setupSkillToggleListener() {
        this.skillToggleButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleSkillMode();
        });
    }

    private toggleSkillMode() {
        this.isSkillMode = !this.isSkillMode;
        this.updateButtonLabels();
    }

    private updateButtonLabels() {
        if (this.isSkillMode) {
            // Change to skill labels
            this.jumpButton.textContent = 'Laser';
            this.closeButton.textContent = 'Heal';
            this.attackButton.textContent = 'Area';
            this.skillToggleButton.classList.add('active');
        } else {
            // Change back to normal labels
            this.jumpButton.textContent = 'A';
            this.closeButton.textContent = 'B';
            this.attackButton.textContent = 'X';
            this.skillToggleButton.classList.remove('active');
        }
    }

    /**
     * Check if a button was just pressed this frame (edge detection)
     */
    public wasJustPressed(button: 'jump' | 'attack' | 'inventory' | 'skill1' | 'skill2' | 'skill3'): boolean {
        switch (button) {
            case 'jump':
                return this.isJumpPressed && !this.previousJumpState;
            case 'attack':
                return this.isAttackPressed && !this.previousAttackState;
            case 'inventory':
                return this.isInventoryPressed && !this.previousInventoryState;
            case 'skill1':
                return this.isSkill1Pressed && !this.previousSkill1State;
            case 'skill2':
                return this.isSkill2Pressed && !this.previousSkill2State;
            case 'skill3':
                return this.isSkill3Pressed && !this.previousSkill3State;
            default:
                return false;
        }
    }

    /**
     * Check if a button was just released this frame
     */
    public wasJustReleased(button: 'jump' | 'attack' | 'inventory' | 'skill1' | 'skill2' | 'skill3'): boolean {
        switch (button) {
            case 'jump':
                return !this.isJumpPressed && this.previousJumpState;
            case 'attack':
                return !this.isAttackPressed && this.previousAttackState;
            case 'inventory':
                return !this.isInventoryPressed && this.previousInventoryState;
            case 'skill1':
                return !this.isSkill1Pressed && this.previousSkill1State;
            case 'skill2':
                return !this.isSkill2Pressed && this.previousSkill2State;
            case 'skill3':
                return !this.isSkill3Pressed && this.previousSkill3State;
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
        this.previousSkill1State = this.isSkill1Pressed;
        this.previousSkill2State = this.isSkill2Pressed;
        this.previousSkill3State = this.isSkill3Pressed;
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
        if (this.skillToggleButton) this.skillToggleButton.style.display = display;
    }

    /**
     * Show or hide skills toggle button (for hiding when menus/inventory are open)
     */
    public setSkillsButtonVisible(visible: boolean) {
        if (!this.isMobileDevice) return;
        
        const display = visible ? 'block' : 'none';
        if (this.skillToggleButton) this.skillToggleButton.style.display = display;
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

        if (this.skillToggleButton && this.skillToggleButton.parentNode) {
            this.skillToggleButton.parentNode.removeChild(this.skillToggleButton);
        }
    }
}
