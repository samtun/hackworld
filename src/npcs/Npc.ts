import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseMesh } from '../BaseMesh.ts';

export class Npc extends BaseMesh {
    name: string;
    body?: CANNON.Body;
    interactionHint: string;
    position: CANNON.Vec3;
    dialogue: string[];
    interactionCallback?: () => void;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        modelAsset: string,
        name: string,
        interactionHint: string,
        position: CANNON.Vec3,
        dialogue: string[],
        interactionCallback?: () => void
    ) {
        super(modelAsset);

        this.name = name;
        this.interactionHint = interactionHint;
        this.position = position;
        this.dialogue = dialogue;
        this.interactionCallback = interactionCallback;

        // Physics Body (Simple Box)
        const box = new THREE.Box3().setFromObject(this.mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
        const shape = new CANNON.Box(halfExtents);

        this.body = new CANNON.Body({
            mass: 0, // Static body
            position: new CANNON.Vec3(position.x, halfExtents.y, position.z),
            shape: shape,
            material: physicsMaterial
        });

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.body.addShape(shape);
        scene.add(this.mesh);
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

    /**
     * Get interaction hint text
     */
    getInteractionHint(): string {
        return `<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> ${this.interactionHint}`;
    }

    /**
     * Handle interaction
     */
    interact(): void {
        if (this.interactionCallback) {
            this.interactionCallback();
        }
    }

    /**
     * Check if the player is close enough to the NPC to interact
     * @param playerPosition The position of the player
     * @returns 
     */
    playerInInteractionRange(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.position.x, this.position.y, this.position.z)
        );
        return dist < 2.0; // Interaction range
    }

    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        scene.remove(this.mesh);
        if (this.body) {
            world.removeBody(this.body);
        }
        this.disposeMesh();
    }
}
