import * as THREE from 'three';

export interface BlockShieldOptions {
    position?: THREE.Vector3Like;
    color?: number;
    emissiveColor?: number;
}

/**
 * A semi-transparent octagonal shield mesh used to visualise block actions
 * for both the player and enemies.
 */
export class BlockShield {
    readonly mesh: THREE.Mesh;

    constructor(options: BlockShieldOptions = {}) {
        const {
            position = { x: 0, y: 1.1, z: 0.9 },
            color = 0xffffff,
            emissiveColor = 0xffffff,
        } = options;

        const geometry = new THREE.CircleGeometry(0.7, 8);
        const material = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            emissive: emissiveColor,
            emissiveIntensity: 0.3,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);
    }

    /**
     * Attach the shield to a parent mesh, making it visible.
     */
    attachTo(parent: THREE.Object3D): void {
        if (!this.mesh.parent) {
            parent.add(this.mesh);
        }
    }

    /**
     * Remove the shield from its parent mesh.
     */
    detach(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }

    /**
     * Dispose of GPU resources. Call when the owning entity is destroyed.
     */
    dispose(): void {
        this.detach();
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
    }
}
