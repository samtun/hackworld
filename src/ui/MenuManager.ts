import { singleton } from "tsyringe";

/**
 * MenuManager - Centralized system for creating and managing menu UIs
 * Provides unified styling, constants, and factory methods for all menus
 */

// Unified color constants for all menus
export const MENU_COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_BG: '#424242',
    PANEL_TRADER: '#4a3520',
    PANEL_PLAYER: '#203a4a',
    PANEL_STATS: '#424242',
    PANEL_LOOT: '#555',
    PANEL_EQUIPPED: '#90a4ae',
    ITEM_HOVER: '#666',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB',
    XDATA_COLOR: '#00ffff',
    COST_COLOR: '#ffd700',
    MAXED_COLOR: '#ff6666',
    NAME_BG: 'rgba(0, 0, 0, 0.7)',
    NAME_TEXT: '#ffd700',
    SPECIAL: '#ff69b4',
    NORMAL: '#aaaaaa',
    UNCOMMON: '#4ec9ff',
    COLLECTED: '#44ff44',
    MISSING: '#444444',
    CARD_BG: '#1a1a1a',
    SLOT_BG: '#cfd8dc'
};

// Unified style constants
export const MENU_STYLES = {
    FONT_FAMILY: '"Share Tech", Arial, sans-serif',
    BORDER_RADIUS: '10px',
    BORDER_WIDTH: '2px',
    WINDOW_PADDING: '20px',
    PANEL_PADDING: '20px',
    GRID_GAP: '20px',
    SLOT_GAP: '15px',
    Z_INDEX: 1000,
    Z_INDEX_HINTS: 1100 // Above menus
};

export interface MenuConfig {
    width?: string;
    height?: string;
    maxWidth?: string;
    maxHeight?: string;
    backgroundColor?: string;
    padding?: string;
    margin?: string;
}

export interface PanelConfig {
    backgroundColor?: string;
    gridRow?: string;
    gridColumn?: string;
    padding?: string;
    margin?: string;
}

/**
 * MenuManager - Singleton for creating unified menu components
 */
@singleton()
export class MenuManager {
    /**
     * Create a fixed-position overlay (for menus that use fixed positioning)
     */
    createOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: MENU_COLORS.OVERLAY,
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: String(MENU_STYLES.Z_INDEX)
        });
        return overlay;
    }

    /**
     * Create a main window container for menus
     */
    createWindow(config?: MenuConfig): HTMLDivElement {
        const window = document.createElement('div');
        Object.assign(window.style, {
            width: config?.width || '92vw',
            height: config?.height || '90vh',
            maxWidth: config?.maxWidth || '1200px',
            maxHeight: config?.maxHeight || '800px',
            backgroundColor: config?.backgroundColor || MENU_COLORS.WINDOW_BG,
            borderRadius: '15px',
            border: `${MENU_STYLES.BORDER_WIDTH} solid ${MENU_COLORS.BORDER}`,
            padding: config?.padding || MENU_STYLES.WINDOW_PADDING,
            boxSizing: 'border-box',
            color: MENU_COLORS.TEXT,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            margin: config?.margin || '0 0 6vh 0',
        });
        return window;
    }

    /**
     * Create a panel within a window
     */
    createPanel(config?: PanelConfig): HTMLDivElement {
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            backgroundColor: config?.backgroundColor || MENU_COLORS.PANEL_BG,
            borderRadius: MENU_STYLES.BORDER_RADIUS,
            border: `${MENU_STYLES.BORDER_WIDTH} solid ${MENU_COLORS.BORDER}`,
            color: MENU_COLORS.TEXT,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            padding: config?.padding || MENU_STYLES.PANEL_PADDING,
            margin: config?.margin,
        });

        if (config?.gridRow) {
            panel.style.gridRow = config.gridRow;
        }
        if (config?.gridColumn) {
            panel.style.gridColumn = config.gridColumn;
        }

        return panel;
    }

    /**
     * Create a title element for menus
     */
    createTitle(text: string, color?: string): HTMLDivElement {
        const title = document.createElement('div');
        title.innerText = text;
        Object.assign(title.style, {
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            color: color || MENU_COLORS.TEXT,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            padding: '10px',
            borderBottom: `2px solid ${MENU_COLORS.SEPARATOR}`,
            marginBottom: '15px'
        });
        return title;
    }

    /**
     * Create a separator line
     */
    createSeparator(height: string = '2px'): HTMLDivElement {
        const separator = document.createElement('div');
        Object.assign(separator.style, {
            height: height,
            backgroundColor: MENU_COLORS.SEPARATOR,
            width: '100%',
            margin: '10px 0'
        });
        return separator;
    }

    /**
     * Create a grid-based window layout
     */
    createGridWindow(
        columns: string,
        rows: string,
        config?: MenuConfig
    ): HTMLDivElement {
        const window = this.createWindow(config);
        Object.assign(window.style, {
            display: 'grid',
            gridTemplateColumns: columns,
            gridTemplateRows: rows,
            gap: MENU_STYLES.GRID_GAP
        });
        return window;
    }

    /**
     * Create a flex-based window layout
     */
    createFlexWindow(
        direction: 'column' | 'row' = 'column',
        config?: MenuConfig
    ): HTMLDivElement {
        const window = this.createWindow(config);
        Object.assign(window.style, {
            display: 'flex',
            flexDirection: direction
        });
        return window;
    }

    /**
     * Create a dialogue-style overlay (lower-third of screen)
     */
    createDialogueOverlay(): HTMLDivElement {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            height: '33.33%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            padding: '20px',
            boxSizing: 'border-box',
            zIndex: String(MENU_STYLES.Z_INDEX),
            fontFamily: MENU_STYLES.FONT_FAMILY
        });
        return overlay;
    }
}
