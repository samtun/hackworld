import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { WeaponType } from './WeaponType';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { InteractiveEntityType } from '../../InteractiveEntityType';
import { AssetManager } from '../../AssetManager';
import { WeaponTierDefinition, TierManager } from '../TierManager';

/**
 * WeaponDrop entity - represents a weapon that can be picked up from the ground
 * Displays a 3D text label and animates in a floating motion
 */
export class WeaponDrop extends ItemDrop {
    weaponId: string;
    mesh: THREE.Group;
    dropType = ItemDropType.WEAPON;
    weaponType: WeaponType;
    weaponName: string;
    textMesh: THREE.Mesh | null = null;
    level: number = 1;
    interactiveType = InteractiveEntityType.ITEM_DROP;

    // Weapon stats with bonus applied
    damage: number;
    buyPrice: number;
    sellPrice: number;
    /** The drop tier definition for this weapon */
    tier: WeaponTierDefinition;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.5;
    private readonly FLOAT_AMPLITUDE: number = 0.15;

    constructor(
        weaponId: string,
        scene: THREE.Scene,
        position: CANNON.Vec3,
        weaponType: WeaponType,
        weaponName: string,
        damage: number,
        buyPrice: number,
        sellPrice: number,
        level: number,
        bonusMultiplier: number
    ) {
        super();
        this.weaponId = weaponId;
        this.weaponType = weaponType;
        this.weaponName = weaponName;
        this.damage = damage;
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
        this.baseHeight = position.y;
        this.level = level;

        // Compute tier and store rim color for use in text label and inventory display
        const tier = TierManager.Instance.getWeaponTierForMultiplier(bonusMultiplier);
        this.tier = tier;

        // Create weapon visual
        const gltfModel = AssetManager.Instance.get('models/weapon_drop.glb');
        this.mesh = gltfModel.scene;

        // Apply tier-based color coding to "Rim" and "Inner" materials
        this.applyTierColors(tier);

        // Create text label using shared method, colored with the tier's rim color
        const levelChar = ItemLevelHelper.getLevelChar(this.level);
        this.textMesh = this.createTextLabel(weaponName, levelChar, this.tier.rimColor);
        this.mesh.add(this.textMesh);

        // Position the group
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);
    }

    /**
     * Applies tier-based color coding to the "Rim" and "Inner" materials
     * on the weapon drop mesh.
     */
    private applyTierColors(tier: WeaponTierDefinition): void {
        const rimHex = tier.rimColor;
        const innerHex = tier.innerColor;

        this.mesh.traverse((child: THREE.Object3D) => {
            if (!(child instanceof THREE.Mesh)) return;

            const applyColor = (mat: THREE.Material, hex: string) => {
                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
                    // Clone to avoid mutating the shared model material
                    const cloned = mat.clone() as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial;
                    cloned.color.set(hex);
                    return cloned;
                }
                return mat;
            };

            if (Array.isArray(child.material)) {
                let modified = false;
                const newMaterials = child.material.map((mat: THREE.Material) => {
                    if (mat.name === 'Rim') { modified = true; return applyColor(mat, rimHex); }
                    if (mat.name === 'Inner') { modified = true; return applyColor(mat, innerHex); }
                    return mat;
                });
                if (modified) child.material = newMaterials;
            } else {
                const mat = child.material as THREE.Material;
                if (mat.name === 'Rim') child.material = applyColor(mat, rimHex);
                else if (mat.name === 'Inner') child.material = applyColor(mat, innerHex);
            }
        });
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        // Floating animation
        this.floatTimer += deltaTime;
        const floatOffset = Math.sin(this.floatTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.baseHeight + floatOffset;

        // Rotate the weapon slowly
        this.mesh.children[0].rotation.y += deltaTime * 0.5;

        // Calculate distance to player
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        const isNearPlayer = distanceToPlayer < this.PICKUP_DISTANCE;

        // Show text only when player is close enough
        if (this.textMesh) {
            this.textMesh.visible = isNearPlayer;

            // Make text label face camera (billboard effect)
            if (isNearPlayer) {
                const direction = new THREE.Vector3()
                    .subVectors(cameraPosition, this.mesh.position)
                    .normalize();
                const angle = Math.atan2(direction.x, direction.z);
                this.textMesh.rotation.y = angle;
            }
        }
    }
}
