import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
        copy(v: any) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
        clone() { return new V3(this.x, this.y, this.z); }
        normalize() { return this; }
        multiplyScalar() { return this; }
    }
    class FakeMesh {
        position = new V3();
        quaternion = { copy: vi.fn() };
        geometry = { dispose: vi.fn() };
        material = { dispose: vi.fn(), clone: vi.fn().mockReturnThis(), transparent: false, opacity: 1, onBeforeCompile: null };
        parent = null;
        remove = vi.fn();
        rotation = { y: 0 };
        scale = { z: 0 };
        traverse(_cb: any) {}
    }
    return {
        Mesh: FakeMesh,
        Vector3: V3,
        MeshStandardMaterial: class { dispose = vi.fn(); clone() { return this; } transparent = false; opacity = 1; onBeforeCompile = null; },
        Material: class {},
        Scene: class { add = vi.fn(); remove = vi.fn(); children = []; },
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

vi.mock('../BaseMesh', () => ({
    BaseMesh: class {
        mesh = {
            traverse: vi.fn(),
            scale: { z: 0 },
            position: { x: 0, y: 0, z: 0, set: vi.fn() },
            parent: null,
            rotation: { y: 0 },
            quaternion: {},
        };
        update(_dt: number) {}
        disposeMesh = vi.fn();
    }
}));

vi.mock('../Player', () => ({ Player: class {} }));
vi.mock('../enemies/Enemy', () => ({ Enemy: class {} }));

import { LaserBeamSkill } from './LaserBeamSkill';
import { Tier } from '../items/TierManager';
import { SkillTechType } from './SkillTechType';
import type { Player } from '../Player';

function makePlayer(tier = Tier.STABLE) {
    return {
        id: 'p1',
        tp: 200, maxTp: 200,
        hp: 50, maxHp: 100,
        skills: [],
        getSkillTier: vi.fn().mockReturnValue(tier),
        getForwardDirection: vi.fn().mockReturnValue({
            x: 0, y: 0, z: 1,
            clone: vi.fn().mockReturnThis(),
            normalize: vi.fn().mockReturnThis(),
            multiplyScalar: vi.fn().mockReturnThis(),
        }),
        getRotationY: vi.fn().mockReturnValue(0),
        body: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } },
        position: { x: 0, y: 0, z: 0 },
        getCriticalChance: vi.fn().mockReturnValue(0),
        CRITICAL_HIT_MULTIPLIER: 2,
        tryIncrementSkillTech: vi.fn(),
    } as any;
}

describe('LaserBeamSkill', () => {
    let skill: LaserBeamSkill;

    beforeEach(() => {
        skill = new LaserBeamSkill(vi.fn());
    });

    describe('constructor', () => {
        it('sets name, cooldown, and tpCost', () => {
            expect(skill.name).toBe('Laser Beam');
            expect(skill.cooldown).toBe(5);
            expect(skill.tpCost).toBe(25);
        });
    });

    describe('getEffectiveTpCost()', () => {
        it.each([
            [Tier.STABLE,      25],
            [Tier.BROKEN,      25],
            [Tier.MAINTAINED,  50],
            [Tier.OVERCLOCKED, 75],
            [Tier.ZERODAY,     125],
            [Tier.LEET,        200],
        ])('returns %s for tier %s', (tier, expected) => {
            const player = makePlayer(tier) as Player;
            expect(skill.getEffectiveTpCost(player)).toBe(expected);
            expect(player.getSkillTier).toHaveBeenCalledWith(SkillTechType.RANGED);
        });
    });

    describe('execute()', () => {
        it('sets effectiveDamage to BASE_DAMAGE at STABLE tier', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(20);
        });

        it('multiplies effectiveDamage by 3 at MAINTAINED tier', () => {
            const player = makePlayer(Tier.MAINTAINED);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(60);
        });

        it('multiplies effectiveDamage by 6 at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).effectiveDamage).toBe(120);
        });

        it('sets effectiveRadius to 1.5x at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).effectiveRadius).toBe(1.5);
        });

        it('sets isBeingExecuted to true after execute', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).isBeingExecuted).toBe(true);
        });

        it('sets isLeet to true at LEET tier', () => {
            const player = makePlayer(Tier.LEET);
            player.tp = 500;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            expect((skill as any).isLeet).toBe(true);
        });

        it('calls player.getForwardDirection during execute', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            expect(player.getForwardDirection).toHaveBeenCalled();
        });
    });

    describe('update()', () => {
        it('advances effectTimer while executing', () => {
            const player = makePlayer(Tier.STABLE);
            player.tp = 200;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            (skill as any).effectTimer = 0;
            skill.update(0.2);
            expect((skill as any).effectTimer).toBeCloseTo(0.2);
        });

        it('calls cleanup when effectTimer exceeds DURATION', () => {
            const player = makePlayer(Tier.STABLE);
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { bodies: [], addBody: vi.fn(), removeBody: vi.fn() } as any;
            (skill as any).execute(player, scene, world);
            skill.update(100); // Far exceeds DURATION of 0.6s
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('decrements cooldownTimer even when not executing', () => {
            (skill as any).cooldownTimer = 3.0;
            skill.update(1.0);
            expect((skill as any).cooldownTimer).toBeCloseTo(2.0);
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
            const s = new LaserBeamSkill(callback);
            (s as any).cleanup();
            expect(callback).toHaveBeenCalled();
        });

        it('resets effectTimer to 0', () => {
            (skill as any).effectTimer = 0.4;
            (skill as any).cleanup();
            expect((skill as any).effectTimer).toBe(0);
        });
    });
});
