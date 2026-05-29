import type { Body, Vec3 } from 'cannon-es';
import * as THREE from 'three';

export enum EnemyType {
    Brute = 'brute',
    Stalker = 'stalker',
}

export interface EnemyMovementAbilityCommandContext {
    body: Body;
    mesh: THREE.Object3D;
    playerPos: Vec3;
    myPos: Vec3;
    distToPlayer: number;
}

export interface EnemyMovementAbilityDefinition {
    id: string;
    cooldown: number;
    execute: (context: EnemyMovementAbilityCommandContext) => boolean;
}

export interface EnemyTypeDefinition {
    modelPath: string;
    speedMultiplier: number;
    movementAbilities?: EnemyMovementAbilityDefinition[];
}

const STALKER_JUMP_MIN_DISTANCE_TO_PLAYER = 2.0;
const STALKER_JUMP_FORWARD_DISTANCE = 3.0;
const STALKER_JUMP_DURATION = 0.28;
const STALKER_JUMP_UPWARD_VELOCITY = 1.2;

const stalkerJumpAbility: EnemyMovementAbilityDefinition = {
    id: 'stalker-jump',
    cooldown: 5.0,
    execute(context): boolean {
        if (context.distToPlayer <= STALKER_JUMP_MIN_DISTANCE_TO_PLAYER) return false;

        const dx = context.playerPos.x - context.myPos.x;
        const dz = context.playerPos.z - context.myPos.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len <= 0) return false;

        const dirX = dx / len;
        const dirZ = dz / len;
        const horizontalVelocity = STALKER_JUMP_FORWARD_DISTANCE / STALKER_JUMP_DURATION;
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
    },
    [EnemyType.Stalker]: {
        modelPath: 'models/stalker_enemy.glb',
        speedMultiplier: 0.8,
        movementAbilities: [stalkerJumpAbility],
    },
};

export const DEFAULT_ENEMY_TYPE = EnemyType.Brute;

export function getEnemyTypeDefinition(enemyType: EnemyType): EnemyTypeDefinition {
    return ENEMY_TYPE_DEFINITIONS[enemyType];
}
