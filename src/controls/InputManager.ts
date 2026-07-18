import * as THREE from 'three';
import { MobileControlsManager } from './MobileControlsManager';
import { singleton, inject, delay } from 'tsyringe';

@singleton()
export class InputManager {
    keys: { [key: string]: boolean } = {};
    gamepadIndex: number | null = null;
    /** Set to true each frame when any UI menu is open. Affects B-button dual role. */
    menuOpen: boolean = false;

    // Track previous button states for detecting press and release
    private previousAttackState: boolean = false;
    private previousSelectState: boolean = false;
    private previousSkill1State: boolean = false; // L1 + A
    private previousSkill2State: boolean = false; // L1 + B
    private previousSkill3State: boolean = false; // L1 + X
    private previousBlockState: boolean = false;
    private previousPauseState: boolean = false;
    private jumpConsumed: boolean = false;
    private cancelConsumed: boolean = false;

    public get isMobile(): boolean {
        return this.mobileControlsManager.isMobile || false;
    }

    constructor(@inject(delay(() => MobileControlsManager)) private readonly mobileControlsManager: MobileControlsManager) {
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

    // Call this at the end of each frame to update state tracking
    updateState() {
        this.previousAttackState = this.isAttackPressed();
        this.previousSelectState = this.isSelectPressed();
        this.previousSkill1State = this.isSkill1Pressed();
        this.previousSkill2State = this.isSkill2Pressed();
        this.previousSkill3State = this.isSkill3Pressed();
        this.previousBlockState = this.isBlockPressed();
        this.previousPauseState = this.isPausePressed();
        this.mobileControlsManager.updateState();

        // Clear jump consumed flag once the jump button is physically released
        if (this.jumpConsumed && !this.isRawJumpPressed()) {
            this.jumpConsumed = false;
        }

        // Clear cancel consumed flag once the B button is physically released
        if (this.cancelConsumed && !this.isRawCancelPressed()) {
            this.cancelConsumed = false;
        }
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
        if (this.mobileControlsManager.isMobile) {
            move.x += this.mobileControlsManager.movementVector.x;
            move.y += this.mobileControlsManager.movementVector.y;
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
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isAttackPressed) {
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

    /** Suppress jump until the physical button is released. */
    consumeJump(): void {
        this.jumpConsumed = true;
    }

    /** Raw jump state without the consumed-flag check (used internally). */
    private isRawJumpPressed(): boolean {
        if (this.keys['Space']) return true;
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp && gp.buttons[0].pressed) return true;
        }
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isJumpPressed) return true;
        return false;
    }

    isJumpPressed(): boolean {
        if (this.jumpConsumed) return false;
        return this.isRawJumpPressed();
    }

    /** Suppress the B button (block role) until the physical button is released. */
    consumeCancel(): void {
        this.cancelConsumed = true;
    }

    /** Raw B-button state without menu or consumed-flag checks (used internally). */
    private isRawCancelPressed(): boolean {
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp && gp.buttons[1]?.pressed) return true;
        }
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isCancelPressed) return true;
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
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isInventoryPressed) {
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
        if (this.mobileControlsManager.isMobile) {
            return this.mobileControlsManager.movementVector.y < -0.5;
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
        if (this.mobileControlsManager.isMobile) {
            return this.mobileControlsManager.movementVector.y > 0.5;
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
        if (this.mobileControlsManager.isMobile) {
            return this.mobileControlsManager.movementVector.x < -0.5;
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
        if (this.mobileControlsManager.isMobile) {
            return this.mobileControlsManager.movementVector.x > 0.5;
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
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isJumpPressed) {
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

        // Gamepad B button (button 1) — acts as cancel only when a menu is open
        // (when no menu is open it acts as block instead)
        if (this.menuOpen && this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[1]?.pressed) return true;
            }
        }

        // Mobile B button — acts as cancel only when a menu is open
        if (this.menuOpen && this.mobileControlsManager.isMobile && this.mobileControlsManager.isCancelPressed) {
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

        // Mobile A button also acts as start
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isJumpPressed) {
            return true;
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

    // Skill 1: L1 + B (Heal)
    isSkill1Pressed(): boolean {
        // Keyboard: Q + Escape
        if (this.keys['KeyQ'] && this.keys['Escape']) return true;

        // Gamepad: L1 (button 4) + B (button 1)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[4]?.pressed && gp.buttons[1]?.pressed) return true;
            }
        }

        // Mobile: Skill toggle mode + Close button
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isSkill2Pressed) {
            return true;
        }

        return false;
    }

    // Skill 2: L1 + A (Laser Beam)
    isSkill2Pressed(): boolean {
        // Keyboard: Q + Space
        if (this.keys['KeyQ'] && this.keys['Space']) return true;

        // Gamepad: L1 (button 4) + A (button 0)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[4]?.pressed && gp.buttons[0]?.pressed) return true;
            }
        }

        // Mobile: Skill toggle mode + Jump button
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isSkill2Pressed) {
            return true;
        }

        return false;
    }

    isSkill2JustPressed(): boolean {
        const currentState = this.isSkill2Pressed();
        return !this.previousSkill2State && currentState;
    }

    isSkill1JustPressed(): boolean {
        const currentState = this.isSkill1Pressed();
        return !this.previousSkill1State && currentState;
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

        // Mobile: Skill toggle mode + Attack button
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isSkill3Pressed) {
            return true;
        }

        return false;
    }

    isSkill3JustPressed(): boolean {
        const currentState = this.isSkill3Pressed();
        return !this.previousSkill3State && currentState;
    }

    // Block (L key / B button when no menu open / mobile B when no menu open)
    isBlockPressed(): boolean {
        // L key for keyboard
        if (this.keys['KeyL']) return true;

        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // B button (button 1) acts as block when no menu is open and L1 (button 4) is not held
                // (L1 + B is reserved for Skill 2)
                if (!this.menuOpen && !this.cancelConsumed && gp.buttons[1]?.pressed && !gp.buttons[4]?.pressed) return true;
            }
        }

        // Mobile block button
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isBlockPressed) {
            return true;
        }

        // Mobile B button acts as block when no menu is open
        if (!this.menuOpen && !this.cancelConsumed && this.mobileControlsManager.isMobile && this.mobileControlsManager.isCancelPressed) {
            return true;
        }

        return false;
    }

    isBlockJustPressed(): boolean {
        const currentState = this.isBlockPressed();
        return !this.previousBlockState && currentState;
    }

    isPausePressed(): boolean {
        // Keyboard: Escape (but not when Q/L1 is held for skills)
        if (this.keys['Escape'] && !this.keys['KeyQ']) return true;

        // Gamepad Start (Button 9)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[9]?.pressed) return true;
            }
        }

        // Mobile pause button
        if (this.mobileControlsManager.isMobile && this.mobileControlsManager.isPausePressed) {
            return true;
        }

        return false;
    }

    isPauseJustPressed(): boolean {
        const currentState = this.isPausePressed();
        return !this.previousPauseState && currentState;
    }

    // Returns the right thumbstick Y-axis value (-1 to 1). Positive = down, negative = up.
    getRightThumbstickY(): number {
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                const axisY = gp.axes[3]; // Right stick Y is axis 3 on Xbox/standard gamepad
                if (Math.abs(axisY) > 0.15) return axisY;
            }
        }
        return 0;
    }
}
