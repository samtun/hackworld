import { Player } from './Player';
import { WeaponRegistry } from './items/weapons/WeaponRegistry';
import { CoreRegistry } from './items/cores/CoreRegistry';
import { ChipRegistry } from './items/chips/ChipRegistry';
import { WeaponItem } from './items/weapons/WeaponItem';
import { WeaponType } from './items/weapons/WeaponType';
import { CoreItem } from './items/cores/CoreItem';
import { ChipItem } from './items/chips/ChipItem';
import { ItemLevelHelper } from './items/ItemLevelHelper';

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

    // Store player reference for button callbacks
    private player: Player | null = null;

    private weaponRegistry: WeaponRegistry;
    private chipRegistry: ChipRegistry;
    private coreRegistry: CoreRegistry;

    constructor() {
        this.weaponRegistry = WeaponRegistry.Instance;
        this.chipRegistry = ChipRegistry.Instance;
        this.coreRegistry = CoreRegistry.Instance;

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
        this.createStatInput(statsSection, 'swordTech', 'Sword Tech', 'number');
        this.createStatInput(statsSection, 'doubleSwordTech', 'Double Sword Tech', 'number');
        this.createStatInput(statsSection, 'lanceTech', 'Lance Tech', 'number');
        this.createStatInput(statsSection, 'hammerTech', 'Hammer Tech', 'number');
        panel.appendChild(statsSection);

        // Weapons Section
        const weaponsSection = this.createSection('Add Weapon');
        this.createWeaponSelector(weaponsSection);
        panel.appendChild(weaponsSection);

        // Cores Section
        const coresSection = this.createSection('Add Core');
        this.createCoreSelector(coresSection);
        panel.appendChild(coresSection);

        // Chips Section
        const chipsSection = this.createSection('Add Chip');
        this.createChipSelector(chipsSection);
        panel.appendChild(chipsSection);

        // Booster Packs Section
        const boosterPacksSection = this.createSection('Booster Packs');
        this.createBoosterPackButton(boosterPacksSection);
        panel.appendChild(boosterPacksSection);

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
        const weapons = this.weaponRegistry.getAllWeapons();

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

        // Level selector (greek chars)
        const levelRow = document.createElement('div');
        levelRow.style.display = 'flex';
        levelRow.style.justifyContent = 'space-between';
        levelRow.style.alignItems = 'center';
        levelRow.style.marginBottom = '10px';

        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Level:';
        levelLabel.style.fontSize = '14px';

        const levelSelect = document.createElement('select');
        levelSelect.style.width = '100px';
        levelSelect.style.padding = '5px';
        levelSelect.style.backgroundColor = '#222';
        levelSelect.style.border = '1px solid #666';
        levelSelect.style.borderRadius = '3px';
        levelSelect.style.color = '#fff';
        levelSelect.style.fontSize = '14px';
        levelSelect.style.fontFamily = 'inherit';

        // Populate from WeaponItem.LEVELS if available, otherwise fall back to 1..5
        const rawLevels = (WeaponItem as any).LEVELS || [];
        if (rawLevels && rawLevels.length > 0) {
            rawLevels.forEach((lvl: any, idx: number) => {
                const num = idx + 1;
                const opt = document.createElement('option');
                opt.value = String(num);
                const char = ItemLevelHelper.getLevelChar(num);
                opt.textContent = `${char}${lvl.name ? ` (${lvl.name})` : ''}`;
                levelSelect.appendChild(opt);
            });
        } else {
            for (let i = 1; i <= 5; i++) {
                const opt = document.createElement('option');
                opt.value = String(i);
                const char = ItemLevelHelper.getLevelChar(i);
                opt.textContent = `${char} Level ${i}`;
                levelSelect.appendChild(opt);
            }
        }

        levelRow.appendChild(levelLabel);
        levelRow.appendChild(levelSelect);
        parent.appendChild(levelRow);

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

            if (weaponId && !isNaN(damage) && this.player) {
                const weapon = this.weaponRegistry.getWeaponById(weaponId);
                if (weapon) {
                    // Generate unique ID using timestamp and random number
                    const newId = `debug_weapon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const lvl = parseInt((levelSelect as HTMLSelectElement).value) || 1;
                    const newItem = new WeaponItem(newId, weapon.name, weapon.baseBuyPrice, weapon.baseSellPrice, weapon.type, weapon.baseDamage, weapon.model, lvl);
                    this.player.inventory.push(newItem);
                    console.log(`Added weapon: ${weapon.name} (Level ${lvl}) with ${damage} damage`);

                    // Reset selection
                    select.value = '';
                    damageInput.value = '10';
                    // reset level selector to first option
                    if (levelSelect.options.length > 0) levelSelect.selectedIndex = 0;
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createCoreSelector(parent: HTMLElement): void {
        const cores = this.coreRegistry.getAllCores();

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

            if (coreId && this.player) {
                const core = this.coreRegistry.getCoreById(coreId);
                if (core) {
                    // Generate unique ID using timestamp and random number
                    const newId = `debug_core_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const newCore = new CoreItem(newId, core.name, core.buyPrice, core.sellPrice, core.stats);
                    this.player.inventory.push(newCore);
                    console.log(`Added core: ${core.name}`);

                    // Reset selection
                    select.value = '';
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createChipSelector(parent: HTMLElement): void {
        const chips = this.chipRegistry.getAllChips();

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
        defaultOption.textContent = '-- Select Chip --';
        select.appendChild(defaultOption);

        chips.forEach(chip => {
            const option = document.createElement('option');
            option.value = chip.id;
            const effectsStr = Object.entries(chip.stats)
                .map(([key, val]) => {
                    if (key === 'weaponRangeMultiplier') {
                        return `Weapon Range: +${((val - 1) * 100).toFixed(0)}%`;
                    } else if (key === 'walkSpeedMultiplier') {
                        return `Walk Speed: +${((val - 1) * 100).toFixed(0)}%`;
                    }
                    return '';
                })
                .filter(str => str !== '')
                .join(', ');
            option.textContent = `${chip.name} (${effectsStr})`;
            select.appendChild(option);
        });

        parent.appendChild(select);

        // Add button
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Chip';
        addButton.style.width = '100%';
        addButton.style.padding = '10px';
        addButton.style.backgroundColor = '#FF9800';
        addButton.style.border = 'none';
        addButton.style.borderRadius = '5px';
        addButton.style.color = '#fff';
        addButton.style.fontSize = '14px';
        addButton.style.fontWeight = 'bold';
        addButton.style.cursor = 'pointer';
        addButton.style.fontFamily = 'inherit';

        addButton.addEventListener('click', () => {
            const chipId = select.value;

            if (chipId && this.player) {
                const chip = this.chipRegistry.getChipById(chipId);
                if (chip) {
                    // Generate unique ID using timestamp and random number
                    const newId = `debug_chip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const newChip = new ChipItem(newId, chip.name, chip.buyPrice, chip.sellPrice, chip.type, chip.stats);
                    this.player.inventory.push(newChip);
                    console.log(`Added chip: ${chip.name}`);

                    // Reset selection
                    select.value = '';
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createBoosterPackButton(parent: HTMLDivElement): void {
        // Add button
        const addButton = document.createElement('button');
        addButton.textContent = 'Add Booster Pack';
        addButton.style.width = '100%';
        addButton.style.padding = '10px';
        addButton.style.backgroundColor = '#ffaa00';
        addButton.style.border = 'none';
        addButton.style.borderRadius = '5px';
        addButton.style.color = '#fff';
        addButton.style.fontSize = '14px';
        addButton.style.fontWeight = 'bold';
        addButton.style.cursor = 'pointer';
        addButton.style.fontFamily = 'inherit';

        addButton.addEventListener('click', () => {
            if (this.player) {
                this.player.collectBoosterPack();
                console.log(`Added booster pack. Total: ${this.player.boosterPacks}`);
            }
        });

        parent.appendChild(addButton);
    }

    toggle(): void {
        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
            this.contentPanel.style.display = 'block';
            this.toggleButton.innerHTML = '▲';
        } else {
            this.contentPanel.style.display = 'none';
            this.toggleButton.innerHTML = '▼';
        }
    }

    expand(): void {
        this.isExpanded = true;
        this.contentPanel.style.display = 'block';
        this.toggleButton.innerHTML = '▲';
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
        this.player = player;

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
        const playerTech = (player as any).tech || {};
        this.updateInputValue('swordTech', playerTech[WeaponType.SWORD] || 0);
        this.updateInputValue('doubleSwordTech', playerTech[WeaponType.DUAL_BLADE] || 0);
        this.updateInputValue('lanceTech', playerTech[WeaponType.LANCE] || 0);
        this.updateInputValue('hammerTech', playerTech[WeaponType.HAMMER] || 0);

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
        this.applyInputValue('swordTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.SWORD] = Math.max(0, val); });
        this.applyInputValue('doubleSwordTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.DUAL_BLADE] = Math.max(0, val); });
        this.applyInputValue('lanceTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.LANCE] = Math.max(0, val); });
        this.applyInputValue('hammerTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.HAMMER] = Math.max(0, val); });
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
