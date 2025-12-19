export enum ChipType {
    FIREWIRE = 'firewire',
    OVERCLOCK = 'overclock'
}

export interface ChipStats {
    weaponRangeMultiplier?: number; // Multiplier for weapon range (e.g., 1.1 for 10% increase)
    walkSpeedMultiplier?: number; // Multiplier for walk speed (e.g., 1.1 for 10% increase)
}
