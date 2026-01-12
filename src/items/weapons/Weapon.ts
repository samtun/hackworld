import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AssetManager } from '../../AssetManager.ts';
import { BaseMesh } from '../../BaseMesh.ts';
import { WeaponType } from './WeaponType';

export interface WeaponLevel {
    char: string; // greek character
    requiredTech: number;
    damagePercent: number; // percent value, e.g. 180 for 180%
}

export interface WeaponStats {
    attackSpeed: number; // Duration in seconds
    range: number;
    attackAngle: number; // In radians
}

// Hitbox configuration for each weapon type
interface WeaponHitboxConfig {
    radius: number; // Radius of the weapon collider
    height: number; // Height of the weapon collider
    offset: THREE.Vector3; // Offset from weapon origin to position the hitbox correctly
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

    // Hitbox configurations that roughly fit each weapon model
    private static WEAPON_HITBOX_CONFIGS: Record<WeaponType, WeaponHitboxConfig> = {
        [WeaponType.SWORD]: {
            radius: 0.22,
            height: 1.5,
            offset: new THREE.Vector3(0, 0.75, 0)
        },
        [WeaponType.DUAL_BLADE]: {
            radius: 0.17,
            height: 1.3,
            offset: new THREE.Vector3(0, 0.65, 0)
        },
        [WeaponType.LANCE]: {
            radius: 0.12,
            height: 2.2,
            offset: new THREE.Vector3(0, 1.1, 0)
        },
        [WeaponType.HAMMER]: {
            radius: 0.3,
            height: 1.5,
            offset: new THREE.Vector3(0, 0.75, 0)
        }
    };

    body?: CANNON.Body;
    isAttacking: boolean = false;
    private attackTimer: number = 0;
    weaponType: WeaponType;
    stats: WeaponStats;
    damage: number; // Actual damage value for this weapon instance

    private assetManager: AssetManager;
    private attackPhase: number = 0; // For multi-phase attacks like dual blade
    onDamageFrame?: () => void; // Callback for when damage should be dealt

    // Physics bodies for attack hitboxes
    private physicsWorld?: CANNON.World;

    // Parent bone reference for world position calculations
    private parentBone?: THREE.Object3D;

    constructor(
        modelAsset: string,
        weaponType: WeaponType = WeaponType.SWORD,
        damage: number = 10,
        world?: CANNON.World) {
        super(modelAsset);
        this.weaponType = weaponType;
        this.stats = Weapon.WEAPON_CONFIGS[weaponType];
        this.damage = damage;
        this.assetManager = AssetManager.Instance;
        this.physicsWorld = world;

        // Load the weapon model (will use preloaded if available)
        this.loadWeaponModel(weaponType);
    }

    private async loadWeaponModel(type: WeaponType): Promise<void> {
        const modelPath = Weapon.WEAPON_MODEL_PATHS[type];

        try {
            // Try to use preloaded asset first
            let gltf = this.assetManager.get(modelPath);
            const model = gltf.scene.clone();

            // Clear any existing children and dispose resources
            this.disposeMesh();

            // Add the loaded model to the weapon group
            this.mesh.add(model);

            console.log(`Loaded weapon model: ${type}`);
        } catch (error) {
            throw new Error(`Failed to load weapon model ${type}: ${error}`);
        }
    }

    attack(rangeMultiplier: number = 1.0): boolean {
        if (this.isAttacking) return false;
        this.isAttacking = true;
        this.attackTimer = 0;
        this.attackPhase = 0;

        // Create attack hitbox collider with range multiplier
        this.createAttackHitbox(rangeMultiplier);

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
        const offset = config.offset.clone().applyQuaternion(worldQuat);
        worldPos.add(offset);

        // Update the physics body position and rotation
        this.body.position.set(worldPos.x, worldPos.y, worldPos.z);
        this.body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
    }

    update(dt: number) {
        if (!this.isAttacking) return;

        this.attackTimer += dt;
        const progress = this.attackTimer / this.stats.attackSpeed;

        if (progress >= 1) {
            this.isAttacking = false;

            // Remove attack hitbox
            if (this.body && this.physicsWorld) {
                this.physicsWorld.removeBody(this.body);
            }
            return;
        }

        // Trigger damage callback for dual blade at mid-attack
        if (this.weaponType === WeaponType.DUAL_BLADE && progress > 0.4 && progress < 0.6 && this.attackPhase === 0) {
            this.attackPhase = 1;
            if (this.onDamageFrame) this.onDamageFrame();
        }

        // Update attack hitbox position to follow the weapon (which follows the hand bone)
        this.updateAttackHitbox();
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
        this.loadWeaponModel(newType);
    }
}
