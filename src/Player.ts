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

    constructor(scene: THREE.Scene, world: CANNON.World, input: InputManager, physicsMaterial: CANNON.Material) {
        this.input = input;

        // Initial Loot - Four weapons with specific names
        this.inventory.push({ id: '1', name: 'Aegis Sword', type: 'weapon', weaponType: WeaponType.SWORD });
        this.inventory.push({ id: '2', name: 'Rune Blade', type: 'weapon', weaponType: WeaponType.DUAL_BLADE });
        this.inventory.push({ id: '3', name: 'Fierce Lance', type: 'weapon', weaponType: WeaponType.LANCE });
        this.inventory.push({ id: '4', name: 'Battle Hawk', type: 'weapon', weaponType: WeaponType.HAMMER });
        this.inventory.push({ id: '5', name: 'Data Core α', type: 'core' });

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
        this.weapon = new Weapon(this.mesh, this.currentWeaponType);
    }

    equipWeapon(weaponType: WeaponType) {
        this.currentWeaponType = weaponType;
        this.weapon.changeWeaponType(this.mesh, weaponType);
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
        this.isGrounded = Math.abs(this.body.velocity.y) < 0.1;

        // Jump: Only allow jumping if player is grounded
        if (this.input.isJumpPressed() && this.isGrounded) {
            this.body.velocity.y = 10;
        }

        // Combat
        if (this.input.isAttackPressed()) {
            if (this.weapon.attack()) {
                this.checkAttackHits(enemies);
            }
        }
        this.weapon.update(dt);

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
        // Use weapon stats for range and angle
        const attackRange = this.weapon.stats.range;
        const attackAngle = this.weapon.stats.attackAngle;
        const damage = this.weapon.stats.damage;

        const playerPos = this.mesh.position;
        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);

        for (const enemy of enemies) {
            if (enemy.isDead || enemy.isDying) continue;

            const enemyPos = enemy.mesh.position;
            const dist = playerPos.distanceTo(enemyPos);

            if (dist < attackRange) {
                const dirToEnemy = enemyPos.clone().sub(playerPos).normalize();
                const angle = playerForward.angleTo(dirToEnemy);

                if (angle < attackAngle / 2) {
                    enemy.takeDamage(damage, this.mesh.position);
                    console.log(`Hit enemy with ${this.currentWeaponType}! Damage: ${damage}`);
                }
            }
        }
    }

    takeDamage(amount: number) {
        if (this.invulnerableTimer > 0) return;

        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;

        this.invulnerableTimer = 1.0; // 1 second invulnerability
        console.log(`Player took ${amount} damage. HP: ${this.hp}`);
    }
}
