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
    it('calls element.animate with keyframes', () => {
        const el = { animate: vi.fn() } as unknown as HTMLElement;
        shakeElement(el);
        expect((el as any).animate).toHaveBeenCalled();
    });

    it('does not throw when element.animate throws', () => {
        const el = { animate: () => { throw new Error('not supported'); } } as unknown as HTMLElement;
        expect(() => shakeElement(el)).not.toThrow();
    });
});
