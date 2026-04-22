import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemDrop } from '../ItemDrop';
import { ItemDropStrategy } from '../ItemDropManager';
import { ItemDropType } from '../ItemDropType';

export class MinimapDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.MINIMAP;

    getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 0;
    }

    drop(): ItemDrop | null {
        return null;
    }

    pickup(_drop: ItemDrop, _player: Player): void {
        // Intentionally empty: minimap pickup unlocks stage minimap in World.ts.
    }
}
