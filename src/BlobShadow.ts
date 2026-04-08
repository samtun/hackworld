import * as THREE from 'three';

/** Y-offset above the floor for the shadow mesh (avoids z-fighting). */
const SHADOW_Y_OFFSET = 0.02;

/**
 * A flat circular shadow projected straight down beneath a character,
 * representing a purely vertical light source.
 *
 * Used for players, enemies and NPCs. Hidden when performance mode is active.
 */
export class BlobShadow {
    private mesh: THREE.Mesh;
    private scene: THREE.Scene;

    /**
     * @param scene   The Three.js scene to add the shadow to.
     * @param radius  Radius of the shadow circle in world units.
     * @param visible Whether the shadow is initially visible.
     */
    constructor(scene: THREE.Scene, radius: number = 0.5, visible: boolean = true) {
        this.scene = scene;

        const geometry = new THREE.CircleGeometry(radius, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        // Lay the circle flat on the XZ plane (face up toward +Y)
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.visible = visible;
        scene.add(this.mesh);
    }

    /**
     * Reposition the shadow directly beneath the entity.
     * Call every frame with the entity's XZ position.
     *
     * @param x World X of the entity.
     * @param z World Z of the entity.
     */
    update(x: number, z: number): void {
        this.mesh.position.set(x, SHADOW_Y_OFFSET, z);
    }

    /**
     * Uniformly scale the shadow in the XZ plane.
     * @param scale Scale factor (1.0 = original size, 0.5 = half size).
     */
    setScale(scale: number): void {
        this.mesh.scale.set(scale, scale, 1);
    }

    get visible(): boolean {
        return this.mesh.visible;
    }

    set visible(value: boolean) {
        this.mesh.visible = value;
    }

    /** Remove the shadow from the scene and dispose its GPU resources. */
    cleanup(): void {
        this.scene.remove(this.mesh);
        (this.mesh.geometry as THREE.BufferGeometry).dispose();
        (this.mesh.material as THREE.Material).dispose();
    }
}
