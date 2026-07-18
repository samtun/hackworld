import { InputManager } from '../controls/InputManager';
import { AudioManager } from '../AudioManager';

const PAUSE_FADE_MS = 300;
const MAPPING_FADE_MS = 250;

/** localStorage key used to persist Performance Mode across sessions */
export const PERFORMANCE_MODE_STORAGE_KEY = 'hackworld_performance_mode';

/** localStorage key used to persist Control Hints visibility across sessions */
export const CONTROL_HINTS_STORAGE_KEY = 'hackworld_control_hints';

export interface PauseMenuCallbacks {
    onContinue: () => void;
    onTogglePerformanceMode: () => boolean;
    onToggleControlHints: () => boolean;
}

interface PauseMenuItem {
    id: string;
    label: string;
    buildEl: (item: PauseMenuItem) => HTMLDivElement;
}

/**
 * Full-screen pause menu shown when the player presses ESC / Start.
 * Backdrop mirrors the death screen; text style mirrors the start-screen main menu.
 * Options: Continue, Performance Mode on/off, Show Control Hints yes/no,
 * Music on/off, and Sound Effects on/off.
 */
export class PauseMenu {
    private readonly overlay: HTMLDivElement;
    private readonly controllerMappingEl: HTMLDivElement;
    private readonly menuContainer: HTMLDivElement;
    private readonly titleElement: HTMLDivElement;
    private controllerMappingVisible = false;
    private prevMappingCancel = false;
    private readonly itemEls: HTMLDivElement[] = [];
    private readonly items: PauseMenuItem[];
    private performanceModeEnabled: boolean;
    private performanceStatusEl!: HTMLSpanElement;
    private controlHintsEnabled: boolean;
    private controlHintsStatusEl!: HTMLSpanElement;
    private musicEnabled = this.audioManager.isMusicEnabled();
    private musicStatusEl!: HTMLSpanElement;
    private sfxEnabled = this.audioManager.isSfxEnabled();
    private sfxStatusEl!: HTMLSpanElement;
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
        private readonly inputManager: InputManager,
        private readonly audioManager: AudioManager,
        performanceModeEnabled: boolean,
        controlHintsEnabled: boolean,
        callbacks: PauseMenuCallbacks,
    ) {
        this.performanceModeEnabled = performanceModeEnabled;
        this.controlHintsEnabled = controlHintsEnabled;
        this.callbacks = callbacks;

        this.items = [
            { id: 'continue', label: 'Continue', buildEl: (item) => this.buildSimpleItem(item) },
            { id: 'controllermapping', label: 'Controller Mapping', buildEl: (item) => this.buildSimpleItem(item) },
            { id: 'performance', label: '', buildEl: (item) => this.buildPerformanceItem(item) },
            { id: 'controlhints', label: '', buildEl: (item) => this.buildControlHintsItem(item) },
            { id: 'music', label: '', buildEl: (item) => this.buildMusicItem(item) },
            { id: 'sfx', label: '', buildEl: (item) => this.buildSfxItem(item) },
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
        this.titleElement = document.createElement('div');
        this.titleElement.style.cssText = [
            'font-size:min(72px, 10vw)',
            'font-weight:bold',
            'color:#8B0000',
            'margin-bottom:50px',
            'text-shadow:4px 4px 8px rgba(0,0,0,0.8)',
            'text-align:center',
            'padding:0 20px',
        ].join(';');
        this.titleElement.textContent = 'Execution Paused';
        this.overlay.appendChild(this.titleElement);

        // Menu items container
        this.menuContainer = document.createElement('div');
        this.menuContainer.style.cssText = [
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'gap:min(28px, 5vh)',
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
            this.menuContainer.appendChild(el);
        });

        this.overlay.appendChild(this.menuContainer);

        // Controller mapping popup – shown in-place over the pause menu backdrop
        this.controllerMappingEl = document.createElement('div');
        this.controllerMappingEl.style.cssText = [
            'position:absolute',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'display:none',
            'opacity:0',
            `transition:opacity ${MAPPING_FADE_MS}ms ease-in-out`,
            'flex-direction:column',
            'justify-content:center',
            'align-items:center',
        ].join(';');
        this.controllerMappingEl.addEventListener('click', () => this.hideControllerMapping());
        this.controllerMappingEl.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hideControllerMapping();
        });
        this.controllerMappingEl.setAttribute('role', 'button');
        this.controllerMappingEl.setAttribute('tabindex', '0');
        this.controllerMappingEl.setAttribute('aria-label', 'Controller mapping – press Escape, B, Enter or Space to close');
        this.controllerMappingEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.hideControllerMapping();
            }
        });

        const mappingImg = document.createElement('img');
        mappingImg.src = 'images/controller_mapping.png';
        mappingImg.alt = 'Xbox controller button layout: A – jump/interact, B – cancel/close, X – attack, Y – skill modifier, D-Pad – navigate, Start/Select – pause/inventory';
        mappingImg.style.cssText = [
            'max-width:88%',
            'max-height:82vh',
            'width:auto',
            'height:auto',
            'object-fit:contain',
        ].join(';');
        // Prevent click on the image from propagating to the close handler
        mappingImg.addEventListener('click', (e) => e.stopPropagation());
        mappingImg.addEventListener('touchend', (e) => e.stopPropagation());
        this.controllerMappingEl.appendChild(mappingImg);

        const mappingHint = document.createElement('div');
        mappingHint.innerHTML =
            '<span class="key-icon">ESC</span> / <span class="btn-icon xbox-b">B</span> Close';
        mappingHint.setAttribute('aria-label', 'Press Escape key or B button to close');
        mappingHint.style.cssText = [
            'margin-top:16px',
            'color:#cccccc',
            'font-family:"Share Tech",Arial,sans-serif',
            'font-size:min(2.5vh, 3vw)',
            'user-select:none',
        ].join(';');
        this.controllerMappingEl.appendChild(mappingHint);

        this.overlay.appendChild(this.controllerMappingEl);
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
        this.refreshAudioSettingsState();
        this.audioManager.playUiOpen();

        // Reset edge-detection states so the key that opened the menu
        // must be released before it can trigger an action
        this.prevConfirm = true;
        this.prevCancel = true;
        this.prevNavUp = this.inputManager.isNavigateUpPressed();
        this.prevNavDown = this.inputManager.isNavigateDownPressed();

        this.overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.overlay.style.opacity = '1';
            });
        });
        this.updateStyles();
        this.updateMusicLabel();
        this.updateSfxLabel();

        this.animFrameId = requestAnimationFrame(() => this.inputLoop());
    }

    /**
     * Hide the pause menu with fade-out
     */
    hide(): void {
        if (!this._visible) return;
        this._visible = false;
        this.controllerMappingVisible = false;
        this.controllerMappingEl.style.opacity = '0';
        this.controllerMappingEl.style.display = 'none';
        this.audioManager.playUiClose();
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

    private buildPerformanceItem(_item: PauseMenuItem): HTMLDivElement {
        const el = document.createElement('div');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'Performance Mode ';
        el.appendChild(labelSpan);

        this.performanceStatusEl = document.createElement('span');
        this.performanceStatusEl.style.color = '#33DDFF';
        this.updatePerformanceLabel();
        el.appendChild(this.performanceStatusEl);
        return el;
    }

    private updatePerformanceLabel(): void {
        if (this.performanceStatusEl) {
            this.performanceStatusEl.textContent = this.performanceModeEnabled ? 'on' : 'off';
        }
    }

    private buildControlHintsItem(_item: PauseMenuItem): HTMLDivElement {
        const el = document.createElement('div');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'Show Control Hints: ';
        el.appendChild(labelSpan);

        this.controlHintsStatusEl = document.createElement('span');
        this.controlHintsStatusEl.style.color = '#33DDFF';
        this.updateControlHintsLabel();
        el.appendChild(this.controlHintsStatusEl);
        return el;
    }

    private updateControlHintsLabel(): void {
        if (this.controlHintsStatusEl) {
            this.controlHintsStatusEl.textContent = this.controlHintsEnabled ? 'yes' : 'no';
        }
    }

    private buildMusicItem(_item: PauseMenuItem): HTMLDivElement {
        const el = document.createElement('div');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'Music ';
        el.appendChild(labelSpan);

        this.musicStatusEl = document.createElement('span');
        this.musicStatusEl.style.color = '#33DDFF';
        this.updateMusicLabel();
        el.appendChild(this.musicStatusEl);
        return el;
    }

    private updateMusicLabel(): void {
        if (this.musicStatusEl) {
            this.musicStatusEl.textContent = this.musicEnabled ? 'on' : 'off';
        }
    }

    private buildSfxItem(_item: PauseMenuItem): HTMLDivElement {
        const el = document.createElement('div');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'Sound Effects ';
        el.appendChild(labelSpan);

        this.sfxStatusEl = document.createElement('span');
        this.sfxStatusEl.style.color = '#33DDFF';
        this.updateSfxLabel();
        el.appendChild(this.sfxStatusEl);
        return el;
    }

    private updateSfxLabel(): void {
        if (this.sfxStatusEl) {
            this.sfxStatusEl.textContent = this.sfxEnabled ? 'on' : 'off';
        }
    }

    private itemStyle(selected: boolean): string {
        const color = selected ? '#ffffff' : '#cccccc';
        const fontWeight = selected ? 'bold' : 'normal';
        return [
            'font-family:"Share Tech",sans-serif',
            'font-size:min(6vh, 6vw)',
            `color:${color}`,
            `font-weight:${fontWeight}`,
            'user-select:none',
            '-webkit-user-select:none',
            'text-align:center',
            'text-shadow:-2px -2px 2px #000, 2px 2px 2px #000, -2px 2px 2px #000, 2px -2px 2px #000',
            'transition:color 0.15s,font-weight 0.15s',
            'padding:0 20px',
        ].join(';');
    }

    private updateStyles(): void {
        this.itemEls.forEach((el, i) => {
            el.style.cssText = this.itemStyle(i === this.selectedIndex);
            el.style.cursor = 'pointer';
        });
        // Restore status span colours after cssText overwrite
        if (this.performanceStatusEl) {
            this.performanceStatusEl.style.color = '#33DDFF';
        }
        if (this.controlHintsStatusEl) {
            this.controlHintsStatusEl.style.color = '#33DDFF';
        }
        if (this.musicStatusEl) {
            this.musicStatusEl.style.color = '#33DDFF';
        }
        if (this.sfxStatusEl) {
            this.sfxStatusEl.style.color = '#33DDFF';
        }
    }

    private navigate(direction: 1 | -1): void {
        let next = this.selectedIndex + direction;
        if (next < 0) next = this.items.length - 1;
        if (next >= this.items.length) next = 0;
        this.selectedIndex = next;
        this.updateStyles();
        this.audioManager.playMenuNavigate();
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
            case 'controllermapping':
                this.showControllerMapping();
                break;
            case 'performance':
                this.performanceModeEnabled = this.callbacks.onTogglePerformanceMode();
                this.updatePerformanceLabel();
                break;
            case 'controlhints':
                this.controlHintsEnabled = this.callbacks.onToggleControlHints();
                this.updateControlHintsLabel();
                break;
            case 'music':
                this.musicEnabled = this.audioManager.toggleMusicEnabled();
                if (this.audioManager.isSfxEnabled()) {
                    this.audioManager.playUiOpen();
                }
                this.updateMusicLabel();
                break;
            case 'sfx':
                this.sfxEnabled = this.toggleSfxWithFeedback();
                this.updateSfxLabel();
                break;
        }
    }

    private showControllerMapping(): void {
        this.controllerMappingVisible = true;
        // Prevent the currently-held cancel button from immediately closing the popup
        this.prevMappingCancel = this.inputManager.isCancelPressed() || this.inputManager.isPausePressed();
        this.audioManager.playUiOpen();
        this.controllerMappingEl.style.display = 'flex';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.menuContainer.style.opacity = '0';
                this.titleElement.style.opacity = '0';
                this.controllerMappingEl.style.opacity = '1';
            });
        });
    }

    private hideControllerMapping(): void {
        this.controllerMappingVisible = false;
        // Prevent the cancel button that closed the popup from also closing the pause menu
        this.prevCancel = true;
        this.audioManager.playUiClose();
        this.controllerMappingEl.style.opacity = '0';
        setTimeout(() => {
            if (!this.controllerMappingVisible) {
                this.controllerMappingEl.style.display = 'none';
                this.menuContainer.style.opacity = '1';
                this.titleElement.style.opacity = '1';
            }
        }, MAPPING_FADE_MS);
    }

    private toggleSfxWithFeedback(): boolean {
        const sfxWasEnabled = this.sfxEnabled;
        if (sfxWasEnabled) {
            this.audioManager.playUiOpen();
        }

        this.audioManager.toggleSfxEnabled();
        const nextSfxEnabled = this.audioManager.isSfxEnabled();
        if (!sfxWasEnabled) {
            this.audioManager.playUiOpen();
        }

        return nextSfxEnabled;
    }

    private refreshAudioSettingsState(): void {
        this.musicEnabled = this.audioManager.isMusicEnabled();
        this.sfxEnabled = this.audioManager.isSfxEnabled();
    }

    private inputLoop(): void {
        if (!this._visible) return;

        const cancelBtn = this.inputManager.isCancelPressed() || this.inputManager.isPausePressed();

        if (this.controllerMappingVisible) {
            if (cancelBtn && !this.prevMappingCancel) {
                this.hideControllerMapping();
            }
            this.prevMappingCancel = cancelBtn;
            this.animFrameId = requestAnimationFrame(() => this.inputLoop());
            return;
        }

        const navUp = this.inputManager.isNavigateUpPressed();
        const navDown = this.inputManager.isNavigateDownPressed();
        const confirmBtn = this.inputManager.isSelectPressed();

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
