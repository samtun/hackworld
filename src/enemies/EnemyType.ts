export enum EnemyType {
    Brute = 'brute',
    Stalker = 'stalker',
}

export interface JumpBehaviorConfig {
    cooldown: number;
    minDistanceToPlayer: number;
    forwardDistance: number;
    jumpDuration: number;
    upwardVelocity: number;
}

export interface EnemyTypeDefinition {
    modelPath: string;
    speedMultiplier: number;
    jumpBehavior?: JumpBehaviorConfig;
}

const ENEMY_TYPE_DEFINITIONS: Record<EnemyType, EnemyTypeDefinition> = {
    [EnemyType.Brute]: {
        modelPath: 'models/brute_enemy.glb',
        speedMultiplier: 1.0,
    },
    [EnemyType.Stalker]: {
        modelPath: 'models/stalker_enemy.glb',
        speedMultiplier: 0.8,
        jumpBehavior: {
            cooldown: 5.0,
            minDistanceToPlayer: 2.0,
            forwardDistance: 3.0,
            jumpDuration: 0.28,
            upwardVelocity: 1.2,
        },
    },
};

export const DEFAULT_ENEMY_TYPE = EnemyType.Brute;

export function getEnemyTypeDefinition(enemyType: EnemyType): EnemyTypeDefinition {
    return ENEMY_TYPE_DEFINITIONS[enemyType];
}
