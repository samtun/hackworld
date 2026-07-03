import type { Body, Vec3 } from 'cannon-es';
import * as THREE from 'three';

export enum EnemyType {
    Brute = 'brute',
    Stalker = 'stalker',
    Pod = 'pod',
}

export enum EnemyAttackMode {
    Melee = 'melee',
    Laser = 'laser',
}

export interface EnemyCombatBehaviorDefinition {
    attackMode: EnemyAttackMode;
    attackCooldown?: number;
    attackRange?: number;
    preferredDistance?: number;
    preferredDistanceTolerance?: number;
    minimumAttackDistance?: number;
    laserColor?: number;
}

export interface EnemyMovementAbilityCommandContext {
    body: Body;
    mesh: THREE.Object3D;
    playerPos: Vec3;
    myPos: Vec3;
    distToPlayer: number;
    normalMoveSpeed: number;
}

export interface EnemyMovementAbilityDefinition {
    id: string;
    cooldown: number;
    /** How long (seconds) the ability controls horizontal movement after executing. While > 0, normal walk velocity is not applied. */
    moveDuration?: number;
    /** Maximum extra random delay (seconds) added on top of cooldown before the ability may fire again. Actual delay is uniform in [0, randomDelay]. */
    randomDelay?: number;
    execute: (context: EnemyMovementAbilityCommandContext) => boolean;
}

export interface EnemyTypeDefinition {
    modelPath: string;
    speedMultiplier: number;
    movementAbilities?: EnemyMovementAbilityDefinition[];
    combatBehavior?: EnemyCombatBehaviorDefinition;
}

const STALKER_JUMP_MIN_DISTANCE_TO_PLAYER = 2.0;
const STALKER_JUMP_UPWARD_VELOCITY = 10;
const STALKER_JUMP_SPEED_MULTIPLIER = 2.0;

// Jump airtime = 2 * STALKER_JUMP_UPWARD_VELOCITY / gravity (25 m/s²) ≈ 0.8 s; add a small buffer.
const STALKER_JUMP_MOVE_DURATION = 0.9;

const stalkerJumpAbility: EnemyMovementAbilityDefinition = {
    id: 'stalker-jump',
    cooldown: 5.0,
    moveDuration: STALKER_JUMP_MOVE_DURATION,
    randomDelay: 10.0,
    execute(context): boolean {
        if (context.distToPlayer <= STALKER_JUMP_MIN_DISTANCE_TO_PLAYER) return false;

        const dx = context.playerPos.x - context.myPos.x;
        const dz = context.playerPos.z - context.myPos.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len <= 0) {
            return false;
        }

        const dirX = dx / len;
        const dirZ = dz / len;
        const horizontalVelocity = context.normalMoveSpeed * STALKER_JUMP_SPEED_MULTIPLIER;
        context.body.velocity.x = dirX * horizontalVelocity;
        context.body.velocity.z = dirZ * horizontalVelocity;
        context.body.velocity.y = Math.max(context.body.velocity.y, STALKER_JUMP_UPWARD_VELOCITY);

        const angle = Math.atan2(dirX, dirZ);
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        context.mesh.quaternion.copy(targetQuaternion);

        return true;
    },
};

const ENEMY_TYPE_DEFINITIONS: Record<EnemyType, EnemyTypeDefinition> = {
    [EnemyType.Brute]: {
        modelPath: 'models/brute_enemy.glb',
        speedMultiplier: 1.0,
        combatBehavior: {
            attackMode: EnemyAttackMode.Melee,
        },
    },
    [EnemyType.Stalker]: {
        modelPath: 'models/stalker_enemy.glb',
        speedMultiplier: 0.8,
        movementAbilities: [stalkerJumpAbility],
        combatBehavior: {
            attackMode: EnemyAttackMode.Melee,
        },
    },
    [EnemyType.Pod]: {
        modelPath: 'models/brute_enemy.glb',
        speedMultiplier: 1.0,
        combatBehavior: {
            attackMode: EnemyAttackMode.Laser,
            attackCooldown: 1.35,
            attackRange: 7.75,
            preferredDistance: 7.0,
            preferredDistanceTolerance: 0.75,
            minimumAttackDistance: 6.0,
            laserColor: 0xff4fd8,
        },
    },
};

export const DEFAULT_ENEMY_TYPE = EnemyType.Brute;

export function getEnemyTypeDefinition(enemyType: EnemyType): EnemyTypeDefinition {
    return ENEMY_TYPE_DEFINITIONS[enemyType];
}
