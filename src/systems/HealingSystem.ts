import { PlayerRegistry } from '../PlayerRegistry';
import { IHealingStation } from './IHealingStation';

export class HealingSystem {
    private static instance: HealingSystem;
    private stations: Set<IHealingStation> = new Set();
    private readonly HEALING_DURATION = 2.5; // seconds to full heal
    private stationHealRemainders: WeakMap<object, { hp: number; tp: number }> = new WeakMap();

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
            this.stationHealRemainders = new WeakMap();
            return;
        }

        const playersInHealingRange = new Set<object>();

        for (const station of this.stations) {
            const stationPos = station.getPosition();
            const radius = station.getRadius();

            let anyHealing = false;

            for (const player of players) {
                const dist = player.position.distanceTo(stationPos);
                if (dist < radius) {
                    anyHealing = true;
                    playersInHealingRange.add(player);
                    if (player.hp < player.maxHp || player.tp < player.maxTp) {
                        const healPercentage = deltaTime / this.HEALING_DURATION;
                        const hpHeal = player.maxHp * healPercentage;
                        const tpHeal = player.maxTp * healPercentage;

                        const remainder = this.stationHealRemainders.get(player) ?? { hp: 0, tp: 0 };
                        const hpTotal = remainder.hp + hpHeal;
                        const tpTotal = remainder.tp + tpHeal;
                        const hpWhole = Math.floor(hpTotal);
                        const tpWhole = Math.floor(tpTotal);

                        if (hpWhole > 0 || tpWhole > 0) {
                            player.heal(hpWhole, tpWhole);
                        }

                        this.stationHealRemainders.set(player, {
                            hp: hpTotal - hpWhole,
                            tp: tpTotal - tpWhole,
                        });
                    }
                }
            }

            station.setHealing(anyHealing);
        }

        for (const player of players) {
            if (!playersInHealingRange.has(player)) {
                this.stationHealRemainders.delete(player);
            }
        }
    }
}
