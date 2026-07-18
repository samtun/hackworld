import { beforeEach, describe, expect, it, vi } from 'vitest';

const audioManagerMock = vi.hoisted(() => ({
    startHealingStationLoop: vi.fn(),
    stopHealingStationLoop: vi.fn(),
}));

const healingSystemMock = vi.hoisted(() => ({
    unregister: vi.fn(),
}));

vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: audioManagerMock,
    },
}));

vi.mock('./systems/HealingSystem', () => ({
    HealingSystem: {
        Instance: healingSystemMock,
    },
}));

vi.mock('./ParticleShaderUtils', () => ({
    createParticleShaderMaterial: vi.fn(),
    updateParticleScaleFactor: vi.fn(),
}));

vi.mock('./BaseMesh', () => ({
    BaseMesh: class {
        update(): void {}
    },
}));

import { HealingStation } from './HealingStation';

function makeStation(): any {
    const station = Object.create(HealingStation.prototype) as any;
    const disposeMesh = vi.fn();
    station.isHealing = false;
    station.mesh = {};
    station.particles = {
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() },
    };
    station.disposeMesh = disposeMesh;
    station.disposeMeshMock = disposeMesh;
    return station;
}

function makeStationForParticleUpdate(options?: { isHealing?: boolean; lifetime?: number }): any {
    const station = Object.create(HealingStation.prototype) as any;
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
        const station = makeStation();

        station.setHealing(true);

        expect(audioManagerMock.startHealingStationLoop).toHaveBeenCalledOnce();
        expect(station.isHealing).toBe(true);
    });

    it('does not restart the loop when healing stays active', () => {
        const station = makeStation();

        station.setHealing(true);
        station.setHealing(true);

        expect(audioManagerMock.startHealingStationLoop).toHaveBeenCalledOnce();
    });

    it('stops the healing loop when healing ends', () => {
        const station = makeStation();
        station.isHealing = true;

        station.setHealing(false);

        expect(audioManagerMock.stopHealingStationLoop).toHaveBeenCalledOnce();
        expect(station.isHealing).toBe(false);
    });

    it('does not call audio methods when healing is already inactive', () => {
        const station = makeStation();

        station.setHealing(false);

        expect(audioManagerMock.startHealingStationLoop).not.toHaveBeenCalled();
        expect(audioManagerMock.stopHealingStationLoop).not.toHaveBeenCalled();
    });

    it('stops the healing loop during cleanup when the station is active', () => {
        const station = makeStation();
        station.isHealing = true;
        const scene = { remove: vi.fn() } as any;

        station.cleanup(scene);

        expect(healingSystemMock.unregister).toHaveBeenCalledWith(station);
        expect(audioManagerMock.stopHealingStationLoop).toHaveBeenCalledOnce();
        expect(scene.remove).toHaveBeenCalledTimes(2);
        expect(station.disposeMeshMock).toHaveBeenCalledOnce();
        expect(station.particles.geometry.dispose).toHaveBeenCalledOnce();
        expect((station.particles.material as any).dispose).toHaveBeenCalledOnce();
    });
});

describe('HealingStation particle size', () => {
    it('applies a smaller size factor when not healing', () => {
        const healingStation = makeStationForParticleUpdate({ isHealing: true, lifetime: 1 });
        const nonHealingStation = makeStationForParticleUpdate({ isHealing: false, lifetime: 1 });

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
        const station = makeStationForParticleUpdate({ isHealing: true, lifetime: 1.6 });

        station.update(0.1);
        const sizeAfterFirstUpdate = station.particleSystem.sizes[0];

        station.update(0.1);
        const sizeAfterSecondUpdate = station.particleSystem.sizes[0];

        expect(sizeAfterSecondUpdate).toBeLessThan(sizeAfterFirstUpdate);
    });

    it('marks particle position and size attributes for geometry updates', () => {
        const station = makeStationForParticleUpdate({ isHealing: true, lifetime: 1 });

        station.update(0.1);

        expect(station.positionAttributeMock.needsUpdate).toBe(true);
        expect(station.sizeAttributeMock.needsUpdate).toBe(true);
    });
});
