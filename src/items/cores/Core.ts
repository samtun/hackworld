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
}

export interface CoreStealEffect {
    resource: 'hp' | 'tp';
    amountPercent: number;
    procChanceAlpha: number;
    procChanceOmega: number;
}

export interface ICore {
    readonly type: CoreType;
    readonly stats: CoreStats;
    getStealEffect(): CoreStealEffect | undefined;
}
