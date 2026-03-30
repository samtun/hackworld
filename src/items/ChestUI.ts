import { Item } from './Item';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { resetInputDebounce } from '../ui/UiUtils';
import { formatItemLabel } from './ItemDisplay';
import { EquippableItem } from './EquippableItem';
import { getHint } from '../ui/InputHints';
import { MenuManager, MENU_COLORS } from '../ui/MenuManager';
import { UIManager } from '../ui/UIManager';

/**
 * UI for interacting with loot chests.
 * Shows a two-column layout: chest contents (left) and item details (right).
 * Items can be taken for free – no purchase required.
 */
export class ChestUI {
    container!: HTMLDivElement;
    isVisible: boolean = false;

    private chestList!: HTMLDivElement;
    private chestPanel!: HTMLDivElement;
    private itemDetailsPanel!: HTMLDivElement;
    private itemElements: HTMLDivElement[] = [];

    private selectedIndex: number = 0;
    private needsRender: boolean = false;

    // debounce
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastSelectState: boolean = false;

    private chestInventory: Item[];
    private menuManager: MenuManager;
    private uiManager: UIManager;

    constructor(chestInventory: Item[]) {
        this.chestInventory = chestInventory;
        this.menuManager = MenuManager.Instance;
        this.uiManager = UIManager.Instance;
        this.createUI();
    }

    private createUI(): void {
        // Inject responsive CSS once
        if (!document.getElementById('chest-responsive-styles')) {
            const style = document.createElement('style');
            style.id = 'chest-responsive-styles';
            style.textContent = `
                @media (max-width: 768px) {
                    .chest-ui-window {
                        grid-template-columns: 1fr !important;
                        grid-template-rows: auto auto 1fr auto !important;
                    }
                    .chest-ui-title { grid-column: 1 / 2 !important; }
                    .chest-ui-subtitle-details {
                        grid-row: 4 / 5 !important;
                        grid-column: 1 / 2 !important;
                        border-top: 2px solid ${MENU_COLORS.SEPARATOR} !important;
                    }
                    .chest-ui-panel-details {
                        grid-row: 5 / 6 !important;
                        grid-column: 1 / 2 !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Build overlay
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        // 2-column grid: chest items | item details
        const windowDiv = this.menuManager.createGridWindow(
            '1fr 1fr',
            'auto auto 1fr',
            { width: '70vw' },
        );
        windowDiv.style.gap = '2px';
        windowDiv.classList.add('chest-ui-window');
        this.container.appendChild(windowDiv);

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.innerText = 'CHEST';
        titleDiv.classList.add('chest-ui-title');
        Object.assign(titleDiv.style, {
            gridColumn: '1 / 3',
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            padding: '10px',
            borderBottom: `2px solid ${MENU_COLORS.SEPARATOR}`,
        });
        windowDiv.appendChild(titleDiv);

        // Sub-titles
        const chestTitle = document.createElement('div');
        chestTitle.innerText = 'Chest Contents';
        Object.assign(chestTitle.style, {
            gridRow: '2 / 3',
            gridColumn: '1 / 2',
            padding: '10px 10px 5px 10px',
            fontWeight: 'bold',
            fontSize: '20px',
        });
        windowDiv.appendChild(chestTitle);

        const detailsTitle = document.createElement('div');
        detailsTitle.innerText = 'Item Details';
        detailsTitle.classList.add('chest-ui-subtitle-details');
        Object.assign(detailsTitle.style, {
            gridRow: '2 / 3',
            gridColumn: '2 / 3',
            padding: '10px 10px 5px 10px',
            fontWeight: 'bold',
            fontSize: '20px',
        });
        windowDiv.appendChild(detailsTitle);

        // Chest panel (left)
        this.chestPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.PANEL_TRADER,
            gridRow: '3 / 4',
            gridColumn: '1 / 2',
        });
        this.chestPanel.style.overflowY = 'auto';
        windowDiv.appendChild(this.chestPanel);

        this.chestList = document.createElement('div');
        this.chestPanel.appendChild(this.chestList);

        // Details panel (right)
        const detailsPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.WINDOW_BG,
            gridRow: '3 / 4',
            gridColumn: '2 / 3',
        });
        detailsPanel.classList.add('chest-ui-panel-details');
        detailsPanel.style.overflowY = 'auto';
        windowDiv.appendChild(detailsPanel);

        this.itemDetailsPanel = document.createElement('div');
        this.itemDetailsPanel.style.fontSize = '14px';
        detailsPanel.appendChild(this.itemDetailsPanel);
    }

    show(): void {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.selectedIndex = 0;
        this.needsRender = true;
        resetInputDebounce(this as any);
    }

    hide(): void {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.uiManager.hideControlHints();
    }

    update(player: Player, input: InputManager): void {
        if (!this.isVisible) return;

        // Show control hints
        const hintConfig = {
            keyboard: '<span class="key-icon">ENTER</span> Take <span style="margin: 0 15px;"></span> <span class="key-icon">ESC</span> Close',
            controller: '<span class="btn-icon xbox-a">A</span> Take <span style="margin: 0 15px;"></span> <span class="btn-icon xbox-b">B</span> Close',
        };
        this.uiManager.showControlHints(getHint(hintConfig, input));

        const oldIndex = this.selectedIndex;
        this.handleNavigation(player, input);
        if (oldIndex !== this.selectedIndex) this.needsRender = true;
        if (this.needsRender) {
            this.render();
            this.needsRender = false;
        }
    }

    private render(): void {
        if (!this.chestList) return;
        this.chestList.innerHTML = '';
        this.itemElements = [];

        this.chestInventory.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = formatItemLabel(item, '');
            const isSelected = index === this.selectedIndex;
            Object.assign(itemDiv.style, {
                padding: '8px',
                backgroundColor: isSelected ? MENU_COLORS.ITEM_SELECTED : MENU_COLORS.TRANSPARENT,
                border: isSelected ? '2px solid #fff' : '2px solid transparent',
                transition: 'transform 0.1s',
                position: 'relative',
            });
            if (index < this.chestInventory.length - 1) {
                itemDiv.style.borderBottom = `1px solid ${MENU_COLORS.SEPARATOR}`;
            }
            this.itemElements.push(itemDiv);
            this.chestList.appendChild(itemDiv);
        });

        if (this.itemElements[this.selectedIndex]) {
            this.itemElements[this.selectedIndex].scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }

        // Item details
        const selectedItem = this.chestInventory[this.selectedIndex];
        if (this.itemDetailsPanel) {
            this.itemDetailsPanel.innerHTML = ItemDetailsPanel.generateHTML(selectedItem as Item | undefined);
        }
    }

    private handleNavigation(player: Player, input: InputManager): void {
        const navigateUp = input.isNavigateUpPressed();
        const navigateDown = input.isNavigateDownPressed();
        const select = input.isSelectPressed();
        const cancel = input.isCancelPressed();

        if (cancel) {
            this.hide();
            return;
        }

        if (navigateUp && !this.lastNavigateUpState) {
            if (this.selectedIndex > 0) this.selectedIndex--;
        }

        if (navigateDown && !this.lastNavigateDownState) {
            if (this.selectedIndex < this.chestInventory.length - 1) this.selectedIndex++;
        }

        if (select && !this.lastSelectState) {
            this.takeItem(player);
        }

        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastSelectState = select;
    }

    /** Transfer the selected item from chest to player inventory. */
    private takeItem(player: Player): void {
        const item = this.chestInventory[this.selectedIndex];
        if (!item) return;

        const clone = item.clone();
        if (clone instanceof EquippableItem) {
            clone.isEquipped = false;
        }
        player.inventory.push(clone);
        this.chestInventory.splice(this.selectedIndex, 1);
        if (this.selectedIndex >= this.chestInventory.length && this.selectedIndex > 0) {
            this.selectedIndex--;
        }
        this.needsRender = true;

        // Auto-close when chest is empty
        if (this.chestInventory.length === 0) {
            this.hide();
        }
    }
}
