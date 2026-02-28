// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputManager } from './InputManager';

vi.mock('./MobileControlsManager', () => ({
    MobileControlsManager: {
        Instance: {
            isMobile: false,
            movementVector: { x: 0, y: 0 },
            isAttackPressed: false,
            isJumpPressed: false,
            isCancelPressed: false,
            isInventoryPressed: false,
            isSkill1Pressed: false,
            isSkill2Pressed: false,
            isSkill3Pressed: false,
            updateState: vi.fn(),
        }
    }
}));

function makeInputManager(): InputManager {
    (InputManager as any).instance = undefined;
    return InputManager.Instance;
}

describe('InputManager', () => {
    let manager: InputManager;

    beforeEach(() => {
        manager = makeInputManager();
    });

    describe('isMobile', () => {
        it('returns false when no mobile controls initialized', () => {
            expect(manager.isMobile).toBe(false);
        });
    });

    describe('isAttackPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isAttackPressed()).toBe(false);
        });

        it('returns true when KeyK is pressed', () => {
            manager.keys['KeyK'] = true;
            expect(manager.isAttackPressed()).toBe(true);
        });
    });

    describe('isJumpPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isJumpPressed()).toBe(false);
        });

        it('returns true when Space is pressed', () => {
            manager.keys['Space'] = true;
            expect(manager.isJumpPressed()).toBe(true);
        });
    });

    describe('isInventoryPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isInventoryPressed()).toBe(false);
        });

        it('returns true when KeyI is pressed', () => {
            manager.keys['KeyI'] = true;
            expect(manager.isInventoryPressed()).toBe(true);
        });
    });

    describe('isNavigateUpPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isNavigateUpPressed()).toBe(false);
        });

        it('returns true with ArrowUp', () => {
            manager.keys['ArrowUp'] = true;
            expect(manager.isNavigateUpPressed()).toBe(true);
        });

        it('returns true with KeyW', () => {
            manager.keys['KeyW'] = true;
            expect(manager.isNavigateUpPressed()).toBe(true);
        });
    });

    describe('isNavigateDownPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isNavigateDownPressed()).toBe(false);
        });

        it('returns true with ArrowDown', () => {
            manager.keys['ArrowDown'] = true;
            expect(manager.isNavigateDownPressed()).toBe(true);
        });

        it('returns true with KeyS', () => {
            manager.keys['KeyS'] = true;
            expect(manager.isNavigateDownPressed()).toBe(true);
        });
    });

    describe('isNavigateLeftPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isNavigateLeftPressed()).toBe(false);
        });

        it('returns true with ArrowLeft', () => {
            manager.keys['ArrowLeft'] = true;
            expect(manager.isNavigateLeftPressed()).toBe(true);
        });

        it('returns true with KeyA', () => {
            manager.keys['KeyA'] = true;
            expect(manager.isNavigateLeftPressed()).toBe(true);
        });
    });

    describe('isNavigateRightPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isNavigateRightPressed()).toBe(false);
        });

        it('returns true with ArrowRight', () => {
            manager.keys['ArrowRight'] = true;
            expect(manager.isNavigateRightPressed()).toBe(true);
        });

        it('returns true with KeyD', () => {
            manager.keys['KeyD'] = true;
            expect(manager.isNavigateRightPressed()).toBe(true);
        });
    });

    describe('isSelectPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isSelectPressed()).toBe(false);
        });

        it('returns true with Enter', () => {
            manager.keys['Enter'] = true;
            expect(manager.isSelectPressed()).toBe(true);
        });
    });

    describe('isCancelPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isCancelPressed()).toBe(false);
        });

        it('returns true with Escape', () => {
            manager.keys['Escape'] = true;
            expect(manager.isCancelPressed()).toBe(true);
        });
    });

    describe('isStartPressed()', () => {
        it('returns false initially', () => {
            expect(manager.isStartPressed()).toBe(false);
        });

        it('returns true with Enter', () => {
            manager.keys['Enter'] = true;
            expect(manager.isStartPressed()).toBe(true);
        });
    });

    describe('isL1Pressed()', () => {
        it('returns false initially', () => {
            expect(manager.isL1Pressed()).toBe(false);
        });

        it('returns true with KeyQ', () => {
            manager.keys['KeyQ'] = true;
            expect(manager.isL1Pressed()).toBe(true);
        });
    });

    describe('isSkill1Pressed()', () => {
        it('returns false initially', () => {
            expect(manager.isSkill1Pressed()).toBe(false);
        });

        it('returns true with KeyQ + Space', () => {
            manager.keys['KeyQ'] = true;
            manager.keys['Space'] = true;
            expect(manager.isSkill1Pressed()).toBe(true);
        });

        it('returns false with only KeyQ', () => {
            manager.keys['KeyQ'] = true;
            expect(manager.isSkill1Pressed()).toBe(false);
        });
    });

    describe('isSkill2Pressed()', () => {
        it('returns false initially', () => {
            expect(manager.isSkill2Pressed()).toBe(false);
        });

        it('returns true with KeyQ + Escape', () => {
            manager.keys['KeyQ'] = true;
            manager.keys['Escape'] = true;
            expect(manager.isSkill2Pressed()).toBe(true);
        });
    });

    describe('isSkill3Pressed()', () => {
        it('returns false initially', () => {
            expect(manager.isSkill3Pressed()).toBe(false);
        });

        it('returns true with KeyQ + KeyK', () => {
            manager.keys['KeyQ'] = true;
            manager.keys['KeyK'] = true;
            expect(manager.isSkill3Pressed()).toBe(true);
        });
    });

    describe('getMovementVector()', () => {
        it('returns (0,0) when no keys pressed', () => {
            const v = manager.getMovementVector();
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
        });

        it('moves up when KeyW is pressed', () => {
            manager.keys['KeyW'] = true;
            const v = manager.getMovementVector();
            expect(v.y).toBe(-1);
            expect(v.x).toBe(0);
        });

        it('moves down when KeyS is pressed', () => {
            manager.keys['KeyS'] = true;
            const v = manager.getMovementVector();
            expect(v.y).toBe(1);
        });

        it('moves left when KeyA is pressed', () => {
            manager.keys['KeyA'] = true;
            const v = manager.getMovementVector();
            expect(v.x).toBe(-1);
        });

        it('moves right when KeyD is pressed', () => {
            manager.keys['KeyD'] = true;
            const v = manager.getMovementVector();
            expect(v.x).toBe(1);
        });

        it('normalizes diagonal movement to length 1', () => {
            manager.keys['KeyW'] = true;
            manager.keys['KeyD'] = true;
            const v = manager.getMovementVector();
            expect(v.length()).toBeCloseTo(1, 5);
        });

        it('moves up when ArrowUp is pressed', () => {
            manager.keys['ArrowUp'] = true;
            const v = manager.getMovementVector();
            expect(v.y).toBe(-1);
        });
    });

    describe('isAttackJustPressed()', () => {
        it('returns false when attack was already pressed in previous frame', () => {
            manager.keys['KeyK'] = true;
            manager.updateState();
            expect(manager.isAttackJustPressed()).toBe(false);
        });

        it('returns true when newly pressed (was not pressed before)', () => {
            // No previous press, now pressed
            manager.keys['KeyK'] = true;
            expect(manager.isAttackJustPressed()).toBe(true);
        });
    });

    describe('isAttackReleased()', () => {
        it('returns true when was pressed and now released', () => {
            manager.keys['KeyK'] = true;
            manager.updateState();
            manager.keys['KeyK'] = false;
            expect(manager.isAttackReleased()).toBe(true);
        });

        it('returns false when never pressed', () => {
            expect(manager.isAttackReleased()).toBe(false);
        });
    });

    describe('isSelectJustPressed()', () => {
        it('returns true when newly pressed', () => {
            manager.keys['Enter'] = true;
            expect(manager.isSelectJustPressed()).toBe(true);
        });

        it('returns false when was already pressed', () => {
            manager.keys['Enter'] = true;
            manager.updateState();
            expect(manager.isSelectJustPressed()).toBe(false);
        });
    });

    describe('isSkill1JustPressed()', () => {
        it('returns true when newly pressed', () => {
            manager.keys['KeyQ'] = true;
            manager.keys['Space'] = true;
            expect(manager.isSkill1JustPressed()).toBe(true);
        });

        it('returns false when was already pressed', () => {
            manager.keys['KeyQ'] = true;
            manager.keys['Space'] = true;
            manager.updateState();
            expect(manager.isSkill1JustPressed()).toBe(false);
        });
    });

    describe('isSkill2JustPressed()', () => {
        it('returns true when newly pressed', () => {
            manager.keys['KeyQ'] = true;
            manager.keys['Escape'] = true;
            expect(manager.isSkill2JustPressed()).toBe(true);
        });
    });

    describe('isSkill3JustPressed()', () => {
        it('returns true when newly pressed', () => {
            manager.keys['KeyQ'] = true;
            manager.keys['KeyK'] = true;
            expect(manager.isSkill3JustPressed()).toBe(true);
        });
    });

    describe('updateState()', () => {
        it('updates previous attack state so isAttackJustPressed returns false next call', () => {
            manager.keys['KeyK'] = true;
            manager.updateState();
            expect(manager.isAttackJustPressed()).toBe(false);
        });

        it('updates previous select state', () => {
            manager.keys['Enter'] = true;
            manager.updateState();
            expect(manager.isSelectJustPressed()).toBe(false);
        });
    });

    describe('isControllerConnected()', () => {
        it('returns false when no gamepad is connected', () => {
            expect(manager.isControllerConnected()).toBe(false);
        });
    });

    describe('getRightThumbstickY()', () => {
        it('returns 0 when no gamepad connected', () => {
            expect(manager.getRightThumbstickY()).toBe(0);
        });
    });
});
