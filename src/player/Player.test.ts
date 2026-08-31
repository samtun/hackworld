import * as CANNON from 'cannon-es';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Player } from './Player';
import { StatType } from '../StatType';
import { CoreItem } from '../items/cores/CoreItem';
import { ChipItem } from '../items/chips/ChipItem';
import { WeaponItem } from '../items/weapons/WeaponItem';
import { WeaponType } from '../items/weapons/WeaponType';
import { Tier, TierManager } from '../items/TierManager';
import { CardCollection } from '../items/cards/CardCollection';
import { Album } from '../items/cards/Card';
import { Enemy } from '../enemies/Enemy';
import { AudioManager } from '../AudioManager';
import { SkillTechType } from './skills/SkillType';
import { AssetManager } from '../AssetManager';
import { InputManager } from '../controls/InputManager';
import { FloatingIndicatorManager } from '../FloatingIndicatorManager';
import { WeaponRepository } from '../items/weapons/WeaponRepository';
import { WeaponFactory } from '../items/weapons/WeaponFactory';
import { SkillFactory } from './skills/SkillFactory';
import { mock, mockDeep } from 'vitest-mock-extended';
import * as THREE from 'three';
import { container } from 'tsyringe';
import { Weapon } from '../items/weapons/Weapon';
import { PhysicsBodyMetadataManager } from '../PhysicsBodyMetadata';
import { RangedSkill } from './skills/RangedSkill';
import { RecoverySkill } from './skills/RecoverySkill';
import { BlastSkill } from './skills/BlastSkill';
import { ChipType } from '../items/chips/Chip';
import { CoreType } from '../items/cores/Core';

const physicsBodyMetadataManager = new PhysicsBodyMetadataManager();

interface PlayerDependencyOverrides {
    position?: CANNON.Vec3;
    physicsMaterial?: CANNON.Material;
    assetManager?: AssetManager;
    scene?: THREE.Scene;
    physicsWorld?: CANNON.World;
    inputManager?: InputManager;
    floatingIndicatorManager?: FloatingIndicatorManager;
    tierManager?: TierManager;
    weaponRepository?: WeaponRepository;
    cardCollection?: CardCollection;
    audioManager?: AudioManager;
    skillFactory?: SkillFactory;
    weaponFactory?: WeaponFactory;
}

const stableTier = {
    name: Tier.STABLE,
    minPercent: -3,
    maxPercent: 3,
    rimColor: '#ffffff',
    innerColor: '#999999',
    traderChance: 0.44,
    minLevel: 0,
};

function createDefaultPhysicsWorld(defaultPhysicsMaterial: CANNON.Material = new CANNON.Material('defaultMaterial')): CANNON.World {
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({
        mass: 0,
        material: defaultPhysicsMaterial,
    });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    const defaultPhysicsWorld = new CANNON.World();
    defaultPhysicsWorld.addBody(floorBody);
    return defaultPhysicsWorld;
}

function createWeapon(isAttacking: boolean) {
    const dummyWeapon = new Weapon(
        createDefaultAssetManager(),
        "dummyWeapon",
        WeaponType.SWORD,
        10,
        mock<CANNON.World>()
    );
    dummyWeapon.isAttacking = isAttacking;
    return dummyWeapon;
}

function createDefaultAssetManager(): AssetManager {
    const dummyMesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );

    const dummyRightHandBone = new THREE.Bone();
    dummyRightHandBone.name = 'HandR';

    const dummyScene = new THREE.Group();
    dummyScene.add(dummyMesh);
    dummyScene.add(dummyRightHandBone);

    const gltfMock = mock<GLTF>();
    gltfMock.scene = dummyScene;

    const defaultAssetManagerMock = mockDeep<AssetManager>();
    defaultAssetManagerMock.get.mockReturnValue(gltfMock);
    return defaultAssetManagerMock;
}

/**
 * Create a minimal Player instance for unit testing.
 */
function makePlayer(overrides: PlayerDependencyOverrides = {}): Player {
    container.clearInstances();

    const weaponItem = new WeaponItem('weapon1', 'Test Weapon', 100, 50, WeaponType.SWORD, 10, "test.glb", stableTier);
    const defaultWeaponRepositoryMock = mock<WeaponRepository>();
    defaultWeaponRepositoryMock.getWeaponById.mockReturnValue(weaponItem);

    const defaultSkillFactoryMock = mock<SkillFactory>();
    const recoverySkillMock = mock<RecoverySkill>();
    recoverySkillMock.use.mockReturnValue(true);
    const rangedSkillMock = mock<RangedSkill>();
    rangedSkillMock.use.mockReturnValue(true);
    const blastSkillMock = mock<BlastSkill>();
    blastSkillMock.use.mockReturnValue(true);
    defaultSkillFactoryMock.createSkill.mockReturnValueOnce(recoverySkillMock);
    defaultSkillFactoryMock.createSkill.mockReturnValueOnce(rangedSkillMock);
    defaultSkillFactoryMock.createSkill.mockReturnValueOnce(blastSkillMock);

    const defaultPhysicsMaterial = new CANNON.Material('defaultMaterial');

    const finalAssetManager = overrides.assetManager || createDefaultAssetManager();

    const defaultWeaponFactoryMock = mockDeep<WeaponFactory>();
    defaultWeaponFactoryMock.createWeapon.mockReturnValue(
        createWeapon(false)
    );

    const defaultInputManagerMock = mockDeep<InputManager>();
    defaultInputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(0, 0));
    const finalInputManager = overrides.inputManager || defaultInputManagerMock;

    const finalWeaponRepository = overrides.weaponRepository || defaultWeaponRepositoryMock;
    const finalWeaponFactory = overrides.weaponFactory || defaultWeaponFactoryMock;
    const finalSkillFactory = overrides.skillFactory || defaultSkillFactoryMock;
    const finalPhysicsWorld = overrides.physicsWorld || createDefaultPhysicsWorld(defaultPhysicsMaterial);

    container.registerInstance(AssetManager, finalAssetManager);
    container.registerInstance(WeaponRepository, finalWeaponRepository);
    container.registerInstance(WeaponFactory, finalWeaponFactory);
    container.registerInstance(SkillFactory, finalSkillFactory);

    const {
        position = new CANNON.Vec3(0, 0, 0),
        physicsMaterial = defaultPhysicsMaterial,
        scene = mockDeep<THREE.Scene>(),
        assetManager = finalAssetManager,
        physicsWorld = finalPhysicsWorld,
        inputManager = finalInputManager,
        floatingIndicatorManager = mock<FloatingIndicatorManager>(),
        tierManager = mock<TierManager>(),
        weaponRepository = finalWeaponRepository,
        cardCollection = mock<CardCollection>(),
        audioManager = mock<AudioManager>(),
        skillFactory = finalSkillFactory,
        weaponFactory = finalWeaponFactory,
    } = overrides;

    const player = new Player(
        position,
        physicsMaterial,
        assetManager,
        scene,
        physicsWorld,
        inputManager,
        floatingIndicatorManager,
        tierManager,
        weaponRepository,
        cardCollection,
        audioManager,
        skillFactory,
        weaponFactory,
        physicsBodyMetadataManager,
    );

    // Set position and update to ensure the player is not considered "airborne" at the start of tests
    player.move(new CANNON.Vec3(0, 0.4, 0));
    player.update(0.016);

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
        expect(player.maxHp).toBe(1700);
        expect(player.maxTp).toBe(600);
    });

    it('adds X-Data upgrade amounts to stats', () => {
        (player as any).strengthUpgrades = 5;
        (player as any).defenseUpgrades = 3;
        player.recalculateStats();
        expect(player.strength).toBe(6); // baseStrength(1) + five upgrades at 1 each
        expect(player.defense).toBe(4);  // baseDefense(1) + three upgrades at 1 each
    });

    it('uses progressive X-Data amounts when recalculating stats', () => {
        (player as any).strengthUpgrades = 11;
        (player as any).defenseUpgrades = 21;
        (player as any).agilityUpgrades = 31;
        (player as any).luckUpgrades = 41;
        player.recalculateStats();

        expect(player.strength).toBe(13); // 1 + (10 * 1) + (1 * 2)
        expect(player.defense).toBe(34); // 1 + (10 * 1) + (10 * 2) + (1 * 3)
        expect(player.agility).toBe(65); // 1 + (10 * 1) + (10 * 2) + (10 * 3) + (1 * 4)
        expect(player.luck).toBe(106); // 1 + (10 * 1) + (10 * 2) + (10 * 3) + (10 * 4) + (1 * 5)
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
        // Four upgrades at 50 each
        expect(player.maxHp).toBe(1900);
    });

    it('applies TP upgrade bonus', () => {
        (player as any).tpUpgrades = 6;
        player.recalculateStats();
        // Five upgrades at 50, followed by one at 100
        expect(player.maxTp).toBe(950);
    });

    it('fully heals the player when called with healing flag', () => {
        player.hp = 1;
        player.tp = 1;
        player.recalculateStats(true);
        expect(player.hp).toBe(player.maxHp);
        expect(player.tp).toBe(player.maxTp);
    });

    it('does not heal the player when called without healing flag', () => {
        player.hp = 1;
        player.tp = 1;
        player.recalculateStats(false);
        expect(player.hp).toBe(1);
        expect(player.tp).toBe(1);
    });

    it('adds level-based HP bonus', () => {
        (player as any).level = 2;
        player.recalculateStats();
        // Math.floor(100.01 * (2-1)) = 100
        expect(player.maxHp).toBe(1800);
    });

    it('adds level-based TP bonus', () => {
        (player as any).level = 2;
        player.recalculateStats();
        // Math.floor(50.05 * (2-1)) = 50
        expect(player.maxTp).toBe(650);
    });

    it('caps stats at MAX_STAT_VALUE', () => {
        (player as any).strengthUpgrades = 9999;
        player.recalculateStats();
        expect(player.strength).toBe(9999);
    });

    it('clamps current HP to new maxHp if it exceeds it', () => {
        player.hp = 5000;
        player.maxHp = 5000;
        // After recalculate at level 1, maxHp becomes 1700 so hp should clamp
        player.recalculateStats();
        expect(player.hp).toBe(1700);
    });

    it('applies equipped core stat bonuses', () => {
        const core = new CoreItem('c1', 'Test Core', 100, 50,
            { strength: 10, defense: 5 }, 1, CoreType.HERALD);
        core.isEquipped = true;
        player.inventory = [core];
        player.recalculateStats();
        expect(player.strength).toBe(11); // 1 base + 10 from core
        expect(player.defense).toBe(6);   // 1 base + 5 from core
    });

    it('applies equipped core agility bonus', () => {
        const core = new CoreItem('c1', 'Swift Core', 150, 50,
            { agility: 22, defense: -11 }, 3, CoreType.SWIFT);
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
        (player as any).luckPoints = 99;
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
        // log10(0.0035 * 1 + 20) - 1.29 + 0.00001 * 1 ≈ 0.01111
        const player = makePlayer();
        expect(player.getCriticalChance()).toBeCloseTo(0.01111, 4);
    });

    it('returns the correct value at agility 100', () => {
        // log10(0.0035 * 100 + 20) - 1.29 + 0.00001 * 100 ≈ 0.019564414
        const player = makePlayer();
        player.agility = 100;
        expect(player.getCriticalChance()).toBeCloseTo(0.01956, 4);
    });

    it('returns the correct value at agility 9999 (max)', () => {
        // log10(0.0035 * 9999 + 20) - 1.29 + 0.00001 * 9999 ≈ 0.18115
        const player = makePlayer();
        player.agility = 9999;
        expect(player.getCriticalChance()).toBeCloseTo(0.55032, 4);
    });

    it('increases with agility', () => {
        const low = makePlayer();
        const high = makePlayer();
        high.agility = 500;
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
        const player = makePlayer();
        player.level = 420;
        expect(player.weaponDropBonusFactor).toBe(1.5);
    });

    it('is still below 1.5 at level 419 (one below the cap threshold)', () => {
        // t = 418/419 < 1 → factor < 1.5; confirms the cap is exactly at level 420
        const player = makePlayer();
        player.level = 419;
        expect(player.weaponDropBonusFactor).toBeCloseTo(1.4976, 3);
        expect(player.weaponDropBonusFactor).toBeLessThan(1.5);
    });

    it('caps at 1.5 at very high levels', () => {
        const player = makePlayer();
        player.level = 9999;
        expect(player.weaponDropBonusFactor).toBe(1.5);
    });

    it('increases monotonically with level', () => {
        const p100 = makePlayer();
        p100.level = 100;
        const p200 = makePlayer();
        p200.level = 200;
        expect(p200.weaponDropBonusFactor).toBeGreaterThan(p100.weaponDropBonusFactor);
    });
});

// ─── heal ──────────────────────────────────────────────────────────────────────

describe('Core hit steal effects', () => {
    it('heals HP when a Phishing Core proc triggers on a successful enemy hit', () => {
        const player = makePlayer();
        player.maxHp = 1000;
        player.hp = 500;
        const core = new CoreItem('phishing_core_alpha', 'Phishing Core', 100, 50, { agility: 1 }, 1, CoreType.PHISHING);
        core.isEquipped = true;
        player.inventory = [core];

        const enemy = {
            isDead: false,
            isDying: false,
            techDropRateFactor: 1,
            isBlocking: false,
            hp: 100,
            takeDamage: vi.fn((amount: number) => {
                enemy.hp = Math.max(0, enemy.hp - amount);
            })
        } as unknown as Enemy;

        vi.spyOn(Math, 'random').mockReturnValue(0.005);

        (player as any).handleAttackHit(enemy);

        expect(enemy.takeDamage).toHaveBeenCalled();
        expect(player.hp).toBe(504);
        vi.restoreAllMocks();
    });

    it('restores TP when a Backdoor Core proc triggers on a successful enemy hit', () => {
        const player = makePlayer();
        player.maxTp = 1000;
        player.tp = 500;
        const core = new CoreItem('backdoor_core_alpha', 'Backdoor Core', 100, 50, { defense: 1 }, 1, CoreType.BACKDOOR);
        core.isEquipped = true;
        player.inventory = [core];

        const enemy = {
            isDead: false,
            isDying: false,
            techDropRateFactor: 1,
            isBlocking: false,
            hp: 100,
            takeDamage: vi.fn((amount: number) => {
                enemy.hp = Math.max(0, enemy.hp - amount);
            })
        } as unknown as Enemy;

        vi.spyOn(Math, 'random').mockReturnValue(0.01);

        (player as any).handleAttackHit(enemy);

        expect(enemy.takeDamage).toHaveBeenCalled();
        expect(player.tp).toBe(502);
        vi.restoreAllMocks();
    });

    it('does not trigger a steal when the enemy is blocking the hit', () => {
        const player = makePlayer();
        player.maxHp = 1000;
        player.hp = 500;
        const core = new CoreItem('phishing_core_alpha', 'Phishing Core', 100, 50, { agility: 1 }, 1, CoreType.PHISHING);
        core.isEquipped = true;
        player.inventory = [core];

        const enemy = {
            isDead: false,
            isDying: false,
            techDropRateFactor: 1,
            isBlocking: true,
            hp: 100,
            takeDamage: vi.fn()
        } as unknown as Enemy;

        vi.spyOn(Math, 'random').mockReturnValue(0);

        (player as any).handleAttackHit(enemy);

        expect(player.hp).toBe(500);
        vi.restoreAllMocks();
    });
});

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
        expect(player.hp).toBe(1670);
    });

    it('ensures minimum 1 damage even with very high defense', () => {
        player.defense = 9999;
        player.takeDamage(1);
        // reducedDamage = Math.max(1, ...) ensures at least 1
        expect(player.hp).toBe(1699);
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
        player.takeDamage(1); // Trigger invulnerability
        player.takeDamage(50);
        expect(player.hp).toBe(1699);
    });

    it('does not apply damage while leveling up', () => {
        player.gainExp(2798); // Level up to 2
        player.takeDamage(50);
        expect(player.hp).toBe(1800);
    });

    it('plays the player damage sound when damage is applied', () => {
        const audioManagerMock = mock<AudioManager>();
        const player = makePlayer({ audioManager: audioManagerMock });
        player.takeDamage(10);
        expect(audioManagerMock.playDamage).toHaveBeenCalledWith('player');
    });

    it('applies knockback to the player', () => {
        const audioManagerMock = mock<AudioManager>();
        const player = makePlayer({ audioManager: audioManagerMock });
        player.body = {
            applyImpulse: vi.fn(),
            position: {
                x: 0, y: 0, z: 0, copy: vi.fn(),
                vsub: (_v: any) => ({ x: -1, y: 0, z: 0, length: () => 1, normalize: vi.fn() })
            }
        } as any;
        const sourcePos = { x: 1, y: 0, z: 0 } as any;
        player.takeDamage(50, sourcePos);

        expect((player as any).body.applyImpulse).toHaveBeenCalledWith(
            expect.objectContaining({ x: -80, y: 5, z: 0 }),
            expect.objectContaining({ x: -1, y: 0, z: 0 })
        );
        expect(audioManagerMock.playDamage).toHaveBeenCalledWith('player');
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
        const audioManagerMock = mock<AudioManager>();
        const player = makePlayer({ audioManager: audioManagerMock });
        player.takeDamage(9999);
        expect(audioManagerMock.playDeath).toHaveBeenCalledWith('player');
    });
});

// ─── applyDeathPenalty ────────────────────────────────────────────────────────

describe('Player.applyDeathPenalty', () => {
    it('deducts 10% of current bits', () => {
        const player = makePlayer();
        player.bits = 1000;
        player.applyDeathPenalty();
        expect(player.bits).toBe(900);
    });

    it('deducts 10% of expRequired from exp', () => {
        // expRequired=350, so penalty = floor(350 * 0.1) = 35
        const player = makePlayer();
        player.exp = 200;
        player.expRequired = 350;
        player.applyDeathPenalty();
        expect(player.exp).toBe(165);
    });

    it('returns the actual amounts deducted', () => {
        const player = makePlayer();
        player.bits = 500;
        player.expRequired = 400;
        player.exp = 100;
        const { bitsLost, expLost } = player.applyDeathPenalty();
        expect(bitsLost).toBe(50);
        expect(expLost).toBe(40);
    });

    it('returns zero bitsLost when bits is less than 10', () => {
        // floor(9 * 0.1) = floor(0.9) = 0, so no bits are deducted
        const player = makePlayer();
        player.bits = 9;
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

    it.each([
        { luckAmount: 1, expGain: 1000, expected: 1001 },
        { luckAmount: 2, expGain: 1000, expected: 1002 },
        { luckAmount: 10, expGain: 1000, expected: 1008 },
        { luckAmount: 100, expGain: 1000, expected: 1038 },
        { luckAmount: 9999, expGain: 1000, expected: 1134 },
        { luckAmount: 1, expGain: 100, expected: 100 }, // test of a smaller exp gain that does not get any additional exp due to rounding down
    ])('increases exp correctly (with luck bonus)', ({ luckAmount, expGain, expected }) => {
        player.luck = luckAmount;
        const result = player.gainExp(expGain);
        expect(result).toBe(expected);
        expect(player.exp).toBe(expected);
    });

    it('does not gain exp at max level', () => {
        (player as any).level = 9999;
        const result = player.gainExp(1000);
        expect(result).toBe(0);
        expect(player.exp).toBe(0);
    });

    it('levels up when exp reaches expRequired', () => {
        // At luck=1, gainExp(330) gives ~351 adjusted which exceeds expRequired(350)
        player.gainExp(2798);
        expect(player.level).toBe(2);
    });

    it('awards 4 stat points on level up', () => {
        player.gainExp(2798);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('plays the level-up sound when leveling up', () => {
        const audioManagerMock = mock<AudioManager>();
        const player = makePlayer({ audioManager: audioManagerMock });
        player.gainExp(2798);
        expect(audioManagerMock.playLevelUp).toHaveBeenCalledOnce();
    });

    it('updates expRequired after level up', () => {
        const expectedRemainingExp = 200;
        // requiredExp for level 2, 3 and 4 = 2500 + 3100 + 3401 = 9001
        player.gainExp(9001 + expectedRemainingExp);
        expect(player.level).toBe(4);
        expect(player.exp).toBe(Math.floor(expectedRemainingExp * 1.001) + Math.floor(9001 * 0.001)); // 0.001 is the luck bonus
    });

    it('restores HP to maxHp on level up', () => {
        player.hp = 10;
        player.tp = 5;
        player.gainExp(2798);
        expect(player.hp).toBe(player.maxHp);
        expect(player.tp).toBe(player.maxTp);
    });

    it('can gain multiple levels in one call', () => {
        player.gainExp(9999);
        expect(player.level).toBeGreaterThan(2);
    });
});

describe('Player skill unlock progression', () => {
    it('unlocks skills at levels 10, 20, and 38', () => {
        const player = makePlayer();
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
        const player = makePlayer();
        player.onSkillUnlocked = onSkillUnlocked;

        (player as any).emitSkillUnlockEvents(9, 25);

        expect(onSkillUnlocked).toHaveBeenNthCalledWith(1, 1);
        expect(onSkillUnlocked).toHaveBeenNthCalledWith(2, 2);
    });

    it('Only executes unlocked skills', () => {
        const skill1 = mockDeep<RangedSkill>();
        const skill2 = mockDeep<RangedSkill>();
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(0, 0));
        inputManagerMock.isSkill1JustPressed.mockReturnValue(true);
        inputManagerMock.isSkill2JustPressed.mockReturnValue(false);
        const player = makePlayer({ inputManager: inputManagerMock });

        player.skills[1] = skill2 as any; // Skill at index 1 is locked until level 10

        // Trigger skill 1 execution
        player.update(0.1);

        inputManagerMock.isSkill1JustPressed.mockReturnValue(false);
        inputManagerMock.isSkill2JustPressed.mockReturnValue(true);

        // Trigger skill 2 execution
        player.update(0.1);

        expect(skill1.use).not.toHaveBeenCalled();
        expect(skill2.use).not.toHaveBeenCalled();
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

    beforeEach(() => {
        player = makePlayer();
        player.xData = 100;
    });

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
        expect(player.hp).toBe(200);
    });

    it('upgrades TP and immediately restores by the upgrade amount', () => {
        player.tp = 30;
        player.upgradeWithXData(StatType.TP);
        expect(player.tp).toBe(80);
    });

    it('scales HP/TP upgrades every five levels and caps at 1000', () => {
        expect(player.getXDataUpgradeAmount(StatType.HP, 0)).toBe(50);
        expect(player.getXDataUpgradeAmount(StatType.HP, 4)).toBe(50);
        expect(player.getXDataUpgradeAmount(StatType.HP, 5)).toBe(100);
        expect(player.getXDataUpgradeAmount(StatType.HP, 93)).toBe(950);
        expect(player.getXDataUpgradeAmount(StatType.HP, 94)).toBe(1000);
        expect(player.getXDataUpgradeAmount(StatType.TP, 100)).toBe(1000);
    });

    it('scales stat upgrades every ten levels and caps at five', () => {
        expect(player.getXDataUpgradeAmount(StatType.STRENGTH, 0)).toBe(1);
        expect(player.getXDataUpgradeAmount(StatType.STRENGTH, 9)).toBe(1);
        expect(player.getXDataUpgradeAmount(StatType.STRENGTH, 10)).toBe(2);
        expect(player.getXDataUpgradeAmount(StatType.STRENGTH, 30)).toBe(4);
        expect(player.getXDataUpgradeAmount(StatType.STRENGTH, 40)).toBe(5);
        expect(player.getXDataUpgradeAmount(StatType.STRENGTH, 100)).toBe(5);
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
    it('expRequired at level 2', () => {
        const player = makePlayer();
        player.gainExp(player.expRequired); // enough to level up to 2
        expect((player as any).expRequired).toBe(3100);
    });

    it('expRequired at level 3', () => {
        const player = makePlayer();
        player.level = 2;
        player.gainExp(player.expRequired); // enough to level up to 3
        expect((player as any).expRequired).toBe(3401);
    });

    it('expRequired at level 101', () => {
        const player = makePlayer();
        player.level = 100;
        player.gainExp(player.expRequired);
        expect((player as any).expRequired).toBe(34840);
    });

    it('expRequired at level 998', () => {
        const player = makePlayer();
        player.level = 997;
        player.gainExp(player.expRequired);
        expect((player as any).expRequired).toBe(501100);
    });
});

// ─── addStatPoint ─────────────────────────────────────────────────────────────

describe('Player.addStatPoint', () => {
    let player: Player;

    beforeEach(() => {
        vi.clearAllMocks();
        player = makePlayer();
        player.statPointsAvailable = 5;
    });

    it('adds a strength point and decrements statPointsAvailable', () => {
        player.addStatPoint(StatType.STRENGTH);
        expect(player.strengthPoints).toBe(1);
        expect(player.statPointsAvailable).toBe(4);
    });

    it('plays the upgrade sound when a stat point is spent', () => {
        const audioManagerMock = mock<AudioManager>();
        const player = makePlayer({ audioManager: audioManagerMock });
        player.statPointsAvailable = 5;
        player.addStatPoint(StatType.STRENGTH);
        expect(audioManagerMock.playUpgrade).toHaveBeenCalledOnce();
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
        (player as any).strengthPoints = 9998; // base(1)+points(9998) = 9999 = MAX
        expect(player.addStatPoint(StatType.STRENGTH)).toBe(false);
    });
});

// ─── WeaponItem canEquip ───────────────────────────────────────────────────────

describe('WeaponItem canEquip', () => {
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
        const core = new CoreItem('c1', 'Core', 100, 50, { strength: 5 }, 1, CoreType.HERALD);
        expect(core.canEquip(player)).toBe(true);
    });

    it('blocks equipping level-2 core below required player level', () => {
        const player = makePlayer(); // level 1
        const core = new CoreItem('c2', 'Core+', 200, 100, { strength: 10 }, 2, CoreType.HERALD);
        // level-2 core requires player level 10
        expect(core.canEquip(player)).toBe(false);
    });

    it('allows equipping level-2 core at required player level', () => {
        const player = makePlayer(); player.level = 10;
        const core = new CoreItem('c2', 'Core+', 200, 100, { strength: 10 }, 2, CoreType.HERALD);
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
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isBlockPressed.mockReturnValue(true);
        inputManagerMock.isBlockJustPressed.mockReturnValue(true);
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(0, 0));
        const player = makePlayer({ inputManager: inputManagerMock });
        player.update(0.1);
        expect(player.isBlocking).toBe(true);
    });

    it('cannot block while attacking', () => {
        const weaponFactoryMock = mockDeep<WeaponFactory>();
        weaponFactoryMock.createWeapon.mockReturnValue(
            createWeapon(true)
        );
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isAttackPressed.mockReturnValue(true);
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(0, 0));
        const player = makePlayer({ inputManager: inputManagerMock, weaponFactory: weaponFactoryMock });
        inputManagerMock.isBlockJustPressed.mockReturnValue(true);
        player.update(0.1);
        expect(player.isBlocking).toBe(false);
    });

    it('cannot block while airborne', () => {
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isJumpPressed.mockReturnValue(true);
        inputManagerMock.isBlockJustPressed.mockReturnValue(false);
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(0, 0));

        const physicsWorld = createDefaultPhysicsWorld();

        const player = makePlayer({ inputManager: inputManagerMock, physicsWorld: physicsWorld });
        physicsWorld.step(0.1); // Step physics world to make player body move upward due to jump
        player.update(0.1);
        expect(player.position.y).toBeGreaterThan(0.2); // make sure player is airborne

        inputManagerMock.isBlockJustPressed.mockReturnValue(true);
        player.update(0.1);

        expect(player.isBlocking).toBe(false);
    });

    it('cannot block while already blocking', () => {
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isBlockJustPressed.mockReturnValue(true);
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(0, 0));
        const player = makePlayer({ inputManager: inputManagerMock });
        player.update(0.25);
        inputManagerMock.isBlockJustPressed.mockReturnValue(false);

        // Normal block start
        expect(player.isBlocking).toBe(true);
        player.update(0.26);

        // After BLOCK_DURATION (0.5s), the block should end and updates with block pressed should NOT start a new block in the same time
        expect(player.isBlocking).toBe(false);

        inputManagerMock.isBlockJustPressed.mockReturnValue(true);
        player.update(0.1);

        // After the block has ended, pressing block again should start a new block
        expect(player.isBlocking).toBe(true);
    });

    it('cannot block when dead', () => {
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isBlockJustPressed.mockReturnValue(true);
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(0, 0));
        const player = makePlayer({ inputManager: inputManagerMock });
        player.takeDamage(9999); // kill the player
        player.update(0.1);
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

        expect((player as any).body.applyImpulse).toHaveBeenCalledWith(
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
        (player as any).blockTimer = 0.1;
        (player as any).handleBlock(0.2); // 0.1 + 0.2 = 0.3 < 0.5
        expect(player.isBlocking).toBe(true);
    });

    it('clears isBlocking when the block timer reaches BLOCK_DURATION', () => {
        const player = makePlayer();
        player.isBlocking = true;
        (player as any).blockTimer = 0.4;
        (player as any).handleBlock(0.15); // 0.4 + 0.15 = 0.55 ≥ 0.5
        expect(player.isBlocking).toBe(false);
    });
});

// ─── Player.equipWeapon ───────────────────────────────────────────────────────

describe('Player.equipWeapon', () => {
    it('equips the weapon matching the given id from inventory', () => {
        const weapon = new WeaponItem('w1', 'Sword', 100, 50, WeaponType.SWORD, 10, 'model.glb', stableTier, 1);
        const player = makePlayer();
        player.inventory.push(weapon);
        player.equipWeapon('w1');
        expect(weapon.isEquipped).toBe(true);
    });

    it('does nothing when no item with the given id is found', () => {
        const player = makePlayer();
        expect(() => player.equipWeapon('non-existent')).not.toThrow();
    });
});

// ─── Player.equipCore ────────────────────────────────────────────────────────

describe('Player.equipCore', () => {
    it('equips the core matching the given id from inventory', () => {
        const core = new CoreItem('core1', 'Herald Core', 200, 100, { strength: 3 }, 1, CoreType.HERALD);
        const player = makePlayer();
        player.level = 1;
        player.inventory.push(core);
        player.equipCore('core1');
        expect(core.isEquipped).toBe(true);
    });

    it('does nothing when no item with the given id is found', () => {
        const player = makePlayer();
        expect(() => player.equipCore('non-existent')).not.toThrow();
    });
});

// ─── Player.equipChip ────────────────────────────────────────────────────────

describe('Player.equipChip', () => {
    it('equips the chip matching the given id from inventory', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.1 }, 1);
        const player = makePlayer();
        player.inventory.push(chip);
        player.level = 1;
        player.equipChip('chip1');
        expect(chip.isEquipped).toBe(true);
    });

    it('does nothing when no item with the given id is found', () => {
        const player = makePlayer();
        expect(() => player.equipChip('non-existent')).not.toThrow();
    });
});

// ─── Player.getWeaponRangeMultiplier ─────────────────────────────────────────

describe('Player.getWeaponRangeMultiplier', () => {
    it('returns 1.0 when no chip is equipped', () => {
        const player = makePlayer();
        expect(player.getWeaponRangeMultiplier()).toBe(1.0);
    });

    it('returns the multiplier from an equipped chip', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.15 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getWeaponRangeMultiplier()).toBe(1.15);
    });

    it('returns 1.0 when chip has no weaponRangeMultiplier stat', () => {
        const chip = new ChipItem('chip1', 'Overclock', 150, 75, ChipType.OVERCLOCK, {}, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getWeaponRangeMultiplier()).toBe(1.0);
    });
});

// ─── Player.getCriticalHitMultiplier ─────────────────────────────────────────

describe('Player.getCriticalHitMultiplier', () => {
    it('returns base 1.5 when no chip is equipped', () => {
        const player = makePlayer();
        expect(player.getCriticalHitDamageMultiplier()).toBe(1.5);
    });

    it('returns boosted multiplier from an equipped Razorwire chip', () => {
        const chip = new ChipItem('chip1', 'Razorwire', 150, 50, ChipType.RAZORWIRE, { criticalDamageMultiplier: 1.20 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        // 1.5 * 1.20 = 1.80
        expect(player.getCriticalHitDamageMultiplier()).toBeCloseTo(1.80, 4);
    });

    it('returns base 1.5 when chip has no criticalDamageMultiplier stat', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.15 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getCriticalHitDamageMultiplier()).toBe(1.5);
    });
});

// ─── Player.getHealingMultiplier ─────────────────────────────────────────────

describe('Player.getHealingMultiplier', () => {
    it('returns 1.0 when no chip is equipped', () => {
        const player = makePlayer();
        expect(player.getHealingMultiplier()).toBe(1.0);
    });

    it('returns the multiplier from an equipped Patchwork chip', () => {
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, ChipType.PATCHWORK, { healingMultiplier: 1.30 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getHealingMultiplier()).toBe(1.30);
    });

    it('returns 1.0 when chip has no healingMultiplier stat', () => {
        const chip = new ChipItem('chip1', 'Overclock', 150, 75, ChipType.OVERCLOCK, { walkSpeedMultiplier: 1.10 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getHealingMultiplier()).toBe(1.0);
    });
});

// ─── Player.heal with Patchwork chip ─────────────────────────────────────────

describe('Player.heal with Patchwork chip', () => {
    it('applies healing multiplier to HP', () => {
        const player = makePlayer();
        player.hp = 100;
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, ChipType.PATCHWORK, { healingMultiplier: 1.40 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.heal(50); // 50 * 1.40 = 70
        expect(player.hp).toBe(170);
    });

    it('applies healing multiplier to TP', () => {
        const player = makePlayer();
        player.tp = 20;
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, ChipType.PATCHWORK, { healingMultiplier: 1.20 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.heal(0, 10); // 10 * 1.20 = 12
        expect(player.tp).toBe(32);
    });

    it('does not exceed maxHp when healing with multiplier', () => {
        const player = makePlayer();
        player.hp = 1600;
        const chip = new ChipItem('chip1', 'Patchwork', 150, 50, ChipType.PATCHWORK, { healingMultiplier: 1.40 }, 1);
        chip.isEquipped = true;
        player.inventory = [chip];
        player.heal(80); // 80 * 1.40 = 112, but maxHp is 1700, so capped to 1700
        expect(player.hp).toBe(1700);
    });
});

// ─── Player.getCriticalHitChanceBonus ─────────────────────────────────────────

describe('Player.getCriticalHitChanceBonus', () => {
    it('returns base value when no chip is equipped', () => {
        const player = makePlayer();
        expect(player.getCriticalHitChanceBonus()).toBe(0);
    });

    it('returns boosted multiplier from an equipped Focus chip', () => {
        const chip = new ChipItem('chip1', 'Focus', 150, 50, ChipType.FOCUS, { critChanceMultiplier: 1.02 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getCriticalHitChanceBonus()).toBeCloseTo(0.02, 4);
    });

    it('returns base value when chip has no critChanceBonus stat', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.15 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getCriticalHitChanceBonus()).toBe(0.0);
    });
});

// ─── Player.getSkillDamageBonus ─────────────────────────────────────────

describe('Player.getSkillDamageMultiplier', () => {
    it('returns base value when no chip is equipped', () => {
        const player = makePlayer();
        expect(player.getSkillDamageMultiplier()).toBe(1.0);
    });

    it('returns boosted multiplier from an equipped Amplifier chip', () => {
        const chip = new ChipItem('chip1', 'Amplifier', 150, 50, ChipType.AMPLIFIER, { skillDamageBonus: 1.2 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getSkillDamageMultiplier()).toBeCloseTo(1.2, 4);
    });

    it('returns base value when chip has no skillDamageBonus stat', () => {
        const chip = new ChipItem('chip1', 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.15 }, 1);
        chip.isEquipped = true;
        const player = makePlayer();
        player.inventory.push(chip);
        expect(player.getSkillDamageMultiplier()).toBe(1.0);
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
    it.each([
        { skillLevel: Tier.STABLE, skillTechPoints: 0, skillType: SkillTechType.RECOVERY },
        { skillLevel: Tier.MAINTAINED, skillTechPoints: 60, skillType: SkillTechType.RANGED },
        { skillLevel: Tier.OVERCLOCKED, skillTechPoints: 280, skillType: SkillTechType.BLAST },
        { skillLevel: Tier.ZERODAY, skillTechPoints: 880, skillType: SkillTechType.RECOVERY },
        { skillLevel: Tier.LEET, skillTechPoints: 1800, skillType: SkillTechType.RANGED },
        { skillLevel: Tier.STABLE, skillTechPoints: 59, skillType: SkillTechType.BLAST },
        { skillLevel: Tier.MAINTAINED, skillTechPoints: 279, skillType: SkillTechType.RECOVERY },
        { skillLevel: Tier.OVERCLOCKED, skillTechPoints: 879, skillType: SkillTechType.RANGED },
        { skillLevel: Tier.ZERODAY, skillTechPoints: 1799, skillType: SkillTechType.BLAST },
    ])('calls tierManager to determine skill level and passes current skill tech points',
        ({ skillLevel, skillTechPoints, skillType }) => {
            const tierManagerMock = mockDeep<TierManager>();
            tierManagerMock.getSkillTierForTech.mockReturnValue(skillLevel);
            const player = makePlayer({ tierManager: tierManagerMock });
            player.skillTech[skillType] = skillTechPoints;
            expect(player.getSkillTier(skillType)).toBe(skillLevel);
            expect(tierManagerMock.getSkillTierForTech).toHaveBeenCalledWith(skillTechPoints);
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
        (player as any).tech[WeaponType.SWORD] = 9999; // at cap
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementWeaponTech(1.0);
        expect((player as any).tech[WeaponType.SWORD]).toBe(9999);
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
        (player as any).skillTech[SkillTechType.RANGED] = 9999; // at cap
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.RANGED);
        expect((player as any).skillTech[SkillTechType.RANGED]).toBe(9999);
        vi.restoreAllMocks();
    });

    it('caps incremented value at SKILL_TECH_POINT_CAP', () => {
        const player = makePlayer();
        (player as any).level = 9999;
        (player as any).skillTech[SkillTechType.RECOVERY] = 9998;
        vi.spyOn(Math, 'random').mockReturnValue(0.001);
        player.tryIncrementSkillTech(SkillTechType.RECOVERY);
        expect((player as any).skillTech[SkillTechType.RECOVERY]).toBe(9999);
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
    beforeEach(() => {
        player = makePlayer();
        player.statPointsAvailable = 5;
    });

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

// ─── collection bonus getters ──────────────────────────────────────────────────

describe('Player collection bonus getters', () => {
    let player: Player;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        player = makePlayer();
    });

    describe('collectionBonusItemDropChance', () => {
        it('returns 0 when no B-collections are complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.mockReturnValue(false);
            player = makePlayer({ cardCollection: cardCollectionMock });
            player.level = 1;
            player.luck = 1;
            expect(player.collectionBonusItemDropChance).toBe(0);
        });

        it('returns 0.02 when only B.001 is complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.calledWith(Album.B001).mockReturnValue(true);
            player = makePlayer({ cardCollection: cardCollectionMock });
            expect(player.collectionBonusItemDropChance).toBeCloseTo(0.02);
        });

        it('returns 0.10 when B.001, B.002, and B.003 are all complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.calledWith(Album.B001).mockReturnValue(true);
            cardCollectionMock.isAlbumComplete.calledWith(Album.B002).mockReturnValue(true);
            cardCollectionMock.isAlbumComplete.calledWith(Album.B003).mockReturnValue(true);
            player = makePlayer({ cardCollection: cardCollectionMock });
            expect(player.collectionBonusItemDropChance).toBeCloseTo(0.10);
        });
    });

    describe('collectionBonusWeaponDropFactor', () => {
        it('returns 0 when no B-collections are complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.mockReturnValue(false);
            player = makePlayer({ cardCollection: cardCollectionMock });
            expect(player.collectionBonusWeaponDropFactor).toBe(0);
        });

        it('returns 0.02 when only B.002 is complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.calledWith(Album.B002).mockReturnValue(true);
            player = makePlayer({ cardCollection: cardCollectionMock });
            expect(player.collectionBonusWeaponDropFactor).toBeCloseTo(0.02);
        });

        it('returns 0.07 when B.002 and B.003 are both complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.calledWith(Album.B002).mockReturnValue(true);
            cardCollectionMock.isAlbumComplete.calledWith(Album.B003).mockReturnValue(true);
            player = makePlayer({ cardCollection: cardCollectionMock });
            expect(player.collectionBonusWeaponDropFactor).toBeCloseTo(0.07);
        });
    });

    describe('collectionBonusSkillCooldownReduction', () => {
        it('returns 0 when C.002 is not complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.calledWith(Album.C002).mockReturnValue(false);
            player = makePlayer({ cardCollection: cardCollectionMock });
            expect(player.collectionBonusSkillCooldownReduction).toBe(0);
        });

        it('returns 0.10 when C.002 is complete', () => {
            const cardCollectionMock = mock<CardCollection>();
            cardCollectionMock.isAlbumComplete.calledWith(Album.C002).mockReturnValue(true);
            player = makePlayer({ cardCollection: cardCollectionMock });
            expect(player.collectionBonusSkillCooldownReduction).toBeCloseTo(0.10);
        });
    });
});

// ─── executeLevelUpShockwave ─────────────────────────────────────────────────

describe('Player.executeLevelUpShockwave', () => {
    function makeEnemyBody(x: number, z: number, isDead = false, isDying = false): CANNON.Body {
        const enemy = Object.create(Enemy.prototype) as Enemy;
        Object.assign(enemy, { isDead, isDying, takeDamage: vi.fn() });
        const body = new CANNON.Body({ mass: 1 });
        body.position.set(x, 0.0, z);
        physicsBodyMetadataManager.registerEnemyBody(body, enemy);
        return body;
    }

    function getEnemy(body: CANNON.Body): Enemy {
        const metadata = physicsBodyMetadataManager.getPhysicsBodyMetadata(body);
        if (!metadata || metadata.kind !== 'enemy') throw new Error('Expected enemy body metadata');
        return metadata.entity;
    }

    it('damages enemies within 10m range', () => {
        const nearBody = makeEnemyBody(5, 0);
        const physicsWorld = createDefaultPhysicsWorld();
        physicsWorld.bodies.push(nearBody);
        const player = makePlayer({ physicsWorld: physicsWorld });

        (player as any).executeLevelUpShockwave();

        expect(getEnemy(nearBody).takeDamage).toHaveBeenCalledWith(10, false, player.body.position);
    });

    it('does not damage enemies beyond 10m range', () => {
        const farBody = makeEnemyBody(20, 20);
        const physicsWorld = createDefaultPhysicsWorld();
        physicsWorld.bodies.push(farBody);
        const player = makePlayer({ physicsWorld: physicsWorld });

        (player as any).executeLevelUpShockwave();

        expect(getEnemy(farBody).takeDamage).not.toHaveBeenCalled();
    });

    it('damages near enemies and skips far enemies in mixed group', () => {
        const nearBody = makeEnemyBody(10, 0);
        const farBody = makeEnemyBody(0, 16);
        const physicsWorld = createDefaultPhysicsWorld();
        physicsWorld.bodies.push(nearBody, farBody);
        const player = makePlayer({ physicsWorld: physicsWorld });

        (player as any).executeLevelUpShockwave();

        expect(getEnemy(nearBody).takeDamage).toHaveBeenCalled();
        expect(getEnemy(farBody).takeDamage).not.toHaveBeenCalled();
    });

    it('damages enemy at exactly 10m boundary', () => {
        const boundaryBody = makeEnemyBody(10, 0);
        const physicsWorld = createDefaultPhysicsWorld();
        physicsWorld.bodies.push(boundaryBody);
        const player = makePlayer({ physicsWorld: physicsWorld });

        (player as any).executeLevelUpShockwave();

        expect(getEnemy(boundaryBody).takeDamage).toHaveBeenCalled();
    });

    it('skips dead and dying enemies', () => {
        const deadBody = makeEnemyBody(5, 0, true, false);
        const dyingBody = makeEnemyBody(5, 0, false, true);
        const physicsWorld = createDefaultPhysicsWorld();
        physicsWorld.bodies.push(deadBody, dyingBody);
        const player = makePlayer({ physicsWorld: physicsWorld });

        (player as any).executeLevelUpShockwave();

        expect(getEnemy(deadBody).takeDamage).not.toHaveBeenCalled();
        expect(getEnemy(dyingBody).takeDamage).not.toHaveBeenCalled();
    });
});

// ─── handleSkillAnimation safety timeout ──────────────────────────────────────

describe('Player.handleSkillAnimation', () => {
    it('returns false immediately when isUsingSkill is false', () => {
        const player = makePlayer();
        (player as any).haltMovement = vi.fn();

        const result = (player as any).handleSkillAnimation(0.1);

        expect(result).toBe(false);
        expect((player as any).haltMovement).not.toHaveBeenCalled();
    });

    it('halts movement while using skill', () => {
        const expectedPosition = new THREE.Vector3(0.07943282347242815, 0.1, 0.07943282347242815);
        const inputManagerMock = mock<InputManager>();
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2(10, 10));
        const physicsWorld = createDefaultPhysicsWorld();
        const player = makePlayer({ inputManager: inputManagerMock, physicsWorld: physicsWorld });
        player.body.velocity.set(1, 0, 1);
        // Update player and trigger step in physics world to mock Game.animate() behavior
        physicsWorld.step(0.1);
        player.update(0.1); // Make player move
        expect(player.position.x).toBeCloseTo(expectedPosition.x);
        expect(player.position.y).toBeCloseTo(expectedPosition.y);
        expect(player.position.z).toBeCloseTo(expectedPosition.z);
        expect(player.body.velocity.x).toBeGreaterThan(0);
        expect(player.body.velocity.y).toBe(0);
        expect(player.body.velocity.z).toBeGreaterThan(0);

        inputManagerMock.isSkill1JustPressed.mockReturnValue(true);
        player.update(0.1); // Trigger skill usage

        expect(player.position.x).toBeCloseTo(expectedPosition.x);
        expect(player.position.y).toBeCloseTo(expectedPosition.y);
        expect(player.position.z).toBeCloseTo(expectedPosition.z);
        expect(player.body.velocity.x).toBe(0);
        expect(player.body.velocity.y).toBe(0);
        expect(player.body.velocity.z).toBe(0);
    });

    it('force-releases the skill lock when skillAnimationTimer exceeds SKILL_ANIMATION_MAX_DURATION', () => {
        const inputManagerMock = mock<InputManager>();
        inputManagerMock.getMovementVector.mockReturnValue(new THREE.Vector2());
        inputManagerMock.isSkill1JustPressed.mockReturnValue(true);
        const player = makePlayer({ inputManager: inputManagerMock });
        player.update(0.1); // triggers skill usage
        inputManagerMock.isSkill1JustPressed.mockReturnValue(false);
        player.update(2.1); // exceeds max duration

        expect((player as any).isUsingSkill).toBe(false);
        expect((player as any).skillAnimationTimer).toBe(0);
    });
});

// ─── skill state cleared on death and respawn ─────────────────────────────────

describe('Player die() / respawn() skill-state cleanup', () => {
    function makePlayerForDeath() {
        const inputManagerMock = mockDeep<InputManager>();
        inputManagerMock.isSkill1JustPressed.mockReturnValue(true);
        const player = makePlayer({ inputManager: inputManagerMock });
        player.hp = 1;
        return player;
    }

    it('clears isUsingSkill and skillAnimationTimer when die() is called', () => {
        const player = makePlayerForDeath();
        (player as any).fadeToAction = vi.fn();

        expect((player as any).isUsingSkill).toBe(true);
        (player as any).die();

        expect((player as any).isUsingSkill).toBe(false);
        expect((player as any).skillAnimationTimer).toBe(0);
    });

    it('clears isUsingSkill and skillAnimationTimer when respawn() is called', () => {
        const player = makePlayerForDeath();
        player.isDead = true;

        expect((player as any).isUsingSkill).toBe(true);
        const position = { x: 1, y: 0, z: 1 };
        player.respawn(position as any);

        expect((player as any).isUsingSkill).toBe(false);
        expect((player as any).skillAnimationTimer).toBe(0);
    });
});
