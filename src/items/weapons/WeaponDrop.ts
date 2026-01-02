import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { WeaponType } from './WeaponType';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { ItemDrop } from '../ItemDrop';

/**
 * WeaponDrop entity - represents a weapon that can be picked up from the ground
 * Displays a 3D text label and animates in a floating motion
 */
export class WeaponDrop implements ItemDrop {
    mesh: THREE.Group;
    body: CANNON.Body;
    weaponType: WeaponType;
    weaponName: string;
    textMesh: THREE.Mesh | null = null;
    level: number = 1;
    
    // Weapon stats with bonus applied
    damage: number;
    buyPrice: number;
    sellPrice: number;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.5;
    private readonly FLOAT_AMPLITUDE: number = 0.15;
    private readonly PICKUP_DISTANCE: number = 1.5;

    constructor(
        scene: THREE.Scene,
        position: CANNON.Vec3,
        weaponType: WeaponType,
        weaponName: string,
        damage: number,
        buyPrice: number,
        sellPrice: number,
        level: number = 1
    ) {
        this.weaponType = weaponType;
        this.weaponName = weaponName;
        this.damage = damage;
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
        this.baseHeight = position.y;
        this.level = level;

        // Create visual group
        this.mesh = new THREE.Group();

        // Create weapon visual (simple colored box for now)
        const weaponGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.8);
        const weaponColors: Record<WeaponType, number> = {
            [WeaponType.SWORD]: 0xff0000,
            [WeaponType.DUAL_BLADE]: 0x00ffff,
            [WeaponType.LANCE]: 0x00ff00,
            [WeaponType.HAMMER]: 0x9c27b0
        };
        const weaponMaterial = new THREE.MeshStandardMaterial({
            color: weaponColors[weaponType],
            emissive: weaponColors[weaponType],
            emissiveIntensity: 0.3
        });
        const weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weaponMesh.rotation.x = Math.PI / 4;
        weaponMesh.position.y = 0.3;
        this.mesh.add(weaponMesh);

        // Create text label using canvas texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 512;
        canvas.height = 128;

        // Draw text on canvas: name + italic level char to the right, keeping the whole label centered
        const levelChar = ItemLevelHelper.getLevelChar(this.level);
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Base (name) style
        const baseFont = 'bold 48px Arial';
        context.font = baseFont;
        context.fillStyle = '#ffffff';
        context.textBaseline = 'middle';

        // Measure widths to center the combined text
        const nameWidth = context.measureText(weaponName).width;
        // Measure level width using italic bold font
        const levelFont = 'italic bold 48px Arial';
        context.font = levelFont;
        const levelWidth = context.measureText(levelChar).width;

        const spacing = 8; // gap between name and level char
        const totalWidth = nameWidth + spacing + levelWidth;

        // Draw with left alignment starting at computed X so combined text is centered
        const startX = canvas.width / 2 - totalWidth / 2;
        const centerY = canvas.height / 2;

        // Draw name
        context.font = baseFont;
        context.textAlign = 'left';
        context.fillText(weaponName, startX, centerY);

        // Draw italic level char right of name
        context.font = levelFont;
        context.fillText(levelChar, startX + nameWidth + spacing, centerY);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        const textGeometry = new THREE.PlaneGeometry(2, 0.5);
        this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
        this.textMesh.position.y = 0;
        this.textMesh.renderOrder = 999;
        this.textMesh.visible = false; // Start hidden
        this.mesh.add(this.textMesh);

        // Position the group
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Create physics body (sensor for detection). Do NOT add to physics world here;
        // caller (ItemDropManager) will add the body to the world.
        const shape = new CANNON.Sphere(0.5);
        this.body = new CANNON.Body({
            mass: 0,
            isTrigger: true,
            collisionResponse: false,
            shape: shape
        });
        this.body.position.copy(position);

        // Mark as weapon drop for detection
        (this.body as any).isWeaponDrop = true;
        (this.body as any).weaponDrop = this;
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

        // Sync body position (mainly Y for floating)
        this.body.position.y = this.mesh.position.y;
    }

    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        scene.remove(this.mesh);
        world.removeBody(this.body);

        // Dispose of geometries and materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}
