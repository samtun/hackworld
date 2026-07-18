import { ItemDropStrategy } from '../ItemDropManager';
import { CoreDrop } from './CoreDrop';
import { CoreRepository } from './CoreRepository';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../player/Player';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { ItemDropType } from '../ItemDropType';
import { ItemDropFactory } from '../ItemDropFactory';
import { ItemDrop } from '../ItemDrop';
import { singleton } from 'tsyringe';

@singleton()
export class CoreDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.CORE;

    constructor(private readonly itemDropFactory: ItemDropFactory,
        private readonly coreRepository: CoreRepository) { }

    public getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 2;
    }

    drop(enemy: Enemy, player: Player): ItemDrop | null {
        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random core at the determined level from the repository
        const coreItem = this.coreRepository.getRandomCoreOfLevel(level);
        if (!coreItem) return null;

        const dropPosition = enemy.getDeathPosition();
        dropPosition.y += 0.5;

        const drop = this.itemDropFactory.createCoreDrop(
            dropPosition, coreItem.id, coreItem.name, coreItem.buyPrice, coreItem.sellPrice, level
        );
        console.log(`Enemy dropped ${drop}`);
        return drop;
    }

    pickup(drop: CoreDrop, player: Player): void {
        // Get the core from repository by ID to find its name
        const coreItem = this.coreRepository.getCoreById(drop.coreId);
        if (!coreItem) {
            console.warn(`Core not found for ${drop.coreId}`);
            return;
        }

        player.inventory.push(coreItem);
        console.log(`Picked up core ${coreItem})`);
    }
}
