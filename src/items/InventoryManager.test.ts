import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryManager } from './InventoryManager';
import { AudioManager } from '../AudioManager';
import { EquippableItem } from './EquippableItem';
import { WeaponType } from './weapons/WeaponType';
import { SkillTechType } from '../player/skills/SkillType';
import { MenuManager } from '../ui/MenuManager';
import { UIManager } from '../ui/UIManager';
import { InputManager } from '../controls/InputManager';
import { MobileControlsManager } from '../controls/MobileControlsManager';
import { Tier, TierManager } from './TierManager';
import { mockDeep } from 'vitest-mock-extended';

// jsdom does not implement scrollIntoView
// HTMLElement.prototype.scrollIntoView = vi.fn();

interface InventoryManagerMockOverrides {
    menuManager?: MenuManager;
    uiManager?: UIManager;
    mobileControlsManager?: MobileControlsManager;
    audioManager?: AudioManager;
    tierManager?: TierManager;
    inputManager?: InputManager;
};

function makeInventoryManager(overrides: InventoryManagerMockOverrides = {}) {
    const inventoryManager = new InventoryManager(
        overrides.menuManager ?? mockDeep<MenuManager>({
            createOverlay: vi.fn().mockReturnValue(document.createElement('div')),
            createGridWindow: vi.fn().mockReturnValue(document.createElement('div')),
            createWindow: vi.fn().mockReturnValue(document.createElement('div')),
            createPanel: vi.fn().mockReturnValue(document.createElement('div')),
        }),
        overrides.uiManager ?? mockDeep<UIManager>(),
        overrides.mobileControlsManager ?? mockDeep<MobileControlsManager>(),
        overrides.audioManager ?? mockDeep<AudioManager>(),
        overrides.tierManager ?? mockDeep<TierManager>({
            getSkillTierForTech: vi.fn().mockImplementation((techPoints: number) => {
                if (techPoints >= 1800) return Tier.LEET;
                if (techPoints >= 880) return Tier.ZERODAY;
                if (techPoints >= 280) return Tier.OVERCLOCKED;
                if (techPoints >= 60) return Tier.MAINTAINED;
                return Tier.STABLE;
            })
        }),
        overrides.inputManager ?? mockDeep<InputManager>(),
    );

    return inventoryManager;
}

function makeInventoryManagerForRender(overrides: InventoryManagerMockOverrides = {}) {
    const inventoryManager = makeInventoryManager(overrides);
    inventoryManager.isVisible = true;
    inventoryManager.needsRender = true;
    return inventoryManager;
}

function makePlayer(inventory: any[] = [], techOverrides: Partial<Record<WeaponType, number>> = {}, skillTechOverrides: Partial<Record<SkillTechType, number>> = {}) {
    const tech = {
        [WeaponType.SWORD]: 0,
        [WeaponType.DUAL_BLADE]: 0,
        [WeaponType.LANCE]: 0,
        [WeaponType.HAMMER]: 0,
        ...techOverrides,
    };
    const skillTech = {
        [SkillTechType.RECOVERY]: 0,
        [SkillTechType.BLAST]: 0,
        [SkillTechType.RANGED]: 0,
        ...skillTechOverrides,
    };
    return {
        id: 'p1',
        level: 5,
        exp: 100, expRequired: 500,
        hp: 80, maxHp: 100,
        tp: 40, maxTp: 60,
        xData: 50, boosterPacks: 0, bits: 1000,
        strength: 5, defense: 3, agility: 2, luck: 1,
        statPointsAvailable: 0,
        strengthPoints: 0, defensePoints: 0, agilityPoints: 0, luckPoints: 0,
        strengthUpgrades: 0, defenseUpgrades: 0, agilityUpgrades: 0, luckUpgrades: 0,
        hpUpgrades: 0, tpUpgrades: 0,
        tech, skillTech,
        inventory,
        skills: [],
        getWeaponTier: vi.fn(),
        getSkillTier: vi.fn(),
        getBaseStatValue: vi.fn().mockReturnValue(1),
        getCriticalChance: vi.fn().mockReturnValue(0.01),
        weaponDropBonusFactor: 1.0,
        luckDropChanceBonus: 0.01,
        addStatPoint: vi.fn().mockReturnValue(true),
        generateStatsHTML: undefined,
    } as any;
}

function makeEquippableItem(canEquip: boolean) {
    const item = Object.create(EquippableItem.prototype) as EquippableItem & {
        name: string;
        equip: ReturnType<typeof vi.fn>;
        unequip: ReturnType<typeof vi.fn>;
        canEquip: ReturnType<typeof vi.fn>;
    };
    Object.assign(item, {
        name: 'Test Item',
        isEquipped: false,
        equip: vi.fn(),
        unequip: vi.fn(),
        canEquip: vi.fn().mockReturnValue(canEquip),
    });
    return item;
}

describe('InventoryManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // toggle() tests
    describe('toggle()', () => {
        it('sets isVisible=true when not visible', () => {
            const mgr = makeInventoryManager();
            mgr.toggle();
            expect(mgr.isVisible).toBe(true);
        });

        it('sets container display to flex when opening', () => {
            const mgr = makeInventoryManager();
            mgr.toggle();
            expect(mgr.container.style.display).toBe('flex');
        });

        it('plays the shared open sound when opening', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeInventoryManager({ audioManager: audioManagerMock });
            mgr.toggle();
            expect(audioManagerMock.playUiOpen).toHaveBeenCalledOnce();
        });

        it('resets selectedIndex to 0 when opening', () => {
            const mgr = makeInventoryManager();
            mgr.selectedIndex = 3;
            mgr.toggle();
            expect(mgr.selectedIndex).toBe(0);
        });

        it('sets needsRender=true when opening', () => {
            const mgr = makeInventoryManager();
            mgr.toggle();
            expect(mgr.needsRender).toBe(true);
        });

        it('sets isVisible=false when visible', () => {
            const mgr = makeInventoryManager();
            mgr.isVisible = true;
            mgr.container.style.display = 'flex';
            mgr.toggle();
            expect(mgr.isVisible).toBe(false);
        });

        it('sets container display to none when closing', () => {
            const mgr = makeInventoryManager();
            mgr.isVisible = true;
            mgr.container.style.display = 'flex';
            mgr.toggle();
            expect(mgr.container.style.display).toBe('none');
        });

        it('calls hideControlHints when closing', () => {
            const mgr = makeInventoryManager();
            mgr.isVisible = true;
            mgr.toggle();
            expect(mgr.uiManager.hideControlHints).toHaveBeenCalled();
        });

        it('plays the shared close sound when closing', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeInventoryManager({ audioManager: audioManagerMock });
            mgr.isVisible = true;
            mgr.container.style.display = 'flex';
            mgr.toggle();
            expect(audioManagerMock.playUiClose).toHaveBeenCalledOnce();
        });
    });

    // update() tests
    describe('update()', () => {
        it('returns immediately when not visible', () => {
            const mgr = makeInventoryManager();
            mgr.isVisible = false;
            mgr.needsRender = false;
            const player = makePlayer();
            mgr.update(player);
            expect(mgr.needsRender).toBe(false);
        });

        it('does not modify lootList when not visible', () => {
            const mgr = makeInventoryManager();
            mgr.isVisible = false;
            const player = makePlayer([{ name: 'Sword' }]);
            mgr.lootList.innerHTML = 'unchanged';
            mgr.update(player);
            expect(mgr.lootList.innerHTML).toBe('unchanged');
        });

        it('calls render when visible and needsRender=true', () => {
            const mgr = makeInventoryManagerForRender();
            const generateStatsHTMLSpy = vi.spyOn(mgr as any, 'generateStatsHTML');
            const player = makePlayer();
            mgr.update(player);
            expect(generateStatsHTMLSpy).toHaveBeenCalledWith(player);
            generateStatsHTMLSpy.mockRestore();
        });

        it('sets needsRender=false after rendering', () => {
            const mgr = makeInventoryManagerForRender();
            mgr.update(makePlayer());
            expect(mgr.needsRender).toBe(false);
        });

        it('calls showControlHints when input is provided', () => {
            const uiManagerMock = mockDeep<UIManager>();
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateUpPressed.mockReturnValue(false);
            inputManagerMock.isNavigateDownPressed.mockReturnValue(false);
            inputManagerMock.isSelectPressed.mockReturnValue(false);
            inputManagerMock.isCancelPressed.mockReturnValue(false);
            inputManagerMock.getRightThumbstickY.mockReturnValue(0);
            const mgr = makeInventoryManager({ uiManager: uiManagerMock, inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.update(makePlayer());
            expect(uiManagerMock.showControlHints).toHaveBeenCalled();
        });
    });

    // render() via update() - loot list
    describe('render() via update()', () => {
        it('populates lootList with one element per inventory item', () => {
            const mgr = makeInventoryManagerForRender();
            const player = makePlayer([{ name: 'Sword' }, { name: 'Shield' }]);
            mgr.update(player);
            expect(mgr.itemElements.length).toBe(2);
        });

        it('renders empty lootList for empty inventory', () => {
            const mgr = makeInventoryManagerForRender();
            mgr.update(makePlayer([]));
            expect(mgr.itemElements.length).toBe(0);
        });

        it('highlights selected item', () => {
            const mgr = makeInventoryManagerForRender();
            mgr.selectedIndex = 1;
            const player = makePlayer([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
            mgr.update(player);
            expect(mgr.itemElements[1].style.backgroundColor).toBe('#888');
        });

        it('updates statsText via generateStatsHTML', () => {
            const mgr = makeInventoryManagerForRender();
            const startStatsHTML = mgr.statsText.innerHTML;
            mgr.update(makePlayer());
            expect(mgr.statsText.innerHTML).not.toBe(startStatsHTML);
        });
    });

    // Navigation tests
    describe('navigation via update()', () => {
        it('increments selectedIndex on navigateDown press', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateDownPressed.mockReturnValue(true);
            const mgr = makeInventoryManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            const player = makePlayer([{ name: 'A' }, { name: 'B' }]);
            mgr.update(player); // Update to navigate down
            expect(mgr.selectedIndex).toBe(1);
            mgr.update(player); // Update again to test that the selectedIndex increments only once per press
            expect(mgr.selectedIndex).toBe(1);
        });

        it('plays the shared navigate sound when focus changes', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateDownPressed.mockReturnValue(true);
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeInventoryManager({ audioManager: audioManagerMock, inputManager: inputManagerMock });
            mgr.isVisible = true;
            const player = makePlayer([{ name: 'A' }, { name: 'B' }]);
            mgr.update(player);
            expect(audioManagerMock.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('decrements selectedIndex on navigateUp press', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateUpPressed.mockReturnValue(true);
            const mgr = makeInventoryManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.selectedIndex = 1;
            const player = makePlayer([{ name: 'A' }, { name: 'B' }]);
            mgr.update(player); // Update to navigate up
            expect(mgr.selectedIndex).toBe(0);
            mgr.update(player); // Update again to test that the selectedIndex decrements only once per press
            expect(mgr.selectedIndex).toBe(0);
        });

        it('does not go below index 0 on navigateUp', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateUpPressed.mockReturnValue(true);
            const mgr = makeInventoryManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            mgr.update(makePlayer([{ name: 'A' }]));
            expect(mgr.selectedIndex).toBe(0);
        });

        it('closes inventory on cancel press', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isCancelPressed.mockReturnValue(true);
            const mgr = makeInventoryManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.update(makePlayer());
            expect(mgr.isVisible).toBe(false);
        });

        it('plays the equip sound when equipping a valid item', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isSelectPressed.mockReturnValue(true);
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeInventoryManager({ audioManager: audioManagerMock, inputManager: inputManagerMock });
            mgr.isVisible = true;
            const item = makeEquippableItem(true);
            const player = makePlayer([item]);
            mgr.update(player);
            expect(item.equip).toHaveBeenCalledWith(player);
            expect(audioManagerMock.playEquip).toHaveBeenCalledOnce();
        });

        it('plays the failure sound when an item cannot be equipped', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isSelectPressed.mockReturnValue(true);
            const mgr = makeInventoryManager({ audioManager: audioManagerMock, inputManager: inputManagerMock });
            mgr.isVisible = true;
            const item = makeEquippableItem(false);
            const player = makePlayer([item]);
            mgr.update(player);
            expect(audioManagerMock.playInsufficient).toHaveBeenCalledOnce();
        });
    });

    // generateStatsHTML() tech level display tests
    describe('generateStatsHTML() tech level labels', () => {
        it('shows α for weapon tech at 0 (below β threshold)', () => {
            const player = makePlayer([], { [WeaponType.SWORD]: 0 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('0 | <span style="font-style:italic;color:#BBB;">α</span>');
        });

        it('shows β for weapon tech at 60 (β threshold)', () => {
            const player = makePlayer([], { [WeaponType.SWORD]: 60 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('60 | <span style="font-style:italic;color:#BBB;">β</span>');
        });

        it('shows γ for weapon tech at 280 (γ threshold)', () => {
            const player = makePlayer([], { [WeaponType.DUAL_BLADE]: 280 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('280 | <span style="font-style:italic;color:#BBB;">γ</span>');
        });

        it('shows ω for weapon tech at max level threshold', () => {
            const player = makePlayer([], { [WeaponType.HAMMER]: 4500 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('4500 | <span style="font-style:italic;color:#BBB;">ω</span>');
        });

        it('shows Stable for skill tech below 120', () => {
            const player = makePlayer([], {}, { [SkillTechType.RECOVERY]: 0 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('0 | <span style="font-style:italic;color:#BBB;">Stable</span>');
        });

        it('shows Maintained for skill tech at 121', () => {
            const player = makePlayer([], {}, { [SkillTechType.BLAST]: 61 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('61 | <span style="font-style:italic;color:#BBB;">Maintained</span>');
        });

        it('shows ZeroDay for skill tech at 880', () => {
            const player = makePlayer([], {}, { [SkillTechType.RANGED]: 880 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('880 | <span style="font-style:italic;color:#BBB;">ZeroDay</span>');
        });

        it('shows Leet for skill tech at 1200', () => {
            const player = makePlayer([], {}, { [SkillTechType.RANGED]: 1800 });
            const mgr = makeInventoryManagerForRender();
            mgr.update(player);
            expect(mgr.statsText.innerHTML).toContain('1800 | <span style="font-style:italic;color:#BBB;">Leet</span>');
        });
    });
});
