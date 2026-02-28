import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => ({
    Scene: class {},
    Vector3: class { constructor(_x = 0, _y = 0, _z = 0) {} clone() { return this; } multiplyScalar() { return this; } },
    Mesh: class { geometry = { dispose: vi.fn() }; material = { dispose: vi.fn() }; parent = null; traverse(_cb: any) {} },
    MeshStandardMaterial: class { dispose = vi.fn(); },
    SphereGeometry: class {},
    Material: class {},
}));

vi.mock('cannon-es', () => ({
    Vec3: class { constructor(public x = 0, public y = 0, public z = 0) {} },
    World: class { bodies = []; },
    Body: class {},
}));

vi.mock('../ui/UIManager', () => ({
    UIManager: { Instance: { displayInsufficientTPWarning: vi.fn() } }
}));

vi.mock('../BaseMesh', () => ({
    BaseMesh: class {
        mesh = { traverse: vi.fn(), scale: { copy: vi.fn() }, position: { set: vi.fn() }, parent: null, rotation: {}, quaternion: {} };
        update(_dt: number) {}
        disposeMesh() {}
    }
}));

import { HealingSkill } from './HealingSkill';
import { Tier } from '../items/TierManager';
import { SkillTechType } from './SkillTechType';
import type { Player } from '../Player';

function makePlayer(tier: Tier): Partial<Player> {
    return {
        getSkillTier: vi.fn().mockReturnValue(tier),
        tp: 200,
        maxTp: 200,
        hp: 50,
        maxHp: 200,
    } as Partial<Player>;
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
});
