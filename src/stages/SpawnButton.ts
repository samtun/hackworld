import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from '../InputManager';
import { getHint } from '../ui/InputHints';

/**
 * A simple interactive button entity for the GameTest stage.
 * Renders as a colored box and triggers a callback when interacted with.
 *
 * Provides the same public interface as {@link import('../npcs/Npc').Npc} so it
 * can be added to the stage's `npcs` set and handled by Game.ts's interaction
 * loop without modifying any existing code.
 */
export class SpawnButton {
    name: string;
    body: CANNON.Body;
    interactionHint: string;
    position: CANNON.Vec3;
    dialogue: string[] = [];
    interactionCallback: () => void;

    private mesh: THREE.Mesh;

    private static readonly SIZE = 1;
    private static readonly INTERACTION_RANGE = 2.5;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        position: CANNON.Vec3,
        name: string,
        hintText: string,
        color: number,
        callback: () => void,
    ) {
        this.name = name;
        this.interactionHint = hintText;
        this.position = position;
        this.interactionCallback = callback;

        const S = SpawnButton.SIZE;
        const geo = new THREE.BoxGeometry(S, S, S);
        const mat = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(position.x, position.y + S / 2, position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(S / 2, S / 2, S / 2));
        this.body = new CANNON.Body({ mass: 0, material: physicsMaterial });
        this.body.addShape(shape);
        this.body.position.set(position.x, position.y + S / 2, position.z);
        world.addBody(this.body);
    }

    isPlayerNearby(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.position.x, this.position.y, this.position.z),
        );
        return dist < SpawnButton.INTERACTION_RANGE;
    }

    getInteractionHint(inputManager: InputManager): string {
        const hintConfig = {
            keyboard: `<span class="key-icon">ENTER</span> ${this.interactionHint}`,
            controller: `<span class="btn-icon xbox-a">A</span> ${this.interactionHint}`,
        };
        return getHint(hintConfig, inputManager);
    }

    hasShownDialogue(): boolean {
        return true;
    }

    markDialogueShown(): void {
        // No-op
    }

    interact(): void {
        this.interactionCallback();
    }

    update(_deltaTime: number): void {
        // No-op – buttons are static
    }

    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        world.removeBody(this.body);
    }
}
