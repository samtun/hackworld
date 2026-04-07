export enum ChipType {
    FIREWIRE = 'firewire',
    OVERCLOCK = 'overclock',
    DATAMINE = 'datamine',
    RAZORWIRE = 'razorwire',
    PATCHWORK = 'patchwork'
}

export interface ChipStats {
    weaponRangeMultiplier?: number; // Multiplier for weapon range (e.g., 1.1 for 10% increase)
    walkSpeedMultiplier?: number; // Multiplier for walk speed (e.g., 1.1 for 10% increase)
    luckMultiplier?: number; // Multiplier for luck stat (e.g., 1.1 for 10% increase)
    criticalDamageMultiplier?: number; // Multiplier for critical hit damage (e.g., 1.2 for 20% increase)
    healingMultiplier?: number; // Multiplier for healing received (e.g., 1.2 for 20% increase)
}
