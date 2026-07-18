import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseMesh } from '../BaseMesh.ts';
import { InputManager } from '../controls/InputManager.ts';
import { getHint } from '../ui/InputHints';
import { NpcRegistry } from './NpcRegistry';
import { BlobShadow } from '../BlobShadow';
import { AssetManager } from '../AssetManager.ts';

/** Distance above the NPC body centre from which the shadow raycast starts. */
const NPC_SHADOW_RAY_UP = 1;
/** Distance below the NPC body centre to which the shadow raycast searches. */
const NPC_SHADOW_RAY_DOWN = 2;

export class Npc extends BaseMesh {
    name: string;
    body?: CANNON.Body;
    interactionHint: string;
    position: CANNON.Vec3;
    dialogue: string[];
    interactionCallback?: () => void;

    /** Flat circular shadow below the NPC. Hidden in performance mode. */
    public blobShadow!: BlobShadow;

    constructor(
        assetManager: AssetManager,
        private readonly npcRegistry: NpcRegistry,
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
        super(modelAsset, assetManager);

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
            position: new CANNON.Vec3(position.x, position.y + halfExtents.y, position.z),
            shape: shape,
            material: physicsMaterial
        });

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.body.addShape(shape);
        scene.add(this.mesh);
        world.addBody(this.body);

        // Blob shadow – always visible; static NPC, positioned once using a downward
        // raycast to find the correct floor height (handles elevated rooms).
        this.blobShadow = new BlobShadow(scene, 0.4);
        const npcRayStart = new CANNON.Vec3(position.x, this.body.position.y + NPC_SHADOW_RAY_UP, position.z);
        const npcRayEnd = new CANNON.Vec3(position.x, this.body.position.y - NPC_SHADOW_RAY_DOWN, position.z);
        const npcRay = new CANNON.Ray(npcRayStart, npcRayEnd);
        const npcRayResult = new CANNON.RaycastResult();
        npcRay.intersectWorld(world, { mode: CANNON.Ray.CLOSEST, result: npcRayResult, skipBackfaces: true });
        if (npcRayResult.hasHit && npcRayResult.body !== this.body) {
            const normal = new THREE.Vector3(
                npcRayResult.hitNormalWorld.x,
                npcRayResult.hitNormalWorld.y,
                npcRayResult.hitNormalWorld.z,
            );
            this.blobShadow.update(position.x, npcRayResult.hitPointWorld.y, position.z, normal);
        } else {
            this.blobShadow.update(position.x, 0, position.z);
        }
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
        return this.npcRegistry.hasShownDialogue(this.name);
    }

    /**
     * Mark this NPC's dialogue as shown
     */
    markDialogueShown(): void {
        this.npcRegistry.markDialogueShown(this.name);
    }

    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        this.blobShadow.cleanup();
        scene.remove(this.mesh);
        if (this.body) {
            world.removeBody(this.body);
        }
        this.disposeMesh();
    }
}
