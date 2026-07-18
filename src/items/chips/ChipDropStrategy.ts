import { ItemDropStrategy } from '../ItemDropManager';
import { ChipDrop } from './ChipDrop';
import { ChipRepository } from './ChipRepository';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../player/Player';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { ItemDropType } from '../ItemDropType';
import { ItemDrop } from '../ItemDrop';
import { ItemDropFactory } from '../ItemDropFactory';

export class ChipDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.CHIP;

    constructor(private readonly itemDropFactory: ItemDropFactory,
        private readonly chipRepository: ChipRepository) { }

    public getDistributionWeight(_enemy: Enemy, _: Player): number {
        return 2;
    }

    drop(enemy: Enemy, player: Player): ItemDrop | null {
        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random chip at the determined level from the repository
        const chipItem = this.chipRepository.getRandomChipOfLevel(level);
        if (!chipItem) return null;

        const dropPosition = enemy.getDeathPosition();
        dropPosition.y += 0.5;

        const drop = this.itemDropFactory.createChipDrop(
            dropPosition, chipItem.id, chipItem.name, chipItem.chipType, chipItem.buyPrice, chipItem.sellPrice, level
        );
        console.log(`Enemy dropped chip ${chipItem.name} (level ${level})`);
        return drop;
    }

    pickup(drop: ChipDrop, player: Player): void {
        // Get the chip from repository by ID to find its type
        const chipItem = this.chipRepository.getChipById(drop.chipId);
        if (!chipItem) {
            console.warn(`Chip not found for ${drop.chipId}`);
            return;
        }

        player.inventory.push(chipItem);
        console.log(`Picked up chip ${chipItem}`);
    }
}
