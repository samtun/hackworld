import { describe, it, expect, vi } from 'vitest';
import { HealingSystem } from './HealingSystem';
import { PlayerRegistry } from '../player/PlayerRegistry';
import { IHealingStation } from './IHealingStation';
import { Player } from '../player/Player';
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

function makePlayerRegistry(players: Player[] = []): PlayerRegistry {
    const registry = {
        activePlayers: players,
        hasActivePlayer: vi.fn(() => players.length > 0),
    } as unknown as PlayerRegistry;

    return registry;
}

describe('HealingSystem', () => {
    describe('register / unregister', () => {
        it('registers a station and it receives update calls', () => {
            const playerRegistry = makePlayerRegistry();
            const system = new HealingSystem(playerRegistry);
            const station = makeStation();

            system.register(station);
            system.update(0.016);

            expect(station.setHealing).toHaveBeenCalled();
        });

        it('unregisters a station so it no longer receives update calls', () => {
            const playerRegistry = makePlayerRegistry();
            const system = new HealingSystem(playerRegistry);
            const station = makeStation();

            system.register(station);
            system.unregister(station);
            system.update(0.016);

            expect(station.setHealing).not.toHaveBeenCalled();
        });
    });

    describe('update with no players', () => {
        it('calls setHealing(false) on all stations when no players are present', () => {
            const playerRegistry = makePlayerRegistry();
            const system = new HealingSystem(playerRegistry);
            const station = makeStation();

            system.register(station);
            system.update(0.016);

            expect(station.setHealing).toHaveBeenCalledWith(false);
        });
    });

    describe('update with a player in range', () => {
        it('calls setHealing(true) when a player is within the station radius', () => {
            const player = makePlayer({ position: new THREE.Vector3(1, 0, 0) });
            const playerRegistry = makePlayerRegistry([player]);
            const system = new HealingSystem(playerRegistry);
            const station = makeStation(0, 0, 0, 3);

            system.register(station);
            system.update(0.016);

            expect(station.setHealing).toHaveBeenCalledWith(true);
        });

        it('heals the player when hp < maxHp', () => {
            const heal = vi.fn();
            const player = makePlayer({
                hp: 50,
                maxHp: 100,
                tp: 25,
                maxTp: 50,
                position: new THREE.Vector3(0, 0, 0),
                heal,
            });
            const playerRegistry = makePlayerRegistry([player]);
            const system = new HealingSystem(playerRegistry);
            const station = makeStation(0, 0, 0, 3);

            system.register(station);
            system.update(0.1);

            expect(heal).toHaveBeenCalled();
        });

        it('accumulates small TP heals across updates', () => {
            const heal = vi.fn();
            const player = makePlayer({
                hp: 0,
                maxHp: 0,
                tp: 0,
                maxTp: 50,
                position: new THREE.Vector3(0, 0, 0),
                heal,
            });
            const playerRegistry = makePlayerRegistry([player]);
            const system = new HealingSystem(playerRegistry);
            const station = makeStation(0, 0, 0, 3);

            system.register(station);

            // 50 * (0.016 / 2.5) = 0.32 TP per frame; after 4 frames this is 1.28, so heal(0, 1) triggers.
            system.update(0.016);
            system.update(0.016);
            system.update(0.016);
            expect(heal).not.toHaveBeenCalled();

            system.update(0.016);
            expect(heal).toHaveBeenCalledWith(0, 1);
        });

        it('does not heal the player when hp and tp are both full', () => {
            const heal = vi.fn();
            const player = makePlayer({
                hp: 100,
                maxHp: 100,
                tp: 50,
                maxTp: 50,
                position: new THREE.Vector3(0, 0, 0),
                heal,
            });
            const playerRegistry = makePlayerRegistry([player]);
            const system = new HealingSystem(playerRegistry);
            const station = makeStation(0, 0, 0, 3);

            system.register(station);
            system.update(0.1);

            expect(heal).not.toHaveBeenCalled();
        });
    });

    describe('update with a player out of range', () => {
        it('calls setHealing(false) when player is outside radius', () => {
            const player = makePlayer({ position: new THREE.Vector3(10, 0, 0) });
            const playerRegistry = makePlayerRegistry([player]);
            const system = new HealingSystem(playerRegistry);
            const station = makeStation(0, 0, 0, 2);

            system.register(station);
            system.update(0.016);

            expect(station.setHealing).toHaveBeenCalledWith(false);
        });
    });
});
