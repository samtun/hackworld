// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { resetInputDebounce, shakeElement } from './UiUtils';

describe('resetInputDebounce', () => {
    it('sets all defined properties to true', () => {
        const target = {
            lastSelectState: false,
            lastNavigateUpState: false,
            lastNavigateDownState: false,
            lastNavigateLeftState: false,
            lastNavigateRightState: false,
            lastCancelState: false,
        };
        resetInputDebounce(target);
        expect(target.lastSelectState).toBe(true);
        expect(target.lastNavigateUpState).toBe(true);
        expect(target.lastNavigateDownState).toBe(true);
        expect(target.lastNavigateLeftState).toBe(true);
        expect(target.lastNavigateRightState).toBe(true);
        expect(target.lastCancelState).toBe(true);
    });

    it('only sets properties that are already defined (not undefined)', () => {
        const target: { lastSelectState?: boolean; lastCancelState?: boolean } = {
            lastSelectState: false,
            // lastCancelState intentionally omitted
        };
        resetInputDebounce(target);
        expect(target.lastSelectState).toBe(true);
        expect(target.lastCancelState).toBeUndefined();
    });

    it('does not throw when called with empty object', () => {
        expect(() => resetInputDebounce({})).not.toThrow();
    });
});

describe('shakeElement', () => {
    it('does not throw when element.animate is available', () => {
        const el = document.createElement('div');
        expect(() => shakeElement(el)).not.toThrow();
    });

    it('does not throw when element.animate throws', () => {
        const el = document.createElement('div');
        (el as any).animate = () => { throw new Error('not supported'); };
        expect(() => shakeElement(el)).not.toThrow();
    });
});
