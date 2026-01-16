import * as THREE from 'three';
import { MobileControlsManager } from './MobileControlsManager';

export class InputManager {
    private static instance: InputManager; // Singleton

    keys: { [key: string]: boolean } = {};
    gamepadIndex: number | null = null;
    mobileControls?: MobileControlsManager;

    // Track previous button states for detecting press and release
    private previousAttackState: boolean = false;
    private previousSelectState: boolean = false;
    private previousSkill1State: boolean = false; // L1 + A
    private previousSkill2State: boolean = false; // L1 + B
    private previousSkill3State: boolean = false; // L1 + X

    public static get Instance(): InputManager {
        return this.instance || (this.instance = new this());
    }

    public get isMobile(): boolean {
        return this.mobileControls?.isMobile || false;
    }

    private constructor() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('gamepadconnected', (e) => {
            console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                e.gamepad.index, e.gamepad.id,
                e.gamepad.buttons.length, e.gamepad.axes.length);
            this.gamepadIndex = e.gamepad.index;
        });
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log("Gamepad disconnected from index %d: %s",
                e.gamepad.index, e.gamepad.id);
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
            }
        });
    }

    initializeMobileControls() {
        this.mobileControls = MobileControlsManager.Instance;
    }

    // Call this at the end of each frame to update state tracking
    updateState() {
        this.previousAttackState = this.isAttackPressed();
        this.previousSelectState = this.isSelectPressed();
        this.previousSkill1State = this.isSkill1Pressed();
        this.previousSkill2State = this.isSkill2Pressed();
        this.previousSkill3State = this.isSkill3Pressed();
        this.mobileControls?.updateState();
    }

    getMovementVector(): THREE.Vector2 {
        const move = new THREE.Vector2(0, 0);

        // Keyboard
        if (this.keys['KeyW'] || this.keys['ArrowUp']) move.y -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) move.y += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) move.x += 1;

        // Gamepad
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Left Stick
                const axisX = gp.axes[0];
                const axisY = gp.axes[1];

                // Deadzone
                if (Math.abs(axisX) > 0.1) move.x += axisX;
                if (Math.abs(axisY) > 0.1) move.y += axisY;
            }
        }

        // Mobile joystick
        if (this.mobileControls?.isMobile) {
            move.x += this.mobileControls.movementVector.x;
            move.y += this.mobileControls.movementVector.y;
        }

        // Normalize if length > 1 to prevent faster diagonal movement
        if (move.length() > 1) {
            move.normalize();
        }

        return move;
    }

    isAttackPressed(): boolean {
        // K key for keyboard attack
        if (this.keys['KeyK']) return true;

        // Gamepad Button (X is button 2)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Button 2 (X/Square)
                if (gp.buttons[2].pressed) return true;
            }
        }

        // Mobile touch button
        if (this.mobileControls?.isMobile && this.mobileControls?.isAttackPressed) {
            return true;
        }

        return false;
    }

    isAttackHeld(): boolean {
        return this.isAttackPressed();
    }

    isAttackReleased(): boolean {
        const currentState = this.isAttackPressed();
        const wasReleased = this.previousAttackState && !currentState;
        return wasReleased;
    }

    isAttackJustPressed(): boolean {
        const currentState = this.isAttackPressed();
        const justPressed = !this.previousAttackState && currentState;
        return justPressed;
    }

    isJumpPressed(): boolean {
        if (this.keys['Space']) return true;

        // Gamepad Button (A is button 0)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Button 0 (A/Cross)
                if (gp.buttons[0].pressed) return true;
            }
        }

        // Mobile touch button
        if (this.mobileControls?.isMobile && this.mobileControls?.isJumpPressed) {
            return true;
        }

        return false;
    }

    isInventoryPressed(): boolean {
        if (this.keys['KeyI']) return true;

        // Gamepad Select (Button 8 usually)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[8].pressed) return true;
            }
        }

        // Mobile touch button
        if (this.mobileControls?.isMobile && this.mobileControls?.isInventoryPressed) {
            return true;
        }

        return false;
    }

    // Navigation methods for inventory
    isNavigateUpPressed(): boolean {
        if (this.keys['ArrowUp'] || this.keys['KeyW']) return true;

        // Gamepad D-Pad Up or Left Stick Up
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // D-Pad Up (button 12) or Left Stick Up (axis 1 < -0.5)
                if (gp.buttons[12]?.pressed) return true;
                if (gp.axes[1] < -0.5) return true;
            }
        }

        // Mobile joystick
        if (this.mobileControls?.isMobile) {
            return this.mobileControls.movementVector.y < -0.5;
        }

        return false;
    }

    isNavigateDownPressed(): boolean {
        if (this.keys['ArrowDown'] || this.keys['KeyS']) return true;

        // Gamepad D-Pad Down or Left Stick Down
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // D-Pad Down (button 13) or Left Stick Down (axis 1 > 0.5)
                if (gp.buttons[13]?.pressed) return true;
                if (gp.axes[1] > 0.5) return true;
            }
        }

        // Mobile joystick
        if (this.mobileControls?.isMobile) {
            return this.mobileControls.movementVector.y > 0.5;
        }

        return false;
    }

    isNavigateLeftPressed(): boolean {
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) return true;

        // Gamepad D-Pad Left or Left Stick Left
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // D-Pad Left (button 14) or Left Stick Left (axis 0 < -0.5)
                if (gp.buttons[14]?.pressed) return true;
                if (gp.axes[0] < -0.5) return true;
            }
        }


        // Mobile joystick
        if (this.mobileControls?.isMobile) {
            return this.mobileControls.movementVector.x < -0.5;
        }

        return false;
    }

    isNavigateRightPressed(): boolean {
        if (this.keys['ArrowRight'] || this.keys['KeyD']) return true;

        // Gamepad D-Pad Right or Left Stick Right
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // D-Pad Right (button 15) or Left Stick Right (axis 0 > 0.5)
                if (gp.buttons[15]?.pressed) return true;
                if (gp.axes[0] > 0.5) return true;
            }
        }

        // Mobile joystick
        if (this.mobileControls?.isMobile) {
            return this.mobileControls.movementVector.x > 0.5;
        }

        return false;
    }

    isSelectPressed(): boolean {
        if (this.keys['Enter']) return true;

        // Gamepad A button (button 0)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[0]?.pressed) return true;
            }
        }

        // Mobile interact button also acts as select in menus
        if (this.mobileControls?.isMobile && this.mobileControls?.isJumpPressed) {
            return true;
        }

        return false;
    }

    isSelectJustPressed(): boolean {
        const currentState = this.isSelectPressed();
        return !this.previousSelectState && currentState;
    }

    isCancelPressed(): boolean {
        if (this.keys['Escape']) return true;

        // Gamepad B button (button 1)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[1]?.pressed) return true;
            }
        }

        // Mobile close button
        if (this.mobileControls?.isMobile && this.mobileControls?.isCancelPressed) {
            return true;
        }

        return false;
    }

    isStartPressed(): boolean {
        if (this.keys['Enter']) return true;

        // Gamepad Start (Button 9 usually)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[9]?.pressed) return true;
            }
        }
        return false;
    }

    isSelectAndStartPressed(): boolean {
        // Only for gamepad - Select (Button 8) + Start (Button 9) pressed together
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[8]?.pressed && gp.buttons[9]?.pressed) return true;
            }
        }
        return false;
    }

    isL3Pressed(): boolean {
        // L3 is typically button 10 (left thumbstick press)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[10]?.pressed) return true;
            }
        }
        return false;
    }

    isR3Pressed(): boolean {
        // R3 is typically button 11 (right thumbstick press)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[11]?.pressed) return true;
            }
        }
        return false;
    }

    isControllerConnected(): boolean {
        return this.gamepadIndex !== null;
    }

    // L1 shoulder button (typically button 4)
    isL1Pressed(): boolean {
        // Q key for keyboard
        if (this.keys['KeyQ']) return true;

        // Gamepad L1 (button 4)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[4]?.pressed) return true;
            }
        }

        return false;
    }

    // Skill 1: L1 + A (Laser Beam)
    isSkill1Pressed(): boolean {
        // Keyboard: Q + Space
        if (this.keys['KeyQ'] && this.keys['Space']) return true;

        // Gamepad: L1 (button 4) + A (button 0)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[4]?.pressed && gp.buttons[0]?.pressed) return true;
            }
        }

        return false;
    }

    isSkill1JustPressed(): boolean {
        const currentState = this.isSkill1Pressed();
        return !this.previousSkill1State && currentState;
    }

    // Skill 2: L1 + B (Healing)
    isSkill2Pressed(): boolean {
        // Keyboard: Q + Escape
        if (this.keys['KeyQ'] && this.keys['Escape']) return true;

        // Gamepad: L1 (button 4) + B (button 1)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[4]?.pressed && gp.buttons[1]?.pressed) return true;
            }
        }

        return false;
    }

    isSkill2JustPressed(): boolean {
        const currentState = this.isSkill2Pressed();
        return !this.previousSkill2State && currentState;
    }

    // Skill 3: L1 + X (Area Attack)
    isSkill3Pressed(): boolean {
        // Keyboard: Q + K
        if (this.keys['KeyQ'] && this.keys['KeyK']) return true;

        // Gamepad: L1 (button 4) + X (button 2)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[4]?.pressed && gp.buttons[2]?.pressed) return true;
            }
        }

        return false;
    }

    isSkill3JustPressed(): boolean {
        const currentState = this.isSkill3Pressed();
        return !this.previousSkill3State && currentState;
    }
}
