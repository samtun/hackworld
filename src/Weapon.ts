import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export enum WeaponType {
    SWORD = 'sword',
    DUAL_BLADE = 'dual_blade',
    LANCE = 'lance',
    HAMMER = 'hammer'
}

// Model paths for each weapon type
const WEAPON_MODEL_PATHS: Record<WeaponType, string> = {
    [WeaponType.SWORD]: '/models/sword.glb',
    [WeaponType.DUAL_BLADE]: '/models/double_sword.glb',
    [WeaponType.LANCE]: '/models/lance.glb',
    [WeaponType.HAMMER]: '/models/hammer.glb'
};

export interface WeaponStats {
    damage: number;
    attackSpeed: number; // Duration in seconds
    range: number;
    attackAngle: number; // In radians
}

// Weapon type configurations
export const WEAPON_CONFIGS: Record<WeaponType, WeaponStats> = {
    [WeaponType.SWORD]: {
        damage: 10,
        attackSpeed: 0.3,
        range: 2.0,
        attackAngle: Math.PI / 2 // 90 degrees
    },
    [WeaponType.DUAL_BLADE]: {
        damage: 7,
        attackSpeed: 0.2,
        range: 1.5,
        attackAngle: Math.PI / 3 // 60 degrees
    },
    [WeaponType.LANCE]: {
        damage: 12,
        attackSpeed: 0.5,
        range: 3.0,
        attackAngle: Math.PI / 4 // 45 degrees
    },
    [WeaponType.HAMMER]: {
        damage: 18,
        attackSpeed: 0.7,
        range: 1.8,
        attackAngle: Math.PI / 2 // 90 degrees
    }
};

export class Weapon {
    mesh: THREE.Group;
    isAttacking: boolean = false;
    private attackTimer: number = 0;
    private baseRotation: THREE.Euler;
    private basePosition: THREE.Vector3;
    weaponType: WeaponType;
    stats: WeaponStats;
    private loader: GLTFLoader;

    constructor(parent: THREE.Object3D, weaponType: WeaponType = WeaponType.SWORD) {
        this.weaponType = weaponType;
        this.stats = WEAPON_CONFIGS[weaponType];
        this.loader = new GLTFLoader();
        
        // Create empty group initially
        this.mesh = new THREE.Group();
        
        // Position relative to player (held in hand)
        this.mesh.position.set(0.6, 0, 0.5);
        this.baseRotation = this.mesh.rotation.clone();
        this.basePosition = this.mesh.position.clone();

        parent.add(this.mesh);
        
        // Load the weapon model asynchronously
        this.loadWeaponModel(weaponType);
    }

    private async loadWeaponModel(type: WeaponType): Promise<void> {
        const modelPath = WEAPON_MODEL_PATHS[type];
        
        try {
            const gltf = await this.loader.loadAsync(modelPath);
            const model = gltf.scene;
            
            // Scale the model to appropriate size (adjust as needed)
            model.scale.set(0.5, 0.5, 0.5);
            
            // Clear any existing children
            while (this.mesh.children.length > 0) {
                this.mesh.remove(this.mesh.children[0]);
            }
            
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
        // Clear any existing children
        while (this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }
        
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

    attack(): boolean {
        if (this.isAttacking) return false;
        this.isAttacking = true;
        this.attackTimer = 0;
        return true;
    }

    update(dt: number) {
        if (!this.isAttacking) return;

        this.attackTimer += dt;

        // Simple swing animation
        const progress = this.attackTimer / this.stats.attackSpeed;

        if (progress >= 1) {
            this.isAttacking = false;
            this.mesh.rotation.copy(this.baseRotation);
            this.mesh.position.copy(this.basePosition);
            return;
        }

        // Different animations based on weapon type
        this.animateWeapon(progress);
    }

    private animateWeapon(progress: number) {
        switch (this.weaponType) {
            case WeaponType.SWORD:
                // Standard swing
                const swingAngle = Math.sin(progress * Math.PI) * 2;
                this.mesh.rotation.x = this.baseRotation.x + swingAngle;
                break;
                
            case WeaponType.DUAL_BLADE:
                // Fast spinning slash
                const spinAngle = Math.sin(progress * Math.PI) * 2.5;
                this.mesh.rotation.x = this.baseRotation.x + spinAngle;
                this.mesh.rotation.y = this.baseRotation.y + spinAngle * 0.3;
                break;
                
            case WeaponType.LANCE:
                // Thrust forward
                const thrustDistance = Math.sin(progress * Math.PI) * 0.8;
                this.mesh.position.z = this.basePosition.z + thrustDistance;
                break;
                
            case WeaponType.HAMMER:
                // Overhead smash
                const smashAngle = Math.sin(progress * Math.PI) * 2.8;
                this.mesh.rotation.x = this.baseRotation.x + smashAngle;
                // Add slight pause at top
                if (progress > 0.4 && progress < 0.6) {
                    this.mesh.rotation.x = this.baseRotation.x + 2.5;
                }
                break;
        }
    }

    changeWeaponType(parent: THREE.Object3D, newType: WeaponType) {
        // Remove old mesh
        parent.remove(this.mesh);
        
        // Update type and stats
        this.weaponType = newType;
        this.stats = WEAPON_CONFIGS[newType];
        
        // Create new empty group
        this.mesh = new THREE.Group();
        this.mesh.position.set(0.6, 0, 0.5);
        this.baseRotation = this.mesh.rotation.clone();
        this.basePosition = this.mesh.position.clone();
        
        parent.add(this.mesh);
        
        // Load the new weapon model
        this.loadWeaponModel(newType);
    }
}
