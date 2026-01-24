import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics } from '../physics/RapierPhysics';
import { BaseMesh } from '../BaseMesh.ts';
import { InputManager } from '../InputManager';
import { getHint } from '../ui/InputHints';
import { NpcRegistry } from './NpcRegistry';

export class Npc extends BaseMesh {
    name: string;
    body?: RAPIER.RigidBody;
    interactionHint: string;
    position: THREE.Vector3;
    dialogue: string[];
    interactionCallback?: () => void;

    constructor(
        scene: THREE.Scene,
        _world: RAPIER.World,
        _physicsMaterial: any,
        modelAsset: string,
        name: string,
        interactionHint: string,
        position: THREE.Vector3,
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

        const halfExtents = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);

        // Create static body at NPC position
        const bodyPosition = new THREE.Vector3(position.x, halfExtents.y, position.z);
        this.body = RapierPhysics.Instance.createStaticBody(bodyPosition);
        RapierPhysics.Instance.addBoxCollider(this.body, halfExtents);

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        scene.add(this.mesh);
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
    getInteractionHint(inputManager: InputManager): string {
        const hintConfig = {
            keyboard: `<span class="key-icon">ENTER</span> ${this.interactionHint}`,
            controller: `<span class="btn-icon xbox-a">A</span> ${this.interactionHint}`
        };
        return getHint(hintConfig, inputManager);
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

    /**
     * Check if this NPC's dialogue has been shown
     */
    hasShownDialogue(): boolean {
        return NpcRegistry.Instance.hasShownDialogue(this.name);
    }

    /**
     * Mark this NPC's dialogue as shown
     */
    markDialogueShown(): void {
        NpcRegistry.Instance.markDialogueShown(this.name);
    }

    cleanup(scene: THREE.Scene, _world: RAPIER.World): void {
        scene.remove(this.mesh);
        if (this.body) {
            RapierPhysics.Instance.removeBody(this.body);
        }
        this.disposeMesh();
    }
}
