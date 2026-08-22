import { describe, it, expect } from 'vitest';2
import { Player } from './Player';
import { PlayerRegistry } from './PlayerRegistry';

function makePlayer(id: string): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, { id });
    return player;
}

function makePlayerRegistry() {
    return new PlayerRegistry();
}

describe('PlayerRegistry', () => {
    describe('activePlayers', () => {
        it('starts empty', () => {
            const registry = makePlayerRegistry();
            expect(registry.activePlayers).toEqual([]);
        });
    });

    describe('addPlayer', () => {
        it('adds a player to the registry', () => {
            const player = makePlayer('p1');
            const registry = makePlayerRegistry();
            registry.addPlayer(player);
            expect(registry.activePlayers).toContain(player);
        });

        it('can hold multiple players', () => {
            const registry = makePlayerRegistry();
            registry.addPlayer(makePlayer('p1'));
            registry.addPlayer(makePlayer('p2'));
            expect(registry.activePlayers).toHaveLength(2);
        });
    });

    describe('removePlayer', () => {
        it('removes the player with the given id', () => {
            const player = makePlayer('p1');
            const registry = makePlayerRegistry();
            registry.addPlayer(player);
            registry.removePlayer('p1');
            expect(registry.activePlayers).not.toContain(player);
        });

        it('does not affect other players when removing by id', () => {
            const p1 = makePlayer('p1');
            const p2 = makePlayer('p2');
            const registry = makePlayerRegistry();
            registry.addPlayer(p1);
            registry.addPlayer(p2);
            registry.removePlayer('p1');
            expect(registry.activePlayers).toContain(p2);
            expect(registry.activePlayers).toHaveLength(1);
        });

        it('does nothing when id does not match any player', () => {
            const registry = makePlayerRegistry();
            registry.addPlayer(makePlayer('p1'));
            registry.removePlayer('non-existent');
            expect(registry.activePlayers).toHaveLength(1);
        });
    });
});
