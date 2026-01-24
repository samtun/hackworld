import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics, setBodyPosition } from '../../physics/RapierPhysics';
import { ChipType } from './Chip';
import { ItemDrop } from '../ItemDrop';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class ChipDrop extends ItemDrop {
    mesh: THREE.Group;
    body: RAPIER.RigidBody;
    chipId: string;
    chipName: string;
    chipType: ChipType;
    buyPrice: number;
    sellPrice: number;
    level: number = 1;
    textMesh: THREE.Mesh | null = null;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.2;
    private readonly FLOAT_AMPLITUDE: number = 0.12;

    constructor(scene: THREE.Scene, position: THREE.Vector3, chipId: string, chipName: string, chipType: ChipType, buyPrice: number, sellPrice: number, level: number) {
        super();
        this.chipId = chipId;
        this.chipName = chipName;
        this.chipType = chipType;
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
        this.level = level;
        this.baseHeight = position.y;

        this.mesh = new THREE.Group();

        // Simple visual: colored sphere
        const geom = new THREE.SphereGeometry(0.2, 12, 12);
        const color = 0xffcc00;
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
        const sphere = new THREE.Mesh(geom, mat);
        sphere.position.y = 0.25;
        this.mesh.add(sphere);

        // Create text label using shared method
        const levelChar = ItemLevelHelper.getLevelChar(this.level);
        this.textMesh = this.createTextLabel(this.chipName, levelChar);
        this.mesh.add(this.textMesh);

        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        const bodyPosition = new THREE.Vector3(position.x, position.y, position.z);
        this.body = RapierPhysics.Instance.createKinematicBody(bodyPosition);
        const collider = RapierPhysics.Instance.addSphereCollider(this.body, 0.4);
        collider.setSensor(true);
        (this.body as any).isChipDrop = true;
        (this.body as any).chipDrop = this;
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

        setBodyPosition(this.body, this.mesh.position);
    }

    cleanup(scene: THREE.Scene, _world: RAPIER.World): void {
        scene.remove(this.mesh);
        RapierPhysics.Instance.removeBody(this.body);
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
