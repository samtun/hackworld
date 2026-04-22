import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { InteractiveEntityType } from '../../InteractiveEntityType';

export class MinimapDrop extends ItemDrop {
    mesh: THREE.Group;
    dropType = ItemDropType.MINIMAP;
    interactiveType = InteractiveEntityType.ITEM_DROP;
    private textMesh: THREE.Mesh;
    private plateMesh: THREE.Mesh;
    private floatTimer = 0;
    private baseHeight: number;

    private readonly FLOAT_SPEED = 1.6;
    private readonly FLOAT_AMPLITUDE = 0.1;
    private readonly ROTATION_SPEED = 0.4;

    constructor(scene: THREE.Scene, position: CANNON.Vec3) {
        super();
        this.baseHeight = position.y;
        this.mesh = new THREE.Group();

        this.plateMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.04, 0.65),
            new THREE.MeshStandardMaterial({
                color: 0x66d8ff,
                emissive: 0x1a3a4d,
                emissiveIntensity: 0.45,
                metalness: 0.6,
                roughness: 0.25,
            }),
        );
        this.plateMesh.rotation.x = -0.35;
        this.mesh.add(this.plateMesh);

        this.textMesh = this.createTextLabel('Grid Tracer');
        this.textMesh.position.y = 0.55;
        this.mesh.add(this.textMesh);

        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        this.floatTimer += deltaTime;
        this.mesh.position.y = this.baseHeight + Math.sin(this.floatTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.plateMesh.rotation.y += this.ROTATION_SPEED * deltaTime;

        const isNearPlayer = this.mesh.position.distanceTo(playerPosition) < this.PICKUP_DISTANCE;
        this.textMesh.visible = isNearPlayer;
        if (isNearPlayer) {
            const direction = new THREE.Vector3().subVectors(cameraPosition, this.mesh.position).normalize();
            this.textMesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }
}
