import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { InteractiveEntityType } from '../../InteractiveEntityType';
import { AssetManager } from '../../AssetManager';

export class MoneyDrop extends ItemDrop {
    mesh: THREE.Group;
    amount: number;
    dropType = ItemDropType.MONEY;
    interactiveType = InteractiveEntityType.AUTO_PICKUP_DROP;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.0;
    private readonly FLOAT_AMPLITUDE: number = 0.15;
    private readonly ROTATION_SPEED: number = 2.0;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, amount: number) {
        super();
        this.amount = amount;
        this.baseHeight = position.y;

       const gltfModel = AssetManager.Instance.get('models/coin.glb');
       this.mesh = gltfModel.scene;

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
}