import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: {
            setStageMusic: vi.fn(),
        },
    },
}));

import { Game } from './Game';
import { Lobby } from './stages';
import { AudioManager } from './AudioManager';
import { InputManager } from './controls/InputManager';
import { DebugValueEditor } from './DebugValueEditor';
import { CardManager } from './items/cards/CardManager';
import { ChipTrader } from './items/chips/ChipTrader';
import { CoreTrader } from './items/cores/CoreTrader';
import { InventoryManager } from './items/InventoryManager';
import { WeaponTrader } from './items/weapons/WeaponTrader';
import { XDataUpgradeManager } from './items/xdata/XDataUpgradeManager';
import { DungeonSelectionManager } from './menus/DungeonSelectionManager';
import { NpcDialogueManager } from './npcs/NpcDialogueManager';
import { PlayerFactory } from './player/PlayerFactory';
import { PlayerRegistry } from './player/PlayerRegistry';
import { SaveManager } from './SaveManager';
import { UIManager } from './ui/UIManager';
import { WorldFactory } from './WorldFactory';
import { PauseMenuFactory } from './menus/PauseMenuFactory';
import { MobileControlsManager } from './controls/MobileControlsManager';
import { mockDeep } from 'vitest-mock-extended';
import * as THREE from 'three';
import { World } from './World';

interface GameDependencyOverrides {
    inputManager?: InputManager,
    audioManager?: AudioManager,
    playerRegistry?: PlayerRegistry,
    playerFactory?: PlayerFactory,
    uiManager?: UIManager,
    saveManager?: SaveManager,
    debugValueEditor?: DebugValueEditor,
    dungeonSelectionManager?: DungeonSelectionManager,
    inventoryManager?: InventoryManager,
    WeaponTrader?: WeaponTrader,
    chipTrader?: ChipTrader,
    coreTrader?: CoreTrader,
    npcDialogueManager?: NpcDialogueManager,
    xDataUpgradeManager?: XDataUpgradeManager,
    cardManager?: CardManager,
    worldFactory?: WorldFactory,
    mobileControlsManager?: MobileControlsManager,
    pauseMenuFactory?: PauseMenuFactory,
}

// Override only the WebGLRenderer of the module, since spyOn does not work
vi.mock('three', async (importOriginal) => {
    const actual = await importOriginal<typeof THREE>();

    return {
        ...actual,
        WebGLRenderer: vi.fn().mockImplementation(function () {
            return {
                domElement: document.createElement('canvas'),
                getSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
                setSize: vi.fn(),
                setPixelRatio: vi.fn(),
                render: vi.fn(),
                dispose: vi.fn(),
                getPixelRatio: vi.fn().mockReturnValue(1),
                shadowMap: { enabled: false, type: 0 },
                toneMapping: 0,
                toneMappingExposure: 1,
            };
        }),
    };
});

function makeGame(overrides: GameDependencyOverrides = {}): Game {
    const defaultWorldFactory = mockDeep<WorldFactory>();
    defaultWorldFactory.createWorld.mockReturnValue(mockDeep<World>());
    const finalWorldFactory = overrides.worldFactory ?? defaultWorldFactory;

    const {
        inputManager = overrides.inputManager ?? mockDeep<InputManager>(),
        audioManager = overrides.audioManager ?? mockDeep<AudioManager>(),
        playerRegistry = overrides.playerRegistry ?? mockDeep<PlayerRegistry>(),
        playerFactory = overrides.playerFactory ?? mockDeep<PlayerFactory>(),
        uiManager = overrides.uiManager ?? mockDeep<UIManager>(),
        saveManager = overrides.saveManager ?? mockDeep<SaveManager>(),
        debugValueEditor = overrides.debugValueEditor ?? mockDeep<DebugValueEditor>(),
        dungeonSelectionManager = overrides.dungeonSelectionManager ?? mockDeep<DungeonSelectionManager>(),
        inventoryManager = overrides.inventoryManager ?? mockDeep<InventoryManager>(),
        WeaponTrader = overrides.WeaponTrader ?? mockDeep<WeaponTrader>(),
        chipTrader = overrides.chipTrader ?? mockDeep<ChipTrader>(),
        coreTrader = overrides.coreTrader ?? mockDeep<CoreTrader>(),
        npcDialogueManager = overrides.npcDialogueManager ?? mockDeep<NpcDialogueManager>(),
        xDataUpgradeManager = overrides.xDataUpgradeManager ?? mockDeep<XDataUpgradeManager>(),
        cardManager = overrides.cardManager ?? mockDeep<CardManager>(),
        worldFactory = finalWorldFactory,
        mobileControlsManager = overrides.mobileControlsManager ?? mockDeep<MobileControlsManager>(),
        pauseMenuFactory = overrides.pauseMenuFactory ?? mockDeep<PauseMenuFactory>(),
    } = overrides;

    document.body.innerHTML = '<div id="app"></div>';
    const game = new Game(
        inputManager,
        audioManager,
        playerRegistry,
        playerFactory,
        uiManager,
        saveManager,
        debugValueEditor,
        dungeonSelectionManager,
        inventoryManager,
        WeaponTrader,
        chipTrader,
        coreTrader,
        npcDialogueManager,
        xDataUpgradeManager,
        cardManager,
        worldFactory,
        mobileControlsManager,
        pauseMenuFactory,
    );

    return game;
}

describe('Game audio scene flow', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('switches to start screen when the initial load completes', () => {
        const audioManagerMock = mockDeep<AudioManager>();
        const inputManagerMock = mockDeep<InputManager>();
        const uiManagerMock = mockDeep<UIManager>();
        const game = makeGame({
            audioManager: audioManagerMock,
            inputManager: inputManagerMock,
            uiManager: uiManagerMock,
        });

        (game as any).onInitialLoadComplete();

        expect(uiManagerMock.hideLoadingScreen).toHaveBeenCalledOnce();
        expect(uiManagerMock.showStartScreen).toHaveBeenCalledOnce();
        expect(audioManagerMock.setStageMusic).toHaveBeenCalledWith('startScreen');
    });

    it('switches to lobby music after the intro ends', () => {
        const audioManagerMock = mockDeep<AudioManager>();
        const game = makeGame({
            audioManager: audioManagerMock,
        });

        (game as any).currentScene = 'lore';
        (game as any).isTransitioning = true;

        // Act
        (game as any).continueAfterIntro();

        expect((game as any).currentScene).toBe(Lobby.getStageMetadata().id);
        expect(audioManagerMock.setStageMusic).toHaveBeenCalledWith(Lobby.getStageMetadata().id);
    });

    it.each([
        { label: 'A', mobileControls: { isMobile: true, isJumpPressed: true, isCancelPressed: false, isAttackPressed: false } as MobileControlsManager },
        { label: 'B', mobileControls: { isMobile: true, isJumpPressed: false, isCancelPressed: true, isAttackPressed: false } as MobileControlsManager },
        { label: 'X', mobileControls: { isMobile: true, isJumpPressed: false, isCancelPressed: false, isAttackPressed: true } as MobileControlsManager },
    ])('treats mobile $label as valid start-screen advance input', ({ mobileControls: mobileControlsManager }) => {
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isStartPressed.mockReturnValue(false);
        const game = makeGame({
            inputManager: inputManagerMock,
            mobileControlsManager: mobileControlsManager,
        });

        expect((game as any).isStartScreenAdvancePressed()).toBe(true);
    });

    it('does not advance when no mobile face button is pressed', () => {
        const mobileControlsManagerMock = mockDeep<MobileControlsManager>({
            isMobile: true,
            isJumpPressed: false,
            isCancelPressed: false,
            isAttackPressed: false,
        });
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isStartPressed.mockReturnValue(false);
        const game = makeGame({
            inputManager: inputManagerMock,
            mobileControlsManager: mobileControlsManagerMock,
        });

        expect((game as any).isStartScreenAdvancePressed()).toBe(false);
    });
});
