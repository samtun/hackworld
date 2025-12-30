import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from './InputManager';
import { Weapon, WeaponType } from './items/Weapon';
import { Enemy } from './enemies/Enemy';
import { Item } from './items/Item';
import { WeaponItem } from './items/WeaponItem';
import { CoreItem } from './items/CoreItem';
import { ChipItem } from './items/ChipItem';
import { EquippableItem } from './items/EquippableItem';
import { WeaponDefinition, WeaponRegistry } from './items/WeaponRegistry';
import { BaseMesh } from './BaseMesh';

export class Player extends BaseMesh {
    id: string;
    body: CANNON.Body;
    input: InputManager;
    weapon: Weapon;
    speed: number = 6;
    currentWeaponType: WeaponType = WeaponType.SWORD;
    innerMesh?: THREE.Mesh;
    position: THREE.Vector3;

    // Scene and World references for items
    public scene: THREE.Scene;
    public world: CANNON.World;

    private weaponRegistry: WeaponRegistry;

    // Track enemies hit during current attack phase to prevent multiple hits
    // For dual blade, this gets reset between phases to allow double-hitting
    private enemiesHitThisPhase: Set<Enemy> = new Set();

    // Ground detection threshold
    private static readonly GROUND_VELOCITY_THRESHOLD = 0.1;

    // Stat caps and upgrade amounts
    private static readonly MAX_STAT_VALUE = 9999;
    private static readonly HP_TP_UPGRADE_AMOUNT = 5;
    private static readonly STRENGTH_DEFENSE_UPGRADE_AMOUNT = 1;

    // Level system constants
    private static readonly MAX_LEVEL = 999;
    private static readonly LEVEL_STAT_MULTIPLIER = 1.002; // Stats increase by (1 + 0.002) * level
    private static readonly LEVEL_HP_MULTIPLIER = 10.01; // HP increase by (10 + 0.01) * level
    private static readonly LEVEL_TP_MULTIPLIER = 5.005; // TP increase by (5 + 0.005) * level
    private static readonly EXP_BASE = 350;
    private static readonly EXP_LINEAR_FACTOR = 30;
    private static readonly EXP_QUADRATIC_FACTOR = 0.07;

    // Base Stats (without equipment modifiers or upgrades)
    private baseStrength: number = 14;
    private baseDefense: number = 17;

    // Stats (with equipment modifiers applied)
    level: number = 1;
    exp: number = 0;
    expRequired: number = Player.EXP_BASE; // EXP needed for next level
    maxHp: number = 100;
    hp: number = 100;
    maxTp: number = 100;
    tp: number = 100;
    strength: number = 14;
    defense: number = 17;
    invulnerableTimer: number = 0;

    // X-Data resource
    xData: number = 0;

    // Upgrade levels for X-Data upgrades
    strengthUpgrades: number = 0;
    defenseUpgrades: number = 0;
    hpUpgrades: number = 0;
    tpUpgrades: number = 0;

    // Charged Attack
    private isChargingAttack: boolean = false;
    private chargeTimer: number = 0;
    private readonly CHARGE_DURATION: number = 1.0;
    private readonly CHARGE_DELAY: number = 0.2; // Wait 0.2s before starting charge animation
    private chargeDelayTimer: number = 0;
    private isDashing: boolean = false;
    private dashTimer: number = 0;
    private readonly DASH_DURATION: number = 0.3;
    private readonly DASH_SPEED: number = 25;
    private dashDirection: THREE.Vector3 = new THREE.Vector3();
    private chargeParticles: THREE.Mesh[] = [];
    private dashHitEnemies: Set<Enemy> = new Set();

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

    // Death state
    isDead: boolean = false;
    private deathCallback?: () => void;

    // Inventory
    inventory: Item[] = [];
    money: number = 500; // Starting money

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, input: InputManager, physicsMaterial: CANNON.Material) {
        super('models/npc_placeholder.glb');
        this.scene = scene;
        this.world = world;
        this.id = crypto.randomUUID();
        this.input = input;
        this.weaponRegistry = WeaponRegistry.Instance;
        this.position = position.clone() as any;

        // Initial weapons from registry
        const sword = this.weaponRegistry.getWeaponById('aegis_sword');
        if (!sword) {
            throw new Error("The default sword could not be loaded");
        }

        const swordItem = new WeaponItem(
            crypto.randomUUID(),
            sword.name,
            sword.baseBuyPrice,
            sword.baseSellPrice,
            sword.type,
            sword.baseDamage,
            sword.model
        );

        // Initialize weapon visual
        this.weapon = new Weapon(sword.model, sword.type, sword.baseDamage, scene, world);
        this.setWeapon(swordItem);

        this.inventory.push(swordItem);
        // We manually equip it here to sync state without triggering full equip logic yet
        swordItem.isEquipped = true;
        this.currentWeaponType = sword.type;

        // Visual Mesh
        this.mesh.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
                this.innerMesh = obj;
            }
        });

        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Physics Body
        const box = new THREE.Box3().setFromObject(this.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
        const shape = new CANNON.Box(halfExtents);

        this.body = new CANNON.Body({
            mass: 3, // Static body
            position: new CANNON.Vec3(position.x, halfExtents.y, position.z),
            shape: shape,
            fixedRotation: true,
            material: physicsMaterial
        });

        // Damping to stop sliding
        this.body.linearDamping = 0.9;
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
        const levelStatBonus = this.getLevelStatBonus();
        const levelHpBonus = this.getLevelHpBonus();
        const levelTpBonus = this.getLevelTpBonus();

        // Start with base stats (including upgrades) and apply level multiplier
        this.strength = Math.min(Math.floor((this.baseStrength + this.strengthUpgrades) * levelStatBonus), Player.MAX_STAT_VALUE);
        this.defense = Math.min(Math.floor((this.baseDefense + this.defenseUpgrades) * levelStatBonus), Player.MAX_STAT_VALUE);
        this.maxHp = Math.min(100 + (this.hpUpgrades * Player.HP_TP_UPGRADE_AMOUNT) + levelHpBonus, Player.MAX_STAT_VALUE);
        this.maxTp = Math.min(100 + (this.tpUpgrades * Player.HP_TP_UPGRADE_AMOUNT) + levelTpBonus, Player.MAX_STAT_VALUE);

        // Ensure current HP/TP don't exceed new max
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        if (this.tp > this.maxTp) this.tp = this.maxTp;

        // Apply core modifiers if a core is equipped
        const equippedCore = this.inventory.find(item => item instanceof CoreItem && item.isEquipped) as CoreItem | undefined;
        if (equippedCore && equippedCore.stats) {
            if (equippedCore.stats.strength !== undefined) {
                this.strength = Math.min(this.strength + equippedCore.stats.strength, Player.MAX_STAT_VALUE);
            }
            if (equippedCore.stats.defense !== undefined) {
                this.defense = Math.min(this.defense + equippedCore.stats.defense, Player.MAX_STAT_VALUE);
            }
            if (equippedCore.stats.speed !== undefined) {
                this.speed += equippedCore.stats.speed;
            }
        }

        // Apply chip modifiers if a chip is equipped
        const equippedChip = this.inventory.find(item => item instanceof ChipItem && item.isEquipped) as ChipItem | undefined;
        if (equippedChip && equippedChip.stats) {
            if (equippedChip.stats.walkSpeedMultiplier !== undefined) {
                this.speed *= equippedChip.stats.walkSpeedMultiplier;
            }
        }
    }

    getWeaponRangeMultiplier(): number {
        const equippedChip = this.inventory.find(item => item instanceof ChipItem && item.isEquipped) as ChipItem | undefined;
        if (equippedChip && equippedChip.stats && equippedChip.stats.weaponRangeMultiplier !== undefined) {
            return equippedChip.stats.weaponRangeMultiplier;
        }
        return 1.0; // Default: no multiplier
    }

    update(dt: number, enemies: Enemy[] = [], isNearInteractive: boolean = false) {
        // Skip all updates if player is dead
        if (this.isDead) {
            return;
        }

        // Charged Attack: Handle dashing
        if (this.isDashing) {
            this.dashTimer += dt;

            // Move in dash direction at high speed
            this.body.velocity.x = this.dashDirection.x * this.DASH_SPEED;
            this.body.velocity.z = this.dashDirection.z * this.DASH_SPEED;

            // Check for enemy collisions during dash (3x damage)
            this.checkDashHits(enemies);

            // End dash after duration
            if (this.dashTimer >= this.DASH_DURATION) {
                this.isDashing = false;
                this.dashHitEnemies.clear();
            }

            // Sync Mesh with Body
            this.syncPosition();
            return; // Skip normal movement during dash
        }

        // Charged Attack: Handle charging
        if (this.isChargingAttack) {
            this.chargeTimer += dt;

            // Update particle positions and height based on charge progress
            this.updateChargeParticles();

            // Check if attack button is released
            if (this.input.isAttackReleased()) {
                if (this.chargeTimer >= this.CHARGE_DURATION) {
                    // Fully charged, execute dash attack
                    this.executeDashAttack();
                } else {
                    // Not fully charged, cancel
                    this.cancelChargeAttack();
                }
            }

            // Player cannot move during charging
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;

            // Sync Mesh with Body
            this.syncPosition();

            return; // Skip normal combat and movement logic
        }

        // Movement
        const inputVector = this.input.getMovementVector();

        // Rotate movement to match isometric camera (45 degrees)
        // Camera is at (10, 10, 10), so we rotate input by -45 degrees
        const angle = -Math.PI / 4;
        const moveX = inputVector.x * Math.cos(angle) - inputVector.y * Math.sin(angle);
        const moveZ = inputVector.x * Math.sin(angle) + inputVector.y * Math.cos(angle);

        // Apply velocity based on input
        // We set velocity directly for responsive controls, but keep Y velocity (gravity)
        this.body.velocity.x = moveX * this.speed;
        this.body.velocity.z = moveZ * this.speed;

        // Rotation: Face movement direction
        if (inputVector.length() > 0.1) {
            const rotationAngle = Math.atan2(moveX, moveZ);

            // Smooth rotation using Quaternion slerp
            const targetQuaternion = new THREE.Quaternion();
            targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);
            this.mesh.quaternion.slerp(targetQuaternion, 15 * dt);
        }

        // Sync Mesh with Body
        this.syncPosition();

        // We handle rotation manually for the character facing, 
        // but if we wanted physics rotation we'd copy quaternion.
        // this.mesh.quaternion.copy(this.body.quaternion as any);

        // Ground detection: Check if player is on ground by velocity and position stability
        // Player is grounded if vertical velocity is very low (not falling or jumping)
        this.isGrounded = Math.abs(this.body.velocity.y) < Player.GROUND_VELOCITY_THRESHOLD;

        // Jump: Only allow jumping if player is grounded, not near an interactable, and not pressing select
        // This prevents jumping when using A button (gamepad) or Enter to interact with objects
        if (this.input.isJumpPressed() && this.isGrounded && !isNearInteractive) {
            this.body.velocity.y = 10;
        }

        // Combat
        // Track attack button state for charge timing
        if (this.input.isAttackJustPressed()) {
            // Button was just pressed - reset charge timer
            this.chargeDelayTimer = 0;
        }

        // Check for immediate attack on button press (only trigger once per press)
        if (this.input.isAttackJustPressed() && !this.weapon.isAttacking && !this.isChargingAttack) {
            // Execute immediate attack with range multiplier from chip
            if (this.weapon.attack(this.getWeaponRangeMultiplier())) {
                // Clear the list of enemies hit for this new attack
                this.enemiesHitThisPhase.clear();

                // For dual blade, set up callback to reset hit tracking between phases
                if (this.currentWeaponType === WeaponType.DUAL_BLADE) {
                    this.weapon.onDamageFrame = () => {
                        // Reset hit tracking for the next phase
                        this.enemiesHitThisPhase.clear();
                    };
                }
            }
        }

        // Check if attack button is being held (for charging)
        // Charge timer increments while button is held, regardless of attack state
        if (this.input.isAttackHeld() && !this.isChargingAttack) {
            this.chargeDelayTimer += dt;

            // Only start charging attack after 0.2s delay AND when weapon is not attacking
            if (this.chargeDelayTimer >= this.CHARGE_DELAY && !this.weapon.isAttacking) {
                this.startChargeAttack();
            }
        } else if (!this.input.isAttackHeld()) {
            // Reset delay timer when button is released
            this.chargeDelayTimer = 0;
        }

        // Update weapon (handles animation and hitbox positioning)
        this.weapon.update(dt, this.position, this.mesh.quaternion);

        // Check for hits if weapon is attacking and has an active hitbox
        if (this.weapon.isAttacking && this.weapon.body) {
            this.checkAttackHits(enemies);
        }

        // Invulnerability Timer
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
            // Flash effect
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

        // Update level up particles if active
        this.updateLevelUpParticles(dt);

        // Update input state tracking at end of frame
        this.input.updateState();
    }

    private syncPosition() {
        // Align the visual mesh with the physics body using the body's shape dimensions,
        // not the world-space AABB, to avoid incorrect offsets as the player moves.
        let y = this.body.position.y;
        const primaryShape = this.body.shapes[0];

        if (primaryShape instanceof CANNON.Box) {
            // Place the mesh origin at the bottom of the box by subtracting half the height.
            y = this.body.position.y - primaryShape.halfExtents.y;
        }

        const newPosition = new THREE.Vector3(this.body.position.x, y, this.body.position.z);
        this.position.copy(newPosition);
        this.mesh.position.copy(newPosition);
    }

    move(position: CANNON.Vec3): void {
        this.body.position.copy(position);
        this.syncPosition();
    }

    checkAttackHits(enemies: Enemy[]) {
        const damage = this.weapon.damage;
        const attackBody = this.weapon.body;

        if (attackBody) {
            attackBody.position.set(attackBody.position.x, this.position.y + 1.0, attackBody.position.z);
            for (const enemy of enemies) {
                if (enemy.isDead || enemy.isDying) continue;

                // Skip if we already hit this enemy during this attack phase
                if (this.enemiesHitThisPhase.has(enemy)) continue;

                // Check if attack hitbox overlaps with enemy body
                if (this.checkCollision(attackBody, enemy.body)) {
                    enemy.takeDamage(damage, this.position);
                    console.log(`Hit enemy with ${this.currentWeaponType}! Damage: ${damage}`);

                    // Mark this enemy as hit for this attack phase
                    this.enemiesHitThisPhase.add(enemy);
                }
            }
        }
    }

    private checkCollision(body1: CANNON.Body, body2: CANNON.Body): boolean {
        // Simple AABB (Axis-Aligned Bounding Box) collision check
        const shape1 = body1.shapes[0];
        const shape2 = body2.shapes[0];

        if (shape1 instanceof CANNON.Box && shape2 instanceof CANNON.Box) {
            const pos1 = body1.position;
            const pos2 = body2.position;
            const halfExtents1 = shape1.halfExtents;
            const halfExtents2 = shape2.halfExtents;

            // Check overlap on all three axes
            const overlapX = Math.abs(pos1.x - pos2.x) < (halfExtents1.x + halfExtents2.x);
            const overlapY = Math.abs(pos1.y - pos2.y) < (halfExtents1.y + halfExtents2.y);
            const overlapZ = Math.abs(pos1.z - pos2.z) < (halfExtents1.z + halfExtents2.z);

            return overlapX && overlapY && overlapZ;
        }

        return false;
    }

    takeDamage(amount: number) {
        if (this.invulnerableTimer > 0 || this.isDashing || this.isDead) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return;
        }

        this.invulnerableTimer = 1.0; // 1 second invulnerability
        console.log(`Player took ${amount} damage. HP: ${this.hp}`);
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
        const wasCharging = this.chargeTimer > 0;
        this.chargeTimer = 0;
        this.removeChargeParticles();

        // If we were charging but didn't complete, do a normal attack
        if (wasCharging) {
            if (this.weapon.attack(this.getWeaponRangeMultiplier())) {
                // Clear the list of enemies hit for this new attack
                this.enemiesHitThisPhase.clear();

                // For dual blade, set up callback to reset hit tracking between phases
                if (this.currentWeaponType === WeaponType.DUAL_BLADE) {
                    this.weapon.onDamageFrame = () => {
                        // Reset hit tracking for the next phase
                        this.enemiesHitThisPhase.clear();
                    };
                }
            }
        }

        console.log('Cancelled charge attack, executing normal attack');
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

    private checkDashHits(enemies: Enemy[]) {
        // Check collision with player body during dash
        for (const enemy of enemies) {
            if (enemy.isDead || enemy.isDying) continue;

            // Skip if we already hit this enemy during this dash
            if (this.dashHitEnemies.has(enemy)) continue;

            // Check if player body overlaps with enemy body
            if (this.checkCollision(this.body, enemy.body)) {
                // Deal 3x weapon damage
                const damage = this.weapon.damage * 3;
                enemy.takeDamage(damage, this.position);
                console.log(`Dash hit enemy! Damage: ${damage} (3x)`);

                // Mark this enemy as hit during this dash
                this.dashHitEnemies.add(enemy);
            }
        }
    }

    /**
     * Collect X-Data
     */
    collectXData(amount: number): void {
        this.xData += amount;
        console.log(`Collected ${amount} X-Data. Total: ${this.xData}`);
    }

    /**
     * Calculate EXP required for next level
     * Formula: 1000 + level*30 + level^2 * 0.07
     */
    private calculateExpRequired(level: number): number {
        return Math.floor(
            Player.EXP_BASE +
            level * Player.EXP_LINEAR_FACTOR +
            Math.pow(level, 2) * Player.EXP_QUADRATIC_FACTOR
        );
    }

    /**
     * Gain EXP and handle level ups
     * @param amount - Amount of EXP to gain
     */
    gainExp(amount: number): void {
        if (this.level >= Player.MAX_LEVEL) {
            console.log('Player is at max level');
            return;
        }

        this.exp += amount;
        console.log(`Gained ${amount} EXP. Current: ${this.exp}/${this.expRequired}`);

        // Check for level up(s)
        while (this.exp >= this.expRequired && this.level < Player.MAX_LEVEL) {
            this.levelUp();
        }
    }

    /**
     * Level up the player
     */
    private levelUp(): void {
        this.exp -= this.expRequired;
        this.level++;

        // Calculate new required EXP for next level
        if (this.level < Player.MAX_LEVEL) {
            this.expRequired = this.calculateExpRequired(this.level);
        }

        // Recalculate stats with level multiplier
        this.recalculateStats();

        // Trigger level up particle explosion
        this.createLevelUpParticles();

        // Heal player up to max HP and TP
        this.heal(this.maxHp, this.maxTp);

        console.log(`Level Up! Now level ${this.level}. Next level requires ${this.expRequired} EXP.`);
    }

    /**
     * Get the level bonus for stats
     */
    private getLevelStatBonus(): number {
        return Math.floor(Player.LEVEL_STAT_MULTIPLIER * (this.level - 1));
    }

    /**
     * Get the level bonus for HP
     */
    private getLevelHpBonus(): number {
        return Math.floor(Player.LEVEL_HP_MULTIPLIER * (this.level - 1));
    }

    /**
     * Get the level bonus for TP
     */
    private getLevelTpBonus(): number {
        return Math.floor(Player.LEVEL_TP_MULTIPLIER * (this.level - 1));
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
    upgradeWithXData(statType: 'strength' | 'defense' | 'hp' | 'tp'): boolean {
        let currentLevel = 0;
        let currentValue = 0;

        switch (statType) {
            case 'strength':
                currentLevel = this.strengthUpgrades;
                currentValue = this.baseStrength + this.strengthUpgrades;
                break;
            case 'defense':
                currentLevel = this.defenseUpgrades;
                currentValue = this.baseDefense + this.defenseUpgrades;
                break;
            case 'hp':
                currentLevel = this.hpUpgrades;
                currentValue = 100 + (this.hpUpgrades * Player.HP_TP_UPGRADE_AMOUNT);
                break;
            case 'tp':
                currentLevel = this.tpUpgrades;
                currentValue = 100 + (this.tpUpgrades * Player.HP_TP_UPGRADE_AMOUNT);
                break;
        }

        // Check if stat would exceed 9999 cap
        const upgradeAmount = (statType === 'hp' || statType === 'tp')
            ? Player.HP_TP_UPGRADE_AMOUNT
            : Player.STRENGTH_DEFENSE_UPGRADE_AMOUNT;
        if (currentValue + upgradeAmount > Player.MAX_STAT_VALUE) {
            console.log(`${statType} is already at max value (${Player.MAX_STAT_VALUE})`);
            return false;
        }

        const cost = this.getUpgradeCost(currentLevel);

        if (this.xData >= cost) {
            this.xData -= cost;

            switch (statType) {
                case 'strength':
                    this.strengthUpgrades++;
                    break;
                case 'defense':
                    this.defenseUpgrades++;
                    break;
                case 'hp':
                    this.hpUpgrades++;
                    // Heal player when upgrading HP
                    this.hp += Player.HP_TP_UPGRADE_AMOUNT;
                    break;
                case 'tp':
                    this.tpUpgrades++;
                    // Restore TP when upgrading
                    this.tp += Player.HP_TP_UPGRADE_AMOUNT;
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
     * Returns base value + upgrades only, capped at 9999
     */
    getBaseStatValue(statType: 'strength' | 'defense' | 'hp' | 'tp'): number {
        switch (statType) {
            case 'strength':
                return Math.min(this.baseStrength + this.strengthUpgrades, Player.MAX_STAT_VALUE);
            case 'defense':
                return Math.min(this.baseDefense + this.defenseUpgrades, Player.MAX_STAT_VALUE);
            case 'hp':
                return Math.min(100 + (this.hpUpgrades * Player.HP_TP_UPGRADE_AMOUNT), Player.MAX_STAT_VALUE);
            case 'tp':
                return Math.min(100 + (this.tpUpgrades * Player.HP_TP_UPGRADE_AMOUNT), Player.MAX_STAT_VALUE);
        }
    }
}
