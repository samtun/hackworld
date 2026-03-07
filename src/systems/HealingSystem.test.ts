import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealingSystem } from './HealingSystem';
import { PlayerRegistry } from '../PlayerRegistry';
import { IHealingStation } from './IHealingStation';
import { Player } from '../Player';
import * as THREE from 'three';

function makeStation(x = 0, y = 0, z = 0, radius = 3): IHealingStation {
    return {
        getPosition: vi.fn().mockReturnValue(new THREE.Vector3(x, y, z)),
        getRadius: vi.fn().mockReturnValue(radius),
        setHealing: vi.fn(),
    };
}

function makePlayer(overrides: Partial<Record<string, unknown>> = {}): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, {
        hp: 100,
        maxHp: 100,
        tp: 50,
        maxTp: 50,
        position: new THREE.Vector3(0, 0, 0),
        heal: vi.fn(),
        ...overrides,
    });
    return player;
}

describe('HealingSystem', () => {
    let system: HealingSystem;

    beforeEach(() => {
        // Reset singleton state
        (HealingSystem as any).instance = undefined;
        system = HealingSystem.Instance;

        // Reset PlayerRegistry
        (PlayerRegistry as any).instance = undefined;
    });

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(HealingSystem.Instance).toBe(system);
        });
    });

    describe('register / unregister', () => {
        it('registers a station and it receives update calls', () => {
            const station = makeStation();
            system.register(station);
            system.update(0.016);
            expect(station.setHealing).toHaveBeenCalled();
        });

        it('unregisters a station so it no longer receives update calls', () => {
            const station = makeStation();
            system.register(station);
            system.unregister(station);
            system.update(0.016);
            expect(station.setHealing).not.toHaveBeenCalled();
        });
    });

    describe('update with no players', () => {
        it('calls setHealing(false) on all stations when no players are present', () => {
            const station = makeStation();
            system.register(station);
            system.update(0.016);
            expect(station.setHealing).toHaveBeenCalledWith(false);
        });
    });

    describe('update with a player in range', () => {
        it('calls setHealing(true) when a player is within the station radius', () => {
            const station = makeStation(0, 0, 0, 3);
            system.register(station);

            const player = makePlayer({ position: new THREE.Vector3(1, 0, 0) }); // dist=1, within radius 3
            PlayerRegistry.Instance.addPlayer(player);

            system.update(0.016);
            expect(station.setHealing).toHaveBeenCalledWith(true);
        });

        it('heals the player when hp < maxHp', () => {
            const station = makeStation(0, 0, 0, 3);
            system.register(station);

            const heal = vi.fn();
            const player = makePlayer({ hp: 50, maxHp: 100, tp: 25, maxTp: 50, position: new THREE.Vector3(0, 0, 0), heal });
            PlayerRegistry.Instance.addPlayer(player);

            system.update(0.1);
            expect(heal).toHaveBeenCalled();
        });

        it('does not heal the player when hp and tp are both full', () => {
            const station = makeStation(0, 0, 0, 3);
            system.register(station);

            const heal = vi.fn();
            const player = makePlayer({ hp: 100, maxHp: 100, tp: 50, maxTp: 50, position: new THREE.Vector3(0, 0, 0), heal });
            PlayerRegistry.Instance.addPlayer(player);

            system.update(0.1);
            expect(heal).not.toHaveBeenCalled();
        });
    });

    describe('update with a player out of range', () => {
        it('calls setHealing(false) when player is outside radius', () => {
            const station = makeStation(0, 0, 0, 2);
            system.register(station);

            const player = makePlayer({ position: new THREE.Vector3(10, 0, 0) }); // dist=10, outside radius 2
            PlayerRegistry.Instance.addPlayer(player);

            system.update(0.016);
            expect(station.setHealing).toHaveBeenCalledWith(false);
        });
    });
});
