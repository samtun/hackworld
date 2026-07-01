import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AssetManager } from './AssetManager';
import { InputManager } from './InputManager';
import { Weapon } from './items/weapons/Weapon';
import { WeaponType } from './items/weapons/WeaponType';
import { Enemy } from './enemies/Enemy';
import { Item } from './items/Item';
import { WeaponItem } from './items/weapons/WeaponItem';
import { CoreItem } from './items/cores/CoreItem';
import { ChipItem } from './items/chips/ChipItem';
import { WeaponRepository } from './items/weapons/WeaponRepository';
import { BaseMesh } from './BaseMesh';
import { StatType } from './StatType';
import { Skill } from './skills/Skill';
import { Breakable, isBreakable } from './items/Breakable';
import { LaserBeamSkill } from './skills/LaserBeamSkill';
import { HealingSkill } from './skills/HealingSkill';
import { AreaAttackSkill } from './skills/AreaAttackSkill';
import { FloatingIndicatorManager } from './FloatingIndicatorManager';
import { SkillTechType } from './skills/SkillTechType';
import { Tier, TierManager } from './items/TierManager';
import { BlockShield } from './BlockShield';
import { CardCollection } from './items/cards/CardCollection';
import { Album } from './items/cards/Card';
import { BlobShadow } from './BlobShadow';
import { AudioManager } from './AudioManager';

enum ActionType {
    Idle = 'Idle',
    RunOneHanded = 'RunOneHanded',
    RunTwoHanded = "RunTwoHanded",
    Jump = 'Jump',
    AttackOneHanded = 'AttackOneHanded',
    AttackTwoHanded = 'AttackTwoHanded',
    TakeHit = "TakeHit",
    Death = "Death",
    StartCharge = "StartCharge",
    Dash = "Dash",
    PowerUp = "PowerUp"
};

export const PLAYER_COLLISION_GROUP = 2;

export class Player extends BaseMesh {
    id: string;
    body: CANNON.Body;
    input: InputManager;
    weapon: Weapon;
    currentWeaponType: WeaponType = WeaponType.SWORD;
    innerMesh?: THREE.Mesh;
    position: THREE.Vector3;
    private rightHandBone?: THREE.Bone;

    // Scene and World references for items
    public scene: THREE.Scene;
    public world: CANNON.World;

    /** Flat circular shadow below the player. Hidden in performance mode. */
    public blobShadow!: BlobShadow;

    private weaponRepository: WeaponRepository;
    private floatingIndicatorManager: FloatingIndicatorManager;

    // Knockback strength
    private readonly KNOCKBACK_FORCE = 80;

    // Stat caps and upgrade amounts
    public readonly MAX_STAT_VALUE = 9999;
    private readonly MAX_HP_VALUE = 999999;
    private readonly MAX_TP_VALUE = 999999;
    private readonly HP_TP_UPGRADE_AMOUNT = 15;
    private readonly STRENGTH_DEFENSE_UPGRADE_AMOUNT = 1;

    // Stat effect formula constants
    private readonly STAT_FORMULA_NUMERATOR = 0.27; // Numerator for strength/defense formulas
    private readonly STAT_FORMULA_LOG_BASE = this.MAX_STAT_VALUE; // Log base for strength/defense formulas
    private readonly LUCK_DIVISOR = 40000; // Divisor for luck multiplier
    public readonly CRITICAL_HIT_MULTIPLIER = 1.5;

    // Level system constants
    private readonly MAX_LEVEL = 9999;
    private readonly LEVEL_HP_MULTIPLIER = 100.01; // HP increase by (100 + 0.01) * level
    private readonly LEVEL_TP_MULTIPLIER = 50.05; // TP increase by (50 + 0.05) * level
    private readonly EXP_BASE = 2500;
    private readonly EXP_LINEAR_FACTOR = 30;
    private readonly EXP_QUADRATIC_FACTOR = 0.07;
    private readonly LASER_UNLOCK_LEVEL = 10;
    private readonly HEAL_UNLOCK_LEVEL = 1;
    private readonly AREA_UNLOCK_LEVEL = 25;

    // Tech point cap
    private readonly TECH_POINT_CAP = 2500;
    private readonly SKILL_TECH_POINT_CAP = 1200;

    // Movement speed constant
    private readonly WALK_SPEED = 6;

    // Can jump onto 1m high platforms
    private readonly JUMP_FORCE = 10;

    // Stun mechanic
    private readonly STUN_TIME = 0.5;

    // Invulnerability duration
    private readonly HIT_INVULNERABILITY: number = 1.0;

    // Body half height
    private readonly BODY_HEIGHT = 1.6;

    // Base Stats (without equipment modifiers or upgrades)
    private baseHp: number = 1700;
    private baseTp: number = 600;
    private baseStrength: number = 1;
    private baseDefense: number = 1;
    private baseAgility: number = 1;
    private baseLuck: number = 1;

    // Stats (with equipment modifiers applied)
    level: number = 1;
    exp: number = 0;
    expRequired: number = this.EXP_BASE; // EXP needed for next level
    maxHp: number = this.baseHp;
    hp: number = this.baseHp;
    maxTp: number = this.baseTp;
    tp: number = this.baseTp;
    strength: number = 1;
    defense: number = 1;
    agility: number = 1;
    luck: number = 1;
    invulnerableTimer: number = 0;

    // Stat points available for allocation
    statPointsAvailable: number = 0;

    // X-Data resource
    xData: number = 0;

    // Booster Packs
    boosterPacks: number = 0;

    // Weapon tech/proficiency stats (gained on hit)
    public tech: Record<WeaponType, number> = {
        [WeaponType.SWORD]: 0,
        [WeaponType.DUAL_BLADE]: 0,
        [WeaponType.LANCE]: 0,
        [WeaponType.HAMMER]: 0,
    };

    // Skill tech points (gained on skill use/hit)
    public skillTech: Record<SkillTechType, number> = {
        [SkillTechType.RECOVERY]: 0,
        [SkillTechType.BLAST]: 0,
        [SkillTechType.RANGED]: 0,
    };

    // Upgrade levels for X-Data upgrades
    strengthUpgrades: number = 0;
    defenseUpgrades: number = 0;
    hpUpgrades: number = 0;
    tpUpgrades: number = 0;
    agilityUpgrades: number = 0;
    luckUpgrades: number = 0;

    // Stat points allocated from leveling up (separate from X-Data upgrades)
    strengthPoints: number = 0;
    defensePoints: number = 0;
    agilityPoints: number = 0;
    luckPoints: number = 0;

    // Charged Attack
    private isChargingAttack: boolean = false;
    private chargeTimer: number = 0;
    private readonly CHARGE_DURATION: number = 0.8;
    private readonly CHARGE_FADE_OUT_DURATION: number = 0.1;
    private readonly CHARGE_DELAY: number = 0.2; // Wait 0.2s before starting charge animation
    private chargeDelayTimer: number = 0;
    private isDashing: boolean = false;
    private dashTimer: number = 0;
    private readonly DASH_DURATION: number = 0.3;
    private readonly DASH_SPEED: number = 25;
    private readonly DASH_HITBOX_RADIUS: number = 1.0;
    private dashDirection: THREE.Vector3 = new THREE.Vector3();
    private chargeFx: THREE.Group;
    private chargeFxMaterial: THREE.MeshStandardMaterial | null = null;
    private chargeFxTexture: THREE.Texture | null = null;
    private dashHitEnemies: Set<Enemy> = new Set();
    private attackHitEnemies: Set<Enemy> = new Set();
    private attackLockedUntilRelease: boolean = false;

    /** Callback invoked when the player's weapon or skill hits a breakable entity. */
    onBreakableHit?: (breakable: Breakable) => void;

    // Block state
    isBlocking: boolean = false;
    private blockTimer: number = 0;
    private readonly BLOCK_DURATION: number = 0.5;
    private blockShield: BlockShield | null = null;

    // Particle wall constants
    private readonly CHARGEFX_SCROLL_SPEED: number = 3.0;

    // Level up particle explosion
    private levelUpParticles: Array<{ mesh: THREE.Mesh, velocity: THREE.Vector3 }> = [];
    private levelUpParticleTimer: number = 0;
    private readonly LEVEL_UP_PARTICLE_LIFETIME: number = 0.6; // 0.6 seconds for the explosion

    // Level up shockwave timing
    private readonly LEVEL_UP_SHOCKWAVE_RANGE: number = 10;
    private readonly LEVEL_UP_SHOCKWAVE_DELAY: number = 0.4;
    private levelUpShockwaveTimer: number = 0;
    private shockwavePending: boolean = false;

    // Ground contact tracking
    private isGrounded: boolean = false;
    private stunTimer: number = 0;
    private jumpCooldownTimer: number = 0;
    private footstepTimer: number = 0;

    // Death state
    isDead: boolean = false;
    private deathCallback?: () => void;

    // Level up animation state
    private isLevelingUp: boolean = false;

    // Inventory
    inventory: Item[] = [];
    bits: number = 0; // Starting money

    // Animations
    private mixer!: THREE.AnimationMixer;
    private actions: Record<string, THREE.AnimationAction> = {};
    private currentAction: THREE.AnimationAction | null = null;

    // Skills
    public skills: Skill[] = [];
    private isUsingSkill: boolean = false;
    private skillAnimationTimer: number = 0;
    public onSkillUnlocked?: (skillIndex: number) => void;

    // A bonus on drop chances in percentage points (e.g. 0.05 for +5% drop chances)
    get luckDropChanceBonus(): number {
        return this.luck / this.LUCK_DIVISOR;
    }

    get basePositionY(): number {
        return this.body.position.y - this.BODY_HEIGHT / 2;
    }

    /**
     * Additional item drop chance bonus from completed card collections (B.001/B.002/B.003).
     * Stacks: B.001 +2%, B.002 +3%, B.003 +5% → max +10%
     */
    get collectionBonusItemDropChance(): number {
        const cc = CardCollection.Instance;
        let bonus = 0;
        if (cc.isAlbumComplete(Album.B001)) bonus += 0.02;
        if (cc.isAlbumComplete(Album.B002)) bonus += 0.03;
        if (cc.isAlbumComplete(Album.B003)) bonus += 0.05;
        return bonus;
    }

    /**
     * Additional weapon drop bonus factor from completed card collections (B.002/B.003).
     * Added on top of weaponDropBonusFactor. Stacks: B.002 +0.02, B.003 +0.05 → max +0.07
     */
    get collectionBonusWeaponDropFactor(): number {
        const cc = CardCollection.Instance;
        let bonus = 0;
        if (cc.isAlbumComplete(Album.B002)) bonus += 0.02;
        if (cc.isAlbumComplete(Album.B003)) bonus += 0.05;
        return bonus;
    }

    /**
     * Skill cooldown reduction fraction from completed card collections (C.002).
     * C.002 completed: 10% reduction → 0.10
     */
    get collectionBonusSkillCooldownReduction(): number {
        return CardCollection.Instance.isAlbumComplete(Album.C002) ? 0.10 : 0;
    }

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, input: InputManager, physicsMaterial: CANNON.Material) {
        super('models/main_character.glb');
        this.scene = scene;
        this.world = world;
        this.id = crypto.randomUUID();
        this.input = input;
        this.weaponRepository = WeaponRepository.Instance;
        this.position = position.clone() as any;
        this.floatingIndicatorManager = FloatingIndicatorManager.getInstance(scene);
        this.chargeFx = AssetManager.Instance.get('models/dash_charge_fx.glb').scene.clone();
        this.chargeFx.receiveShadow = false;
        this.chargeFx.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) {
                return;
            }

            this.chargeFxMaterial = node.material as THREE.MeshStandardMaterial;

            // Get texture for charge fx mesh to animate it later
            if (this.chargeFxMaterial.map) {
                this.chargeFxTexture = this.chargeFxMaterial.map;
            }
        });

        // Setup Animations
        this.setupAnimations();

        // Initial weapon from repository (already cloned with unique ID)
        const swordItem = this.weaponRepository.getWeaponById('aegis_sword_alpha');
        if (!swordItem) {
            throw new Error("The default sword could not be loaded");
        }

        // Visual Mesh and Bone references - must be done before weapon setup
        this.mesh.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
                this.innerMesh = obj;
            }
            if (obj instanceof THREE.Bone && obj.name === 'HandR') {
                this.rightHandBone = obj;
            }
        });

        if (!this.innerMesh) {
            console.warn(
                '[Player] No THREE.Mesh found in player model hierarchy; some visual effects may not render.'
            );
        }

        if (!this.rightHandBone) {
            console.warn('[Player] HandR bone not found in player model; weapon will not follow hand.');
        }

        // Initialize weapon visual (after bone references are set)
        this.weapon = new Weapon(swordItem.model, swordItem.weaponType, swordItem.damage, world);
        this.weapon.onHit = (e: any) => {
            const entity = e.body.entity;
            if (entity && entity instanceof Enemy) {
                this.handleAttackHit(entity);
            } else if (isBreakable(entity) && !entity.isDestroyed) {
                this.handleBreakableHit(entity);
            }
        };
        this.setWeapon(swordItem);

        this.inventory.push(swordItem);
        // We manually equip it here to sync state without triggering full equip logic yet
        swordItem.isEquipped = true;
        this.currentWeaponType = swordItem.weaponType;

        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Physics Body
        const box = new THREE.Box3().setFromObject(this.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);

        const radius = 0.5;
        const bodyHalfHeight = this.BODY_HEIGHT / 2;
        const bodyThirdHeight = this.BODY_HEIGHT / 3;
        const endSphereRadius = radius * 0.6;

        // Add base body collider
        this.body = new CANNON.Body({
            mass: 3, // Dynamic body
            position: new CANNON.Vec3(position.x, bodyHalfHeight, position.z),
            fixedRotation: true,
            material: physicsMaterial
        });
        this.body.collisionFilterGroup = PLAYER_COLLISION_GROUP;

        // Add foot sphere to enable skipping over small obstacles
        // Needs to be added first to be the first shape accessed via [0]
        this.body.addShape(new CANNON.Sphere(endSphereRadius), new CANNON.Vec3(0, 0, 0));

        // Add center sphere for most hit and collision detection
        this.body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0, bodyThirdHeight, 0));

        // Add head (to make objects colliding from above slide off)
        this.body.addShape(new CANNON.Sphere(endSphereRadius), new CANNON.Vec3(0, bodyHalfHeight + endSphereRadius, 0));

        // Damping to stop sliding
        this.body.linearDamping = 0.9;

        world.addBody(this.body);

        // Initialize skills
        this.skills = [
            new HealingSkill(this.resetSkillUsage),
            new LaserBeamSkill(this.resetSkillUsage),
            new AreaAttackSkill(this.resetSkillUsage)
        ];

        // Blob shadow – always visible
        this.blobShadow = new BlobShadow(scene, 0.5);
    }

    private resetSkillUsage = () => {
        this.isUsingSkill = false;
        this.skillAnimationTimer = 0;
    };

    equipWeapon(itemId: string) {
        const weaponItem = this.inventory.find(item => item.id === itemId);
        if (weaponItem instanceof WeaponItem) {
            weaponItem.equip(this);
        }
    }

    public setWeapon(weaponItem: WeaponItem) {
        this.currentWeaponType = weaponItem.weaponType;
        this.weapon.changeWeaponType(this.rightHandBone ?? this.mesh, weaponItem.weaponType, weaponItem.damage);
    }

    equipCore(itemId: string) {
        const coreItem = this.inventory.find(item => item.id === itemId);
        if (coreItem instanceof CoreItem) {
            coreItem.equip(this);
        }
    }

    equipChip(itemId: string) {
        const chipItem = this.inventory.find(item => item.id === itemId);
        if (chipItem instanceof ChipItem) {
            chipItem.equip(this);
        }
    }

    public recalculateStats() {
        // Calculate level multiplier
        const levelHpBonus = this.getLevelHpBonus();
        const levelTpBonus = this.getLevelTpBonus();

        // Start with base stats + X-Data upgrades + stat points, then apply level multiplier
        this.strength = Math.min(Math.floor(this.baseStrength + this.strengthUpgrades + this.strengthPoints), this.MAX_STAT_VALUE);
        this.defense = Math.min(Math.floor(this.baseDefense + this.defenseUpgrades + this.defensePoints), this.MAX_STAT_VALUE);
        this.agility = Math.min(Math.floor(this.baseAgility + this.agilityUpgrades + this.agilityPoints), this.MAX_STAT_VALUE);
        this.luck = Math.min(Math.floor(this.baseLuck + this.luckUpgrades + this.luckPoints), this.MAX_STAT_VALUE);
        this.maxHp = Math.min(this.baseHp + (this.hpUpgrades * this.HP_TP_UPGRADE_AMOUNT) + levelHpBonus, this.MAX_HP_VALUE);
        this.maxTp = Math.min(this.baseTp + (this.tpUpgrades * this.HP_TP_UPGRADE_AMOUNT) + levelTpBonus, this.MAX_TP_VALUE);

        // Ensure current HP/TP don't exceed new max
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        if (this.tp > this.maxTp) this.tp = this.maxTp;

        // Apply core modifiers if a core is equipped
        const equippedCore = this.inventory.find(item => item instanceof CoreItem && item.isEquipped) as CoreItem | undefined;
        if (equippedCore) {
            const effectiveStats = equippedCore.stats;
            if (effectiveStats.strength !== undefined) {
                this.strength = Math.min(this.strength + effectiveStats.strength, this.MAX_STAT_VALUE);
            }
            if (effectiveStats.defense !== undefined) {
                this.defense = Math.min(this.defense + effectiveStats.defense, this.MAX_STAT_VALUE);
            }
            if (effectiveStats.agility !== undefined) {
                this.agility = Math.min(this.agility + effectiveStats.agility, this.MAX_STAT_VALUE);
            }
        }

        // Apply chip modifiers if a chip is equipped
        const equippedChip = this.inventory.find(item => item instanceof ChipItem && item.isEquipped) as ChipItem | undefined;
        if (equippedChip) {
            const chipStats = equippedChip.stats;
            if (chipStats.luckMultiplier !== undefined) {
                this.luck = Math.min(Math.floor(this.luck * chipStats.luckMultiplier), this.MAX_STAT_VALUE);
            }
        }
    }

    getWeaponRangeMultiplier(): number {
        const equippedChip = this.inventory.find(item => item instanceof ChipItem && item.isEquipped) as ChipItem | undefined;
        if (equippedChip) {
            const effectiveStats = equippedChip.stats;
            if (effectiveStats.weaponRangeMultiplier !== undefined) {
                return effectiveStats.weaponRangeMultiplier;
            }
        }
        return 1.0; // Default: no multiplier
    }

    getCriticalHitMultiplier(): number {
        const equippedChip = this.inventory.find(item => item instanceof ChipItem && item.isEquipped) as ChipItem | undefined;
        if (equippedChip) {
            const effectiveStats = equippedChip.stats;
            if (effectiveStats.criticalDamageMultiplier !== undefined) {
                return this.CRITICAL_HIT_MULTIPLIER * effectiveStats.criticalDamageMultiplier;
            }
        }
        return this.CRITICAL_HIT_MULTIPLIER;
    }

    getHealingMultiplier(): number {
        const equippedChip = this.inventory.find(item => item instanceof ChipItem && item.isEquipped) as ChipItem | undefined;
        if (equippedChip) {
            const effectiveStats = equippedChip.stats;
            if (effectiveStats.healingMultiplier !== undefined) {
                return effectiveStats.healingMultiplier;
            }
        }
        return 1.0; // Default: no multiplier
    }

    // Calculate strength multiplier using formula: 0.27 / log10(9999) * log10(x)
    private getStrengthMultiplier(): number {
        if (this.strength <= 0) return 0;
        const multiplier = (this.STAT_FORMULA_NUMERATOR / Math.log10(this.STAT_FORMULA_LOG_BASE)) * Math.log10(this.strength);
        return Math.max(0, multiplier);
    }

    // Calculate defense multiplier using formula: 0.27 / log10(9999) * log10(x)
    private getDefenseMultiplier(): number {
        if (this.defense <= 0) return 0;
        const multiplier = (this.STAT_FORMULA_NUMERATOR / Math.log10(this.STAT_FORMULA_LOG_BASE)) * Math.log10(this.defense);
        return Math.max(0, multiplier);
    }

    // Calculate critical hit chance using formula: 0.02 + (log10(agility + 50) * 7 - 11.9) * 0.01
    public getCriticalChance(): number {
        return 0.02 + (Math.log10(this.agility + 50) * 7 - 11.9) * 0.01;
    }

    // Return current tech points for a given weapon type
    getTechForWeapon(type: WeaponType): number {
        return this.tech[type] ?? 0;
    }

    // Increment tech for the currently equipped weapon
    tryIncrementWeaponTech(dropRateFactor: number) {
        const key = this.currentWeaponType;
        const x = this.tech[key];
        if (x >= this.TECH_POINT_CAP) {
            return; // Cap reached
        }

        const dropChance = (0.015 + Math.log10(x + 3) * 0.02 + 0.0001 * x) * dropRateFactor;
        const random = Math.random();
        console.log(`Tech increment check: current tech=${x}, ${random} <= dropChance=${dropChance.toFixed(4)}`);
        if (random <= dropChance) {
            console.log(`Tech increased from ${x} to ${x + 1}`);
            this.tech[key] += 1;
            this.floatingIndicatorManager.spawnTech(this.body.position);
        }
    }

    // Potentially increment skill tech for the given skill type
    tryIncrementSkillTech(type: SkillTechType): void {
        const x = this.skillTech[type];
        if (x >= this.SKILL_TECH_POINT_CAP) {
            return; // Cap reached
        }

        const dropChance = 0.015 + Math.log10(x + 3) * 0.02 + 0.00004 * x;
        if (Math.random() <= dropChance) {
            this.skillTech[type] = Math.min(x + 1, this.SKILL_TECH_POINT_CAP);
            this.floatingIndicatorManager.spawnTech(this.body.position);
        }
    }

    // Return the current tier for a given skill type based on its tech points
    getSkillTier(type: SkillTechType): Tier {
        return TierManager.Instance.getSkillTierForTech(this.skillTech[type]);
    }

    // Compute damage for a single hit, applying strength and critical hit multipliers
    private getHitDamage(isCriticalHit: boolean, baseMultiplier: number = 1): number {
        const equipped = this.inventory.find(i => i instanceof WeaponItem && i.isEquipped) as WeaponItem | undefined;
        if (!equipped) {
            return 0;
        }

        const strengthMultiplier = 1 + this.getStrengthMultiplier();
        console.log(`Calculating damage: strengthMultiplier=${strengthMultiplier.toFixed(2)}`);

        const critMultiplier = isCriticalHit ? this.getCriticalHitMultiplier() : 1.0;

        // Damage is directly from weapon (which already has level scaling in weapons.json)
        const damage = Math.floor(this.weapon.damage * baseMultiplier * strengthMultiplier * critMultiplier);

        return damage;
    }

    private setupAnimations() {
        // Clear BaseMesh mixer to avoid conflict
        this.mixers = [];

        this.mixer = new THREE.AnimationMixer(this.mesh);

        const gltf = AssetManager.Instance.get('models/main_character.glb');
        const animations = gltf.animations;

        if (animations && animations.length > 0) {
            // Helper to find animation by name
            const getClip = (name: string) => animations.find(a => a.name === name);

            const idleClip = getClip(ActionType.Idle);
            const runOneHandedClip = getClip(ActionType.RunOneHanded);
            const runTwoHandedClip = getClip(ActionType.RunTwoHanded);
            const jumpClip = getClip(ActionType.Jump);
            const takeHitClip = getClip(ActionType.TakeHit);
            const attackOneHandClip = getClip(ActionType.AttackOneHanded);
            const attackTwoHandClip = getClip(ActionType.AttackTwoHanded);
            const startChargeClip = getClip(ActionType.StartCharge);
            const dashClip = getClip(ActionType.Dash);
            const deathClip = getClip(ActionType.Death);
            const powerUpClip = getClip(ActionType.PowerUp);

            if (idleClip) {
                const action = this.mixer.clipAction(idleClip);
                this.actions[ActionType.Idle] = action;
            }
            if (runOneHandedClip) {
                const action = this.mixer.clipAction(runOneHandedClip);
                this.actions[ActionType.RunOneHanded] = action;
            }
            if (runTwoHandedClip) {
                const action = this.mixer.clipAction(runTwoHandedClip);
                this.actions[ActionType.RunTwoHanded] = action;
            }
            if (jumpClip) {
                let action = this.mixer.clipAction(jumpClip);
                action.loop = THREE.LoopOnce;
                action.timeScale = 1.3;
                action.clampWhenFinished = true;
                this.actions[ActionType.Jump] = action;
            }
            if (takeHitClip) {
                const action = this.mixer.clipAction(takeHitClip);
                action.timeScale = 1.6;
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[ActionType.TakeHit] = action;
            }
            if (startChargeClip) {
                const action = this.mixer.clipAction(startChargeClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[ActionType.StartCharge] = action;
            }
            if (dashClip) {
                const action = this.mixer.clipAction(dashClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[ActionType.Dash] = action;
            }
            if (attackOneHandClip) {
                const action = this.mixer.clipAction(attackOneHandClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                // Speed up attack animation to match gameplay feel if needed
                action.timeScale = 1.6;
                this.actions[ActionType.AttackOneHanded] = action;
            }
            if (attackTwoHandClip) {
                const action = this.mixer.clipAction(attackTwoHandClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                // Speed up attack animation to match gameplay feel if needed
                action.timeScale = 1.6;
                this.actions[ActionType.AttackTwoHanded] = action;
            }
            if (deathClip) {
                const action = this.mixer.clipAction(deathClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[ActionType.Death] = action;
            }
            if (powerUpClip) {
                const action = this.mixer.clipAction(powerUpClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[ActionType.PowerUp] = action;
            }

            // Listen for animation finished events
            this.mixer.addEventListener('finished', (e) => {
                const finishedAction = e.action;
                if (finishedAction === this.actions[ActionType.AttackOneHanded] ||
                    finishedAction === this.actions[ActionType.AttackTwoHanded]) {
                    this.weapon.stopAttack();
                    this.attackHitEnemies.clear();
                }
                // Handle PowerUp animation completion
                if (finishedAction === this.actions[ActionType.PowerUp]) {
                    this.isLevelingUp = false;
                }
            });
        }

        // Start Idle
        this.fadeToAction(ActionType.Idle, 0.0);
    }

    private fadeToAction(actionType: ActionType, duration: number) {
        const activeAction = this.actions[actionType];
        const previousAction = this.currentAction;

        if (previousAction !== activeAction && activeAction) {
            if (previousAction) {
                previousAction.fadeOut(duration);
            }
            activeAction.reset().fadeIn(duration).play();
            this.currentAction = activeAction;
        }
    }

    private updateAnimations(preventMovement: boolean) {
        if (this.isDead) {
            return;
        }

        // Highest priority: Level up PowerUp animation
        const powerUpAction = this.actions[ActionType.PowerUp];
        if (this.isLevelingUp && powerUpAction && powerUpAction.isRunning()) {
            return;
        }

        // High priority: Take Hit
        const takeHitAction = this.actions[ActionType.TakeHit];
        if (this.currentAction === takeHitAction && takeHitAction && takeHitAction.isRunning()) {
            return;
        }

        // High priority: Blocking - holds idle pose, overrides move/attack/jump
        if (this.isBlocking) {
            return;
        }

        // High priority: Charging attack - block other animations
        if (this.isChargingAttack) {
            return;
        }

        // High priority: Skill animation
        if (this.isUsingSkill) {
            if (this.currentAction !== this.actions[ActionType.AttackOneHanded]) {
                this.fadeToAction(this.weapon.weaponType === WeaponType.HAMMER ? ActionType.AttackTwoHanded : ActionType.AttackOneHanded, 0.001);
            }
            return;
        }

        // High priority: Attack
        if (this.weapon.isAttacking) {
            if (this.currentAction !== this.actions[ActionType.AttackOneHanded]) {
                this.fadeToAction(this.weapon.weaponType === WeaponType.HAMMER ? ActionType.AttackTwoHanded : ActionType.AttackOneHanded, 0.001);
            }
            return;
        }

        // Jump / Fall
        // Only trigger jump animation if strictly not grounded
        if (!this.isGrounded) {
            if (this.currentAction !== this.actions[ActionType.Jump]) {
                this.fadeToAction(ActionType.Jump, 0.1);
            }
            return;
        }

        // Run / Idle
        const isMoving = !preventMovement && this.input.getMovementVector().length() > 0.1;
        if (isMoving) {
            const action = this.weapon.weaponType !== WeaponType.HAMMER ? ActionType.RunOneHanded : ActionType.RunTwoHanded;
            this.fadeToAction(action, 0.05);
        } else {
            this.fadeToAction(ActionType.Idle, 0.15);
        }
    }

    update(dt: number, isNearInteractive: boolean = false, preventMovement: boolean = false) {
        // Update animations
        if (this.mixer) {
            this.mixer.update(dt);
        }

        this.updateAnimations(preventMovement);

        if (preventMovement) {
            this.haltMovement();
            this.syncPosition();
            return;
        }

        if (this.isDead) return;

        // Update skills
        this.updateSkills(dt);

        // Handle skill animation (short-circuits the rest of the update)
        if (this.handleSkillAnimation(dt)) return;

        // Handle dash and charging (these short-circuit the rest of the update)
        if (this.handleDash(dt)) return;
        if (this.handleCharging(dt)) return;

        // Check for block input
        if (this.input.isBlockJustPressed()) {
            this.startBlock();
        }

        // Handle blocking (short-circuits movement and combat)
        if (this.handleBlock(dt)) return;

        // Skills handling
        this.handleSkills();

        // Movement and physics sync
        this.handleMovement(dt, isNearInteractive);
        this.syncPosition();

        // Combat (attacks / charge start / weapon updates)
        this.handleCombat(dt);

        // Clear attack lock when button released
        if (this.input.isAttackReleased()) this.attackLockedUntilRelease = false;

        // Invulnerability flash and timers
        this.handleInvulnerability(dt)

        // Update level-up shockwave timer
        this.updateLevelUpShockwave(dt);

        // Update level-up particles and input state
        this.updateLevelUpParticles(dt);
        this.input.updateState();
    }

    private handleDash(dt: number): boolean {
        if (!this.isDashing) return false;
        this.fadeToAction(ActionType.Dash, 0.0);
        this.dashTimer += dt;
        // Ensure body is dynamic for dash movement
        this.body.type = CANNON.Body.DYNAMIC;
        this.body.velocity.x = this.dashDirection.x * this.DASH_SPEED;
        this.body.velocity.z = this.dashDirection.z * this.DASH_SPEED;

        this.updateChargeFx(dt);
        this.checkDashHitbox();

        if (this.dashTimer >= this.DASH_DURATION) {
            this.isDashing = false;
            this.dashHitEnemies.clear();
            
            // Remove charge fx
            this.removeChargeFx();
        }
        this.syncPosition();
        return true;
    }

    /**
     * Check a 1m radius sphere hitbox centered at the player's center sphere
     * position for dash attack hit detection against enemies and breakables.
     * This hitbox is separate from the player collision body and is only used
     * for hit detection during the dash attack.
     */
    private checkDashHitbox(): void {
        const centerOffset = this.BODY_HEIGHT / 3;
        const hitboxX = this.body.position.x;
        const hitboxY = this.body.position.y + centerOffset;
        const hitboxZ = this.body.position.z;

        for (const body of this.body.world!.bodies) {
            const entity = (body as any).entity;
            if (!entity) continue;

            const dx = body.position.x - hitboxX;
            const dy = body.position.y - hitboxY;
            const dz = body.position.z - hitboxZ;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist <= this.DASH_HITBOX_RADIUS) {
                if (entity instanceof Enemy) {
                    this.handleDashHit(entity);
                } else if (isBreakable(entity) && !entity.isDestroyed) {
                    this.handleBreakableHit(entity);
                }
            }
        }
    }

    private handleCharging(dt: number): boolean {
        if (!this.isChargingAttack) return false;

        // Force charging animation regardless of other states
        if (this.currentAction !== this.actions[ActionType.StartCharge]) {
            this.fadeToAction(ActionType.StartCharge, 0.05);
        }

        this.chargeTimer += dt;
        this.invulnerableTimer = 0; // allow damage while charging
        this.updateChargeFx(dt);

        if (this.input.isAttackReleased()) {
            if (this.chargeTimer >= this.CHARGE_DURATION) {
                this.executeDashAttack();
            } else {
                this.cancelChargeAttack();
            }
        }

        this.haltMovement();
        this.syncPosition();
        return true;
    }

    private handleMovement(dt: number, isNearInteractive: boolean) {
        const inputVector = this.input.getMovementVector();

        if (this.jumpCooldownTimer > 0) {
            this.jumpCooldownTimer -= dt;
        }

        // Block movement during level-up animation
        if (this.isLevelingUp) {
            this.footstepTimer = 0;
            this.haltMovement();
            return;
        }

        // Block movement during skill usage
        if (this.isUsingSkill) {
            this.footstepTimer = 0;
            this.haltMovement();
            return;
        }

        if (this.stunTimer > 0) {
            this.footstepTimer = 0;
            this.stunTimer -= dt;
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            return;
        }

        if (!this.weapon.isAttacking) {
            const angle = -Math.PI / 4;
            const moveX = inputVector.x * Math.cos(angle) - inputVector.y * Math.sin(angle);
            const moveZ = inputVector.x * Math.sin(angle) + inputVector.y * Math.cos(angle);

            if (inputVector.length() > 0.1) {
                const rotationAngle = Math.atan2(moveX, moveZ);
                const targetQuaternion = new THREE.Quaternion();
                targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);
                this.mesh.quaternion.slerp(targetQuaternion, 15 * dt);
            }

            // Apply walk speed multiplier from chips
            let effectiveSpeed = this.WALK_SPEED;
            const equippedChip = this.inventory.find(item => item instanceof ChipItem && item.isEquipped) as ChipItem | undefined;
            if (equippedChip && equippedChip.stats.walkSpeedMultiplier !== undefined) {
                effectiveSpeed *= equippedChip.stats.walkSpeedMultiplier;
            }

            this.body.velocity.x = moveX * effectiveSpeed;
            this.body.velocity.z = moveZ * effectiveSpeed;

            // Check if grounded using raycast
            const start = this.body.position;
            const shape = this.body.shapes[0] as CANNON.Sphere;
            const halfHeight = shape?.radius;
            const end = new CANNON.Vec3(start.x, start.y - halfHeight - 0.2, start.z);

            // Main ray at the center of the body
            const centerRay = new CANNON.Ray(start, end);
            centerRay.skipBackfaces = true;

            // Additional rays around the base perimeter
            const offset = shape.radius * 0.7;

            const perimeterRayResults = [];
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI) / 2;
                const xOffset = Math.cos(angle) * offset;
                const zOffset = Math.sin(angle) * offset;
                const rayStart = new CANNON.Vec3(start.x + xOffset, start.y, start.z + zOffset);
                const rayEnd = new CANNON.Vec3(rayStart.x, rayStart.y - halfHeight - 0.2, rayStart.z)
                const perimeterRay = new CANNON.Ray(rayStart, rayEnd);
                perimeterRay.skipBackfaces = true;
                const result = new CANNON.RaycastResult();
                perimeterRay.intersectWorld(this.world, { mode: CANNON.Ray.CLOSEST, result: result, skipBackfaces: true });
                perimeterRayResults.push(result);
            }

            const centerRayResult = new CANNON.RaycastResult();

            centerRay.intersectWorld(this.world, { mode: CANNON.Ray.CLOSEST, result: centerRayResult, skipBackfaces: true });

            this.isGrounded = centerRayResult.hasHit && centerRayResult.body !== this.body
                || perimeterRayResults.some(result => result.hasHit && result.body !== this.body);

            // Prevent sliding on slopes less than 45 degrees
            if (this.isGrounded && centerRayResult.hitNormalWorld) {
                const normal = centerRayResult.hitNormalWorld;
                // Clamp normal.y to prevent Math.acos errors due to floating point precision
                const slopeAngle = Math.acos(Math.max(-1, Math.min(1, normal.y))); // Angle from vertical (up vector is 0,1,0)
                const slopeAngleDegrees = slopeAngle * (180 / Math.PI);

                // If on a slope less than 45 degrees make the body static to avoid sliding
                if (slopeAngleDegrees < 45
                    && this.body.velocity.y < 0
                    && Math.abs(this.body.velocity.x) < Number.EPSILON
                    && Math.abs(this.body.velocity.z) < Number.EPSILON) {
                    this.body.type = CANNON.Body.STATIC;
                }
            }

            // If the player starts moving again make the body dynamic again
            if (this.input.isJumpPressed() || Math.abs(inputVector.x) > Number.EPSILON || Math.abs(inputVector.y) > Number.EPSILON) {
                this.body.type = CANNON.Body.DYNAMIC;
            }

            if (this.input.isJumpPressed() && this.isGrounded && !isNearInteractive && this.jumpCooldownTimer <= 0) {
                this.body.velocity.y = this.JUMP_FORCE;
                this.jumpCooldownTimer = 1.0;
                this.footstepTimer = 0;
                AudioManager.Instance.playJump();
            }

            this.updateFootstepAudio(dt, inputVector.length() > 0.1);
        } else {
            this.footstepTimer = 0;
            this.haltMovement();
        }
    }

    private handleCombat(dt: number) {
        if (this.attackLockedUntilRelease) return;

        // Track attack press for charge timer
        if (this.input.isAttackJustPressed()) this.chargeDelayTimer = 0;

        // Immediate attack (requires fresh press and not charging)
        if (this.input.isAttackJustPressed() && !this.weapon.isAttacking && !this.isChargingAttack) {
            this.weapon.attack(this.getWeaponRangeMultiplier());
            AudioManager.Instance.playAttack('player');
        }

        // Charging
        if (this.input.isAttackHeld() && !this.isChargingAttack) {
            this.chargeDelayTimer += dt;
            if (this.chargeDelayTimer >= this.CHARGE_DELAY && !this.weapon.isAttacking) {
                this.startChargeAttack();
            }
        } else if (!this.input.isAttackHeld()) {
            this.chargeDelayTimer = 0;
        }

        // Weapon update & hit checks
        this.weapon.update(dt);

        // Manual breakable detection during weapon attacks.
        // Cannon-es broadphase skips static-static pairs, so the weapon
        // trigger body (static) cannot detect static barrel bodies via
        // physics events. Instead, check distance from the weapon hitbox
        // to all breakable entities each frame while attacking.
        // This follows the same pattern used by skill attacks (AreaAttackSkill,
        // LaserBeamSkill) which also iterate world.bodies for breakable detection.
        if (this.weapon.isAttacking && this.weapon.body) {
            const weaponPos = this.weapon.body.position;
            const weaponShape = this.weapon.body.shapes[0] as CANNON.Cylinder;
            const weaponRadius = weaponShape ? weaponShape.radiusTop : 0.5;

            for (const body of this.body.world!.bodies) {
                const entity = (body as any).entity;
                if (isBreakable(entity) && !entity.isDestroyed) {
                    const dx = body.position.x - weaponPos.x;
                    const dy = body.position.y - weaponPos.y;
                    const dz = body.position.z - weaponPos.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    // Use the breakable's own collision shape radius for hit detection
                    const breakableShape = body.shapes[0] as CANNON.Cylinder;
                    const breakableRadius = breakableShape?.radiusTop ?? 0.4;
                    if (dist <= weaponRadius + breakableRadius) {
                        this.handleBreakableHit(entity);
                    }
                }
            }
        }
    }

    private startBlock(): void {
        if (this.isBlocking || this.isDead || this.isDashing || this.isChargingAttack || this.isUsingSkill || this.weapon.isAttacking || !this.isGrounded) return;

        this.isBlocking = true;
        this.blockTimer = 0;
        this.haltMovement();
        // TODO: fade to a dedicated "Blocking" animation when available
        this.fadeToAction(ActionType.Idle, 0.1);

        if (!this.blockShield) {
            this.blockShield = new BlockShield();
        }
        this.blockShield.attachTo(this.mesh);
    }

    private handleBlock(dt: number): boolean {
        if (!this.isBlocking) return false;

        this.blockTimer += dt;

        if (this.stunTimer > 0 || this.blockTimer < this.BLOCK_DURATION) {
            // Allow knockback to play out - decelerate instead of halting
            this.stunTimer -= dt;
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
        } else {
            this.haltMovement();
            this.isBlocking = false;
            this.blockShield?.detach();
        }

        this.syncPosition();

        return true;
    }

    private handleInvulnerability(dt: number) {
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
            if (Math.floor(this.invulnerableTimer * 10) % 2 === 0) {
                (this.innerMesh?.material as THREE.MeshStandardMaterial).color = new THREE.Color(0x888888);
            } else {
                (this.innerMesh?.material as THREE.MeshStandardMaterial).color = new THREE.Color(0xffffff);
            }
        } else {
            (this.innerMesh?.material as THREE.MeshStandardMaterial).color = new THREE.Color(0xffffff);
        }
    }

    private updateSkills(dt: number): void {
        // Update all skill cooldowns and particles
        this.skills.forEach(skill => skill.update(dt));
    }

    private handleSkills(): void {
        // Check for skill inputs
        if (this.input.isSkill1JustPressed() && this.isSkillUnlocked(0)) {
            this.useSkill(0); // Laser Beam
        } else if (this.input.isSkill2JustPressed() && this.isSkillUnlocked(1)) {
            this.useSkill(1); // Healing
        } else if (this.input.isSkill3JustPressed() && this.isSkillUnlocked(2)) {
            this.useSkill(2); // Area Attack
        }
    }

    private useSkill(skillIndex: number): void {
        if (!this.isSkillUnlocked(skillIndex)) {
            return;
        }

        if (this.isUsingSkill || this.weapon.isAttacking || this.isChargingAttack || this.isDashing) {
            console.log('Cannot use skill - busy with another action');
            return;
        }

        const skill = this.skills[skillIndex];
        if (!skill) {
            console.log('Skill not found');
            return;
        }

        // Execute the skill
        if (skill.use(this, this.scene, this.world)) {
            console.log(`Used skill: ${skill.name}`);

            // Start skill animation
            this.isUsingSkill = true;
            this.skillAnimationTimer = 0;

            // Stop movement during skill
            this.haltMovement();
        }
    }

    private handleSkillAnimation(dt: number): boolean {
        if (!this.isUsingSkill) return false;

        this.skillAnimationTimer += dt;

        // Keep player stopped during animation
        this.haltMovement();
        this.syncPosition();
        return true;
    }

    syncPosition() {
        // Align the visual mesh with the physics body (position offset for proper height)
        const newPosition = new THREE.Vector3(this.body.position.x, this.body.position.y - 0.3, this.body.position.z);
        this.position.copy(newPosition);
        this.mesh.position.copy(newPosition);

        // Scale shadow based on height above ground: 1.0 at ground → 0.5 at 2m above
        const SHADOW_MAX_HEIGHT = 2.0;
        const SHADOW_SCALE_MIN = 0.5;
        const SHADOW_RAYCAST_MARGIN = 1.0; // extra depth below max height for safety
        const footOffset = this.BODY_HEIGHT / 2; // distance from body center to feet
        const rayStart = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
        const rayEnd = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y - footOffset - SHADOW_MAX_HEIGHT - SHADOW_RAYCAST_MARGIN,
            this.body.position.z
        );
        const groundRay = new CANNON.Ray(rayStart, rayEnd);
        const groundRayResult = new CANNON.RaycastResult();
        groundRay.intersectWorld(this.world, { mode: CANNON.Ray.CLOSEST, result: groundRayResult, skipBackfaces: true });

        let shadowScale = SHADOW_SCALE_MIN;
        // Fallback floor position: at entity's feet with flat orientation
        let shadowY = this.body.position.y - footOffset;
        let shadowNormal: THREE.Vector3 | undefined;

        if (groundRayResult.hasHit && groundRayResult.body !== this.body) {
            const groundDist = Math.max(0, this.body.position.y - footOffset - groundRayResult.hitPointWorld.y);
            shadowScale = Math.max(SHADOW_SCALE_MIN, 1.0 - (groundDist / SHADOW_MAX_HEIGHT) * (1.0 - SHADOW_SCALE_MIN));
            shadowY = groundRayResult.hitPointWorld.y;
            shadowNormal = new THREE.Vector3(
                groundRayResult.hitNormalWorld.x,
                groundRayResult.hitNormalWorld.y,
                groundRayResult.hitNormalWorld.z,
            );
        }
        this.blobShadow.setScale(shadowScale);
        this.blobShadow.update(this.body.position.x, shadowY, this.body.position.z, shadowNormal);
    }

    /**
     * Gradually slow down horizontal movement by a factor
     */
    private haltMovement(): void {
        this.body.velocity.x = 0;
        this.body.velocity.z = 0;
    }

    private updateFootstepAudio(dt: number, isMoving: boolean): void {
        if (!isMoving || !this.isGrounded) {
            this.footstepTimer = 0;
            return;
        }

        if (this.footstepTimer <= 0) {
            AudioManager.Instance.playFootstep('player');
            this.footstepTimer = 0.34;
            return;
        }

        this.footstepTimer -= dt;
    }

    move(position: CANNON.Vec3): void {
        console.log('Moving player to', position);
        this.body.type = CANNON.Body.DYNAMIC;
        this.body.position.copy(position);
        this.syncPosition();
    }

    /**
     * Get the player's forward direction vector
     */
    getForwardDirection(): THREE.Vector3 {
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.mesh.quaternion);
        forward.y = 0;
        forward.normalize();
        return forward;
    }

    /**
     * Get the player's Y-axis rotation in radians
     */
    getRotationY(): number {
        const forward = this.getForwardDirection();
        return Math.atan2(forward.x, forward.z);
    }

    private handleDashHit(enemy: Enemy) {
        if (enemy.isDead || enemy.isDying) return;

        // Skip if we already hit this enemy during this dash
        if (this.dashHitEnemies.has(enemy)) return;

        // Deal 3x weapon damage with tech multiplier
        const isCriticalHit = Math.random() < this.getCriticalChance();
        const damage = this.getHitDamage(isCriticalHit, 3);
        enemy.takeDamage(damage, isCriticalHit, this.body.position);

        this.tryIncrementWeaponTech(enemy.techDropRateFactor);

        // Mark this enemy as hit during this dash
        this.dashHitEnemies.add(enemy);
    }

    private handleAttackHit(enemy: Enemy) {
        if (enemy.isDead || enemy.isDying) return;

        // Skip if we already hit this enemy during this attack
        if (this.attackHitEnemies.has(enemy)) return;

        const isCriticalHit = Math.random() < this.getCriticalChance();
        const damage = this.getHitDamage(isCriticalHit);
        enemy.takeDamage(damage, isCriticalHit, this.body.position);
        console.log(`Hit enemy with ${this.currentWeaponType}! Damage: ${damage}`);

        this.tryIncrementWeaponTech(enemy.techDropRateFactor);

        // Mark this enemy as hit during this attack
        this.attackHitEnemies.add(enemy);
    }

    private handleBreakableHit(breakable: Breakable): void {
        if (breakable.isDestroyed) return;
        if (this.onBreakableHit) {
            this.onBreakableHit(breakable);
        }
    }

    takeDamage(amount: number, sourcePos?: CANNON.Vec3, isCriticalHit: boolean = false): void {
        if (this.invulnerableTimer > 0 || this.isLevelingUp || this.isDashing || this.isDead) return;

        // Knockback is always applied, even when blocking, to push the player away from enemies
        if (sourcePos) {
            this.stunTimer = this.STUN_TIME;
            // Ensure body is dynamic for knockback to work
            this.body.type = CANNON.Body.DYNAMIC;
            const knockDir = this.body.position.vsub(sourcePos);
            knockDir.y = 0;
            if (knockDir.length() > 0) {
                knockDir.normalize();
                this.body.applyImpulse(new CANNON.Vec3(knockDir.x * this.KNOCKBACK_FORCE, 5, knockDir.z * this.KNOCKBACK_FORCE), knockDir);
            }
        }

        // Block absorbs damage completely but does not prevent knockback
        if (this.isBlocking) return;

        // Stop any ongoing attack
        this.weapon.stopAttack();

        // Apply defense multiplier to reduce damage
        const defenseMultiplier = 1 - this.getDefenseMultiplier();
        const reducedDamage = Math.max(1, Math.floor(amount * defenseMultiplier));

        this.hp -= reducedDamage;
        this.floatingIndicatorManager.spawnDamage(this.body.position, reducedDamage, isCriticalHit ? 'rgb(213, 0, 181)' : '#ff2424ff');
        AudioManager.Instance.playDamage('player');

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return;
        }

        // Apply brief invulnerability
        this.invulnerableTimer = this.HIT_INVULNERABILITY; // 1 second invulnerability

        // Trigger hit animation
        this.fadeToAction(ActionType.TakeHit, 0.05);

        // Cancel charging attack if taking damage and suppress immediate follow-up attack
        if (this.isChargingAttack) this.cancelChargeAttack()

        console.log(`Player took ${reducedDamage} damage (${amount} reduced by defense). HP: ${this.hp}`);
    }

    /**
     * Handle player death
     */
    private die(): void {
        this.isDead = true;
        this.footstepTimer = 0;
        console.log('Player died');
        AudioManager.Instance.playDeath('player');

        this.fadeToAction(ActionType.Death, 0.1);

        // Trigger death callback if set
        if (this.deathCallback) {
            this.deathCallback();
        }
    }

    /**
     * Set the callback to be called when player dies
     */
    setDeathCallback(callback: () => void): void {
        this.deathCallback = callback;
    }

    /**
     * Apply death penalty: subtract 10% of current bits and 10% of expRequired from exp.
     * Returns the actual amounts deducted so the caller can display floating indicators.
     * Should be called at the moment of death (before the death screen is shown) so
     * players cannot quit to avoid the punishment.
     */
    applyDeathPenalty(): { bitsLost: number; expLost: number } {
        const bitsLost = Math.floor(this.bits * 0.1);
        const expLost = Math.floor(this.expRequired * 0.1);

        this.bits = Math.max(0, this.bits - bitsLost);
        this.exp = Math.max(0, this.exp - expLost);

        console.log(`Death penalty applied: -${bitsLost} Bits, -${expLost} EXP`);
        return { bitsLost, expLost };
    }

    /**
     * Respawn the player at specified position
     */
    respawn(position: CANNON.Vec3): void {
        this.isDead = false;
        this.hp = this.maxHp;
        this.tp = this.maxTp;
        this.invulnerableTimer = 2.0; // 2 seconds invulnerability after respawn

        // Reset position and velocity
        this.body.position.copy(position);
        this.body.velocity.set(0, 0, 0);

        console.log('Player respawned at', position);
    }

    /**
     * Heal the player by the specified amounts
     * @param hpAmount - Amount of HP to restore
     * @param tpAmount - Amount of TP to restore
     * @param showNumber - Whether to show the healing numbers
     */
    heal(hpAmount: number, tpAmount: number = 0, showNumber: boolean = false): void {
        const healMult = this.getHealingMultiplier();
        const boostedHp = hpAmount > 0 ? Math.floor(hpAmount * healMult) : 0;
        const boostedTp = tpAmount > 0 ? Math.floor(tpAmount * healMult) : 0;

        if (boostedHp > 0 && this.hp < this.maxHp) {
            const actualHpHeal = Math.min(boostedHp, this.maxHp - this.hp);
            this.hp += actualHpHeal;
            if (showNumber) {
                console.log(`Player healed for ${actualHpHeal} HP. Current HP: ${this.hp}/${this.maxHp}`);
                this.floatingIndicatorManager.spawnHeal(this.body.position, actualHpHeal);
            }
        }
        if (boostedTp > 0 && this.tp < this.maxTp) {
            const actualTpHeal = Math.min(boostedTp, this.maxTp - this.tp);
            this.tp += actualTpHeal;
            if (showNumber) {
                this.floatingIndicatorManager.spawnTp(this.body.position, actualTpHeal);
            }
        }
    }

    private startChargeAttack() {
        this.isChargingAttack = true;
        this.chargeTimer = 0;
        this.createChargeFx();
    }

    private cancelChargeAttack() {
        this.isChargingAttack = false;
        this.chargeTimer = 0;
        this.removeChargeFx();
        this.attackLockedUntilRelease = true;
    }

    private executeDashAttack() {
        this.isChargingAttack = false;
        this.isDashing = true;
        this.dashTimer = 0;
        this.dashHitEnemies.clear();
        AudioManager.Instance.playAttack('player', true);

        // Set dash direction to player's facing direction
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        this.dashDirection.copy(forward);
    }

    private createChargeFx() {
        if (this.chargeFxMaterial) {
            this.chargeFxMaterial.opacity = 0; // Reset opacity for fade-in
        }
        this.mesh.add(this.chargeFx);
    }

    private updateChargeFx(dt: number) {
        // Particles are children of the player mesh, so they automatically follow
        // Add pulsing animation and raise height when fully charged
        const pulseScaleFactor = 1 + Math.sin(this.chargeTimer * 15) * 0.1;

        // When fully charged, raise particles higher
        const isFullyCharged = this.chargeTimer >= this.CHARGE_DURATION;

        // Update mesh scale
        this.chargeFx.scale.set(pulseScaleFactor, isFullyCharged ? pulseScaleFactor : pulseScaleFactor * 0.6, pulseScaleFactor);

        // Update charge fx material to fade in and out
        if (this.chargeFxMaterial) {
            if (this.isChargingAttack) {
                // Fade in
                this.chargeFxMaterial.opacity = THREE.MathUtils.clamp(this.chargeTimer / this.CHARGE_DURATION, 0, 1);
            } else if (this.dashTimer >= this.DASH_DURATION - this.CHARGE_FADE_OUT_DURATION) {
                // Fade out
                const fadeOutTime = this.dashTimer - (this.DASH_DURATION - this.CHARGE_FADE_OUT_DURATION);
                this.chargeFxMaterial.opacity = THREE.MathUtils.clamp(1 - fadeOutTime / this.CHARGE_FADE_OUT_DURATION, 0, 1);       
            }
        }

        // Update texture offset for scrolling effect
        if (this.chargeFxTexture) {
            this.chargeFxTexture.offset.x -= this.CHARGEFX_SCROLL_SPEED * dt * (isFullyCharged ? 1.0 : 0.7);
        }
    }

    private removeChargeFx() {
        this.mesh.remove(this.chargeFx);
    }

    private createLevelUpParticles() {
        // Create a burst of yellow particles that explode outward from the player
        const particleCount = 100;

        // Create shared material for all particles
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00, // Yellow
            emissive: 0xffff00,
            emissiveIntensity: 1, // Increased for brighter particles
            transparent: true,
            opacity: 1.0
        });

        // Create particles in all directions (spherical explosion)
        for (let i = 0; i < particleCount; i++) {
            // Random spherical coordinates for explosion direction
            const theta = Math.random() * Math.PI * 2; // Azimuth angle (0 to 2π)
            const phi = Math.random() * Math.PI; // Polar angle (0 to π)

            // Convert to Cartesian coordinates for velocity
            const randomSeed = Math.random();
            const speed = 8 + randomSeed; // Random speed between 8-9 units/sec
            const vx = speed * Math.sin(phi) * Math.cos(theta);
            const vy = speed * Math.sin(phi) * Math.sin(theta) * 0.2 + 5;
            const vz = speed * Math.cos(phi);

            // Clone material for each particle (needed for independent opacity during fade)
            const particleSize = 0.075 + (1 - randomSeed) * 0.1;
            const particleGeometry = new THREE.SphereGeometry(particleSize, 12, 12).scale(1, 0.5, 1);
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
            particle.position.copy(this.mesh.position);
            particle.position.y += 0.5; // Start at player center

            const velocity = new THREE.Vector3(vx, vy, vz);

            this.levelUpParticles.push({ mesh: particle, velocity });
            this.mesh.parent?.add(particle); // Add to scene, not to player mesh
        }

        // Reset timer
        this.levelUpParticleTimer = 0;
    }

    private updateLevelUpParticles(dt: number) {
        if (this.levelUpParticles.length === 0) return;

        this.levelUpParticleTimer += dt;
        const progress = this.levelUpParticleTimer / this.LEVEL_UP_PARTICLE_LIFETIME;

        // Remove particles after lifetime expires
        if (progress >= 1.0) {
            this.removeLevelUpParticles();
            return;
        }

        // Update each particle
        for (const particle of this.levelUpParticles) {
            // Move particle based on velocity
            particle.mesh.position.x += particle.velocity.x * dt;
            particle.mesh.position.y += particle.velocity.y * dt;
            particle.mesh.position.z += particle.velocity.z * dt;

            // Apply gravity to velocity
            particle.velocity.y -= 9.8 * dt;

            // Fade out
            const material = particle.mesh.material as THREE.MeshStandardMaterial;
            material.opacity = 1.0 - progress;

            // Scale down
            const scale = 1.0 - progress * 0.5;
            particle.mesh.scale.set(scale, scale, scale);
        }
    }

    private removeLevelUpParticles() {
        // Dispose geometry only once (it's shared among all particles)
        if (this.levelUpParticles.length > 0) {
            const sharedGeometry = this.levelUpParticles[0].mesh.geometry;

            this.levelUpParticles.forEach(particle => {
                if (particle.mesh.parent) {
                    particle.mesh.parent.remove(particle.mesh);
                }
                // Dispose each particle's unique material
                (particle.mesh.material as THREE.Material).dispose();
            });

            // Dispose the shared geometry once
            sharedGeometry.dispose();
        }

        this.levelUpParticles = [];
        this.levelUpParticleTimer = 0;
    }

    /**
     * Collect X-Data
     */
    collectXData(amount: number): void {
        this.xData += amount;
        console.log(`Collected ${amount} X-Data. Total: ${this.xData}`);
    }

    /**
     * Collect Booster Pack
     */
    collectBoosterPack(): void {
        this.boosterPacks += 1;
        console.log(`Collected Booster Pack. Total: ${this.boosterPacks}`);
    }

    /**
     * Calculate EXP required for next level
     * Formula: 1000 + level*30 + level^2 * 0.07
     */
    private calculateExpRequired(level: number): number {
        return Math.floor(
            this.EXP_BASE +
            level * this.EXP_LINEAR_FACTOR +
            Math.pow(level, 2) * this.EXP_QUADRATIC_FACTOR
        );
    }

    /**
     * Gain EXP and handle level ups
     * @param amount - Amount of EXP to gain
     */
    gainExp(amount: number): number {
        if (this.level >= this.MAX_LEVEL) {
            console.log('Player is at max level');
            return 0;
        }

        // Apply luck multiplier to EXP gain
        const luckBonusExp = amount * 0.05 * Math.log10(this.luck + 20); // +20 to smooth the curve for low luck values
        const adjustedAmount = Math.floor(amount + luckBonusExp);

        this.exp += adjustedAmount;
        console.log(`Gained ${adjustedAmount} EXP (${amount} base + ${luckBonusExp} luck bonus). Current: ${this.exp}/${this.expRequired}`);

        // Check for level up(s)
        while (this.exp >= this.expRequired && this.level < this.MAX_LEVEL) {
            this.levelUp();
        }

        return adjustedAmount;
    }

    /**
     * Level up the player
     */
    private levelUp(): void {
        const previousLevel = this.level;
        this.exp -= this.expRequired;
        this.level++;
        this.emitSkillUnlockEvents(previousLevel, this.level);

        // Award 4 stat points
        this.statPointsAvailable += 4;

        // Calculate new required EXP for next level
        if (this.level < this.MAX_LEVEL) {
            this.expRequired = this.calculateExpRequired(this.level);
        }

        // Recalculate stats with level multiplier
        this.recalculateStats();

        // Heal player up to max HP and TP
        this.heal(this.maxHp, this.maxTp);

        // Start level-up animation (movement blocked until animation completes)
        this.isLevelingUp = true;
        this.fadeToAction(ActionType.PowerUp, 0.1);

        // Start shockwave timer
        this.shockwavePending = true;
        this.levelUpShockwaveTimer = 0;
        AudioManager.Instance.playLevelUp();

        console.log(`Level Up! Now level ${this.level}. Next level requires ${this.expRequired} EXP. ${this.statPointsAvailable} stat points available.`);
    }

    private getSkillUnlockLevel(skillIndex: number): number {
        switch (skillIndex) {
            case 0: return this.HEAL_UNLOCK_LEVEL;
            case 1: return this.LASER_UNLOCK_LEVEL;
            case 2: return this.AREA_UNLOCK_LEVEL;
            default: return Number.MAX_SAFE_INTEGER;
        }
    }

    public isSkillUnlocked(skillIndex: number): boolean {
        return this.level >= this.getSkillUnlockLevel(skillIndex);
    }

    private emitSkillUnlockEvents(previousLevel: number, currentLevel: number): void {
        if (!this.onSkillUnlocked) return;

        for (let i = 0; i < this.skills.length; i++) {
            const unlockLevel = this.getSkillUnlockLevel(i);
            if (previousLevel < unlockLevel && currentLevel >= unlockLevel) {
                this.onSkillUnlocked(i);
            }
        }
    }

    /**
     * Update level-up shockwave timer and trigger shockwave after delay
     */
    private updateLevelUpShockwave(dt: number): void {
        if (!this.shockwavePending) return;

        this.levelUpShockwaveTimer += dt;
        if (this.levelUpShockwaveTimer >= this.LEVEL_UP_SHOCKWAVE_DELAY) {
            this.executeLevelUpShockwave();
            this.createLevelUpParticles();
            this.shockwavePending = false;
        }
    }

    /**
     * Execute shockwave attack hitting enemies within range
     */
    private executeLevelUpShockwave(): void {
        for (const body of this.world.bodies) {
            const entity = (body as any).entity;
            if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                const dx = body.position.x - this.body.position.x;
                const dz = body.position.z - this.body.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance <= this.LEVEL_UP_SHOCKWAVE_RANGE) {
                    const isCriticalHit = Math.random() < this.getCriticalChance();
                    const damage = this.getHitDamage(isCriticalHit);
                    entity.takeDamage(damage, isCriticalHit, this.body.position);
                    console.log(`Level-up shockwave hit enemy for ${damage} damage`);
                }
            }
        }
    }

    /**
     * Get the level bonus for HP
     */
    private getLevelHpBonus(): number {
        return Math.floor(this.LEVEL_HP_MULTIPLIER * (this.level - 1));
    }

    /**
     * Get the level bonus for TP
     */
    private getLevelTpBonus(): number {
        return Math.floor(this.LEVEL_TP_MULTIPLIER * (this.level - 1));
    }

    /**
     * Returns a factor in [1.0, 1.5] that scales weapon drop bonus spread with player level.
     * At level 1 the factor is 1.0 (base spread); at level 420+ it is 1.5 (+50% spread).
     * Uses a quadratic curve so the increase starts slowly and accelerates at higher levels.
     */
    get weaponDropBonusFactor(): number {
        const t = (this.level - 1) / (420 - 1);
        return Math.min(1 + 0.5 * t * t, 1.5);
    }

    /**
     * Calculate the cost for the next upgrade using Fibonacci numbers
     * Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144
     * Multiplied by upgrade level to get cost
     */
    getUpgradeCost(currentLevel: number): number {
        // Fibonacci sequence up to 144
        const fibonacci = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

        // Cap at index 11 (144)
        const index = Math.min(currentLevel, fibonacci.length - 1);
        return fibonacci[index];
    }

    /**
     * Upgrade a stat using X-Data
     * Returns true if upgrade was successful, false if not enough X-Data or stat is at max (9999)
     */
    upgradeWithXData(statType: StatType): boolean {
        let currentLevel = 0;
        let currentValue = 0;

        const levelHpBonus = this.getLevelHpBonus();
        const levelTpBonus = this.getLevelTpBonus();
        switch (statType) {
            case StatType.STRENGTH:
                currentLevel = this.strengthUpgrades;
                currentValue = this.baseStrength + this.strengthUpgrades + this.strengthPoints;
                break;
            case StatType.DEFENSE:
                currentLevel = this.defenseUpgrades;
                currentValue = this.baseDefense + this.defenseUpgrades + this.defensePoints;
                break;
            case StatType.AGILITY:
                currentLevel = this.agilityUpgrades;
                currentValue = this.baseAgility + this.agilityUpgrades + this.agilityPoints;
                break;
            case StatType.LUCK:
                currentLevel = this.luckUpgrades;
                currentValue = this.baseLuck + this.luckUpgrades + this.luckPoints;
                break;
            case StatType.HP:
                currentLevel = this.hpUpgrades;
                currentValue = this.baseHp + (this.hpUpgrades * this.HP_TP_UPGRADE_AMOUNT) + levelHpBonus;
                break;
            case StatType.TP:
                currentLevel = this.tpUpgrades;
                currentValue = this.baseTp + (this.tpUpgrades * this.HP_TP_UPGRADE_AMOUNT) + levelTpBonus;
                break;
        }

        // Check if stat would exceed cap
        const isHpOrTp = statType === StatType.HP || statType === StatType.TP;
        const upgradeAmount = isHpOrTp
            ? this.HP_TP_UPGRADE_AMOUNT
            : this.STRENGTH_DEFENSE_UPGRADE_AMOUNT;
        const maxStatValue = isHpOrTp ? (statType === StatType.HP ? this.MAX_HP_VALUE : this.MAX_TP_VALUE) : this.MAX_STAT_VALUE;
        if (currentValue + upgradeAmount > maxStatValue) {
            console.log(`${statType} is already at max value (${maxStatValue})`);
            return false;
        }

        const cost = this.getUpgradeCost(currentLevel);

        if (this.xData >= cost) {
            this.xData -= cost;

            switch (statType) {
                case StatType.STRENGTH:
                    this.strengthUpgrades++;
                    break;
                case StatType.DEFENSE:
                    this.defenseUpgrades++;
                    break;
                case StatType.AGILITY:
                    this.agilityUpgrades++;
                    break;
                case StatType.LUCK:
                    this.luckUpgrades++;
                    break;
                case StatType.HP:
                    this.hpUpgrades++;
                    // Heal player when upgrading HP
                    this.hp += this.HP_TP_UPGRADE_AMOUNT;
                    break;
                case StatType.TP:
                    this.tpUpgrades++;
                    // Restore TP when upgrading
                    this.tp += this.HP_TP_UPGRADE_AMOUNT;
                    break;
            }

            this.recalculateStats();
            console.log(`Upgraded ${statType} for ${cost} X-Data. Remaining: ${this.xData}`);
            return true;
        } else {
            console.log(`Not enough X-Data to upgrade ${statType}. Need ${cost}, have ${this.xData}`);
            return false;
        }
    }

    /**
     * Get base stat value without equipment modifiers (for UI display)
     * Returns base value + X-Data upgrades + stat points, capped at 9999
     */
    getBaseStatValue(statType: StatType): number {
        switch (statType) {
            case StatType.STRENGTH:
                return Math.min(this.baseStrength + this.strengthUpgrades + this.strengthPoints, this.MAX_STAT_VALUE);
            case StatType.DEFENSE:
                return Math.min(this.baseDefense + this.defenseUpgrades + this.defensePoints, this.MAX_STAT_VALUE);
            case StatType.HP:
                return Math.min(100 + (this.hpUpgrades * this.HP_TP_UPGRADE_AMOUNT), this.MAX_HP_VALUE);
            case StatType.TP:
                return Math.min(100 + (this.tpUpgrades * this.HP_TP_UPGRADE_AMOUNT), this.MAX_TP_VALUE);
            case StatType.AGILITY:
                return Math.min(this.baseAgility + this.agilityUpgrades + this.agilityPoints, this.MAX_STAT_VALUE);
            case StatType.LUCK:
                return Math.min(this.baseLuck + this.luckUpgrades + this.luckPoints, this.MAX_STAT_VALUE);
        }
    }

    /**
     * Add a stat point to a specific stat
     * Returns true if successful, false if no points available or stat at max
     */
    addStatPoint(statType: StatType): boolean {
        if (this.statPointsAvailable <= 0) {
            console.log('No stat points available');
            return false;
        }

        // Check current value to see if we can increase it
        let currentValue = 0;
        switch (statType) {
            case StatType.STRENGTH:
                currentValue = this.baseStrength + this.strengthUpgrades + this.strengthPoints;
                break;
            case StatType.DEFENSE:
                currentValue = this.baseDefense + this.defenseUpgrades + this.defensePoints;
                break;
            case StatType.AGILITY:
                currentValue = this.baseAgility + this.agilityUpgrades + this.agilityPoints;
                break;
            case StatType.LUCK:
                currentValue = this.baseLuck + this.luckUpgrades + this.luckPoints;
                break;
            case StatType.HP:
            case StatType.TP:
                console.log('Cannot add stat points to HP or TP');
                return false;
        }

        if (currentValue >= this.MAX_STAT_VALUE) {
            console.log(`${statType} is already at max value (${this.MAX_STAT_VALUE})`);
            return false;
        }

        // Consume a stat point and increase the stat point counter (not upgrades)
        this.statPointsAvailable--;

        switch (statType) {
            case StatType.STRENGTH:
                this.strengthPoints++;
                break;
            case StatType.DEFENSE:
                this.defensePoints++;
                break;
            case StatType.AGILITY:
                this.agilityPoints++;
                break;
            case StatType.LUCK:
                this.luckPoints++;
                break;
        }

        this.recalculateStats();
        AudioManager.Instance.playUpgrade();
        console.log(`Added 1 point to ${statType}. ${this.statPointsAvailable} points remaining.`);
        return true;
    }
}
