import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from './InputManager';
import { Weapon, WeaponType } from './Weapon';
import { Enemy } from './Enemy';
import { Item } from './InventoryManager';

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

    // Stats
    maxHp: number = 100;
    hp: number = 100;
    maxTp: number = 100;
    tp: number = 100;
    strength: number = 14;
    defense: number = 17;
    invulnerableTimer: number = 0;
    
    // Charged Attack
    private isChargingAttack: boolean = false;
    private chargeTimer: number = 0;
    private readonly CHARGE_DURATION: number = 1.0;
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

        // Initial Loot - Four weapons with specific names (with prices)
        this.inventory.push({ id: '1', name: 'Aegis Sword', type: 'weapon', weaponType: WeaponType.SWORD, buyPrice: 100, sellPrice: 50, isEquipped: true });
        this.inventory.push({ id: '2', name: 'Rune Blade', type: 'weapon', weaponType: WeaponType.DUAL_BLADE, buyPrice: 150, sellPrice: 75, isEquipped: false });
        this.inventory.push({ id: '3', name: 'Fierce Lance', type: 'weapon', weaponType: WeaponType.LANCE, buyPrice: 120, sellPrice: 60, isEquipped: false });
        this.inventory.push({ id: '4', name: 'Battle Hawk', type: 'weapon', weaponType: WeaponType.HAMMER, buyPrice: 180, sellPrice: 90, isEquipped: false });
        this.inventory.push({ id: '5', name: 'Data Core α', type: 'core', buyPrice: 200, sellPrice: 100, isEquipped: false });

        // Visual Mesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Physics Body
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        this.body = new CANNON.Body({
            mass: 1, // Dynamic body
            position: new CANNON.Vec3(0, 0.5, 0), // Start on ground (0.5 = half height of 1-unit box)
            shape: shape,
            fixedRotation: true, // Prevent tipping over
            material: physicsMaterial
        });
        // Damping to stop sliding
        this.body.linearDamping = 0.9;
        world.addBody(this.body);

        // Weapon
        this.weapon = new Weapon(this.mesh, this.currentWeaponType, scene, world);
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
        if (weaponItem && weaponItem.type === 'weapon' && weaponItem.weaponType) {
            weaponItem.isEquipped = true;
            this.currentWeaponType = weaponItem.weaponType;
            this.weapon.changeWeaponType(this.mesh, weaponItem.weaponType);
        }
    }

    update(dt: number, enemies: Enemy[] = []) {
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

        // Jump: Only allow jumping if player is grounded
        if (this.input.isJumpPressed() && this.isGrounded) {
            this.body.velocity.y = 10;
        }

        // Combat
        // Check if attack button is being held (for charging)
        if (this.input.isAttackHeld() && !this.weapon.isAttacking && !this.isChargingAttack) {
            // Start charging attack if button is held and not currently attacking
            this.startChargeAttack();
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
        const damage = this.weapon.stats.damage;
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
                const damage = this.weapon.stats.damage * 3;
                enemy.takeDamage(damage, this.mesh.position);
                console.log(`Dash hit enemy! Damage: ${damage} (3x)`);
                
                // Mark this enemy as hit during this dash
                this.dashHitEnemies.add(enemy);
            }
        }
    }
}
