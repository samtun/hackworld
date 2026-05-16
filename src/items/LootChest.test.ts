import { describe, it, expect, vi, beforeEach } from 'vitest';

const audioManagerMock = vi.hoisted(() => ({
    playChestOpen: vi.fn(),
}));

vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: audioManagerMock,
    },
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
        lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
        normalize() {
            const len = Math.sqrt(this.lengthSq());
            if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
            return this;
        }
    }
    return {
        Vector3: V3,
        BoxGeometry: class {
            dispose = vi.fn();
            translate = vi.fn();
        },
        MeshStandardMaterial: class { color = { setHex: vi.fn() }; dispose = vi.fn(); },
        Mesh: class {
            position = new V3();
            rotation = { x: 0, y: 0, z: 0 };
            castShadow = false;
            receiveShadow = false;
            geometry = { dispose: vi.fn(), translate: vi.fn() };
            material = { color: { setHex: vi.fn() }, dispose: vi.fn() };
        },
        Group: class {
            position = new V3();
            children: any[] = [];
            add(child: any) { this.children.push(child); }
        },
        Material: class {},
    };
});

vi.mock('cannon-es', () => {
    class Vec3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }
    return {
        Vec3,
        Box: class {},
        Body: class {
            addShape = vi.fn();
            position = new Vec3();
        },
    };
});

// Mock repositories to avoid loading JSON data
vi.mock('./weapons/WeaponRepository', () => ({
    WeaponRepository: {
        Instance: {
            getWeaponByTypeAndLevel: vi.fn().mockReturnValue(null),
        },
    },
}));

vi.mock('./chips/ChipRepository', () => ({
    ChipRepository: {
        Instance: {
            getRandomChipOfLevel: vi.fn().mockReturnValue(null),
        },
    },
}));

vi.mock('./cores/CoreRepository', () => ({
    CoreRepository: {
        Instance: {
            getRandomCoreOfLevel: vi.fn().mockReturnValue(null),
        },
    },
}));

vi.mock('./weapons/WeaponBonusCalculator', () => ({
    WeaponBonusCalculator: {
        Instance: {
            applyWeaponBonus: vi.fn(),
        },
    },
}));

vi.mock('./ItemLevelHelper', () => ({
    ItemLevelHelper: {
        determineDropLevel: vi.fn().mockReturnValue(1),
    },
}));

vi.mock('../ui/InputHints', () => ({
    getHint: vi.fn().mockReturnValue('Open Chest'),
    HintConfigs: {
        openChest: {
            keyboard: '<span class="key-icon">ENTER</span> Open Chest',
            controller: '<span class="btn-icon xbox-a">A</span> Open Chest',
        },
    },
}));

// Mock drop constructors to avoid 3D/DOM operations
vi.mock('./weapons/WeaponDrop', () => ({
    WeaponDrop: vi.fn().mockImplementation(function(this: any) {
        this.dropType = 'weapon';
        this.mesh = { position: { x: 0, y: 0, z: 0 } };
    }),
}));
vi.mock('./chips/ChipDrop', () => ({
    ChipDrop: vi.fn().mockImplementation(function(this: any) {
        this.dropType = 'chip';
        this.mesh = { position: { x: 0, y: 0, z: 0 } };
    }),
}));
vi.mock('./cores/CoreDrop', () => ({
    CoreDrop: vi.fn().mockImplementation(function(this: any) {
        this.dropType = 'core';
        this.mesh = { position: { x: 0, y: 0, z: 0 } };
    }),
}));
vi.mock('./potions/PotionDrop', () => ({
    PotionDrop: vi.fn().mockImplementation(function(this: any) {
        this.dropType = 'hpPotion';
        this.mesh = { position: { x: 0, y: 0, z: 0 } };
    }),
}));
vi.mock('./bits/MoneyDrop', () => ({
    MoneyDrop: vi.fn().mockImplementation(function(this: any) {
        this.dropType = 'money';
        this.mesh = { position: { x: 0, y: 0, z: 0 } };
    }),
}));

const addDropMock = vi.hoisted(() => vi.fn());
vi.mock('./ItemDropManager', () => ({
    ItemDropManager: {
        Instance: {
            addDrop: addDropMock,
        },
    },
}));

vi.mock('./potions/PotionDefinitions', () => ({
    PotionType: { HP: 'hp', TP: 'tp' },
    determinePotionLevel: vi.fn().mockReturnValue(1),
}));

import { LootChest } from './LootChest';

function makeChest(): { chest: LootChest; scene: any; world: any } {
    const scene = { add: vi.fn(), remove: vi.fn() } as any;
    const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
    const CANNON = require('cannon-es');
    const chest = new LootChest(scene, world, {} as any, new CANNON.Vec3(5, 0, 5));
    return { chest, scene, world };
}

function makePlayer(overrides: Record<string, any> = {}): any {
    return {
        level: 1,
        position: { x: 5, y: 0, z: 7 },
        getTechForWeapon: vi.fn().mockReturnValue(0),
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LootChest', () => {
    beforeEach(() => {
        addDropMock.mockClear();
        audioManagerMock.playChestOpen.mockClear();
    });

    it('starts not opened', () => {
        const { chest } = makeChest();
        expect(chest.isOpened).toBe(false);
    });

    it('isPlayerNearby returns true when player is close', () => {
        const { chest } = makeChest();
        chest.mesh.position.x = 5;
        chest.mesh.position.z = 5;
        const playerPos = { x: 5, y: 0, z: 5 } as any;
        expect(chest.isPlayerNearby(playerPos)).toBe(true);
    });

    it('isPlayerNearby returns false when player is far', () => {
        const { chest } = makeChest();
        chest.mesh.position.x = 5;
        chest.mesh.position.z = 5;
        const playerPos = { x: 100, y: 0, z: 100 } as any;
        expect(chest.isPlayerNearby(playerPos)).toBe(false);
    });

    it('open marks chest as opened', () => {
        const { chest } = makeChest();
        chest.open(makePlayer());
        expect(chest.isOpened).toBe(true);
        expect(audioManagerMock.playChestOpen).toHaveBeenCalledOnce();
    });

    it('open is idempotent — second call does nothing', () => {
        const { chest } = makeChest();
        const player = makePlayer();
        chest.open(player);
        const callCount = addDropMock.mock.calls.length;
        chest.open(player);
        expect(audioManagerMock.playChestOpen).toHaveBeenCalledOnce();
        expect(addDropMock.mock.calls.length).toBe(callCount);
    });

    it('prepareLoot is idempotent — second call does not regenerate', () => {
        const { chest } = makeChest();
        const player = makePlayer();
        chest.prepareLoot(player);
        const entries1 = (chest as any).lootEntries;
        chest.prepareLoot(player);
        expect((chest as any).lootEntries).toBe(entries1);
    });

    it('getInteractionHint returns a string', () => {
        const { chest } = makeChest();
        const hint = chest.getInteractionHint({} as any);
        expect(typeof hint).toBe('string');
    });

    it('cleanup removes mesh and body', () => {
        const { chest, scene, world } = makeChest();
        chest.cleanup();
        expect(scene.remove).toHaveBeenCalled();
        expect(world.removeBody).toHaveBeenCalled();
    });
});
