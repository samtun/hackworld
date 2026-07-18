import { Player } from './player/Player';
import { WeaponRepository } from './items/weapons/WeaponRepository';
import { CoreRepository } from './items/cores/CoreRepository';
import { ChipRepository } from './items/chips/ChipRepository';
import { WeaponType } from './items/weapons/WeaponType';
import { ItemLevelHelper } from './items/ItemLevelHelper';
import { GameProgressManager } from './GameProgressManager';
import { SkillTechType } from './player/skills/SkillType';
import { Album, CardDefinitions } from './items/cards/Card';
import { CardCollection } from './items/cards/CardCollection';
import { CardManager } from './items/cards/CardManager';
import { UIManager } from './ui/UIManager';

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

    // Collider visibility
    collidersVisible: boolean = true;
    onCollidersToggle?: (visible: boolean) => void;
    private colliderToggleButton?: HTMLButtonElement;

    // Position logging
    positionLoggingEnabled: boolean = false;
    private positionLogButton?: HTMLButtonElement;
    private readonly POSITION_LOG_INTERVAL: number = 0.5;
    private positionLogTimer: number = 0;

    // Track input elements for updating
    private inputElements: Map<string, HTMLInputElement> = new Map();

    // Store player reference for button callbacks
    private player: Player | null = null;

    private readonly weaponRepository: WeaponRepository;
    private readonly chipRepository: ChipRepository;
    private readonly coreRepository: CoreRepository;
    private readonly cardCollection: CardCollection;
    private readonly gameProgressManager: GameProgressManager;
    private readonly uiManager: UIManager;

    constructor(
        weaponRepository: WeaponRepository,
        chipRepository: ChipRepository,
        coreRepository: CoreRepository,
        cardCollection: CardCollection,
        gameProgressManager: GameProgressManager,
        uiManager: UIManager
    ) {
        this.weaponRepository = weaponRepository;
        this.chipRepository = chipRepository;
        this.coreRepository = coreRepository;
        this.cardCollection = cardCollection;
        this.gameProgressManager = gameProgressManager;
        this.uiManager = uiManager;

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

        // Top row with toggle buttons
        const topButtonRow = document.createElement('div');
        topButtonRow.style.display = 'flex';
        topButtonRow.style.gap = '10px';
        topButtonRow.style.marginBottom = '15px';

        // Collider toggle button
        this.colliderToggleButton = this.createButton('Colliders: ON', () => {
            this.collidersVisible = !this.collidersVisible;
            this.updateColliderButtonText();
            if (this.onCollidersToggle) {
                this.onCollidersToggle(this.collidersVisible);
            }
        });
        this.colliderToggleButton.style.flex = '1';
        this.colliderToggleButton.style.backgroundColor = '#4a4';
        topButtonRow.appendChild(this.colliderToggleButton);

        // Position logging toggle button
        this.positionLogButton = this.createButton('Pos Log: OFF', () => {
            this.positionLoggingEnabled = !this.positionLoggingEnabled;
            this.updatePositionLogButtonText();
        });
        this.positionLogButton.style.flex = '1';
        this.positionLogButton.style.backgroundColor = '#666';
        topButtonRow.appendChild(this.positionLogButton);

        panel.appendChild(topButtonRow);

        // Stats Section - using regular grid without auto-flow for precise placement
        const statsSection = this.createSection('Player Stats');
        const statsContainer = document.createElement('div');
        statsContainer.style.display = 'flex';
        statsContainer.style.flexDirection = 'column';
        statsContainer.style.gap = '8px';

        // Row 2: HP split (full width)
        const hpRow = document.createElement('div');
        hpRow.style.display = 'flex';
        hpRow.style.gap = '8px';
        this.createSplitStatInputInRow(hpRow, 'hp', 'maxHp', 'HP:', 'number');
        statsContainer.appendChild(hpRow);

        // Row 3: TP split (full width)
        const tpRow = document.createElement('div');
        tpRow.style.display = 'flex';
        tpRow.style.gap = '8px';
        this.createSplitStatInputInRow(tpRow, 'tp', 'maxTp', 'TP:', 'number');
        statsContainer.appendChild(tpRow);

        // Row 6: X-Data + Money (two columns)
        const xDataMoneyRow = document.createElement('div');
        xDataMoneyRow.style.display = 'grid';
        xDataMoneyRow.style.gridTemplateColumns = '1fr 1fr';
        xDataMoneyRow.style.gap = '10px';
        this.createStatInputInRow(xDataMoneyRow, 'xData', 'X-Data:', 'number');
        this.createStatInputInRow(xDataMoneyRow, 'money', 'Money:', 'number');
        statsContainer.appendChild(xDataMoneyRow);

        // Row 7: Game Progress (full width)
        const progressRow = document.createElement('div');
        progressRow.style.display = 'grid';
        progressRow.style.gridTemplateColumns = '1fr';
        progressRow.style.gap = '10px';
        this.createStatInputInRow(progressRow, 'gameProgress', 'Quest Progress:', 'number');
        statsContainer.appendChild(progressRow);

        statsSection.appendChild(statsContainer);

        // Add Level Up button
        const levelUpButton = this.createButton('Level Up', () => {
            if (this.player) {
                const expNeeded = this.player.expRequired - this.player.exp;
                this.player.gainExp(expNeeded);
                console.log(`Leveled up! Now level ${this.player.level}`);
            }
        });
        levelUpButton.style.marginTop = '10px';
        statsSection.appendChild(levelUpButton);

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

        // Skill Tech Section with two-column layout
        const skillTechSection = this.createSection('Skill Tech');
        const skillTechGrid = this.createTwoColumnGrid(2);

        // Left column
        this.createStatInputInGrid(skillTechGrid, 'left', 'recoveryTech', 'Recovery:', 'number');
        this.createStatInputInGrid(skillTechGrid, 'left', 'blastTech', 'Blast:', 'number');

        // Right column
        this.createStatInputInGrid(skillTechGrid, 'right', 'rangedTech', 'Ranged:', 'number');

        skillTechSection.appendChild(skillTechGrid);
        panel.appendChild(skillTechSection);

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
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';

        this.inputElements.set(key, input);

        row.appendChild(labelEl);
        row.appendChild(input);
        grid.appendChild(row);
    }

    private createStatInputInRow(parent: HTMLElement, key: string, label: string, type: string): void {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';

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
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';

        this.inputElements.set(key, input);

        container.appendChild(labelEl);
        container.appendChild(input);
        parent.appendChild(container);
    }

    private createSplitStatInputInRow(parent: HTMLElement, currentKey: string, maxKey: string, label: string, type: string): void {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
        container.style.width = '100%';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.fontSize = '14px';
        labelEl.style.minWidth = '80px';
        labelEl.style.flex = '0 0 auto';

        // Current value input
        const currentInput = document.createElement('input');
        currentInput.type = type;
        currentInput.style.flex = '1';
        currentInput.style.padding = '5px';
        currentInput.style.backgroundColor = '#222';
        currentInput.style.border = '1px solid #666';
        currentInput.style.borderRadius = '3px';
        currentInput.style.color = '#fff';
        currentInput.style.fontSize = '14px';
        currentInput.style.fontFamily = 'inherit';
        currentInput.style.width = '100%';
        currentInput.style.boxSizing = 'border-box';

        // Separator
        const separator = document.createElement('span');
        separator.textContent = '/';
        separator.style.color = '#fff';
        separator.style.fontSize = '14px';
        separator.style.padding = '0 4px';

        // Max value input
        const maxInput = document.createElement('input');
        maxInput.type = type;
        maxInput.style.flex = '1';
        maxInput.style.padding = '5px';
        maxInput.style.backgroundColor = '#222';
        maxInput.style.border = '1px solid #666';
        maxInput.style.borderRadius = '3px';
        maxInput.style.color = '#fff';
        maxInput.style.fontSize = '14px';
        maxInput.style.fontFamily = 'inherit';
        maxInput.style.width = '100%';
        maxInput.style.boxSizing = 'border-box';

        this.inputElements.set(currentKey, currentInput);
        this.inputElements.set(maxKey, maxInput);

        container.appendChild(labelEl);
        container.appendChild(currentInput);
        container.appendChild(separator);
        container.appendChild(maxInput);
        parent.appendChild(container);
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


    private createWeaponSelector(parent: HTMLElement): void {
        const weapons = this.weaponRepository.getAllWeapons();

        const weaponOptions = weapons.map(weapon => ({
            value: weapon.id,
            text: `${weapon.name} ${ItemLevelHelper.getLevelChar(weapon.level)} (${weapon.weaponType})`
        }));

        const select = this.createSelect(weaponOptions, '-- Select Weapon --');
        select.style.marginBottom = '10px';
        parent.appendChild(select);

        // Add button
        const addButton = this.createButton('Add Weapon', () => {
            const weaponId = select.value;

            if (weaponId && this.player) {
                const weapon = this.weaponRepository.getWeaponById(weaponId);
                if (weapon) {
                    this.player.inventory.push(weapon);
                    console.log(`Added weapon: ${weapon.name} (Level ${weapon.level})`);

                    // Reset selection
                    select.value = '';
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createCoreSelector(parent: HTMLElement): void {
        const cores = this.coreRepository.getAllCores();

        const coreOptions = cores.map(core => {
            const statsStr = Object.entries(core.stats)
                .map(([key, val]) => `${key}: ${(val as number) > 0 ? '+' : ''}${val}`)
                .join(', ');
            return {
                value: core.id,
                text: `${core.name} ${ItemLevelHelper.getLevelChar(core.level)} (${statsStr})`
            };
        });

        const select = this.createSelect(coreOptions, '-- Select Core --');
        select.style.marginBottom = '10px';
        parent.appendChild(select);

        // Add button
        const addButton = this.createButton('Add Core', () => {
            const coreId = select.value;

            if (coreId && this.player) {
                const core = this.coreRepository.getCoreById(coreId);
                if (core) {
                    this.player.inventory.push(core);
                    console.log(`Added core: ${core.name} (Level ${core.level})`);

                    // Reset selection
                    select.value = '';
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createChipSelector(parent: HTMLElement): void {
        const chips = this.chipRepository.getAllChips();

        const chipOptions = chips.map(chip => {
            const effectsStr = Object.entries(chip.stats)
                .map(([key, val]) => {
                    if (key === 'weaponRangeMultiplier') {
                        return `Weapon Range: +${(((val as number) - 1) * 100).toFixed(0)}%`;
                    } else if (key === 'walkSpeedMultiplier') {
                        return `Walk Speed: +${(((val as number) - 1) * 100).toFixed(0)}%`;
                    }
                    return '';
                })
                .filter(str => str !== '')
                .join(', ');
            return {
                value: chip.id,
                text: `${chip.name} ${ItemLevelHelper.getLevelChar(chip.level)} (${effectsStr})`
            };
        });

        const select = this.createSelect(chipOptions, '-- Select Chip --');
        select.style.marginBottom = '10px';
        parent.appendChild(select);

        // Add button
        const addButton = this.createButton('Add Chip', () => {
            const chipId = select.value;

            if (chipId && this.player) {
                const chip = this.chipRepository.getChipById(chipId);
                if (chip) {
                    this.player.inventory.push(chip);
                    console.log(`Added chip: ${chip.name} (Level ${chip.level})`);

                    // Reset selection
                    select.value = '';
                }
            }
        });

        parent.appendChild(addButton);
    }

    private createBoosterPackButton(parent: HTMLDivElement): void {
        // Album complete row: select on the left, button on the right
        const albumRow = document.createElement('div');
        albumRow.style.display = 'flex';
        albumRow.style.gap = '10px';
        albumRow.style.marginBottom = '10px';

        const albumOptions = CardDefinitions.getAlbums().map(album => ({
            value: album,
            text: album
        }));
        const albumSelect = this.createSelect(albumOptions, '-- Select Album --');
        albumSelect.style.flex = '1';
        albumSelect.style.marginBottom = '0';
        albumRow.appendChild(albumSelect);

        const completeButton = document.createElement('button');
        completeButton.textContent = 'Complete Album';
        completeButton.style.padding = '8px 12px';
        completeButton.style.backgroundColor = '#666';
        completeButton.style.border = 'none';
        completeButton.style.borderRadius = '5px';
        completeButton.style.color = '#fff';
        completeButton.style.fontSize = '14px';
        completeButton.style.fontWeight = 'bold';
        completeButton.style.cursor = 'pointer';
        completeButton.style.fontFamily = 'inherit';
        completeButton.style.whiteSpace = 'nowrap';
        completeButton.addEventListener('click', () => {
            const selected = albumSelect.value as Album;
            if (!selected) return;
            const cards = CardDefinitions.getAlbumCards(selected);
            cards.forEach(card => this.cardCollection.addCard(card));
            this.uiManager.showAlbumCompleteBanner(selected, CardManager.getAlbumReward(selected));
            console.log(`Completed album ${selected}`);
            albumSelect.value = '';
        });
        albumRow.appendChild(completeButton);

        parent.appendChild(albumRow);

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

        // Enable colliders by default when showing
        this.collidersVisible = true;
        this.updateColliderButtonText();
        if (this.onCollidersToggle) {
            this.onCollidersToggle(true);
        }
    }

    hide(): void {
        this.isVisible = false;
        this.isExpanded = false;
        this.container.style.display = 'none';
        this.contentPanel.style.display = 'none';
        this.toggleButton.innerHTML = '▼';

        // Hide colliders when hiding editor
        this.collidersVisible = false;
        this.updateColliderButtonText();
        if (this.onCollidersToggle) {
            this.onCollidersToggle(false);
        }
    }

    private updateColliderButtonText(): void {
        if (this.colliderToggleButton) {
            this.colliderToggleButton.textContent = `Colliders: ${this.collidersVisible ? 'ON' : 'OFF'}`;
            this.colliderToggleButton.style.backgroundColor = this.collidersVisible ? '#4a4' : '#666';
        }
    }

    private updatePositionLogButtonText(): void {
        if (this.positionLogButton) {
            this.positionLogButton.textContent = `Pos Log: ${this.positionLoggingEnabled ? 'ON' : 'OFF'}`;
            this.positionLogButton.style.backgroundColor = this.positionLoggingEnabled ? '#4a4' : '#666';
        }
    }

    update(player: Player, dt: number): void {
        if (!this.isVisible || !this.isExpanded) return;

        // Store player reference for button callbacks
        this.player = player;

        // Log player position if enabled (throttled to every 0.5s)
        if (this.positionLoggingEnabled) {
            this.positionLogTimer += dt;
            if (this.positionLogTimer >= this.POSITION_LOG_INTERVAL) {
                this.positionLogTimer = 0;
                console.log(`Player position: x=${player.position.x.toFixed(2)}, y=${player.position.y.toFixed(2)}, z=${player.position.z.toFixed(2)}`);
            }
        }

        // Update all input values from player
        this.updateInputValue('hp', player.hp);
        this.updateInputValue('maxHp', player.maxHp);
        this.updateInputValue('tp', player.tp);
        this.updateInputValue('maxTp', player.maxTp);
        this.updateInputValue('strength', player.strengthPoints);
        this.updateInputValue('defense', player.defensePoints);
        this.updateInputValue('agility', player.agilityPoints);
        this.updateInputValue('luck', player.luckPoints);
        this.updateInputValue('level', player.level);
        this.updateInputValue('xData', player.xData);
        this.updateInputValue('money', player.bits);

        // Update game progress
        this.updateInputValue('gameProgress', this.gameProgressManager.progress);

        const playerTech = (player as any).tech || {};
        this.updateInputValue('swordTech', playerTech[WeaponType.SWORD] || 0);
        this.updateInputValue('doubleSwordTech', playerTech[WeaponType.DUAL_BLADE] || 0);
        this.updateInputValue('lanceTech', playerTech[WeaponType.LANCE] || 0);
        this.updateInputValue('hammerTech', playerTech[WeaponType.HAMMER] || 0);

        this.updateInputValue('recoveryTech', player.skillTech[SkillTechType.RECOVERY] || 0);
        this.updateInputValue('blastTech', player.skillTech[SkillTechType.BLAST] || 0);
        this.updateInputValue('rangedTech', player.skillTech[SkillTechType.RANGED] || 0);

        // Apply changes from inputs to player (if user has modified them)
        this.applyInputValue('hp', (val) => { player.hp = Math.max(0, Math.min(val, player.maxHp)); });
        this.applyInputValue('tp', (val) => { player.tp = Math.max(0, Math.min(val, player.maxTp)); });
        this.applyInputValue('xData', (val) => { player.xData = Math.max(0, val); });
        this.applyInputValue('money', (val) => { player.bits = Math.max(0, val); });

        // Apply game progress changes
        this.applyInputValue('gameProgress', (val) => {
            this.gameProgressManager.progress = Math.max(0, val);
        });

        this.applyInputValue('swordTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.SWORD] = Math.max(0, val); });
        this.applyInputValue('doubleSwordTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.DUAL_BLADE] = Math.max(0, val); });
        this.applyInputValue('lanceTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.LANCE] = Math.max(0, val); });
        this.applyInputValue('hammerTech', (val) => { if (!(player as any).tech) (player as any).tech = {}; (player as any).tech[WeaponType.HAMMER] = Math.max(0, val); });

        this.applyInputValue('recoveryTech', (val) => { player.skillTech[SkillTechType.RECOVERY] = Math.max(0, Math.min(9999, val)); });
        this.applyInputValue('blastTech', (val) => { player.skillTech[SkillTechType.BLAST] = Math.max(0, Math.min(9999, val)); });
        this.applyInputValue('rangedTech', (val) => { player.skillTech[SkillTechType.RANGED] = Math.max(0, Math.min(9999, val)); });
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