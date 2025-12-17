import * as THREE from 'three';

export class InputManager {
    keys: { [key: string]: boolean } = {};
    gamepadIndex: number | null = null;

    constructor() {
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

        // Normalize if length > 1 to prevent faster diagonal movement
        if (move.length() > 1) {
            move.normalize();
        }

        return move;
    }

    isAttackPressed(): boolean {
        // Mouse click is handled separately usually, but we can map a key
        if (this.keys['Enter'] || this.keys['KeyK']) return true;

        // Gamepad Button (X is button 2)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                // Button 2 (X/Square)
                if (gp.buttons[2].pressed) return true;
            }
        }
        return false;
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
        return false;
    }

    isSelectPressed(): boolean {
        if (this.keys['Space'] || this.keys['Enter']) return true;

        // Gamepad A button (button 0)
        if (this.gamepadIndex !== null) {
            const gp = navigator.getGamepads()[this.gamepadIndex];
            if (gp) {
                if (gp.buttons[0]?.pressed) return true;
            }
        }
        return false;
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
        return false;
    }
}
