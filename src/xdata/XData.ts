import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class XData {
    mesh: THREE.Object3D;
    body: CANNON.Body;
    amount: number;
    private bobTimer: number = 0;
    private baseHeight: number;
    
    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, amount: number) {
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
        
        // Physics Body (small trigger body)
        const shape = new CANNON.Box(new CANNON.Vec3(0.2, 0.2, 0.2));
        this.body = new CANNON.Body({
            mass: 0, // Static body
            position: position,
            shape: shape,
            isTrigger: true, // Make it a trigger so it doesn't collide physically
            collisionResponse: false // Don't respond to collisions
        });
        world.addBody(this.body);
    }
    
    update(dt: number): void {
        // Bobbing animation
        this.bobTimer += dt;
        const bobOffset = Math.sin(this.bobTimer * 2) * 0.15; // Bob up and down by 0.15 units
        this.mesh.position.y = this.baseHeight + bobOffset;
        
        // Sync body position with mesh
        this.body.position.y = this.mesh.position.y;
        
        // Rotate the X
        this.mesh.rotation.y += dt * 2; // Rotate 2 radians per second
    }
    
    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        scene.remove(this.mesh);
        world.removeBody(this.body);
        
        // Dispose of geometries and materials
        this.mesh.traverse((child) => {
            if ((child as any).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                const material = mesh.material;
                if (material && typeof (material as any).dispose === 'function') {
                    (material as any).dispose();
                }
            }
        });
    }
}
