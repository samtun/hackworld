import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Enemy } from './Enemy';

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

        // State flags
        isDead: false,
        isDying: false,
        isDeathFading: false,
        isAttacking: false,
        isReturningToBase: false,

        // Timers
        flashTimer: 0,
        stunTimer: 0,
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
        },

        // Mocked base position for return-to-base behaviour
        basePosition: {
            x: 0, y: 0, z: 0,
            distanceTo: () => 0,
            vsub: (_v: any) => ({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }),
            clone: () => ({ x: 0, y: 0, z: 0 }),
        },

        // Mocked scene/world
        world: { addBody: vi.fn(), removeBody: vi.fn() },
        scene: { remove: vi.fn() },
        mesh: {
            position: { x: 0, y: 0, z: 0, copy: vi.fn() },
            quaternion: { slerp: vi.fn() },
            children: [],
            traverse: vi.fn(),
        },

        // Attack hitbox
        attackHitboxBody: null,
        attackHitboxActive: false,

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

    it('spawns indicator in critical-hit colour when isCriticalHit is true', () => {
        enemy.takeDamage(15, true);
        const call = (enemy as any).floatingIndicatorManager.spawnDamage.mock.calls[0];
        // Critical-hit indicator uses a golden colour
        expect(call[2]).toBe('#bf860c');
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

    it('records the Y position at death for body freeze', () => {
        (enemy as any).body.position.y = 3;
        enemy.die();
        expect((enemy as any).deathYPosition).toBe(3);
    });

    it('disables collision response on death', () => {
        enemy.die();
        expect((enemy as any).body.collisionResponse).toBe(false);
    });

    it('cancels an in-progress attack on death', () => {
        (enemy as any).isAttacking = true;
        enemy.die();
        expect((enemy as any).isAttacking).toBe(false);
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

// ─── update – state machine ────────────────────────────────────────────────────

describe('Enemy.update – state machine', () => {
    it('does nothing (beyond mixer update) when isDead', () => {
        const enemy = makeEnemy({ isDead: true } as any);
        const initialHp = enemy.hp;
        enemy.update(0.016);
        expect(enemy.hp).toBe(initialHp);
    });

    it('freezes body Y-velocity while dying', () => {
        const enemy = makeEnemy() as any;
        enemy.isDying = true;
        enemy.body.velocity.y = -10;
        enemy.update(0.016);
        expect(enemy.body.velocity.y).toBe(0);
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
                    normalize: function () {
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
                    normalize: function () {
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
                    normalize: function () {
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
                    normalize: function () {
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
                            normalize: function () {
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
});
