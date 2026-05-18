import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';

const MENU_FADE_MS = 600;

export type StartMenuOption = 'continue' | 'newgame' | 'loadgame';

interface MenuItem {
    id: StartMenuOption;
    label: string;
    enabled: boolean;
}

/**
 * Renders the three-option main menu that appears on the start screen after
 * the player presses START. Navigation is handled via keyboard, gamepad, or click.
 * The selected option is confirmed with Enter / gamepad A.
 */
export class StartMenu {
    private readonly container: HTMLDivElement;
    private readonly itemEls: HTMLDivElement[] = [];
    private readonly input: InputManager;
    private readonly items: MenuItem[];
    private selectedIndex: number = 0;
    private backdrop?: HTMLDivElement;

    private readonly onSelect: (option: StartMenuOption) => void;

    private animFrameId?: number;
    private prevNavUp = false;
    private prevNavDown = false;
    // Start as true so the confirm key (Enter/A) must be released once before it is
    // accepted — this prevents the same keypress that opened the menu from immediately
    // confirming the default option.
    private prevConfirm = true;

    // Hidden file input for "Load Game"
    private readonly fileInput: HTMLInputElement;

    constructor(
        container: HTMLElement,
        input: InputManager,
        hasSave: boolean,
        onSelect: (option: StartMenuOption) => void,
    ) {
        this.input = input;
        this.onSelect = onSelect;

        this.items = [
            { id: 'continue', label: 'Continue', enabled: hasSave },
            { id: 'newgame',  label: 'New Game',  enabled: true },
            { id: 'loadgame', label: 'Load Game', enabled: true },
        ];

        // Default selection: "Continue" if save exists, otherwise "New Game"
        this.selectedIndex = hasSave ? 0 : 1;

        // Hidden file picker for Load Game
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);

        // Build the menu container (starts transparent for the 0.6s fade-in)
        this.container = document.createElement('div');
        this.container.style.cssText = [
            'position:absolute',
            'top:4vh',
            'left:0',
            'width:100%',
            'height:100%',
            'display:flex',
            'flex-direction:column',
            'align-items:center',
            'justify-content:center',
            'gap:18px',
            'opacity:0',
            `transition:opacity ${MENU_FADE_MS}ms ease-in-out`,
            'z-index:5',
            'pointer-events:none',
        ].join(';');

        this.items.forEach((item, i) => {
            const el = document.createElement('div');
            el.style.cssText = this.itemStyle(item.enabled, i === this.selectedIndex);
            el.textContent = item.label;
            el.dataset.index = String(i);

            if (item.enabled) {
                el.style.cursor = 'pointer';
                el.style.pointerEvents = 'auto';
                el.addEventListener('click', () => this.selectAndConfirm(i));
                // On mobile the parent start-screen fires preventDefault() on touchstart,
                // which blocks the browser from synthesising a click event.
                // Handle touchend directly so tapping menu items works on touch devices.
                el.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectAndConfirm(i);
                });
            }

            this.itemEls.push(el);
            this.container.appendChild(el);
        });

        container.appendChild(this.container);

        // Fade the logo out and show a dark backdrop behind the menu items
        const logo = container.querySelector('#game-logo') as HTMLElement | null;
        if (logo) {
            logo.style.top = '20vh';
        }

        // Fade in backdrop and menu together
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.container.style.opacity = '1';
                this.container.style.pointerEvents = 'auto';
            });
        });

        // Start input loop
        this.animFrameId = requestAnimationFrame(() => this.inputLoop());
    }

    private itemStyle(enabled: boolean, selected: boolean): string {
        const color = !enabled ? '#555555' : selected ? '#ffffff' : '#cccccc';
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
        this.items.forEach((item, i) => {
            this.itemEls[i].style.cssText = this.itemStyle(item.enabled, i === this.selectedIndex);
            if (item.enabled) {
                this.itemEls[i].style.cursor = 'pointer';
                this.itemEls[i].style.pointerEvents = 'auto';
            }
        });
    }

    private selectAndConfirm(index: number): void {
        this.selectedIndex = index;
        this.updateStyles();
        this.confirm();
    }

    private navigate(direction: 1 | -1): void {
        let next = this.selectedIndex + direction;
        // Wrap and skip disabled items
        for (let guard = 0; guard < this.items.length; guard++) {
            if (next < 0) next = this.items.length - 1;
            if (next >= this.items.length) next = 0;
            if (this.items[next].enabled) {
                this.selectedIndex = next;
                this.updateStyles();
                AudioManager.Instance.playMenuNavigate();
                return;
            }
            next += direction;
        }
    }

    private confirm(): void {
        const item = this.items[this.selectedIndex];
        if (!item.enabled) return;

        if (item.id === 'loadgame') {
            // Open file picker; fire callback when file is chosen
            this.fileInput.onchange = () => {
                if (this.fileInput.files?.[0]) {
                    this.stopLoop();
                    this.onSelect('loadgame');
                }
                this.fileInput.value = '';
            };
            this.fileInput.click();
            return;
        }

        this.stopLoop();
        this.onSelect(item.id);
    }

    /** Returns the file selected via the Load Game dialog (if any). */
    getSelectedFile(): File | undefined {
        return this.fileInput.files?.[0];
    }

    private inputLoop(): void {
        const navUp = this.input.isNavigateUpPressed();
        const navDown = this.input.isNavigateDownPressed();
        const confirm = this.input.isSelectPressed();

        if (navUp && !this.prevNavUp) this.navigate(-1);
        if (navDown && !this.prevNavDown) this.navigate(1);
        if (confirm && !this.prevConfirm) this.confirm();

        this.prevNavUp = navUp;
        this.prevNavDown = navDown;
        this.prevConfirm = confirm;

        this.animFrameId = requestAnimationFrame(() => this.inputLoop());
    }

    private stopLoop(): void {
        if (this.animFrameId !== undefined) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = undefined;
        }
    }

    destroy(): void {
        this.stopLoop();
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        if (this.backdrop?.parentElement) {
            this.backdrop.parentElement.removeChild(this.backdrop);
        }
        if (this.fileInput.parentElement) {
            this.fileInput.parentElement.removeChild(this.fileInput);
        }
    }
}
