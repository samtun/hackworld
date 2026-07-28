import { describe, it, expect } from 'vitest';
import { InputManager } from './controls/InputManager';
import { MobileControlsManager } from './controls/MobileControlsManager';
import { mockDeep } from 'vitest-mock-extended';

/** Create an InputManager bypassing the window-dependent constructor */
function makeInputManager(mobileControlsManager?: MobileControlsManager): InputManager {
    const inputManager = new InputManager(mobileControlsManager ?? mockDeep<MobileControlsManager>({ isMobile: false }));
    return inputManager;
}

describe('InputManager', () => {
    /** Define navigator.getGamepads to return a gamepad with the specified button indices pressed. */
    function mockGamepadButtons(pressedIndices: number[]) {
        const buttons = Array.from({ length: 20 }, (_, i) => ({
            pressed: pressedIndices.includes(i),
            touched: false,
            value: pressedIndices.includes(i) ? 1 : 0,
        }));
        const mockGp = { buttons, axes: [0, 0, 0, 0], connected: true, id: 'test', index: 0, mapping: 'standard', timestamp: 0, hapticActuators: [], vibrationActuator: null };
        Object.defineProperty(navigator, 'getGamepads', { value: () => [mockGp, null, null, null], configurable: true, writable: true });
    }

    describe('isMobile', () => {
        it.each([
            { isMobile: true },
            { isMobile: false },
        ])('returns isMobile state of MobileControlsManager', ({ isMobile }) => {
            const mobileControlsManagerMock = mockDeep<MobileControlsManager>({
                isMobile,
            });
            const manager = makeInputManager(mobileControlsManagerMock);
            expect(manager.isMobile).toBe(isMobile);
        });
    });

    describe('isAttackPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isAttackPressed()).toBe(false);
        });

        it('returns true when KeyK is pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyK'] = true;
            expect(manager.isAttackPressed()).toBe(true);
        });
    });

    describe('isAttackHeld()', () => {
        it('returns same result as isAttackPressed', () => {
            const manager = makeInputManager();
            expect(manager.isAttackHeld()).toBe(false);
            manager.keys['KeyK'] = true;
            expect(manager.isAttackHeld()).toBe(true);
        });
    });

    describe('isAttackJustPressed()', () => {
        it('returns true when newly pressed (no previous state)', () => {
            const manager = makeInputManager();
            manager.keys['KeyK'] = true;
            expect(manager.isAttackJustPressed()).toBe(true);
        });

        it('returns false when already pressed in previous frame', () => {
            const manager = makeInputManager();
            manager.keys['KeyK'] = true;
            manager.updateState();
            expect(manager.isAttackJustPressed()).toBe(false);
        });
    });

    describe('isAttackReleased()', () => {
        it('returns false when never pressed', () => {
            const manager = makeInputManager();
            expect(manager.isAttackReleased()).toBe(false);
        });

        it('returns true when was pressed and now released', () => {
            const manager = makeInputManager();
            manager.keys['KeyK'] = true;
            manager.updateState();
            manager.keys['KeyK'] = false;
            expect(manager.isAttackReleased()).toBe(true);
        });
    });

    describe('isJumpPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isJumpPressed()).toBe(false);
        });

        it('returns true when Space is pressed', () => {
            const manager = makeInputManager();
            manager.keys['Space'] = true;
            expect(manager.isJumpPressed()).toBe(true);
        });
    });

    describe('isInventoryPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isInventoryPressed()).toBe(false);
        });

        it('returns true when KeyI is pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyI'] = true;
            expect(manager.isInventoryPressed()).toBe(true);
        });
    });

    describe('isNavigateUpPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isNavigateUpPressed()).toBe(false);
        });

        it('returns true with ArrowUp', () => {
            const manager = makeInputManager();
            manager.keys['ArrowUp'] = true;
            expect(manager.isNavigateUpPressed()).toBe(true);
        });

        it('returns true with KeyW', () => {
            const manager = makeInputManager();
            manager.keys['KeyW'] = true;
            expect(manager.isNavigateUpPressed()).toBe(true);
        });
    });

    describe('isNavigateDownPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isNavigateDownPressed()).toBe(false);
        });

        it('returns true with ArrowDown', () => {
            const manager = makeInputManager();
            manager.keys['ArrowDown'] = true;
            expect(manager.isNavigateDownPressed()).toBe(true);
        });

        it('returns true with KeyS', () => {
            const manager = makeInputManager();
            manager.keys['KeyS'] = true;
            expect(manager.isNavigateDownPressed()).toBe(true);
        });
    });

    describe('isNavigateLeftPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isNavigateLeftPressed()).toBe(false);
        });

        it('returns true with ArrowLeft', () => {
            const manager = makeInputManager();
            manager.keys['ArrowLeft'] = true;
            expect(manager.isNavigateLeftPressed()).toBe(true);
        });

        it('returns true with KeyA', () => {
            const manager = makeInputManager();
            manager.keys['KeyA'] = true;
            expect(manager.isNavigateLeftPressed()).toBe(true);
        });
    });

    describe('isNavigateRightPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isNavigateRightPressed()).toBe(false);
        });

        it('returns true with ArrowRight', () => {
            const manager = makeInputManager();
            manager.keys['ArrowRight'] = true;
            expect(manager.isNavigateRightPressed()).toBe(true);
        });

        it('returns true with KeyD', () => {
            const manager = makeInputManager();
            manager.keys['KeyD'] = true;
            expect(manager.isNavigateRightPressed()).toBe(true);
        });
    });

    describe('isSelectPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isSelectPressed()).toBe(false);
        });

        it('returns true with Enter', () => {
            const manager = makeInputManager();
            manager.keys['Enter'] = true;
            expect(manager.isSelectPressed()).toBe(true);
        });
    });

    describe('isSelectJustPressed()', () => {
        it('returns true when newly pressed', () => {
            const manager = makeInputManager();
            manager.keys['Enter'] = true;
            expect(manager.isSelectJustPressed()).toBe(true);
        });

        it('returns false when was already pressed', () => {
            const manager = makeInputManager();
            manager.keys['Enter'] = true;
            manager.updateState();
            expect(manager.isSelectJustPressed()).toBe(false);
        });
    });

    describe('isCancelPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isCancelPressed()).toBe(false);
        });

        it('returns true with Escape', () => {
            const manager = makeInputManager();
            manager.keys['Escape'] = true;
            expect(manager.isCancelPressed()).toBe(true);
        });

        it('returns true with Escape even when menu is closed', () => {
            const manager = makeInputManager();
            manager.menuOpen = false;
            manager.keys['Escape'] = true;
            expect(manager.isCancelPressed()).toBe(true);
        });
    });

    describe('isCancelPressed() — B button dual role', () => {
        it('returns false for B button when menu is closed (B acts as block instead)', () => {
            const manager = makeInputManager();
            manager.menuOpen = false;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1]); // B button pressed
            expect(manager.isCancelPressed()).toBe(false);
        });

        it('returns true for B button when menu is open (B acts as cancel)', () => {
            const manager = makeInputManager();
            manager.menuOpen = true;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1]); // B button pressed
            expect(manager.isCancelPressed()).toBe(true);
        });
    });

    describe('isBlockPressed() — B button dual role', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isBlockPressed()).toBe(false);
        });

        it('returns true with KeyL', () => {
            const manager = makeInputManager();
            manager.keys['KeyL'] = true;
            expect(manager.isBlockPressed()).toBe(true);
        });

        it('returns true for B button when menu is closed', () => {
            const manager = makeInputManager();
            manager.menuOpen = false;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1]); // B button pressed
            expect(manager.isBlockPressed()).toBe(true);
        });

        it('returns false for B button when menu is open (B acts as cancel)', () => {
            const manager = makeInputManager();
            manager.menuOpen = true;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1]); // B button pressed
            expect(manager.isBlockPressed()).toBe(false);
        });

        it('returns false for B button when L1 is held (L1+B = Skill 2, not block)', () => {
            const manager = makeInputManager();
            manager.menuOpen = false;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1, 4]); // B + L1 pressed
            expect(manager.isBlockPressed()).toBe(false);
        });
    });

    describe('consumeCancel() — suppress B as block after menu close', () => {
        it('suppresses B from triggering isBlockPressed while B is still held', () => {
            const manager = makeInputManager();
            manager.menuOpen = false;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1]); // B still held after closing menu
            manager.consumeCancel();
            expect(manager.isBlockPressed()).toBe(false);
        });

        it('does not affect KeyL block while cancel is consumed', () => {
            const manager = makeInputManager();
            manager.consumeCancel();
            manager.keys['KeyL'] = true;
            expect(manager.isBlockPressed()).toBe(true);
        });

        it('clears consumed flag once B is physically released, allowing block again', () => {
            const manager = makeInputManager();
            manager.menuOpen = false;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1]); // B held — consume it
            manager.consumeCancel();
            manager.updateState(); // B still held — flag stays consumed

            mockGamepadButtons([]); // B released
            manager.updateState(); // consumed flag cleared

            mockGamepadButtons([1]); // B pressed again
            expect(manager.isBlockPressed()).toBe(true);
        });

        it('consumed flag stays active until B is released (not just one frame)', () => {
            const manager = makeInputManager();
            manager.menuOpen = false;
            manager.gamepadIndex = 0;
            mockGamepadButtons([1]);
            manager.consumeCancel();
            manager.updateState(); // B still held
            expect(manager.isBlockPressed()).toBe(false); // still suppressed
        });
    });

    describe('isStartPressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isStartPressed()).toBe(false);
        });

        it('returns true with Enter', () => {
            const manager = makeInputManager();
            manager.keys['Enter'] = true;
            expect(manager.isStartPressed()).toBe(true);
        });
    });

    describe('isSelectAndStartPressed()', () => {
        it('returns false when no gamepad connected', () => {
            const manager = makeInputManager();
            expect(manager.isSelectAndStartPressed()).toBe(false);
        });
    });

    describe('isL1Pressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isL1Pressed()).toBe(false);
        });

        it('returns true with KeyQ', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            expect(manager.isL1Pressed()).toBe(true);
        });
    });

    describe('isL3Pressed()', () => {
        it('returns false when no gamepad', () => {
            const manager = makeInputManager();
            expect(manager.isL3Pressed()).toBe(false);
        });
    });

    describe('isR3Pressed()', () => {
        it('returns false when no gamepad', () => {
            const manager = makeInputManager();
            expect(manager.isR3Pressed()).toBe(false);
        });
    });

    describe('isSkill1Pressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isSkill1Pressed()).toBe(false);
        });

        it('returns true with KeyQ + Escape', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['Escape'] = true;
            expect(manager.isSkill1Pressed()).toBe(true);
        });
    });

    describe('isSkill1JustPressed()', () => {
        it('returns true when newly pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['Escape'] = true;
            expect(manager.isSkill1JustPressed()).toBe(true);
        });

        it('returns false when already pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['Escape'] = true;
            manager.updateState();
            expect(manager.isSkill1JustPressed()).toBe(false);
        });
    });

    describe('isSkill2Pressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isSkill2Pressed()).toBe(false);
        });

        it('returns true with KeyQ + Space', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['Space'] = true;
            expect(manager.isSkill2Pressed()).toBe(true);
        });

        it('returns false with only KeyQ', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            expect(manager.isSkill2Pressed()).toBe(false);
        });
    });

    describe('isSkill2JustPressed()', () => {
        it('returns true when newly pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['Space'] = true;
            expect(manager.isSkill2JustPressed()).toBe(true);
        });

        it('returns false when was already pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['Space'] = true;
            manager.updateState();
            expect(manager.isSkill2JustPressed()).toBe(false);
        });
    });

    describe('isSkill3Pressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isSkill3Pressed()).toBe(false);
        });

        it('returns true with KeyQ + KeyK', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['KeyK'] = true;
            expect(manager.isSkill3Pressed()).toBe(true);
        });
    });

    describe('isSkill3JustPressed()', () => {
        it('returns true when newly pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['KeyK'] = true;
            expect(manager.isSkill3JustPressed()).toBe(true);
        });

        it('returns false when already pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyQ'] = true;
            manager.keys['KeyK'] = true;
            manager.updateState();
            expect(manager.isSkill3JustPressed()).toBe(false);
        });
    });

    describe('getMovementVector()', () => {
        it('returns (0,0) when no keys pressed', () => {
            const manager = makeInputManager();
            const v = manager.getMovementVector();
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
        });

        it('moves up when KeyW is pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyW'] = true;
            const v = manager.getMovementVector();
            expect(v.y).toBe(-1);
            expect(v.x).toBe(0);
        });

        it('moves down when KeyS is pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyS'] = true;
            const v = manager.getMovementVector();
            expect(v.y).toBe(1);
        });

        it('moves left when KeyA is pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyA'] = true;
            const v = manager.getMovementVector();
            expect(v.x).toBe(-1);
        });

        it('moves right when KeyD is pressed', () => {
            const manager = makeInputManager();
            manager.keys['KeyD'] = true;
            const v = manager.getMovementVector();
            expect(v.x).toBe(1);
        });

        it('normalizes diagonal movement to length 1', () => {
            const manager = makeInputManager();
            manager.keys['KeyW'] = true;
            manager.keys['KeyD'] = true;
            const v = manager.getMovementVector();
            expect(v.length()).toBeCloseTo(1, 5);
        });

        it('moves up when ArrowUp is pressed', () => {
            const manager = makeInputManager();
            manager.keys['ArrowUp'] = true;
            const v = manager.getMovementVector();
            expect(v.y).toBe(-1);
        });
    });

    describe('updateState()', () => {
        it('updates previousAttackState so isAttackJustPressed returns false', () => {
            const manager = makeInputManager();
            manager.keys['KeyK'] = true;
            manager.updateState();
            expect(manager.isAttackJustPressed()).toBe(false);
        });

        it('updates previousSelectState so isSelectJustPressed returns false', () => {
            const manager = makeInputManager();
            manager.keys['Enter'] = true;
            manager.updateState();
            expect(manager.isSelectJustPressed()).toBe(false);
        });
    });

    describe('isControllerConnected()', () => {
        it('returns false when no gamepad is connected', () => {
            const manager = makeInputManager();
            expect(manager.isControllerConnected()).toBe(false);
        });
    });

    describe('getRightThumbstickY()', () => {
        it('returns 0 when no gamepad connected', () => {
            const manager = makeInputManager();
            expect(manager.getRightThumbstickY()).toBe(0);
        });
    });

    describe('isPausePressed()', () => {
        it('returns false initially', () => {
            const manager = makeInputManager();
            expect(manager.isPausePressed()).toBe(false);
        });

        it('returns true with Escape alone', () => {
            const manager = makeInputManager();
            manager.keys['Escape'] = true;
            expect(manager.isPausePressed()).toBe(true);
        });

        it('returns false with Escape + KeyQ (skill 2 combo)', () => {
            const manager = makeInputManager();
            manager.keys['Escape'] = true;
            manager.keys['KeyQ'] = true;
            expect(manager.isPausePressed()).toBe(false);
        });
    });

    describe('isPauseJustPressed()', () => {
        it('returns true when newly pressed', () => {
            const manager = makeInputManager();
            manager.keys['Escape'] = true;
            expect(manager.isPauseJustPressed()).toBe(true);
        });

        it('returns false when already pressed', () => {
            const manager = makeInputManager();
            manager.keys['Escape'] = true;
            manager.updateState();
            expect(manager.isPauseJustPressed()).toBe(false);
        });

        it('returns true after release and re-press', () => {
            const manager = makeInputManager();
            manager.keys['Escape'] = true;
            manager.updateState();
            manager.keys['Escape'] = false;
            manager.updateState();
            manager.keys['Escape'] = true;
            expect(manager.isPauseJustPressed()).toBe(true);
        });
    });
});
