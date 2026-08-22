import { Player } from "./Player";
import { singleton } from "tsyringe";

@singleton()
export class PlayerRegistry {
    private players: Player[] = [];

    addPlayer(player: Player) {
        this.players.push(player);
    }

    removePlayer(playerId: string) {
        this.players = this.players.filter(player => player.id !== playerId)
    }

    get activePlayers(): Player[] {
        return this.players;
    }

    hasActivePlayer() {
        return this.players.length > 0;
    }
}