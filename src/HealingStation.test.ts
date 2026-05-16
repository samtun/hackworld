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
    BaseMesh: class {},
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
