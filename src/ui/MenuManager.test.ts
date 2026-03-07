import { describe, it, expect, beforeEach } from 'vitest';
import { MenuManager, MENU_COLORS, MENU_STYLES } from './MenuManager';

function makeMenuManager() {
    (MenuManager as any).instance = undefined;
    return MenuManager.Instance;
}

/** Normalise a CSS colour string the same way jsdom does. */
function normalizeColor(color: string): string {
    const el = document.createElement('div');
    el.style.backgroundColor = color;
    return el.style.backgroundColor;
}

describe('MenuManager', () => {
    let mgr: MenuManager;

    beforeEach(() => {
        mgr = makeMenuManager();
    });

    describe('singleton', () => {
        it('returns the same instance on multiple calls', () => {
            const a = MenuManager.Instance;
            const b = MenuManager.Instance;
            expect(a).toBe(b);
        });

        it('returns a fresh instance after reset', () => {
            const first = MenuManager.Instance;
            (MenuManager as any).instance = undefined;
            const second = MenuManager.Instance;
            expect(first).not.toBe(second);
        });
    });

    describe('createOverlay()', () => {
        it('returns a div element', () => {
            expect(mgr.createOverlay().tagName).toBe('DIV');
        });

        it('has display:none', () => {
            expect(mgr.createOverlay().style.display).toBe('none');
        });

        it('has position:fixed', () => {
            expect(mgr.createOverlay().style.position).toBe('fixed');
        });

        it('has width:100%', () => {
            expect(mgr.createOverlay().style.width).toBe('100%');
        });

        it('has height:100%', () => {
            expect(mgr.createOverlay().style.height).toBe('100%');
        });

        it('has zIndex matching MENU_STYLES.Z_INDEX', () => {
            expect(mgr.createOverlay().style.zIndex).toBe(String(MENU_STYLES.Z_INDEX));
        });

        it('has backgroundColor matching MENU_COLORS.OVERLAY', () => {
            expect(mgr.createOverlay().style.backgroundColor).toBe(normalizeColor(MENU_COLORS.OVERLAY));
        });
    });

    describe('createWindow()', () => {
        it('returns a div element', () => {
            expect(mgr.createWindow().tagName).toBe('DIV');
        });

        it('uses default width 92vw', () => {
            expect(mgr.createWindow().style.width).toBe('92vw');
        });

        it('uses default height 90vh', () => {
            expect(mgr.createWindow().style.height).toBe('90vh');
        });

        it('applies config width override', () => {
            expect(mgr.createWindow({ width: '800px' }).style.width).toBe('800px');
        });

        it('applies config height override', () => {
            expect(mgr.createWindow({ height: '600px' }).style.height).toBe('600px');
        });

        it('has borderRadius set', () => {
            expect(mgr.createWindow().style.borderRadius).toBe('15px');
        });

        it('uses default backgroundColor', () => {
            expect(mgr.createWindow().style.backgroundColor).toBe(normalizeColor(MENU_COLORS.WINDOW_BG));
        });

        it('applies config backgroundColor override', () => {
            expect(mgr.createWindow({ backgroundColor: '#ff0000' }).style.backgroundColor).toBe(normalizeColor('#ff0000'));
        });
    });

    describe('createPanel()', () => {
        it('returns a div element', () => {
            expect(mgr.createPanel().tagName).toBe('DIV');
        });

        it('has default backgroundColor matching MENU_COLORS.PANEL_BG', () => {
            expect(mgr.createPanel().style.backgroundColor).toBe(normalizeColor(MENU_COLORS.PANEL_BG));
        });

        it('applies config backgroundColor override', () => {
            expect(mgr.createPanel({ backgroundColor: '#ff0000' }).style.backgroundColor).toBe(normalizeColor('#ff0000'));
        });

        it('sets gridRow when provided', () => {
            expect(mgr.createPanel({ gridRow: '1 / 3' }).style.gridRow).toBe('1 / 3');
        });

        it('does not set gridRow when not provided', () => {
            expect(mgr.createPanel().style.gridRow).toBe('');
        });

        it('sets gridColumn when provided', () => {
            expect(mgr.createPanel({ gridColumn: '2' }).style.gridColumn).toBe('2');
        });

        it('does not set gridColumn when not provided', () => {
            expect(mgr.createPanel().style.gridColumn).toBe('');
        });
    });

    describe('createTitle()', () => {
        it('sets innerText to the provided text', () => {
            const el = mgr.createTitle('Hello World');
            expect(el.innerText).toBe('Hello World');
        });

        it('uses default color MENU_COLORS.TEXT when none provided', () => {
            expect(mgr.createTitle('test').style.color).toBe(normalizeColor(MENU_COLORS.TEXT));
        });

        it('applies custom color when provided', () => {
            expect(mgr.createTitle('test', '#ff0000').style.color).toBe(normalizeColor('#ff0000'));
        });

        it('has fontSize 28px', () => {
            expect(mgr.createTitle('test').style.fontSize).toBe('28px');
        });

        it('has borderBottom style set', () => {
            expect(mgr.createTitle('test').style.borderBottom).not.toBe('');
        });

        it('returns a div element', () => {
            expect(mgr.createTitle('test').tagName).toBe('DIV');
        });
    });

    describe('createSeparator()', () => {
        it('defaults to height 2px', () => {
            expect(mgr.createSeparator().style.height).toBe('2px');
        });

        it('applies custom height', () => {
            expect(mgr.createSeparator('5px').style.height).toBe('5px');
        });

        it('has backgroundColor matching MENU_COLORS.SEPARATOR', () => {
            expect(mgr.createSeparator().style.backgroundColor).toBe(normalizeColor(MENU_COLORS.SEPARATOR));
        });

        it('has width 100%', () => {
            expect(mgr.createSeparator().style.width).toBe('100%');
        });

        it('returns a div element', () => {
            expect(mgr.createSeparator().tagName).toBe('DIV');
        });
    });

    describe('createGridWindow()', () => {
        it('returns a div element', () => {
            expect(mgr.createGridWindow('1fr 1fr', '1fr').tagName).toBe('DIV');
        });

        it('has display:grid', () => {
            expect(mgr.createGridWindow('1fr 1fr', '1fr').style.display).toBe('grid');
        });

        it('sets gridTemplateColumns', () => {
            expect(mgr.createGridWindow('1fr 2fr', '1fr').style.gridTemplateColumns).toBe('1fr 2fr');
        });

        it('sets gridTemplateRows', () => {
            expect(mgr.createGridWindow('1fr', '100px 1fr').style.gridTemplateRows).toBe('100px 1fr');
        });

        it('passes config overrides to the window', () => {
            expect(mgr.createGridWindow('1fr', '1fr', { width: '500px' }).style.width).toBe('500px');
        });
    });

    describe('createFlexWindow()', () => {
        it('returns a div element', () => {
            expect(mgr.createFlexWindow().tagName).toBe('DIV');
        });

        it('has display:flex', () => {
            expect(mgr.createFlexWindow().style.display).toBe('flex');
        });

        it('defaults flexDirection to column', () => {
            expect(mgr.createFlexWindow().style.flexDirection).toBe('column');
        });

        it('sets flexDirection to row when specified', () => {
            expect(mgr.createFlexWindow('row').style.flexDirection).toBe('row');
        });

        it('passes config overrides to the window', () => {
            expect(mgr.createFlexWindow('column', { height: '400px' }).style.height).toBe('400px');
        });
    });

    describe('createDialogueOverlay()', () => {
        it('returns a div element', () => {
            expect(mgr.createDialogueOverlay().tagName).toBe('DIV');
        });

        it('has position:fixed', () => {
            expect(mgr.createDialogueOverlay().style.position).toBe('fixed');
        });

        it('has bottom:0', () => {
            expect(mgr.createDialogueOverlay().style.bottom).toBe('0px');
        });

        it('has display:none', () => {
            expect(mgr.createDialogueOverlay().style.display).toBe('none');
        });

        it('has zIndex matching MENU_STYLES.Z_INDEX', () => {
            expect(mgr.createDialogueOverlay().style.zIndex).toBe(String(MENU_STYLES.Z_INDEX));
        });
    });
});
