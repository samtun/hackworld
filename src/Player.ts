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
        if (this.input.isAttackPressed()) {
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
        if (this.invulnerableTimer > 0) return;

        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;

        this.invulnerableTimer = 1.0; // 1 second invulnerability
        console.log(`Player took ${amount} damage. HP: ${this.hp}`);
    }
}
