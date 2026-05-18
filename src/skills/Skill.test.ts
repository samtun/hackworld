import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => ({
    Scene: class {},
    Vector3: class { constructor(_x = 0, _y = 0, _z = 0) {} },
    Mesh: class {},
    MeshStandardMaterial: class {},
    SphereGeometry: class {},
    Material: class {},
}));

vi.mock('cannon-es', () => ({
    Vec3: class { constructor(_x = 0, _y = 0, _z = 0) {} },
    World: class { bodies = []; },
    Body: class {},
}));

vi.mock('../ui/UIManager', () => ({
    UIManager: {
        Instance: { displayInsufficientTPWarning: vi.fn() }
    }
}));

vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: { playInsufficient: vi.fn() }
    }
}));

import { Skill } from './Skill';
import { UIManager } from '../ui/UIManager';
import { AudioManager } from '../AudioManager';
import type { Player } from '../Player';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Minimal concrete subclass for testing
class TestSkill extends Skill {
    executeCalled = false;

    constructor(cooldown = 5, tpCost = 20) {
        super('Test', cooldown, tpCost, vi.fn(), '');
    }

    protected execute(_player: Player, _scene: THREE.Scene, _world: CANNON.World): void {
        this.executeCalled = true;
    }

    cleanup(): void {}

    // Expose cooldownTimer for testing
    getCooldownTimer(): number {
        return this.cooldownTimer;
    }

    setCooldownTimer(v: number): void {
        this.cooldownTimer = v;
    }
}

function makePlayer(tp: number, maxTp = 100): Partial<Player> {
    return { tp, maxTp, hp: 100, maxHp: 100, collectionBonusSkillCooldownReduction: 0 } as Partial<Player>;
}

describe('Skill', () => {
    let skill: TestSkill;

    beforeEach(() => {
        skill = new TestSkill(5, 20);
        vi.clearAllMocks();
    });

    describe('isReady()', () => {
        it('returns true when cooldownTimer is 0', () => {
            expect(skill.isReady()).toBe(true);
        });

        it('returns false when cooldownTimer > 0', () => {
            skill.setCooldownTimer(2);
            expect(skill.isReady()).toBe(false);
        });
    });

    describe('canUse()', () => {
        it('returns true when player has exactly enough TP', () => {
            const player = makePlayer(20) as Player;
            expect(skill.canUse(player)).toBe(true);
        });

        it('returns true when player has more than enough TP', () => {
            const player = makePlayer(50) as Player;
            expect(skill.canUse(player)).toBe(true);
        });

        it('returns false when player has insufficient TP', () => {
            const player = makePlayer(10) as Player;
            expect(skill.canUse(player)).toBe(false);
        });
    });

    describe('use()', () => {
        const scene = {} as THREE.Scene;
        const world = {} as CANNON.World;

        it('returns false when skill is on cooldown', () => {
            skill.setCooldownTimer(3);
            const player = makePlayer(50) as Player;
            expect(skill.use(player, scene, world)).toBe(false);
        });

        it('returns false and calls displayInsufficientTPWarning when player lacks TP', () => {
            const player = makePlayer(5) as Player;
            const result = skill.use(player, scene, world);
            expect(result).toBe(false);
            expect(UIManager.Instance.displayInsufficientTPWarning).toHaveBeenCalledOnce();
            expect(AudioManager.Instance.playInsufficient).toHaveBeenCalledOnce();
        });

        it('returns true on success, deducts TP, starts cooldown, and calls execute', () => {
            const player = makePlayer(50) as Player;
            const result = skill.use(player, scene, world);
            expect(result).toBe(true);
            expect(player.tp).toBe(30);
            expect(skill.getCooldownTimer()).toBe(5);
            expect(skill.executeCalled).toBe(true);
        });

        it('applies 10% cooldown reduction when collectionBonusSkillCooldownReduction is 0.10', () => {
            const player = makePlayer(50) as Player;
            (player as any).collectionBonusSkillCooldownReduction = 0.10;
            skill.use(player, scene, world);
            // 5 * (1 - 0.10) = 4.5
            expect(skill.getCooldownTimer()).toBeCloseTo(4.5);
        });
    });

    describe('update()', () => {
        it('decrements cooldownTimer by dt', () => {
            skill.setCooldownTimer(5);
            skill.update(1.5);
            expect(skill.getCooldownTimer()).toBeCloseTo(3.5);
        });

        it('does not decrement when cooldownTimer is already 0', () => {
            skill.update(1);
            expect(skill.getCooldownTimer()).toBe(0);
        });

        it('clamps getRemainingCooldown to 0 after timer overshoots', () => {
            skill.setCooldownTimer(0.5);
            skill.update(2);
            // The internal timer may go negative, but getRemainingCooldown clamps to 0
            expect(skill.getRemainingCooldown()).toBe(0);
        });
    });

    describe('getRemainingCooldown()', () => {
        it('returns 0 when not on cooldown', () => {
            expect(skill.getRemainingCooldown()).toBe(0);
        });

        it('returns remaining time when on cooldown', () => {
            skill.setCooldownTimer(3.7);
            expect(skill.getRemainingCooldown()).toBeCloseTo(3.7);
        });
    });

    describe('isOnCooldown()', () => {
        it('returns false when cooldownTimer is 0', () => {
            expect(skill.isOnCooldown()).toBe(false);
        });

        it('returns true when cooldownTimer > 0', () => {
            skill.setCooldownTimer(1);
            expect(skill.isOnCooldown()).toBe(true);
        });
    });

    describe('getEffectiveTpCost()', () => {
        it('returns base tpCost by default', () => {
            const player = makePlayer(50) as Player;
            expect(skill.getEffectiveTpCost(player)).toBe(20);
        });
    });
});
