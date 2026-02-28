import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => ({
    Scene: class {},
    Vector3: class { constructor(_x = 0, _y = 0, _z = 0) {} clone() { return this; } normalize() { return this; } multiplyScalar() { return this; } },
    Mesh: class { geometry = { dispose: vi.fn() }; material = { dispose: vi.fn(), clone: vi.fn().mockReturnThis(), transparent: false, opacity: 1, onBeforeCompile: null }; parent = null; traverse(_cb: any) {} rotation = { y: 0 }; scale = { z: 0 }; position = { set: vi.fn() }; },
    MeshStandardMaterial: class { dispose = vi.fn(); clone() { return this; } transparent = false; opacity = 1; onBeforeCompile = null; },
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
        mesh = { traverse: vi.fn(), scale: { z: 0 }, position: { set: vi.fn() }, parent: null, rotation: { y: 0 }, quaternion: {} };
        update(_dt: number) {}
        disposeMesh() {}
    }
}));

import { LaserBeamSkill } from './LaserBeamSkill';
import { Tier } from '../items/TierManager';
import { SkillTechType } from './SkillTechType';
import type { Player } from '../Player';

function makePlayer(tier: Tier): Partial<Player> {
    return {
        getSkillTier: vi.fn().mockReturnValue(tier),
        tp: 200,
        maxTp: 200,
    } as Partial<Player>;
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
});
