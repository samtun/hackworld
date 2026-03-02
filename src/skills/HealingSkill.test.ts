import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
    class V3 {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
        copy(v: any) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
        clone() { return new V3(this.x, this.y, this.z); }
        multiplyScalar() { return this; }
    }
    class FakeMesh {
        position = new V3();
        quaternion = { copy: vi.fn() };
        geometry = { dispose: vi.fn() };
        material = { dispose: vi.fn(), opacity: 1, transparent: false, emissive: {} };
        parent = null;
        remove = vi.fn();
        traverse(_cb: any) {}
    }
    return {
        Mesh: FakeMesh,
        Vector3: V3,
        SphereGeometry: class { dispose = vi.fn(); },
        MeshStandardMaterial: class { dispose = vi.fn(); opacity = 1; transparent = false; emissive = {}; },
        Material: class {},
        Scene: class { add = vi.fn(); remove = vi.fn(); children = []; },
        MathUtils: { randFloat: (a: number, b: number) => (a + b) / 2, randInt: (a: number, _b: number) => a },
    };
});

vi.mock('cannon-es', () => ({
    Vec3: class { x = 0; y = 0; z = 0; constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } },
    World: class { addBody = vi.fn(); removeBody = vi.fn(); },
}));

vi.mock('../BaseMesh', () => ({
    BaseMesh: class {
        mesh = {
            position: { x: 0, y: 0, z: 0, copy: vi.fn(), set: vi.fn() },
            quaternion: { copy: vi.fn() },
            scale: { copy: vi.fn() },
            parent: null,
            add: vi.fn(), remove: vi.fn(),
            traverse: vi.fn(),
        };
        body = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
        disposeMesh = vi.fn();
        update(_dt: number) {}
        scene: any; world: any;
    }
}));

vi.mock('../ui/UIManager', () => ({
    UIManager: { Instance: { displayInsufficientTPWarning: vi.fn() } }
}));

vi.mock('../Player', () => ({ Player: class {} }));

import { HealingSkill } from './HealingSkill';
import { Tier } from '../items/TierManager';
import { SkillTechType } from './SkillTechType';
import type { Player } from '../Player';

function makePlayer(tier = Tier.STABLE, hp = 50, maxHp = 100) {
    return {
        id: 'p1',
        tp: 100, maxTp: 100,
        hp, maxHp,
        skills: [],
        getSkillTier: vi.fn().mockReturnValue(tier),
        heal: vi.fn(),
        tryIncrementSkillTech: vi.fn(),
        body: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } },
        position: { x: 0, y: 0, z: 0 },
    } as any;
}

describe('HealingSkill', () => {
    let skill: HealingSkill;

    beforeEach(() => {
        skill = new HealingSkill(vi.fn());
    });

    describe('constructor', () => {
        it('sets name, cooldown, and tpCost', () => {
            expect(skill.name).toBe('Healing');
            expect(skill.cooldown).toBe(5);
            expect(skill.tpCost).toBe(20);
        });
    });

    describe('getEffectiveTpCost()', () => {
        it.each([
            [Tier.STABLE,      20],
            [Tier.BROKEN,      20],
            [Tier.MAINTAINED,  40],
            [Tier.OVERCLOCKED, 60],
            [Tier.ZERODAY,     120],
            [Tier.LEET,        200],
        ])('returns %s for tier %s', (tier, expected) => {
            const player = makePlayer(tier) as Player;
            expect(skill.getEffectiveTpCost(player)).toBe(expected);
            expect(player.getSkillTier).toHaveBeenCalledWith(SkillTechType.RECOVERY);
        });
    });

    describe('execute() via use()', () => {
        it('calls player.heal with BASE_HEAL_AMOUNT at STABLE tier', () => {
            const player = makePlayer(Tier.STABLE, 0, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.heal).toHaveBeenCalledWith(40, 0, true);
        });

        it('calls player.heal with 80 at MAINTAINED tier when hp=0', () => {
            const player = makePlayer(Tier.MAINTAINED, 0, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.heal).toHaveBeenCalledWith(80, 0, true);
        });

        it('calls player.heal capped to remaining HP at MAINTAINED tier', () => {
            const player = makePlayer(Tier.MAINTAINED, 60, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            // healAmount=80, maxHp-hp=40 → actualHeal=40
            expect(player.heal).toHaveBeenCalledWith(40, 0, true);
        });

        it('calls tryIncrementSkillTech when HP < maxHp', () => {
            const player = makePlayer(Tier.STABLE, 50, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.tryIncrementSkillTech).toHaveBeenCalledWith(SkillTechType.RECOVERY);
        });

        it('does NOT call tryIncrementSkillTech when already at full HP', () => {
            const player = makePlayer(Tier.STABLE, 100, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect(player.tryIncrementSkillTech).not.toHaveBeenCalled();
        });

        it('sets isBeingExecuted to true after execute', () => {
            const player = makePlayer(Tier.STABLE, 50, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).isBeingExecuted).toBe(true);
        });

        it('sets recoveryRemaining at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED, 0, 100);
            player.tp = 200;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            expect((skill as any).recoveryRemaining).toBe(5);
        });
    });

    describe('update()', () => {
        it('advances effectTimer while executing', () => {
            const player = makePlayer(Tier.STABLE, 50, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            (skill as any).effectTimer = 0;
            skill.update(0.3);
            expect((skill as any).effectTimer).toBeCloseTo(0.3);
        });

        it('calls cleanup and sets isBeingExecuted=false when effectTimer exceeds duration', () => {
            const player = makePlayer(Tier.STABLE, 50, 100);
            player.tp = 100;
            (skill as any).cooldownTimer = 0;
            const scene = { add: vi.fn(), remove: vi.fn() } as any;
            const world = { addBody: vi.fn(), removeBody: vi.fn() } as any;
            skill.use(player, scene, world);
            skill.update(100); // Far exceeds effectiveDuration of 1.5s
            expect((skill as any).isBeingExecuted).toBe(false);
        });

        it('decrements cooldownTimer even when not executing', () => {
            (skill as any).cooldownTimer = 2.0;
            skill.update(0.5);
            expect((skill as any).cooldownTimer).toBeCloseTo(1.5);
        });

        it('applies recovery healing over time at OVERCLOCKED tier', () => {
            const player = makePlayer(Tier.OVERCLOCKED, 0, 1000);
            // Set up recovery state directly to avoid coupling with execute/use flow
            (skill as any).recoveryPlayer = player;
            (skill as any).recoveryRemaining = 5;
            (skill as any).recoveryHealPerSecond = 32;
            (skill as any).recoveryTimer = 0;

            const callsBefore = (player.heal as ReturnType<typeof vi.fn>).mock.calls.length;
            skill.update(1.0); // 1 second → recovery fires once
            expect((player.heal as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
            expect(player.heal).toHaveBeenCalledWith(32, 0, true);
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
            const s = new HealingSkill(callback);
            (s as any).cleanup();
            expect(callback).toHaveBeenCalled();
        });

        it('resets effectTimer to 0', () => {
            (skill as any).effectTimer = 1.2;
            (skill as any).cleanup();
            expect((skill as any).effectTimer).toBe(0);
        });
    });
});
