export enum ChipType {
    FIREWIRE = 'firewire',
    OVERCLOCK = 'overclock',
    DATAMINE = 'datamine',
    RAZORWIRE = 'razorwire',
    PATCHWORK = 'patchwork',
    FOCUS = 'focus',
    AMPLIFIER = 'amplifier'
}

export interface IChip {
    readonly type: ChipType;
    readonly effect: number;
    getEffectValue(): number;
}

export interface ChipStats {
    weaponRangeMultiplier?: number; // Multiplier for weapon range (e.g., 1.1 for 10% increase)
    walkSpeedMultiplier?: number; // Multiplier for walk speed (e.g., 1.1 for 10% increase)
    luckMultiplier?: number; // Multiplier for luck stat (e.g., 1.1 for 10% increase)
    criticalDamageMultiplier?: number; // Multiplier for critical hit damage (e.g., 1.2 for 20% increase)
    healingMultiplier?: number; // Multiplier for healing received (e.g., 1.2 for 20% increase)
    critChanceMultiplier?: number; // Multiplier to change crit chance (e.g. 1.02 for 2% bonus)
    skillDamageBonus?: number; // Percentage based skill damage bonus
}
