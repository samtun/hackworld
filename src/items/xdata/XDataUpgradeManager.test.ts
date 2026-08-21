import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XDataUpgradeManager } from './XDataUpgradeManager';
import * as UiUtils from '../../ui/UiUtils';
import { AudioManager } from '../../AudioManager';
import { InputManager } from '../../controls/InputManager';
import { MenuManager } from '../../ui/MenuManager';
import { UIManager } from '../../ui/UIManager';
import { mockDeep } from 'vitest-mock-extended';

// happy-dom does not implement animate
HTMLElement.prototype.animate = vi.fn();

interface XDataUpgradeManagerTestOverrides {
    menuManager?: MenuManager,
    uiManager: UIManager,
    audioManager: AudioManager,
    inputManager: InputManager,
}

function makeManager(overrides: Partial<XDataUpgradeManagerTestOverrides> = {}) {
    const mgr = new XDataUpgradeManager(
        overrides.menuManager ?? mockDeep<MenuManager>({
            createOverlay: vi.fn().mockReturnValue(document.createElement('div')),
            createFlexWindow: vi.fn().mockReturnValue(document.createElement('div')),
            createPanel: vi.fn().mockReturnValue(document.createElement('div')),
            createTitle: vi.fn().mockReturnValue(document.createElement('div')),
        }),
        overrides.uiManager ?? mockDeep<UIManager>(),
        overrides.audioManager ?? mockDeep<AudioManager>(),
        overrides.inputManager ?? mockDeep<InputManager>()
    );

    return mgr;
}

function makePlayer(overrides = {}) {
    return {
        xData: 100,
        strengthUpgrades: 0, defenseUpgrades: 0, agilityUpgrades: 0, luckUpgrades: 0,
        hpUpgrades: 0, tpUpgrades: 0,
        maxHp: 170, maxTp: 60,
        getBaseStatValue: vi.fn().mockReturnValue(1),
        getUpgradeCost: vi.fn().mockReturnValue(10),
        upgradeWithXData: vi.fn().mockReturnValue(true),
        ...overrides,
    } as any;
}

describe('XDataUpgradeManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // show() tests
    describe('show()', () => {
        it('sets isVisible=true', () => {
            const mgr = makeManager();
            mgr.show();
            expect(mgr.isVisible).toBe(true);
        });

        it('sets container.style.display to flex', () => {
            const mgr = makeManager();
            mgr.show();
            expect(mgr.container.style.display).toBe('flex');
        });

        it('resets selectedIndex to 0', () => {
            const mgr = makeManager();
            mgr.selectedIndex = 2;
            mgr.show();
            expect(mgr.selectedIndex).toBe(0);
        });

        it('sets needsRender=true', () => {
            const mgr = makeManager();
            mgr.show();
            expect(mgr.needsRender).toBe(true);
        });

        it('calls resetInputDebounce', () => {
            const debounceSpy = vi.spyOn(UiUtils, 'resetInputDebounce');
            const mgr = makeManager();
            mgr.show();
            expect(debounceSpy).toHaveBeenCalledWith(mgr);
        });

        it('plays the UI open sound when shown from hidden', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeManager({ audioManager: audioManagerMock });
            mgr.show();
            expect(audioManagerMock.playUiOpen).toHaveBeenCalledOnce();
        });
    });

    // hide() tests
    describe('hide()', () => {
        it('sets isVisible=false', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.hide();
            expect(mgr.isVisible).toBe(false);
        });

        it('sets container.style.display to none', () => {
            const mgr = makeManager();
            mgr.container.style.display = 'flex';
            mgr.hide();
            expect(mgr.container.style.display).toBe('none');
        });

        it('calls uiManager.hideControlHints', () => {
            const uiManagerMock = mockDeep<UIManager>();
            const mgr = makeManager({ uiManager: uiManagerMock });
            mgr.hide();
            expect(uiManagerMock.hideControlHints).toHaveBeenCalled();
        });

        it('plays the UI close sound when hidden from visible', () => {
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeManager({ audioManager: audioManagerMock });
            mgr.isVisible = true;
            mgr.hide();
            expect(audioManagerMock.playUiClose).toHaveBeenCalledOnce();
        });
    });

    // toggle() tests
    describe('toggle()', () => {
        it('calls hide() when visible', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            const hideSpy = vi.spyOn(mgr, 'hide');
            mgr.toggle();
            expect(hideSpy).toHaveBeenCalled();
        });

        it('calls show() when not visible', () => {
            const mgr = makeManager();
            mgr.isVisible = false;
            const showSpy = vi.spyOn(mgr, 'show');
            mgr.toggle();
            expect(showSpy).toHaveBeenCalled();
        });

        it('flips isVisible from false to true', () => {
            const mgr = makeManager();
            mgr.isVisible = false;
            mgr.toggle();
            expect(mgr.isVisible).toBe(true);
        });

        it('flips isVisible from true to false', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.toggle();
            expect(mgr.isVisible).toBe(false);
        });
    });

    // update() tests
    describe('update()', () => {
        it('returns immediately when not visible, needsRender stays false', () => {
            const mgr = makeManager();
            mgr.isVisible = false;
            mgr.needsRender = false;
            const player = makePlayer();
            mgr.update(player);
            expect(mgr.needsRender).toBe(false);
        });

        it('does not call render when not visible', () => {
            const mgr = makeManager();
            mgr.isVisible = false;
            const player = makePlayer();
            // xDataDisplay.innerText unchanged means render was not called
            mgr.xDataDisplay.innerText = 'untouched';
            mgr.update(player);
            expect(mgr.xDataDisplay.innerText).toBe('untouched');
        });

        it('calls render and updates xDataDisplay when visible and needsRender=true', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.needsRender = true;
            const player = makePlayer({ xData: 42 });
            mgr.update(player);
            expect(mgr.xDataDisplay.innerText).toContain('42');
        });

        it('sets needsRender=false after rendering', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(mgr.needsRender).toBe(false);
        });

        it('calls uiManager.showControlHints when input is provided', () => {
            const uiManagerMock = mockDeep<UIManager>();
            const mgr = makeManager({ uiManager: uiManagerMock });
            mgr.isVisible = true;
            mgr.update(makePlayer());
            expect(uiManagerMock.showControlHints).toHaveBeenCalled();
        });

        it('does not call showControlHints when no input is provided', () => {
            const showControlHintsSpy = vi.spyOn(UIManager.prototype, 'showControlHints');
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(showControlHintsSpy).not.toHaveBeenCalled();
        });
    });

    // render() via update() - stat list population
    describe('render() via update()', () => {
        it('populates statList with one element per stat', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(mgr.itemElements.length).toBe((mgr as any).stats.length);
        });

        it('highlights the selected item', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.selectedIndex = 1;
            mgr.update(makePlayer());
            expect(mgr.itemElements[1].style.backgroundColor).toBe('#888');
        });

        it('shows X-Data amount in xDataDisplay', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer({ xData: 999 }));
            expect(mgr.xDataDisplay.innerText).toContain('999');
        });

        it('shows upgrade cost text for non-maxed stats', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.update(makePlayer());
            expect(mgr.statList.innerHTML).toContain('Cost:');
        });
    });

    // Navigation via handleNavigation (through update)
    describe('navigation via update()', () => {
        it('increments selectedIndex on navigateDown press', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateDownPressed.mockReturnValue(true);
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeManager({ audioManager: audioManagerMock, inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            (mgr as any).lastNavigateDownState = false;
            mgr.update(makePlayer());
            expect(mgr.selectedIndex).toBe(1);
            expect(audioManagerMock.playMenuNavigate).toHaveBeenCalledOnce();
        });

        it('decrements selectedIndex on navigateUp press', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateUpPressed.mockReturnValue(true);
            const mgr = makeManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.selectedIndex = 2;
            (mgr as any).lastNavigateUpState = false;
            mgr.update(makePlayer());
            expect(mgr.selectedIndex).toBe(1);
        });

        it('does not go below index 0 on navigateUp', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isNavigateUpPressed.mockReturnValue(true);
            const mgr = makeManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.selectedIndex = 0;
            (mgr as any).lastNavigateUpState = false;
            mgr.update(makePlayer());
            expect(mgr.selectedIndex).toBe(0);
        });

        it('hides manager on cancel press', () => {
            const inputManagerMock = mockDeep<InputManager>();
            inputManagerMock.isCancelPressed.mockReturnValue(true);
            const mgr = makeManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            (mgr as any).lastCancelState = false;
            mgr.update(makePlayer());
            expect(mgr.isVisible).toBe(false);
        });

        it('calls upgradeWithXData on select press', () => {
            const inputManagerMock = mockDeep<InputManager>();
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeManager({ audioManager: audioManagerMock, inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.selectedIndex = 0;
            (mgr as any).lastSelectState = false;
            const player = makePlayer();
            // Populate itemElements first by rendering
            mgr.update(player);
            mgr.needsRender = false;
            (mgr as any).lastSelectState = false;
            inputManagerMock.isSelectPressed.mockReturnValue(true);
            mgr.update(player);
            expect(player.upgradeWithXData).toHaveBeenCalledWith((mgr as any).stats[0].type);
            expect(audioManagerMock.playUpgrade).toHaveBeenCalledOnce();
        });

        it('plays the insufficient sound when upgrade fails due to low X-Data', () => {
            const inputManagerMock = mockDeep<InputManager>();
            const audioManagerMock = mockDeep<AudioManager>();
            const mgr = makeManager({ audioManager: audioManagerMock, inputManager: inputManagerMock });
            mgr.isVisible = true;
            mgr.needsRender = true;
            mgr.selectedIndex = 0;
            const player = makePlayer({
                xData: 5,
                getUpgradeCost: vi.fn().mockReturnValue(10),
                upgradeWithXData: vi.fn().mockReturnValue(false),
            });
            mgr.update(player);
            mgr.needsRender = false;
            (mgr as any).lastSelectState = false;
            inputManagerMock.isSelectPressed.mockReturnValue(true);
            mgr.update(player);
            expect(audioManagerMock.playInsufficient).toHaveBeenCalledOnce();
        });

        it('uses the correct current upgrade level for each stat type in the insufficient-audio path', () => {
            const mgr = makeManager();
            mgr.isVisible = true;
            (mgr as any).stats = [
                { type: 'strength', label: 'Strength', description: '', upgradeEffect: '' },
                { type: 'defense', label: 'Defense', description: '', upgradeEffect: '' },
                { type: 'agility', label: 'Agility', description: '', upgradeEffect: '' },
                { type: 'luck', label: 'Luck', description: '', upgradeEffect: '' },
                { type: 'hp', label: 'HP', description: '', upgradeEffect: '' },
                { type: 'tp', label: 'TP', description: '', upgradeEffect: '' },
            ];
            const player = makePlayer({
                xData: 0,
                strengthUpgrades: 1,
                defenseUpgrades: 2,
                agilityUpgrades: 3,
                luckUpgrades: 4,
                hpUpgrades: 5,
                tpUpgrades: 6,
                getUpgradeCost: vi.fn().mockImplementation((level: number) => level + 10),
                upgradeWithXData: vi.fn().mockReturnValue(false),
            });

            (mgr as any).needsRender = true;
            mgr.update(player);

            [1, 2, 3, 4, 5, 6].forEach((expectedLevel, index) => {
                mgr.selectedIndex = index;
                (mgr as any).lastSelectState = false;
                mgr.update(player);
                expect(player.getUpgradeCost).toHaveBeenCalledWith(expectedLevel);
            });
        });

        it('throws for an unsupported stat type through the public update flow', () => {
            const inputManagerMock = mockDeep<InputManager>();
            const mgr = makeManager({ inputManager: inputManagerMock });
            mgr.isVisible = true;
            (mgr as any).stats = [
                { type: 'invalid', label: 'Invalid', description: '', upgradeEffect: '' },
            ];
            const player = makePlayer({
                xData: 0,
                getUpgradeCost: vi.fn().mockReturnValue(10),
                upgradeWithXData: vi.fn().mockReturnValue(false),
            });
            (mgr as any).needsRender = true;
            mgr.update(player);
            (mgr as any).lastSelectState = false;
            inputManagerMock.isSelectPressed.mockReturnValue(true);

            expect(() => mgr.update(player)).toThrow('Unsupported stat type: invalid');
        });
    });
});
