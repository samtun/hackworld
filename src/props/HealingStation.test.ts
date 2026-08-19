import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HealingStation } from './HealingStation';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTF } from 'three/examples/jsm/Addons.js';
import { mock, mockDeep } from 'vitest-mock-extended';
import { AssetManager } from '../AssetManager';
import { AudioManager } from '../AudioManager';
import { ModelColliderLoader } from '../ModelColliderLoader';
import { HealingSystem } from '../systems/HealingSystem';
import { container } from 'tsyringe';

interface HealingStationDependencyOverrides {
    position?: CANNON.Vec3;
    physicsMaterial?: CANNON.Material;
    assetManager?: AssetManager;
    scene?: THREE.Scene;
    physicsWorld?: CANNON.World;
    audioManager?: AudioManager;
    healingSystem?: HealingSystem;
    modelColliderLoader?: ModelColliderLoader;
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

function makeStation(overrides: HealingStationDependencyOverrides = {}): any {
    const defaultPhysicsMaterial = new CANNON.Material('defaultMaterial');
    const finalAssetManager = overrides.assetManager || createDefaultAssetManager();
    const finalPhysicsWorld = overrides.physicsWorld || createDefaultPhysicsWorld(defaultPhysicsMaterial);

    container.registerInstance(AssetManager, finalAssetManager);

    const {
        position = new CANNON.Vec3(0, 0, 0),
        scene = mockDeep<THREE.Scene>(),
        physicsWorld = finalPhysicsWorld,
        physicsMaterial = defaultPhysicsMaterial,
        modelColliderLoader = mock<ModelColliderLoader>(),
        audioManager = mock<AudioManager>(),
        assetManager = finalAssetManager,
        healingSystem = mock<HealingSystem>(),
    } = overrides;

    return new HealingStation(
        position,
        scene,
        physicsWorld,
        physicsMaterial,
        modelColliderLoader,
        assetManager,
        healingSystem,
        audioManager,
    );
}

function setupStationForParticleUpdate(healingStation: HealingStation, options?: { isHealing?: boolean; lifetime?: number }): any {
    const station = healingStation as any;
    const lifetime = options?.lifetime ?? 1;

    station.isHealing = options?.isHealing ?? false;
    station.time = 0;
    station.mixers = [];
    station.mesh = { position: { x: 0, y: 10, z: 0 } };
    station.PARTICLE_COUNT = 1;
    station.PARTICLE_LIFETIME = 1.8;
    station.NORMAL_RISE_SPEED = 0.3;
    station.HEALING_RISE_SPEED = 2.4;
    station.MAX_PARTICLE_SIZE = 0.5;
    station.MAX_DELTA_TIME = 0.1;

    station.particleSystem = {
        positions: new Float32Array([0, 10, 0]),
        velocities: new Float32Array(3),
        lifetimes: new Float32Array([lifetime]),
        sizes: new Float32Array([0.5]),
        count: 1,
    };

    const positionAttribute = { needsUpdate: false };
    const sizeAttribute = { needsUpdate: false };

    station.particles = {
        geometry: {
            getAttribute: vi.fn((name: string) => {
                if (name === 'position') return positionAttribute;
                if (name === 'size') return sizeAttribute;
                return null;
            }),
        },
    };

    station.positionAttributeMock = positionAttribute;
    station.sizeAttributeMock = sizeAttribute;

    return station;
}

describe('HealingStation audio hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts the healing loop when healing becomes active', () => {
        const audioManagerMock = mock<AudioManager>();
        const station = makeStation({ audioManager: audioManagerMock });

        station.setHealing(true);

        expect(audioManagerMock.startHealingStationLoop).toHaveBeenCalledOnce();
        expect(station.isHealing).toBe(true);
    });

    it('does not restart the loop when healing stays active', () => {
        const audioManagerMock = mock<AudioManager>();
        const station = makeStation({ audioManager: audioManagerMock });

        station.setHealing(true);
        station.setHealing(true);

        expect(audioManagerMock.startHealingStationLoop).toHaveBeenCalledOnce();
    });

    it('stops the healing loop when healing ends', () => {
        const audioManagerMock = mock<AudioManager>();
        const station = makeStation({ audioManager: audioManagerMock });
        station.isHealing = true;

        station.setHealing(false);

        expect(audioManagerMock.stopHealingStationLoop).toHaveBeenCalledOnce();
        expect(station.isHealing).toBe(false);
    });

    it('does not call audio methods when healing is already inactive', () => {
        const audioManagerMock = mock<AudioManager>();
        const station = makeStation({ audioManager: audioManagerMock });

        station.setHealing(false);

        expect(audioManagerMock.startHealingStationLoop).not.toHaveBeenCalled();
        expect(audioManagerMock.stopHealingStationLoop).not.toHaveBeenCalled();
    });

    it('stops the healing loop during cleanup when the station is active', () => {
        const healingSystemMock = mock<HealingSystem>();
        const audioManagerMock = mock<AudioManager>();
        const station = makeStation({ audioManager: audioManagerMock, healingSystem: healingSystemMock });
        const disposeMeshSpy = vi.spyOn(station, 'disposeMesh');
        const particlesGeometryDisposeSpy = vi.spyOn(station.particles.geometry, 'dispose');
        const particlesMaterialDisposeSpy = vi.spyOn(station.particles.material as any, 'dispose');
        station.isHealing = true;
        const scene = { remove: vi.fn() } as any;

        station.cleanup(scene);

        expect(healingSystemMock.unregister).toHaveBeenCalledWith(station);
        expect(audioManagerMock.stopHealingStationLoop).toHaveBeenCalledOnce();
        expect(scene.remove).toHaveBeenCalledTimes(2);
        expect(disposeMeshSpy).toHaveBeenCalledOnce();
        expect(particlesGeometryDisposeSpy).toHaveBeenCalledOnce();
        expect(particlesMaterialDisposeSpy).toHaveBeenCalledOnce();
    });
});

describe('HealingStation particle size', () => {
    it('applies a smaller size factor when not healing', () => {
        const healingStation = makeStation();
        setupStationForParticleUpdate(healingStation, { isHealing: true, lifetime: 1 });
        const nonHealingStation = makeStation();
        setupStationForParticleUpdate(nonHealingStation, { isHealing: false, lifetime: 1 });

        healingStation.update(0.1);
        nonHealingStation.update(0.1);

        expect(healingStation.particleSystem.sizes[0]).toBeCloseTo(0.25, 5);
        expect(nonHealingStation.particleSystem.sizes[0]).toBeCloseTo(0.15, 5);
        expect(nonHealingStation.particleSystem.sizes[0]).toBeCloseTo(
            healingStation.particleSystem.sizes[0] * 0.6,
            5
        );
    });

    it('shrinks particle size as lifetime decreases', () => {
        const station = makeStation();
        setupStationForParticleUpdate(station, { isHealing: true, lifetime: 1.6 });

        station.update(0.1);
        const sizeAfterFirstUpdate = station.particleSystem.sizes[0];

        station.update(0.1);
        const sizeAfterSecondUpdate = station.particleSystem.sizes[0];

        expect(sizeAfterSecondUpdate).toBeLessThan(sizeAfterFirstUpdate);
    });

    it('marks particle position and size attributes for geometry updates', () => {
        const station = makeStation();
        setupStationForParticleUpdate(station, { isHealing: true, lifetime: 1 });

        station.update(0.1);

        expect(station.positionAttributeMock.needsUpdate).toBe(true);
        expect(station.sizeAttributeMock.needsUpdate).toBe(true);
    });
});
