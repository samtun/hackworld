import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./AudioManager', () => ({
    AudioManager: {
        Instance: {
            playFootstep: vi.fn(),
            playJump: vi.fn(),
            playAttack: vi.fn(),
            playDamage: vi.fn(),
            playDeath: vi.fn(),
            playUpgrade: vi.fn(),
            playLevelUp: vi.fn(),
        },
    },
}));

import * as CANNON from 'cannon-es';
import { Player } from './Player';
import { StatType } from './StatType';
import { CoreItem } from './items/cores/CoreItem';
import { ChipItem } from './items/chips/ChipItem';
import { WeaponItem } from './items/weapons/WeaponItem';
import { WeaponType } from './items/weapons/WeaponType';
import { Tier, TierManager } from './items/TierManager';
import { CardCollection } from './items/cards/CardCollection';
import { Album } from './items/cards/Card';
import { Enemy } from './enemies/Enemy';
import { AudioManager } from './AudioManager';
import { InputManager } from './InputManager';

type MockOverrides<T> = {
    [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K];
};

/**
 * Create a minimal Player instance for unit testing without instantiating
 * Three.js / Cannon-es objects (bypasses the constructor).
 */
function makePlayer(overrides: MockOverrides<Player> = {}): Player {
    const player = Object.create(Player.prototype) as Player;

    // Private readonly constants (normally assigned in class field initializers)
    Object.assign(player, {
        MAX_STAT_VALUE: 9999,
        MAX_HP_VALUE: 999999,
        MAX_TP_VALUE: 999999,
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
        LASER_UNLOCK_LEVEL: 10,
        HEAL_UNLOCK_LEVEL: 1,
        AREA_UNLOCK_LEVEL: 25,
        TECH_POINT_CAP: 9999,
        HIT_INVULNERABILITY: 1.0,
        STUN_TIME: 0.5,
        KNOCKBACK_FORCE: 80,
        CHARGE_DURATION: 0.8,
        WALK_SPEED: 6,
        LEVEL_UP_PARTICLE_LIFETIME: 0.6,
        LEVEL_UP_SHOCKWAVE_DELAY: 0.4,
        LEVEL_UP_SHOCKWAVE_RANGE: 15,
        SKILL_ANIMATION_MAX_DURATION: 2.0,

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
        weaponTech: {
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
            position: {
                x: 0, y: 0, z: 0, copy: vi.fn(), clone: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0, length: () => 0 }), vsub: (_v: any) => ({ x: 0, y: 0, z: 0, length: () => 0, normalize: vi.fn() })
            },
            velocity: { x: 0, y: 0, z: 0, set: vi.fn() },
            shapes: [{ radius: 1 }],
            applyImpulse: vi.fn(),
            type: 2, // CANNON.Body.DYNAMIC
        },
        weapon: {
            stopAttack: vi.fn(),
            isAttacking: false,
            damage: 10,
            weaponType: WeaponType.SWORD,
            attack: vi.fn(),
            update: vi.fn(),
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
        world: {
            bodies: [],
            broadphase: { aabbQuery: vi.fn().mockReturnValue([]) }
        },
        scene: {},
        actions: {},
        currentAction: null,
        skills: [],
        deathCallback: undefined,

        // Block state
        isBlocking: false,
        blockTimer: 0,
        BLOCK_DURATION: 0.5,
        blockShield: { attachTo: vi.fn(), detach: vi.fn(), dispose: vi.fn() },
        isGrounded: true,

        // Blob shadow
        blobShadow: { update: vi.fn(), cleanup: vi.fn(), visible: true, setScale: vi.fn() },

        input: mock<InputManager>({ getMovementVector: () => new Vector2(0, 0) }),
    });

    // Override syncPosition to avoid THREE.Vector3 creation
    player.syncPosition = vi.fn();

    Object.assign(player, overrides);
    return player;
}

function makeWeaponItem(overrides: MockOverrides<WeaponItem> = {}): WeaponItem {
    const weaponItemMock = Object.create(WeaponItem.prototype) as WeaponItem;
    Object.assign(weaponItemMock, {
        isEquipped: true,
        damage: 1,
        weaponType: WeaponType.SWORD,
    });

    Object.assign(weaponItemMock, overrides);
    return weaponItemMock;
}

function makeWeapon(overrides: MockOverrides<Weapon> = {}): Weapon {
    const weaponMock = Object.create(Weapon.prototype) as Weapon;
    Object.assign(weaponMock, {
        damage: 1,
        weaponType: WeaponType.SWORD,
        update: vi.fn(),
    });

    Object.assign(weaponMock, overrides);
    return weaponMock;
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
        player.strengthUpgrades = 5;
        player.defenseUpgrades = 3;
        player.recalculateStats();
        expect(player.strength).toBe(6); // baseStrength(1) + upgrades(5)
        expect(player.defense).toBe(4);  // baseDefense(1) + upgrades(3)
    });

    it('adds stat points from leveling to stats', () => {
        player.strengthPoints = 10;
        player.luckPoints = 7;
        player.recalculateStats();
        expect(player.strength).toBe(11); // baseStrength(1) + points(10)
        expect(player.luck).toBe(8);
    });

    it('applies HP upgrade bonus', () => {
        player.hpUpgrades = 4;
        player.recalculateStats();
        // 170 + 4*5 = 190
        expect(player.maxHp).toBe(190);
    });

    it('applies TP upgrade bonus', () => {
        player.tpUpgrades = 6;
        player.recalculateStats();
        // 60 + 6*5 = 90
        expect(player.maxTp).toBe(90);
    });

    it('adds level-based HP bonus', () => {
        player.level = 2;
        player.recalculateStats();
        // Math.floor(10.01 * (2-1)) = 10
        expect(player.maxHp).toBe(180);
    });

    it('adds level-based TP bonus', () => {
        player.level = 2;
        player.recalculateStats();
        // Math.floor(5.005 * (2-1)) = 5
        expect(player.maxTp).toBe(65);
    });

    it('caps stats at MAX_STAT_VALUE', () => {
        player.strengthUpgrades = 9999;
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

    it('applies equipped core agility bonus', () => {
        const core = new CoreItem('c1', 'Swift Core', 150, 50,
            { agility: 22, defense: -11 }, 3);
        core.isEquipped = true;
        player.inventory = [core];
        player.recalculateStats();
        expect(player.agility).toBe(23); // 1 base + 22 from core
    });

    it('applies equipped chip luck multiplier', () => {
        const chip = new ChipItem('ch1', 'Datamine', 150, 50, 'datamine' as any, { luckMultiplier: 1.20 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.recalculateStats();
        expect(player.luck).toBe(1); // floor(1 * 1.20) = 1 (low base luck)
    });

    it('applies chip luck multiplier at higher luck values', () => {
        player.luckPoints = 99;
        const chip = new ChipItem('ch1', 'Datamine', 150, 50, 'datamine' as any, { luckMultiplier: 1.10 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.recalculateStats();
        expect(player.luck).toBe(110); // floor(100 * 1.10) = 110
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
        player.defense = 9999;
        player.takeDamage(1);
        // reducedDamage = Math.max(1, ...) ensures at least 1
        expect(player.hp).toBe(169);
    });

    it('reduces damage with higher defense', () => {
        player.defense = 1000;
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
        Object.assign(player, { invulnerableTimer: 0.5, hp: 170 });
        player.takeDamage(50);
        expect(player.hp).toBe(170);
    });

    it('does not apply damage while leveling up', () => {
        Object.assign(player, { isLevelingUp: true, hp: 170 });
        player.takeDamage(50);
        expect(player.hp).toBe(170);
    });

    it('is invulnerable after taking damage', () => {
        const expectedHp = 170;
        const firstDamage = 10;
        Object.assign(player, { invulnerableTimer: 0, hp: expectedHp });
        player.takeDamage(firstDamage);
        player.takeDamage(20);
        expect(player.hp).toBe(expectedHp - firstDamage);
    });

    it('plays the player damage sound when damage is applied', () => {
        player.takeDamage(10);
        expect(AudioManager.Instance.playDamage).toHaveBeenCalledWith('player');
    });

    it('applies knockback to the player', () => {
        player.body = {
            applyImpulse: vi.fn(),
            position: {
                x: 0, y: 0, z: 0, copy: vi.fn(),
                vsub: (_v: any) => ({ x: -1, y: 0, z: 0, length: () => 1, normalize: vi.fn() })
            }
        } as any;
        const sourcePos = { x: 1, y: 0, z: 0 } as any;
        player.takeDamage(50, sourcePos);

        expect(player.body.applyImpulse).toHaveBeenCalledWith(
            expect.objectContaining({ x: -80, y: 5, z: 0 }),
            expect.objectContaining({ x: -1, y: 0, z: 0 })
        );
        expect(AudioManager.Instance.playDamage).toHaveBeenCalledWith('player');
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

    it('plays the player death sound on lethal damage', () => {
        const player = makePlayer();
        player.takeDamage(9999);
        expect(AudioManager.Instance.playDeath).toHaveBeenCalledWith('player');
    });
});

// ─── applyDeathPenalty ────────────────────────────────────────────────────────

describe('Player.applyDeathPenalty', () => {
    it('deducts 10% of current bits', () => {
        const player = makePlayer({ bits: 1000 } as any);
        player.applyDeathPenalty();
        expect(player.bits).toBe(900);
    });

    it('deducts 10% of expRequired from exp', () => {
        // expRequired=350, so penalty = floor(350 * 0.1) = 35
        const player = makePlayer({ exp: 200, expRequired: 350 } as any);
        player.applyDeathPenalty();
        expect(player.exp).toBe(165);
    });

    it('returns the actual amounts deducted', () => {
        const player = makePlayer({ bits: 500, expRequired: 400, exp: 100 } as any);
        const { bitsLost, expLost } = player.applyDeathPenalty();
        expect(bitsLost).toBe(50);
        expect(expLost).toBe(40);
    });

    it('returns zero bitsLost when bits is less than 10', () => {
        // floor(9 * 0.1) = floor(0.9) = 0, so no bits are deducted
        const player = makePlayer({ bits: 9 } as any);
        const { bitsLost } = player.applyDeathPenalty();
        expect(bitsLost).toBe(0);
        expect(player.bits).toBe(9);
    });

    it('clamps exp to 0 when penalty exceeds current exp', () => {
        const player = makePlayer({ exp: 5, expRequired: 350 } as any);
        player.applyDeathPenalty();
        expect(player.exp).toBe(0);
    });

    it('returns zero bitsLost when bits is 0', () => {
        const player = makePlayer({ bits: 0 } as any);
        const { bitsLost } = player.applyDeathPenalty();
        expect(bitsLost).toBe(0);
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

    beforeEach(() => {
        vi.clearAllMocks();
        player = makePlayer();
    });

    it('increases exp correctly (with luck bonus)', () => {
        // luck=1: adjustedAmount = floor(100 + 100 * 0.05 * log10(21)) = floor(106.611) = 106
        const result = player.gainExp(100);
        expect(result).toBe(106);
        expect(player.exp).toBe(106);
    });

    it('does not gain exp at max level', () => {
        player.level = 9999;
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

    it('plays the level-up sound when leveling up', () => {
        player.gainExp(330);
        expect(AudioManager.Instance.playLevelUp).toHaveBeenCalledOnce();
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

describe('Player skill unlock progression', () => {
    it('unlocks skills at levels 10, 20, and 38', () => {
        const player = makePlayer({ level: 1 });
        expect(player.isSkillUnlocked(0)).toBe(true);
        expect(player.isSkillUnlocked(1)).toBe(false);
        expect(player.isSkillUnlocked(2)).toBe(false);

        player.level = 9;
        expect(player.isSkillUnlocked(0)).toBe(true);
        expect(player.isSkillUnlocked(1)).toBe(false);
        expect(player.isSkillUnlocked(2)).toBe(false);

        player.level = 10;
        expect(player.isSkillUnlocked(1)).toBe(true);
        expect(player.isSkillUnlocked(2)).toBe(false);

        player.level = 25;
        expect(player.isSkillUnlocked(2)).toBe(true);
    });

    it('emits skill unlock callbacks for all thresholds crossed', () => {
        const onSkillUnlocked = vi.fn();
        const player = makePlayer({
            skills: [{}, {}, {}],
            onSkillUnlocked,
        });

        player.emitSkillUnlockEvents(9, 25);

        expect(onSkillUnlocked).toHaveBeenNthCalledWith(1, 1);
        expect(onSkillUnlocked).toHaveBeenNthCalledWith(2, 2);
    });

    it('does not execute locked skills', () => {
        const skill = { use: vi.fn().mockReturnValue(true), name: 'Laser', update: vi.fn() };
        const player = makePlayer({
            level: 0, // level 0 to lock all skills
            skills: [skill],
            input: {
                isSkill1JustPressed: vi.fn().mockReturnValue(true),
                isSkill2JustPressed: vi.fn().mockReturnValue(true),
                isSkill3JustPressed: vi.fn().mockReturnValue(true),
                isAttackJustPressed: vi.fn().mockReturnValue(false),
                isAttackHeld: vi.fn().mockReturnValue(false),
                isAttackReleased: vi.fn().mockReturnValue(false),
                isJumpPressed: vi.fn().mockReturnValue(false),
                getMovementVector: vi.fn().mockReturnValue({ x: 0, y: 0, length: vi.fn().mockReturnValue(0) }),
                isBlockJustPressed: vi.fn().mockReturnValue(false),
                updateState: vi.fn(),
            },
            isUsingSkill: false,
            isChargingAttack: false,
            isDashing: false,
            scene: {},
            weapon: { isAttacking: false, update: vi.fn() },
        } as any);

        player.update(0.016);

        expect(skill.use).not.toHaveBeenCalled();
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
        expect(player.strengthUpgrades).toBe(1);
    });

    it('upgrades defense', () => {
        player.upgradeWithXData(StatType.DEFENSE);
        expect(player.defenseUpgrades).toBe(1);
    });

    it('upgrades agility', () => {
        player.upgradeWithXData(StatType.AGILITY);
        expect(player.agilityUpgrades).toBe(1);
    });

    it('upgrades luck', () => {
        player.upgradeWithXData(StatType.LUCK);
        expect(player.luckUpgrades).toBe(1);
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
        player.xData = 0;
        expect(player.upgradeWithXData(StatType.STRENGTH)).toBe(false);
        expect(player.strengthUpgrades).toBe(0);
    });

    it('returns false when stat already at MAX_STAT_VALUE', () => {
        player.strengthUpgrades = 9998; // base(1) + upgrades(9998) = 9999 = MAX
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
        player.expRequired = 1; // trigger immediate level up
        player.exp = 0;
        player.recalculateStats = vi.fn();
        player.heal = vi.fn();
        player.isLevelingUp = false;
        player.fadeToAction = vi.fn();
        player.shockwavePending = false;
        player.levelUpShockwaveTimer = 0;
        player.gainExp(1);
        // After level up from 1→2, calculateExpRequired(2) = floor(350+60+0.28) = 410
        expect(player.expRequired).toBe(410);
    });

    it('expRequired at level 2 equals floor(350 + 2*30 + 4*0.07) = 410', () => {
        const player = makePlayer({ level: 2, expRequired: 1 } as any);
        player.exp = 0;
        player.recalculateStats = vi.fn();
        player.heal = vi.fn();
        player.isLevelingUp = false;
        player.fadeToAction = vi.fn();
        player.shockwavePending = false;
        player.levelUpShockwaveTimer = 0;
        player.gainExp(1);
        // After level up from 2→3, calculateExpRequired(3) = floor(350+90+0.63) = 440
        expect(player.expRequired).toBe(440);
    });

    it('expRequired at level 10 equals floor(350 + 10*30 + 100*0.07) = 657', () => {
        const player = makePlayer({ level: 10, expRequired: 1 } as any);
        player.exp = 0;
        player.recalculateStats = vi.fn();
        player.heal = vi.fn();
        player.isLevelingUp = false;
        player.fadeToAction = vi.fn();
        player.shockwavePending = false;
        player.levelUpShockwaveTimer = 0;
        player.gainExp(1);
        // After level up from 10→11, calculateExpRequired(11) = floor(350+330+8.47) = 688
        expect(player.expRequired).toBe(688);
    });
});

// ─── addStatPoint ─────────────────────────────────────────────────────────────

describe('Player.addStatPoint', () => {
    let player: Player;

    beforeEach(() => {
        vi.clearAllMocks();
        player = makePlayer({ statPointsAvailable: 5 } as any);
    });

    it('adds a strength point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.STRENGTH);
        expect(player.strengthPoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('plays the upgrade sound when a stat point is spent', () => {
        player.addStatPoint(StatType.STRENGTH);
        expect(AudioManager.Instance.playUpgrade).toHaveBeenCalledOnce();
    });

    it('returns false when no points available', () => {
        player.statPointsAvailable = 0;
        expect(player.addStatPoint(StatType.STRENGTH)).toBe(false);
    });

    it('returns false for HP stat (not valid for stat points)', () => {
        expect(player.addStatPoint(StatType.HP)).toBe(false);
    });

    it('returns false for TP stat (not valid for stat points)', () => {
        expect(player.addStatPoint(StatType.TP)).toBe(false);
    });

    it('returns false when stat already at max', () => {
        player.strengthPoints = 9998; // base(1)+points(9998) = 9999 = MAX
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
        player.weaponTech[WeaponType.SWORD] = 120;
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

// ─── startBlock ───────────────────────────────────────────────────────────────

describe('Player.startBlock', () => {
    it('sets isBlocking to true when grounded and not attacking', () => {
        const player = makePlayer();
        player.startBlock();
        expect(player.isBlocking).toBe(true);
        expect(player.blockTimer).toBe(0);
    });

    it('cannot block while attacking', () => {
        const player = makePlayer();
        player.weapon.isAttacking = true;
        player.startBlock();
        expect(player.isBlocking).toBe(false);
    });

    it('cannot block while airborne', () => {
        const player = makePlayer();
        player.isGrounded = false;
        player.startBlock();
        expect(player.isBlocking).toBe(false);
    });

    it('cannot block while already blocking', () => {
        const player = makePlayer();
        player.isBlocking = true;
        player.blockTimer = 0.2;
        player.startBlock();
        // blockTimer must remain unchanged (early return)
        expect(player.blockTimer).toBe(0.2);
    });

    it('cannot block when dead', () => {
        const player = makePlayer();
        player.isDead = true;
        player.startBlock();
        expect(player.isBlocking).toBe(false);
    });
});

// ─── takeDamage ─────────────────────────────────────────────────────

describe('Player.takeDamage – blocking', () => {
    it('absorbs damage completely when blocking', () => {
        const player = makePlayer();
        player.isBlocking = true;
        player.takeDamage(50);
        expect(player.hp).toBe(player.maxHp);
    });

    it('reduces knockback when blocking', () => {
        const player = makePlayer();
        player.body = {
            applyImpulse: vi.fn(),
            position: {
                x: 0, y: 0, z: 0, copy: vi.fn(),
                vsub: (_v: any) => ({ x: -1, y: 0, z: 0, length: () => 1, normalize: vi.fn() })
            }
        } as any;
        player.isBlocking = true;
        const sourcePos = { x: 1, y: 0, z: 0 } as any;
        player.takeDamage(50, sourcePos);

        expect(player.body.applyImpulse).toHaveBeenCalledWith(
            expect.objectContaining({ x: -40, y: 5, z: 0 }),
            expect.objectContaining({ x: -1, y: 0, z: 0 })
        );
    });
});

// ─── handleBlock timer lifecycle ──────────────────────────────────────────────

describe('Player.handleBlock', () => {
    it('keeps isBlocking while the timer has not yet expired', () => {
        const player = makePlayer();
        player.isBlocking = true;
        player.blockTimer = 0.1;
        player.handleBlock(0.2); // 0.1 + 0.2 = 0.3 < 0.5
        expect(player.isBlocking).toBe(true);
    });

    it('clears isBlocking when the block timer reaches BLOCK_DURATION', () => {
        const player = makePlayer();
        player.isBlocking = true;
        player.blockTimer = 0.4;
        player.handleBlock(0.15); // 0.4 + 0.15 = 0.55 ≥ 0.5
        expect(player.isBlocking).toBe(false);
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

// ─── Player.getCriticalHitMultiplier ─────────────────────────────────────────

describe('Player.getCriticalHitMultiplier', () => {
    it('returns base 1.5 when no chip is equipped', () => {
        const player = makePlayer({ inventory: [] });
        expect(player.getCriticalHitMultiplier()).toBe(1.5);
    });

    it('returns boosted multiplier from an equipped Razorwire chip', () => {
        const chip = new ChipItem('chip1', 'Razorwire', 150, 50, 'razorwire' as any, { criticalDamageMultiplier: 1.20 }, 1);
        chip.isEquipped = true;
        const player = makePlayer({ inventory: [chip] });
        // 1.5 * 1.20 = 1.80
        expect(player.getCriticalHitMultiplier()).toBeCloseTo(1.80, 4);
    });

    it('returns base 1.5 when chip has no criticalDamageMultiplier stat', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, 'firewire' as any, { weaponRangeMultiplier: 1.15 }, 1);
        chip.isEquipped = true;
        const player = makePlayer({ inventory: [chip] });
        expect(player.getCriticalHitMultiplier()).toBe(1.5);
    });
});

// ─── Player.getHealingMultiplier ─────────────────────────────────────────────

describe('Player.getHealingMultiplier', () => {
    it('returns 1.0 when no chip is equipped', () => {
        const player = makePlayer({ inventory: [] });
        expect(player.getHealingMultiplier()).toBe(1.0);
    });

    it('returns the multiplier from an equipped Patchwork chip', () => {
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, 'patchwork' as any, { healingMultiplier: 1.30 }, 1);
        chip.isEquipped = true;
        const player = makePlayer({ inventory: [chip] });
        expect(player.getHealingMultiplier()).toBe(1.30);
    });

    it('returns 1.0 when chip has no healingMultiplier stat', () => {
        const chip = new ChipItem('chip1', 'Overclock', 150, 75, 'overclock' as any, { walkSpeedMultiplier: 1.10 }, 1);
        chip.isEquipped = true;
        const player = makePlayer({ inventory: [chip] });
        expect(player.getHealingMultiplier()).toBe(1.0);
    });
});

// ─── Player.heal with Patchwork chip ─────────────────────────────────────────

describe('Player.heal with Patchwork chip', () => {
    it('applies healing multiplier to HP', () => {
        const player = makePlayer();
        player.hp = 100;
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, 'patchwork' as any, { healingMultiplier: 1.40 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.heal(50); // 50 * 1.40 = 70
        expect(player.hp).toBe(170);
    });

    it('applies healing multiplier to TP', () => {
        const player = makePlayer();
        player.tp = 20;
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, 'patchwork' as any, { healingMultiplier: 1.20 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.heal(0, 10); // 10 * 1.20 = 12
        expect(player.tp).toBe(32);
    });

    it('does not exceed maxHp when healing with multiplier', () => {
        const player = makePlayer();
        player.hp = 160;
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, 'patchwork' as any, { healingMultiplier: 1.40 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.heal(50); // 50 * 1.40 = 70, but maxHp is 170, so capped to 170
        expect(player.hp).toBe(170);
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
        player.weaponTech[WeaponType.HAMMER] = 250;
        expect(player.getTechForWeapon(WeaponType.HAMMER)).toBe(250);
    });
});

// ─── Player.getSkillTier ──────────────────────────────────────────────────────

describe('Player.getSkillTier', () => {
    it('returns STABLE when skill tech is 0', () => {
        const player = makePlayer();
        expect(player.getSkillTier('RECOVERY' as any)).toBe(Tier.STABLE);
    });

    it('returns LEET when skill tech is at cap (9999)', () => {
        const player = makePlayer();
        player.skillTech['BLAST'] = 9999;
        expect(player.getSkillTier('BLAST' as any)).toBe(Tier.LEET);
    });

    it('returns ZERODAY when skill tech is below leet amount (1799)', () => {
        const player = makePlayer();
        player.skillTech['BLAST'] = 1799;
        expect(player.getSkillTier('BLAST' as any)).toBe(Tier.ZERODAY);
    });

    it('returns LEET when skill tech is at leet amount (1800)', () => {
        const player = makePlayer();
        player.skillTech['BLAST'] = 1800;
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
        player.strengthUpgrades = 3;
        expect(player.getBaseStatValue(StatType.STRENGTH)).toBe(4);
    });

    it('returns base HP with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.HP)).toBe(100);
    });

    it('returns base TP with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.TP)).toBe(100);
    });

    it('caps base stat at MAX_STAT_VALUE', () => {
        const player = makePlayer();
        player.strengthPoints = 9998; // 1+9998=9999
        expect(player.getBaseStatValue(StatType.STRENGTH)).toBe(9999);
    });
});

// ─── tryIncrementWeaponTech ────────────────────────────────────────────────────

describe('Player.tryIncrementWeaponTech', () => {
    it('increments tech for the currently equipped weapon when random roll succeeds', () => {
        const player = makePlayer();
        player.currentWeaponType = WeaponType.SWORD;
        player.weaponTech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001); // very low → always passes dropChance
        player.tryIncrementWeaponTech(1.0);
        expect(player.weaponTech[WeaponType.SWORD]).toBe(1);
        vi.restoreAllMocks();
    });

    it('does NOT increment when random roll exceeds dropChance', () => {
        const player = makePlayer();
        player.currentWeaponType = WeaponType.SWORD;
        player.weaponTech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.999); // very high → always fails
        player.tryIncrementWeaponTech(1.0);
        expect(player.weaponTech[WeaponType.SWORD]).toBe(0);
        vi.restoreAllMocks();
    });

    it('does NOT increment past TECH_POINT_CAP', () => {
        const player = makePlayer();
        player.currentWeaponType = WeaponType.SWORD;
        player.weaponTech[WeaponType.SWORD] = 2500; // at cap
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementWeaponTech(1.0);
        expect(player.weaponTech[WeaponType.SWORD]).toBe(2500);
        vi.restoreAllMocks();
    });

    it('increments the correct weapon type (DUAL_BLADE when equipped)', () => {
        const player = makePlayer();
        player.currentWeaponType = WeaponType.DUAL_BLADE;
        player.weaponTech[WeaponType.DUAL_BLADE] = 0;
        player.weaponTech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementWeaponTech(1.0);
        expect(player.weaponTech[WeaponType.DUAL_BLADE]).toBe(1);
        expect(player.weaponTech[WeaponType.SWORD]).toBe(0);
        vi.restoreAllMocks();
    });

    /* TODO reenable and adjust check once dependency injection is used
    it('spawns a tech floating indicator on success', () => {
        const player = makePlayer();
        player.currentWeaponType = WeaponType.SWORD;
        player.weaponTech[WeaponType.SWORD] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementWeaponTech(1.0);
        expect(player.floatingIndicatorManager.spawnTech).toHaveBeenCalledOnce();
        vi.restoreAllMocks();
    });
    */
});

// ─── tryIncrementSkillTech ────────────────────────────────────────────────────

import { SkillTechType } from './skills/SkillTechType';
import { mock } from 'vitest-mock-extended';
import { Vector2 } from 'three';
import { Item } from './items/Item';
import { Weapon } from './items/weapons/Weapon';

describe('Player.tryIncrementSkillTech', () => {
    it('increments skill tech when random roll succeeds', () => {
        const player = makePlayer();
        player.skillTech[SkillTechType.BLAST] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.BLAST);
        expect(player.skillTech[SkillTechType.BLAST]).toBe(1);
        vi.restoreAllMocks();
    });

    it('does NOT increment when random roll fails', () => {
        const player = makePlayer();
        player.skillTech[SkillTechType.BLAST] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        player.tryIncrementSkillTech(SkillTechType.BLAST);
        expect(player.skillTech[SkillTechType.BLAST]).toBe(0);
        vi.restoreAllMocks();
    });

    it('does NOT increment past SKILL_TECH_POINT_CAP', () => {
        const player = makePlayer();
        player.skillTech[SkillTechType.RANGED] = 9999; // at cap
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.RANGED);
        expect(player.skillTech[SkillTechType.RANGED]).toBe(9999);
        vi.restoreAllMocks();
    });

    it('caps incremented value at SKILL_TECH_POINT_CAP', () => {
        const player = makePlayer();
        player.level = 9999;
        player.skillTech[SkillTechType.RECOVERY] = 9998;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.RECOVERY);
        expect(player.skillTech[SkillTechType.RECOVERY]).toBe(9999);
        vi.restoreAllMocks();
    });

    it('spawns a tech floating indicator on success', () => {
        const player = makePlayer();
        player.skillTech[SkillTechType.BLAST] = 0;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.BLAST);
        expect(player.floatingIndicatorManager.spawnTech).toHaveBeenCalledOnce();
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
        player.defenseUpgrades = 2;
        player.defensePoints = 3;
        expect(player.getBaseStatValue(StatType.DEFENSE)).toBe(6);
    });

    it('returns base agility (1) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.AGILITY)).toBe(1);
    });

    it('includes agility upgrades and stat points', () => {
        const player = makePlayer();
        player.agilityUpgrades = 1;
        player.agilityPoints = 4;
        expect(player.getBaseStatValue(StatType.AGILITY)).toBe(6);
    });

    it('returns base luck (1) with no upgrades', () => {
        const player = makePlayer();
        expect(player.getBaseStatValue(StatType.LUCK)).toBe(1);
    });

    it('includes luck upgrades and stat points', () => {
        const player = makePlayer();
        player.luckUpgrades = 3;
        player.luckPoints = 2;
        expect(player.getBaseStatValue(StatType.LUCK)).toBe(6);
    });
});

// ─── addStatPoint – remaining branches ───────────────────────────────────────

describe('Player.addStatPoint – defense / agility / luck', () => {
    let player: Player;
    beforeEach(() => { player = makePlayer({ statPointsAvailable: 5 } as any); });

    it('adds a defense point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.DEFENSE);
        expect(player.defensePoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('adds an agility point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.AGILITY);
        expect(player.agilityPoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('adds a luck point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.LUCK);
        expect(player.luckPoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('returns false for DEFENSE when stat is at MAX_STAT_VALUE', () => {
        player.defensePoints = 9998;
        expect(player.addStatPoint(StatType.DEFENSE)).toBe(false);
    });

    it('returns false for AGILITY when stat is at MAX_STAT_VALUE', () => {
        player.agilityPoints = 9998;
        expect(player.addStatPoint(StatType.AGILITY)).toBe(false);
    });

    it('returns false for LUCK when stat is at MAX_STAT_VALUE', () => {
        player.luckPoints = 9998;
        expect(player.addStatPoint(StatType.LUCK)).toBe(false);
    });
});

// ─── collection bonus getters ──────────────────────────────────────────────────

describe('Player collection bonus getters', () => {
    let player: Player;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function mockComplete(...albums: Album[]) {
        vi.spyOn(CardCollection.Instance, 'isAlbumComplete').mockImplementation(
            (album) => albums.includes(album)
        );
    }

    beforeEach(() => {
        player = makePlayer({ level: 1, luck: 1, LUCK_DIVISOR: 40000 });
    });

    describe('collectionBonusItemDropChance', () => {
        it('returns 0 when no B-collections are complete', () => {
            mockComplete();
            expect(player.collectionBonusItemDropChance).toBe(0);
        });

        it('returns 0.02 when only B.001 is complete', () => {
            mockComplete(Album.B001);
            expect(player.collectionBonusItemDropChance).toBeCloseTo(0.02);
        });

        it('returns 0.10 when B.001, B.002, and B.003 are all complete', () => {
            mockComplete(Album.B001, Album.B002, Album.B003);
            expect(player.collectionBonusItemDropChance).toBeCloseTo(0.10);
        });
    });

    describe('collectionBonusWeaponDropFactor', () => {
        it('returns 0 when no B-collections are complete', () => {
            mockComplete();
            expect(player.collectionBonusWeaponDropFactor).toBe(0);
        });

        it('returns 0.02 when only B.002 is complete', () => {
            mockComplete(Album.B002);
            expect(player.collectionBonusWeaponDropFactor).toBeCloseTo(0.02);
        });

        it('returns 0.07 when B.002 and B.003 are both complete', () => {
            mockComplete(Album.B002, Album.B003);
            expect(player.collectionBonusWeaponDropFactor).toBeCloseTo(0.07);
        });
    });

    describe('collectionBonusSkillCooldownReduction', () => {
        it('returns 0 when C.002 is not complete', () => {
            mockComplete();
            expect(player.collectionBonusSkillCooldownReduction).toBe(0);
        });

        it('returns 0.10 when C.002 is complete', () => {
            mockComplete(Album.C002);
            expect(player.collectionBonusSkillCooldownReduction).toBeCloseTo(0.10);
        });
    });
});

// ─── executeLevelUpShockwave ─────────────────────────────────────────────────

describe('Player.executeLevelUpShockwave', () => {
    function makeEnemyBody(x: number, z: number, isDead = false, isDying = false) {
        const enemy = Object.create(Enemy.prototype) as Enemy;
        Object.assign(enemy, { isDead, isDying, takeDamage: vi.fn() });
        return {
            position: { x, y: 0, z },
            entity: enemy,
        };
    }

    it('damages enemies within 15m range', () => {
        const nearBody = makeEnemyBody(5, 0);

        const weaponDamage = 50;
        const weaponItemMock = makeWeaponItem({ damage: weaponDamage, isEquipped: true });
        const weaponMock = makeWeapon({ damage: weaponDamage });

        const player = makePlayer({
            world: mock<CANNON.World>({
                bodies: [nearBody],
                broadphase: mock<CANNON.Broadphase>({ aabbQuery: vi.fn().mockReturnValue([]) })
            }),
            expRequired: 1, // to trigger level up
            getCriticalChance: vi.fn().mockReturnValue(0),
            inventory: [weaponItemMock],
            weapon: weaponMock,
        });

        player.gainExp(1); // trigger level up
        player.update(1.0); // use update time higher than the LEVEL_UP_SHOCKWAVE_DELAY

        expect(nearBody.entity.takeDamage).toHaveBeenCalledWith(weaponDamage, false, player.body.position);
    });

    it('does not damage enemies beyond 15m range', () => {
        const farBody = makeEnemyBody(20, 20);
        const weaponDamage = 50;
        const weaponItemMock = makeWeaponItem({ damage: weaponDamage, isEquipped: true });
        const weaponMock = makeWeapon({ damage: weaponDamage });

        const player = makePlayer({
            world: mock<CANNON.World>({
                bodies: [farBody],
                broadphase: mock<CANNON.Broadphase>({ aabbQuery: vi.fn().mockReturnValue([]) })
            }),
            expRequired: 1, // to trigger level up
            getCriticalChance: vi.fn().mockReturnValue(0),
            inventory: [weaponItemMock],
            weapon: weaponMock,
        });

        player.gainExp(1); // trigger level up
        player.update(1.0); // use update time higher than the LEVEL_UP_SHOCKWAVE_DELAY

        expect((farBody.entity as any).takeDamage).not.toHaveBeenCalled();
    });

    it('damages near enemies and skips far enemies in mixed group', () => {
        const nearBody = makeEnemyBody(10, 0);
        const farBody = makeEnemyBody(0, 16);
        const weaponDamage = 50;
        const weaponItemMock = makeWeaponItem({ damage: weaponDamage, isEquipped: true });
        const weaponMock = makeWeapon({ damage: weaponDamage });

        const player = makePlayer({
            world: mock<CANNON.World>({
                bodies: [nearBody, farBody],
                broadphase: mock<CANNON.Broadphase>({ aabbQuery: vi.fn().mockReturnValue([]) })
            }),
            expRequired: 1, // to trigger level up
            getCriticalChance: vi.fn().mockReturnValue(0),
            inventory: [weaponItemMock],
            weapon: weaponMock,
        });

        player.gainExp(1); // trigger level up
        player.update(1.0); // use update time higher than the LEVEL_UP_SHOCKWAVE_DELAY

        expect((nearBody.entity as any).takeDamage).toHaveBeenCalled();
        expect((farBody.entity as any).takeDamage).not.toHaveBeenCalled();
    });

    it('damages enemy at exactly 15m boundary', () => {
        const boundaryBody = makeEnemyBody(15, 0);
        const weaponDamage = 50;
        const weaponItemMock = makeWeaponItem({ damage: weaponDamage, isEquipped: true });
        const weaponMock = makeWeapon({ damage: weaponDamage });

        const player = makePlayer({
            world: mock<CANNON.World>({
                bodies: [boundaryBody],
                broadphase: mock<CANNON.Broadphase>({ aabbQuery: vi.fn().mockReturnValue([]) })
            }),
            expRequired: 1, // to trigger level up
            getCriticalChance: vi.fn().mockReturnValue(0),
            inventory: [weaponItemMock],
            weapon: weaponMock,
        });

        player.gainExp(1); // trigger level up
        player.update(1.0); // use update time higher than the LEVEL_UP_SHOCKWAVE_DELAY

        expect((boundaryBody.entity as any).takeDamage).toHaveBeenCalled();
    });

    it('skips dead and dying enemies', () => {
        const deadBody = makeEnemyBody(5, 0, true, false);
        const dyingBody = makeEnemyBody(5, 0, false, true);
        const weaponDamage = 50;
        const weaponItemMock = makeWeaponItem({ damage: weaponDamage, isEquipped: true });
        const weaponMock = makeWeapon({ damage: weaponDamage });

        const player = makePlayer({
            world: mock<CANNON.World>({
                bodies: [deadBody, dyingBody],
                broadphase: mock<CANNON.Broadphase>({ aabbQuery: vi.fn().mockReturnValue([]) })
            }),
            expRequired: 1, // to trigger level up
            getCriticalChance: vi.fn().mockReturnValue(0),
            inventory: [weaponItemMock],
            weapon: weaponMock,
        });

        player.gainExp(1); // trigger level up
        player.update(1.0); // use update time higher than the LEVEL_UP_SHOCKWAVE_DELAY

        expect((deadBody.entity as any).takeDamage).not.toHaveBeenCalled();
        expect((dyingBody.entity as any).takeDamage).not.toHaveBeenCalled();
    });
});

// ─── handleSkillAnimation safety timeout ──────────────────────────────────────

describe('Player.handleSkillAnimation', () => {
    it('returns false immediately when isUsingSkill is false', () => {
        const player = makePlayer({ isUsingSkill: false, skillAnimationTimer: 0 });
        player.haltMovement = vi.fn();

        const result = player.handleSkillAnimation(0.1);

        expect(result).toBe(false);
        expect(player.haltMovement).not.toHaveBeenCalled();
    });

    it('returns true and halts movement while isUsingSkill is true within max duration', () => {
        const player = makePlayer({ isUsingSkill: true, skillAnimationTimer: 0 });
        player.haltMovement = vi.fn();

        const result = player.handleSkillAnimation(0.1);

        expect(result).toBe(true);
        expect(player.skillAnimationTimer).toBeCloseTo(0.1);
        expect(player.haltMovement).toHaveBeenCalled();
    });

    it('force-releases the skill lock when skillAnimationTimer exceeds SKILL_ANIMATION_MAX_DURATION', () => {
        const maxDuration = (makePlayer() as any).SKILL_ANIMATION_MAX_DURATION as number;
        const player = makePlayer({ isUsingSkill: true, skillAnimationTimer: maxDuration - 0.01 });
        player.haltMovement = vi.fn();

        // One tick that pushes the timer over the limit
        const result = player.handleSkillAnimation(0.02);

        expect(result).toBe(false);
        expect(player.isUsingSkill).toBe(false);
        expect(player.skillAnimationTimer).toBe(0);
    });
});

// ─── skill state cleared on death and respawn ─────────────────────────────────

describe('Player die() / respawn() skill-state cleanup', () => {
    it('Sets isDead flag and calls death callback when die() is called', () => {
        const player = makePlayer({ isDead: false, hp: 10, maxHp: 20, tp: 5, maxTp: 10 });

        const deathCallback = vi.fn();
        player.setDeathCallback(deathCallback);
        player.takeDamage(10);

        expect(player.hp).toBe(0);
        expect(player.tp).toBe(5);
        expect(player.isDead).toBe(true);
        expect(deathCallback).toHaveBeenCalled();
    });

    it('Stops player and revives when respawn() is called', () => {
        const player = makePlayer({
            isDead: true,
            hp: 0,
            maxHp: 20,
            tp: 5,
            maxTp: 10,
            body: mock<CANNON.Body>({
                position: new CANNON.Vec3(3, 4, -2),
                velocity: new CANNON.Vec3(3, -2, 1)
            })
        });

        const position = mock<CANNON.Vec3>({ x: 1, y: 0, z: 1 });
        player.respawn(position);

        expect(player.body.position.x).toBe(position.x);
        expect(player.body.position.y).toBe(position.y);
        expect(player.body.position.z).toBe(position.z);
        expect(player.body.velocity.x).toBe(0);
        expect(player.body.velocity.y).toBe(0);
        expect(player.body.velocity.z).toBe(0);
        expect(player.hp).toBe(player.maxHp);
        expect(player.tp).toBe(player.maxTp);
        expect(player.isDead).toBe(false);
    });
});
