import { Tier } from './TierManager';

export type InventoryItemKind = 'WeaponItem' | 'CoreItem' | 'ChipItem';

export interface BaseInventorySaveData {
    kind: InventoryItemKind;
    id: string;
    isEquipped: boolean;
}

export interface WeaponInventorySaveData extends BaseInventorySaveData {
    kind: 'WeaponItem';
    buyPrice: number;
    sellPrice: number;
    damage: number;
    tierName: Tier;
}

export interface CoreInventorySaveData extends BaseInventorySaveData {
    kind: 'CoreItem';
}

export interface ChipInventorySaveData extends BaseInventorySaveData {
    kind: 'ChipItem';
}

export type InventoryItemSaveData = WeaponInventorySaveData | CoreInventorySaveData | ChipInventorySaveData;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function isWeaponInventorySaveData(value: unknown): value is WeaponInventorySaveData {
    if (!isRecord(value)) return false;
    return (
        value.kind === 'WeaponItem' &&
        typeof value.id === 'string' &&
        typeof value.isEquipped === 'boolean' &&
        typeof value.buyPrice === 'number' &&
        typeof value.sellPrice === 'number' &&
        typeof value.damage === 'number' &&
        typeof value.tierName === 'string' &&
        Object.values(Tier).includes(value.tierName as Tier)
    );
}

export function isCoreInventorySaveData(value: unknown): value is CoreInventorySaveData {
    if (!isRecord(value)) return false;
    return (
        value.kind === 'CoreItem' &&
        typeof value.id === 'string' &&
        typeof value.isEquipped === 'boolean'
    );
}

export function isChipInventorySaveData(value: unknown): value is ChipInventorySaveData {
    if (!isRecord(value)) return false;
    return (
        value.kind === 'ChipItem' &&
        typeof value.id === 'string' &&
        typeof value.isEquipped === 'boolean'
    );
}

export function deserializeInventoryEntry(value: unknown): InventoryItemSaveData {
    if (isWeaponInventorySaveData(value)) return value;
    if (isCoreInventorySaveData(value)) return value;
    if (isChipInventorySaveData(value)) return value;

    throw new Error(`Invalid inventory save entry: ${JSON.stringify(value)}`);
}
