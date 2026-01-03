import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ChipType } from './Chip';
import { ItemDrop } from '../ItemDrop';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class ChipDrop implements ItemDrop {
    mesh: THREE.Group;
    body: CANNON.Body;
    chipId: string;
    chipName: string;
    chipType: ChipType;
    buyPrice: number;
    sellPrice: number;
    level: number = 1;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.2;
    private readonly FLOAT_AMPLITUDE: number = 0.12;
    private readonly PICKUP_DISTANCE: number = 1.5;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, chipId: string, chipName: string, chipType: ChipType, buyPrice: number, sellPrice: number, level: number) {
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

        // Text label (canvas) with level character
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Measure widths for centering
        const levelChar = ItemLevelHelper.getLevelChar(this.level);
        const baseFont = 'bold 28px Arial';
        ctx.font = baseFont;
        const nameWidth = ctx.measureText(this.chipName).width;
        const levelFont = 'italic bold 28px Arial';
        ctx.font = levelFont;
        const levelWidth = ctx.measureText(levelChar).width;
        
        const spacing = 4;
        const totalWidth = nameWidth + spacing + levelWidth;
        const startX = canvas.width / 2 - totalWidth / 2;
        const centerY = canvas.height / 2;
        
        // Draw name
        ctx.font = baseFont;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.chipName, startX, centerY);
        
        // Draw level char
        ctx.font = levelFont;
        ctx.fillText(levelChar, startX + nameWidth + spacing, centerY);
        
        const texture = new THREE.CanvasTexture(canvas);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
        plane.position.y = 0;
        plane.renderOrder = 999;
        plane.visible = false;
        this.mesh.add(plane);

        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        const shape = new CANNON.Sphere(0.4);
        this.body = new CANNON.Body({ mass: 0, isTrigger: true, collisionResponse: false, shape });
        this.body.position.copy(position);
        (this.body as any).isChipDrop = true;
        (this.body as any).chipDrop = this;
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        this.floatTimer += deltaTime;
        const offset = Math.sin(this.floatTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.baseHeight + offset;

        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        const isNear = distanceToPlayer < this.PICKUP_DISTANCE;

        // show text when near
        const textMesh = this.mesh.children.find(c => (c as THREE.Mesh).material !== undefined && (c as THREE.Mesh).geometry.type === 'PlaneGeometry');
        if (textMesh) (textMesh as THREE.Mesh).visible = isNear;

        // billboard text
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
