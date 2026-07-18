import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerFactory } from './PlayerRegistry';
import { Player } from './Player';

function makePlayer(id: string): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, { id });
    return player;
}

describe('PlayerRegistry', () => {
    let registry: PlayerFactory;

    beforeEach(() => {
        // Reset singleton for test isolation
        (PlayerFactory as any).instance = undefined;
        registry = PlayerFactory.Instance;
    });

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(PlayerFactory.Instance).toBe(registry);
        });
    });

    describe('activePlayers', () => {
        it('starts empty', () => {
            expect(registry.activePlayers).toEqual([]);
        });
    });

    describe('addPlayer', () => {
        it('adds a player to the registry', () => {
            const player = makePlayer('p1');
            registry.addPlayer(player);
            expect(registry.activePlayers).toContain(player);
        });

        it('can hold multiple players', () => {
            registry.addPlayer(makePlayer('p1'));
            registry.addPlayer(makePlayer('p2'));
            expect(registry.activePlayers).toHaveLength(2);
        });
    });

    describe('removePlayer', () => {
        it('removes the player with the given id', () => {
            const player = makePlayer('p1');
            registry.addPlayer(player);
            registry.removePlayer('p1');
            expect(registry.activePlayers).not.toContain(player);
        });

        it('does not affect other players when removing by id', () => {
            const p1 = makePlayer('p1');
            const p2 = makePlayer('p2');
            registry.addPlayer(p1);
            registry.addPlayer(p2);
            registry.removePlayer('p1');
            expect(registry.activePlayers).toContain(p2);
            expect(registry.activePlayers).toHaveLength(1);
        });

        it('does nothing when id does not match any player', () => {
            registry.addPlayer(makePlayer('p1'));
            registry.removePlayer('non-existent');
            expect(registry.activePlayers).toHaveLength(1);
        });
    });
});
