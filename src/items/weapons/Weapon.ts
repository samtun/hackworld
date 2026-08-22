import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AssetManager } from '../../AssetManager.ts';
import { BaseMesh } from '../../BaseMesh.ts';
import { WeaponType } from './WeaponType';

interface WeaponStats {
    attackSpeed: number; // Duration in seconds
    range: number;
    attackAngle: number; // In radians
}

// Hitbox configuration for each weapon type
interface WeaponHitboxConfig {
    radius: number; // Radius of the weapon collider
    height: number; // Height of the weapon collider
}

export class Weapon extends BaseMesh {
    private static WEAPON_MODEL_PATHS: Record<WeaponType, string> = {
        [WeaponType.SWORD]: 'models/aegis_sword.glb',
        [WeaponType.DUAL_BLADE]: 'models/rune_blade.glb',
        [WeaponType.LANCE]: 'models/fierce_lance.glb',
        [WeaponType.HAMMER]: 'models/battle_hawk.glb'
    };

    private static WEAPON_CONFIGS: Record<WeaponType, WeaponStats> = {
        [WeaponType.SWORD]: {
            attackSpeed: 0.3,
            range: 2.0,
            attackAngle: Math.PI / 2 // 90 degrees
        },
        [WeaponType.DUAL_BLADE]: {
            attackSpeed: 0.2,
            range: 1.5,
            attackAngle: Math.PI / 3 // 60 degrees
        },
        [WeaponType.LANCE]: {
            attackSpeed: 0.5,
            range: 3.0,
            attackAngle: Math.PI / 4 // 45 degrees
        },
        [WeaponType.HAMMER]: {
            attackSpeed: 0.7,
            range: 1.8,
            attackAngle: Math.PI / 2 // 90 degrees
        }
    };

    // Delay before attack hitbox becomes active (in seconds)
    private static WEAPON_ATTACK_DELAYS: Record<WeaponType, number> = {
        [WeaponType.SWORD]: 0.12,
        [WeaponType.DUAL_BLADE]: 0.07,
        [WeaponType.LANCE]: 0.12,
        [WeaponType.HAMMER]: 0.3
    };

    // Hitbox configurations that roughly fit each weapon model
    private static WEAPON_HITBOX_CONFIGS: Record<WeaponType, WeaponHitboxConfig> = {
        [WeaponType.SWORD]: {
            radius: 0.42,
            height: 1.5,
        },
        [WeaponType.DUAL_BLADE]: {
            radius: 0.37,
            height: 1.3,
        },
        [WeaponType.LANCE]: {
            radius: 0.32,
            height: 2.2,
        },
        [WeaponType.HAMMER]: {
            radius: 0.5,
            height: 1.65,
        }
    };

    body?: CANNON.Body;
    isAttacking: boolean = false;
    weaponType: WeaponType;
    stats: WeaponStats;
    damage: number; // Actual damage value for this weapon instance

    onDamageFrame?: () => void; // Callback for when damage should be dealt
    onHit?: (event: any) => void; // Callback for when weapon hits something

    // Physics bodies for attack hitboxes
    private physicsWorld?: CANNON.World;

    // Parent bone reference for world position calculations
    private parentBone?: THREE.Object3D;

    // Attack delay tracking
    private attackDelayTimer: number = 0;
    private pendingRangeMultiplier: number = 1.0;
    private hitboxActive: boolean = false;

    constructor(
        assetManager: AssetManager,
        modelAsset: string,
        weaponType: WeaponType = WeaponType.SWORD,
        damage: number = 10,
        physicsWorld?: CANNON.World) {
        super(modelAsset, assetManager);
        this.weaponType = weaponType;
        this.stats = Weapon.WEAPON_CONFIGS[weaponType];
        this.damage = damage;
        this.physicsWorld = physicsWorld;
    }

    attack(rangeMultiplier: number = 1.0): boolean {
        if (this.isAttacking) return false;
        this.isAttacking = true;

        // Store range multiplier and reset delay timer - hitbox will be created after delay
        this.pendingRangeMultiplier = rangeMultiplier;
        this.attackDelayTimer = 0;
        this.hitboxActive = false;

        return true;
    }

    private createAttackHitbox(rangeMultiplier: number = 1.0) {
        if (!this.physicsWorld) return;

        // Remove old attack body if it exists
        if (this.body) {
            this.physicsWorld.removeBody(this.body);
        }

        // Get hitbox config for this weapon type
        const config = Weapon.WEAPON_HITBOX_CONFIGS[this.weaponType];
        const weaponRadius = config.radius * rangeMultiplier;
        const weaponHeight = config.height * rangeMultiplier;
        const shape = new CANNON.Cylinder(weaponRadius, weaponRadius, weaponHeight, 8);

        this.body = new CANNON.Body({
            mass: 0, // Static/sensor body
            isTrigger: true,
            collisionResponse: false,
            shape: shape
        });

        // Add a custom property to identify this as an attack hitbox
        (this.body as any).isAttackHitbox = true;
        (this.body as any).weaponType = this.weaponType;

        // Register collision callback if set
        if (this.onHit) {
            this.body.addEventListener('collide', this.onHit);
        }

        this.physicsWorld.addBody(this.body);
    }

    private updateAttackHitbox() {
        if (!this.body || !this.parentBone) return;

        // Get the weapon's world position and quaternion
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        this.mesh.getWorldPosition(worldPos);
        this.mesh.getWorldQuaternion(worldQuat);

        // Apply the weapon-specific offset in local space, then transform to world
        const config = Weapon.WEAPON_HITBOX_CONFIGS[this.weaponType];
        const yOffset = config.height / 2; // Center the hitbox on the weapon
        const offset = new THREE.Vector3(0, yOffset, 0).applyQuaternion(worldQuat);
        worldPos.add(offset);

        // Update the physics body position and rotation
        this.body.position.set(worldPos.x, worldPos.y, worldPos.z);
        this.body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
    }

    update(dt: number) {
        if (!this.isAttacking) return;

        // Handle attack delay before activating hitbox
        if (!this.hitboxActive) {
            this.attackDelayTimer += dt;
            const delay = Weapon.WEAPON_ATTACK_DELAYS[this.weaponType];
            if (this.attackDelayTimer >= delay) {
                this.createAttackHitbox(this.pendingRangeMultiplier);
                this.hitboxActive = true;
            }
        }

        // Update attack hitbox position to follow the weapon (which follows the hand bone)
        if (this.hitboxActive) {
            this.updateAttackHitbox();
        }
    }

    /**
     * Stop the current attack. Called by Player when attack animation ends.
     */
    stopAttack() {
        if (!this.isAttacking) return;

        this.isAttacking = false;
        this.hitboxActive = false;

        // Remove attack hitbox
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body);
        }
    }

    changeWeaponType(parent: THREE.Object3D, newType: WeaponType, newDamage: number) {
        // Dispose of old mesh resources
        this.disposeMesh();

        // Remove old meshes from parent
        if (this.parentBone) {
            this.parentBone.remove(this.mesh);
        }

        // Remove any existing attack body
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body);
        }

        // Store the parent bone reference
        this.parentBone = parent;

        // Update type, stats, and damage
        this.weaponType = newType;
        this.stats = Weapon.WEAPON_CONFIGS[newType];
        this.damage = newDamage;

        // Create new empty group
        this.mesh = new THREE.Group();

        // Position and rotation for weapon in hand - adjust based on weapon type
        // The weapon needs to be oriented correctly relative to the hand bone
        this.mesh.rotation.set(-Math.PI / 2, 0, Math.PI); // Rotate so blade points forward from hand
        this.mesh.position.set(-0.07, 0.1, 0); // Centered on hand

        parent.add(this.mesh);

        // Load the new weapon model
        this.replaceModel(Weapon.WEAPON_MODEL_PATHS[newType]);
    }
}
