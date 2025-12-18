import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AssetManager } from './AssetManager';

export enum WeaponType {
    SWORD = 'sword',
    DUAL_BLADE = 'dual_blade',
    LANCE = 'lance',
    HAMMER = 'hammer'
}

// Model paths for each weapon type
const WEAPON_MODEL_PATHS: Record<WeaponType, string> = {
    [WeaponType.SWORD]: 'models/sword.glb',
    [WeaponType.DUAL_BLADE]: 'models/double_sword.glb',
    [WeaponType.LANCE]: 'models/lance.glb',
    [WeaponType.HAMMER]: 'models/hammer.glb'
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
    private assetManager: AssetManager;
    private attackPhase: number = 0; // For multi-phase attacks like dual blade
    onDamageFrame?: () => void; // Callback for when damage should be dealt

    constructor(parent: THREE.Object3D, weaponType: WeaponType = WeaponType.SWORD) {
        this.weaponType = weaponType;
        this.stats = WEAPON_CONFIGS[weaponType];
        this.loader = new GLTFLoader();
        this.assetManager = AssetManager.getInstance();

        // Create empty group initially
        this.mesh = new THREE.Group();

        // Position relative to player (held in hand)
        this.mesh.position.set(0.6, 0, 0.5);
        this.baseRotation = this.mesh.rotation.clone();
        this.basePosition = this.mesh.position.clone();

        parent.add(this.mesh);

        // Load the weapon model (will use preloaded if available)
        this.loadWeaponModel(weaponType);
    }

    private async loadWeaponModel(type: WeaponType): Promise<void> {
        const modelPath = WEAPON_MODEL_PATHS[type];

        try {
            // Try to use preloaded asset first
            let gltf = this.assetManager.get(modelPath);

            if (!gltf) {
                // Fallback to loading if not preloaded
                console.log(`Weapon ${type} not preloaded, loading on-demand...`);
                gltf = await this.loader.loadAsync(modelPath);
            }

            const model = gltf.scene;

            // Scale the model to appropriate size
            model.scale.set(0.75, 0.75, 0.75);

            // Clear any existing children and dispose resources
            this.disposeChildren(this.mesh);

            // Add the loaded model to the weapon group
            this.mesh.add(model);

            console.log(`Loaded weapon model: ${type}`);
        } catch (error) {
            console.error(`Failed to load weapon model ${type}:`, error);
            // Fall back to creating a simple placeholder
            this.createFallbackMesh(type);
        }
    }

    private disposeChildren(group: THREE.Group): void {
        // Remove and dispose all children
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);

            // Dispose geometries and materials if it's a mesh
            if (child instanceof THREE.Mesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }

            // Recursively dispose children if it's a group
            if (child instanceof THREE.Group) {
                this.disposeChildren(child);
            }
        }
    }

    private createFallbackMesh(type: WeaponType): void {
        // Clear any existing children and dispose resources
        this.disposeChildren(this.mesh);

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
        this.attackPhase = 0;
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
        // Start position: right side (x: 0.8)
        // End position: left side (x: -0.8)
        const startX = 0.8;
        const endX = -0.8;
        const x = startX + (endX - startX) * t;
        
        // Slight arc forward during sweep
        const arcZ = Math.sin(t * Math.PI) * 0.3;
        
        // Slight vertical arc
        const arcY = Math.sin(t * Math.PI) * 0.2;
        
        this.mesh.position.set(x, this.basePosition.y + arcY, this.basePosition.z + arcZ);
        
        // Rotate weapon to follow the sweep
        this.mesh.rotation.y = this.baseRotation.y - t * Math.PI * 0.8;
        this.mesh.rotation.z = this.baseRotation.z + Math.sin(t * Math.PI) * 0.5;
    }

    // Dual Blade: Two separate sweeps, left then right
    private animateDualBlade(progress: number) {
        // Two phases: 0-0.5 is left blade, 0.5-1.0 is right blade
        const phaseDuration = 0.5;
        
        if (progress < phaseDuration) {
            // First phase: left blade sweeps from right to left
            const phaseProgress = progress / phaseDuration;
            const t = this.easeInOutCubic(phaseProgress);
            
            const startX = 0.8;
            const endX = -0.8;
            const x = startX + (endX - startX) * t;
            
            const arcZ = Math.sin(t * Math.PI) * 0.25;
            const arcY = Math.sin(t * Math.PI) * 0.15;
            
            this.mesh.position.set(x, this.basePosition.y + arcY, this.basePosition.z + arcZ);
            this.mesh.rotation.y = this.baseRotation.y - t * Math.PI * 0.7;
            this.mesh.rotation.z = this.baseRotation.z + Math.sin(t * Math.PI) * 0.4;
            
            // Trigger damage callback in the middle of first sweep
            if (phaseProgress > 0.4 && phaseProgress < 0.6 && this.attackPhase === 0) {
                this.attackPhase = 1;
                if (this.onDamageFrame) this.onDamageFrame();
            }
        } else {
            // Second phase: right blade sweeps from right to left
            const phaseProgress = (progress - phaseDuration) / phaseDuration;
            const t = this.easeInOutCubic(phaseProgress);
            
            const startX = 0.8;
            const endX = -0.8;
            const x = startX + (endX - startX) * t;
            
            const arcZ = Math.sin(t * Math.PI) * 0.25;
            const arcY = Math.sin(t * Math.PI) * 0.15 - 0.1; // Slightly lower
            
            this.mesh.position.set(x, this.basePosition.y + arcY, this.basePosition.z + arcZ);
            this.mesh.rotation.y = this.baseRotation.y - t * Math.PI * 0.7;
            this.mesh.rotation.z = this.baseRotation.z - Math.sin(t * Math.PI) * 0.4;
            
            // Trigger damage callback in the middle of second sweep
            if (phaseProgress > 0.4 && phaseProgress < 0.6 && this.attackPhase === 1) {
                this.attackPhase = 2;
                if (this.onDamageFrame) this.onDamageFrame();
            }
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
            const upDistance = eased * 0.8;
            
            this.mesh.position.set(
                this.basePosition.x,
                this.basePosition.y + upDistance,
                this.basePosition.z - backDistance
            );
            
            // Rotate back
            this.mesh.rotation.x = this.baseRotation.x - eased * 1.5;
        } else {
            // Descent: fast downward smash
            const descendProgress = (progress - windupDuration) / (1 - windupDuration);
            const t = this.easeInQuad(descendProgress); // Fast acceleration
            
            // Descend from raised position
            const startY = 0.8;
            const endY = -0.3;
            const y = startY + (endY - startY) * t;
            
            const startZ = -0.5;
            const endZ = 0.5;
            const z = startZ + (endZ - startZ) * t;
            
            this.mesh.position.set(
                this.basePosition.x,
                this.basePosition.y + y,
                this.basePosition.z + z
            );
            
            // Rotate forward during descent
            this.mesh.rotation.x = this.baseRotation.x - 1.5 + t * 2.5;
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

    changeWeaponType(parent: THREE.Object3D, newType: WeaponType) {
        // Dispose of old mesh resources
        this.disposeChildren(this.mesh);

        // Remove old mesh from parent
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
