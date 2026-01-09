import * as THREE from 'three';
import * as CANNON from 'cannon-es';
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

export class Player extends BaseMesh {
    id: string;
    body: CANNON.Body;
    input: InputManager;
    weapon: Weapon;
    currentWeaponType: WeaponType = WeaponType.SWORD;
    innerMesh?: THREE.Mesh;
    position: THREE.Vector3;

    // Scene and World references for items
    public scene: THREE.Scene;
    public world: CANNON.World;

    private weaponRepository: WeaponRepository;

    // Track enemies hit during current attack phase to prevent multiple hits
    // For dual blade, this gets reset between phases to allow double-hitting
    private enemiesHitThisPhase: Set<Enemy> = new Set();

    // Knockback strength
    private readonly KNOCKBACK_FORCE = 80;

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
    private readonly JUMP_FORCE = 6.6;

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
    private attackLockedUntilRelease: boolean = false;

    // Particle wall constants
    private readonly PARTICLE_BASE_HEIGHT: number = 0.2;
    private readonly PARTICLE_CHARGED_HEIGHT: number = 0.8;
    private readonly PARTICLE_HEIGHT_TRANSITION_SPEED: number = 0.15;

    // Level up particle explosion
    private levelUpParticles: Array<{ mesh: THREE.Mesh, velocity: THREE.Vector3 }> = [];
    private levelUpParticleTimer: number = 0;
    private readonly LEVEL_UP_PARTICLE_LIFETIME: number = 0.6; // 0.6 seconds for the explosion

    // Ground contact tracking
    private isGrounded: boolean = false;
    private stunTimer: number = 0;
    private jumpCooldownTimer: number = 0;

    // Death state
    isDead: boolean = false;
    private deathCallback?: () => void;

    // Callback for spawning damage numbers
    onDamageTaken?: (position: CANNON.Vec3, amount: number) => void;

    // Callback for spawning tech indicators
    onTechGained?: (position: CANNON.Vec3) => void;

    // Inventory
    inventory: Item[] = [];
    money: number = 500; // Starting money

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, input: InputManager, physicsMaterial: CANNON.Material) {
        super('models/main_character.glb');
        this.scene = scene;
        this.world = world;
        this.id = crypto.randomUUID();
        this.input = input;
        this.weaponRepository = WeaponRepository.Instance;
        this.position = position.clone() as any;

        // Initial weapon from repository (already cloned with unique ID)
        const swordItem = this.weaponRepository.getWeaponById('aegis_sword_alpha');
        if (!swordItem) {
            throw new Error("The default sword could not be loaded");
        }

        // Initialize weapon visual
        this.weapon = new Weapon(swordItem.model, swordItem.weaponType, swordItem.damage, scene, world);
        this.setWeapon(swordItem);

        this.inventory.push(swordItem);
        // We manually equip it here to sync state without triggering full equip logic yet
        swordItem.isEquipped = true;
        this.currentWeaponType = swordItem.weaponType;

        // Visual Mesh
        this.mesh.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
                this.innerMesh = obj;
            }
        });

        if (!this.innerMesh) {
            // Log a warning so missing effects are not silent failures.
            console.warn(
                '[Player] No THREE.Mesh found in player model hierarchy; some visual effects may not render.'
            );
        }

        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Physics Body
        const box = new THREE.Box3().setFromObject(this.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const radius = size.x / 2;
        const bodyHeight = size.y - radius;
        const cylinderShape = new CANNON.Cylinder(radius, radius, bodyHeight, 12);

        // Add base body collider
        this.body = new CANNON.Body({
            mass: 3, // Dynamic body
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: cylinderShape,
            fixedRotation: true,
            material: physicsMaterial
        });

        // Add head (to make objects colliding from above slide off)
        this.body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0, bodyHeight - 0.75, 0));

        // Damping to stop sliding
        this.body.linearDamping = 0.9;

        this.body.addEventListener('collide', (e: any) => {
            const entity = e.body.entity;
            if (entity && entity instanceof Enemy) {
                if (this.isDashing) {
                    this.handleDashHit(entity);
                }
            }
        });

        world.addBody(this.body);
    }

    equipWeapon(itemId: string) {
        const weaponItem = this.inventory.find(item => item.id === itemId);
        if (weaponItem instanceof WeaponItem) {
            weaponItem.equip(this);
        }
    }

    public setWeapon(weaponItem: WeaponItem) {
        this.currentWeaponType = weaponItem.weaponType;
        this.weapon.changeWeaponType(this.mesh, weaponItem.weaponType, weaponItem.damage);
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
                this.onTechGained(this.body.position);
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

    update(dt: number, isNearInteractive: boolean = false) {
        // Skip all updates if player is dead
        if (this.isDead) return;

        // Handle dash and charging (these short-circuit the rest of the update)
        if (this.handleDash(dt)) return;
        if (this.handleCharging(dt)) return;

        // Movement and physics sync
        this.handleMovement(dt, isNearInteractive);
        this.syncPosition();

        // Combat (attacks / charge start / weapon updates)
        this.handleCombat(dt);

        // Clear attack lock when button released
        if (this.input.isAttackReleased()) this.attackLockedUntilRelease = false;

        // Invulnerability flash and timers
        this.handleInvulnerability(dt)

        // Update level-up particles and input state
        this.updateLevelUpParticles(dt);
        this.input.updateState();
    }

    private handleDash(dt: number): boolean {
        if (!this.isDashing) return false;
        this.dashTimer += dt;
        this.body.velocity.x = this.dashDirection.x * this.DASH_SPEED;
        this.body.velocity.z = this.dashDirection.z * this.DASH_SPEED;

        if (this.dashTimer >= this.DASH_DURATION) {
            this.isDashing = false;
            this.dashHitEnemies.clear();
        }
        this.syncPosition();
        return true;
    }

    private handleCharging(dt: number): boolean {
        if (!this.isChargingAttack) return false;
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

        this.body.velocity.x = 0;
        this.body.velocity.z = 0;
        this.syncPosition();
        return true;
    }

    private handleMovement(dt: number, isNearInteractive: boolean) {
        const inputVector = this.input.getMovementVector();

        if (this.jumpCooldownTimer > 0) {
            this.jumpCooldownTimer -= dt;
        }

        if (this.stunTimer > 0) {
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
            const shape = this.body.shapes[0] as CANNON.Cylinder;
            const halfHeight = shape?.height / 2.0;
            const end = new CANNON.Vec3(start.x, start.y - halfHeight - 0.2, start.z);

            const ray = new CANNON.Ray(start, end);
            ray.skipBackfaces = true;
            const result = new CANNON.RaycastResult();
            ray.intersectWorld(this.world, { mode: CANNON.Ray.CLOSEST, result: result, skipBackfaces: true });

            this.isGrounded = result.hasHit && result.body !== this.body;

            if (this.input.isJumpPressed() && this.isGrounded && !isNearInteractive && this.jumpCooldownTimer <= 0) {
                this.body.velocity.y = this.JUMP_FORCE;
                console.warn('Player jumped');
                this.jumpCooldownTimer = 1.0;
            }
        } else {
            this.body.velocity.x *= 0.8;
            this.body.velocity.z *= 0.8;
        }
    }

    private handleCombat(dt: number) {
        if (this.attackLockedUntilRelease) return;

        // Track attack press for charge timer
        if (this.input.isAttackJustPressed()) this.chargeDelayTimer = 0;

        // Immediate attack (requires fresh press and not charging)
        if (this.input.isAttackJustPressed() && !this.weapon.isAttacking && !this.isChargingAttack) {
            if (this.weapon.attack(this.getWeaponRangeMultiplier())) {
                this.enemiesHitThisPhase.clear();
                if (this.currentWeaponType === WeaponType.DUAL_BLADE) {
                    this.weapon.onDamageFrame = () => this.enemiesHitThisPhase.clear();
                }

                if (this.weapon.body) {
                    this.weapon.body.addEventListener('collide', (e: any) => {
                        const entity = e.body.entity;
                        if (entity && entity instanceof Enemy) {
                            this.handleAttackHit(entity);
                        }
                    });
                }
            }
        }

        // Charging
        if (this.input.isAttackHeld() && !this.isChargingAttack) {
            this.chargeDelayTimer += dt;
            if (this.chargeDelayTimer >= this.CHARGE_DELAY && !this.weapon.isAttacking) this.startChargeAttack();
        } else if (!this.input.isAttackHeld()) {
            this.chargeDelayTimer = 0;
        }

        // Weapon update & hit checks
        this.weapon.update(dt, this.position, this.mesh.quaternion);
    }

    private handleInvulnerability(dt: number) {
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
            if (Math.floor(this.invulnerableTimer * 10) % 2 === 0) {
                (this.innerMesh?.material as THREE.MeshStandardMaterial).opacity = 0.5;
                (this.innerMesh?.material as THREE.MeshStandardMaterial).transparent = true;
            } else {
                (this.innerMesh?.material as THREE.MeshStandardMaterial).opacity = 1.0;
            }
        } else {
            (this.innerMesh?.material as THREE.MeshStandardMaterial).opacity = 1.0;
            (this.innerMesh?.material as THREE.MeshStandardMaterial).transparent = false;
        }
    }

    syncPosition() {
        // Align the visual mesh with the physics body using the body's shape dimensions,
        // not the world-space AABB, to avoid incorrect offsets as the player moves.
        let y = this.body.position.y;
        const primaryShape = this.body.shapes[0];

        if (primaryShape instanceof CANNON.Cylinder) {
            // Place the mesh origin at the bottom of the box by subtracting half the height.
            y = this.body.position.y - primaryShape.height / 2.0;
        }

        const newPosition = new THREE.Vector3(this.body.position.x, y, this.body.position.z);
        this.position.copy(newPosition);
        this.mesh.position.copy(newPosition);
    }

    move(position: CANNON.Vec3): void {
        this.body.position.copy(position);
        this.syncPosition();
    }

    private handleDashHit(enemy: Enemy) {
        if (enemy.isDead || enemy.isDying) return;

        // Skip if we already hit this enemy during this dash
        if (this.dashHitEnemies.has(enemy)) return;

        // Deal 3x weapon damage with tech multiplier
        const damage = this.getHitDamage(3);
        enemy.takeDamage(damage, this.body.position);
        console.log(`Dash hit enemy! Damage: ${damage} (3x)`);

        this.tryIncrementWeaponTech(enemy.techDropRateFactor);

        // Mark this enemy as hit during this dash
        this.dashHitEnemies.add(enemy);
    }

    private handleAttackHit(enemy: Enemy) {
        if (enemy.isDead || enemy.isDying) return;

        // Skip if we already hit this enemy during this attack phase
        if (this.enemiesHitThisPhase.has(enemy)) return;

        const damage = this.getHitDamage();
        enemy.takeDamage(damage, this.body.position);
        console.log(`Hit enemy with ${this.currentWeaponType}! Damage: ${damage}`);

        this.tryIncrementWeaponTech(enemy.techDropRateFactor);

        // Mark this enemy as hit for this attack phase
        this.enemiesHitThisPhase.add(enemy);
    }

    takeDamage(amount: number, sourcePos?: CANNON.Vec3) {
        console.log(`Player taking ${amount} damage. Timer: ${this.invulnerableTimer}`);
        if (this.invulnerableTimer > 0 || this.isDashing || this.isDead) return;

        // Apply defense multiplier to reduce damage
        const defenseMultiplier = 1 - this.getDefenseMultiplier();
        const reducedDamage = Math.max(1, Math.floor(amount * defenseMultiplier));

        this.hp -= reducedDamage;

        // Spawn damage number if callback is set
        if (this.onDamageTaken) {
            this.onDamageTaken(this.body.position, reducedDamage);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return;
        }

        // Apply brief invulnerability
        this.invulnerableTimer = 1.0; // 1 second invulnerability

        // Knockback: push player away from source horizontally and give small upward impulse
        if (sourcePos) {
            this.stunTimer = 0.3; // 0.3 seconds stun
            const knockDir = this.body.position.vsub(sourcePos);
            knockDir.y = 0;
            if (knockDir.length() > 0) {
                knockDir.normalize();
                this.body.applyImpulse(new CANNON.Vec3(knockDir.x * this.KNOCKBACK_FORCE, 5, knockDir.z * this.KNOCKBACK_FORCE), knockDir);
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

        // TODO: Add death animation here (placeholder for future implementation)

        // Hide player mesh
        this.mesh.visible = false;

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
    respawn(position: CANNON.Vec3): void {
        this.isDead = false;
        this.hp = this.maxHp;
        this.tp = this.maxTp;
        this.invulnerableTimer = 2.0; // 2 seconds invulnerability after respawn

        // Reset position and velocity
        this.body.position.copy(position);
        this.body.velocity.set(0, 0, 0);

        // Make player visible again
        this.mesh.visible = true;

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
        console.log('Started charging attack');
    }

    private cancelChargeAttack() {
        this.isChargingAttack = false;
        this.chargeTimer = 0;
        this.removeChargeParticles();
        this.attackLockedUntilRelease = true;

        console.log('Cancelled charge attack');
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

        console.log('Executing dash attack');
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
        const particleCount = 30;
        // Create shared geometry for all particles
        const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00, // Yellow
            emissive: 0xffff00,
            emissiveIntensity: 1.5, // Increased for brighter particles
            transparent: true,
            opacity: 1.0
        });

        // Create particles in all directions (spherical explosion)
        for (let i = 0; i < particleCount; i++) {
            // Random spherical coordinates for explosion direction
            const theta = Math.random() * Math.PI * 2; // Azimuth angle (0 to 2π)
            const phi = Math.random() * Math.PI; // Polar angle (0 to π)

            // Convert to Cartesian coordinates for velocity
            const speed = 3 + Math.random() * 2; // Random speed between 3-5 units/sec
            const vx = speed * Math.sin(phi) * Math.cos(theta);
            const vy = speed * Math.sin(phi) * Math.sin(theta);
            const vz = speed * Math.cos(phi);

            // Clone material for each particle (needed for independent opacity during fade)
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

        // Trigger level up particle explosion
        this.createLevelUpParticles();

        // Heal player up to max HP and TP
        this.heal(this.maxHp, this.maxTp);

        console.log(`Level Up! Now level ${this.level}. Next level requires ${this.expRequired} EXP. ${this.statPointsAvailable} stat points available.`);
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
