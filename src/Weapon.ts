import * as THREE from 'three';

export enum WeaponType {
    SWORD = 'sword',
    DUAL_BLADE = 'dual_blade',
    LANCE = 'lance',
    HAMMER = 'hammer'
}

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
    weaponType: WeaponType;
    stats: WeaponStats;

    constructor(parent: THREE.Object3D, weaponType: WeaponType = WeaponType.SWORD) {
        this.weaponType = weaponType;
        this.stats = WEAPON_CONFIGS[weaponType];
        
        // Create weapon mesh based on type
        this.mesh = this.createWeaponMesh(weaponType);
        
        // Position relative to player (held in hand)
        this.mesh.position.set(0.6, 0, 0.5);
        this.baseRotation = this.mesh.rotation.clone();

        parent.add(this.mesh);
    }

    private createWeaponMesh(type: WeaponType): THREE.Group {
        const group = new THREE.Group();
        
        switch (type) {
            case WeaponType.SWORD:
                // Single red sword
                const swordGeom = new THREE.BoxGeometry(0.1, 0.1, 1.5);
                const swordMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                const sword = new THREE.Mesh(swordGeom, swordMat);
                group.add(sword);
                break;
                
            case WeaponType.DUAL_BLADE:
                // Two smaller cyan blades
                const blade1Geom = new THREE.BoxGeometry(0.08, 0.08, 1.2);
                const bladeMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
                const blade1 = new THREE.Mesh(blade1Geom, bladeMat);
                blade1.position.set(-0.15, 0, 0);
                const blade2 = new THREE.Mesh(blade1Geom, bladeMat.clone());
                blade2.position.set(0.15, 0, 0);
                group.add(blade1);
                group.add(blade2);
                break;
                
            case WeaponType.LANCE:
                // Long green spear
                const shaftGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.5);
                const shaftMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
                const shaft = new THREE.Mesh(shaftGeom, shaftMat);
                shaft.rotation.x = Math.PI / 2;
                const tipGeom = new THREE.ConeGeometry(0.1, 0.3, 4);
                const tipMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                const tip = new THREE.Mesh(tipGeom, tipMat);
                tip.rotation.x = Math.PI / 2;
                tip.position.set(0, 0, 1.4);
                group.add(shaft);
                group.add(tip);
                break;
                
            case WeaponType.HAMMER:
                // Heavy purple hammer
                const handleGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.2);
                const handleMat = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.rotation.x = Math.PI / 2;
                const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.5);
                const headMat = new THREE.MeshStandardMaterial({ color: 0x9c27b0 });
                const head = new THREE.Mesh(headGeom, headMat);
                head.position.set(0, 0, 0.85);
                group.add(handle);
                group.add(head);
                break;
        }
        
        return group;
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
                this.mesh.position.z = 0.5 + thrustDistance;
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
        
        // Create new mesh
        this.mesh = this.createWeaponMesh(newType);
        this.mesh.position.set(0.6, 0, 0.5);
        this.baseRotation = this.mesh.rotation.clone();
        
        parent.add(this.mesh);
    }
}
