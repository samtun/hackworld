import { PlayerRegistry } from '../player/PlayerRegistry';
import { Player } from '../player/Player';
import { IHealingStation } from './IHealingStation';
import { singleton } from 'tsyringe';

@singleton()
export class HealingSystem {
    private stations: Set<IHealingStation> = new Set();
    private readonly HEALING_DURATION = 2.5; // seconds to full heal
    private healAccumulators: WeakMap<Player, { hp: number; tp: number }> = new WeakMap();

    constructor(private readonly playerRegistry: PlayerRegistry) { }

    register(station: IHealingStation) {
        this.stations.add(station);
    }

    unregister(station: IHealingStation) {
        this.stations.delete(station);
    }

    update(deltaTime: number) {
        if (!this.playerRegistry.hasActivePlayer()) {
            // Still update visuals (turn off healing on stations)
            for (const s of this.stations) s.setHealing(false);
            return;
        }

        const playersInHealingRange = new Set<Player>();
        const players = this.playerRegistry.activePlayers;

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

                        const accumulatedFractional = this.healAccumulators.get(player) ?? { hp: 0, tp: 0 };
                        const hpTotal = accumulatedFractional.hp + hpHeal;
                        const tpTotal = accumulatedFractional.tp + tpHeal;
                        const hpWhole = Math.floor(hpTotal);
                        const tpWhole = Math.floor(tpTotal);

                        if (hpWhole > 0 || tpWhole > 0) {
                            player.heal(hpWhole, tpWhole);
                        }

                        this.healAccumulators.set(player, {
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
                this.healAccumulators.delete(player);
            }
        }
    }
}
