import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';

export class CoreDrop implements ItemDrop {
    mesh: THREE.Group;
    body: CANNON.Body;
    coreId: string;
    coreName: string;
    buyPrice: number;
    sellPrice: number;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.0;
    private readonly FLOAT_AMPLITUDE: number = 0.14;
    private readonly PICKUP_DISTANCE: number = 1.5;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, coreId: string, coreName: string, buyPrice: number, sellPrice: number) {
        this.coreId = coreId;
        this.coreName = coreName;
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
        this.baseHeight = position.y;

        this.mesh = new THREE.Group();

        const geom = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        const color = 0x66ccff;
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 });
        const box = new THREE.Mesh(geom, mat);
        box.position.y = 0.24;
        this.mesh.add(box);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 26px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.coreName, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
        plane.position.y = 0;
        plane.visible = false;
        plane.renderOrder = 999;
        this.mesh.add(plane);

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

        const textMesh = this.mesh.children.find(c => (c as THREE.Mesh).material !== undefined && (c as THREE.Mesh).geometry.type === 'PlaneGeometry');
        if (textMesh) (textMesh as THREE.Mesh).visible = isNear;

        if (isNear && textMesh) {
            const dir = new THREE.Vector3().subVectors(cameraPosition, this.mesh.position).normalize();
            const angle = Math.atan2(dir.x, dir.z);
            (textMesh as THREE.Mesh).rotation.y = angle;
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
