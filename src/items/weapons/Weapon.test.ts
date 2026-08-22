import { describe, it, expect, vi, afterEach } from 'vitest';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Weapon } from './Weapon';
import { WeaponType } from './WeaponType';
import { AssetManager } from '../../AssetManager';
import { mock, mockDeep } from 'vitest-mock-extended';
import { GLTF } from 'three/examples/jsm/Addons.js';

interface WeaponTestOverrides {
    assetManager?: AssetManager,
    modelAsset?: string,
    weaponType?: WeaponType,
    damage?: number,
    physicsWorld?: CANNON.World
}

function createDefaultPhysicsWorld(defaultPhysicsMaterial: CANNON.Material = new CANNON.Material('defaultMaterial')): CANNON.World {
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({
        mass: 0,
        material: defaultPhysicsMaterial,
    });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    const defaultPhysicsWorld = new CANNON.World();
    defaultPhysicsWorld.addBody(floorBody);
    return defaultPhysicsWorld;
}

function createDefaultAssetManager(): AssetManager {
    const dummyMesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    const dummyRightHandBone = new THREE.Bone();
    dummyRightHandBone.name = 'HandR';

    const dummyScene = new THREE.Group();
    dummyScene.add(dummyMesh);
    dummyScene.add(dummyRightHandBone);

    const gltfMock = mock<GLTF>();
    gltfMock.scene = dummyScene;

    const defaultAssetManagerMock = mockDeep<AssetManager>();
    defaultAssetManagerMock.get.mockReturnValue(gltfMock);
    return defaultAssetManagerMock;
}

function makeWeapon(overrides: WeaponTestOverrides = {}): Weapon {
    const {
        assetManager = createDefaultAssetManager(),
        modelAsset = "anyModel",
        weaponType = WeaponType.SWORD,
        damage = 10,
        physicsWorld = createDefaultPhysicsWorld(),
    } = overrides;
    return new Weapon(
        assetManager,
        modelAsset,
        weaponType,
        damage,
        physicsWorld
    );
}

// ─── attack() ─────────────────────────────────────────────────────────────────

describe('Weapon – attack()', () => {
    it('sets isAttacking to true', () => {
        const w = makeWeapon();
        w.attack();
        expect(w.isAttacking).toBe(true);
    });

    it('returns true on successful attack', () => {
        const w = makeWeapon();
        expect(w.attack()).toBe(true);
    });

    it('returns false when already attacking', () => {
        const w = makeWeapon();
        w.attack();
        expect(w.attack()).toBe(false);
    });

    it('stores pendingRangeMultiplier', () => {
        const w = makeWeapon();
        w.attack(2.5);
        expect((w as any).pendingRangeMultiplier).toBe(2.5);
    });

    it('resets attackDelayTimer to 0', () => {
        const w = makeWeapon();
        (w as any).attackDelayTimer = 9.9
        w.attack();
        expect((w as any).attackDelayTimer).toBe(0);
    });

    it('uses 1.0 as default rangeMultiplier', () => {
        const w = makeWeapon();
        w.attack();
        expect((w as any).pendingRangeMultiplier).toBe(1.0);
    });
});

// ─── stopAttack() ─────────────────────────────────────────────────────────────

describe('Weapon – stopAttack()', () => {
    it('sets isAttacking to false', () => {
        const w = makeWeapon();
        w.attack();
        w.stopAttack();
        expect(w.isAttacking).toBe(false);
    });

    it('removes body from physicsWorld when body exists', () => {
        const fakeBody = { collisionFilterGroup: 1 } as unknown as Body;
        const physicsWorld = createDefaultPhysicsWorld();
        const removeBodySpy = vi.spyOn(physicsWorld, 'removeBody');
        const w = makeWeapon({ physicsWorld: physicsWorld });
        (w as any).body = fakeBody;
        w.attack();
        w.stopAttack();
        expect(removeBodySpy).toHaveBeenCalledWith(fakeBody);
        vi.restoreAllMocks();
    });

    it('does nothing when not attacking', () => {
        const w = makeWeapon();
        w.stopAttack(); // should not throw
        expect(w.isAttacking).toBe(false);
        expect((w as any).hitboxActive).toBe(false);
    });
});

// ─── update(dt) ───────────────────────────────────────────────────────────────

describe('Weapon – update(dt)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not advance attackDelayTimer when not attacking', () => {
        const w = makeWeapon();
        w.update(0.1);
        expect((w as any).attackDelayTimer).toBe(0);
    });

    it('advances attackDelayTimer when attacking and hitbox not yet active', () => {
        const w = makeWeapon();
        w.attack();
        w.update(0.05);
        expect((w as any).attackDelayTimer).toBeCloseTo(0.05, 5);
    });

    it('activates hitbox when attackDelayTimer reaches the SWORD delay (0.12s)', () => {
        const physicsWorld = createDefaultPhysicsWorld();
        const addBodySpy = vi.spyOn(physicsWorld, 'addBody');
        const w = makeWeapon({ physicsWorld: physicsWorld });
        w.attack();
        w.update(0.12);
        expect((w as any).hitboxActive).toBe(true);
        expect(addBodySpy).toHaveBeenCalled();
    });

    it('does not activate hitbox before the delay elapses', () => {
        const physicsWorld = createDefaultPhysicsWorld();
        const addBodySpy = vi.spyOn(physicsWorld, 'addBody');
        const w = makeWeapon({ physicsWorld: physicsWorld });
        w.attack();
        w.update(0.05); // 0.05 < 0.12 delay
        expect((w as any).hitboxActive).toBe(false);
        expect(addBodySpy).not.toHaveBeenCalled();
    });

    it('sets body on weapon after hitbox is activated', () => {
        const w = makeWeapon();
        w.attack();
        w.update(0.12);
        expect(w.body).not.toBeNull();
    });

    it('respects per-weapon HAMMER delay (0.3s) — not active at 0.12s', () => {
        const w = makeWeapon();
        w.weaponType = WeaponType.HAMMER;
        w.attack();
        w.update(0.12);
        expect((w as any).hitboxActive).toBe(false);
    });

    it('does not re-advance timer once hitbox is active', () => {
        const w = makeWeapon();
        w.attack();
        (w as any).hitboxActive = true;
        (w as any).attackDelayTimer = 0.12;
        w.update(0.1);
        // Timer should NOT advance further when hitboxActive is already true
        expect((w as any).attackDelayTimer).toBeCloseTo(0.12, 5);
    });

    it('removes existing body before creating new hitbox (no double-add)', () => {
        const world = createDefaultPhysicsWorld();
        const removeBodySpy = vi.spyOn(world, 'removeBody');
        const existingBody = mockDeep<CANNON.Body>();
        const w = makeWeapon({ physicsWorld: world });
        (w as any).body = existingBody;
        w.attack();
        w.update(0.12);
        expect(removeBodySpy).toHaveBeenCalledWith(existingBody);
    });
});

// ─── changeWeaponType() ───────────────────────────────────────────────────────

describe('Weapon – changeWeaponType()', () => {
    it('updates weaponType', () => {
        const w = makeWeapon({ weaponType: WeaponType.SWORD });
        const parent = mockDeep<THREE.Object3D>();
        w.changeWeaponType(parent, WeaponType.LANCE, 50);
        expect(w.weaponType).toBe(WeaponType.LANCE);
    });

    it('updates damage', () => {
        const w = makeWeapon({ damage: 10 });
        const parent = mockDeep<THREE.Object3D>();
        w.changeWeaponType(parent, WeaponType.HAMMER, 99);
        expect(w.damage).toBe(99);
    });

    it('updates stats to match new weapon type', () => {
        const w = makeWeapon({ weaponType: WeaponType.SWORD });
        const parent = mockDeep<THREE.Object3D>();
        w.changeWeaponType(parent, WeaponType.LANCE, 50);
        // LANCE attackSpeed is 0.5
        expect(w.stats.attackSpeed).toBe(0.5);
        expect(w.stats.range).toBe(3.0);
    });

    it('calls disposeMesh', () => {
        const w = makeWeapon();
        const disposeMeshSpy = vi.spyOn(Weapon.prototype as any, 'disposeMesh');
        const parent = mockDeep<THREE.Object3D>();
        w.changeWeaponType(parent, WeaponType.DUAL_BLADE, 20);
        expect(disposeMeshSpy).toHaveBeenCalled();
    });

    it('adds new mesh to parent', () => {
        const w = makeWeapon();
        const parent = mockDeep<THREE.Object3D>();
        w.changeWeaponType(parent, WeaponType.DUAL_BLADE, 20);
        expect(parent.add).toHaveBeenCalled();
    });

    it('removes existing attack body when one exists', () => {
        const world = createDefaultPhysicsWorld();
        const removeBodySpy = vi.spyOn(world, 'removeBody');
        const fakeBody = {};
        const w = makeWeapon({ physicsWorld: world });
        (w as any).body = fakeBody;
        const parent = mockDeep<THREE.Object3D>();
        w.changeWeaponType(parent, WeaponType.LANCE, 30);
        expect(removeBodySpy).toHaveBeenCalledWith(fakeBody);
    });

    it('removes old mesh from parentBone when parentBone is set', () => {
        const w = makeWeapon();
        const parentBone = mockDeep<THREE.Group>();
        (w as any).parentBone = parentBone;
        const parent = mockDeep<THREE.Group>();
        w.changeWeaponType(parent, WeaponType.SWORD, 15);
        expect(parentBone.remove).toHaveBeenCalled();
    });
});
