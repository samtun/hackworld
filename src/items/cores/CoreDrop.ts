import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { InteractiveEntityType } from '../../InteractiveEntityType';

export class CoreDrop extends ItemDrop {
    mesh: THREE.Group;
    dropType = ItemDropType.CORE;
    coreId: string;
    coreName: string;
    buyPrice: number;
    sellPrice: number;
    level: number = 1;
    textMesh: THREE.Mesh | null = null;
    interactiveType = InteractiveEntityType.ITEM_DROP;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.0;
    private readonly FLOAT_AMPLITUDE: number = 0.14;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, coreId: string, coreName: string, buyPrice: number, sellPrice: number, level: number) {
        super();
        this.coreId = coreId;
        this.coreName = coreName;
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
        this.level = level;
        this.baseHeight = position.y;

        this.mesh = new THREE.Group();

        const geom = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        const color = 0x66ccff;
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 });
        const box = new THREE.Mesh(geom, mat);
        box.position.y = 0.24;
        this.mesh.add(box);

        // Create text label using shared method
        const levelChar = ItemLevelHelper.getLevelChar(this.level);
        this.textMesh = this.createTextLabel(this.coreName, levelChar);
        this.mesh.add(this.textMesh);

        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        this.floatTimer += deltaTime;
        const offset = Math.sin(this.floatTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.baseHeight + offset;

        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        const isNear = distanceToPlayer < this.PICKUP_DISTANCE;

        if (this.textMesh) {
            this.textMesh.visible = isNear;

            if (isNear) {
                const dir = new THREE.Vector3().subVectors(cameraPosition, this.mesh.position).normalize();
                const angle = Math.atan2(dir.x, dir.z);
                this.textMesh.rotation.y = angle;
            }
        }
    }
}
