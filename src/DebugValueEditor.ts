import { Player } from './Player';
import { WeaponRepository } from './items/weapons/WeaponRepository';
import { CoreRegistry } from './items/cores/CoreRegistry';
import { ChipRegistry } from './items/chips/ChipRegistry';
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

    private weaponRepository: WeaponRepository;
    private chipRegistry: ChipRegistry;
    private coreRegistry: CoreRegistry;

    constructor() {
        this.weaponRepository = WeaponRepository.Instance;
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
        panel.style.width = '500px';
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

        // Stats Section with two-column layout
        const statsSection = this.createSection('Player Stats');
        const statsGrid = this.createTwoColumnGrid();

        // Left column
        this.createStatInputInGrid(statsGrid, 'left', 'level', 'Level:', 'number');
        this.createStatInputInGrid(statsGrid, 'left', 'hp', 'HP:', 'number');
        this.createStatInputInGrid(statsGrid, 'left', 'tp', 'TP:', 'number');
        this.createStatInputInGrid(statsGrid, 'left', 'xData', 'X-Data:', 'number');
        this.createStatInputInGrid(statsGrid, 'left', 'strength', 'Strength:', 'number');
        this.createStatInputInGrid(statsGrid, 'left', 'speed', 'Speed:', 'number');

        // Right column
        this.createEmptyRowInGrid(statsGrid); // Empty first row
        this.createStatInputInGrid(statsGrid, 'right', 'maxHp', 'Max', 'number');
        this.createStatInputInGrid(statsGrid, 'right', 'maxTp', 'Max', 'number');
        this.createStatInputInGrid(statsGrid, 'right', 'bits', 'Bits:', 'number');
        this.createStatInputInGrid(statsGrid, 'right', 'defense', 'Defense:', 'number');
        this.createEmptyRowInGrid(statsGrid); // Empty row for spacing

        statsSection.appendChild(statsGrid);
        panel.appendChild(statsSection);

        // Weapon Tech Section with two-column layout
        const weaponTechSection = this.createSection('Weapon Tech');
        const weaponTechGrid = this.createTwoColumnGrid(2);

        // Left column
        this.createStatInputInGrid(weaponTechGrid, 'left', 'swordTech', 'Sword Tech:', 'number');
        this.createStatInputInGrid(weaponTechGrid, 'left', 'doubleSwordTech', 'Double Sword', 'number');

        // Right column
        this.createStatInputInGrid(weaponTechGrid, 'right', 'lanceTech', 'Lance', 'number');
        this.createStatInputInGrid(weaponTechGrid, 'right', 'hammerTech', 'Hammer', 'number');

        weaponTechSection.appendChild(weaponTechGrid);
        panel.appendChild(weaponTechSection);

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

    private createTwoColumnGrid(rows: number = 6): HTMLDivElement {
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gridTemplateRows = `repeat(${rows}, auto)`;
        grid.style.gridAutoFlow = 'column';
        grid.style.gap = '10px';
        return grid;
    }

    private createEmptyRowInGrid(grid: HTMLDivElement): void {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.height = '30px';
        grid.appendChild(emptyDiv);
    }

    private createStatInputInGrid(grid: HTMLDivElement, _column: 'left' | 'right', key: string, label: string, type: string): void {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.fontSize = '14px';
        labelEl.style.minWidth = '80px';
        labelEl.style.flex = '0 0 auto';

        const input = document.createElement('input');
        input.type = type;
        input.style.flex = '1';
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
        grid.appendChild(row);
    }

    private createButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.width = '100%';
        button.style.padding = '10px';
        button.style.backgroundColor = '#666';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.color = '#fff';
        button.style.fontSize = '14px';
        button.style.fontWeight = 'bold';
        button.style.cursor = 'pointer';
        button.style.fontFamily = 'inherit';

        button.addEventListener('click', onClick);

        return button;
    }

    private createSelect(options: { value: string; text: string }[], defaultText: string = ''): HTMLSelectElement {
        const select = document.createElement('select');
        select.style.width = '100%';
        select.style.padding = '8px';
        select.style.backgroundColor = '#222';
        select.style.border = '1px solid #666';
        select.style.borderRadius = '3px';
        select.style.color = '#fff';
        select.style.fontSize = '14px';
        select.style.fontFamily = 'inherit';

        if (defaultText) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = defaultText;
            select.appendChild(defaultOption);
        }

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });

        return select;
    }

    private createInputRow(label: string, type: string = 'number', defaultValue: string = ''): { row: HTMLDivElement; input: HTMLInputElement } {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '10px';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.fontSize = '14px';

        const input = document.createElement('input');
        input.type = type;
        input.value = defaultValue;
        input.style.width = '100px';
        input.style.padding = '5px';
        input.style.backgroundColor = '#222';
        input.style.border = '1px solid #666';
        input.style.borderRadius = '3px';
        input.style.color = '#fff';
        input.style.fontSize = '14px';
        input.style.fontFamily = 'inherit';

        row.appendChild(labelEl);
        row.appendChild(input);

        return { row, input };
    }

    private createWeaponSelector(parent: HTMLElement): void {
        const weapons = this.weaponRepository.getAllWeapons();

        const weaponOptions = weapons.map(weapon => ({
            value: weapon.id,
            text: `${weapon.name} ${ItemLevelHelper.getLevelChar(weapon.level)} (${weapon.weaponType})`
        }));

        const select = this.createSelect(weaponOptions, '-- Select Weapon --');
        select.style.marginBottom = '10px';
        parent.appendChild(select);

        // Damage input
        const { row: damageRow, input: damageInput } = this.createInputRow('Damage:', 'number', '10');
        parent.appendChild(damageRow);

        // Add button
        const addButton = this.createButton('Add Weapon', () => {
            const weaponId = select.value;
            const damage = parseInt(damageInput.value);

            if (weaponId && !isNaN(damage) && this.player) {
                const weapon = this.weaponRepository.getWeaponById(weaponId);
                if (weapon) {
                    // Update damage
                    weapon.damage = damage;
                    this.player.inventory.push(weapon);
                    console.log(`Added weapon: ${weapon.name} (Level ${weapon.level}) with ${damage} damage`);

                    // Reset selection
                    select.value = '';
                    damageInput.value = '10';
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createCoreSelector(parent: HTMLElement): void {
        const cores = this.coreRegistry.getAllCores();

        const coreOptions = cores.map(core => {
            const statsStr = Object.entries(core.stats)
                .map(([key, val]) => `${key}: ${val > 0 ? '+' : ''}${val}`)
                .join(', ');
            return {
                value: core.id,
                text: `${core.name} (${statsStr})`
            };
        });

        const select = this.createSelect(coreOptions, '-- Select Core --');
        select.style.marginBottom = '10px';
        parent.appendChild(select);

        // Level selector (greek chars)
        const levelOptions = [];
        for (let i = 1; i <= 6; i++) {
            const char = ItemLevelHelper.getLevelChar(i);
            levelOptions.push({
                value: String(i),
                text: `${char} Level ${i}`
            });
        }

        const levelSelect = this.createSelect(levelOptions);
        levelSelect.style.width = '100px';
        levelSelect.style.marginBottom = '10px';

        const levelRow = document.createElement('div');
        levelRow.style.display = 'flex';
        levelRow.style.justifyContent = 'space-between';
        levelRow.style.alignItems = 'center';
        levelRow.style.marginBottom = '10px';

        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Level:';
        levelLabel.style.fontSize = '14px';

        levelRow.appendChild(levelLabel);
        levelRow.appendChild(levelSelect);
        parent.appendChild(levelRow);

        // Add button
        const addButton = this.createButton('Add Core', () => {
            const coreId = select.value;

            if (coreId && this.player) {
                const core = this.coreRegistry.getCoreById(coreId);
                if (core) {
                    // Generate unique ID using timestamp and random number
                    const newId = `debug_core_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const lvl = parseInt(levelSelect.value) || 1;
                    const newCore = new CoreItem(newId, core.name, core.buyPrice, core.sellPrice, core.stats, lvl);
                    this.player.inventory.push(newCore);
                    console.log(`Added core: ${core.name} (Level ${lvl})`);

                    // Reset selection
                    select.value = '';
                    if (levelSelect.options.length > 0) levelSelect.selectedIndex = 0;
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createChipSelector(parent: HTMLElement): void {
        const chips = this.chipRegistry.getAllChips();

        const chipOptions = chips.map(chip => {
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
            return {
                value: chip.id,
                text: `${chip.name} (${effectsStr})`
            };
        });

        const select = this.createSelect(chipOptions, '-- Select Chip --');
        select.style.marginBottom = '10px';
        parent.appendChild(select);

        // Level selector (greek chars)
        const levelOptions = [];
        for (let i = 1; i <= 6; i++) {
            const char = ItemLevelHelper.getLevelChar(i);
            levelOptions.push({
                value: String(i),
                text: `${char} Level ${i}`
            });
        }

        const levelSelect = this.createSelect(levelOptions);
        levelSelect.style.width = '100px';
        levelSelect.style.marginBottom = '10px';

        const levelRow = document.createElement('div');
        levelRow.style.display = 'flex';
        levelRow.style.justifyContent = 'space-between';
        levelRow.style.alignItems = 'center';
        levelRow.style.marginBottom = '10px';

        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Level:';
        levelLabel.style.fontSize = '14px';

        levelRow.appendChild(levelLabel);
        levelRow.appendChild(levelSelect);
        parent.appendChild(levelRow);

        // Add button
        const addButton = this.createButton('Add Chip', () => {
            const chipId = select.value;

            if (chipId && this.player) {
                const chip = this.chipRegistry.getChipById(chipId);
                if (chip) {
                    // Generate unique ID using timestamp and random number
                    const newId = `debug_chip_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const lvl = parseInt(levelSelect.value) || 1;
                    const newChip = new ChipItem(newId, chip.name, chip.buyPrice, chip.sellPrice, chip.type, chip.stats, lvl);
                    this.player.inventory.push(newChip);
                    console.log(`Added chip: ${chip.name} (Level ${lvl})`);

                    // Reset selection
                    select.value = '';
                    if (levelSelect.options.length > 0) levelSelect.selectedIndex = 0;
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createBoosterPackButton(parent: HTMLDivElement): void {
        const addButton = this.createButton('Add Booster Pack', () => {
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
        this.updateInputValue('bits', player.money);
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
        this.applyInputValue('bits', (val) => { player.money = Math.max(0, val); });
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
