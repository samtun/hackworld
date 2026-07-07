import * as THREE from 'three';

/** Small offset above the surface along its normal to avoid z-fighting. */
const SHADOW_Y_OFFSET = 0.02;

/**
 * Default face normal of a CircleGeometry in its local space (+Z before any rotation).
 * Used as the "from" vector when aligning the circle to a surface normal.
 */
const CIRCLE_NORMAL = new THREE.Vector3(0, 0, 1);

/** World-up vector used as the default floor normal for flat horizontal surfaces. */
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/**
 * A flat circular shadow that sits on the floor surface beneath a character.
 *
 * The shadow is positioned at the hit point returned by a downward raycast and
 * its orientation is aligned to the surface normal, so it renders correctly on
 * both flat floors and sloped ramps.
 *
 * Used for players, enemies and NPCs.
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
        this.mesh.visible = visible;
        scene.add(this.mesh);
    }

    /**
     * Reposition and reorient the shadow to sit on the floor surface below the entity.
     *
     * @param x      World X of the entity (used for horizontal placement).
     * @param y      World Y of the floor surface hit point (from a downward raycast).
     * @param z      World Z of the entity (used for horizontal placement).
     * @param normal Floor surface normal at the hit point.
     *               Defaults to world +Y for flat horizontal floors.
     */
    update(x: number, y: number, z: number, normal?: THREE.Vector3): void {
        const n = normal ?? WORLD_UP;
        // Offset slightly above the surface along its normal to avoid z-fighting
        this.mesh.position.set(
            x + n.x * SHADOW_Y_OFFSET,
            y + n.y * SHADOW_Y_OFFSET,
            z + n.z * SHADOW_Y_OFFSET,
        );
        // Rotate the circle so its face normal (+Z local) aligns with the floor normal
        this.mesh.quaternion.setFromUnitVectors(CIRCLE_NORMAL, n);
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
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
    }
}
