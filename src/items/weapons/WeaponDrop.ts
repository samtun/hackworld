import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { WeaponType } from './WeaponType';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { InteractiveEntityType } from '../../InteractiveEntityType';
import { AssetManager } from '../../AssetManager';

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
        level: number
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

        // Create weapon visual
        const gltfModel = AssetManager.Instance.get('models/weapon_drop.glb');
        this.mesh = gltfModel.scene;

        // Create text label using shared method
        const levelChar = ItemLevelHelper.getLevelChar(this.level);
        this.textMesh = this.createTextLabel(weaponName, levelChar);
        this.mesh.add(this.textMesh);

        // Position the group
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);
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
