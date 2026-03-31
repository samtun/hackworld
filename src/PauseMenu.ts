import { InputManager } from './InputManager';

const PAUSE_FADE_MS = 300;

export interface PauseMenuCallbacks {
    onContinue: () => void;
    onToggleSSAO: () => boolean;
    onRestartArea: () => void;
}

interface PauseMenuItem {
    id: string;
    label: string;
    buildEl: (item: PauseMenuItem) => HTMLDivElement;
}

/**
 * Full-screen pause menu shown when the player presses ESC / Start.
 * Backdrop mirrors the death screen; text style mirrors the start-screen main menu.
 * Options: Continue, SSAO on/off, Restart Area.
 */
export class PauseMenu {
    private readonly overlay: HTMLDivElement;
    private readonly itemEls: HTMLDivElement[] = [];
    private readonly input: InputManager;
    private readonly items: PauseMenuItem[];
    private ssaoEnabled: boolean;
    private ssaoStatusEl!: HTMLSpanElement;
    private selectedIndex: number = 0;

    private readonly callbacks: PauseMenuCallbacks;

    private animFrameId?: number;
    private prevNavUp = false;
    private prevNavDown = false;
    private prevConfirm = false;
    private prevCancel = false;

    private _visible = false;

    get visible(): boolean {
        return this._visible;
    }

    constructor(
        input: InputManager,
        ssaoEnabled: boolean,
        callbacks: PauseMenuCallbacks,
    ) {
        this.input = input;
        this.ssaoEnabled = ssaoEnabled;
        this.callbacks = callbacks;

        this.items = [
            { id: 'continue', label: 'Continue', buildEl: (item) => this.buildSimpleItem(item) },
            { id: 'ssao', label: '', buildEl: (item) => this.buildSSAOItem(item) },
            { id: 'restart', label: 'Restart Area', buildEl: (item) => this.buildSimpleItem(item) },
        ];

        // Dark backdrop (same as death screen)
        this.overlay = document.createElement('div');
        this.overlay.dataset.pauseMenu = 'true';
        this.overlay.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'background-color:rgba(0,0,0,0.7)',
            'display:none',
            'z-index:1400',
            'opacity:0',
            `transition:opacity ${PAUSE_FADE_MS}ms ease-in-out`,
            'flex-direction:column',
            'justify-content:center',
            'align-items:center',
            'font-family:"Share Tech",Arial,sans-serif',
        ].join(';');

        // Title: "Execution Paused"
        const title = document.createElement('div');
        title.style.cssText = [
            'font-size:72px',
            'font-weight:bold',
            'color:#8B0000',
            'margin-bottom:50px',
            'text-shadow:4px 4px 8px rgba(0,0,0,0.8)',
            'text-align:center',
        ].join(';');
        title.textContent = 'Execution Paused';
        this.overlay.appendChild(title);

        // Menu items container
        const menuContainer = document.createElement('div');
        menuContainer.style.cssText = [
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'gap:18px',
        ].join(';');

        this.items.forEach((item, i) => {
            const el = item.buildEl(item);
            el.dataset.index = String(i);
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => this.selectAndConfirm(i));
            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectAndConfirm(i);
            });
            el.addEventListener('mouseover', () => {
                this.selectedIndex = i;
                this.updateStyles();
            });
            this.itemEls.push(el);
            menuContainer.appendChild(el);
        });

        this.overlay.appendChild(menuContainer);
        document.body.appendChild(this.overlay);

        this.updateStyles();
    }

    /**
     * Show the pause menu with fade-in
     */
    show(): void {
        if (this._visible) return;
        this._visible = true;
        this.selectedIndex = 0;

        // Reset edge-detection states so the key that opened the menu
        // must be released before it can trigger an action
        this.prevConfirm = true;
        this.prevCancel = true;
        this.prevNavUp = this.input.isNavigateUpPressed();
        this.prevNavDown = this.input.isNavigateDownPressed();

        this.overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.overlay.style.opacity = '1';
            });
        });
        this.updateStyles();

        this.animFrameId = requestAnimationFrame(() => this.inputLoop());
    }

    /**
     * Hide the pause menu with fade-out
     */
    hide(): void {
        if (!this._visible) return;
        this._visible = false;
        this.stopLoop();
        this.overlay.style.opacity = '0';
        setTimeout(() => {
            this.overlay.style.display = 'none';
        }, PAUSE_FADE_MS);
    }

    /**
     * Remove all DOM elements
     */
    destroy(): void {
        this.stopLoop();
        if (this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
    }

    // ── Private helpers ─────────────────────────────────────────

    private buildSimpleItem(item: PauseMenuItem): HTMLDivElement {
        const el = document.createElement('div');
        el.textContent = item.label;
        return el;
    }

    private buildSSAOItem(_item: PauseMenuItem): HTMLDivElement {
        const el = document.createElement('div');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'SSAO ';
        el.appendChild(labelSpan);

        this.ssaoStatusEl = document.createElement('span');
        this.ssaoStatusEl.style.color = '#33DDFF';
        this.updateSSAOLabel();
        el.appendChild(this.ssaoStatusEl);
        return el;
    }

    private updateSSAOLabel(): void {
        if (this.ssaoStatusEl) {
            this.ssaoStatusEl.textContent = this.ssaoEnabled ? 'on' : 'off';
        }
    }

    private itemStyle(selected: boolean): string {
        const color = selected ? '#ffffff' : '#cccccc';
        const fontWeight = selected ? 'bold' : 'normal';
        return [
            'font-family:"Share Tech",sans-serif',
            'font-size:6vh',
            `color:${color}`,
            `font-weight:${fontWeight}`,
            'user-select:none',
            '-webkit-user-select:none',
            'text-align:center',
            'text-shadow:-2px -2px 2px #000, 2px 2px 2px #000, -2px 2px 2px #000, 2px -2px 2px #000',
            'transition:color 0.15s,font-weight 0.15s',
        ].join(';');
    }

    private updateStyles(): void {
        this.itemEls.forEach((el, i) => {
            el.style.cssText = this.itemStyle(i === this.selectedIndex);
            el.style.cursor = 'pointer';
        });
        // Restore the SSAO status colour after cssText overwrite
        if (this.ssaoStatusEl) {
            this.ssaoStatusEl.style.color = '#33DDFF';
        }
    }

    private navigate(direction: 1 | -1): void {
        let next = this.selectedIndex + direction;
        if (next < 0) next = this.items.length - 1;
        if (next >= this.items.length) next = 0;
        this.selectedIndex = next;
        this.updateStyles();
    }

    private selectAndConfirm(index: number): void {
        this.selectedIndex = index;
        this.updateStyles();
        this.confirm();
    }

    private confirm(): void {
        const item = this.items[this.selectedIndex];

        switch (item.id) {
            case 'continue':
                this.hide();
                this.callbacks.onContinue();
                break;
            case 'ssao':
                this.ssaoEnabled = this.callbacks.onToggleSSAO();
                this.updateSSAOLabel();
                break;
            case 'restart':
                this.hide();
                this.callbacks.onRestartArea();
                break;
        }
    }

    private inputLoop(): void {
        if (!this._visible) return;

        const navUp = this.input.isNavigateUpPressed();
        const navDown = this.input.isNavigateDownPressed();
        const confirmBtn = this.input.isSelectPressed();
        const cancelBtn = this.input.isCancelPressed() || this.input.isPausePressed();

        if (navUp && !this.prevNavUp) this.navigate(-1);
        if (navDown && !this.prevNavDown) this.navigate(1);
        if (confirmBtn && !this.prevConfirm) this.confirm();
        if (cancelBtn && !this.prevCancel) {
            this.hide();
            this.callbacks.onContinue();
        }

        this.prevNavUp = navUp;
        this.prevNavDown = navDown;
        this.prevConfirm = confirmBtn;
        this.prevCancel = cancelBtn;

        this.animFrameId = requestAnimationFrame(() => this.inputLoop());
    }

    private stopLoop(): void {
        if (this.animFrameId !== undefined) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = undefined;
        }
    }
}
