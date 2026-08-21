import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BreakableBarrel } from './BreakableBarrel';
import { AudioManager } from '../AudioManager';
import { ChipRepository } from './chips/ChipRepository';
import { CoreRepository } from './cores/CoreRepository';
import { ItemDropFactory } from './ItemDropFactory';
import { ItemDropManager } from './ItemDropManager';
import { TierManager, Tier } from './TierManager';
import { WeaponRepository } from './weapons/WeaponRepository';
import { mockDeep } from 'vitest-mock-extended';
import { WeaponItem } from './weapons/WeaponItem';
import { WeaponDrop } from './weapons/WeaponDrop';
import { ChipDrop } from './chips/ChipDrop';
import { CoreDrop } from './cores/CoreDrop';
import { MoneyDrop } from './bits/MoneyDrop';
import { PotionDrop } from './potions/PotionDrop';
import { ChipItem } from './chips/ChipItem';
import { CoreItem } from './cores/CoreItem';

interface BreakableBarrelTestOverrides {
    audioManager?: AudioManager,
    weaponRepository?: WeaponRepository,
    chipRepository?: ChipRepository,
    coreRepository?: CoreRepository,
    tierManager?: TierManager,
    itemDropFactory?: ItemDropFactory,
    itemDropManager?: ItemDropManager,
    scene?: THREE.Scene,
    physicsWorld?: CANNON.World,
    physicsMaterial?: CANNON.Material,
    position?: CANNON.Vec3,
    maxTier?: Tier,
}

const overclockedTier = {
    name: Tier.OVERCLOCKED,
    minPercent: -3,
    maxPercent: 3,
    rimColor: '#ffffff',
    innerColor: '#999999',
    traderChance: 0.44,
    minLevel: 0,
};

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

function makeBreakableBarrel(overrides: BreakableBarrelTestOverrides = {}): BreakableBarrel {
    const defaultPhysicsMaterial = new CANNON.Material('defaultMaterial');
    const {
        audioManager = mockDeep<AudioManager>(),
        weaponRepository = mockDeep<WeaponRepository>(),
        chipRepository = mockDeep<ChipRepository>(),
        coreRepository = mockDeep<CoreRepository>(),
        tierManager = mockDeep<TierManager>(),
        itemDropFactory = mockDeep<ItemDropFactory>(),
        itemDropManager = mockDeep<ItemDropManager>(),
        scene = mockDeep<THREE.Scene>(),
        physicsWorld = createDefaultPhysicsWorld(),
        physicsMaterial = defaultPhysicsMaterial,
        position = new CANNON.Vec3(5, 0, 5),
        maxTier = overclockedTier,
    } = overrides;
    return new BreakableBarrel(
        audioManager,
        weaponRepository,
        chipRepository,
        coreRepository,
        tierManager,
        itemDropFactory,
        itemDropManager,
        scene,
        physicsWorld,
        physicsMaterial,
        position,
        maxTier as Tier
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BreakableBarrel', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts not destroyed', () => {
        const barrel = makeBreakableBarrel();
        expect(barrel.isDestroyed).toBe(false);
    });

    it('sets entity reference on body', () => {
        const barrel = makeBreakableBarrel();
        expect((barrel.body as any).entity).toBe(barrel);
    });

    it('onHit sets isDestroyed to true and removes mesh + body', () => {
        const audioManager = mockDeep<AudioManager>();
        const scene = mockDeep<THREE.Scene>();
        const physicsWorld = createDefaultPhysicsWorld();
        const barrel = makeBreakableBarrel({ scene: scene, physicsWorld: physicsWorld, audioManager: audioManager });
        const removeBodySpy = vi.spyOn(physicsWorld, 'removeBody');
        audioManager.playBarrelBreak.mockClear();
        barrel.onHit();

        expect(barrel.isDestroyed).toBe(true);
        expect(audioManager.playBarrelBreak).toHaveBeenCalledOnce();
        expect(scene.remove).toHaveBeenCalled();
        expect(removeBodySpy).toHaveBeenCalled();
    });

    it('onHit is idempotent (second call is ignored)', () => {
        const scene = mockDeep<THREE.Scene>();
        const audioManager = mockDeep<AudioManager>();
        const barrel = makeBreakableBarrel({ scene: scene, audioManager: audioManager });
        audioManager.playBarrelBreak.mockClear();

        barrel.onHit();
        const removeCalls = scene.remove.mock.calls.length;
        barrel.onHit();
        expect(audioManager.playBarrelBreak).toHaveBeenCalledOnce();
        // Second onHit should not add more scene.remove calls (only fragment cleanup later)
        expect(scene.remove.mock.calls.length).toBe(removeCalls);
    });

    it('cleanup removes mesh and body when not destroyed', () => {
        const scene = mockDeep<THREE.Scene>();
        const physicsWorld = createDefaultPhysicsWorld();
        const barrel = makeBreakableBarrel({ scene: scene, physicsWorld: physicsWorld });
        const removeBodySpy = vi.spyOn(physicsWorld, 'removeBody');

        barrel.cleanup();
        expect(scene.remove).toHaveBeenCalled();
        expect(removeBodySpy).toHaveBeenCalled();
    });

    it('cleanup does not double-remove when already destroyed', () => {
        const scene = mockDeep<THREE.Scene>();
        const barrel = makeBreakableBarrel({ scene });
        barrel.onHit();
        // Finish the animation first
        barrel.update(1.2);
        const afterAnimCalls = scene.remove.mock.calls.length;
        barrel.cleanup();
        // cleanup should not add more remove calls after animation is done
        expect(scene.remove.mock.calls.length).toBe(afterAnimCalls);
    });

    describe('generateDrop', () => {
        it('generates drops with according drop chances', () => {
            const weaponDrop = { id: "weapon" } as unknown as WeaponDrop;
            const chipDrop = {} as ChipDrop;
            const coreDrop = {} as CoreDrop;
            const moneyDrop = {} as MoneyDrop;
            const potionDrop = {} as PotionDrop;

            const weaponRepository = mockDeep<WeaponRepository>();
            weaponRepository.getWeaponByTypeAndLevel.mockReturnValue({
                id: "myId",
                name: "weapon",
                damage: 1,
                buyPrice: 2,
                sellPrice: 3
            } as WeaponItem);

            const chipRepository = mockDeep<ChipRepository>();
            chipRepository.getRandomChipOfLevel.mockReturnValue({} as ChipItem);

            const coreRepository = mockDeep<CoreRepository>();
            coreRepository.getRandomCoreOfLevel.mockReturnValue({} as CoreItem);

            const itemDropFactory = mockDeep<ItemDropFactory>();
            itemDropFactory.createWeaponDrop.mockReturnValue(weaponDrop);
            itemDropFactory.createChipDrop.mockReturnValue(chipDrop);
            itemDropFactory.createCoreDrop.mockReturnValue(coreDrop);
            itemDropFactory.createMoneyDrop.mockReturnValue(moneyDrop);
            itemDropFactory.createPotionDrop.mockReturnValue(potionDrop);

            const itemDropManager = mockDeep<ItemDropManager>();
            const barrel = makeBreakableBarrel({
                weaponRepository: weaponRepository,
                chipRepository: chipRepository,
                coreRepository: coreRepository,
                itemDropFactory: itemDropFactory,
                itemDropManager: itemDropManager,
            });

            const player = {
                luckDropChanceBonus: 0,
                getTechForWeapon: () => 1,
            } as any;

            const randomSpy = vi.spyOn(Math, 'random');

            randomSpy.mockReturnValueOnce(0.005);
            barrel.dropItem(player);
            expect(itemDropManager.addDrop).toHaveBeenCalledWith(weaponDrop);

            randomSpy.mockReturnValueOnce(0.015);
            barrel.dropItem(player);
            expect(itemDropManager.addDrop).toHaveBeenCalledWith(chipDrop);

            randomSpy.mockReturnValueOnce(0.025);
            barrel.dropItem(player);
            expect(itemDropManager.addDrop).toHaveBeenCalledWith(coreDrop);

            randomSpy.mockReturnValueOnce(0.04);
            barrel.dropItem(player);
            expect(itemDropManager.addDrop).toHaveBeenCalledWith(moneyDrop);

            randomSpy.mockReturnValueOnce(0.33);
            barrel.dropItem(player);
            expect(itemDropManager.addDrop).toHaveBeenCalledWith(potionDrop);

            itemDropManager.addDrop.mockReset();
            randomSpy.mockReturnValueOnce(0.74);
            expect(itemDropManager.addDrop).not.toHaveBeenCalled();

            randomSpy.mockRestore();
        });
    });

    describe('destruction animation', () => {
        it('spawns 8 fragment meshes on hit', () => {
            const scene = mockDeep<THREE.Scene>();
            const barrel = makeBreakableBarrel({ scene: scene });
            barrel.onHit();
            // 1 call for removing original mesh + 8 calls for adding fragments
            const addCalls = scene.add.mock.calls.length;
            // Constructor adds 1 (the barrel mesh), then onHit adds 8 fragments
            expect(addCalls).toBe(1 + 8);
        });

        it('fragments are not removed before FADE_END', () => {
            const scene = mockDeep<THREE.Scene>();
            const barrel = makeBreakableBarrel({ scene: scene });
            barrel.onHit();
            const removeCalls = scene.remove.mock.calls.length;
            barrel.update(0.5);
            expect(scene.remove.mock.calls.length).toBe(removeCalls);
        });

        it('opacity stays at 1 before 0.8s', () => {
            const barrel = makeBreakableBarrel();
            barrel.onHit();
            barrel.update(0.5);
            // Access private fragments via cast to check opacity
            const frags = (barrel as any).fragments;
            expect(frags.length).toBe(8);
            expect(frags[0].mesh.material.opacity).toBe(1);
        });

        it('opacity is between 0 and 1 during fade window (0.8s–1.1s)', () => {
            const barrel = makeBreakableBarrel();
            barrel.onHit();
            barrel.update(0.95);
            const frags = (barrel as any).fragments;
            expect(frags[0].mesh.material.opacity).toBeGreaterThan(0);
            expect(frags[0].mesh.material.opacity).toBeLessThan(1);
        });

        it('fragments are disposed after 1.1s', () => {
            const scene = mockDeep<THREE.Scene>();
            const barrel = makeBreakableBarrel({ scene: scene });
            barrel.onHit();
            barrel.update(1.2);
            const frags = (barrel as any).fragments;
            expect(frags.length).toBe(0);
            // 8 fragments removed from scene (plus the original mesh)
            expect(scene.remove).toHaveBeenCalledTimes(1 + 8);
        });

        it('update is a no-op when barrel is not destroyed', () => {
            const scene = mockDeep<THREE.Scene>();
            const barrel = makeBreakableBarrel({ scene: scene });
            barrel.update(1.0);
            // Only the constructor add call
            expect(scene.add).toHaveBeenCalledTimes(1);
        });

        it('update is a no-op after animation is done', () => {
            const scene = mockDeep<THREE.Scene>();
            const barrel = makeBreakableBarrel({ scene: scene });
            barrel.onHit();
            barrel.update(1.2);
            const removeCalls = scene.remove.mock.calls.length;
            barrel.update(1.0);
            expect(scene.remove.mock.calls.length).toBe(removeCalls);
        });

        it('cleanup disposes in-flight fragments', () => {
            const scene = mockDeep<THREE.Scene>();
            const barrel = makeBreakableBarrel({ scene: scene });
            barrel.onHit();
            barrel.update(0.3);
            const frags = (barrel as any).fragments;
            expect(frags.length).toBe(8);
            barrel.cleanup();
            expect((barrel as any).fragments.length).toBe(0);
            // Original mesh + 8 fragments removed
            expect(scene.remove).toHaveBeenCalledTimes(1 + 8);
        });

        it('fragments move downward under gravity', () => {
            const barrel = makeBreakableBarrel();
            barrel.onHit();
            const frags = (barrel as any).fragments;
            const initialY = frags[0].mesh.position.y;
            // Step enough frames to let gravity overcome initial upward velocity
            // (max initial vy is 4 m/s, gravity is 9.8 m/s²; 25 × 0.05 = 1.25s is enough)
            for (let i = 0; i < 25; i++) barrel.update(0.05);
            expect(frags[0].mesh.position.y).toBeLessThan(initialY);
        });
    });
});
