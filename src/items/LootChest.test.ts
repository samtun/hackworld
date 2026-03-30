import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
    }
    return {
        Vector3: V3,
        BoxGeometry: class { dispose = vi.fn(); },
        MeshStandardMaterial: class { color = { setHex: vi.fn() }; dispose = vi.fn(); },
        Mesh: class {
            position = new V3();
            castShadow = false;
            receiveShadow = false;
            geometry = { dispose: vi.fn() };
            material = { color: { setHex: vi.fn() }, dispose: vi.fn() };
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

// Mock ChestUI to avoid DOM operations
vi.mock('./ChestUI', () => ({
    ChestUI: class {
        isVisible = false;
        show() { this.isVisible = true; }
        hide() { this.isVisible = false; }
        update = vi.fn();
    },
}));

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
}));

import { LootChest } from './LootChest';

function makeChest(): { chest: LootChest; scene: any; world: any } {
    const scene = { add: vi.fn(), remove: vi.fn() } as any;
    const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
    const CANNON = require('cannon-es');
    const chest = new LootChest(scene, world, {} as any, new CANNON.Vec3(5, 0, 5), 3, 1.0);
    return { chest, scene, world };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LootChest', () => {
    it('starts not opened', () => {
        const { chest } = makeChest();
        expect(chest.isOpened).toBe(false);
    });

    it('isUIVisible returns false before opening', () => {
        const { chest } = makeChest();
        expect(chest.isUIVisible).toBe(false);
    });

    it('isPlayerNearby returns true when player is close', () => {
        const { chest } = makeChest();
        // Mesh position is set during construction; directly test with known values
        chest.mesh.position.x = 5;
        chest.mesh.position.z = 5;
        const playerPos = { x: 5, y: 0, z: 5 } as any; // distance 0
        expect(chest.isPlayerNearby(playerPos)).toBe(true);
    });

    it('isPlayerNearby returns false when player is far', () => {
        const { chest } = makeChest();
        chest.mesh.position.x = 5;
        chest.mesh.position.z = 5;
        const playerPos = { x: 100, y: 0, z: 100 } as any;
        expect(chest.isPlayerNearby(playerPos)).toBe(false);
    });

    it('open marks chest as opened and shows UI', () => {
        const { chest } = makeChest();
        const mockPlayer = { level: 1, getTechForWeapon: vi.fn().mockReturnValue(0) } as any;
        chest.open(mockPlayer);
        expect(chest.isOpened).toBe(true);
        expect(chest.isUIVisible).toBe(true);
    });

    it('open is idempotent (second call is ignored)', () => {
        const { chest } = makeChest();
        const mockPlayer = { level: 1, getTechForWeapon: vi.fn().mockReturnValue(0) } as any;
        chest.open(mockPlayer);
        chest.open(mockPlayer); // Should not throw
        expect(chest.isOpened).toBe(true);
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
