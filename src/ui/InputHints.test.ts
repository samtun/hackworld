import { describe, it, expect, vi } from 'vitest';
import { getHint, getKeyboardHint, HintConfigs, HintConfig } from './InputHints';
import type { InputManager } from '../InputManager';

function makeInput(opts: { isMobile?: boolean; controllerConnected?: boolean }) {
    return {
        isMobile: opts.isMobile ?? false,
        isControllerConnected: vi.fn().mockReturnValue(opts.controllerConnected ?? false),
    } as unknown as InputManager;
}

const sampleConfig: HintConfig = {
    keyboard: 'KEYBOARD_HINT',
    controller: 'CONTROLLER_HINT',
};

// ─── getHint ──────────────────────────────────────────────────────────────────

describe('getHint', () => {
    it('returns controller hint on mobile when controller is not connected', () => {
        const im = makeInput({ isMobile: true, controllerConnected: false });
        expect(getHint(sampleConfig, im)).toBe('CONTROLLER_HINT');
    });

    it('returns controller hint on mobile even when controller is also connected', () => {
        const im = makeInput({ isMobile: true, controllerConnected: true });
        expect(getHint(sampleConfig, im)).toBe('CONTROLLER_HINT');
    });

    it('returns controller hint when gamepad is connected on non-mobile', () => {
        const im = makeInput({ isMobile: false, controllerConnected: true });
        expect(getHint(sampleConfig, im)).toBe('CONTROLLER_HINT');
    });

    it('returns keyboard hint when no gamepad and not mobile', () => {
        const im = makeInput({ isMobile: false, controllerConnected: false });
        expect(getHint(sampleConfig, im)).toBe('KEYBOARD_HINT');
    });
});

// ─── getKeyboardHint ──────────────────────────────────────────────────────────

describe('getKeyboardHint', () => {
    it('always returns the keyboard variant regardless of input device', () => {
        expect(getKeyboardHint(sampleConfig)).toBe('KEYBOARD_HINT');
    });

    it('works with a real HintConfig entry', () => {
        expect(getKeyboardHint(HintConfigs.interact)).toBe(HintConfigs.interact.keyboard);
    });
});

// ─── HintConfigs ─────────────────────────────────────────────────────────────

describe('HintConfigs', () => {
    it('contains all expected config keys', () => {
        const expectedKeys = [
            'interact', 'pickUp', 'enterTeleporter', 'continue', 'continueExit',
            'closeExit', 'buySellClose', 'upgradeClose', 'revealContinue',
            'continuePack', 'inventoryNavigate', 'menuNavigate',
        ];
        for (const key of expectedKeys) {
            expect(HintConfigs).toHaveProperty(key);
        }
    });

    it('interact has ENTER keyboard hint and xbox-a controller hint', () => {
        expect(HintConfigs.interact.keyboard).toContain('ENTER');
        expect(HintConfigs.interact.controller).toContain('xbox-a');
    });

    it('pickUp has ENTER keyboard hint and xbox-a controller hint', () => {
        expect(HintConfigs.pickUp.keyboard).toContain('ENTER');
        expect(HintConfigs.pickUp.controller).toContain('xbox-a');
    });

    it('continueExit keyboard hint contains both ENTER and ESC', () => {
        expect(HintConfigs.continueExit.keyboard).toContain('ENTER');
        expect(HintConfigs.continueExit.keyboard).toContain('ESC');
    });

    it('continueExit controller hint contains both xbox-a and xbox-b', () => {
        expect(HintConfigs.continueExit.controller).toContain('xbox-a');
        expect(HintConfigs.continueExit.controller).toContain('xbox-b');
    });

    it('inventoryNavigate keyboard hint includes navigation and equip keys', () => {
        expect(HintConfigs.inventoryNavigate.keyboard).toContain('ENTER');
        expect(HintConfigs.inventoryNavigate.keyboard).toContain('ESC');
    });

    it('inventoryNavigate controller hint includes D-PAD and equip buttons', () => {
        expect(HintConfigs.inventoryNavigate.controller).toContain('D-PAD');
        expect(HintConfigs.inventoryNavigate.controller).toContain('xbox-a');
        expect(HintConfigs.inventoryNavigate.controller).toContain('xbox-b');
    });

    it('menuNavigate keyboard hint includes navigation keys', () => {
        expect(HintConfigs.menuNavigate.keyboard).toContain('ENTER');
        expect(HintConfigs.menuNavigate.keyboard).toContain('ESC');
    });

    it('menuNavigate controller hint references D-Pad', () => {
        expect(HintConfigs.menuNavigate.controller).toContain('D-Pad');
    });

    it('buySellClose keyboard hint references Buy/Sell and Close', () => {
        expect(HintConfigs.buySellClose.keyboard).toContain('Buy/Sell');
        expect(HintConfigs.buySellClose.keyboard).toContain('ESC');
    });

    it('upgradeClose controller hint references Upgrade and Close buttons', () => {
        expect(HintConfigs.upgradeClose.controller).toContain('Upgrade');
        expect(HintConfigs.upgradeClose.controller).toContain('xbox-b');
    });
});
