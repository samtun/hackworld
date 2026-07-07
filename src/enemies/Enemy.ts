import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player, PLAYER_COLLISION_GROUP } from '../Player';
import { BaseMesh } from '../BaseMesh';
import { PlayerRegistry } from '../PlayerRegistry';
import { AssetManager } from '../AssetManager';
import { FloatingIndicatorManager } from '../FloatingIndicatorManager';
import { BlockShield } from '../BlockShield';
import type { DungeonNavGrid, NavWaypoint } from '../navigation/DungeonNavGrid';
import { BlobShadow } from '../BlobShadow';
import type { BreakableBarrel } from '../items/BreakableBarrel';
import { AudioManager } from '../AudioManager';
import {
    DEFAULT_ENEMY_TYPE,
    EnemyAttackMode,
    EnemyType,
    POD_PROJECTILE_COLOR,
    type EnemyCombatBehaviorDefinition,
    type EnemyTypeDefinition,
    getEnemyTypeDefinition,
} from './EnemyType';

/** Maximum downward distance (metres) for the shadow floor raycast. */
const SHADOW_CAST_DIST = 4.0;

enum EnemyActionType {
    Idle = 'Idle',
    Run = 'Run',
    Attack = 'Attack',
    Death = 'Death',
    TakeHit = 'TakeHit'
}

export interface EnemyArchetypeConfig {
    maxHp: number;
    speed: number;
    damage: number;
    baseExp: number;
    itemDropChance: number;
    techDropRateFactor: number;
    xDataDropChanceWeight: number;
    criticalChance: number;
    criticalHitMultiplier: number;
    blockChance: number;
    size: number;
    color: number;
}

const BASE_ENEMY_SIZE = 1.75;
const BASE_ENEMY_MASS = 5;
export const ENEMY_RADIUS_FACTOR = 0.326;
const ENEMY_ATTACK_RANGE_FACTOR = 0.792;
const BASE_ATTACK_HITBOX_SIZE = new CANNON.Vec3(0.5, 0.5, 0.8);
const BASE_ATTACK_HITBOX_OFFSET = 1.0;
const RANGED_START_OFFSET_FACTOR = 0.9;
const RANGED_TARGET_VERTICAL_OFFSET = 0.6;
const RANGED_ORIGIN_VERTICAL_FACTOR = 0.35;
const RANGED_VERTICAL_OFFSET = 0.2;
const RANGED_MIN_START_OFFSET = 0.4;
const PROJECTILE_SPEED = 15;
const RANGED_PROJECTILE_WIDTH = 0.18;
const RANGED_PROJECTILE_HEIGHT = 0.18;
const RANGED_PROJECTILE_LENGTH = 0.5;
const RANGED_PROJECTILE_PLAYER_HIT_RADIUS = 0.65;
const PROJECTILE_LIFETIME = 4;
const STANDOFF_VELOCITY_DAMPING = 0.9;
const RETREAT_ATTACK_RATE_PER_SECOND = 0.85;
const NAV_TARGET_CHANGE_RECOMPUTE_DISTANCE = 0.5;
const RETREAT_ANGLE_OFFSETS = [
    0,
    Math.PI / 4,
    -Math.PI / 4,
    Math.PI / 2,
    -Math.PI / 2,
    (3 * Math.PI) / 4,
    (-3 * Math.PI) / 4,
    Math.PI,
];

/** Maximum allowed enemy size (metres). Keeps enemies passable through corridors. */
export const MAX_ENEMY_SIZE = 2.0;

/**
 * Maximum physics collision radius for non-boss enemies (metres).
 * Derived from CORRIDOR_WIDTH (3 m) - WALL_THICKNESS (1 m): half-width (1 m) minus a 0.1 m buffer
 * so enemies can traverse corridors without getting stuck.
 */
export const MAX_ENEMY_RADIUS = 0.9;

/** How long (seconds) an enemy must be stuck before it attempts a path-clearing attack. */
const STUCK_TRIGGER_TIME = 2.0;
/** Interval (seconds) at which stuck progress is sampled. */
const STUCK_CHECK_INTERVAL = 0.5;
/** Minimum distance (metres) the enemy must travel per check period to be considered moving. */
const STUCK_MIN_PROGRESS = 0.15;
/** Probability per second of performing a path-clearing attack while stuck. */
const STUCK_ATTACK_CHANCE_PER_SECOND = 0.2;
/** Extra buffer (metres) added to hitbox size when checking if the attack can reach a barrel. */
const BARREL_BREAK_RANGE_BUFFER = 0.4;

export const DEFAULT_ENEMY_ARCHETYPE: EnemyArchetypeConfig = {
    maxHp: 60,
    speed: 3,
    damage: 10,
    baseExp: 10,
    itemDropChance: 0.08,
    techDropRateFactor: 1.0,
    xDataDropChanceWeight: 1.0,
    criticalChance: 0.04,
    criticalHitMultiplier: 1.2,
    blockChance: 0.2,
    size: BASE_ENEMY_SIZE,
    color: 0x000000,
};

export class Enemy extends BaseMesh {
    body: CANNON.Body;
    maxHp: number = DEFAULT_ENEMY_ARCHETYPE.maxHp;
    hp: number = this.maxHp;
    protected speed: number = DEFAULT_ENEMY_ARCHETYPE.speed;
    protected size: number = DEFAULT_ENEMY_ARCHETYPE.size;
    protected radius: number = DEFAULT_ENEMY_ARCHETYPE.size * ENEMY_RADIUS_FACTOR;
    protected attackRange: number = DEFAULT_ENEMY_ARCHETYPE.size * ENEMY_ATTACK_RANGE_FACTOR;
    protected attackCooldown: number = 1.0;
    protected attackTimer: number = 0;
    isDead: boolean = false;
    isDying: boolean = false;
    deathTimer: number = 0;
    flashTimer: number = 0;
    stunTimer: number = 0;
    itemDropChance: number = DEFAULT_ENEMY_ARCHETYPE.itemDropChance;
    xDataDropChanceWeight: number = DEFAULT_ENEMY_ARCHETYPE.xDataDropChanceWeight;
    baseExp: number = DEFAULT_ENEMY_ARCHETYPE.baseExp; // EXP granted on defeat, is influenced by player luck
    damage: number = DEFAULT_ENEMY_ARCHETYPE.damage;
    protected criticalChance: number = DEFAULT_ENEMY_ARCHETYPE.criticalChance;
    protected criticalHitMultiplier: number = DEFAULT_ENEMY_ARCHETYPE.criticalHitMultiplier;
    protected knockbackForce: number = 15.0;
    protected blockedKnockbackFactor: number = 0.4;

    /**
     * When false the enemy idles in place regardless of player proximity.
     * Set to false by room-based stages and switched on once the player
     * enters the enemy's room, so enemies don't chase through walls.
     */
    aggroEnabled: boolean = true;

    /**
     * Countdown in seconds after a lazy room-entry spawn during which the
     * enemy stays inactive (idles in place).  Prevents enemies from immediately
     * chasing the player before they are fully placed in the world.
     * Counts down to zero and then normal AI resumes.
     */
    spawnInactiveTimer: number = 0;

    /**
     * When true this enemy is immune to electric trap damage and knockback.
     * Subclasses can set this to `true` to create trap-resistant enemy types.
     */
    trapImmune: boolean = false;

    /**
     * Optional navigation grid for pathfinding around walls and obstacles.
     * When set, the enemy follows an A*-computed path instead of moving
     * directly toward the player.
     */
    navGrid: DungeonNavGrid | null = null;

    /** Current A* path waypoints the enemy is following. */
    private navPath: NavWaypoint[] = [];
    /** Index of the next waypoint in {@link navPath} the enemy is heading toward. */
    private navPathIndex = 0;
    /** Seconds since the path was last recomputed. */
    private navPathAge = 0;
    /** Target used for the current cached navigation path. */
    private navPathTargetX: number | null = null;
    private navPathTargetZ: number | null = null;
    /** How often (in seconds) to recompute the path. */
    private readonly NAV_RECOMPUTE_INTERVAL = 0.5;

    // Base position tracking for return behavior
    protected basePosition: CANNON.Vec3;
    protected returnToBaseTimer: number = 0;
    protected isReturningToBase: boolean = false;
    protected aggroRange: number = 15;
    protected returnWaitTime: number = 2.0; // Wait 2 seconds before returning to base
    protected baseArrivalThreshold: number = 0.5; // Distance to consider arrived at base

    // Stuck detection: track if enemy is making progress while chasing the player
    /** Accumulated time (seconds) the enemy has been stuck while chasing. */
    private stuckTimer: number = 0;
    /** Countdown to next stuck-progress sample. */
    private stuckCheckCountdown: number = STUCK_CHECK_INTERVAL;
    /** World-XZ position recorded at the last stuck-progress sample. */
    private stuckLastX: number = 0;
    private stuckLastZ: number = 0;

    /**
     * Breakable barrels in the current room/stage.
     * Set by {@link BaseStage} so enemies can break barrels blocking their path.
     */
    breakableBarrels: BreakableBarrel[] = [];

    // Animation
    isAttacking: boolean = false;
    protected attackAnimTimer: number = 0;
    techDropRateFactor: number = DEFAULT_ENEMY_ARCHETYPE.techDropRateFactor;
    protected bodyHalfExtentY: number;
    private footstepTimer: number = 0;

    // Animation system
    protected mixer!: THREE.AnimationMixer;
    protected actions: Record<string, THREE.AnimationAction> = {};
    protected currentAction: THREE.AnimationAction | null = null;

    // Attack hitbox
    protected attackHitboxBody: CANNON.Body | null = null;
    protected attackHitboxActive: boolean = false;
    protected attackHitboxDelay: number = 0.42;
    protected attackHitboxDuration: number = 0.2;
    protected attackMaxDuration: number = 1.0;
    protected attackHitboxSize: CANNON.Vec3 = BASE_ATTACK_HITBOX_SIZE.clone();
    protected attackHitboxOffset: number = BASE_ATTACK_HITBOX_OFFSET;
    protected hasDealtDamageThisAttack: boolean = false;

    // Block state
    protected blockChance: number = DEFAULT_ENEMY_ARCHETYPE.blockChance;
    protected isBlocking: boolean = false;
    private blockTimer: number = 0;
    private readonly BLOCK_DURATION: number = 0.5;
    private blockShield: BlockShield | null = null;

    // Death fade
    protected deathFadeDuration: number = 0.5;
    protected deathFadeTimer: number = 0;
    protected isDeathFading: boolean = false;

    protected materials: THREE.Material[] = [];
    private player: Player;
    protected scene: THREE.Scene;
    protected world: CANNON.World;
    protected physicsMaterial: CANNON.Material;
    /** Logical enemy family used to select model and type-specific behavior. */
    readonly enemyType: EnemyType;
    /** Resolved type definition for this enemy family (model path, movement traits). */
    private enemyTypeDefinition: EnemyTypeDefinition;
    /** Resolved combat behavior for this enemy family. */
    private enemyCombatBehavior: EnemyCombatBehaviorDefinition;
    /** Cooldown timers for optional enemy-type movement abilities keyed by ability id. */
    private enemyTypeAbilityCooldownTimers: Map<string, number> = new Map();
    /** Counts down while an ability is controlling horizontal movement; skip normal velocity override while > 0. */
    private abilityMoveTimer: number = 0;
    /** Temporary projectile used by ranged ranged enemies. */
    private projectile: THREE.Mesh | null = null;
    private projectileVelocity: THREE.Vector3 = new THREE.Vector3();
    private projectileRemainingLifetime: number = 0;
    private projectileActive: boolean = false;
    private hasSpawnedProjectileThisAttack: boolean = false;
    private isRetreatingForSpacing: boolean = false;
    private isCorneredForSpacing: boolean = false;

    /** Flat circular shadow below the enemy. */
    public blobShadow!: BlobShadow;

    private floatingIndicatorManager: FloatingIndicatorManager;


    // Callback for spawning damage numbers
    onDamageTaken?: (position: CANNON.Vec3, amount: number) => void;

    // Callback when death fade starts (for rewards, drops, etc.)
    onDeathFadeStart?: (enemy: Enemy) => void;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        position: CANNON.Vec3,
        physicsMaterial: CANNON.Material,
        config: Partial<EnemyArchetypeConfig> = {},
        enemyType: EnemyType = DEFAULT_ENEMY_TYPE,
    ) {
        const enemyTypeDefinition = getEnemyTypeDefinition(enemyType);
        super(enemyTypeDefinition.modelPath);

        this.scene = scene;
        this.world = world;
        this.physicsMaterial = physicsMaterial;
        this.enemyType = enemyType;
        this.enemyTypeDefinition = enemyTypeDefinition;
        this.enemyCombatBehavior = enemyTypeDefinition.combatBehavior ?? {
            attackMode: EnemyAttackMode.Melee,
        };
        this.floatingIndicatorManager = FloatingIndicatorManager.getInstance(scene);

        // Pre-seed cooldown timers so abilities don't fire immediately on spawn.
        for (const ability of enemyTypeDefinition.movementAbilities ?? []) {
            const randomExtra = ability.randomDelay != null ? Math.random() * ability.randomDelay : 0;
            this.enemyTypeAbilityCooldownTimers.set(ability.id, ability.cooldown + randomExtra);
        }
        const resolvedConfig: EnemyArchetypeConfig = { ...DEFAULT_ENEMY_ARCHETYPE, ...config };
        resolvedConfig.speed *= this.enemyTypeDefinition.speedMultiplier;

        this.maxHp = resolvedConfig.maxHp;
        this.hp = this.maxHp;
        this.speed = resolvedConfig.speed;
        this.damage = resolvedConfig.damage;
        this.baseExp = resolvedConfig.baseExp;
        this.itemDropChance = resolvedConfig.itemDropChance;
        this.techDropRateFactor = resolvedConfig.techDropRateFactor;
        this.xDataDropChanceWeight = resolvedConfig.xDataDropChanceWeight;
        this.criticalChance = resolvedConfig.criticalChance;
        this.criticalHitMultiplier = resolvedConfig.criticalHitMultiplier;
        this.blockChance = resolvedConfig.blockChance;
        this.size = resolvedConfig.size;
        this.radius = this.computeRadius(this.size);
        this.attackRange = this.enemyCombatBehavior.attackRange ?? this.size * ENEMY_ATTACK_RANGE_FACTOR;
        this.attackCooldown = this.enemyCombatBehavior.attackCooldown ?? this.attackCooldown;
        const sizeScale = this.size / BASE_ENEMY_SIZE;
        this.attackHitboxSize.set(
            BASE_ATTACK_HITBOX_SIZE.x * sizeScale,
            BASE_ATTACK_HITBOX_SIZE.y * sizeScale,
            BASE_ATTACK_HITBOX_SIZE.z * sizeScale,
        );
        this.attackHitboxOffset = BASE_ATTACK_HITBOX_OFFSET * sizeScale;

        // Store base position for return behavior
        this.basePosition = position.clone();

        // Visual
        scene.add(this.mesh);
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = child.material.clone();
                if (child.material instanceof THREE.MeshStandardMaterial) {
                    const tint = new THREE.Color(resolvedConfig.color);
                    child.material.color.add(tint);
                    child.material.color.setRGB(
                        Math.min(child.material.color.r, 1),
                        Math.min(child.material.color.g, 1),
                        Math.min(child.material.color.b, 1),
                    );
                }
                this.materials.push(child.material);
            }
        });
        this.mesh.scale.setScalar(sizeScale);

        // Setup animations
        this.setupAnimations();

        // Physics
        const shape = new CANNON.Cylinder(this.radius, this.radius, this.size, 8);
        this.bodyHalfExtentY = shape.height / 2;
        this.body = new CANNON.Body({
            mass: Math.max(1, Math.round(BASE_ENEMY_MASS * sizeScale * sizeScale * sizeScale)),
            material: physicsMaterial,
            fixedRotation: true
        });
        this.body.collisionFilterMask = -1;
        this.body.collisionFilterMask |= PLAYER_COLLISION_GROUP;
        this.body.addShape(shape);
        this.body.position.copy(position);
        (this.body as any).entity = this;
        world.addBody(this.body);

        this.player = PlayerRegistry.Instance.activePlayers[0];

        // Blob shadow – always visible
        this.blobShadow = new BlobShadow(scene, 0.5 * sizeScale);
    }

    protected setupAnimations() {
        // Clear BaseMesh mixer to avoid conflict
        this.mixers = [];

        this.mixer = new THREE.AnimationMixer(this.mesh);

        const gltf = AssetManager.Instance.get(this.enemyTypeDefinition.modelPath);
        const animations = gltf.animations;

        if (animations && animations.length > 0) {
            const getClip = (name: string) => animations.find(a => a.name === name);

            const idleClip = getClip(EnemyActionType.Idle);
            const runClip = getClip(EnemyActionType.Run);
            const attackClip = getClip(EnemyActionType.Attack);
            const deathClip = getClip(EnemyActionType.Death);
            const takeHitClip = getClip(EnemyActionType.TakeHit);

            if (idleClip) {
                const action = this.mixer.clipAction(idleClip);
                this.actions[EnemyActionType.Idle] = action;
            }
            if (runClip) {
                const action = this.mixer.clipAction(runClip);
                this.actions[EnemyActionType.Run] = action;
            }
            if (attackClip) {
                const action = this.mixer.clipAction(attackClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[EnemyActionType.Attack] = action;
            }
            if (deathClip) {
                const action = this.mixer.clipAction(deathClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[EnemyActionType.Death] = action;
            }
            if (takeHitClip) {
                const action = this.mixer.clipAction(takeHitClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                action.timeScale = 1.6;
                this.actions[EnemyActionType.TakeHit] = action;
            }

            // Listen for animation finished events
            this.mixer.addEventListener('finished', (e) => {
                const finishedAction = e.action;
                if (finishedAction === this.actions[EnemyActionType.Attack]) {
                    this.isAttacking = false;
                    this.deactivateAttackHitbox();
                    this.hideProjectile();
                }
                if (finishedAction === this.actions[EnemyActionType.Death]) {
                    this.isDeathFading = true;
                    this.deathFadeTimer = 0;
                    // Trigger death fade callback for rewards/drops
                    if (this.onDeathFadeStart) {
                        this.onDeathFadeStart(this);
                    }
                }
            });
        }

        // Start Idle
        this.fadeToAction(EnemyActionType.Idle, 0.0);
    }

    /**
     * @param actionType The action to fade to
     * @param duration The duration of the fade
     * @param reset Wether the current action should be reset
     */
    protected fadeToAction(actionType: EnemyActionType, duration: number, reset: boolean = false) {
        const activeAction = this.actions[actionType];
        const previousAction = this.currentAction;

        if (previousAction !== activeAction || reset && activeAction) {
            if (previousAction) {
                previousAction.fadeOut(duration);
            }
            activeAction.reset().fadeIn(duration).play();
            this.currentAction = activeAction;
        }
    }

    protected updateAnimations(isMoving: boolean) {
        if (this.isDying) {
            return;
        }

        // High priority: Take Hit
        const takeHitAction = this.actions[EnemyActionType.TakeHit];
        if (this.currentAction === takeHitAction && takeHitAction && takeHitAction.isRunning()) {
            return;
        }

        // High priority: Blocking - holds idle pose, overrides move/attack
        if (this.isBlocking) {
            return;
        }

        // High priority: Attack
        if (this.isAttacking) {
            this.fadeToAction(EnemyActionType.Attack, 0.1);
            return;
        }

        // Run / Idle
        if (isMoving) {
            this.fadeToAction(EnemyActionType.Run, 0.2);
        } else {
            this.fadeToAction(EnemyActionType.Idle, 0.2);
        }
    }

    protected createAttackHitbox() {
        const shape = new CANNON.Box(this.attackHitboxSize);
        this.attackHitboxBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.KINEMATIC,
            collisionResponse: false,
            material: this.physicsMaterial
        });
        this.attackHitboxBody.addShape(shape);
        (this.attackHitboxBody as any).isEnemyAttackHitbox = true;
        (this.attackHitboxBody as any).enemy = this;
    }

    protected activateAttackHitbox() {
        if (!this.attackHitboxBody) {
            this.createAttackHitbox();
        }
        if (this.attackHitboxBody && !this.attackHitboxActive) {
            this.world.addBody(this.attackHitboxBody);
            this.attackHitboxActive = true;
        }
    }

    protected deactivateAttackHitbox() {
        if (this.attackHitboxBody && this.attackHitboxActive) {
            this.world.removeBody(this.attackHitboxBody);
            this.attackHitboxActive = false;
        }
    }

    protected updateAttackHitboxPosition() {
        if (!this.attackHitboxBody || !this.attackHitboxActive) return;

        // Position the hitbox in front of the enemy
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        this.attackHitboxBody.position.set(
            this.body.position.x + forward.x * this.attackHitboxOffset,
            this.body.position.y,
            this.body.position.z + forward.z * this.attackHitboxOffset
        );
    }

    /**
     * Get the distance from this enemy to the player
     */
    protected getDistanceToPlayer(): number {
        return this.body.position.distanceTo(this.player.body.position);
    }

    /**
     * Compute the physics collision radius for this enemy.
     *
     * Regular enemies are capped at {@link MAX_ENEMY_RADIUS} so they can
     * always traverse the dungeon corridors.  Override in subclasses to allow
     * a larger radius (e.g. bosses that never leave their room).
     */
    protected computeRadius(size: number): number {
        return Math.min(size * ENEMY_RADIUS_FACTOR, MAX_ENEMY_RADIUS);
    }

    protected checkAttackHitboxCollision() {
        if (!this.attackHitboxBody || !this.attackHitboxActive || this.hasDealtDamageThisAttack) return;

        const playerBody = this.player.body;
        const hitboxPos = this.attackHitboxBody.position;
        const playerPos = playerBody.position;

        // Simple distance check for collision
        const dx = hitboxPos.x - playerPos.x;
        const dz = hitboxPos.z - playerPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < this.attackHitboxSize.x + 0.5) {
            const isCriticalHit = Math.random() < this.criticalChance;
            const damage = isCriticalHit ? Math.floor(this.damage * this.criticalHitMultiplier) : this.damage;
            this.player.takeDamage(damage, this.body.position, isCriticalHit);
            this.hasDealtDamageThisAttack = true;
        }

        // Check for barrels in attack range and break them
        const barrelHitRadius = this.attackHitboxSize.x + this.attackHitboxSize.z + BARREL_BREAK_RANGE_BUFFER;
        for (const barrel of this.breakableBarrels) {
            if (barrel.isDestroyed) continue;
            const bx = hitboxPos.x - barrel.body.position.x;
            const bz = hitboxPos.z - barrel.body.position.z;
            if (Math.sqrt(bx * bx + bz * bz) < barrelHitRadius) {
                barrel.onHit();
            }
        }
    }

    update(dt: number) {
        // Update animation mixer
        if (this.mixer) this.mixer.update(dt);

        if (this.isDead) return;

        this.tickAbilityCooldowns(dt);
        this.updateShadow();

        if (this.isDying || this.isDead || this.isDeathFading) {
            this.footstepTimer = 0;
        }

        if (this.handleDeathFade(dt)) return;

        // Flash Effect
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer <= 0) {
                this.setFlashColor(0x000000);
            }
        }

        if (this.handleDying(dt)) return;

        // Sync mesh with body
        this.mesh.position.copy(this.body.position as any);
        this.mesh.position.y -= this.bodyHalfExtentY;

        this.updateBlockTimer(dt);

        // Stun Logic
        if (this.stunTimer > 0) {
            this.footstepTimer = 0;
            this.stunTimer -= dt;
            // Apply friction while stunned so they don't slide forever
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            this.updateAnimations(false);
            return; // Skip AI movement and attack
        }

        // Spawn-inactive window: newly placed enemies stay idle for a brief
        // period so they are fully positioned before engaging.
        if (this.spawnInactiveTimer > 0) {
            this.footstepTimer = 0;
            this.spawnInactiveTimer -= dt;
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            this.updateAnimations(false);
            return;
        }

        // AI Logic
        if (this.player.isDead) {
            this.footstepTimer = 0;
            // Idle friction
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            this.updateAnimations(false);
            return;
        }

        // Room-based aggro: idle until the player enters this enemy's room.
        // Strict equality is intentional – test helpers that bypass the
        // constructor via Object.create() leave the property undefined, and
        // `!undefined` would incorrectly block the existing AI logic.
        if (this.aggroEnabled === false) {
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            this.updateAnimations(false);
            return;
        }

        const playerPos = this.player.body.position;
        const myPos = this.body.position;
        const distToPlayer = myPos.distanceTo(playerPos);

        const isMoving = this.runMovementAI(dt, playerPos, myPos, distToPlayer);

        this.handleAttackLogic(dt, distToPlayer);

        this.updateProjectile(dt);

        // Update animations
        this.updateFootstepAudio(dt, isMoving);
        this.updateAnimations(isMoving);
    }

    /** Advances per-ability cooldown timers, removing any that have expired. */
    private tickAbilityCooldowns(dt: number): void {
        if (this.enemyTypeAbilityCooldownTimers.size > 0) {
            for (const [abilityId, cooldown] of this.enemyTypeAbilityCooldownTimers.entries()) {
                const nextCooldown = cooldown - dt;
                if (nextCooldown > 0) this.enemyTypeAbilityCooldownTimers.set(abilityId, nextCooldown);
                else this.enemyTypeAbilityCooldownTimers.delete(abilityId);
            }
        }
    }

    /**
     * Casts a downward ray to locate the floor surface, then positions the
     * blob shadow at the correct height (accounting for slopes).
     */
    private updateShadow(): void {
        // Cast a ray straight down to find the floor surface position and normal,
        // so the shadow is placed at the correct height on both flat and sloped floors.
        const floorRayStart = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
        const floorRayEnd = new CANNON.Vec3(this.body.position.x, this.body.position.y - SHADOW_CAST_DIST, this.body.position.z);
        const floorRay = new CANNON.Ray(floorRayStart, floorRayEnd);
        const floorRayResult = new CANNON.RaycastResult();
        floorRay.intersectWorld(this.world, { mode: CANNON.Ray.CLOSEST, result: floorRayResult, skipBackfaces: true });

        let shadowY = this.body.position.y - this.bodyHalfExtentY;
        let shadowNormal: THREE.Vector3 | undefined;
        if (floorRayResult.hasHit && floorRayResult.body !== this.body) {
            shadowY = floorRayResult.hitPointWorld.y;
            shadowNormal = new THREE.Vector3(
                floorRayResult.hitNormalWorld.x,
                floorRayResult.hitNormalWorld.y,
                floorRayResult.hitNormalWorld.z,
            );
        }
        this.blobShadow.update(this.body.position.x, shadowY, this.body.position.z, shadowNormal);
    }

    /**
     * Handles the post-death material fade-out.
     * Returns true when the fade is active and the rest of update should be skipped.
     */
    private handleDeathFade(dt: number): boolean {
        if (!this.isDeathFading) return false;

        this.footstepTimer = 0;
        this.deathFadeTimer += dt;
        const progress = this.deathFadeTimer / this.deathFadeDuration;

        if (progress >= 1) {
            this.isDead = true;
        } else {
            // Fade out materials
            this.materials.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.transparent = true;
                    mat.opacity = 1 - progress;
                }
            });
        }

        // Sync position during fade
        this.mesh.position.copy(this.body.position as any);
        this.mesh.position.y -= this.bodyHalfExtentY;
        return true;
    }

    /**
     * Handles the death animation while the enemy is dying.
     * Returns true when the dying animation is playing and the rest of update should be skipped.
     */
    private handleDying(dt: number): boolean {
        if (!this.isDying) return false;

        this.footstepTimer = 0;
        this.deathTimer += dt;

        // Friction for dying body
        this.body.velocity.x *= 0.9;
        this.body.velocity.z *= 0.9;

        // Sync position while playing death animation
        this.mesh.position.copy(this.body.position as any);
        this.mesh.position.y -= this.bodyHalfExtentY;
        return true;
    }

    /** Advances the block timer and removes the shield once the block duration expires. */
    private updateBlockTimer(dt: number): void {
        if (this.isBlocking) {
            this.blockTimer += dt;
            if (this.blockTimer >= this.BLOCK_DURATION) {
                this.isBlocking = false;
                this.blockShield?.detach();
            }
        }
    }

    /**
     * Runs the full movement AI for one frame.
     * Returns true when the enemy is actively moving this frame.
     */
    private runMovementAI(dt: number, playerPos: CANNON.Vec3, myPos: CANNON.Vec3, distToPlayer: number): boolean {
        let isMoving = false;
        this.isRetreatingForSpacing = false;
        this.isCorneredForSpacing = false;

        const dxBase = myPos.x - this.basePosition.x;
        const dzBase = myPos.z - this.basePosition.z;
        const distToBase = Math.sqrt(dxBase * dxBase + dzBase * dzBase);

        // Don't move while attacking
        if (!this.isAttacking) {
            // Check if player is in aggro range
            if (distToPlayer < this.aggroRange) {
                // Player in range - chase player
                this.isReturningToBase = false;
                this.returnToBaseTimer = 0;

                // Stuck detection: sample progress toward the player periodically
                this.stuckCheckCountdown -= dt;
                if (this.stuckCheckCountdown <= 0) {
                    const progressX = myPos.x - this.stuckLastX;
                    const progressZ = myPos.z - this.stuckLastZ;
                    const progress = Math.sqrt(progressX * progressX + progressZ * progressZ);
                    if (progress < STUCK_MIN_PROGRESS) {
                        this.stuckTimer += STUCK_CHECK_INTERVAL;
                    } else {
                        this.stuckTimer = 0;
                    }
                    this.stuckLastX = myPos.x;
                    this.stuckLastZ = myPos.z;
                    this.stuckCheckCountdown = STUCK_CHECK_INTERVAL;
                }

                // If stuck long enough and not already at attack range, try clearing path
                if (
                    this.stuckTimer >= STUCK_TRIGGER_TIME &&
                    distToPlayer > this.attackRange &&
                    this.attackTimer <= 0 &&
                    Math.random() < STUCK_ATTACK_CHANCE_PER_SECOND * dt
                ) {
                    this.stuckTimer = 0;
                    this.attack();
                }

                if (this.abilityMoveTimer > 0) {
                    this.abilityMoveTimer -= dt;
                }

                if (this.tryUseEnemyTypeMovementAbility(playerPos, myPos, distToPlayer)) {
                    isMoving = true;
                } else if (this.abilityMoveTimer > 0) {
                    // An ability is still controlling movement; don't override horizontal velocity.
                    isMoving = true;
                } else {
                    const preferredCombatDistanceBand = this.getPreferredCombatDistanceBand();
                    const moveResult = preferredCombatDistanceBand
                        ? this.computeCombatMovement(playerPos, myPos, distToPlayer, dt)
                        : this.computeMovement(playerPos, myPos, dt);
                    if (moveResult) {
                        this.body.velocity.x = moveResult.dirX * this.speed;
                        this.body.velocity.z = moveResult.dirZ * this.speed;
                        isMoving = true;

                        const angle = Math.atan2(moveResult.dirX, moveResult.dirZ);
                        const targetQuaternion = new THREE.Quaternion();
                        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                        this.mesh.quaternion.slerp(targetQuaternion, 10 * dt);
                    } else if (preferredCombatDistanceBand) {
                        // Ranged enemies stop inside their preferred stand-off band.
                        // Damping prevents them from drifting forward on leftover momentum.
                        this.body.velocity.x *= STANDOFF_VELOCITY_DAMPING;
                        this.body.velocity.z *= STANDOFF_VELOCITY_DAMPING;
                    } else {
                        this.body.velocity.x *= 0.9;
                        this.body.velocity.z *= 0.9;
                    }
                }
            } else {
                // Player out of range - reset stuck state and return to base after delay
                this.stuckTimer = 0;
                this.stuckCheckCountdown = STUCK_CHECK_INTERVAL;
                if (!this.isReturningToBase) {
                    // Start the wait timer
                    this.returnToBaseTimer += dt;

                    // After wait time, start returning
                    if (this.returnToBaseTimer >= this.returnWaitTime) {
                        this.isReturningToBase = true;
                    } else {
                        // Still waiting - apply idle friction
                        this.body.velocity.x *= 0.9;
                        this.body.velocity.z *= 0.9;
                    }
                } else {
                    // Return to base position
                    if (distToBase > this.baseArrivalThreshold) {
                        const moveResult = this.computeMovement(this.basePosition, myPos, dt);
                        if (moveResult) {
                            this.body.velocity.x = moveResult.dirX * this.speed;
                            this.body.velocity.z = moveResult.dirZ * this.speed;
                            isMoving = true;

                            const angle = Math.atan2(moveResult.dirX, moveResult.dirZ);
                            const targetQuaternion = new THREE.Quaternion();
                            targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                            this.mesh.quaternion.slerp(targetQuaternion, 10 * dt);
                        }
                    } else {
                        // Reached base - stop and reset
                        this.body.velocity.x *= 0.9;
                        this.body.velocity.z *= 0.9;
                        this.isReturningToBase = false;
                        this.returnToBaseTimer = 0;
                    }
                }
            }
        } else {
            // Stop movement while attacking
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;

            // Rotate towards player at a reduced pace while attacking
            const dir = playerPos.vsub(myPos);
            dir.y = 0;
            if (dir.length() > 0) {
                dir.normalize();
                const angle = Math.atan2(dir.x, dir.z);
                const targetQuaternion = new THREE.Quaternion();
                targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.mesh.quaternion.slerp(targetQuaternion, 3 * dt);
            }
        }

        return isMoving;
    }

    /** Handles attack cooldown, attack triggering, and the melee/ranged hitbox lifecycle. */
    private handleAttackLogic(dt: number, distToPlayer: number): void {
        // Attack Cooldown
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
        }

        // Attack Trigger
        if (this.shouldUseRangedAttack() &&
            this.isRetreatingForSpacing &&
            distToPlayer <= this.attackRange &&
            this.attackTimer <= 0 &&
            !this.isAttacking &&
            this.hasClearLineOfSightToPlayer() &&
            (this.isCorneredForSpacing || Math.random() < RETREAT_ATTACK_RATE_PER_SECOND * dt)
        ) {
            this.attack();
        } else if (this.canAttackPlayer(distToPlayer)) {
            this.attack();
        }

        // Handle attack hitbox activation and collision
        if (this.isAttacking) {
            this.attackAnimTimer += dt;

            // Fallback: end attack after max duration in case animation event doesn't fire
            if (this.attackAnimTimer >= this.attackMaxDuration) {
                this.isAttacking = false;
                this.deactivateAttackHitbox();
            } else {
                if (this.shouldUseRangedAttack()) {
                    const rangedWindowActive = this.attackAnimTimer >= this.attackHitboxDelay &&
                        this.attackAnimTimer < this.attackHitboxDelay + this.attackHitboxDuration;

                    if (rangedWindowActive && !this.hasSpawnedProjectileThisAttack) {
                        this.fireProjectile();
                    }
                } else {
                    // Activate hitbox after delay
                    if (this.attackAnimTimer >= this.attackHitboxDelay && !this.attackHitboxActive) {
                        this.activateAttackHitbox();
                    }

                    // Deactivate hitbox after its active duration
                    if (this.attackHitboxActive && this.attackAnimTimer >= this.attackHitboxDelay + this.attackHitboxDuration) {
                        this.deactivateAttackHitbox();
                    }

                    // Update hitbox position and check collision while active
                    if (this.attackHitboxActive) {
                        this.updateAttackHitboxPosition();
                        this.checkAttackHitboxCollision();
                    }
                }
            }
        }
    }

    /**
     * Attempts to execute a type-specific movement ability.
     * Returns true when an ability was executed (and regular chase movement
     * should be skipped for this frame), otherwise false.
     */
    private tryUseEnemyTypeMovementAbility(
        playerPos: CANNON.Vec3,
        myPos: CANNON.Vec3,
        distToPlayer: number,
    ): boolean {
        const movementAbilities = this.enemyTypeDefinition.movementAbilities;
        if (!movementAbilities || movementAbilities.length === 0) return false;

        for (const movementAbility of movementAbilities) {
            const cooldown = this.enemyTypeAbilityCooldownTimers.get(movementAbility.id) ?? 0;
            if (cooldown > 0) continue;

            const executed = movementAbility.execute({
                body: this.body,
                mesh: this.mesh,
                playerPos,
                myPos,
                distToPlayer,
                normalMoveSpeed: this.speed,
            });
            if (!executed) continue;

            const randomExtra = movementAbility.randomDelay != null ? Math.random() * movementAbility.randomDelay : 0;
            this.enemyTypeAbilityCooldownTimers.set(movementAbility.id, movementAbility.cooldown + randomExtra);
            this.abilityMoveTimer = movementAbility.moveDuration ?? 0;
            return true;
        }

        return false;
    }

    // Set flash color for damage effect
    // Setting the color to black (0x000000) resets to normal
    private setFlashColor(color: number) {
        this.materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.setHex(color);
            }
        });
    }

    /**
     * Compute a normalised movement direction toward `target`.
     *
     * When a {@link navGrid} is assigned, the enemy follows an A*-computed
     * path that avoids walls and obstacles.  Otherwise it falls back to a
     * straight-line direction.
     *
     * Returns `null` if the enemy is already at the target.
     */
    private computeMovement(
        target: CANNON.Vec3,
        myPos: CANNON.Vec3,
        dt: number,
    ): { dirX: number; dirZ: number } | null {
        // Age the cached path
        this.navPathAge += dt;

        if (this.navGrid) {
            const targetChanged = this.navPathTargetX === null ||
                this.navPathTargetZ === null ||
                Math.abs(this.navPathTargetX - target.x) > NAV_TARGET_CHANGE_RECOMPUTE_DISTANCE ||
                Math.abs(this.navPathTargetZ - target.z) > NAV_TARGET_CHANGE_RECOMPUTE_DISTANCE;
            // Recompute path periodically (player is moving)
            if (this.navPath.length === 0 || this.navPathAge >= this.NAV_RECOMPUTE_INTERVAL || targetChanged) {
                this.navPath = this.navGrid.findPath(myPos.x, myPos.z, target.x, target.z);
                this.navPathIndex = 0;
                this.navPathAge = 0;
                this.navPathTargetX = target.x;
                this.navPathTargetZ = target.z;
            }

            // Advance along the path
            if (this.navPath.length > 0 && this.navPathIndex < this.navPath.length) {
                const wp = this.navPath[this.navPathIndex];
                const dx = wp.x - myPos.x;
                const dz = wp.z - myPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Reached waypoint – advance to next
                if (dist < 0.8) {
                    this.navPathIndex++;
                    if (this.navPathIndex >= this.navPath.length) {
                        // Path finished, fall through to direct movement
                    } else {
                        const next = this.navPath[this.navPathIndex];
                        const nx = next.x - myPos.x;
                        const nz = next.z - myPos.z;
                        const nd = Math.sqrt(nx * nx + nz * nz);
                        if (nd > 0) return { dirX: nx / nd, dirZ: nz / nd };
                    }
                } else {
                    return { dirX: dx / dist, dirZ: dz / dist };
                }
            }
        }

        // Fallback: direct movement
        const dx = target.x - myPos.x;
        const dz = target.z - myPos.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len <= 0) return null;
        return { dirX: dx / len, dirZ: dz / len };
    }

    private computeMovementAwayFrom(target: CANNON.Vec3, myPos: CANNON.Vec3): { dirX: number; dirZ: number } | null {
        const dx = myPos.x - target.x;
        const dz = myPos.z - target.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len <= 0) return null;
        return { dirX: dx / len, dirZ: dz / len };
    }

    private getPreferredCombatDistanceBand(): { min: number; max: number } | null {
        const preferredDistance = this.enemyCombatBehavior.preferredDistance;
        if (preferredDistance === undefined) return null;
        const tolerance = this.enemyCombatBehavior.preferredDistanceTolerance ?? 0;
        return {
            min: Math.max(0, preferredDistance - tolerance),
            max: preferredDistance + tolerance,
        };
    }

    private computeCombatMovement(
        playerPos: CANNON.Vec3,
        myPos: CANNON.Vec3,
        distToPlayer: number,
        dt: number,
    ): { dirX: number; dirZ: number } | null {
        // Prioritize moving to get line of sight before considering combat distance bands
        if (!this.hasClearLineOfSightToPlayer()) {
            return this.computeMovement(playerPos, myPos, dt);
        }

        const preferredBand = this.getPreferredCombatDistanceBand();
        if (!preferredBand) {
            return this.computeMovement(playerPos, myPos, dt);
        }
        if (distToPlayer > preferredBand.max) {
            return this.computeMovement(playerPos, myPos, dt);
        }
        if (distToPlayer < preferredBand.min) {
            this.isRetreatingForSpacing = true;
            const retreatMovement = this.computeRetreatMovement(playerPos, myPos, preferredBand, dt);
            if (!retreatMovement) {
                this.isCorneredForSpacing = true;
            }
            return retreatMovement;
        }

        return null;
    }

    private shouldUseRangedAttack(): boolean {
        return this.enemyCombatBehavior.attackMode === EnemyAttackMode.Ranged;
    }

    private computeRetreatMovement(
        playerPos: CANNON.Vec3,
        myPos: CANNON.Vec3,
        preferredBand: { min: number; max: number },
        dt: number,
    ): { dirX: number; dirZ: number } | null {
        if (!this.navGrid) {
            return this.computeMovementAwayFrom(playerPos, myPos);
        }

        const retreatTarget = this.findRetreatTarget(playerPos, myPos, preferredBand);
        if (!retreatTarget) {
            return null;
        }

        return this.computeMovement(retreatTarget, myPos, dt);
    }

    private findRetreatTarget(
        playerPos: CANNON.Vec3,
        myPos: CANNON.Vec3,
        preferredBand: { min: number; max: number },
    ): CANNON.Vec3 | null {
        if (!this.navGrid) {
            return null;
        }

        const away = myPos.vsub(playerPos);
        away.y = 0;
        if (away.length() <= 0) {
            return null;
        }
        away.normalize();

        const preferredDistance = this.enemyCombatBehavior.preferredDistance ??
            (preferredBand.min + preferredBand.max) / 2;
        const baseAngle = Math.atan2(away.z, away.x);

        for (const angleOffset of RETREAT_ANGLE_OFFSETS) {
            const angle = baseAngle + angleOffset;
            const candidate = new CANNON.Vec3(
                playerPos.x + Math.cos(angle) * preferredDistance,
                myPos.y,
                playerPos.z + Math.sin(angle) * preferredDistance,
            );
            const path = this.navGrid.findPath(myPos.x, myPos.z, candidate.x, candidate.z);
            if (path.length > 0) {
                return candidate;
            }
        }

        return null;
    }

    private getRawRangedAttackEndpoints(): { start: THREE.Vector3; end: THREE.Vector3 } {
        const targetY = this.player.body.position.y + RANGED_TARGET_VERTICAL_OFFSET;
        const start = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y + this.bodyHalfExtentY * RANGED_ORIGIN_VERTICAL_FACTOR,
            this.body.position.z,
        );
        const target = new CANNON.Vec3(this.player.body.position.x, targetY, this.player.body.position.z);
        const direction = target.vsub(start);
        const distance = direction.length();

        if (distance <= 0) {
            const point = new THREE.Vector3(start.x, start.y, start.z);
            return { start: point, end: point.clone() };
        }

        direction.normalize();
        const rangedStartOffset = Math.max(this.radius * RANGED_START_OFFSET_FACTOR, RANGED_MIN_START_OFFSET);
        start.x += direction.x * rangedStartOffset;
        start.y += direction.y * RANGED_VERTICAL_OFFSET;
        start.z += direction.z * rangedStartOffset;

        return {
            start: new THREE.Vector3(start.x, start.y, start.z),
            end: new THREE.Vector3(target.x, target.y, target.z),
        };
    }

    private ensureProjectile(): void {
        if (this.projectile) return;

        const geometry = new THREE.BoxGeometry(
            RANGED_PROJECTILE_WIDTH,
            RANGED_PROJECTILE_HEIGHT,
            RANGED_PROJECTILE_LENGTH,
        );
        const material = new THREE.MeshBasicMaterial({
            color: this.enemyCombatBehavior.projectileColor ?? POD_PROJECTILE_COLOR,
        });
        this.projectile = new THREE.Mesh(geometry, material);
        this.projectile.visible = false;
        this.scene.add(this.projectile);
    }

    private fireProjectile(): void {
        const rangedEndpoints = this.getRawRangedAttackEndpoints();
        const direction = rangedEndpoints.end.clone().sub(rangedEndpoints.start);
        const distance = direction.length();
        if (distance <= 0) {
            return;
        }

        this.ensureProjectile();
        if (!this.projectile) return;

        direction.normalize();
        this.projectile.position.copy(rangedEndpoints.start);
        this.projectile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
        this.projectile.visible = true;
        this.projectileVelocity.copy(direction);
        this.projectileRemainingLifetime = PROJECTILE_LIFETIME;
        this.projectileActive = true;
        this.hasSpawnedProjectileThisAttack = true;
    }

    private updateProjectile(dt: number): void {
        if (!this.projectileActive || !this.projectile) return;

        const start = this.projectile.position.clone();
        const end = start.clone().addScaledVector(this.projectileVelocity, PROJECTILE_SPEED * dt);
        const blockerHit = this.findProjectileBlocker(start, end);
        const segmentEnd = blockerHit?.point ?? end;
        const blockerDistance = blockerHit ? start.distanceTo(blockerHit.point) : null;
        this.projectile.position.copy(segmentEnd);

        const playerHitDistance = this.getProjectileHitDistance(start, segmentEnd);
        if (!this.hasDealtDamageThisAttack &&
            playerHitDistance !== null &&
            (blockerDistance === null || playerHitDistance < blockerDistance)
        ) {
            this.dealDamage();
            this.hasDealtDamageThisAttack = true;
            this.hideProjectile();
            return;
        }

        if (blockerHit) {
            this.hideProjectile();
            return;
        }

        this.projectileRemainingLifetime -= dt;
        if (this.projectileRemainingLifetime <= 0) {
            this.hideProjectile();
        }
    }

    private hasClearLineOfSightToPlayer(): boolean {
        const { start, end } = this.getRawRangedAttackEndpoints();
        return this.findProjectileBlocker(start, end) === null;
    }

    private findProjectileBlocker(
        start: THREE.Vector3,
        end: THREE.Vector3,
    ): { point: THREE.Vector3; body: CANNON.Body } | null {
        const hits: { distance: number; point: THREE.Vector3; body: CANNON.Body }[] = [];
        const startVec = new CANNON.Vec3(start.x, start.y, start.z);
        const endVec = new CANNON.Vec3(end.x, end.y, end.z);

        this.world.raycastAll(
            startVec,
            endVec,
            { skipBackfaces: true },
            (result: CANNON.RaycastResult) => {
                if (!result.body || !this.isProjectileBlockingBody(result.body)) {
                    return;
                }

                hits.push({
                    distance: startVec.distanceTo(result.hitPointWorld),
                    point: new THREE.Vector3(
                        result.hitPointWorld.x,
                        result.hitPointWorld.y,
                        result.hitPointWorld.z,
                    ),
                    body: result.body,
                });
            },
        );

        if (hits.length === 0) {
            return null;
        }

        hits.sort((a, b) => a.distance - b.distance);
        return {
            point: hits[0].point,
            body: hits[0].body,
        };
    }

    private isProjectileBlockingBody(body: CANNON.Body): boolean {
        const bodyMetadata = body as CANNON.Body & {
            isAttackHitbox?: boolean;
            isEnemyAttackHitbox?: boolean;
            isTrigger?: boolean;
        };

        if (body === this.body || body === this.player.body || body === this.attackHitboxBody) {
            return false;
        }

        if (bodyMetadata.isAttackHitbox || bodyMetadata.isEnemyAttackHitbox || bodyMetadata.isTrigger) {
            return false;
        }

        if (body.collisionResponse === false) {
            return false;
        }

        return body.mass === 0;
    }

    private getProjectileHitDistance(start: THREE.Vector3, end: THREE.Vector3): number | null {
        const playerTarget = new THREE.Vector3(
            this.player.body.position.x,
            this.player.body.position.y + RANGED_TARGET_VERTICAL_OFFSET,
            this.player.body.position.z,
        );
        const closestPoint = new THREE.Vector3();
        new THREE.Line3(start, end).closestPointToPoint(playerTarget, true, closestPoint);
        if (closestPoint.distanceToSquared(playerTarget) >
            RANGED_PROJECTILE_PLAYER_HIT_RADIUS * RANGED_PROJECTILE_PLAYER_HIT_RADIUS
        ) {
            return null;
        }
        return start.distanceTo(closestPoint);
    }

    private dealDamage(): void {
        const isCriticalHit = Math.random() < this.criticalChance;
        const damage = isCriticalHit
            ? Math.floor(this.damage * this.criticalHitMultiplier)
            : this.damage;
        this.player.takeDamage(damage, this.body.position, isCriticalHit);
    }

    private hideProjectile(): void {
        this.projectileActive = false;
        this.projectileRemainingLifetime = 0;
        if (this.projectile) {
            this.projectile.visible = false;
        }
    }

    /**
     * Check if the enemy can attack the player
     */
    private canAttackPlayer(distToPlayer: number): boolean {
        if (this.shouldUseRangedAttack()) {
            const minimumAttackDistance = this.enemyCombatBehavior.minimumAttackDistance ?? 0;
            return distToPlayer >= minimumAttackDistance &&
                distToPlayer <= this.attackRange &&
                this.attackTimer <= 0 &&
                !this.isAttacking &&
                this.hasClearLineOfSightToPlayer();
        }
        const attackRangeVariance = Math.random() * this.attackRange * 0.3;
        return distToPlayer < this.attackRange + attackRangeVariance &&
            this.attackTimer <= 0 &&
            !this.isAttacking;
    }

    attack() {
        this.attackTimer = this.attackCooldown;
        this.isAttacking = true;
        this.attackAnimTimer = 0;
        this.hasDealtDamageThisAttack = false;
        this.hasSpawnedProjectileThisAttack = false;

        console.log("Enemy attacks!");
        AudioManager.Instance.playAttack('enemy');
        this.fadeToAction(EnemyActionType.Attack, 0.1);
    }

    /**
     * Determine if the enemy should block this incoming hit.
     * Probability: blockChance * reductionFactor, where reductionFactor is 1.0 at
     * agility=1 (no reduction) and 0.5 at agility=10000 (50% reduction).
     */
    private tryBlock(): boolean {
        const reductionFactor = 1 - 0.5 * Math.min((this.player.agility - 1) / (10000 - 1), 1);
        console.log(`Block check: baseChance=${this.blockChance}, reductionFactor=${reductionFactor.toFixed(2)}, effectiveChance=${(this.blockChance * reductionFactor).toFixed(2)}`);
        const effectiveBlockChance = this.blockChance * reductionFactor;
        return Math.random() < effectiveBlockChance;
    }

    private activateBlock(): void {
        this.isBlocking = true;
        this.blockTimer = 0;
        // Immobilize enemy for block duration
        this.stunTimer = this.BLOCK_DURATION;
        // TODO: fade to a dedicated "Blocking" animation when available
        this.fadeToAction(EnemyActionType.Idle, 0.1);

        if (!this.blockShield) {
            this.blockShield = new BlockShield();
        }
        this.blockShield.attachTo(this.mesh);
    }

    takeDamage(amount: number, isCriticalHit: boolean, sourcePos?: CANNON.Vec3, knockbackFactor: number = 1.0): void {
        if (this.isDying || this.isDead) return;

        // Taking damage from the player immediately enables aggro so the
        // enemy fights back even when hit from outside its room.
        this.aggroEnabled = true;

        if (!this.isBlocking && this.tryBlock()) {
            this.activateBlock();
        }

        // Knockback
        if (sourcePos) {
            const knockbackDir = this.body.position.vsub(sourcePos);
            knockbackDir.y = 0; // Keep it horizontal
            if (knockbackDir.length() > 0) {
                knockbackDir.normalize();
                if (this.isBlocking) {
                    // Reduce knockback when blocking
                    knockbackFactor *= this.blockedKnockbackFactor;
                }
                const force = this.knockbackForce * knockbackFactor; // Increased force
                this.body.velocity.x = knockbackDir.x * force;
                this.body.velocity.z = knockbackDir.z * force;
            }
        }

        // If already blocking, absorb the hit (no damage, no knockback)
        if (this.isBlocking) return;

        this.hp -= amount;

        // Reset return-to-base behavior when taking damage
        this.isReturningToBase = false;
        this.returnToBaseTimer = 0;
        this.floatingIndicatorManager.spawnDamage(this.body.position, amount, isCriticalHit ? '#bf860c' : '#fdc650ff');
        AudioManager.Instance.playDamage('enemy');

        // Flash white
        this.setFlashColor(0xffffff);
        this.flashTimer = 0.1; // 100ms
        this.stunTimer = 0.5; // 0.5s stun

        if (this.hp <= 0) {
            this.die();
            // Stop further processing to avoid unintended behavior
            return;
        }

        // Play TakeHit animation
        this.fadeToAction(EnemyActionType.TakeHit, 0.05, true);

        // Cancel attack if in progress
        if (this.isAttacking) {
            this.isAttacking = false;
            this.deactivateAttackHitbox();
            this.hideProjectile();
        }
    }

    die() {
        this.isDying = true;
        this.footstepTimer = 0;
        this.deathTimer = 0;

        // Cancel any ongoing attack
        if (this.isAttacking) {
            this.isAttacking = false;
            this.deactivateAttackHitbox();
            this.hideProjectile();
        }

        // Disable collision only against the player while still colliding with
        // world geometry so defeated enemies can fall naturally during fade-out.
        this.body.collisionFilterMask &= ~PLAYER_COLLISION_GROUP;
        this.body.velocity.x = 0;
        this.body.velocity.z = 0;
        AudioManager.Instance.playDeath('enemy');

        // Play death animation
        this.fadeToAction(EnemyActionType.Death, 0.1);
    }

    private updateFootstepAudio(dt: number, isMoving: boolean): void {
        if (!isMoving || this.isAttacking || this.isBlocking) {
            this.footstepTimer = 0;
            return;
        }

        if (this.footstepTimer <= 0) {
            AudioManager.Instance.playFootstep('enemy');
            this.footstepTimer = 0.4;
            return;
        }

        this.footstepTimer -= dt;
    }

    /**
     * Get the position where X-Data should spawn (at enemy's death location)
     */
    getDeathPosition(): CANNON.Vec3 {
        return new CANNON.Vec3(this.body.position.x, this.body.position.y - this.bodyHalfExtentY, this.body.position.z);
    }

    /**
     * Clean up enemy resources and remove from scene/world
     */
    cleanup(): void {
        this.deactivateAttackHitbox();
        this.hideProjectile();
        if (this.projectile) {
            this.scene.remove(this.projectile);
            this.projectile.geometry.dispose();
            (this.projectile.material as THREE.Material).dispose();
            this.projectile = null;
        }
        if (this.blockShield) {
            this.blockShield.dispose();
            this.blockShield = null;
        }
        this.blobShadow.cleanup();
        this.scene.remove(this.mesh);
        this.world.removeBody(this.body);
        this.disposeMesh();
    }
}
