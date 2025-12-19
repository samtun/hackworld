import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from './InputManager';
import { Weapon, WeaponType } from './items/Weapon';
import { Enemy } from './enemies/Enemy';
import { Item } from './InventoryManager';
import { WeaponRegistry } from './items/WeaponRegistry';

export class Player {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    input: InputManager;
    weapon: Weapon;
    speed: number = 6;
    currentWeaponType: WeaponType = WeaponType.SWORD;

    // Track enemies hit during current attack phase to prevent multiple hits
    // For dual blade, this gets reset between phases to allow double-hitting
    private enemiesHitThisPhase: Set<Enemy> = new Set();

    // Ground detection threshold
    private static readonly GROUND_VELOCITY_THRESHOLD = 0.1;

    // Stat caps and upgrade amounts
    private static readonly MAX_STAT_VALUE = 9999;
    private static readonly HP_TP_UPGRADE_AMOUNT = 5;
    private static readonly STRENGTH_DEFENSE_UPGRADE_AMOUNT = 1;

    // Base Stats (without equipment modifiers or upgrades)
    private baseStrength: number = 14;
    private baseDefense: number = 17;
    private baseSpeed: number = 6;

    // Stats (with equipment modifiers applied)
    level: number = 1;
    exp: number = 0;
    expRequired: number = 1000; // EXP needed for next level
    private static readonly MAX_LEVEL = 999;
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
    private readonly DASH_DURATION: number = 0.4;
    private readonly DASH_SPEED: number = 30;
    private dashDirection: THREE.Vector3 = new THREE.Vector3();
    private chargeParticles: THREE.Mesh[] = [];
    private dashHitEnemies: Set<Enemy> = new Set();

    // Particle wall constants
    private readonly PARTICLE_BASE_HEIGHT: number = 0.2;
    private readonly PARTICLE_CHARGED_HEIGHT: number = 0.8;
    private readonly PARTICLE_HEIGHT_TRANSITION_SPEED: number = 0.15;

    // Ground contact tracking
    private isGrounded: boolean = false;

    // Inventory
    inventory: Item[] = [];
    money: number = 500; // Starting money

    constructor(scene: THREE.Scene, world: CANNON.World, input: InputManager, physicsMaterial: CANNON.Material) {
        this.input = input;

        // Initial weapons from registry
        const allWeapons = WeaponRegistry.getAllWeapons();
        let itemId = 1;
        for (const weaponDef of allWeapons) {
            this.inventory.push({
                id: itemId.toString(),
                name: weaponDef.name,
                type: 'weapon',
                weaponType: weaponDef.type,
                damage: weaponDef.baseDamage,
                buyPrice: weaponDef.baseBuyPrice,
                sellPrice: weaponDef.baseSellPrice,
                isEquipped: weaponDef.type === WeaponType.SWORD // Equip sword by default
            });
            itemId++;
        }

        // Visual Mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Physics Body
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        this.body = new CANNON.Body({
            mass: 3, // Dynamic body
            position: new CANNON.Vec3(0, 0.5, 0), // Start on ground (0.5 = half height of 1-unit box)
            shape: shape,
            fixedRotation: true, // Prevent tipping over
            material: physicsMaterial
        });
        // Damping to stop sliding
        this.body.linearDamping = 0.9;
        world.addBody(this.body);

        // Weapon - get damage from the equipped weapon item
        const equippedWeapon = this.inventory.find(item => item.type === 'weapon' && item.isEquipped);
        const weaponDamage = equippedWeapon?.damage || 10;
        this.weapon = new Weapon(this.mesh, this.currentWeaponType, weaponDamage, scene, world);
    }

    equipWeapon(itemId: string) {
        // Unequip all weapons first
        this.inventory.forEach(item => {
            if (item.type === 'weapon') {
                item.isEquipped = false;
            }
        });

        // Equip the new weapon by ID
        const weaponItem = this.inventory.find(item => item.id === itemId);
        if (weaponItem && weaponItem.type === 'weapon' && weaponItem.weaponType && weaponItem.damage !== undefined) {
            weaponItem.isEquipped = true;
            this.currentWeaponType = weaponItem.weaponType;
            this.weapon.changeWeaponType(this.mesh, weaponItem.weaponType, weaponItem.damage);
        }
    }

    equipCore(itemId: string) {
        // Unequip all cores first
        this.inventory.forEach(item => {
            if (item.type === 'core') {
                item.isEquipped = false;
            }
        });

        // Equip the new core by ID
        const coreItem = this.inventory.find(item => item.id === itemId);
        if (coreItem && coreItem.type === 'core' && coreItem.coreStats) {
            coreItem.isEquipped = true;
        }

        // Recalculate stats with new core
        this.recalculateStats();
    }

    private recalculateStats() {
        // Calculate level multiplier
        const levelMultiplier = this.getLevelMultiplier();

        // Start with base stats (including upgrades) and apply level multiplier
        this.strength = Math.min(Math.floor((this.baseStrength + this.strengthUpgrades) * levelMultiplier), Player.MAX_STAT_VALUE);
        this.defense = Math.min(Math.floor((this.baseDefense + this.defenseUpgrades) * levelMultiplier), Player.MAX_STAT_VALUE);
        this.speed = this.baseSpeed * levelMultiplier;
        this.maxHp = Math.min(100 + (this.hpUpgrades * Player.HP_TP_UPGRADE_AMOUNT), Player.MAX_STAT_VALUE);
        this.maxTp = Math.min(100 + (this.tpUpgrades * Player.HP_TP_UPGRADE_AMOUNT), Player.MAX_STAT_VALUE);

        // Ensure current HP/TP don't exceed new max
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        if (this.tp > this.maxTp) this.tp = this.maxTp;

        // Apply core modifiers if a core is equipped
        const equippedCore = this.inventory.find(item => item.type === 'core' && item.isEquipped);
        if (equippedCore && equippedCore.coreStats) {
            if (equippedCore.coreStats.strength !== undefined) {
                this.strength = Math.min(this.strength + equippedCore.coreStats.strength, Player.MAX_STAT_VALUE);
            }
            if (equippedCore.coreStats.defense !== undefined) {
                this.defense = Math.min(this.defense + equippedCore.coreStats.defense, Player.MAX_STAT_VALUE);
            }
            if (equippedCore.coreStats.speed !== undefined) {
                this.speed += equippedCore.coreStats.speed;
            }
        }
    }

    update(dt: number, enemies: Enemy[] = [], isNearInteractive: boolean = false) {
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
            this.mesh.position.copy(this.body.position as any);
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
            this.mesh.position.copy(this.body.position as any);

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
        this.mesh.position.copy(this.body.position as any);
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
            // Execute immediate attack
            if (this.weapon.attack()) {
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
        this.weapon.update(dt, this.mesh.position, this.mesh.quaternion);

        // Check for hits if weapon is attacking and has an active hitbox
        if (this.weapon.isAttacking && this.weapon.attackBody) {
            this.checkAttackHits(enemies);
        }

        // Invulnerability Timer
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
            // Flash effect
            if (Math.floor(this.invulnerableTimer * 10) % 2 === 0) {
                (this.mesh.material as THREE.MeshStandardMaterial).opacity = 0.5;
                (this.mesh.material as THREE.MeshStandardMaterial).transparent = true;
            } else {
                (this.mesh.material as THREE.MeshStandardMaterial).opacity = 1.0;
            }
        } else {
            (this.mesh.material as THREE.MeshStandardMaterial).opacity = 1.0;
            (this.mesh.material as THREE.MeshStandardMaterial).transparent = false;
        }

        // Update input state tracking at end of frame
        this.input.updateState();
    }

    checkAttackHits(enemies: Enemy[]) {
        const damage = this.weapon.damage;
        const attackBody = this.weapon.attackBody;

        // If we have a physics attack hitbox, use it for collision detection
        if (attackBody) {
            for (const enemy of enemies) {
                if (enemy.isDead || enemy.isDying) continue;

                // Skip if we already hit this enemy during this attack phase
                if (this.enemiesHitThisPhase.has(enemy)) continue;

                // Check if attack hitbox overlaps with enemy body
                if (this.checkCollision(attackBody, enemy.body)) {
                    enemy.takeDamage(damage, this.mesh.position);
                    console.log(`Hit enemy with ${this.currentWeaponType}! Damage: ${damage}`);

                    // Mark this enemy as hit for this attack phase
                    this.enemiesHitThisPhase.add(enemy);
                }
            }
        } else {
            // Fallback to old range/angle based detection if no hitbox exists
            const attackRange = this.weapon.stats.range;
            const attackAngle = this.weapon.stats.attackAngle;
            const playerPos = this.mesh.position;
            const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);

            for (const enemy of enemies) {
                if (enemy.isDead || enemy.isDying) continue;

                // Skip if we already hit this enemy during this attack phase
                if (this.enemiesHitThisPhase.has(enemy)) continue;

                const enemyPos = enemy.mesh.position;
                const dist = playerPos.distanceTo(enemyPos);

                if (dist < attackRange) {
                    const dirToEnemy = enemyPos.clone().sub(playerPos).normalize();
                    const angle = playerForward.angleTo(dirToEnemy);

                    if (angle < attackAngle / 2) {
                        enemy.takeDamage(damage, this.mesh.position);
                        console.log(`Hit enemy with ${this.currentWeaponType}! Damage: ${damage}`);

                        // Mark this enemy as hit for this attack phase
                        this.enemiesHitThisPhase.add(enemy);
                    }
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
        if (this.invulnerableTimer > 0 || this.isDashing) return;

        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;

        this.invulnerableTimer = 1.0; // 1 second invulnerability
        console.log(`Player took ${amount} damage. HP: ${this.hp}`);
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
            if (this.weapon.attack()) {
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
                enemy.takeDamage(damage, this.mesh.position);
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
        return Math.floor(1000 + level * 30 + Math.pow(level, 2) * 0.07);
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

        console.log(`Level Up! Now level ${this.level}. Next level requires ${this.expRequired} EXP.`);
    }

    /**
     * Get the level multiplier for stats
     * Formula: 1 + 0.002 * level
     */
    private getLevelMultiplier(): number {
        return 1 + 0.002 * this.level;
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
