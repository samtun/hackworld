import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class NPC {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    name: string;
    position: CANNON.Vec3;
    dialogue: string[];

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        name: string,
        position: CANNON.Vec3,
        dialogue: string[]
    ) {
        this.name = name;
        this.position = position;
        this.dialogue = dialogue;

        // Visual Mesh - Simple cube as requested
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.set(position.x, position.y + 1, position.z); // +1 to sit on ground
        scene.add(this.mesh);

        // Physics Body
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
        this.body = new CANNON.Body({
            mass: 0, // Static body
            position: new CANNON.Vec3(position.x, position.y + 1, position.z),
            shape: shape,
            material: physicsMaterial
        });
        world.addBody(this.body);
    }

    /**
     * Check if player is within interaction range
     */
    isPlayerNearby(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.position.x, this.position.y, this.position.z)
        );
        return dist < 2.5; // Interaction range
    }

    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        scene.remove(this.mesh);
        world.removeBody(this.body);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        const material = this.mesh.material as THREE.Material;
        if (material && typeof material.dispose === 'function') {
            material.dispose();
        }
    }
}
