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

export class Weapon extends BaseMesh {
    private static WEAPON_MODEL_PATHS: Record<WeaponType, string> = {
        [WeaponType.SWORD]: 'models/sword.glb',
        [WeaponType.DUAL_BLADE]: 'models/double_sword.glb',
        [WeaponType.LANCE]: 'models/lance.glb',
        [WeaponType.HAMMER]: 'models/hammer.glb'
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

    body?: CANNON.Body;
    isAttacking: boolean = false;
    private attackTimer: number = 0;
    private baseRotation: THREE.Euler;
    private basePosition: THREE.Vector3;
    private leftBasePosition?: THREE.Vector3; // For dual blade left weapon
    private rightBasePosition?: THREE.Vector3; // For dual blade right weapon
    weaponType: WeaponType;
    stats: WeaponStats;
    damage: number; // Actual damage value for this weapon instance

    private assetManager: AssetManager;
    private attackPhase: number = 0; // For multi-phase attacks like dual blade
    onDamageFrame?: () => void; // Callback for when damage should be dealt

    // Physics bodies for attack hitboxes
    private physicsWorld?: CANNON.World;
    private scene?: THREE.Scene;

    constructor(
        modelAsset: string,
        weaponType: WeaponType = WeaponType.SWORD,
        damage: number = 10,
        scene: THREE.Scene,
        world?: CANNON.World) {
        super(modelAsset);
        this.weaponType = weaponType;
        this.stats = Weapon.WEAPON_CONFIGS[weaponType];
        this.damage = damage;
        this.assetManager = AssetManager.Instance;
        this.scene = scene;
        this.physicsWorld = world;

        this.baseRotation = this.mesh.rotation.clone();
        this.basePosition = this.mesh.position.clone();

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
            console.error(`Failed to load weapon model ${type}:`, error);
            // Fall back to creating a simple placeholder
            this.createFallbackMesh(type);
        }
    }

    private createFallbackMesh(type: WeaponType): void {
        // Clear any existing children and dispose resources
        this.disposeMesh();

        // Create a simple colored box as fallback
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 1.0);
        const colors: Record<WeaponType, number> = {
            [WeaponType.SWORD]: 0xff0000,
            [WeaponType.DUAL_BLADE]: 0x00ffff,
            [WeaponType.LANCE]: 0x00ff00,
            [WeaponType.HAMMER]: 0x9c27b0
        };
        const material = new THREE.MeshStandardMaterial({ color: colors[type] });
        const mesh = new THREE.Mesh(geometry, material);
        this.mesh.add(mesh);
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
        if (!this.physicsWorld || !this.scene) return;

        // Remove old attack body if it exists
        if (this.body) {
            this.physicsWorld.removeBody(this.body);
        }

        // Create a sensor body (no collision response, just for detection)
        let shape: CANNON.Shape;
        let offset = new CANNON.Vec3();

        switch (this.weaponType) {
            case WeaponType.SWORD:
                // Wide arc hitbox
                shape = new CANNON.Box(new CANNON.Vec3(1.2 * rangeMultiplier, 0.3, 0.3 * rangeMultiplier));
                offset.set(0, 0, 1.0);
                break;
            case WeaponType.DUAL_BLADE:
                // Aa wider single box for simplicity
                shape = new CANNON.Box(new CANNON.Vec3(1.5 * rangeMultiplier, 0.3, 0.3 * rangeMultiplier));
                offset.set(0, 0, 1.0);
                break;
            case WeaponType.LANCE:
                // Long forward hitbox
                shape = new CANNON.Box(new CANNON.Vec3(0.3 * rangeMultiplier, 0.3, 2.0 * rangeMultiplier));
                offset.set(0, 0, 2.0);
                break;
            case WeaponType.HAMMER:
                // Downward striking hitbox
                shape = new CANNON.Box(new CANNON.Vec3(0.6 * rangeMultiplier, 1.0 * rangeMultiplier, 0.6 * rangeMultiplier));
                offset.set(0, 0, 1.2);
                break;
            default:
                shape = new CANNON.Box(new CANNON.Vec3(0.5 * rangeMultiplier, 0.5 * rangeMultiplier, 0.5 * rangeMultiplier));
        }

        this.body = new CANNON.Body({
            mass: 0, // Static/sensor body
            isTrigger: true,
            collisionResponse: false,
            shape: shape
        });

        // Position will be updated in the update method
        this.body.position.set(offset.x, offset.y, offset.z);

        // Add a custom property to identify this as an attack hitbox
        (this.body as any).isAttackHitbox = true;
        (this.body as any).weaponType = this.weaponType;

        this.physicsWorld.addBody(this.body);
    }

    private updateAttackHitbox(playerPosition: THREE.Vector3, playerQuaternion: THREE.Quaternion) {
        if (!this.body) return;

        // Update hitbox position based on player position and weapon animation
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerQuaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerQuaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerQuaternion);

        let hitboxPos = new THREE.Vector3();

        switch (this.weaponType) {
            case WeaponType.SWORD:
                // Position in front and to the side based on animation progress
                hitboxPos.copy(playerPosition)
                    .add(forward.multiplyScalar(1.0))
                    .add(up.multiplyScalar(1.0))
                    .add(right.multiplyScalar(this.mesh.position.x * 0.5));
                break;
            case WeaponType.DUAL_BLADE:
                hitboxPos.copy(playerPosition)
                    .add(up.multiplyScalar(1.0))
                    .add(forward.multiplyScalar(1.0));
                break;
            case WeaponType.LANCE:
                hitboxPos.copy(playerPosition)
                    .add(up.multiplyScalar(1.0))
                    .add(forward.multiplyScalar(2.0));
                break;
            case WeaponType.HAMMER:
                hitboxPos.copy(playerPosition)
                    .add(up.multiplyScalar(1.0))
                    .add(forward.multiplyScalar(1.2));
                break;
        }

        this.body.position.copy(hitboxPos as any);
        this.body.quaternion.copy(playerQuaternion as any);
    }

    update(dt: number, playerPosition?: THREE.Vector3, playerQuaternion?: THREE.Quaternion) {
        if (!this.isAttacking) return;

        this.attackTimer += dt;

        // Simple swing animation
        const progress = this.attackTimer / this.stats.attackSpeed;

        if (progress >= 1) {
            this.isAttacking = false;
            this.mesh.rotation.copy(this.baseRotation);
            this.mesh.position.copy(this.basePosition);

            // Remove attack hitbox
            if (this.body && this.physicsWorld) {
                this.physicsWorld.removeBody(this.body);
            }
            return;
        }

        // Different animations based on weapon type
        this.animateWeapon(progress);

        // Update attack hitbox position
        if (playerPosition && playerQuaternion) {
            this.updateAttackHitbox(playerPosition, playerQuaternion);
        }
    }

    private animateWeapon(progress: number) {
        switch (this.weaponType) {
            case WeaponType.SWORD:
                this.animateSword(progress);
                break;

            case WeaponType.DUAL_BLADE:
                this.animateDualBlade(progress);
                break;

            case WeaponType.LANCE:
                this.animateLance(progress);
                break;

            case WeaponType.HAMMER:
                this.animateHammer(progress);
                break;
        }
    }

    // Sword: Right to left sweep
    private animateSword(progress: number) {
        // Use a smooth curve for the sweep motion
        const t = this.easeInOutCubic(progress);

        // Sweep from right to left horizontally
        // Start from base position and sweep across
        const sweepOffset = (t - 0.5) * 1.6; // -0.8 to +0.8
        const x = this.basePosition.x + sweepOffset;

        // Slight arc forward during sweep
        const arcZ = Math.sin(t * Math.PI) * 0.4;

        // Slight vertical arc
        const arcY = Math.sin(t * Math.PI) * 0.2;

        this.mesh.position.set(x, this.basePosition.y + arcY, this.basePosition.z + arcZ);

        // Rotate weapon to follow the sweep
        this.mesh.rotation.y = this.baseRotation.y - (t - 0.5) * Math.PI * 0.6;
        this.mesh.rotation.z = this.baseRotation.z + Math.sin(t * Math.PI) * 0.5;
    }

    // Dual Blade: Two separate sweeps, left then right
    private animateDualBlade(progress: number) {
        if (!this.leftBasePosition || !this.rightBasePosition) {
            return;
        }

        // First phase: left blade sweeps from right to left
        const t = this.easeInOutCubic(progress);

        // Left blade sweeps from right to left
        const sweepOffset = (t - 0.5) * 1.4; // Sweep across
        const leftX = this.leftBasePosition.x + sweepOffset;

        const arcZ = Math.sin(t * Math.PI) * 0.3;
        const arcY = Math.sin(t * Math.PI) * 0.15;

        this.mesh.position.set(leftX, this.leftBasePosition.y + arcY, this.leftBasePosition.z + arcZ);
        this.mesh.rotation.y = -t * Math.PI * 0.6;
        this.mesh.rotation.z = Math.sin(t * Math.PI) * 0.4;

        // Trigger damage callback in the middle of first sweep
        if (progress > 0.4 && progress < 0.6 && this.attackPhase === 0) {
            this.attackPhase = 1;
            if (this.onDamageFrame) this.onDamageFrame();
        }
    }

    // Lance: Fast forward thrust
    private animateLance(progress: number) {
        // Faster thrust with more emphasis on forward motion
        const t = this.easeInOutQuad(progress);

        // Strong forward thrust
        const thrustDistance = Math.sin(t * Math.PI) * 1.5;

        // Slight upward arc at the end
        const arcY = t > 0.5 ? (t - 0.5) * 0.2 : 0;

        this.mesh.position.set(
            this.basePosition.x,
            this.basePosition.y + arcY,
            this.basePosition.z + thrustDistance
        );

        // Minimal rotation, mostly forward motion
        this.mesh.rotation.x = this.baseRotation.x - Math.sin(t * Math.PI) * 0.2;
    }

    // Hammer: 0.2s windup, then fast descent
    private animateHammer(progress: number) {
        const windupDuration = 0.2 / this.stats.attackSpeed; // Normalized to 0-1 range

        if (progress < windupDuration) {
            // Windup: swing back
            const t = progress / windupDuration;
            const eased = this.easeInCubic(t);

            // Pull back and up
            const backDistance = eased * 0.5;
            const upDistance = eased * 1.2;

            this.mesh.position.set(
                this.basePosition.x,
                this.basePosition.y + upDistance,
                this.basePosition.z - backDistance
            );

            // Rotate back
            this.mesh.rotation.x = this.baseRotation.x - eased * 1.8;
        } else {
            // Descent: fast downward smash
            const descendProgress = (progress - windupDuration) / (1 - windupDuration);
            const t = this.easeInQuad(descendProgress); // Fast acceleration

            // Descend from raised position to below ground level
            const startY = 1.2;
            const endY = -0.8; // Go down much further
            const y = startY + (endY - startY) * t;

            const startZ = -0.5;
            const endZ = 0.8; // Go further forward
            const z = startZ + (endZ - startZ) * t;

            this.mesh.position.set(
                this.basePosition.x,
                this.basePosition.y + y,
                this.basePosition.z + z
            );

            // Rotate forward during descent
            this.mesh.rotation.x = this.baseRotation.x - 1.8 + t * 3.2;
        }
    }

    // Easing functions for smooth animations
    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    private easeInCubic(t: number): number {
        return t * t * t;
    }

    private easeInQuad(t: number): number {
        return t * t;
    }

    changeWeaponType(parent: THREE.Object3D, newType: WeaponType, newDamage: number) {
        // Dispose of old mesh resources
        this.disposeMesh();

        // Remove old meshes from parent
        parent.remove(this.mesh);

        // Remove any existing attack body
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body);
        }

        // Update type, stats, and damage
        this.weaponType = newType;
        this.stats = Weapon.WEAPON_CONFIGS[newType];
        this.damage = newDamage;

        // Create new empty group(s)
        this.mesh = new THREE.Group();

        // Single weapon in right hand
        this.mesh.position.set(0.6, 0, 0.5);
        parent.add(this.mesh);

        this.baseRotation = this.mesh.rotation.clone();
        this.basePosition = this.mesh.position.clone();

        // Load the new weapon model
        this.loadWeaponModel(newType);
    }
}
