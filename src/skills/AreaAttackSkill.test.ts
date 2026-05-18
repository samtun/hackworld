import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        copy() { return this; }
    }
    return {
        Scene: class {},
        Vector3: V3,
        Mesh: class { geometry = { dispose: vi.fn() }; material = { dispose: vi.fn() }; parent = null; traverse(_cb: any) {} scale = { copy: vi.fn() }; position = { set: vi.fn() }; },
        MeshStandardMaterial: class { dispose = vi.fn(); opacity = 1; },
        Material: class {},
    };
});

vi.mock('cannon-es', () => ({
    Vec3: class { x = 0; y = 0; z = 0; constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } },
    World: class { bodies = []; },
    Body: class {},
}));

vi.mock('../ui/UIManager', () => ({
    UIManager: { Instance: { displayInsufficientTPWarning: vi.fn() } }
}));

vi.mock('../AudioManager', () => ({
    AudioManager: { Instance: { playAreaAttackSkill: vi.fn(), playInsufficient: vi.fn() } }
}));

vi.mock('../BaseMesh', () => ({
    BaseMesh: class {
        mesh = { traverse: vi.fn(), scale: { copy: vi.fn() }, position: { set: vi.fn() }, parent: null, rotation: {}, quaternion: {} };
        update(_dt: number) {}
        disposeMesh = vi.fn();
    }
}));

vi.mock('../Player', () => ({ Player: class {} }));
vi.mock('../enemies/Enemy', () => ({ Enemy: class {} }));

import { AreaAttackSkill } from './AreaAttackSkill';
import { AudioManager } from '../AudioManager';
import { Enemy } from '../enemies/Enemy';
import { Tier } from '../items/TierManager';
import { SkillTechType } from './SkillTechType';
import type { Player } from '../Player';

function makeEnemy(x: number, z: number) {
    const enemy = Object.create(Enemy.prototype);
    enemy.isDead = false;
    enemy.isDying = false;
    enemy.takeDamage = vi.fn();
    const body = { position: { x, y: 0, z }, entity: enemy };
    return { enemy, body };
}

function makePlayer(tier = Tier.STABLE) {
    return {
        getSkillTier: vi.fn().mockReturnValue(tier),
        tp: 300, maxTp: 300,
        position: { x: 0, y: 0, z: 0 },
        body: { position: { x: 0, y: 0, z: 0 } },
        getCriticalChance: vi.fn().mockReturnValue(0),
        CRITICAL_HIT_MULTIPLIER: 2,
        getCriticalHitMultiplier: vi.fn().mockReturnValue(2),
        tryIncrementSkillTech: vi.fn(),
    } as any;
}

describe('AreaAttackSkill', () => {
    let skill: AreaAttackSkill;

    beforeEach(() => {
        vi.clearAllMocks();
        skill = new AreaAttackSkill(vi.fn());
    });

    describe('constructor', () => {
        it('sets name, cooldown, and tpCost', () => {
            expect(skill.name).toBe('Area Attack');
            expect(skill.cooldown).toBe(10);
            expect(skill.tpCost).toBe(30);
        });
    });

    it('plays the area attack skill sound when executed', () => {
        const player = makePlayer(Tier.STABLE);
        const scene = { add: vi.fn(), remove: vi.fn() } as any;
        const world = { bodies: [] } as any;
        (skill as any).execute(player, scene, world);
        expect(AudioManager.Instance.playAreaAttackSkill).toHaveBeenCalledOnce();
    });

    describe('getEffectiveTpCost()', () => {
        it.each([
            [Tier.STABLE,      30],
            [Tier.BROKEN,      30],
            [Tier.MAINTAINED,  60],
            [Tier.OVERCLOCKED, 90],
            [Tier.ZERODAY,     150],
            [Tier.LEET,        240],
        ])('returns %s for tier %s', (tier, expected) => {
            const player = makePlayer(tier) as Player;
            expect(skill.getEffectiveTpCost(player)).toBe(expected);
            expect(player.getSkillTier).toHaveBeenCalledWith(SkillTechType.BLAST);
        });
    });

    describe('execute()', () => {
        it.each([
            [Tier.STABLE,      18,   1],
            [Tier.MAINTAINED,  36,   2],
            [Tier.OVERCLOCKED, 72,   3],
            [Tier.ZERODAY,     144,  3],
            [Tier.LEET,        288,  4],
        ])('sets effectiveDamage=%i and effectiveWaves=%i at tier %s', (tier, damage, waves) => {
            const player = makePlayer(tier);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(damage);
            expect((skill as any).effectiveWaves).toBe(waves);
        });

        it('sets isBeingExecuted to true after execute', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).isBeingExecuted).toBe(true);
        });

        it('resets effectTimer to 0 even when it had a residual value', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            (skill as any).effectTimer = 0.5;
            (skill as any).execute(player, scene, world);
            expect((skill as any).effectTimer).toBe(0);
        });
    });

    describe('update()', () => {
        it('advances effectTimer while executing', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            (skill as any).execute(player, scene, world);
            skill.update(0.2);
            expect((skill as any).effectTimer).toBeCloseTo(0.2);
        });

        it('calls cleanup when effectTimer exceeds DURATION', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [] } as any;
            (skill as any).execute(player, scene, world);
            skill.update(100); // Far exceeds DURATION of 0.8s
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('decrements cooldownTimer even when not executing', () => {
            (skill as any).cooldownTimer = 5.0;
            skill.update(1.0);
            expect((skill as any).cooldownTimer).toBeCloseTo(4.0);
        });

        it('does not damage enemies beyond RANGE', () => {
            const player = makePlayer(Tier.STABLE);
            const nearEnemy = makeEnemy(2, 0);
            const farEnemy = makeEnemy(20, 0);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [nearEnemy.body, farEnemy.body] } as any;
            (skill as any).execute(player, scene, world);

            // Update to about half the duration so wave is expanded
            skill.update(0.4);
            expect(nearEnemy.enemy.takeDamage).toHaveBeenCalled();
            expect(farEnemy.enemy.takeDamage).not.toHaveBeenCalled();
        });

        it('does not hit enemies when execute resets residual effectTimer', () => {
            const player = makePlayer(Tier.STABLE);
            const farEnemy = makeEnemy(4, 0);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [farEnemy.body] } as any;

            // Simulate residual effectTimer from a previous interrupted execution
            (skill as any).effectTimer = 0.7;
            (skill as any).execute(player, scene, world);

            // First update with a small dt should produce a small scale, not hit far enemies
            skill.update(0.016);
            expect(farEnemy.enemy.takeDamage).not.toHaveBeenCalled();
        });
    });

    describe('cleanup()', () => {
        it('sets isBeingExecuted to false', () => {
            (skill as any).isBeingExecuted = true;
            (skill as any).cleanup();
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('calls onCompletedCallback', () => {
            const callback = vi.fn();
            const s = new AreaAttackSkill(callback);
            (s as any).cleanup();
            expect(callback).toHaveBeenCalled();
        });

        it('resets effectTimer to 0', () => {
            (skill as any).effectTimer = 0.5;
            (skill as any).cleanup();
            expect((skill as any).effectTimer).toBe(0);
        });
    });
});
