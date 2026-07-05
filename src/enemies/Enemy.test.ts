import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: {
            playFootstep: vi.fn(),
            playAttack: vi.fn(),
            playDamage: vi.fn(),
            playDeath: vi.fn(),
        },
    },
}));

import { Enemy, MAX_ENEMY_RADIUS, ENEMY_RADIUS_FACTOR } from './Enemy';
import { AudioManager } from '../AudioManager';
import { PLAYER_COLLISION_GROUP } from '../Player';
import { EnemyType, getEnemyTypeDefinition } from './EnemyType';

const WORLD_COLLISION_GROUP = 1;

function mockAction() {
    const action: any = {
        isRunning: vi.fn().mockReturnValue(false),
        loop: 0,
        clampWhenFinished: false,
        timeScale: 1,
    };
    action.reset = vi.fn().mockReturnValue(action);
    action.fadeIn = vi.fn().mockReturnValue(action);
    action.fadeOut = vi.fn().mockReturnValue(action);
    action.play = vi.fn().mockReturnValue(action);
    return action;
}

/**
 * Create a minimal Enemy instance bypassing the Three.js / Cannon-es constructor.
 */
function makeEnemy(overrides: Partial<Record<string, unknown>> = {}): Enemy {
    const enemy = Object.create(Enemy.prototype) as Enemy;

    Object.assign(enemy, {
        // Combat stats
        maxHp: 60,
        hp: 60,
        damage: 10,
        speed: 3,
        attackRange: 1.5,
        attackCooldown: 1.0,
        attackTimer: 0,
        baseExp: 10,
        itemDropChance: 0.05,
        xDataDropChanceWeight: 1,
        criticalChance: 0.04,
        criticalHitMultiplier: 1.2,
        techDropRateFactor: 1.0,
        enemyType: EnemyType.Brute,
        enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Brute),
        enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Brute).combatBehavior,
        enemyTypeAbilityCooldownTimers: new Map(),

        // State flags
        isDead: false,
        isDying: false,
        isDeathFading: false,
        isAttacking: false,
        isReturningToBase: false,

        // Timers
        flashTimer: 0,
        stunTimer: 0,
        spawnInactiveTimer: 0,
        attackAnimTimer: 0,
        deathTimer: 0,
        deathFadeDuration: 0.5,
        deathFadeTimer: 0,
        returnToBaseTimer: 0,
        hasDealtDamageThisAttack: false,

        // Geometry
        bodyHalfExtentY: 0.875,
        aggroRange: 15,
        baseArrivalThreshold: 0.5,
        returnWaitTime: 2.0,
        attackHitboxDelay: 0.42,
        attackHitboxDuration: 0.2,
        attackMaxDuration: 1.0,
        attackHitboxSize: { x: 0.5, y: 0.5, z: 0.8 },
        attackHitboxOffset: 1.0,
        size: 1.75,
        radius: 0.6,

        // Materials (empty so flash operations are no-ops)
        materials: [],

        // Mocked physics body
        body: {
            position: { x: 0, y: 1, z: 0, copy: vi.fn(), vsub: (_v: any) => ({ x: 0, y: 0, z: 0 }) },
            velocity: { x: 0, y: 0, z: 0 },
            collisionResponse: true,
            collisionFilterMask: -1,
        },

        // Mocked base position for return-to-base behaviour
        basePosition: {
            x: 0, y: 0, z: 0,
            distanceTo: () => 0,
            vsub: (_v: any) => ({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
            clone: () => ({ x: 0, y: 0, z: 0 }),
        },

        // Mocked scene/world
        world: {
            addBody: vi.fn(),
            removeBody: vi.fn(),
            bodies: [],
            broadphase: { aabbQuery: vi.fn().mockReturnValue([]) },
            raycastAll: vi.fn().mockReturnValue(false),
        },
        scene: { add: vi.fn(), remove: vi.fn() },
        mesh: {
            position: { x: 0, y: 0, z: 0, copy: vi.fn() },
            quaternion: { slerp: vi.fn() },
            children: [],
            traverse: vi.fn(),
        },

        // Attack hitbox
        attackHitboxBody: null,
        attackHitboxActive: false,
        laserProjectile: null,
        laserProjectileVelocity: new THREE.Vector3(),
        laserProjectileRemainingLifetime: 0,
        laserProjectileActive: false,
        hasSpawnedLaserProjectileThisAttack: false,
        isRetreatingForSpacing: false,
        isCorneredForSpacing: false,

        // Animation (mock actions so fadeToAction doesn't throw)
        actions: {
            Idle: mockAction(),
            Run: mockAction(),
            Attack: mockAction(),
            Death: mockAction(),
            TakeHit: mockAction(),
        },
        currentAction: null,
        mixer: { update: vi.fn(), addEventListener: vi.fn(), clipAction: vi.fn(() => ({})) },
        mixers: [],

        // Mocked floating indicator
        floatingIndicatorManager: { spawnDamage: vi.fn() },

        // Mocked player reference (needed for tryBlock)
        player: { agility: 1, isDead: false, body: { position: { x: 0, y: 0, z: 0 } } },

        // Block state
        blockChance: 0,
        isBlocking: false,
        blockTimer: 0,
        BLOCK_DURATION: 0.5,
        blockShield: null,

        // Blob shadow
        blobShadow: { update: vi.fn(), cleanup: vi.fn(), visible: true },

        // Stuck detection
        stuckTimer: 0,
        stuckCheckCountdown: 0.5,
        stuckLastX: 0,
        stuckLastZ: 0,

        // Barrel references
        breakableBarrels: [],
    });

    Object.assign(enemy, overrides);
    return enemy;
}

// ─── takeDamage ────────────────────────────────────────────────────────────────

describe('Enemy.takeDamage', () => {
    let enemy: Enemy;

    beforeEach(() => { enemy = makeEnemy(); });

    it('reduces HP by the given amount', () => {
        enemy.takeDamage(20, false);
        expect(enemy.hp).toBe(40);
    });

    it('deals full damage (no reduction mechanic on enemy)', () => {
        enemy.takeDamage(60, false);
        expect(enemy.hp).toBe(0);
    });

    it('resets return-to-base state on hit', () => {
        (enemy as any).isReturningToBase = true;
        (enemy as any).returnToBaseTimer = 1.5;
        enemy.takeDamage(10, false);
        expect((enemy as any).isReturningToBase).toBe(false);
        expect((enemy as any).returnToBaseTimer).toBe(0);
    });

    it('does not take damage when already dead', () => {
        (enemy as any).isDead = true;
        enemy.takeDamage(30, false);
        expect(enemy.hp).toBe(60); // unchanged
    });

    it('does not take damage when dying', () => {
        (enemy as any).isDying = true;
        enemy.takeDamage(30, false);
        expect(enemy.hp).toBe(60); // unchanged
    });

    it('sets flashTimer and stunTimer on damage', () => {
        enemy.takeDamage(10, false);
        expect((enemy as any).flashTimer).toBe(0.1);
        expect((enemy as any).stunTimer).toBe(0.5);
    });

    it('calls die() when HP drops to 0', () => {
        enemy.takeDamage(60, false);
        expect((enemy as any).isDying).toBe(true);
    });

    it('calls die() when HP drops below 0', () => {
        enemy.takeDamage(9999, false);
        expect((enemy as any).isDying).toBe(true);
    });

    it('cancels ongoing attack on hit', () => {
        (enemy as any).isAttacking = true;
        enemy.takeDamage(10, false);
        expect((enemy as any).isAttacking).toBe(false);
    });

    it('spawns a floating damage indicator', () => {
        enemy.takeDamage(15, false);
        expect((enemy as any).floatingIndicatorManager.spawnDamage).toHaveBeenCalledOnce();
    });

    it('plays the enemy damage sound when hit', () => {
        enemy.takeDamage(15, false);
        expect(AudioManager.Instance.playDamage).toHaveBeenCalledWith('enemy');
    });

    it('spawns indicator in critical-hit colour when isCriticalHit is true', () => {
        enemy.takeDamage(15, true);
        const call = (enemy as any).floatingIndicatorManager.spawnDamage.mock.calls[0];
        // Critical-hit indicator uses a golden colour
        expect(call[2]).toBe('#bf860c');
    });

    it('enables aggro when hit while aggroEnabled is false', () => {
        enemy.aggroEnabled = false;
        enemy.takeDamage(10, false);
        expect(enemy.aggroEnabled).toBe(true);
    });
});

// ─── die ───────────────────────────────────────────────────────────────────────

describe('Enemy.die', () => {
    let enemy: Enemy;

    beforeEach(() => { enemy = makeEnemy(); });

    it('sets isDying to true', () => {
        enemy.die();
        expect((enemy as any).isDying).toBe(true);
    });

    it('resets deathTimer to 0', () => {
        (enemy as any).deathTimer = 5;
        enemy.die();
        expect((enemy as any).deathTimer).toBe(0);
    });

    it('excludes player collisions on death', () => {
        expect((enemy as any).body.collisionFilterMask & PLAYER_COLLISION_GROUP).toBe(PLAYER_COLLISION_GROUP);
        enemy.die();
        expect((enemy as any).body.collisionFilterMask & PLAYER_COLLISION_GROUP).toBe(0);
        expect((enemy as any).body.collisionFilterMask & WORLD_COLLISION_GROUP).toBe(WORLD_COLLISION_GROUP);
    });

    it('zeroes horizontal velocity on death to prevent knockback drift', () => {
        (enemy as any).body.velocity = { x: 10, y: 0, z: -8 };
        enemy.die();
        expect((enemy as any).body.velocity.x).toBe(0);
        expect((enemy as any).body.velocity.z).toBe(0);
    });

    it('cancels an in-progress attack on death', () => {
        (enemy as any).isAttacking = true;
        enemy.die();
        expect((enemy as any).isAttacking).toBe(false);
    });

    it('plays the enemy death sound', () => {
        enemy.die();
        expect(AudioManager.Instance.playDeath).toHaveBeenCalledWith('enemy');
    });

    it('invokes onDeathFadeStart callback when fade starts', () => {
        // Simulate the animation-finished event path that starts the death fade
        enemy.die();
        const cb = vi.fn();
        enemy.onDeathFadeStart = cb;

        // Manually trigger the isDeathFading path
        (enemy as any).isDying = false;
        (enemy as any).isDeathFading = true;
        (enemy as any).deathFadeTimer = 0;
        (enemy as any).onDeathFadeStart!(enemy);

        expect(cb).toHaveBeenCalledWith(enemy);
    });
});

// ─── update – shadow follows body position ────────────────────────────────────

describe('Enemy.update – shadow position', () => {
    // The mock world has bodies:[] so the downward raycast always misses.
    // The fallback shadow Y = body.position.y - bodyHalfExtentY = 1 - 0.875 = 0.125.

    it('follows body XZ position (with floor-hit fallback Y) when alive', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position.x = 7;
        enemy.body.position.z = -2;
        enemy.player = { isDead: true, body: { position: { x: 0, y: 0, z: 0 } } };
        enemy.update(0.016);
        expect(enemy.blobShadow.update).toHaveBeenCalledWith(7, 0.125, -2, undefined);
    });

    it('follows body XZ position while isDying', () => {
        const enemy = makeEnemy() as any;
        enemy.isDying = true;
        enemy.body.position.x = 3;
        enemy.body.position.z = -5;
        enemy.update(0.016);
        expect(enemy.blobShadow.update).toHaveBeenCalledWith(3, 0.125, -5, undefined);
    });

    it('follows body XZ position while isDeathFading', () => {
        const enemy = makeEnemy() as any;
        enemy.isDeathFading = true;
        enemy.deathFadeTimer = 0;
        enemy.deathFadeDuration = 0.5;
        enemy.body.position.x = -1;
        enemy.body.position.z = 4;
        enemy.update(0.1);
        expect(enemy.blobShadow.update).toHaveBeenCalledWith(-1, 0.125, 4, undefined);
    });

    it('does not update shadow when isDead', () => {
        const enemy = makeEnemy({ isDead: true } as any);
        enemy.update(0.016);
        expect(enemy.blobShadow.update).not.toHaveBeenCalled();
    });
});

// ─── update – state machine ────────────────────────────────────────────────────

describe('Enemy.update – state machine', () => {
    it('does nothing (beyond mixer update) when isDead', () => {
        const enemy = makeEnemy({ isDead: true } as any);
        const initialHp = enemy.hp;
        enemy.update(0.016);
        expect(enemy.hp).toBe(initialHp);
    });

    it('keeps body Y-velocity while dying', () => {
        const enemy = makeEnemy() as any;
        enemy.isDying = true;
        enemy.body.velocity.y = -10;
        enemy.update(0.016);
        expect(enemy.body.velocity.y).toBe(-10);
    });

    it('advances deathFadeTimer while isDeathFading', () => {
        const enemy = makeEnemy() as any;
        enemy.isDeathFading = true;
        enemy.deathFadeTimer = 0;
        enemy.update(0.1);
        expect(enemy.deathFadeTimer).toBeCloseTo(0.1, 5);
    });

    it('marks enemy as isDead when fade is complete', () => {
        const enemy = makeEnemy() as any;
        enemy.isDeathFading = true;
        enemy.deathFadeTimer = 0.49;
        enemy.deathFadeDuration = 0.5;
        enemy.update(0.02); // 0.49 + 0.02 = 0.51 ≥ 0.5 → isDead
        expect(enemy.isDead).toBe(true);
    });

    it('decrements stunTimer while stunned', () => {
        const enemy = makeEnemy() as any;
        // Provide a mock player so the AI path does not throw
        (enemy as any).player = { isDead: true, body: { position: { x: 0, y: 0, z: 0 } } };
        enemy.stunTimer = 0.3;
        enemy.update(0.1);
        expect(enemy.stunTimer).toBeCloseTo(0.2, 5);
    });
});

// ─── attack ────────────────────────────────────────────────────────────────────

describe('Enemy.attack', () => {
    it('sets isAttacking to true', () => {
        const enemy = makeEnemy();
        enemy.attack();
        expect((enemy as any).isAttacking).toBe(true);
    });

    it('resets the attack animation timer', () => {
        const enemy = makeEnemy() as any;
        enemy.attackAnimTimer = 0.5;
        enemy.attack();
        expect(enemy.attackAnimTimer).toBe(0);
    });

    it('starts the attack cooldown timer', () => {
        const enemy = makeEnemy();
        enemy.attack();
        expect((enemy as any).attackTimer).toBe((enemy as any).attackCooldown);
    });

    it('clears hasDealtDamageThisAttack', () => {
        const enemy = makeEnemy() as any;
        enemy.hasDealtDamageThisAttack = true;
        enemy.attack();
        expect(enemy.hasDealtDamageThisAttack).toBe(false);
    });

    it('plays the enemy attack sound', () => {
        const enemy = makeEnemy();
        enemy.attack();
        expect(AudioManager.Instance.playAttack).toHaveBeenCalledWith('enemy');
    });
});

describe('Enemy laser combat behavior', () => {
    it('holds position when already within the preferred laser distance band', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            attackRange: 7.75,
        }) as any;

        const movement = enemy.computeCombatMovement(
            new CANNON.Vec3(7, 0, 0),
            new CANNON.Vec3(0, 0, 0),
            7,
            0.016,
        );

        expect(movement).toBeNull();
    });

    it('moves closer instead of holding position when line of sight is blocked', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            attackRange: 7.75,
        }) as any;
        enemy.hasClearLineOfSightToPlayer = vi.fn().mockReturnValue(false);
        enemy.computeMovement = vi.fn().mockReturnValue({ dirX: 1, dirZ: 0 });

        const movement = enemy.computeCombatMovement(
            new CANNON.Vec3(7, 0, 0),
            new CANNON.Vec3(0, 0, 0),
            7,
            0.016,
        );

        expect(movement).toEqual({ dirX: 1, dirZ: 0 });
        expect(enemy.computeMovement).toHaveBeenCalledWith(expect.any(CANNON.Vec3), expect.any(CANNON.Vec3), 0.016);
    });

    it('retreats when the player gets too close to a laser enemy', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            attackRange: 7.75,
        }) as any;

        const movement = enemy.computeCombatMovement(
            new CANNON.Vec3(3, 0, 0),
            new CANNON.Vec3(0, 0, 0),
            3,
            0.016,
        );

        expect(movement).toEqual({ dirX: -1, dirZ: 0 });
    });

    it('tries another reachable stand-off position when direct retreat is blocked', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            navGrid: {
                findPath: vi.fn()
                    .mockReturnValueOnce([])
                    .mockReturnValueOnce([{ x: 0, z: 0 }, { x: -5, z: 5 }]),
            },
        }) as any;
        enemy.computeMovement = vi.fn().mockReturnValue({ dirX: -0.7, dirZ: 0.7 });

        const movement = enemy.computeCombatMovement(
            new CANNON.Vec3(3, 0, 0),
            new CANNON.Vec3(0, 0, 0),
            3,
            0.016,
        );

        expect(movement).toEqual({ dirX: -0.7, dirZ: 0.7 });
        expect(enemy.computeMovement).toHaveBeenCalledWith(expect.any(CANNON.Vec3), expect.any(CANNON.Vec3), 0.016);
    });

    it('marks pods as cornered when no retreat path is available', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            navGrid: {
                findPath: vi.fn().mockReturnValue([]),
            },
        }) as any;

        const movement = enemy.computeCombatMovement(
            new CANNON.Vec3(3, 0, 0),
            new CANNON.Vec3(0, 0, 0),
            3,
            0.016,
        );

        expect(movement).toBeNull();
        expect(enemy.isCorneredForSpacing).toBe(true);
    });

    it('only starts laser attacks once the player is at stand-off range', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            attackRange: 7.75,
        }) as any;

        expect(enemy.canAttackPlayer(5.5)).toBe(false);
        expect(enemy.canAttackPlayer(7.0)).toBe(true);
        expect(enemy.canAttackPlayer(7.75)).toBe(true);
    });

    it('fires a visible laser projectile during the ranged attack window without using the melee hitbox', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
        }) as any;
        enemy.body.position = new CANNON.Vec3(0, 1, 0);
        enemy.player = {
            agility: 1,
            isDead: false,
            body: { position: new CANNON.Vec3(7, 1, 0) },
            takeDamage: vi.fn(),
        };
        enemy.attackTimer = 1.0;
        enemy.isAttacking = true;
        enemy.attackAnimTimer = 0;
        enemy.attackHitboxDelay = 0.1;
        enemy.attackHitboxDuration = 0.1;
        enemy.getRawLaserAttackEndpoints = vi.fn().mockReturnValue({
            start: new THREE.Vector3(0, 1, 0),
            end: new THREE.Vector3(7, 1, 0),
        });
        enemy.fireLaserProjectile = vi.fn();
        enemy.activateAttackHitbox = vi.fn();

        enemy.update(0.11);

        expect(enemy.fireLaserProjectile).toHaveBeenCalledOnce();
        expect(enemy.player.takeDamage).not.toHaveBeenCalled();
        expect(enemy.activateAttackHitbox).not.toHaveBeenCalled();
    });

    it('keeps traveling until it hits a retreating player instead of stopping at the original range', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
        }) as any;
        enemy.body.position = new CANNON.Vec3(0, 1, 0);
        enemy.player = {
            agility: 1,
            isDead: false,
            body: { position: new CANNON.Vec3(7, 1, 0) },
            takeDamage: vi.fn(),
        };
        enemy.laserProjectile = {
            position: new THREE.Vector3(0, 1, 0),
            quaternion: { setFromUnitVectors: vi.fn() },
            visible: false,
            geometry: { dispose: vi.fn() },
            material: { dispose: vi.fn() },
        };
        enemy.attack();
        enemy.getRawLaserAttackEndpoints = vi.fn().mockReturnValue({
            start: new THREE.Vector3(0, 1, 0),
            end: new THREE.Vector3(7, 1, 0),
        });

        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

        enemy.fireLaserProjectile();
        enemy.player.body.position = new CANNON.Vec3(9, 1, 0);
        enemy.updateLaserProjectile(0.5);
        expect(enemy.player.takeDamage).not.toHaveBeenCalled();
        expect(enemy.laserProjectile.position.x).toBeCloseTo(7.5, 5);

        enemy.updateLaserProjectile(0.1);
        expect(enemy.player.takeDamage).toHaveBeenCalledWith(enemy.damage, enemy.body.position, false);
        expect(enemy.laserProjectile.position.x).toBeCloseTo(9, 5);
        randomSpy.mockRestore();
    });

    it('stops the projectile when it hits a solid obstacle before the player', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
        }) as any;
        enemy.body.position = new CANNON.Vec3(0, 1, 0);
        enemy.player = {
            agility: 1,
            isDead: false,
            body: { position: new CANNON.Vec3(7, 1, 0) },
            takeDamage: vi.fn(),
        };
        enemy.laserProjectile = {
            position: new THREE.Vector3(0, 1, 0),
            quaternion: { setFromUnitVectors: vi.fn() },
            visible: false,
            geometry: { dispose: vi.fn() },
            material: { dispose: vi.fn() },
        };
        enemy.world.raycastAll = vi.fn((_from: CANNON.Vec3, _to: CANNON.Vec3, _options: unknown, callback: (result: CANNON.RaycastResult) => void) => {
            callback({
                body: { mass: 0, collisionResponse: true },
                hitPointWorld: new CANNON.Vec3(4, 1, 0),
            } as CANNON.RaycastResult);
            return true;
        });
        enemy.attack();
        enemy.getRawLaserAttackEndpoints = vi.fn().mockReturnValue({
            start: new THREE.Vector3(0, 1, 0),
            end: new THREE.Vector3(7, 1, 0),
        });

        enemy.fireLaserProjectile();
        enemy.updateLaserProjectile(0.5);

        expect(enemy.player.takeDamage).not.toHaveBeenCalled();
        expect(enemy.laserProjectileActive).toBe(false);
        expect(enemy.laserProjectile.visible).toBe(false);
        expect(enemy.laserProjectile.position.x).toBeCloseTo(4, 5);
        expect(enemy.laserProjectile.position.y).toBeCloseTo(1, 5);
        expect(enemy.laserProjectile.position.z).toBeCloseTo(0, 5);
    });

    it('expires the projectile after its fixed lifetime when it hits nothing', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
        }) as any;
        enemy.body.position = new CANNON.Vec3(0, 1, 0);
        enemy.player = {
            agility: 1,
            isDead: false,
            body: { position: new CANNON.Vec3(100, 50, 100) },
            takeDamage: vi.fn(),
        };
        enemy.laserProjectile = {
            position: new THREE.Vector3(0, 1, 0),
            quaternion: { setFromUnitVectors: vi.fn() },
            visible: false,
            geometry: { dispose: vi.fn() },
            material: { dispose: vi.fn() },
        };
        enemy.attack();
        enemy.getRawLaserAttackEndpoints = vi.fn().mockReturnValue({
            start: new THREE.Vector3(0, 1, 0),
            end: new THREE.Vector3(7, 1, 0),
        });

        enemy.fireLaserProjectile();
        enemy.updateLaserProjectile(4.1);

        expect(enemy.player.takeDamage).not.toHaveBeenCalled();
        expect(enemy.laserProjectileActive).toBe(false);
        expect(enemy.laserProjectile.visible).toBe(false);
    });

    it('can still launch a laser attack while retreating', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            attackRange: 7.75,
        }) as any;
        enemy.player = {
            agility: 1,
            isDead: false,
            body: { position: new CANNON.Vec3(3, 0, 0) },
            takeDamage: vi.fn(),
        };
        enemy.body.position = new CANNON.Vec3(0, 0, 0);
        enemy.basePosition = new CANNON.Vec3(0, 0, 0);
        enemy.computeCombatMovement = vi.fn().mockImplementation(() => {
            enemy.isRetreatingForSpacing = true;
            return { dirX: -1, dirZ: 0 };
        });
        enemy.attack = vi.fn();
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

        enemy.update(0.2);

        expect(enemy.attack).toHaveBeenCalledOnce();
        randomSpy.mockRestore();
    });

    it('does not start a laser attack through an occluding obstacle while retreating', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            attackRange: 7.75,
        }) as any;
        enemy.player = {
            agility: 1,
            isDead: false,
            body: { position: new CANNON.Vec3(3, 0, 0) },
            takeDamage: vi.fn(),
        };
        enemy.body.position = new CANNON.Vec3(0, 0, 0);
        enemy.basePosition = new CANNON.Vec3(0, 0, 0);
        enemy.computeCombatMovement = vi.fn().mockImplementation(() => {
            enemy.isRetreatingForSpacing = true;
            return { dirX: -1, dirZ: 0 };
        });
        enemy.hasClearLineOfSightToPlayer = vi.fn().mockReturnValue(false);
        enemy.attack = vi.fn();
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

        enemy.update(0.2);

        expect(enemy.attack).not.toHaveBeenCalled();
        randomSpy.mockRestore();
    });

    it('requires a clear line of sight before a laser enemy can attack', () => {
        const enemy = makeEnemy({
            enemyType: EnemyType.Pod,
            enemyTypeDefinition: getEnemyTypeDefinition(EnemyType.Pod),
            enemyCombatBehavior: getEnemyTypeDefinition(EnemyType.Pod).combatBehavior,
            attackRange: 7.75,
        }) as any;
        enemy.hasClearLineOfSightToPlayer = vi.fn().mockReturnValue(false);

        expect(enemy.canAttackPlayer(7)).toBe(false);
    });
});

// ─── tryBlock / block chance ───────────────────────────────────────────────────

describe('Enemy.tryBlock – block chance formula', () => {
    afterEach(() => { vi.restoreAllMocks(); });

    it('never blocks when blockChance is 0', () => {
        const enemy = makeEnemy({ blockChance: 0 });
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect((enemy as any).tryBlock()).toBe(false);
    });

    it('uses full blockChance at agility=1 (no reduction)', () => {
        // agility=1 → reductionFactor=1.0 → effectiveBlockChance=blockChance
        const enemy = makeEnemy({ blockChance: 0.3 });
        vi.spyOn(Math, 'random').mockReturnValue(0.29);
        expect((enemy as any).tryBlock()).toBe(true);
        vi.spyOn(Math, 'random').mockReturnValue(0.31);
        expect((enemy as any).tryBlock()).toBe(false);
    });

    it('halves blockChance at agility=10000 (50% reduction)', () => {
        // agility=10000 → reductionFactor=0.5 → effectiveBlockChance=blockChance*0.5=0.15
        const enemy = makeEnemy({
            blockChance: 0.3,
            player: { agility: 10000, isDead: false, body: { position: { x: 0, y: 0, z: 0 } } },
        });
        vi.spyOn(Math, 'random').mockReturnValue(0.14);
        expect((enemy as any).tryBlock()).toBe(true);
        vi.spyOn(Math, 'random').mockReturnValue(0.16);
        expect((enemy as any).tryBlock()).toBe(false);
    });

    it('caps reduction at 50% for agility above 10000', () => {
        const enemy = makeEnemy({
            blockChance: 0.3,
            player: { agility: 99999, isDead: false, body: { position: { x: 0, y: 0, z: 0 } } },
        });
        // effectiveBlockChance should still be 0.15 (capped at 50% reduction)
        vi.spyOn(Math, 'random').mockReturnValue(0.14);
        expect((enemy as any).tryBlock()).toBe(true);
        vi.spyOn(Math, 'random').mockReturnValue(0.16);
        expect((enemy as any).tryBlock()).toBe(false);
    });
});

// ─── blocking mechanic ─────────────────────────────────────────────────────────

describe('Enemy blocking mechanic', () => {
    it('activates block and absorbs damage when tryBlock succeeds', () => {
        const shield = { attachTo: vi.fn(), detach: vi.fn(), dispose: vi.fn() };
        // blockChance=1 at agility=1 → effectiveBlockChance=1 → always blocks
        const enemy = makeEnemy({ blockChance: 1.0, blockShield: shield });
        enemy.takeDamage(20, false);
        expect((enemy as any).isBlocking).toBe(true);
        expect(enemy.hp).toBe(60); // no damage taken
    });

    it('absorbs damage completely when already blocking', () => {
        const enemy = makeEnemy({ isBlocking: true });
        enemy.takeDamage(20, false);
        expect(enemy.hp).toBe(60); // unchanged
    });

    it('sets stunTimer to BLOCK_DURATION when block activates', () => {
        const shield = { attachTo: vi.fn(), detach: vi.fn(), dispose: vi.fn() };
        const enemy = makeEnemy({ blockChance: 1.0, blockShield: shield });
        enemy.takeDamage(10, false);
        expect((enemy as any).stunTimer).toBe((enemy as any).BLOCK_DURATION);
    });
});

// ─── getDeathPosition ──────────────────────────────────────────────────────────

describe('Enemy.getDeathPosition', () => {
    it('returns a position offset by -bodyHalfExtentY on the Y axis', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position = { x: 3, y: 2, z: 5, copy: vi.fn(), vsub: vi.fn() };
        enemy.bodyHalfExtentY = 0.875;
        const pos = enemy.getDeathPosition();
        expect(pos.x).toBe(3);
        expect(pos.y).toBeCloseTo(2 - 0.875, 5);
        expect(pos.z).toBe(5);
    });
});

// ─── takeDamage – knockback ────────────────────────────────────────────────────

describe('Enemy.takeDamage – knockback', () => {
    it('applies velocity knockback away from sourcePos', () => {
        const enemy = makeEnemy() as any;
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        // Enemy at (5,0,0), source at (0,0,0) → knockback in +x direction
        enemy.body.position = {
            x: 5, y: 0, z: 0,
            copy: vi.fn(),
            vsub: (v: any) => {
                const dir = { x: 5 - v.x, y: 0 - v.y, z: 0 - v.z };
                return Object.assign(dir, {
                    length: () => Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2),
                    normalize: function (this: any) {
                        const l = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2) || 1;
                        this.x /= l; this.y /= l; this.z /= l;
                        return this;
                    },
                });
            },
        };
        const sourcePos = { x: 0, y: 0, z: 0 } as any;
        enemy.takeDamage(10, false, sourcePos);
        expect(enemy.body.velocity.x).toBeGreaterThan(0);
    });

    it('does not apply knockback when sourcePos is omitted', () => {
        const enemy = makeEnemy() as any;
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.takeDamage(10, false);
        expect(enemy.body.velocity.x).toBe(0);
        expect(enemy.body.velocity.z).toBe(0);
    });

    it('scales knockback by knockbackFactor', () => {
        const enemy = makeEnemy() as any;
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.body.position = {
            x: 5, y: 0, z: 0,
            copy: vi.fn(),
            vsub: (v: any) => {
                const dir = { x: 5 - v.x, y: 0, z: 0 - v.z };
                return Object.assign(dir, {
                    length: () => Math.sqrt(dir.x ** 2 + dir.z ** 2),
                    normalize: function (this: any) {
                        const l = Math.sqrt(this.x ** 2 + this.z ** 2) || 1;
                        this.x /= l; this.z /= l;
                        return this;
                    },
                });
            },
        };
        const sourcePos = { x: 0, y: 0, z: 0 } as any;
        const enemyHigh = makeEnemy() as any;
        enemyHigh.body.velocity = { x: 0, y: 0, z: 0 };
        enemyHigh.body.position = {
            x: 5, y: 0, z: 0,
            copy: vi.fn(),
            vsub: (v: any) => {
                const dir = { x: 5 - v.x, y: 0, z: 0 - v.z };
                return Object.assign(dir, {
                    length: () => Math.sqrt(dir.x ** 2 + dir.z ** 2),
                    normalize: function (this: any) {
                        const l = Math.sqrt(this.x ** 2 + this.z ** 2) || 1;
                        this.x /= l; this.z /= l;
                        return this;
                    },
                });
            },
        };
        enemy.takeDamage(1, false, sourcePos, 1.0);
        enemyHigh.takeDamage(1, false, sourcePos, 2.0);
        expect(enemyHigh.body.velocity.x).toBeCloseTo(enemy.body.velocity.x * 2, 5);
    });
});

// ─── cleanup ───────────────────────────────────────────────────────────────────

describe('Enemy.cleanup', () => {
    it('removes the mesh from the scene', () => {
        const enemy = makeEnemy() as any;
        enemy.disposeMesh = vi.fn();
        enemy.cleanup();
        expect(enemy.scene.remove).toHaveBeenCalledWith(enemy.mesh);
    });

    it('removes the physics body from the world', () => {
        const enemy = makeEnemy() as any;
        enemy.disposeMesh = vi.fn();
        enemy.cleanup();
        expect(enemy.world.removeBody).toHaveBeenCalledWith(enemy.body);
    });

    it('calls disposeMesh to free geometry/material resources', () => {
        const enemy = makeEnemy() as any;
        const dispose = vi.fn();
        enemy.disposeMesh = dispose;
        enemy.cleanup();
        expect(dispose).toHaveBeenCalledOnce();
    });
});

// ─── update – AI chase ────────────────────────────────────────────────────────

describe('Enemy.update – AI chase behavior', () => {
    /** Build a body.position mock that supports distanceTo and vsub from (px, py, pz) */
    function makeBodyPos(px: number, py: number, pz: number) {
        return {
            x: px, y: py, z: pz,
            copy: vi.fn(),
            distanceTo: (v: any) => Math.sqrt((v.x - px) ** 2 + (v.y - py) ** 2 + (v.z - pz) ** 2),
            vsub: (v: any) => {
                const dir = { x: px - v.x, y: py - v.y, z: pz - v.z };
                return Object.assign(dir, {
                    length: () => Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2),
                    normalize: function (this: any) {
                        const l = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2) || 1;
                        this.x /= l; this.y /= l; this.z /= l;
                        return this;
                    },
                });
            },
        };
    }

    it('sets velocity towards the player when player is alive and within aggro range', () => {
        const enemy = makeEnemy() as any;
        // Player at (8,0,0); enemy at (0,0,0) → distToPlayer = 8 < aggroRange(15)
        enemy.body.position = makeBodyPos(0, 0, 0);
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 999; // prevent attack trigger
        enemy.player = {
            isDead: false,
            body: {
                position: {
                    x: 8, y: 0, z: 0,
                    vsub: (v: any) => {
                        const dir = { x: 8 - v.x, y: 0 - v.y, z: 0 - v.z };
                        return Object.assign(dir, {
                            length: () => Math.sqrt(dir.x ** 2 + dir.z ** 2),
                            normalize: function (this: any) {
                                const l = Math.sqrt(this.x ** 2 + this.z ** 2) || 1;
                                this.x /= l; this.z /= l;
                                return this;
                            },
                        });
                    },
                },
            },
        };

        enemy.update(0.016);

        // Enemy should move in the +x direction towards the player
        expect(enemy.body.velocity.x).toBeGreaterThan(0);
    });

    it('does not move when player is outside aggro range', () => {
        const enemy = makeEnemy() as any;
        // Player at (100,0,0); enemy at (0,0,0) → distToPlayer = 100 > aggroRange(15)
        enemy.body.position = makeBodyPos(0, 0, 0);
        enemy.body.velocity = { x: 5, y: 0, z: 0 }; // pre-set to confirm friction
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 999;
        enemy.isReturningToBase = false;
        enemy.returnToBaseTimer = 0;
        enemy.player = {
            isDead: false,
            body: { position: { x: 100, y: 0, z: 0, vsub: vi.fn() } },
        };

        enemy.update(0.016);

        // Friction is applied (velocity.x *= 0.9 repeatedly) → should be less than initial 5
        expect(enemy.body.velocity.x).toBeLessThan(5);
    });

    it('returns to base after returnWaitTime elapses when player is out of range', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position = makeBodyPos(0, 0, 0);
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        // Base is at (20,0,0); enemy at origin → distToBase > baseArrivalThreshold
        enemy.basePosition = makeBodyPos(20, 0, 0);
        enemy.attackTimer = 999;
        enemy.isReturningToBase = false;
        enemy.returnToBaseTimer = 1.9; // just below wait time of 2.0
        enemy.player = {
            isDead: false,
            body: { position: { x: 100, y: 0, z: 0, vsub: vi.fn() } },
        };

        // First update: timer reaches 2.0 → isReturningToBase becomes true
        enemy.update(0.2);
        expect(enemy.isReturningToBase).toBe(true);

        // Second update: velocity should now point toward base (+x direction)
        enemy.update(0.016);
        expect(enemy.body.velocity.x).toBeGreaterThan(0);
    });

    it('stops and resets isReturningToBase when enemy reaches base', () => {
        const enemy = makeEnemy() as any;
        // Enemy at (0.1, 0, 0), base at (0,0,0) → distToBase < baseArrivalThreshold(0.5)
        enemy.body.position = makeBodyPos(0.1, 0, 0);
        enemy.body.velocity = { x: 3, y: 0, z: 0 };
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 999;
        enemy.isReturningToBase = true;
        enemy.returnToBaseTimer = 2;
        enemy.player = {
            isDead: false,
            body: { position: { x: 100, y: 0, z: 0, vsub: vi.fn() } },
        };

        enemy.update(0.016);

        expect(enemy.isReturningToBase).toBe(false);
        expect(enemy.returnToBaseTimer).toBe(0);
    });

    it('triggers attack when player is within attackRange and cooldown is ready', () => {
        const enemy = makeEnemy() as any;
        // Player at (1.0, 0, 0); attackRange=1.5 → within range
        enemy.body.position = makeBodyPos(0, 0, 0);
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 0; // cooldown ready
        enemy.isAttacking = false;
        enemy.player = {
            isDead: false,
            body: {
                position: {
                    x: 1.0, y: 0, z: 0,
                    vsub: (v: any) => {
                        const dir = { x: 1.0 - v.x, y: 0 - v.y, z: 0 - v.z };
                        return Object.assign(dir, {
                            length: () => Math.sqrt(dir.x ** 2 + dir.z ** 2),
                            normalize: function (this: any) {
                                const l = Math.sqrt(this.x ** 2 + this.z ** 2) || 1;
                                this.x /= l; this.z /= l;
                                return this;
                            },
                        });
                    },
                },
            },
        };
        // Force canAttackPlayer to return true by overriding Math.random
        const origRandom = Math.random;
        Math.random = () => 0; // variance = 0 → attackRange check is pure distance
        enemy.update(0.016);
        Math.random = origRandom;

        expect(enemy.isAttacking).toBe(true);
        expect(enemy.attackTimer).toBe(enemy.attackCooldown);
    });

    it('rotates towards the player at a reduced pace while attacking but does not move', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position = makeBodyPos(0, 0, 0);
        enemy.body.velocity = { x: 2, y: 0, z: 3 };
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 999; // prevent new attack trigger
        enemy.isAttacking = true;
        enemy.attackAnimTimer = 0;
        enemy.player = {
            isDead: false,
            body: {
                position: {
                    x: 5, y: 0, z: 0,
                    vsub: (v: any) => {
                        const dir = { x: 5 - v.x, y: 0 - v.y, z: 0 - v.z };
                        return Object.assign(dir, {
                            length: () => Math.sqrt(dir.x ** 2 + dir.z ** 2),
                            normalize: function (this: any) {
                                const l = Math.sqrt(this.x ** 2 + this.z ** 2) || 1;
                                this.x /= l; this.z /= l;
                                return this;
                            },
                        });
                    },
                },
            },
        };

        enemy.update(0.016);

        // Velocity should be reduced by friction, not set to chase speed
        expect(enemy.body.velocity.x).toBeLessThan(2);
        expect(enemy.body.velocity.z).toBeLessThan(3);
        // Mesh quaternion slerp should have been called to rotate towards player
        expect(enemy.mesh.quaternion.slerp).toHaveBeenCalled();
        const [, slerpFactor] = enemy.mesh.quaternion.slerp.mock.calls.at(-1);
        expect(slerpFactor).toBeCloseTo(3 * 0.016, 5);
    });
});

// ─── getDistanceToPlayer ──────────────────────────────────────────────────────

describe('Enemy.getDistanceToPlayer', () => {
    it('returns the Euclidean distance from enemy to player', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position = {
            x: 0, y: 0, z: 0,
            distanceTo: (v: any) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2),
            copy: vi.fn(), vsub: vi.fn(),
        };
        enemy.player = {
            body: { position: { x: 3, y: 0, z: 4 } },
        };
        // distance from (0,0,0) to (3,0,4) = 5
        expect(enemy.getDistanceToPlayer()).toBeCloseTo(5, 5);
    });

    it('returns 0 when player is at the same position as enemy', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position = {
            x: 2, y: 0, z: 2,
            distanceTo: (_v: any) => 0,
            copy: vi.fn(), vsub: vi.fn(),
        };
        enemy.player = {
            body: { position: { x: 2, y: 0, z: 2 } },
        };
        expect(enemy.getDistanceToPlayer()).toBe(0);
    });
});

// ─── update – attack timer ────────────────────────────────────────────────────

describe('Enemy.update – attack timer', () => {
    it('decrements attackTimer each frame', () => {
        const enemy = makeEnemy() as any;
        enemy.isDead = false; enemy.isDying = false; enemy.isDeathFading = false;
        enemy.stunTimer = 0;
        enemy.attackTimer = 1.0;
        enemy.isAttacking = false;
        // Player alive but far away to avoid triggering attack
        const farPlayerPos = {
            x: 100, y: 0, z: 0,
            vsub: vi.fn().mockReturnValue({ x: 100, y: 0, z: 0, length: () => 100, normalize: vi.fn() }),
        };
        enemy.player = { isDead: false, body: { position: farPlayerPos } };
        enemy.body.position = {
            x: 0, y: 0, z: 0, copy: vi.fn(),
            distanceTo: () => 100,
            vsub: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
        };
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = {
            x: 0, y: 0, z: 0,
            distanceTo: () => 0,
            vsub: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
        };

        enemy.update(0.1);

        expect(enemy.attackTimer).toBeCloseTo(0.9, 2);
    });

    it('advances attackAnimTimer while isAttacking', () => {
        const enemy = makeEnemy() as any;
        enemy.isDead = false; enemy.isDying = false; enemy.isDeathFading = false;
        enemy.stunTimer = 0;
        enemy.attackTimer = 999;
        enemy.isAttacking = true;
        enemy.attackAnimTimer = 0.1;
        enemy.attackHitboxActive = false;
        enemy.attackHitboxBody = null;
        const farPlayerPos = {
            x: 100, y: 0, z: 0,
            vsub: vi.fn().mockReturnValue({ x: 100, y: 0, z: 0, length: () => 100, normalize: vi.fn() }),
        };
        enemy.player = { isDead: false, body: { position: farPlayerPos } };
        enemy.body.position = {
            x: 0, y: 0, z: 0, copy: vi.fn(),
            distanceTo: () => 100,
            vsub: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
        };
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = {
            x: 0, y: 0, z: 0,
            distanceTo: () => 0,
            vsub: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
        };

        enemy.update(0.1);

        expect(enemy.attackAnimTimer).toBeCloseTo(0.2, 2);
    });

    it('ends attack after attackMaxDuration elapses', () => {
        const enemy = makeEnemy() as any;
        enemy.isDead = false; enemy.isDying = false; enemy.isDeathFading = false;
        enemy.stunTimer = 0;
        enemy.attackTimer = 999;
        enemy.isAttacking = true;
        enemy.attackAnimTimer = 0.95;
        enemy.attackMaxDuration = 1.0;
        enemy.attackHitboxActive = false;
        enemy.attackHitboxBody = null;
        const farPlayerPos = {
            x: 100, y: 0, z: 0,
            vsub: vi.fn().mockReturnValue({ x: 100, y: 0, z: 0, length: () => 100, normalize: vi.fn() }),
        };
        enemy.player = { isDead: false, body: { position: farPlayerPos } };
        enemy.body.position = {
            x: 0, y: 0, z: 0, copy: vi.fn(),
            distanceTo: () => 100,
            vsub: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
        };
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = {
            x: 0, y: 0, z: 0,
            distanceTo: () => 0,
            vsub: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
        };

        enemy.update(0.1); // animTimer becomes 1.05 ≥ attackMaxDuration

        expect(enemy.isAttacking).toBe(false);
    });
});

// ─── Enemy radius corridor cap ────────────────────────────────────────────────

describe('Enemy radius corridor cap', () => {
    it('MAX_ENEMY_RADIUS is inner corridor half-width minus buffer (0.9 m)', () => {
        expect(MAX_ENEMY_RADIUS).toBe(0.9);
    });

    it('radius is clamped to MAX_ENEMY_RADIUS when enemy size would exceed it', () => {
        // Large size → uncapped radius would be 3.5 * 0.326 ≈ 1.141, still over 0.9
        // Use an extreme size to confirm capping: 5.0 * 0.326 = 1.63 > 0.9
        const largeSize = 5.0;
        const uncappedRadius = largeSize * ENEMY_RADIUS_FACTOR;
        const cappedRadius = Math.min(uncappedRadius, MAX_ENEMY_RADIUS);
        expect(uncappedRadius).toBeGreaterThan(MAX_ENEMY_RADIUS);
        expect(cappedRadius).toBe(MAX_ENEMY_RADIUS);
    });

    it('radius is NOT clamped when enemy size is within the limit', () => {
        const smallSize = 1.75;
        const uncappedRadius = smallSize * ENEMY_RADIUS_FACTOR;
        const cappedRadius = Math.min(uncappedRadius, MAX_ENEMY_RADIUS);
        expect(uncappedRadius).toBeLessThan(MAX_ENEMY_RADIUS);
        expect(cappedRadius).toBeCloseTo(uncappedRadius, 5);
    });
});

// ─── Stuck detection ──────────────────────────────────────────────────────────

describe('Enemy.update – stuck detection', () => {
    /** Build a position mock that supports distanceTo and vsub from (px, py, pz) */
    function makeBodyPos(px: number, py: number, pz: number) {
        return {
            x: px, y: py, z: pz,
            copy: vi.fn(),
            distanceTo: (v: any) => Math.sqrt((v.x - px) ** 2 + (v.y - py) ** 2 + (v.z - pz) ** 2),
            vsub: (v: any) => {
                const dir = { x: px - v.x, y: py - v.y, z: pz - v.z };
                return Object.assign(dir, {
                    length: () => Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2),
                    normalize: function (this: any) {
                        const l = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2) || 1;
                        this.x /= l; this.y /= l; this.z /= l;
                        return this;
                    },
                });
            },
        };
    }

    it('accumulates stuckTimer when enemy is not making progress while chasing', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position = makeBodyPos(0, 0, 0);
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 999;
        enemy.aggroRange = 15;
        // Player within aggro range but not attack range
        enemy.player = {
            isDead: false,
            body: {
                position: {
                    x: 8, y: 0, z: 0,
                    vsub: (v: any) => {
                        const dir = { x: 8 - v.x, y: 0 - v.y, z: 0 - v.z };
                        return Object.assign(dir, {
                            length: () => Math.sqrt(dir.x ** 2 + dir.z ** 2),
                            normalize: function (this: any) {
                                const l = Math.sqrt(this.x ** 2 + this.z ** 2) || 1;
                                this.x /= l; this.z /= l;
                                return this;
                            },
                        });
                    },
                },
            },
        };

        // Freeze the enemy at the same position to simulate being stuck
        enemy.stuckLastX = 0;
        enemy.stuckLastZ = 0;
        // Advance the stuck check countdown past the interval
        enemy.stuckCheckCountdown = 0.001;

        enemy.update(0.016); // countdown expires → progress check: moved < STUCK_MIN_PROGRESS

        expect(enemy.stuckTimer).toBeGreaterThan(0);
    });

    it('resets stuckTimer when enemy makes sufficient progress', () => {
        const enemy = makeEnemy() as any;
        // Start at (5, 0, 0) — moved 5 m from last stuck-check position (0,0,0)
        enemy.body.position = makeBodyPos(5, 0, 0);
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 999;
        enemy.aggroRange = 15;
        enemy.stuckTimer = 3; // pre-set
        enemy.stuckLastX = 0;
        enemy.stuckLastZ = 0;
        enemy.stuckCheckCountdown = 0.001;
        enemy.player = {
            isDead: false,
            body: {
                position: {
                    x: 8, y: 0, z: 0,
                    vsub: (v: any) => {
                        const dir = { x: 8 - v.x, y: 0 - v.y, z: 0 - v.z };
                        return Object.assign(dir, {
                            length: () => Math.sqrt(dir.x ** 2 + dir.z ** 2),
                            normalize: function (this: any) {
                                const l = Math.sqrt(this.x ** 2 + this.z ** 2) || 1;
                                this.x /= l; this.z /= l;
                                return this;
                            },
                        });
                    },
                },
            },
        };

        enemy.update(0.016);

        expect(enemy.stuckTimer).toBe(0);
    });

    it('resets stuckTimer when player moves out of aggro range', () => {
        const enemy = makeEnemy() as any;
        enemy.body.position = makeBodyPos(0, 0, 0);
        enemy.body.velocity = { x: 0, y: 0, z: 0 };
        enemy.basePosition = makeBodyPos(0, 0, 0);
        enemy.attackTimer = 999;
        enemy.aggroRange = 15;
        enemy.stuckTimer = 5; // pre-set high
        enemy.stuckCheckCountdown = 9999; // not due yet
        // Player outside aggro range
        enemy.player = {
            isDead: false,
            body: { position: { x: 100, y: 0, z: 0, vsub: vi.fn() } },
        };
        enemy.body.position.distanceTo = () => 100;

        enemy.update(0.016);

        expect(enemy.stuckTimer).toBe(0);
    });
});

// ─── checkAttackHitboxCollision – barrel breaking ────────────────────────────

describe('Enemy.checkAttackHitboxCollision – barrel breaking', () => {
    it('calls barrel.onHit() when attack hitbox overlaps a barrel', () => {
        const enemy = makeEnemy() as any;
        enemy.attackHitboxActive = true;
        enemy.hasDealtDamageThisAttack = false;
        enemy.attackHitboxSize = { x: 0.5, y: 0.5, z: 0.8 };
        // Hitbox positioned at origin
        enemy.attackHitboxBody = { position: { x: 0, y: 0, z: 0 } };
        enemy.player = {
            body: { position: { x: 100, y: 0, z: 100 } }, // far away
            takeDamage: vi.fn(),
        };

        const nearBarrel = {
            isDestroyed: false,
            body: { position: { x: 0.5, y: 0, z: 0 } }, // within range
            onHit: vi.fn(),
        };
        const farBarrel = {
            isDestroyed: false,
            body: { position: { x: 50, y: 0, z: 50 } }, // far away
            onHit: vi.fn(),
        };
        enemy.breakableBarrels = [nearBarrel, farBarrel];

        enemy.checkAttackHitboxCollision();

        expect(nearBarrel.onHit).toHaveBeenCalledOnce();
        expect(farBarrel.onHit).not.toHaveBeenCalled();
    });

    it('does not call onHit on already-destroyed barrels', () => {
        const enemy = makeEnemy() as any;
        enemy.attackHitboxActive = true;
        enemy.hasDealtDamageThisAttack = false;
        enemy.attackHitboxSize = { x: 0.5, y: 0.5, z: 0.8 };
        enemy.attackHitboxBody = { position: { x: 0, y: 0, z: 0 } };
        enemy.player = {
            body: { position: { x: 100, y: 0, z: 100 } },
            takeDamage: vi.fn(),
        };

        const destroyedBarrel = {
            isDestroyed: true,
            body: { position: { x: 0.3, y: 0, z: 0 } },
            onHit: vi.fn(),
        };
        enemy.breakableBarrels = [destroyedBarrel];

        enemy.checkAttackHitboxCollision();

        expect(destroyedBarrel.onHit).not.toHaveBeenCalled();
    });
});
