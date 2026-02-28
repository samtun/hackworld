import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaveManager, SaveData } from './SaveManager';
import { WeaponType } from './items/weapons/WeaponType';
import { SkillTechType } from './skills/SkillTechType';
import { PlayerRegistry } from './PlayerRegistry';
import { CardCollection } from './items/cards/CardCollection';
import { GameProgressManager } from './GameProgressManager';
import { NpcRegistry } from './npcs/NpcRegistry';

// ─── Module mocks ──────────────────────────────────────────────────────────────

// SaveManagerUI creates DOM elements – stub it out entirely.
vi.mock('./SaveManagerUI', () => ({
    SaveManagerUI: {
        Instance: {
            isVisible: false,
            show: vi.fn(),
            hide: vi.fn(),
            update: vi.fn(),
        },
    },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

/** Reset the SaveManager singleton (allows fresh construction per test). */
function resetSaveManager() {
    (SaveManager as any).instance = undefined;
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
        resetSaveManager();
        stubStorage();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('starts at 0 playtime', () => {
        expect(SaveManager.Instance.getPlaytime()).toBe(0);
    });

    it('accumulates playtime via updatePlaytime', () => {
        const mgr = SaveManager.Instance;
        mgr.updatePlaytime(10);
        mgr.updatePlaytime(5.5);
        expect(mgr.getPlaytime()).toBeCloseTo(15.5, 5);
    });

    it('formats 0 seconds as 00:00:00', () => {
        expect(SaveManager.Instance.getFormattedPlaytime()).toBe('00:00:00');
    });

    it('formats 3661 seconds as 01:01:01', () => {
        const mgr = SaveManager.Instance;
        mgr.updatePlaytime(3661);
        expect(mgr.getFormattedPlaytime()).toBe('01:01:01');
    });

    it('formats 3600 seconds as 01:00:00', () => {
        const mgr = SaveManager.Instance;
        mgr.updatePlaytime(3600);
        expect(mgr.getFormattedPlaytime()).toBe('01:00:00');
    });

    it('formats 90 seconds as 00:01:30', () => {
        const mgr = SaveManager.Instance;
        mgr.updatePlaytime(90);
        expect(mgr.getFormattedPlaytime()).toBe('00:01:30');
    });
});

// ─── Lore intro flag ──────────────────────────────────────────────────────────

describe('SaveManager – lore intro flag', () => {
    beforeEach(() => {
        resetSaveManager();
        stubStorage();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('starts as not seen', () => {
        expect(SaveManager.Instance.isLoreIntroSeen()).toBe(false);
    });

    it('marks the intro as seen', () => {
        const mgr = SaveManager.Instance;
        mgr.markLoreIntroSeen();
        expect(mgr.isLoreIntroSeen()).toBe(true);
    });
});

// ─── localStorage helpers ─────────────────────────────────────────────────────

describe('SaveManager – localStorage helpers', () => {
    beforeEach(() => {
        resetSaveManager();
        stubStorage();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('hasLocalStorageSave returns false when no save exists', () => {
        expect(SaveManager.Instance.hasLocalStorageSave()).toBe(false);
    });

    it('hasLocalStorageSave returns true after a save is written', () => {
        localStorage.setItem('hackworld_autosave', JSON.stringify({ version: 'test' }));
        expect(SaveManager.Instance.hasLocalStorageSave()).toBe(true);
    });

    it('clearLocalStorage removes the autosave', () => {
        localStorage.setItem('hackworld_autosave', '{}');
        SaveManager.Instance.clearLocalStorage();
        expect(SaveManager.Instance.hasLocalStorageSave()).toBe(false);
    });
});

// ─── createSaveData (tested via saveToLocalStorage) ──────────────────────────

describe('SaveManager – saveToLocalStorage / createSaveData', () => {
    beforeEach(() => {
        resetSaveManager();
        stubStorage();

        // Inject the player stub into PlayerRegistry
        (PlayerRegistry as any).instance = undefined;
        PlayerRegistry.Instance.addPlayer(makePlayerStub());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        (PlayerRegistry as any).instance = undefined;
        (CardCollection as any).instance = undefined;
        (GameProgressManager as any).instance = undefined;
        (NpcRegistry as any).instance = undefined;
    });

    it('writes a valid JSON object to localStorage', () => {
        SaveManager.Instance.saveToLocalStorage();
        const raw = localStorage.getItem('hackworld_autosave');
        expect(raw).not.toBeNull();
        const data = JSON.parse(raw!);
        expect(data).toMatchObject({ version: 'test' });
    });

    it('persists all player stats and properties in the save data', () => {
        SaveManager.Instance.markLoreIntroSeen();
        SaveManager.Instance.saveToLocalStorage();
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
    let player: ReturnType<typeof makePlayerStub>;

    beforeEach(() => {
        resetSaveManager();
        stubStorage();

        player = makePlayerStub();
        (PlayerRegistry as any).instance = undefined;
        PlayerRegistry.Instance.addPlayer(player);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        (PlayerRegistry as any).instance = undefined;
        (CardCollection as any).instance = undefined;
        (GameProgressManager as any).instance = undefined;
        (NpcRegistry as any).instance = undefined;
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
        const mgr = SaveManager.Instance;
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
        const mgr = SaveManager.Instance;
        const data = makeSaveData();
        delete (data as any).loreIntroSeen;
        (mgr as any).loadSaveData(data);
        expect(mgr.isLoreIntroSeen()).toBe(false);
    });

    it('calls recalculateStats after load', () => {
        const mgr = SaveManager.Instance;
        const data = makeSaveData();
        (mgr as any).loadSaveData(data);
        expect(player.recalculateStats).toHaveBeenCalled();
    });

    it('returns true from loadFromLocalStorage when save exists', () => {
        const data = makeSaveData();
        localStorage.setItem('hackworld_autosave', JSON.stringify(data));
        const mgr = SaveManager.Instance;
        const loaded = mgr.loadFromLocalStorage();
        expect(loaded).toBe(true);
        expect(player.level).toBe(10);
    });

    it('returns false from loadFromLocalStorage when no save exists', () => {
        const mgr = SaveManager.Instance;
        expect(mgr.loadFromLocalStorage()).toBe(false);
    });

    it('autosave round-trip preserves key player stats', () => {
        // Save
        SaveManager.Instance.saveToLocalStorage();

        // Reset player to different values
        player.level = 1;
        player.bits = 0;
        player.xData = 0;

        // Load
        SaveManager.Instance.loadFromLocalStorage();
        expect(player.level).toBe(5);
        expect(player.bits).toBe(1000);
        expect(player.xData).toBe(50);
    });
});
