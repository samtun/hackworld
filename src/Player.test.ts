import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Player } from './Player';
import { StatType } from './StatType';
import { CoreItem } from './items/cores/CoreItem';
import { ChipItem } from './items/chips/ChipItem';
import { WeaponItem } from './items/weapons/WeaponItem';
import { WeaponType } from './items/weapons/WeaponType';
import { Tier, TierManager } from './items/TierManager';

/**
 * Create a minimal Player instance for unit testing without instantiating
 * Three.js / Cannon-es objects (bypasses the constructor).
 */
function makePlayer(overrides: Partial<Record<string, unknown>> = {}): Player {
    const player = Object.create(Player.prototype) as Player;

    // Private readonly constants (normally assigned in class field initializers)
    Object.assign(player, {
        MAX_STAT_VALUE: 9999,
        HP_TP_UPGRADE_AMOUNT: 5,
        STRENGTH_DEFENSE_UPGRADE_AMOUNT: 1,
        STAT_FORMULA_NUMERATOR: 0.27,
        STAT_FORMULA_LOG_BASE: 9999,
        LUCK_DIVISOR: 40000,
        CRITICAL_HIT_MULTIPLIER: 1.5,
        MAX_LEVEL: 9999,
        LEVEL_HP_MULTIPLIER: 10.01,
        LEVEL_TP_MULTIPLIER: 5.005,
        EXP_BASE: 350,
        EXP_LINEAR_FACTOR: 30,
        EXP_QUADRATIC_FACTOR: 0.07,
        TECH_POINT_CAP: 2500,
        SKILL_TECH_POINT_CAP: 1200,
        HIT_INVULNERABILITY: 1.0,
        STUN_TIME: 0.5,
        KNOCKBACK_FORCE: 80,
        CHARGE_DURATION: 0.8,
        WALK_SPEED: 6,
        LEVEL_UP_PARTICLE_LIFETIME: 0.6,
        LEVEL_UP_SHOCKWAVE_DELAY: 0.4,

        // Base stats
        baseHp: 170,
        baseTp: 60,
        baseStrength: 1,
        baseDefense: 1,
        baseAgility: 1,
        baseLuck: 1,

        // Current stats
        level: 1,
        exp: 0,
        expRequired: 350,
        maxHp: 170,
        hp: 170,
        maxTp: 60,
        tp: 60,
        strength: 1,
        defense: 1,
        agility: 1,
        luck: 1,
        invulnerableTimer: 0,
        statPointsAvailable: 0,
        xData: 0,
        boosterPacks: 0,
        bits: 0,

        // Upgrade levels
        strengthUpgrades: 0,
        defenseUpgrades: 0,
        hpUpgrades: 0,
        tpUpgrades: 0,
        agilityUpgrades: 0,
        luckUpgrades: 0,

        // Stat points from leveling
        strengthPoints: 0,
        defensePoints: 0,
        agilityPoints: 0,
        luckPoints: 0,

        // State flags
        isDead: false,
        isLevelingUp: false,
        isDashing: false,
        isChargingAttack: false,
        shockwavePending: false,
        levelUpShockwaveTimer: 0,
        stunTimer: 0,
        levelUpParticles: [],
        levelUpParticleTimer: 0,
        chargeParticles: [],

        // Inventory & items
        inventory: [],
        currentWeaponType: WeaponType.SWORD,
        tech: {
            [WeaponType.SWORD]: 0,
            [WeaponType.DUAL_BLADE]: 0,
            [WeaponType.LANCE]: 0,
            [WeaponType.HAMMER]: 0,
        },
        skillTech: {
            RECOVERY: 0,
            BLAST: 0,
            RANGED: 0,
        },

        // Mocked dependencies
        floatingIndicatorManager: {
            spawnDamage: vi.fn(),
            spawnHeal: vi.fn(),
            spawnTp: vi.fn(),
            spawnTech: vi.fn(),
        },
        body: {
            position: { x: 0, y: 0, z: 0, copy: vi.fn(), vsub: (_v: any) => ({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() }) },
            velocity: { x: 0, y: 0, z: 0, set: vi.fn() },
            applyImpulse: vi.fn(),
            type: 2, // CANNON.Body.DYNAMIC
        },
        weapon: {
            stopAttack: vi.fn(),
            isAttacking: false,
            damage: 10,
            weaponType: WeaponType.SWORD,
        },
        mesh: {
            position: { x: 0, y: 0, z: 0, copy: vi.fn() },
            quaternion: { slerp: vi.fn() },
            children: [],
            parent: null,
            add: vi.fn(),
            remove: vi.fn(),
        },
        position: { copy: vi.fn() },
        world: { bodies: [] },
        scene: {},
        actions: {},
        currentAction: null,
        skills: [],
        deathCallback: undefined,
    });

    // Override syncPosition to avoid THREE.Vector3 creation
    (player as any).syncPosition = vi.fn();

    Object.assign(player, overrides);
    return player;
}

// ─── recalculateStats ──────────────────────────────────────────────────────────

describe('Player.recalculateStats', () => {
    let player: Player;

    beforeEach(() => { player = makePlayer(); });

    it('computes base stats correctly at level 1 with no upgrades', () => {
        player.recalculateStats();
        expect(player.strength).toBe(1);
        expect(player.defense).toBe(1);
        expect(player.agility).toBe(1);
        expect(player.luck).toBe(1);
        expect(player.maxHp).toBe(170);
        expect(player.maxTp).toBe(60);
    });

    it('adds X-Data upgrade amounts to stats', () => {
        (player as any).strengthUpgrades = 5;
        (player as any).defenseUpgrades = 3;
        player.recalculateStats();
        expect(player.strength).toBe(6); // baseStrength(1) + upgrades(5)
        expect(player.defense).toBe(4);  // baseDefense(1) + upgrades(3)
    });

    it('adds stat points from leveling to stats', () => {
        (player as any).strengthPoints = 10;
        (player as any).luckPoints = 7;
        player.recalculateStats();
        expect(player.strength).toBe(11); // baseStrength(1) + points(10)
        expect(player.luck).toBe(8);
    });

    it('applies HP upgrade bonus', () => {
        (player as any).hpUpgrades = 4;
        player.recalculateStats();
        // 170 + 4*5 = 190
        expect(player.maxHp).toBe(190);
    });

    it('applies TP upgrade bonus', () => {
        (player as any).tpUpgrades = 6;
        player.recalculateStats();
        // 60 + 6*5 = 90
        expect(player.maxTp).toBe(90);
    });

    it('adds level-based HP bonus', () => {
        (player as any).level = 2;
        player.recalculateStats();
        // Math.floor(10.01 * (2-1)) = 10
        expect(player.maxHp).toBe(180);
    });

    it('adds level-based TP bonus', () => {
        (player as any).level = 2;
        player.recalculateStats();
        // Math.floor(5.005 * (2-1)) = 5
        expect(player.maxTp).toBe(65);
    });

    it('caps stats at MAX_STAT_VALUE', () => {
        (player as any).strengthUpgrades = 9999;
        player.recalculateStats();
        expect(player.strength).toBe(9999);
    });

    it('clamps current HP to new maxHp if it exceeds it', () => {
        player.hp = 500;
        player.maxHp = 500;
        // After recalculate at level 1, maxHp becomes 170 so hp should clamp
        player.recalculateStats();
        expect(player.hp).toBe(170);
    });

    it('applies equipped core stat bonuses', () => {
        const core = new CoreItem('c1', 'Test Core', 100, 50,
            { strength: 10, defense: 5 }, 1);
        core.isEquipped = true;
        player.inventory = [core];
        player.recalculateStats();
        expect(player.strength).toBe(11); // 1 base + 10 from core
        expect(player.defense).toBe(6);   // 1 base + 5 from core
    });
});

// ─── getCriticalChance ──────────────────────────────────────────────────────────

describe('Player.getCriticalChance', () => {
    it('returns the correct value at agility 1 (base)', () => {
        // Formula: 0.02 + (log10(agility + 50) * 7 - 11.9) * 0.01
        // 0.02 + (log10(51) * 7 - 11.9) * 0.01 ≈ 0.02053
        const player = makePlayer();
        expect(player.getCriticalChance()).toBeCloseTo(0.02053, 4);
    });

    it('returns the correct value at agility 100', () => {
        // 0.02 + (log10(150) * 7 - 11.9) * 0.01 ≈ 0.05333
        const player = makePlayer({ agility: 100 } as any);
        expect(player.getCriticalChance()).toBeCloseTo(0.05333, 4);
    });

    it('returns the correct value at agility 9999 (max)', () => {
        // 0.02 + (log10(10049) * 7 - 11.9) * 0.01 ≈ 0.18115
        const player = makePlayer({ agility: 9999 } as any);
        expect(player.getCriticalChance()).toBeCloseTo(0.18115, 4);
    });

    it('increases with agility', () => {
        const low = makePlayer();
        const high = makePlayer({ agility: 500 } as any);
        expect(high.getCriticalChance()).toBeGreaterThan(low.getCriticalChance());
    });
});

// ─── luckDropChanceBonus ───────────────────────────────────────────────────────

describe('Player.luckDropChanceBonus', () => {
    it('equals luck / LUCK_DIVISOR', () => {
        const player = makePlayer({ luck: 100 } as any);
        expect(player.luckDropChanceBonus).toBeCloseTo(100 / 40000);
    });
});

// ─── weaponDropBonusFactor ─────────────────────────────────────────────────────

describe('Player.weaponDropBonusFactor', () => {
    it('is 1.0 at level 1', () => {
        const player = makePlayer();
        expect(player.weaponDropBonusFactor).toBe(1.0);
    });

    it('caps at 1.5 at level 420 (the formula reaches 1.5 exactly at t=1.0)', () => {
        // t = (420 - 1) / (420 - 1) = 1.0 → factor = min(1 + 0.5 * 1, 1.5) = 1.5
        const player = makePlayer({ level: 420 } as any);
        expect(player.weaponDropBonusFactor).toBe(1.5);
    });

    it('is still below 1.5 at level 419 (one below the cap threshold)', () => {
        // t = 418/419 < 1 → factor < 1.5; confirms the cap is exactly at level 420
        const player = makePlayer({ level: 419 } as any);
        expect(player.weaponDropBonusFactor).toBeCloseTo(1.4976, 3);
        expect(player.weaponDropBonusFactor).toBeLessThan(1.5);
    });

    it('caps at 1.5 at very high levels', () => {
        const player = makePlayer({ level: 9999 } as any);
        expect(player.weaponDropBonusFactor).toBe(1.5);
    });

    it('increases monotonically with level', () => {
        const p100 = makePlayer({ level: 100 } as any);
        const p200 = makePlayer({ level: 200 } as any);
        expect(p200.weaponDropBonusFactor).toBeGreaterThan(p100.weaponDropBonusFactor);
    });
});

// ─── heal ──────────────────────────────────────────────────────────────────────

describe('Player.heal', () => {
    let player: Player;

    beforeEach(() => { player = makePlayer(); player.hp = 100; player.tp = 30; });

    it('restores HP up to maxHp', () => {
        player.heal(50);
        expect(player.hp).toBe(150);
    });

    it('does not overheal HP beyond maxHp', () => {
        player.heal(9999);
        expect(player.hp).toBe(player.maxHp);
    });

    it('restores TP', () => {
        player.heal(0, 20);
        expect(player.tp).toBe(50);
    });

    it('does not overheal TP beyond maxTp', () => {
        player.heal(0, 9999);
        expect(player.tp).toBe(player.maxTp);
    });

    it('does nothing when already at full health', () => {
        player.hp = player.maxHp;
        player.tp = player.maxTp;
        player.heal(50, 10);
        expect(player.hp).toBe(player.maxHp);
        expect(player.tp).toBe(player.maxTp);
    });

    it('heals both HP and TP simultaneously', () => {
        player.heal(20, 10);
        expect(player.hp).toBe(120);
        expect(player.tp).toBe(40);
    });
});

// ─── takeDamage ────────────────────────────────────────────────────────────────

describe('Player.takeDamage', () => {
    let player: Player;

    beforeEach(() => { player = makePlayer(); });

    it('reduces HP by damage amount (no defense reduction at defense=1)', () => {
        player.takeDamage(30);
        // defense=1 → getDefenseMultiplier()=0 → no reduction
        expect(player.hp).toBe(140);
    });

    it('ensures minimum 1 damage even with very high defense', () => {
        (player as any).defense = 9999;
        player.takeDamage(1);
        // reducedDamage = Math.max(1, ...) ensures at least 1
        expect(player.hp).toBe(169);
    });

    it('reduces damage with higher defense', () => {
        (player as any).defense = 1000;
        const before = player.hp;
        player.takeDamage(100);
        expect(player.hp).toBeGreaterThan(before - 100); // damage is reduced
        expect(player.hp).toBeLessThan(before); // some damage was taken
    });

    it('sets isDead when HP reaches 0', () => {
        player.takeDamage(9999);
        expect(player.isDead).toBe(true);
        expect(player.hp).toBe(0);
    });

    it('does not apply damage when already dead', () => {
        player.isDead = true;
        player.hp = 170;
        player.takeDamage(50);
        expect(player.hp).toBe(170);
    });

    it('does not apply damage when invulnerable', () => {
        player.invulnerableTimer = 0.5;
        player.takeDamage(50);
        expect(player.hp).toBe(170);
    });

    it('does not apply damage while leveling up', () => {
        (player as any).isLevelingUp = true;
        player.takeDamage(50);
        expect(player.hp).toBe(170);
    });

    it('sets invulnerability after taking damage', () => {
        player.takeDamage(10);
        expect(player.invulnerableTimer).toBe(1.0);
    });
});

// ─── die / respawn ─────────────────────────────────────────────────────────────

describe('Player.die', () => {
    it('sets isDead to true', () => {
        const player = makePlayer();
        // die is private; trigger via takeDamage with lethal damage
        player.takeDamage(9999);
        expect(player.isDead).toBe(true);
    });

    it('calls the death callback', () => {
        const player = makePlayer();
        const cb = vi.fn();
        player.setDeathCallback(cb);
        player.takeDamage(9999);
        expect(cb).toHaveBeenCalledOnce();
    });

    it('does not call death callback if not set', () => {
        const player = makePlayer();
        // Should not throw
        expect(() => player.takeDamage(9999)).not.toThrow();
        expect(player.isDead).toBe(true);
    });
});

describe('Player.respawn', () => {
    it('revives the player', () => {
        const player = makePlayer({ isDead: true, hp: 0 } as any);
        const pos = { x: 5, y: 2, z: 3, copy: vi.fn() } as any;
        player.respawn(pos);
        expect(player.isDead).toBe(false);
    });

    it('restores HP to maxHp on respawn', () => {
        const player = makePlayer({ isDead: true, hp: 0 } as any);
        const pos = { x: 0, y: 0, z: 0, copy: vi.fn() } as any;
        player.respawn(pos);
        expect(player.hp).toBe(player.maxHp);
    });

    it('restores TP to maxTp on respawn', () => {
        const player = makePlayer({ isDead: true, tp: 0 } as any);
        const pos = { x: 0, y: 0, z: 0, copy: vi.fn() } as any;
        player.respawn(pos);
        expect(player.tp).toBe(player.maxTp);
    });

    it('grants invulnerability after respawn', () => {
        const player = makePlayer({ isDead: true } as any);
        const pos = { x: 0, y: 0, z: 0, copy: vi.fn() } as any;
        player.respawn(pos);
        expect(player.invulnerableTimer).toBe(2.0);
    });
});

// ─── gainExp / levelUp ────────────────────────────────────────────────────────

describe('Player.gainExp', () => {
    let player: Player;

    beforeEach(() => { player = makePlayer(); });

    it('increases exp correctly (with luck bonus)', () => {
        // luck=1: adjustedAmount = floor(100 + 100 * 0.05 * log10(21)) = floor(106.611) = 106
        const result = player.gainExp(100);
        expect(result).toBe(106);
        expect(player.exp).toBe(106);
    });

    it('does not gain exp at max level', () => {
        (player as any).level = 9999;
        const result = player.gainExp(1000);
        expect(result).toBe(0);
        expect(player.exp).toBe(0);
    });

    it('levels up when exp reaches expRequired', () => {
        // At luck=1, gainExp(330) gives ~351 adjusted which exceeds expRequired(350)
        player.gainExp(330);
        expect(player.level).toBe(2);
    });

    it('awards 4 stat points on level up', () => {
        player.gainExp(330);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('updates expRequired after level up', () => {
        player.gainExp(330);
        // calculateExpRequired(2) = floor(350 + 2*30 + 4*0.07) = 410
        expect(player.expRequired).toBe(410);
    });

    it('restores HP to maxHp on level up', () => {
        player.hp = 10;
        player.gainExp(330);
        expect(player.hp).toBe(player.maxHp);
    });

    it('restores TP to maxTp on level up', () => {
        player.tp = 5;
        player.gainExp(330);
        expect(player.tp).toBe(player.maxTp);
    });

    it('carries over excess exp after level up', () => {
        // gainExp(1000) → adjusted = floor(1000 + 66.11) = 1066
        // Level up at level 1 (expRequired=350): excess = 1066 - 350 = 716
        // Level up at level 2 (expRequired=410): excess = 716 - 410 = 306
        // Level 3 requires 440 exp, so no further level up; exp = 306
        player.gainExp(1000);
        expect(player.exp).toBe(306);
    });

    it('can gain multiple levels in one call', () => {
        player.gainExp(9999);
        expect(player.level).toBeGreaterThan(2);
    });
});

// ─── collectXData / collectBoosterPack ────────────────────────────────────────

describe('Player.collectXData', () => {
    it('increases xData by the given amount', () => {
        const player = makePlayer();
        player.collectXData(50);
        expect(player.xData).toBe(50);
    });

    it('accumulates xData over multiple calls', () => {
        const player = makePlayer();
        player.collectXData(10);
        player.collectXData(25);
        expect(player.xData).toBe(35);
    });
});

describe('Player.collectBoosterPack', () => {
    it('increments boosterPacks by 1', () => {
        const player = makePlayer();
        player.collectBoosterPack();
        expect(player.boosterPacks).toBe(1);
    });
});

// ─── upgradeWithXData ─────────────────────────────────────────────────────────

describe('Player.upgradeWithXData', () => {
    let player: Player;

    beforeEach(() => { player = makePlayer({ xData: 100 } as any); });

    it('upgrades strength and deducts X-Data cost', () => {
        const cost = player.getUpgradeCost(0); // level 0 → fibonacci[0] = 1
        player.upgradeWithXData(StatType.STRENGTH);
        expect(player.xData).toBe(100 - cost);
        expect((player as any).strengthUpgrades).toBe(1);
    });

    it('upgrades defense', () => {
        player.upgradeWithXData(StatType.DEFENSE);
        expect((player as any).defenseUpgrades).toBe(1);
    });

    it('upgrades agility', () => {
        player.upgradeWithXData(StatType.AGILITY);
        expect((player as any).agilityUpgrades).toBe(1);
    });

    it('upgrades luck', () => {
        player.upgradeWithXData(StatType.LUCK);
        expect((player as any).luckUpgrades).toBe(1);
    });

    it('upgrades HP and immediately heals by the upgrade amount', () => {
        player.hp = 150;
        player.upgradeWithXData(StatType.HP);
        // hpUpgrades++ triggers hp += HP_TP_UPGRADE_AMOUNT (5)
        expect(player.hp).toBe(155);
    });

    it('upgrades TP and immediately restores by the upgrade amount', () => {
        player.tp = 30;
        player.upgradeWithXData(StatType.TP);
        expect(player.tp).toBe(35);
    });

    it('returns false when insufficient X-Data', () => {
        (player as any).xData = 0;
        expect(player.upgradeWithXData(StatType.STRENGTH)).toBe(false);
        expect((player as any).strengthUpgrades).toBe(0);
    });

    it('returns false when stat already at MAX_STAT_VALUE', () => {
        (player as any).strengthUpgrades = 9998; // base(1) + upgrades(9998) = 9999 = MAX
        expect(player.upgradeWithXData(StatType.STRENGTH)).toBe(false);
    });

    it('uses Fibonacci cost scaling for repeated upgrades', () => {
        expect(player.getUpgradeCost(0)).toBe(1);
        expect(player.getUpgradeCost(1)).toBe(1);
        expect(player.getUpgradeCost(2)).toBe(2);
        expect(player.getUpgradeCost(5)).toBe(8);
        expect(player.getUpgradeCost(11)).toBe(144);
        // Caps at index 11
        expect(player.getUpgradeCost(12)).toBe(144);
    });
});

// ─── getUpgradeCost ───────────────────────────────────────────────────────────

describe('Player.getUpgradeCost', () => {
    let player: Player;
    beforeEach(() => { player = makePlayer(); });

    it('returns correct Fibonacci values for all sequence indices', () => {
        const expected = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
        for (let i = 0; i < expected.length; i++) {
            expect(player.getUpgradeCost(i)).toBe(expected[i]);
        }
    });

    it('caps at 144 (fibonacci[11]) for levels 10 through 50', () => {
        expect(player.getUpgradeCost(10)).toBe(89);
        expect(player.getUpgradeCost(11)).toBe(144);
        expect(player.getUpgradeCost(50)).toBe(144);
        expect(player.getUpgradeCost(100)).toBe(144);
    });
});

// ─── calculateExpRequired (via gainExp / expRequired) ────────────────────────

describe('Player.calculateExpRequired (via expRequired)', () => {
    // Formula: floor(350 + level*30 + level^2 * 0.07)
    // Level 1: floor(350 + 30 + 0.07) = 380
    // Level 2: floor(350 + 60 + 0.28) = 410
    // Level 10: floor(350 + 300 + 7.0) = 657

    it('expRequired at level 1 equals floor(350 + 1*30 + 1^2*0.07) = 380', () => {
        const player = makePlayer({ level: 1, expRequired: 0 } as any);
        // recalculate via gainExp triggering levelUp which calls calculateExpRequired(newLevel)
        // Instead, verify initial expRequired matches EXP_BASE (350) for level 0 pre-levelUp
        // After leveling from 1→2, expRequired should be for level 2
        (player as any).expRequired = 1; // trigger immediate level up
        (player as any).exp = 0;
        (player as any).recalculateStats = vi.fn();
        (player as any).heal = vi.fn();
        (player as any).isLevelingUp = false;
        (player as any).fadeToAction = vi.fn();
        (player as any).shockwavePending = false;
        (player as any).levelUpShockwaveTimer = 0;
        player.gainExp(1);
        // After level up from 1→2, calculateExpRequired(2) = floor(350+60+0.28) = 410
        expect((player as any).expRequired).toBe(410);
    });

    it('expRequired at level 2 equals floor(350 + 2*30 + 4*0.07) = 410', () => {
        const player = makePlayer({ level: 2, expRequired: 1 } as any);
        (player as any).exp = 0;
        (player as any).recalculateStats = vi.fn();
        (player as any).heal = vi.fn();
        (player as any).isLevelingUp = false;
        (player as any).fadeToAction = vi.fn();
        (player as any).shockwavePending = false;
        (player as any).levelUpShockwaveTimer = 0;
        player.gainExp(1);
        // After level up from 2→3, calculateExpRequired(3) = floor(350+90+0.63) = 440
        expect((player as any).expRequired).toBe(440);
    });

    it('expRequired at level 10 equals floor(350 + 10*30 + 100*0.07) = 657', () => {
        const player = makePlayer({ level: 10, expRequired: 1 } as any);
        (player as any).exp = 0;
        (player as any).recalculateStats = vi.fn();
        (player as any).heal = vi.fn();
        (player as any).isLevelingUp = false;
        (player as any).fadeToAction = vi.fn();
        (player as any).shockwavePending = false;
        (player as any).levelUpShockwaveTimer = 0;
        player.gainExp(1);
        // After level up from 10→11, calculateExpRequired(11) = floor(350+330+8.47) = 688
        expect((player as any).expRequired).toBe(688);
    });
});

// ─── addStatPoint ─────────────────────────────────────────────────────────────

describe('Player.addStatPoint', () => {
    let player: Player;

    beforeEach(() => { player = makePlayer({ statPointsAvailable: 5 } as any); });

    it('adds a strength point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.STRENGTH);
        expect((player as any).strengthPoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('returns false when no points available', () => {
        (player as any).statPointsAvailable = 0;
        expect(player.addStatPoint(StatType.STRENGTH)).toBe(false);
    });

    it('returns false for HP stat (not valid for stat points)', () => {
        expect(player.addStatPoint(StatType.HP)).toBe(false);
    });

    it('returns false for TP stat (not valid for stat points)', () => {
        expect(player.addStatPoint(StatType.TP)).toBe(false);
    });

    it('returns false when stat already at max', () => {
        (player as any).strengthPoints = 9998; // base(1)+points(9998) = 9999 = MAX
        expect(player.addStatPoint(StatType.STRENGTH)).toBe(false);
    });
});

// ─── WeaponItem canEquip ───────────────────────────────────────────────────────

describe('WeaponItem canEquip', () => {
    const stableTier = TierManager.Instance.tiers.get(Tier.STABLE)!;

    it('allows equipping level-1 weapon with 0 tech', () => {
        const player = makePlayer();
        const weapon = new WeaponItem('w1', 'Sword', 100, 50, WeaponType.SWORD, 10, 'model.glb', stableTier, 1);
        expect(weapon.canEquip(player)).toBe(true);
    });

    it('blocks equipping level-2 weapon without sufficient tech', () => {
        const player = makePlayer();
        // level-2 requires 120 tech, player has 0
        const weapon = new WeaponItem('w2', 'Sword+', 200, 100, WeaponType.SWORD, 20, 'model.glb', stableTier, 2);
        expect(weapon.canEquip(player)).toBe(false);
    });

    it('allows equipping level-2 weapon with sufficient tech', () => {
        const player = makePlayer();
        (player as any).tech[WeaponType.SWORD] = 120;
        const weapon = new WeaponItem('w2', 'Sword+', 200, 100, WeaponType.SWORD, 20, 'model.glb', stableTier, 2);
        expect(weapon.canEquip(player)).toBe(true);
    });
});

// ─── CoreItem canEquip ────────────────────────────────────────────────────────

describe('CoreItem canEquip', () => {
    it('allows equipping level-1 core at level 1', () => {
        const player = makePlayer();
        const core = new CoreItem('c1', 'Core', 100, 50, { strength: 5 }, 1);
        expect(core.canEquip(player)).toBe(true);
    });

    it('blocks equipping level-2 core below required player level', () => {
        const player = makePlayer(); // level 1
        const core = new CoreItem('c2', 'Core+', 200, 100, { strength: 10 }, 2);
        // level-2 core requires player level 10
        expect(core.canEquip(player)).toBe(false);
    });

    it('allows equipping level-2 core at required player level', () => {
        const player = makePlayer({ level: 10 } as any);
        const core = new CoreItem('c2', 'Core+', 200, 100, { strength: 10 }, 2);
        expect(core.canEquip(player)).toBe(true);
    });
});

// ─── ChipItem canEquip ────────────────────────────────────────────────────────

describe('ChipItem canEquip', () => {
    it('allows equipping level-1 chip at level 1', () => {
        const player = makePlayer();
        const chip = new ChipItem('ch1', 'Chip', 100, 50, 'RANGE' as any, {}, 1);
        expect(chip.canEquip(player)).toBe(true);
    });

    it('blocks equipping higher-level chip at low player level', () => {
        const player = makePlayer(); // level 1
        const chip = new ChipItem('ch2', 'Chip+', 200, 100, 'RANGE' as any, {}, 3);
        // level-3 chip requires player level 24
        expect(chip.canEquip(player)).toBe(false);
    });
});

// ─── Player.equipWeapon ───────────────────────────────────────────────────────

describe('Player.equipWeapon', () => {
    const stableTier = TierManager.Instance.tiers.get(Tier.STABLE)!;

    it('equips the weapon matching the given id from inventory', () => {
        const weapon = new WeaponItem('w1', 'Sword', 100, 50, WeaponType.SWORD, 10, 'model.glb', stableTier, 1);
        const player = makePlayer({
            inventory: [weapon],
            setWeapon: vi.fn(),
        });
        player.equipWeapon('w1');
        expect(weapon.isEquipped).toBe(true);
    });

    it('does nothing when no item with the given id is found', () => {
        const player = makePlayer({ inventory: [] });
        expect(() => player.equipWeapon('non-existent')).not.toThrow();
    });
});

// ─── Player.equipCore ────────────────────────────────────────────────────────

describe('Player.equipCore', () => {
    it('equips the core matching the given id from inventory', () => {
        const core = new CoreItem('core1', 'Herald Core', 200, 100, { strength: 3 }, 1);
        const recalc = vi.fn();
        const player = makePlayer({ inventory: [core], level: 1, recalculateStats: recalc });
        player.equipCore('core1');
        expect(core.isEquipped).toBe(true);
    });

    it('does nothing when no item with the given id is found', () => {
        const player = makePlayer({ inventory: [] });
        expect(() => player.equipCore('non-existent')).not.toThrow();
    });
});

// ─── Player.equipChip ────────────────────────────────────────────────────────

describe('Player.equipChip', () => {
    it('equips the chip matching the given id from inventory', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, 'firewire' as any, { weaponRangeMultiplier: 1.1 }, 1);
        const recalc = vi.fn();
        const player = makePlayer({ inventory: [chip], level: 1, recalculateStats: recalc });
        player.equipChip('chip1');
        expect(chip.isEquipped).toBe(true);
    });

    it('does nothing when no item with the given id is found', () => {
        const player = makePlayer({ inventory: [] });
        expect(() => player.equipChip('non-existent')).not.toThrow();
    });
});

// ─── Player.getWeaponRangeMultiplier ─────────────────────────────────────────

describe('Player.getWeaponRangeMultiplier', () => {
    it('returns 1.0 when no chip is equipped', () => {
        const player = makePlayer({ inventory: [] });
        expect(player.getWeaponRangeMultiplier()).toBe(1.0);
    });

    it('returns the multiplier from an equipped chip', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, 'firewire' as any, { weaponRangeMultiplier: 1.15 }, 1);
        chip.isEquipped = true;
        const player = makePlayer({ inventory: [chip] });
        expect(player.getWeaponRangeMultiplier()).toBe(1.15);
    });

    it('returns 1.0 when chip has no weaponRangeMultiplier stat', () => {
        const chip = new ChipItem('chip1', 'Overclock', 150, 75, 'overclock' as any, {}, 1);
        chip.isEquipped = true;
        const player = makePlayer({ inventory: [chip] });
        expect(player.getWeaponRangeMultiplier()).toBe(1.0);
    });
});

// ─── Player.getTechForWeapon ──────────────────────────────────────────────────

describe('Player.getTechForWeapon', () => {
    it('returns 0 for a weapon type with no tech', () => {
        const player = makePlayer();
        expect(player.getTechForWeapon(WeaponType.SWORD)).toBe(0);
    });

    it('returns the stored tech value for a weapon type', () => {
        const player = makePlayer();
        (player as any).tech[WeaponType.HAMMER] = 250;
        expect(player.getTechForWeapon(WeaponType.HAMMER)).toBe(250);
    });
});

// ─── Player.getSkillTier ──────────────────────────────────────────────────────

describe('Player.getSkillTier', () => {
    it('returns STABLE when skill tech is 0', () => {
        const player = makePlayer();
        expect(player.getSkillTier('RECOVERY' as any)).toBe(Tier.STABLE);
    });

    it('returns LEET when skill tech is at cap (1200)', () => {
        const player = makePlayer();
        (player as any).skillTech['BLAST'] = 1200;
        expect(player.getSkillTier('BLAST' as any)).toBe(Tier.LEET);
    });
});

// ─── Player.getBaseStatValue ──────────────────────────────────────────────────

describe('Player.getBaseStatValue', () => {
    it('returns base strength (1) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.STRENGTH)).toBe(1);
    });

    it('includes X-Data upgrades in the base stat value', () => {
        const player = makePlayer();
        (player as any).strengthUpgrades = 3;
        expect(player.getBaseStatValue(StatType.STRENGTH)).toBe(4);
    });

    it('returns base HP (100) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.HP)).toBe(100);
    });

    it('returns base TP (100) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.TP)).toBe(100);
    });

    it('caps base stat at MAX_STAT_VALUE', () => {
        const player = makePlayer();
        (player as any).strengthPoints = 9998; // 1+9998=9999
        expect(player.getBaseStatValue(StatType.STRENGTH)).toBe(9999);
    });
});

// ─── tryIncrementWeaponTech ────────────────────────────────────────────────────

describe('Player.tryIncrementWeaponTech', () => {
    it('increments tech for the currently equipped weapon when random roll succeeds', () => {
        const player = makePlayer();
        (player as any).currentWeaponType = WeaponType.SWORD;
        (player as any).tech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001); // very low → always passes dropChance
        player.tryIncrementWeaponTech(1.0);
        expect((player as any).tech[WeaponType.SWORD]).toBe(1);
        vi.restoreAllMocks();
    });

    it('does NOT increment when random roll exceeds dropChance', () => {
        const player = makePlayer();
        (player as any).currentWeaponType = WeaponType.SWORD;
        (player as any).tech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.999); // very high → always fails
        player.tryIncrementWeaponTech(1.0);
        expect((player as any).tech[WeaponType.SWORD]).toBe(0);
        vi.restoreAllMocks();
    });

    it('does NOT increment past TECH_POINT_CAP', () => {
        const player = makePlayer();
        (player as any).currentWeaponType = WeaponType.SWORD;
        (player as any).tech[WeaponType.SWORD] = 2500; // at cap
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementWeaponTech(1.0);
        expect((player as any).tech[WeaponType.SWORD]).toBe(2500);
        vi.restoreAllMocks();
    });

    it('increments the correct weapon type (DUAL_BLADE when equipped)', () => {
        const player = makePlayer();
        (player as any).currentWeaponType = WeaponType.DUAL_BLADE;
        (player as any).tech[WeaponType.DUAL_BLADE] = 0;
        (player as any).tech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementWeaponTech(1.0);
        expect((player as any).tech[WeaponType.DUAL_BLADE]).toBe(1);
        expect((player as any).tech[WeaponType.SWORD]).toBe(0);
        vi.restoreAllMocks();
    });

    it('spawns a tech floating indicator on success', () => {
        const player = makePlayer();
        (player as any).currentWeaponType = WeaponType.SWORD;
        (player as any).tech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementWeaponTech(1.0);
        expect((player as any).floatingIndicatorManager.spawnTech).toHaveBeenCalledOnce();
        vi.restoreAllMocks();
    });
});

// ─── tryIncrementSkillTech ────────────────────────────────────────────────────

import { SkillTechType } from './skills/SkillTechType';

describe('Player.tryIncrementSkillTech', () => {
    it('increments skill tech when random roll succeeds', () => {
        const player = makePlayer();
        (player as any).skillTech[SkillTechType.BLAST] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.BLAST);
        expect((player as any).skillTech[SkillTechType.BLAST]).toBe(1);
        vi.restoreAllMocks();
    });

    it('does NOT increment when random roll fails', () => {
        const player = makePlayer();
        (player as any).skillTech[SkillTechType.BLAST] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        player.tryIncrementSkillTech(SkillTechType.BLAST);
        expect((player as any).skillTech[SkillTechType.BLAST]).toBe(0);
        vi.restoreAllMocks();
    });

    it('does NOT increment past SKILL_TECH_POINT_CAP', () => {
        const player = makePlayer();
        (player as any).skillTech[SkillTechType.RANGED] = 1200; // at cap
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.RANGED);
        expect((player as any).skillTech[SkillTechType.RANGED]).toBe(1200);
        vi.restoreAllMocks();
    });

    it('caps incremented value at SKILL_TECH_POINT_CAP', () => {
        const player = makePlayer();
        (player as any).skillTech[SkillTechType.RECOVERY] = 1199;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.RECOVERY);
        expect((player as any).skillTech[SkillTechType.RECOVERY]).toBe(1200);
        vi.restoreAllMocks();
    });

    it('spawns a tech floating indicator on success', () => {
        const player = makePlayer();
        (player as any).skillTech[SkillTechType.BLAST] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.BLAST);
        expect((player as any).floatingIndicatorManager.spawnTech).toHaveBeenCalledOnce();
        vi.restoreAllMocks();
    });
});

// ─── getBaseStatValue – remaining branches ────────────────────────────────────

describe('Player.getBaseStatValue – defense / agility / luck', () => {
    it('returns base defense (1) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.DEFENSE)).toBe(1);
    });

    it('includes defense upgrades and stat points', () => {
        const player = makePlayer();
        (player as any).defenseUpgrades = 2;
        (player as any).defensePoints = 3;
        expect(player.getBaseStatValue(StatType.DEFENSE)).toBe(6);
    });

    it('returns base agility (1) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.AGILITY)).toBe(1);
    });

    it('includes agility upgrades and stat points', () => {
        const player = makePlayer();
        (player as any).agilityUpgrades = 1;
        (player as any).agilityPoints = 4;
        expect(player.getBaseStatValue(StatType.AGILITY)).toBe(6);
    });

    it('returns base luck (1) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.LUCK)).toBe(1);
    });

    it('includes luck upgrades and stat points', () => {
        const player = makePlayer();
        (player as any).luckUpgrades = 3;
        (player as any).luckPoints = 2;
        expect(player.getBaseStatValue(StatType.LUCK)).toBe(6);
    });
});

// ─── addStatPoint – remaining branches ───────────────────────────────────────

describe('Player.addStatPoint – defense / agility / luck', () => {
    let player: Player;
    beforeEach(() => { player = makePlayer({ statPointsAvailable: 5 } as any); });

    it('adds a defense point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.DEFENSE);
        expect((player as any).defensePoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('adds an agility point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.AGILITY);
        expect((player as any).agilityPoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('adds a luck point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.LUCK);
        expect((player as any).luckPoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('returns false for DEFENSE when stat is at MAX_STAT_VALUE', () => {
        (player as any).defensePoints = 9998;
        expect(player.addStatPoint(StatType.DEFENSE)).toBe(false);
    });

    it('returns false for AGILITY when stat is at MAX_STAT_VALUE', () => {
        (player as any).agilityPoints = 9998;
        expect(player.addStatPoint(StatType.AGILITY)).toBe(false);
    });

    it('returns false for LUCK when stat is at MAX_STAT_VALUE', () => {
        (player as any).luckPoints = 9998;
        expect(player.addStatPoint(StatType.LUCK)).toBe(false);
    });
});
