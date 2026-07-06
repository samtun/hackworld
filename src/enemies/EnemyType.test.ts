import { describe, expect, it } from 'vitest';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { EnemyAttackMode, EnemyType, getEnemyTypeDefinition } from './EnemyType';

const TEST_NORMAL_MOVE_SPEED = 2.4;

describe('EnemyType definitions', () => {
    it('keeps brute without movement abilities', () => {
        const bruteDefinition = getEnemyTypeDefinition(EnemyType.Brute);
        expect(bruteDefinition.movementAbilities).toBeUndefined();
    });

    it('defines stalker jump ability with cooldown', () => {
        const stalkerDefinition = getEnemyTypeDefinition(EnemyType.Stalker);
        expect(stalkerDefinition.movementAbilities).toHaveLength(1);
        expect(stalkerDefinition.movementAbilities?.[0].id).toBe('stalker-jump');
        expect(stalkerDefinition.movementAbilities?.[0].cooldown).toBe(5.0);
    });

    it('defines pod as a ranged enemy using the brute placeholder model', () => {
        const podDefinition = getEnemyTypeDefinition(EnemyType.Pod);
        expect(podDefinition.modelPath).toBe('models/brute_enemy.glb');
        expect(podDefinition.combatBehavior?.attackMode).toBe(EnemyAttackMode.Ranged);
        expect(podDefinition.combatBehavior?.preferredDistance).toBe(7.0);
        expect(podDefinition.combatBehavior?.attackRange).toBe(7.75);
    });

    it('executes stalker jump only when distance condition is met', () => {
        const stalkerDefinition = getEnemyTypeDefinition(EnemyType.Stalker);
        const jumpAbility = stalkerDefinition.movementAbilities?.[0];
        expect(jumpAbility).toBeDefined();

        const body = { velocity: { x: 0, y: 0, z: 0 } } as unknown as CANNON.Body;
        const mesh = new THREE.Object3D();

        const blocked = jumpAbility?.execute({
            body,
            mesh,
            playerPos: new CANNON.Vec3(1.5, 0, 0),
            myPos: new CANNON.Vec3(0, 0, 0),
            distToPlayer: 1.5,
            normalMoveSpeed: TEST_NORMAL_MOVE_SPEED,
        });
        expect(blocked).toBe(false);
        expect(body.velocity.x).toBe(0);
        expect(body.velocity.z).toBe(0);

        const executed = jumpAbility?.execute({
            body,
            mesh,
            playerPos: new CANNON.Vec3(3.5, 0, 0),
            myPos: new CANNON.Vec3(0, 0, 0),
            distToPlayer: 3.5,
            normalMoveSpeed: TEST_NORMAL_MOVE_SPEED,
        });
        expect(executed).toBe(true);
        expect(body.velocity.x).toBeCloseTo(TEST_NORMAL_MOVE_SPEED * 2, 5);
        expect(body.velocity.y).toBeCloseTo(10, 5);
    });
});
