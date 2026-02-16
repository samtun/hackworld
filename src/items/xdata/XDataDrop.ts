import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { InteractiveEntityType } from '../../InteractiveEntityType';

/**
 * XDataDrop entity - represents X-Data that can be picked up from the ground
 * Displays an X shape and animates with floating and rotation
 */
export class XDataDrop extends ItemDrop {
    mesh: THREE.Object3D;
    dropType = ItemDropType.XDATA;
    amount: number;
    interactiveType = InteractiveEntityType.AUTO_PICKUP_DROP;
    private bobTimer: number = 0;
    private baseHeight: number;
    
    constructor(scene: THREE.Scene, position: CANNON.Vec3, amount: number) {
        super();
        this.amount = amount;
        this.baseHeight = position.y;
        
        // Create X shape using two rotated boxes
        const group = new THREE.Group();
        
        const barGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        
        // First bar (diagonal)
        const bar1 = new THREE.Mesh(barGeometry, material);
        bar1.rotation.z = Math.PI / 4;
        group.add(bar1);
        
        // Second bar (opposite diagonal)
        const bar2 = new THREE.Mesh(barGeometry, material);
        bar2.rotation.z = -Math.PI / 4;
        group.add(bar2);
        
        // Position the group
        group.position.set(position.x, position.y, position.z);
        scene.add(group);
        
        // Store the group as Object3D (base class of both Mesh and Group)
        this.mesh = group;
    }
    
    update(deltaTime: number, _cameraPosition: THREE.Vector3, _playerPosition: THREE.Vector3): void {
        // Bobbing animation
        this.bobTimer += deltaTime;
        const bobOffset = Math.sin(this.bobTimer * 2) * 0.15; // Bob up and down by 0.15 units
        this.mesh.position.y = this.baseHeight + bobOffset;
        
        // Rotate the X
        this.mesh.rotation.y += deltaTime * 2; // Rotate 2 radians per second
    }
    
    cleanup(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        
        // Dispose of geometries and materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                const material = child.material;
                if (material && typeof (material as any).dispose === 'function') {
                    (material as any).dispose();
                }
            }
        });
    }
}
