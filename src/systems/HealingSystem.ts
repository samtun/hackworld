import { PlayerRegistry } from '../PlayerRegistry';
import { IHealingStation } from './IHealingStation';

export class HealingSystem {
    private static instance: HealingSystem;
    private stations: Set<IHealingStation> = new Set();
    private readonly HEALING_DURATION = 2.5; // seconds to full heal

    private constructor() { }

    public static get Instance(): HealingSystem {
        return this.instance || (this.instance = new this());
    }

    register(station: IHealingStation) {
        this.stations.add(station);
    }

    unregister(station: IHealingStation) {
        this.stations.delete(station);
    }

    update(deltaTime: number) {
        const players = PlayerRegistry.Instance.activePlayers;
        if (!players || players.length === 0) {
            // Still update visuals (turn off healing on stations)
            for (const s of this.stations) s.setHealing(false);
            return;
        }

        for (const station of this.stations) {
            const stationPos = station.getPosition();
            const radius = station.getRadius();

            let anyHealing = false;

            for (const player of players) {
                const dist = player.position.distanceTo(stationPos);
                if (dist < radius) {
                    anyHealing = true;
                    if (player.hp < player.maxHp || player.tp < player.maxTp) {
                        const healPercentage = deltaTime / this.HEALING_DURATION;
                        const hpHeal = player.maxHp * healPercentage;
                        const tpHeal = player.maxTp * healPercentage;
                        player.heal(hpHeal, tpHeal);
                    }
                }
            }

            station.setHealing(anyHealing);
        }
    }
}
