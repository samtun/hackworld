import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class CoreDrop extends ItemDrop {
    mesh: THREE.Group;
    body: CANNON.Body;
    coreId: string;
    coreName: string;
    buyPrice: number;
    sellPrice: number;
    level: number = 1;
    textMesh: THREE.Mesh | null = null;

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

        const shape = new CANNON.Sphere(0.42);
        this.body = new CANNON.Body({ mass: 0, isTrigger: true, collisionResponse: false, shape });
        this.body.position.copy(position);
        (this.body as any).isCoreDrop = true;
        (this.body as any).coreDrop = this;
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

        this.body.position.y = this.mesh.position.y;
    }

    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        scene.remove(this.mesh);
        world.removeBody(this.body);
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
