import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics } from './physics/RapierPhysics';
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
import { CharacterEntity } from './CharacterEntity';
import { StatType } from './StatType';
import { Skill } from './skills/Skill';
import { LaserBeamSkill } from './skills/LaserBeamSkill';
import { HealingSkill } from './skills/HealingSkill';
import { AreaAttackSkill } from './skills/AreaAttackSkill';

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

export class Player extends CharacterEntity {
    id: string;
    input: InputManager;
    weapon: Weapon;
    currentWeaponType: WeaponType = WeaponType.SWORD;
    innerMesh?: THREE.Mesh;
    position: THREE.Vector3;
    private rightHandBone?: THREE.Bone;

    private weaponRepository: WeaponRepository;


    // Stat caps and upgrade amounts
    private readonly MAX_STAT_VALUE = 9999;
    private readonly HP_TP_UPGRADE_AMOUNT = 5;
    private readonly STRENGTH_DEFENSE_UPGRADE_AMOUNT = 1;

    // Stat effect formula constants
    private readonly STAT_FORMULA_NUMERATOR = 0.27; // Numerator for strength/defense formulas
    private readonly STAT_FORMULA_LOG_BASE = this.MAX_STAT_VALUE; // Log base for strength/defense formulas
    private readonly AGILITY_CRIT_DIVISOR = 40000; // Divisor for agility critical chance
    private readonly BASE_CRIT_CHANCE = 0.02; // Base 2% critical chance
    private readonly LUCK_DIVISOR = 40000; // Divisor for luck multiplier
    private readonly CRITICAL_HIT_MULTIPLIER = 1.5;

    // Level system constants
    private readonly MAX_LEVEL = 9999;
    private readonly LEVEL_HP_MULTIPLIER = 10.01; // HP increase by (10 + 0.01) * level
    private readonly LEVEL_TP_MULTIPLIER = 5.005; // TP increase by (5 + 0.005) * level
    private readonly EXP_BASE = 350;
    private readonly EXP_LINEAR_FACTOR = 30;
    private readonly EXP_QUADRATIC_FACTOR = 0.07;

    // Tech point cap
    private readonly TECH_POINT_CAP = 2500;

    // Movement speed constant
    private readonly WALK_SPEED = 6;

    // Can jump onto 1m high platforms
    private readonly JUMP_FORCE = 10;

    // Stun mechanic
    private readonly STUN_TIME = 0.5;

    // Invulnerability duration
    private readonly HIT_INVULNERABILITY: number = 1.0;

    // Size constants for positioning of mesh and collider
    private readonly HALF_HEIGHT = 0.45;
    private readonly RADIUS = 0.45;

    // Base Stats (without equipment modifiers or upgrades)
    private baseHp: number = 170;
    private baseTp: number = 60;
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
        [WeaponType.SWORD]: 1,
        [WeaponType.DUAL_BLADE]: 1,
        [WeaponType.LANCE]: 1,
        [WeaponType.HAMMER]: 1,
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
    private readonly CHARGE_DELAY: number = 0.2; // Wait 0.2s before starting charge animation
    private chargeDelayTimer: number = 0;
    private isDashing: boolean = false;
    private dashTimer: number = 0;
    private readonly DASH_DURATION: number = 0.3;
    private readonly DASH_SPEED: number = 25;
    private dashDirection: THREE.Vector3 = new THREE.Vector3();
    private chargeParticles: THREE.Mesh[] = [];
    private dashHitEnemies: Set<Enemy> = new Set();
    private attackHitEnemies: Set<Enemy> = new Set();
    private attackLockedUntilRelease: boolean = false;

    // Particle wall constants
    private readonly PARTICLE_BASE_HEIGHT: number = 0.2;
    private readonly PARTICLE_CHARGED_HEIGHT: number = 0.8;
    private readonly PARTICLE_HEIGHT_TRANSITION_SPEED: number = 0.15;

    // Level up particle explosion
    private levelUpParticles: Array<{ mesh: THREE.Mesh, velocity: THREE.Vector3 }> = [];
    private levelUpParticleTimer: number = 0;
    private readonly LEVEL_UP_PARTICLE_LIFETIME: number = 0.6; // 0.6 seconds for the explosion

    // Level up shockwave timing
    private readonly LEVEL_UP_SHOCKWAVE_DELAY: number = 0.4;
    private levelUpShockwaveTimer: number = 0;
    private shockwavePending: boolean = false;

    // Ground contact tracking
    private stunTimer: number = 0;
    private jumpCooldownTimer: number = 0;

    // Knockback velocity (applied during stun)
    private knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
    private readonly KNOCKBACK_FORCE: number = 8;

    // Death state
    isDead: boolean = false;
    private deathCallback?: () => void;

    // Level up animation state
    private isLevelingUp: boolean = false;

    // Callback for spawning damage numbers
    onDamageTaken?: (position: THREE.Vector3, amount: number) => void;

    // Callback for spawning tech indicators
    onTechGained?: (position: THREE.Vector3) => void;

    // Inventory
    inventory: Item[] = [];
    money: number = 0;

    // Animations
    private mixer!: THREE.AnimationMixer;
    private actions: Record<string, THREE.AnimationAction> = {};
    private currentAction: THREE.AnimationAction | null = null;

    // Skills
    public skills: Skill[] = [];
    private isUsingSkill: boolean = false;
    private skillAnimationTimer: number = 0;

    constructor(scene: THREE.Scene, world: RAPIER.World, position: THREE.Vector3, input: InputManager) {
        // Call CharacterEntity constructor with capsule dimensions and collider offset
        super(
            'models/main_character.glb',
            scene,
            world,
            position,
            0.45, // HALF_HEIGHT
            0.45, // RADIUS
            0.1,  // controller offset
            new THREE.Vector3(0, 0.45, 0) // collider offset (half height up)
        );
        
        this.id = crypto.randomUUID();
        this.input = input;
        this.weaponRepository = WeaponRepository.Instance;
        this.position = position.clone() as any;

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
            }
        };
        this.setWeapon(swordItem);

        this.inventory.push(swordItem);
        // We manually equip it here to sync state without triggering full equip logic yet
        swordItem.isEquipped = true;
        this.currentWeaponType = swordItem.weaponType;

        this.mesh.position.set(position.x, position.y, position.z);

        // Initialize skills
        this.skills = [
            new LaserBeamSkill(this.resetSkillUsage),
            new HealingSkill(this.resetSkillUsage),
            new AreaAttackSkill(this.resetSkillUsage)
        ];
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
        this.maxHp = Math.min(this.baseHp + (this.hpUpgrades * this.HP_TP_UPGRADE_AMOUNT) + levelHpBonus, this.MAX_STAT_VALUE);
        this.maxTp = Math.min(this.baseTp + (this.tpUpgrades * this.HP_TP_UPGRADE_AMOUNT) + levelTpBonus, this.MAX_STAT_VALUE);

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

    // Calculate strength multiplier using formula: 0.27 / ln(9999) * ln(x)
    private getStrengthMultiplier(): number {
        if (this.strength <= 0) return 0;
        const multiplier = (this.STAT_FORMULA_NUMERATOR / Math.log(this.STAT_FORMULA_LOG_BASE)) * Math.log(this.strength);
        return Math.max(0, multiplier);
    }

    // Calculate defense multiplier using formula: 0.27 / ln(9999) * ln(x)
    private getDefenseMultiplier(): number {
        if (this.defense <= 0) return 0;
        const multiplier = (this.STAT_FORMULA_NUMERATOR / Math.log(this.STAT_FORMULA_LOG_BASE)) * Math.log(this.defense);
        return Math.max(0, multiplier);
    }

    // Calculate critical hit chance using formula: agility / 40000 + 0.02
    private getCriticalChance(): number {
        return this.agility / this.AGILITY_CRIT_DIVISOR + this.BASE_CRIT_CHANCE;
    }

    // Calculate luck multiplier using formula: luck / 40000
    private getLuckMultiplier(): number {
        return this.luck / this.LUCK_DIVISOR;
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

            // Spawn tech indicator at player position
            if (this.onTechGained) {
                const bodyPos = this.body.translation();
                const threePos = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
                this.onTechGained(threePos);
            }
        }
    }

    // Compute damage for a single hit, applying strength and critical hit multipliers
    private getHitDamage(baseMultiplier: number = 1): number {
        const equipped = this.inventory.find(i => i instanceof WeaponItem && i.isEquipped) as WeaponItem | undefined;
        if (!equipped) {
            return 0;
        }

        const strengthMultiplier = 1 + this.getStrengthMultiplier();

        // Check for critical hit
        const isCritical = Math.random() < this.getCriticalChance();
        const critMultiplier = isCritical ? this.CRITICAL_HIT_MULTIPLIER : 1.0;

        // Damage is directly from weapon (which already has level scaling in weapons.json)
        const damage = Math.floor(this.weapon.damage * baseMultiplier * strengthMultiplier * critMultiplier);

        if (isCritical) {
            console.log('Critical Hit!');
        }

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
            this.fadeToAction(action, 0.15);
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
            this.syncPositionAndRotation();
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

        // Skills handling
        this.handleSkills();

        // Movement and physics sync
        this.handleMovement(dt, isNearInteractive);
        this.syncPositionAndRotation();

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

        // Compute and apply dash movement for this frame
        const dashMovement = new THREE.Vector3(
            this.dashDirection.x * this.DASH_SPEED * dt,
            0,
            this.dashDirection.z * this.DASH_SPEED * dt
        );
        this.applyMovement(dashMovement);

        // Check for enemy collisions during dash
        const rapierWorld = RapierPhysics.Instance.world;
        const playerPos = this.body.translation();

        rapierWorld.forEachCollider((collider: RAPIER.Collider) => {
            const entity = (collider as any).entity;
            if (entity && entity instanceof Enemy) {
                const enemyPos = collider.parent()?.translation();
                if (enemyPos) {
                    const distance = Math.sqrt(
                        Math.pow(playerPos.x - enemyPos.x, 2) +
                        Math.pow(playerPos.y - enemyPos.y, 2) +
                        Math.pow(playerPos.z - enemyPos.z, 2)
                    );

                    // If within collision range, trigger dash hit
                    if (distance < 1.5) {
                        this.handleDashHit(entity);
                    }
                }
            }
        });

        if (this.dashTimer >= this.DASH_DURATION) {
            this.isDashing = false;
            this.dashHitEnemies.clear();
        }
        this.syncPositionAndRotation();
        return true;
    }

    private handleCharging(dt: number): boolean {
        if (!this.isChargingAttack) return false;

        // Force charging animation regardless of other states
        if (this.currentAction !== this.actions[ActionType.StartCharge]) {
            this.fadeToAction(ActionType.StartCharge, 0.05);
        }

        this.chargeTimer += dt;
        this.invulnerableTimer = 0; // allow damage while charging
        this.updateChargeParticles();

        if (this.input.isAttackReleased()) {
            if (this.chargeTimer >= this.CHARGE_DURATION) {
                this.executeDashAttack();
            } else {
                this.cancelChargeAttack();
            }
        }

        this.syncPositionAndRotation();
        return true;
    }

    private handleMovement(dt: number, isNearInteractive: boolean) {
        const inputVector = this.input.getMovementVector();

        if (this.jumpCooldownTimer > 0) {
            this.jumpCooldownTimer -= dt;
        }

        // Block movement during level-up animation
        if (this.isLevelingUp) {
            this.verticalVelocity = 0;
            return;
        }

        // Block movement during skill usage
        if (this.isUsingSkill) {
            this.verticalVelocity = 0;
            return;
        }

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            
            // Apply gravity
            this.verticalVelocity -= 32 * dt;
            
            // Build and apply knockback movement vector
            const knockbackMovement = new THREE.Vector3(
                this.knockbackVelocity.x * dt,
                this.verticalVelocity * dt,
                this.knockbackVelocity.z * dt
            );
            this.applyMovement(knockbackMovement);
            
            // Apply friction to knockback velocity
            this.knockbackVelocity.multiplyScalar(0.85);
            
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

            // Apply gravity to vertical velocity
            if (!this.isGrounded) {
                this.verticalVelocity -= 32 * dt;
            }

            // Handle jump input
            if (this.input.isJumpPressed() && this.isGrounded && !isNearInteractive && this.jumpCooldownTimer <= 0) {
                this.verticalVelocity = this.JUMP_FORCE;
                this.jumpCooldownTimer = 0.3;
            }
            
            // Build and apply desired movement vector
            const desiredMovement = new THREE.Vector3(
                moveX * effectiveSpeed * dt,
                this.verticalVelocity * dt,
                moveZ * effectiveSpeed * dt
            );
            this.applyMovement(desiredMovement);
        }
    }

    private handleCombat(dt: number) {
        if (this.attackLockedUntilRelease) return;

        // Track attack press for charge timer
        if (this.input.isAttackJustPressed()) this.chargeDelayTimer = 0;

        // Immediate attack (requires fresh press and not charging)
        if (this.input.isAttackJustPressed() && this.isGrounded && !this.weapon.isAttacking && !this.isChargingAttack) {
            this.weapon.attack(this.getWeaponRangeMultiplier());
        }

        // Charging
        if (this.input.isAttackHeld() && !this.isChargingAttack && this.isGrounded) {
            this.chargeDelayTimer += dt;
            if (this.chargeDelayTimer >= this.CHARGE_DELAY && !this.weapon.isAttacking) {
                this.startChargeAttack();
            }
        } else if (!this.input.isAttackHeld()) {
            this.chargeDelayTimer = 0;
        }

        // Weapon update & hit checks
        this.weapon.update(dt);

        // Check for weapon-enemy collisions if weapon is attacking
        if (this.weapon.isAttacking && this.weapon.body) {
            this.checkWeaponCollisions();
        }
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
        if (this.input.isSkill1JustPressed()) {
            this.useSkill(0); // Laser Beam
        } else if (this.input.isSkill2JustPressed()) {
            this.useSkill(1); // Healing
        } else if (this.input.isSkill3JustPressed()) {
            this.useSkill(2); // Area Attack
        }
    }

    private useSkill(skillIndex: number): void {
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
        }
    }

    private handleSkillAnimation(dt: number): boolean {
        if (!this.isUsingSkill) return false;

        this.skillAnimationTimer += dt;

        this.syncPositionAndRotation();
        return true;
    }

    /**
     * Apply movement via CharacterController with collision detection
     * @param movement - The desired movement vector for this frame
     */
    protected override applyMovement(movement: THREE.Vector3): void {
        this.characterController.computeColliderMovement(
            this.collider,
            movement
        );
        
        const correctedMovement = this.characterController.computedMovement();
        let newPos = this.body.translation();
        newPos.x += correctedMovement.x;
        newPos.y += correctedMovement.y;
        newPos.z += correctedMovement.z;
        this.body.setNextKinematicTranslation(newPos);
        
        this.isGrounded = this.characterController.computedGrounded();
    }

    syncPositionAndRotation() {
        const translation = this.body.translation();
        const newPosition = new THREE.Vector3(translation.x, translation.y - this.RADIUS, translation.z);
        this.position.copy(newPosition);
        this.mesh.position.copy(newPosition);
        this.syncBodyRotation();
    }

    move(position: THREE.Vector3): void {
        console.log('Moving player to', position);
        // Use setNextKinematicTranslation for kinematic bodies (per Rapier docs)
        this.body.setNextKinematicTranslation({
            x: position.x,
            y: position.y - this.HALF_HEIGHT,
            z: position.z
        });
        this.verticalVelocity = 0;
        this.syncPositionAndRotation();
    }

    /**
     * Get the player's forward direction vector
     */
    getForwardDirection(): THREE.Vector3 {
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.mesh.quaternion);
        forward.y = 0;
        forward.normalize();
        return forward.clone();
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

        const bodyPos = this.body.translation();
        const threePos = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z);

        // Deal 3x weapon damage with tech multiplier
        const damage = this.getHitDamage(3);
        enemy.takeDamage(damage, threePos);

        this.tryIncrementWeaponTech(enemy.techDropRateFactor);

        // Mark this enemy as hit during this dash
        this.dashHitEnemies.add(enemy);
    }

    private handleAttackHit(enemy: Enemy) {
        if (enemy.isDead || enemy.isDying) return;

        // Skip if we already hit this enemy during this attack
        if (this.attackHitEnemies.has(enemy)) return;

        const bodyPos = this.body.translation();
        const threePos = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z);

        const damage = this.getHitDamage();
        enemy.takeDamage(damage, threePos);
        console.log(`Hit enemy with ${this.currentWeaponType}! Damage: ${damage}`);

        this.tryIncrementWeaponTech(enemy.techDropRateFactor);

        // Mark this enemy as hit during this attack
        this.attackHitEnemies.add(enemy);
    }

    takeDamage(amount: number, sourcePos?: THREE.Vector3) {
        if (this.invulnerableTimer > 0 || this.isLevelingUp || this.isDashing || this.isDead) return;

        // Stop any ongoing attack
        this.weapon.stopAttack();

        // Apply defense multiplier to reduce damage
        const defenseMultiplier = 1 - this.getDefenseMultiplier();
        const reducedDamage = Math.max(1, Math.floor(amount * defenseMultiplier));

        this.hp -= reducedDamage;

        // Spawn damage number if callback is set
        if (this.onDamageTaken) {
            const bodyPos = this.body.translation();
            const threePos = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
            this.onDamageTaken(threePos, reducedDamage);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return;
        }

        // Apply brief invulnerability
        this.invulnerableTimer = this.HIT_INVULNERABILITY;

        // Trigger hit animation
        this.fadeToAction(ActionType.TakeHit, 0.05);

        // Knockback: push player away from source horizontally and give small upward impulse
        if (sourcePos) {
            this.stunTimer = this.STUN_TIME;
            const bodyPos = this.body.translation();
            const knockDir = new THREE.Vector3(
                bodyPos.x - sourcePos.x,
                0,
                bodyPos.z - sourcePos.z
            );

            if (knockDir.length() > 0) {
                knockDir.normalize();
                // Apply knockback force in the direction away from damage source
                this.knockbackVelocity.set(
                    knockDir.x * this.KNOCKBACK_FORCE,
                    0,
                    knockDir.z * this.KNOCKBACK_FORCE
                );
                // Small upward impulse
                this.verticalVelocity = 5;
            }
        }

        // Cancel charging attack if taking damage and suppress immediate follow-up attack
        if (this.isChargingAttack) this.cancelChargeAttack()

        console.log(`Player took ${reducedDamage} damage (${amount} reduced by defense). HP: ${this.hp}`);
    }

    /**
     * Handle player death
     */
    private die(): void {
        this.isDead = true;
        console.log('Player died');

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
     * Respawn the player at specified position
     */
    respawn(position: THREE.Vector3): void {
        this.isDead = false;
        this.hp = this.maxHp;
        this.tp = this.maxTp;
        this.invulnerableTimer = 2.0; // 2 seconds invulnerability after respawn

        // Use setNextKinematicTranslation for kinematic bodies (per Rapier docs)
        this.body.setNextKinematicTranslation({
            x: position.x,
            y: position.y,
            z: position.z
        });
        this.verticalVelocity = 0;

        console.log('Player respawned at', position);
    }

    /**
     * Heal the player by the specified amounts
     * @param hpAmount - Amount of HP to restore
     * @param tpAmount - Amount of TP to restore
     */
    heal(hpAmount: number, tpAmount: number = 0): void {
        if (hpAmount > 0) {
            this.hp = Math.min(this.hp + hpAmount, this.maxHp);
        }
        if (tpAmount > 0) {
            this.tp = Math.min(this.tp + tpAmount, this.maxTp);
        }
    }

    private startChargeAttack() {
        this.isChargingAttack = true;
        this.chargeTimer = 0;
        this.createChargeParticles();
    }

    private cancelChargeAttack() {
        this.isChargingAttack = false;
        this.chargeTimer = 0;
        this.removeChargeParticles();
        this.attackLockedUntilRelease = true;
    }

    private executeDashAttack() {
        this.isChargingAttack = false;
        this.isDashing = true;
        this.dashTimer = 0;
        this.dashHitEnemies.clear();

        // Set dash direction to player's facing direction
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        this.dashDirection.copy(forward);

        // Remove charge particles
        this.removeChargeParticles();
    }

    private createChargeParticles() {
        // Create teardrop/heart-shaped particle wall at 0.2m height
        // The shape is based on the image provided
        const particleCount = 40;
        const particleGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });

        // Create particles in a teardrop/heart pattern
        for (let i = 0; i < particleCount; i++) {
            const t = (i / particleCount) * Math.PI * 2;

            // Parametric equation for a heart/teardrop shape
            // Modified cardioid equation
            const r = 0.8 * (1 - Math.sin(t));
            const x = r * Math.cos(t);
            const z = r * Math.sin(t);

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.set(x, this.PARTICLE_BASE_HEIGHT, z);

            this.chargeParticles.push(particle);
            this.mesh.add(particle);
        }
    }

    private updateChargeParticles() {
        // Particles are children of the player mesh, so they automatically follow
        // Add pulsing animation and raise height when fully charged
        const pulseScale = 1 + Math.sin(this.chargeTimer * 10) * 0.2;

        // When fully charged, raise particles higher
        const isFullyCharged = this.chargeTimer >= this.CHARGE_DURATION;
        const targetHeight = isFullyCharged ? this.PARTICLE_CHARGED_HEIGHT : this.PARTICLE_BASE_HEIGHT;

        this.chargeParticles.forEach(particle => {
            particle.scale.y = pulseScale;

            // Smoothly transition to target height
            const currentHeight = particle.position.y;
            particle.position.y += (targetHeight - currentHeight) * this.PARTICLE_HEIGHT_TRANSITION_SPEED;
        });
    }

    private removeChargeParticles() {
        this.chargeParticles.forEach(particle => {
            this.mesh.remove(particle);
            particle.geometry.dispose();
            (particle.material as THREE.Material).dispose();
        });
        this.chargeParticles = [];
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
    gainExp(amount: number): void {
        if (this.level >= this.MAX_LEVEL) {
            console.log('Player is at max level');
            return;
        }

        // Apply luck multiplier to EXP gain
        const luckMultiplier = 1 + this.getLuckMultiplier();
        const adjustedAmount = Math.floor(amount * luckMultiplier);

        this.exp += adjustedAmount;
        console.log(`Gained ${adjustedAmount} EXP (${amount} base + luck bonus). Current: ${this.exp}/${this.expRequired}`);

        // Check for level up(s)
        while (this.exp >= this.expRequired && this.level < this.MAX_LEVEL) {
            this.levelUp();
        }
    }

    /**
     * Level up the player
     */
    private levelUp(): void {
        this.exp -= this.expRequired;
        this.level++;

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

        console.log(`Level Up! Now level ${this.level}. Next level requires ${this.expRequired} EXP. ${this.statPointsAvailable} stat points available.`);
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
     * Check for weapon-enemy collisions using Rapier intersection tests
     */
    private checkWeaponCollisions(): void {
        if (!this.weapon.body || !this.weapon.collider) return;

        const rapierWorld = RapierPhysics.Instance.world;
        const weaponPos = this.weapon.body.translation();
        const weaponRot = this.weapon.body.rotation();
        const damage = this.getHitDamage();
        const damagePos = new THREE.Vector3(weaponPos.x, weaponPos.y, weaponPos.z);

        // Check intersection with all colliders
        rapierWorld.intersectionsWithShape(weaponPos, weaponRot, this.weapon.collider.shape, (collider) => {
            const parent = collider.parent();
            if (parent) {
                // Check if this collider belongs to an enemy
                const entity = (parent as any).entity;
                if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                    entity.takeDamage(damage, damagePos);

                    // Grant tech points
                    if (this.onTechGained) {
                        this.onTechGained(damagePos);
                    }
                }
            }
            return true; // Continue checking other colliders
        });
    }

    /**
     * Execute shockwave attack hitting all nearby enemies
     */
    private executeLevelUpShockwave(): void {
        const damage = this.getHitDamage();
        const playerPos = this.body.translation();
        const threePos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);

        // Find all enemies in the Rapier world and damage them
        const rapierWorld = RapierPhysics.Instance.world;
        rapierWorld.forEachCollider((collider: RAPIER.Collider) => {
            const entity = (collider as any).entity;
            if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                entity.takeDamage(damage, threePos);
                console.log(`Level-up shockwave hit enemy for ${damage} damage`);
            }
        });
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

        switch (statType) {
            case StatType.STRENGTH:
                currentLevel = this.strengthUpgrades;
                currentValue = this.baseStrength + this.strengthUpgrades;
                break;
            case StatType.DEFENSE:
                currentLevel = this.defenseUpgrades;
                currentValue = this.baseDefense + this.defenseUpgrades;
                break;
            case StatType.AGILITY:
                currentLevel = this.agilityUpgrades;
                currentValue = this.baseAgility + this.agilityUpgrades;
                break;
            case StatType.LUCK:
                currentLevel = this.luckUpgrades;
                currentValue = this.baseLuck + this.luckUpgrades;
                break;
            case StatType.HP:
                currentLevel = this.hpUpgrades;
                currentValue = 100 + (this.hpUpgrades * this.HP_TP_UPGRADE_AMOUNT);
                break;
            case StatType.TP:
                currentLevel = this.tpUpgrades;
                currentValue = 100 + (this.tpUpgrades * this.HP_TP_UPGRADE_AMOUNT);
                break;
        }

        // Check if stat would exceed 9999 cap
        const upgradeAmount = (statType === StatType.HP || statType === StatType.TP)
            ? this.HP_TP_UPGRADE_AMOUNT
            : this.STRENGTH_DEFENSE_UPGRADE_AMOUNT;
        if (currentValue + upgradeAmount > this.MAX_STAT_VALUE) {
            console.log(`${statType} is already at max value (${this.MAX_STAT_VALUE})`);
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
                return Math.min(100 + (this.hpUpgrades * this.HP_TP_UPGRADE_AMOUNT), this.MAX_STAT_VALUE);
            case StatType.TP:
                return Math.min(100 + (this.tpUpgrades * this.HP_TP_UPGRADE_AMOUNT), this.MAX_STAT_VALUE);
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
        console.log(`Added 1 point to ${statType}. ${this.statPointsAvailable} points remaining.`);
        return true;
    }
}
