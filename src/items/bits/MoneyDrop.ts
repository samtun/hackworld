import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { InteractiveEntityType } from '../../InteractiveEntityType';

export class MoneyDrop extends ItemDrop {
    mesh: THREE.Group;
    amount: number;
    dropType = ItemDropType.MONEY;
    interactiveType = InteractiveEntityType.AUTO_PICKUP_DROP;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.0;
    private readonly FLOAT_AMPLITUDE: number = 0.10;
    private readonly ROTATION_SPEED: number = 3.0;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, amount: number) {
        super();
        this.amount = amount;
        this.baseHeight = position.y;

        this.mesh = new THREE.Group();

        // Coin visual: flat cylinder that spins
        const coinGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32);
        const coinMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700, // Gold
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xffaa00,
            emissiveIntensity: 0.2
        });
        const coin = new THREE.Mesh(coinGeometry, coinMaterial);
        this.mesh.add(coin);

        // Positioning
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);
    }

    update(deltaTime: number, _cameraPosition: THREE.Vector3, _playerPosition: THREE.Vector3): void {
        // Floating animation
        this.floatTimer += deltaTime;
        const offset = Math.sin(this.floatTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.baseHeight + offset;

        // Spinning animation
        this.mesh.rotation.y += this.ROTATION_SPEED * deltaTime;
    }

    cleanup(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
    }
}
