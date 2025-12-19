import { Player } from './Player';
import { WeaponRegistry } from './items/WeaponRegistry';
import { CoreRegistry } from './items/CoreRegistry';

/**
 * Debug Value Editor - Development tool for live editing player stats and inventory
 * Only available in dev builds (import.meta.env.DEV)
 */
export class DebugValueEditor {
    private container: HTMLDivElement;
    private contentPanel: HTMLDivElement;
    private toggleButton: HTMLDivElement;
    private isExpanded: boolean = false;
    isVisible: boolean = false;

    // Track input elements for updating
    private inputElements: Map<string, HTMLInputElement> = new Map();

    constructor() {
        this.container = this.createContainer();
        this.toggleButton = this.createToggleButton();
        this.contentPanel = this.createContentPanel();
        
        this.container.appendChild(this.toggleButton);
        this.container.appendChild(this.contentPanel);
        document.body.appendChild(this.container);
    }

    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.zIndex = '9999';
        container.style.fontFamily = '"Share Tech", Arial, sans-serif';
        container.style.display = 'none';
        return container;
    }

    private createToggleButton(): HTMLDivElement {
        const button = document.createElement('div');
        button.style.position = 'absolute';
        button.style.top = '0';
        button.style.right = '0';
        button.style.width = '40px';
        button.style.height = '40px';
        button.style.backgroundColor = '#333';
        button.style.border = '2px solid #fff';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.color = '#fff';
        button.style.fontSize = '20px';
        button.style.fontWeight = 'bold';
        button.style.userSelect = 'none';
        button.innerHTML = '▼';
        
        button.addEventListener('click', () => this.toggle());
        
        return button;
    }

    private createContentPanel(): HTMLDivElement {
        const panel = document.createElement('div');
        panel.style.position = 'absolute';
        panel.style.top = '50px';
        panel.style.right = '0';
        panel.style.width = '400px';
        panel.style.maxHeight = '80vh';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        panel.style.border = '2px solid #fff';
        panel.style.borderRadius = '10px';
        panel.style.padding = '20px';
        panel.style.color = '#fff';
        panel.style.overflowY = 'auto';
        panel.style.display = 'none';

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Debug Value Editor';
        title.style.margin = '0 0 20px 0';
        title.style.fontSize = '24px';
        title.style.textAlign = 'center';
        title.style.borderBottom = '2px solid #fff';
        title.style.paddingBottom = '10px';
        panel.appendChild(title);

        // Stats Section
        const statsSection = this.createSection('Player Stats');
        this.createStatInput(statsSection, 'hp', 'HP', 'number');
        this.createStatInput(statsSection, 'maxHp', 'Max HP', 'number');
        this.createStatInput(statsSection, 'tp', 'TP', 'number');
        this.createStatInput(statsSection, 'maxTp', 'Max TP', 'number');
        this.createStatInput(statsSection, 'strength', 'Strength', 'number');
        this.createStatInput(statsSection, 'defense', 'Defense', 'number');
        this.createStatInput(statsSection, 'speed', 'Speed', 'number');
        this.createStatInput(statsSection, 'level', 'Level', 'number');
        this.createStatInput(statsSection, 'xData', 'X-Data', 'number');
        this.createStatInput(statsSection, 'money', 'Money', 'number');
        panel.appendChild(statsSection);

        // Weapons Section
        const weaponsSection = this.createSection('Add Weapon');
        this.createWeaponSelector(weaponsSection);
        panel.appendChild(weaponsSection);

        // Cores Section
        const coresSection = this.createSection('Add Core');
        this.createCoreSelector(coresSection);
        panel.appendChild(coresSection);

        return panel;
    }

    private createSection(title: string): HTMLDivElement {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const header = document.createElement('h3');
        header.textContent = title;
        header.style.margin = '0 0 10px 0';
        header.style.fontSize = '18px';
        header.style.color = '#aaa';
        section.appendChild(header);

        return section;
    }

    private createStatInput(parent: HTMLElement, key: string, label: string, type: string): void {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label + ':';
        labelEl.style.fontSize = '14px';
        labelEl.style.flex = '1';

        const input = document.createElement('input');
        input.type = type;
        input.style.width = '100px';
        input.style.padding = '5px';
        input.style.backgroundColor = '#222';
        input.style.border = '1px solid #666';
        input.style.borderRadius = '3px';
        input.style.color = '#fff';
        input.style.fontSize = '14px';
        input.style.fontFamily = 'inherit';

        this.inputElements.set(key, input);

        row.appendChild(labelEl);
        row.appendChild(input);
        parent.appendChild(row);
    }

    private createWeaponSelector(parent: HTMLElement): void {
        const weapons = WeaponRegistry.getAllWeapons();

        const selectRow = document.createElement('div');
        selectRow.style.marginBottom = '10px';

        const select = document.createElement('select');
        select.style.width = '100%';
        select.style.padding = '8px';
        select.style.backgroundColor = '#222';
        select.style.border = '1px solid #666';
        select.style.borderRadius = '3px';
        select.style.color = '#fff';
        select.style.fontSize = '14px';
        select.style.fontFamily = 'inherit';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select Weapon --';
        select.appendChild(defaultOption);

        weapons.forEach(weapon => {
            const option = document.createElement('option');
            option.value = weapon.id;
            option.textContent = `${weapon.name} (${weapon.type})`;
            select.appendChild(option);
        });

        selectRow.appendChild(select);
        parent.appendChild(selectRow);

        // Damage input
        const damageRow = document.createElement('div');
        damageRow.style.display = 'flex';
        damageRow.style.justifyContent = 'space-between';
        damageRow.style.alignItems = 'center';
        damageRow.style.marginBottom = '10px';

        const damageLabel = document.createElement('label');
        damageLabel.textContent = 'Damage:';
        damageLabel.style.fontSize = '14px';

        const damageInput = document.createElement('input');
        damageInput.type = 'number';
        damageInput.value = '10';
        damageInput.style.width = '100px';
        damageInput.style.padding = '5px';
        damageInput.style.backgroundColor = '#222';
        damageInput.style.border = '1px solid #666';
        damageInput.style.borderRadius = '3px';
        damageInput.style.color = '#fff';
        damageInput.style.fontSize = '14px';
        damageInput.style.fontFamily = 'inherit';

        damageRow.appendChild(damageLabel);
        damageRow.appendChild(damageInput);
        parent.appendChild(damageRow);

        // Add button
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Weapon';
        addButton.style.width = '100%';
        addButton.style.padding = '10px';
        addButton.style.backgroundColor = '#4CAF50';
        addButton.style.border = 'none';
        addButton.style.borderRadius = '5px';
        addButton.style.color = '#fff';
        addButton.style.fontSize = '14px';
        addButton.style.fontWeight = 'bold';
        addButton.style.cursor = 'pointer';
        addButton.style.fontFamily = 'inherit';

        addButton.addEventListener('click', () => {
            const weaponId = select.value;
            const damage = parseInt(damageInput.value);
            
            if (weaponId && !isNaN(damage)) {
                const weapon = WeaponRegistry.getWeaponById(weaponId);
                if (weapon) {
                    // Get player reference from window (set in update method)
                    const player = (window as any).__debugPlayer as Player;
                    if (player) {
                        const newId = (player.inventory.length + 1).toString();
                        player.inventory.push({
                            id: newId,
                            name: weapon.name,
                            type: 'weapon',
                            weaponType: weapon.type,
                            damage: damage,
                            buyPrice: weapon.baseBuyPrice,
                            sellPrice: weapon.baseSellPrice,
                            isEquipped: false
                        });
                        console.log(`Added weapon: ${weapon.name} with ${damage} damage`);
                        
                        // Reset selection
                        select.value = '';
                        damageInput.value = '10';
                    }
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createCoreSelector(parent: HTMLElement): void {
        const cores = CoreRegistry.getAllCores();

        const select = document.createElement('select');
        select.style.width = '100%';
        select.style.padding = '8px';
        select.style.marginBottom = '10px';
        select.style.backgroundColor = '#222';
        select.style.border = '1px solid #666';
        select.style.borderRadius = '3px';
        select.style.color = '#fff';
        select.style.fontSize = '14px';
        select.style.fontFamily = 'inherit';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Select Core --';
        select.appendChild(defaultOption);

        cores.forEach(core => {
            const option = document.createElement('option');
            option.value = core.id;
            const statsStr = Object.entries(core.stats)
                .map(([key, val]) => `${key}: ${val > 0 ? '+' : ''}${val}`)
                .join(', ');
            option.textContent = `${core.name} (${statsStr})`;
            select.appendChild(option);
        });

        parent.appendChild(select);

        // Add button
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Core';
        addButton.style.width = '100%';
        addButton.style.padding = '10px';
        addButton.style.backgroundColor = '#2196F3';
        addButton.style.border = 'none';
        addButton.style.borderRadius = '5px';
        addButton.style.color = '#fff';
        addButton.style.fontSize = '14px';
        addButton.style.fontWeight = 'bold';
        addButton.style.cursor = 'pointer';
        addButton.style.fontFamily = 'inherit';

        addButton.addEventListener('click', () => {
            const coreId = select.value;
            
            if (coreId) {
                const core = CoreRegistry.getCoreById(coreId);
                if (core) {
                    // Get player reference from window (set in update method)
                    const player = (window as any).__debugPlayer as Player;
                    if (player) {
                        const newId = (player.inventory.length + 1).toString();
                        player.inventory.push({
                            id: newId,
                            name: core.name,
                            type: 'core',
                            coreStats: core.stats,
                            buyPrice: core.buyPrice,
                            sellPrice: core.sellPrice,
                            isEquipped: false
                        });
                        console.log(`Added core: ${core.name}`);
                        
                        // Reset selection
                        select.value = '';
                    }
                }
            }
        });

        parent.appendChild(addButton);
    }

    private toggle(): void {
        this.isExpanded = !this.isExpanded;
        
        if (this.isExpanded) {
            this.contentPanel.style.display = 'block';
            this.toggleButton.innerHTML = '▲';
        } else {
            this.contentPanel.style.display = 'none';
            this.toggleButton.innerHTML = '▼';
        }
    }

    show(): void {
        this.isVisible = true;
        this.container.style.display = 'block';
    }

    hide(): void {
        this.isVisible = false;
        this.isExpanded = false;
        this.container.style.display = 'none';
        this.contentPanel.style.display = 'none';
        this.toggleButton.innerHTML = '▼';
    }

    update(player: Player): void {
        if (!this.isVisible || !this.isExpanded) return;

        // Store player reference for button callbacks
        (window as any).__debugPlayer = player;

        // Update all input values from player
        this.updateInputValue('hp', player.hp);
        this.updateInputValue('maxHp', player.maxHp);
        this.updateInputValue('tp', player.tp);
        this.updateInputValue('maxTp', player.maxTp);
        this.updateInputValue('strength', player.strength);
        this.updateInputValue('defense', player.defense);
        this.updateInputValue('speed', player.speed);
        this.updateInputValue('level', player.level);
        this.updateInputValue('xData', player.xData);
        this.updateInputValue('money', player.money);

        // Apply changes from inputs to player (if user has modified them)
        this.applyInputValue('hp', (val) => { player.hp = Math.max(0, Math.min(val, player.maxHp)); });
        this.applyInputValue('maxHp', (val) => { player.maxHp = Math.max(1, val); });
        this.applyInputValue('tp', (val) => { player.tp = Math.max(0, Math.min(val, player.maxTp)); });
        this.applyInputValue('maxTp', (val) => { player.maxTp = Math.max(1, val); });
        this.applyInputValue('strength', (val) => { player.strength = Math.max(0, val); });
        this.applyInputValue('defense', (val) => { player.defense = Math.max(0, val); });
        this.applyInputValue('speed', (val) => { player.speed = Math.max(0, val); });
        this.applyInputValue('level', (val) => { player.level = Math.max(1, val); });
        this.applyInputValue('xData', (val) => { player.xData = Math.max(0, val); });
        this.applyInputValue('money', (val) => { player.money = Math.max(0, val); });
    }

    private updateInputValue(key: string, value: number): void {
        const input = this.inputElements.get(key);
        if (input && document.activeElement !== input) {
            // Only update if input is not currently focused (being edited)
            input.value = value.toString();
        }
    }

    private applyInputValue(key: string, setter: (val: number) => void): void {
        const input = this.inputElements.get(key);
        if (input && input.value !== '') {
            const numValue = parseFloat(input.value);
            if (!isNaN(numValue)) {
                setter(numValue);
            }
        }
    }
}
