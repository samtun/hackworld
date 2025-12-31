import { Player } from "./Player";

export class PlayerRegistry {
    private static instance: PlayerRegistry; // Singleton

    private players: Player[] = [];

    private constructor() {
    }

    public static get Instance(): PlayerRegistry {
        return this.instance || (this.instance = new this());
    }

    addPlayer(player: Player) {
        this.players.push(player);
    }

    removePlayer(playerId: string) {
        this.players = this.players.filter(player => player.id !== playerId)
    }

    get activePlayers(): Player[] {
        return this.players;
    }
}