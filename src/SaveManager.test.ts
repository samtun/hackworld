import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaveManager, SaveData } from './SaveManager';
import { WeaponType } from './items/weapons/WeaponType';
import { SkillTechType } from './player/skills/SkillType';
import { PlayerRegistry } from './player/PlayerRegistry';
import { CardCollection } from './items/cards/CardCollection';
import { GameProgressManager } from './GameProgressManager';
import { NpcRegistry } from './npcs/NpcRegistry';
import { WeaponItem } from './items/weapons/WeaponItem';
import { WeaponRepository } from './items/weapons/WeaponRepository';
import { CoreItem } from './items/cores/CoreItem';
import { CoreRepository } from './items/cores/CoreRepository';
import { ChipItem } from './items/chips/ChipItem';
import { ChipRepository } from './items/chips/ChipRepository';
import { TierManager, WeaponTierDefinition } from './items/TierManager';
import { SaveManagerUI } from './menus/SaveManagerUI';
import { mockDeep } from 'vitest-mock-extended';

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface SaveManagerTestOverrides {
    saveManagerUi?: SaveManagerUI,
    gameProgressManager?: GameProgressManager,
    cardCollection?: CardCollection,
    playerRegistry?: PlayerRegistry,
    weaponRepository?: WeaponRepository,
    coreRepository?: CoreRepository,
    chipRepository?: ChipRepository,
    npcRegistry?: NpcRegistry,
    tierManager?: TierManager,
}

function makePlayerRegistryWithPlayer(player?: ReturnType<typeof makePlayerStub>) {
    return mockDeep<PlayerRegistry>({
        activePlayers: [
            player || makePlayerStub(),
        ],
    });
}

function makeSaveManager(overrides: SaveManagerTestOverrides = {}): SaveManager {
    const {
        saveManagerUi = mockDeep<SaveManagerUI>(),
        gameProgressManager = mockDeep<GameProgressManager>(),
        cardCollection = mockDeep<CardCollection>(),
        playerRegistry = mockDeep<PlayerRegistry>(),
        weaponRepository = mockDeep<WeaponRepository>(),
        coreRepository = mockDeep<CoreRepository>(),
        chipRepository = mockDeep<ChipRepository>(),
        npcRegistry = mockDeep<NpcRegistry>(),
        tierManager = mockDeep<TierManager>(),
    } = overrides;

    return new SaveManager(
        saveManagerUi,
        gameProgressManager,
        cardCollection,
        playerRegistry,
        weaponRepository,
        coreRepository,
        chipRepository,
        npcRegistry,
        tierManager,
    );
}

/** Create a minimal player-like object with the fields SaveManager reads. */
function makePlayerStub(overrides: Record<string, unknown> = {}) {
    return {
        level: 5,
        exp: 120,
        expRequired: 500,
        maxHp: 200,
        hp: 150,
        maxTp: 80,
        tp: 60,
        bits: 1000,
        xData: 50,
        boosterPacks: 2,
        statPointsAvailable: 4,
        strengthUpgrades: 2,
        defenseUpgrades: 1,
        hpUpgrades: 3,
        tpUpgrades: 1,
        agilityUpgrades: 0,
        luckUpgrades: 0,
        strengthPoints: 1,
        defensePoints: 0,
        agilityPoints: 0,
        luckPoints: 0,
        body: { position: { x: 1, y: 2, z: 3 } },
        inventory: [],
        tech: {
            [WeaponType.SWORD]: 50,
            [WeaponType.DUAL_BLADE]: 0,
            [WeaponType.LANCE]: 0,
            [WeaponType.HAMMER]: 0,
        },
        skillTech: {
            [SkillTechType.RECOVERY]: 10,
            [SkillTechType.BLAST]: 0,
            [SkillTechType.RANGED]: 5,
        },
        recalculateStats: vi.fn(),
        setWeapon: vi.fn(),
        ...overrides,
    } as any;
}

/** Stub global storage APIs for tests that need them. */
function stubStorage() {
    const store: Record<string, string> = {};
    const sessionStore: Record<string, string> = {};

    vi.stubGlobal('localStorage', {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => Object.keys(store).forEach(k => delete store[k]),
    });
    vi.stubGlobal('sessionStorage', {
        getItem: (k: string) => sessionStore[k] ?? null,
        setItem: (k: string, v: string) => { sessionStore[k] = v; },
        removeItem: (k: string) => { delete sessionStore[k]; },
        clear: () => Object.keys(sessionStore).forEach(k => delete sessionStore[k]),
    });
    return { store, sessionStore };
}

// ─── Playtime tracking ────────────────────────────────────────────────────────

describe('SaveManager – playtime', () => {
    beforeEach(() => {
        stubStorage();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('starts at 0 playtime', () => {
        const saveManager = makeSaveManager();
        expect(saveManager.getPlaytime()).toBe(0);
    });

    it('accumulates playtime via updatePlaytime', () => {
        const saveManager = makeSaveManager();
        saveManager.updatePlaytime(10);
        saveManager.updatePlaytime(5.5);
        expect(saveManager.getPlaytime()).toBeCloseTo(15.5, 5);
    });

    it('formats 0 seconds as 00:00:00', () => {
        const saveManager = makeSaveManager();
        expect(saveManager.getFormattedPlaytime()).toBe('00:00:00');
    });

    it('formats 3661 seconds as 01:01:01', () => {
        const saveManager = makeSaveManager();
        saveManager.updatePlaytime(3661);
        expect(saveManager.getFormattedPlaytime()).toBe('01:01:01');
    });

    it('formats 3600 seconds as 01:00:00', () => {
        const saveManager = makeSaveManager();
        saveManager.updatePlaytime(3600);
        expect(saveManager.getFormattedPlaytime()).toBe('01:00:00');
    });

    it('formats 90 seconds as 00:01:30', () => {
        const saveManager = makeSaveManager();
        saveManager.updatePlaytime(90);
        expect(saveManager.getFormattedPlaytime()).toBe('00:01:30');
    });
});

// ─── Lore intro flag ──────────────────────────────────────────────────────────

describe('SaveManager – lore intro flag', () => {
    beforeEach(() => {
        stubStorage();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('starts as not seen', () => {
        const saveManager = makeSaveManager();
        expect(saveManager.isLoreIntroSeen()).toBe(false);
    });

    it('marks the intro as seen', () => {
        const saveManager = makeSaveManager();
        saveManager.markLoreIntroSeen();
        expect(saveManager.isLoreIntroSeen()).toBe(true);
    });
});

// ─── localStorage helpers ─────────────────────────────────────────────────────

describe('SaveManager – localStorage helpers', () => {
    beforeEach(() => {
        stubStorage();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('hasLocalStorageSave returns false when no save exists', () => {
        const saveManager = makeSaveManager();
        expect(saveManager.hasLocalStorageSave()).toBe(false);
    });

    it('hasLocalStorageSave returns true after a save is written', () => {
        localStorage.setItem('hackworld_autosave', JSON.stringify({ version: 'test' }));
        const saveManager = makeSaveManager();
        expect(saveManager.hasLocalStorageSave()).toBe(true);
    });

    it('clearLocalStorage removes the autosave', () => {
        localStorage.setItem('hackworld_autosave', '{}');
        const saveManager = makeSaveManager();
        saveManager.clearLocalStorage();
        expect(saveManager.hasLocalStorageSave()).toBe(false);
    });
});

// ─── createSaveData (tested via saveToLocalStorage) ──────────────────────────

describe('SaveManager – saveToLocalStorage / createSaveData', () => {
    beforeEach(() => {
        stubStorage();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('writes a valid JSON object to localStorage', () => {
        const playerRegistryMock = makePlayerRegistryWithPlayer();
        const saveManager = makeSaveManager({ playerRegistry: playerRegistryMock });
        saveManager.saveToLocalStorage();
        const raw = localStorage.getItem('hackworld_autosave');
        expect(raw).not.toBeNull();
        const data = JSON.parse(raw!);
        expect(data).toMatchObject({ version: 'test' });
    });

    it('persists all player stats and properties in the save data', () => {
        const saveManager = makeSaveManager();
        saveManager.markLoreIntroSeen();
        saveManager.saveToLocalStorage();
        const data: SaveData = JSON.parse(localStorage.getItem('hackworld_autosave')!);
        expect(data.player.level).toBe(5);
        expect(data.player.money).toBe(1000);
        expect(data.player.xData).toBe(50);
        expect(data.player.tech[WeaponType.SWORD]).toBe(50);
        expect(data.player.skillTech[SkillTechType.RECOVERY]).toBe(10);
        expect(data.player.position).toMatchObject({ x: 1, y: 2, z: 3 });
        expect(data.player.strengthUpgrades).toBe(2);
        expect(data.player.hpUpgrades).toBe(3);
        expect(data.loreIntroSeen).toBe(true);
    });
});

// ─── loadSaveData (tested via the internal method + loadFromLocalStorage) ─────

describe('SaveManager – loadSaveData', () => {
    beforeEach(() => {
        stubStorage();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function makeSaveData(overrides: Partial<SaveData> = {}): SaveData {
        return {
            version: 'test',
            timestamp: new Date().toISOString(),
            playtime: 1234,
            gameProgress: 3,
            player: {
                level: 10,
                exp: 200,
                expRequired: 700,
                maxHp: 250,
                maxTp: 100,
                money: 5000,
                xData: 200,
                boosterPacks: 5,
                statPointsAvailable: 8,
                strengthUpgrades: 4,
                defenseUpgrades: 2,
                hpUpgrades: 6,
                tpUpgrades: 3,
                agilityUpgrades: 1,
                luckUpgrades: 2,
                strengthPoints: 3,
                defensePoints: 1,
                agilityPoints: 0,
                luckPoints: 2,
                position: { x: 10, y: 0, z: -5 },
                inventory: [],
                tech: {
                    [WeaponType.SWORD]: 300,
                    [WeaponType.DUAL_BLADE]: 0,
                    [WeaponType.LANCE]: 0,
                    [WeaponType.HAMMER]: 0,
                },
                skillTech: {
                    [SkillTechType.RECOVERY]: 50,
                    [SkillTechType.BLAST]: 20,
                    [SkillTechType.RANGED]: 0,
                },
            },
            cardCollection: ['A-1', 'A-2'],
            npcDialogueShown: ['NPC_Vendor'],
            loreIntroSeen: true,
            ...overrides,
        };
    }

    it('restores all player stats and properties from save data', () => {
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        const data = makeSaveData();
        (mgr as any).loadSaveData(data);
        expect(player.level).toBe(10);
        expect(player.bits).toBe(5000);
        expect(player.xData).toBe(200);
        expect(player.strengthUpgrades).toBe(4);
        expect(player.hpUpgrades).toBe(6);
        expect((player as any).tech[WeaponType.SWORD]).toBe(300);
        expect(player.skillTech[SkillTechType.RECOVERY]).toBe(50);
        expect(mgr.getPlaytime()).toBe(1234);
        expect(mgr.isLoreIntroSeen()).toBe(true);
    });

    it('restores lore intro as false when flag is absent (old save)', () => {
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer() });
        const data = makeSaveData();
        delete (data as any).loreIntroSeen;
        (mgr as any).loadSaveData(data);
        expect(mgr.isLoreIntroSeen()).toBe(false);
    });

    it('calls recalculateStats after load', () => {
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        const data = makeSaveData();
        (mgr as any).loadSaveData(data);
        expect(player.recalculateStats).toHaveBeenCalled();
    });

    it('returns true from loadFromLocalStorage when save exists', () => {
        const player = makePlayerStub();
        const data = makeSaveData();
        localStorage.setItem('hackworld_autosave', JSON.stringify(data));
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        const loaded = mgr.loadFromLocalStorage();
        expect(loaded).toBe(true);
        expect(player.level).toBe(10);
    });

    it('returns false from loadFromLocalStorage when no save exists', () => {
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        expect(mgr.loadFromLocalStorage()).toBe(false);
    });

    it('autosave round-trip preserves key player stats', () => {
        // Save
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        mgr.saveToLocalStorage();

        // Reset player to different values
        player.level = 1;
        player.bits = 0;
        player.xData = 0;

        // Load
        mgr.loadFromLocalStorage();
        expect(player.level).toBe(5);
        expect(player.bits).toBe(1000);
        expect(player.xData).toBe(50);
    });
});

// ─── Version compatibility check ──────────────────────────────────────────────

describe('SaveManager – version compatibility', () => {
    let confirmSpy: ReturnType<typeof vi.fn>;
    let reloadSpy: ReturnType<typeof vi.fn>;

    function makeSaveData(overrides: Partial<SaveData> = {}): SaveData {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            playtime: 0,
            gameProgress: 0,
            player: {
                level: 1, exp: 0, expRequired: 100, maxHp: 100, maxTp: 50, money: 0,
                xData: 0, boosterPacks: 0, statPointsAvailable: 0,
                strengthUpgrades: 0, defenseUpgrades: 0, hpUpgrades: 0,
                tpUpgrades: 0, agilityUpgrades: 0, luckUpgrades: 0,
                strengthPoints: 0, defensePoints: 0, agilityPoints: 0, luckPoints: 0,
                position: { x: 0, y: 0, z: 0 },
                inventory: [],
                tech: {},
                skillTech: {},
            },
            cardCollection: [],
            npcDialogueShown: [],
            ...overrides,
        };
    }

    beforeEach(() => {
        stubStorage();

        // Set a known semver game version so major version comparisons are deterministic
        // TODO: Reimplement with instance of SaveManager... (SaveManager as any).SAVE_VERSION = '1.50.0';

        confirmSpy = vi.fn();
        reloadSpy = vi.fn();
        vi.stubGlobal('confirm', confirmSpy);
        vi.stubGlobal('window', { location: { reload: reloadSpy } });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        (PlayerRegistry as any).instance = undefined;
        (CardCollection as any).instance = undefined;
        (GameProgressManager as any).instance = undefined;
        (NpcRegistry as any).instance = undefined;
    });

    it('loads without prompt when major versions match', () => {
        const data = makeSaveData({ version: '1.5.3' });
        localStorage.setItem('hackworld_autosave', JSON.stringify(data));
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        mgr.loadFromLocalStorage();
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(player.level).toBe(1);
    });

    it('shows prompt and reloads page when major version differs and user clicks Reset (localStorage)', () => {
        confirmSpy.mockReturnValue(true);
        const data = makeSaveData({ version: '2.0.0' });
        localStorage.setItem('hackworld_autosave', JSON.stringify(data));
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        const loaded = mgr.loadFromLocalStorage();
        expect(confirmSpy).toHaveBeenCalledOnce();
        expect(reloadSpy).toHaveBeenCalledOnce();
        expect(loaded).toBe(false);
    });

    it('shows prompt and reloads page when major version differs and user clicks Cancel (localStorage)', () => {
        confirmSpy.mockReturnValue(false);
        const data = makeSaveData({ version: '2.0.0' });
        localStorage.setItem('hackworld_autosave', JSON.stringify(data));
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        const loaded = mgr.loadFromLocalStorage();
        expect(confirmSpy).toHaveBeenCalledOnce();
        expect(reloadSpy).toHaveBeenCalledOnce();
        expect(loaded).toBe(false);
    });

    it('shows prompt and does nothing when major version differs and user clicks Cancel (file load)', async () => {
        confirmSpy.mockReturnValue(false);
        const data = makeSaveData({ version: '2.0.0' });
        const file = new File([JSON.stringify(data)], 'save.json', { type: 'application/json' });
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        await mgr.load(file);
        expect(confirmSpy).toHaveBeenCalledOnce();
        expect(reloadSpy).not.toHaveBeenCalled();
        // Player level should remain unchanged since load was aborted
        expect(player.level).toBe(5);
    });

    it('shows prompt and reloads when major version differs and user clicks Reset (file load)', async () => {
        confirmSpy.mockReturnValue(true);
        const data = makeSaveData({ version: '2.0.0' });
        const file = new File([JSON.stringify(data)], 'save.json', { type: 'application/json' });
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        await mgr.load(file);
        expect(confirmSpy).toHaveBeenCalledOnce();
        expect(reloadSpy).toHaveBeenCalledOnce();
    });

    it('prompt message contains both save and game versions', () => {
        confirmSpy.mockReturnValue(false);
        const data = makeSaveData({ version: '2.0.0' });
        localStorage.setItem('hackworld_autosave', JSON.stringify(data));
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        mgr.loadFromLocalStorage();
        const message: string = confirmSpy.mock.calls[0][0];
        expect(message).toContain('v2.0.0');
        expect(message).toContain('1.50.0');
    });

    it('skips version check when game version is not valid semver (e.g. dev build)', () => {
        // Simulate a dev/test build where __APP_VERSION__ is not a semver string
        (SaveManager as any).SAVE_VERSION = 'dev';
        const data = makeSaveData({ version: '2.0.0' });
        localStorage.setItem('hackworld_autosave', JSON.stringify(data));
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        mgr.loadFromLocalStorage();
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(player.level).toBe(1);
    });
});

// ─── resetGame() ─────────────────────────────────────────────────────────────

describe('SaveManager – resetGame()', () => {
    let confirmSpy: ReturnType<typeof vi.fn>;
    let reloadSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        stubStorage();
        confirmSpy = vi.fn();
        reloadSpy = vi.fn();
        vi.stubGlobal('confirm', confirmSpy);
        vi.stubGlobal('window', { location: { reload: reloadSpy } });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        (PlayerRegistry as any).instance = undefined;
        (CardCollection as any).instance = undefined;
        (GameProgressManager as any).instance = undefined;
        (NpcRegistry as any).instance = undefined;
    });

    it('clears localStorage and reloads when user confirms', () => {
        confirmSpy.mockReturnValue(true);
        localStorage.setItem('hackworld_autosave', '{"version":"test"}');
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        mgr.resetGame();
        expect(reloadSpy).toHaveBeenCalledOnce();
        expect(mgr.hasLocalStorageSave()).toBe(false);
    });

    it('does not reload when user cancels', () => {
        confirmSpy.mockReturnValue(false);
        localStorage.setItem('hackworld_autosave', '{"version":"test"}');
        const player = makePlayerStub();
        const mgr = makeSaveManager({ playerRegistry: makePlayerRegistryWithPlayer(player) });
        mgr.resetGame();
        expect(reloadSpy).not.toHaveBeenCalled();
        expect(mgr.hasLocalStorageSave()).toBe(true);
    });
});

// ─── save() with inventory items ─────────────────────────────────────────────

describe('SaveManager – save() with WeaponItem in inventory', () => {
    beforeEach(() => {
        stubStorage();
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:fake'),
            revokeObjectURL: vi.fn(),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('serializes a WeaponItem in inventory with kind=WeaponItem', () => {
        const wi: any = Object.create(WeaponItem.prototype);
        const props: Record<string, unknown> = {
            id: 'w1', name: 'Test Sword', buyPrice: 100, sellPrice: 50,
            weaponType: WeaponType.SWORD, damage: 25, model: 'models/sword.glb',
            level: 1, isEquipped: false, tier: { name: 'Stable' },
        };
        for (const [k, v] of Object.entries(props)) {
            Object.defineProperty(wi, k, { value: v, writable: true, configurable: true, enumerable: true });
        }

        const player = makePlayerStub({ inventory: [wi] });
        const playerRegistryMock = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistryMock });
        const saved = mgr.save();
        expect(saved.player.inventory).toHaveLength(1);
        const entry = saved.player.inventory[0];
        expect(entry.kind).toBe('WeaponItem');
        expect(entry.name).toBe('Test Sword');
        expect(entry.weaponType).toBe(WeaponType.SWORD);
        expect(entry.level).toBe(1);
        expect(entry.isEquipped).toBe(false);
    });

    it('marks isEquipped=true in serialized weapon when equipped', () => {
        const wi: any = Object.create(WeaponItem.prototype);
        const props: Record<string, unknown> = {
            id: 'w2', name: 'Equipped Sword', buyPrice: 200, sellPrice: 100,
            weaponType: WeaponType.SWORD, damage: 30, model: 'models/sword.glb',
            level: 2, isEquipped: true, tier: { name: 'Stable' },
        };
        for (const [k, v] of Object.entries(props)) {
            Object.defineProperty(wi, k, { value: v, writable: true, configurable: true, enumerable: true });
        }

        const player = makePlayerStub({ inventory: [wi] });
        const playerRegistryMock = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistryMock });

        const saved = mgr.save();
        expect(saved.player.inventory[0].isEquipped).toBe(true);
    });

    it('serializes a CoreItem with kind=CoreItem', () => {
        const ci = Object.create(CoreItem.prototype) as any;
        Object.assign(ci, {
            id: 'c1', name: 'Test Core', level: 1, isEquipped: false,
        });

        const player = makePlayerStub({ inventory: [ci] });
        const playerRegistryMock = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistryMock });

        const saved = mgr.save();
        expect(saved.player.inventory[0].kind).toBe('CoreItem');
        expect(saved.player.inventory[0].name).toBe('Test Core');
    });

    it('serializes a ChipItem with kind=ChipItem', () => {
        const chi = Object.create(ChipItem.prototype) as any;
        Object.assign(chi, {
            id: 'ch1', name: 'Test Chip', level: 1, isEquipped: false,
        });

        const player = makePlayerStub({ inventory: [chi] });
        const playerRegistryMock = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistryMock });

        const saved = mgr.save();
        expect(saved.player.inventory[0].kind).toBe('ChipItem');
        expect(saved.player.inventory[0].name).toBe('Test Chip');
    });
});

// ─── loadSaveData() with inventory items ─────────────────────────────────────

describe('SaveManager – loadSaveData() with inventory items', () => {
    function makeMinimalSaveData(inventory: any[]): SaveData {
        return {
            version: 'test',
            timestamp: new Date().toISOString(),
            playtime: 0,
            gameProgress: 0,
            player: {
                level: 5, exp: 0, expRequired: 100, maxHp: 100, maxTp: 50,
                money: 0, xData: 0, boosterPacks: 0, statPointsAvailable: 0,
                strengthUpgrades: 0, defenseUpgrades: 0, hpUpgrades: 0,
                tpUpgrades: 0, agilityUpgrades: 0, luckUpgrades: 0,
                strengthPoints: 0, defensePoints: 0, agilityPoints: 0, luckPoints: 0,
                position: { x: 0, y: 0, z: 0 },
                inventory,
                tech: {}, skillTech: {},
            },
            cardCollection: [],
            npcDialogueShown: [],
        };
    }

    beforeEach(() => {
        stubStorage();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('restores a WeaponItem from inventory and pushes it to player.inventory', () => {
        const weaponRepository = mockDeep<WeaponRepository>();
        const tierManager = mockDeep<TierManager>();
        const fakeWeaponItem = Object.create(WeaponItem.prototype) as any;
        Object.assign(fakeWeaponItem, {
            id: 'w1', name: 'Sword Alpha', weaponType: WeaponType.SWORD,
            damage: 20, level: 1, isEquipped: false, tier: { name: 'Stable' },
            cloneWith: vi.fn().mockReturnValue({
                id: 'w1', name: 'Sword Alpha', weaponType: WeaponType.SWORD,
                damage: 20, level: 1, isEquipped: false, tier: { name: 'Stable' },
            }),
        });
        weaponRepository.getWeaponByTypeAndLevel.mockReturnValue(fakeWeaponItem);
        tierManager.tiers.get.mockReturnValue({ name: 'Stable' } as WeaponTierDefinition);
        const player = makePlayerStub();
        const playerRegistry = makePlayerRegistryWithPlayer(player);

        const mgr = makeSaveManager({
            playerRegistry: playerRegistry,
            weaponRepository: weaponRepository,
            tierManager: tierManager,
        });

        const data = makeMinimalSaveData([{
            kind: 'WeaponItem', id: 'w1', name: 'Sword Alpha',
            weaponType: WeaponType.SWORD, damage: 20, buyPrice: 100, sellPrice: 50,
            model: 'models/sword.glb', level: 1, isEquipped: false, tierName: 'Stable',
        }]);

        (mgr as any).loadSaveData(data);
        expect(player.inventory).toHaveLength(1);
    });

    it('calls player.setWeapon for an equipped weapon', () => {
        const clonedItem = {
            id: 'w2', isEquipped: false, tier: { name: 'Stable' },
        };
        const fakeWeaponItem = Object.create(WeaponItem.prototype) as any;
        Object.assign(fakeWeaponItem, {
            cloneWith: vi.fn().mockReturnValue(clonedItem),
        });
        const player = makePlayerStub();
        const playerRegistry = makePlayerRegistryWithPlayer(player);
        const weaponRepository = mockDeep<WeaponRepository>();
        const tierManager = mockDeep<TierManager>();
        weaponRepository.getWeaponByTypeAndLevel.mockReturnValue(fakeWeaponItem);
        tierManager.tiers.get.mockReturnValue({ name: 'Stable' } as WeaponTierDefinition);

        const mgr = makeSaveManager({
            playerRegistry: playerRegistry,
            weaponRepository: weaponRepository,
            tierManager: tierManager,
        });

        const data = makeMinimalSaveData([{
            kind: 'WeaponItem', id: 'w2', name: 'Lance Beta',
            weaponType: WeaponType.LANCE, damage: 35, buyPrice: 200, sellPrice: 100,
            model: 'models/lance.glb', level: 2, isEquipped: true, tierName: 'Stable',
        }]);

        (mgr as any).loadSaveData(data);
        expect(player.setWeapon).toHaveBeenCalledWith(clonedItem);
    });

    it('skips a WeaponItem entry with missing weaponType or level', () => {
        const data = makeMinimalSaveData([{
            kind: 'WeaponItem', id: 'bad', name: 'Broken',
            // missing weaponType and level
        }]);
        const player = makePlayerStub();
        const playerRegistry = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistry });
        (mgr as any).loadSaveData(data);
        expect(player.inventory).toHaveLength(0);
    });

    it('restores a CoreItem from inventory', () => {
        const fakeCoreItem = { id: 'c1', name: 'Test Core', level: 1, isEquipped: false };
        const coreRepository = mockDeep<CoreRepository>();
        coreRepository.getCoreByNameAndLevel.mockReturnValue(fakeCoreItem as CoreItem);

        const data = makeMinimalSaveData([{
            kind: 'CoreItem', id: 'c1', name: 'Test Core', level: 1, isEquipped: false,
        }]);

        const player = makePlayerStub();
        const playerRegistry = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistry });
        (mgr as any).loadSaveData(data);
        expect(player.inventory).toHaveLength(1);
        expect(player.inventory[0]).toBe(fakeCoreItem);
    });

    it('marks CoreItem as equipped when isEquipped=true', () => {
        const fakeCoreItem = { id: 'c1', name: 'Core', level: 1, isEquipped: false };
        const coreRepository = mockDeep<CoreRepository>();
        coreRepository.getCoreByNameAndLevel.mockReturnValue(fakeCoreItem as CoreItem);

        const data = makeMinimalSaveData([{
            kind: 'CoreItem', id: 'c1', name: 'Core', level: 1, isEquipped: true,
        }]);

        const player = makePlayerStub();
        const playerRegistry = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistry });
        (mgr as any).loadSaveData(data);
        expect(player.inventory[0].isEquipped).toBe(true);
    });

    it('restores a ChipItem from inventory', () => {
        const fakeChipItem = { id: 'ch1', name: 'Speed Chip', level: 2, isEquipped: false };
        const chipRepository = mockDeep<ChipRepository>();
        chipRepository.getChipByNameAndLevel.mockReturnValue(fakeChipItem as ChipItem);

        const data = makeMinimalSaveData([{
            kind: 'ChipItem', id: 'ch1', name: 'Speed Chip', level: 2, isEquipped: false,
        }]);

        const player = makePlayerStub();
        const playerRegistry = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistry });
        (mgr as any).loadSaveData(data);
        expect(player.inventory).toHaveLength(1);
        expect(player.inventory[0]).toBe(fakeChipItem);
    });

    it('skips CoreItem when repository returns undefined (name not found)', () => {
        const coreRepository = mockDeep<CoreRepository>();
        coreRepository.getCoreByNameAndLevel.mockReturnValue(undefined);

        const data = makeMinimalSaveData([{
            kind: 'CoreItem', id: 'c2', name: 'Unknown Core', level: 1, isEquipped: false,
        }]);

        const player = makePlayerStub();
        const playerRegistry = makePlayerRegistryWithPlayer(player);
        const mgr = makeSaveManager({ playerRegistry: playerRegistry });
        (mgr as any).loadSaveData(data);
        expect(player.inventory).toHaveLength(0);
    });
});
