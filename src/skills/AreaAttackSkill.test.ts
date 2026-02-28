import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => ({
    Scene: class {},
    Vector3: class { constructor(_x = 0, _y = 0, _z = 0) {} copy() { return this; } },
    Mesh: class { geometry = { dispose: vi.fn() }; material = { dispose: vi.fn() }; parent = null; traverse(_cb: any) {} scale = { copy: vi.fn() }; position = { set: vi.fn() }; },
    MeshStandardMaterial: class { dispose = vi.fn(); opacity = 1; },
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

import { AreaAttackSkill } from './AreaAttackSkill';
import { Tier } from '../items/TierManager';
import { SkillTechType } from './SkillTechType';
import type { Player } from '../Player';

function makePlayer(tier: Tier): Partial<Player> {
    return {
        getSkillTier: vi.fn().mockReturnValue(tier),
        tp: 300,
        maxTp: 300,
    } as Partial<Player>;
}

describe('AreaAttackSkill', () => {
    let skill: AreaAttackSkill;

    beforeEach(() => {
        skill = new AreaAttackSkill(vi.fn());
    });

    describe('constructor', () => {
        it('sets name, cooldown, and tpCost', () => {
            expect(skill.name).toBe('Area Attack');
            expect(skill.cooldown).toBe(10);
            expect(skill.tpCost).toBe(30);
        });
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
});
