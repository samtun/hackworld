import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as CANNON from 'cannon-es';
import { LootChest } from './LootChest';
import { ItemDropManager } from './ItemDropManager';
import { AudioManager } from '../AudioManager';
import { ChipRepository } from './chips/ChipRepository';
import { CoreRepository } from './cores/CoreRepository';
import { ItemDropFactory } from './ItemDropFactory';
import { WeaponBonusCalculator } from './weapons/WeaponBonusCalculator';
import { WeaponRepository } from './weapons/WeaponRepository';
import * as THREE from 'three';
import { mockDeep } from 'vitest-mock-extended';
import { InputManager } from '../controls/InputManager';

interface AudioManagerTestOverrides {
    audioManager?: AudioManager,
    itemDropManager?: ItemDropManager,
    weaponRepository?: WeaponRepository,
    weaponBonusCalculator?: WeaponBonusCalculator,
    chipRepository?: ChipRepository,
    coreRepository?: CoreRepository,
    itemDropFactory?: ItemDropFactory,
    scene?: THREE.Scene,
    world?: CANNON.World,
    physicsMaterial?: CANNON.Material,
    position?: CANNON.Vec3,
    itemQualityFactor?: number,
}

function makePhysicsWorld() {
    return new CANNON.World();
}

function makeScene() {
    return new THREE.Scene();
}

function makeChest(overrides: AudioManagerTestOverrides = {}): LootChest {
    const defaultScene = makeScene();
    const defaultWorld = makePhysicsWorld();
    const {
        audioManager = overrides.audioManager ?? mockDeep<AudioManager>(),
        itemDropManager = overrides.itemDropManager ?? mockDeep<ItemDropManager>(),
        weaponRepository = overrides.weaponRepository ?? mockDeep<WeaponRepository>(),
        weaponBonusCalculator = overrides.weaponBonusCalculator ?? mockDeep<WeaponBonusCalculator>(),
        chipRepository = overrides.chipRepository ?? mockDeep<ChipRepository>(),
        coreRepository = overrides.coreRepository ?? mockDeep<CoreRepository>(),
        itemDropFactory = overrides.itemDropFactory ?? mockDeep<ItemDropFactory>(),
        scene = overrides.scene ?? defaultScene,
        world = overrides.world ?? defaultWorld,
        physicsMaterial = overrides.physicsMaterial ?? new CANNON.Material(),
        position = overrides.position ?? new CANNON.Vec3(0, 0, 0),
        itemQualityFactor = overrides.itemQualityFactor ?? 1.0,
    } = overrides;

    return new LootChest(
        audioManager,
        itemDropManager,
        weaponRepository,
        weaponBonusCalculator,
        chipRepository,
        coreRepository,
        itemDropFactory,
        scene,
        world,
        physicsMaterial,
        position,
        itemQualityFactor,
    );
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
        vi.restoreAllMocks();
    });

    it('starts not opened', () => {
        const chest = makeChest();
        expect(chest.isOpened).toBe(false);
    });

    it('isPlayerNearby returns true when player is close', () => {
        const chest = makeChest();
        chest.mesh.position.x = 5;
        chest.mesh.position.z = 5;
        const playerPos = { x: 5, y: 0, z: 5 } as any;
        expect(chest.isPlayerNearby(playerPos)).toBe(true);
    });

    it('isPlayerNearby returns false when player is far', () => {
        const chest = makeChest();
        chest.mesh.position.x = 5;
        chest.mesh.position.z = 5;
        const playerPos = { x: 100, y: 0, z: 100 } as any;
        expect(chest.isPlayerNearby(playerPos)).toBe(false);
    });

    it('open marks chest as opened', () => {
        const audioManagerMock = mockDeep<AudioManager>();
        const chest = makeChest({ audioManager: audioManagerMock });
        chest.open(makePlayer());
        expect(chest.isOpened).toBe(true);
        expect(audioManagerMock.playChestOpen).toHaveBeenCalledOnce();
    });

    it('open is idempotent — second call does nothing', () => {
        const itemDropManagerMock = mockDeep<ItemDropManager>();
        const audioManagerMock = mockDeep<AudioManager>();
        const chest = makeChest({ audioManager: audioManagerMock });
        const player = makePlayer();
        chest.open(player);
        chest.open(player);
        expect(audioManagerMock.playChestOpen).toHaveBeenCalledOnce();
        expect(itemDropManagerMock.addDrop).not.toHaveBeenCalled();
    });

    it('prepareLoot is idempotent — second call does not regenerate', () => {
        const chest = makeChest();
        const player = makePlayer();
        chest.prepareLoot(player);
        const entries1 = (chest as any).lootEntries;
        chest.prepareLoot(player);
        expect((chest as any).lootEntries).toBe(entries1);
    });

    it('getInteractionHint returns a string', () => {
        const chest = makeChest();
        const hint = chest.getInteractionHint(mockDeep<InputManager>());
        expect(typeof hint).toBe('string');
    });

    it('cleanup removes mesh and body', () => {
        const removeSpy = vi.spyOn(THREE.Scene.prototype, 'remove');
        const removeBodySpy = vi.spyOn(CANNON.World.prototype, 'removeBody');
        const chest = makeChest();
        chest.cleanup();
        expect(removeSpy).toHaveBeenCalled();
        expect(removeBodySpy).toHaveBeenCalled();
    });
});
