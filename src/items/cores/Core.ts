export enum CoreType {
    HERALD = 'herald',
    SWIFT = 'swift',
    DEFENDER = 'defender',
    PHISHING = 'phishing',
    BACKDOOR = 'backdoor',
}

export interface CoreStats {
    strength?: number;
    defense?: number;
    agility?: number;
    tpStealChance?: number;
    tpStealAmount?: number;
    hpStealChance?: number;
    hpStealAmount?: number;
}

export interface ICore {
    readonly type: CoreType;
    readonly stats: CoreStats;
}
