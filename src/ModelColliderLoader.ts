import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * ModelColliderLoader - Singleton for loading 3D models and their physics colliders.
 *
 * Naming convention for paired assets:
 *   Visual model:   models/{modelName}.glb
 *   Collider model: models/{modelName}.collider.glb
 *
 * Both assets must be preloaded via AssetManager before calling these methods.
 */
export class ModelColliderLoader {
    private static instance: ModelColliderLoader;

    private constructor() { }

    public static get Instance(): ModelColliderLoader {
        if (!ModelColliderLoader.instance) {
            ModelColliderLoader.instance = new ModelColliderLoader();
        }
        return ModelColliderLoader.instance;
    }

    /**
     * Traverses all meshes in a pre-loaded collider scene and creates a static box collider
     * for each one. Each body is added to the physics world immediately.
     * Use this for entities that manage their own visual model (e.g. via BaseMesh).
     *
     * @param modelScene - Root object of the collider model
     * @param physicsWorld - CANNON world to add the bodies to
     * @param physicsMaterial - Material assigned to each body
     * @param offset - Optional world-space offset applied to each collider position
     * @param rotation - Optional Euler rotation applied to each collider shape
     * @returns Array of created CANNON bodies – push these into the stage's `bodies` array for cleanup
     */
    public loadColliders(
        modelScene: THREE.Group | THREE.Object3D,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        offset?: THREE.Vector3,
        rotation?: THREE.Euler
    ): CANNON.Body[] {
        const bodies: CANNON.Body[] = [];
        modelScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const body = this.createColliderFromMesh(child, physicsMaterial, offset, rotation);
                physicsWorld.addBody(body);
                bodies.push(body);
            }
        });
        return bodies;
    }

    /**
     * Creates a single static box collider from a mesh's bounding box,
     * preserving world position, rotation, and scale.
     */
    private createColliderFromMesh(
        mesh: THREE.Mesh,
        physicsMaterial: CANNON.Material,
        offset?: THREE.Vector3,
        rotation?: THREE.Euler
    ): CANNON.Body {
        const geometry = mesh.geometry;

        // 1. Calculate bounding box
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;

        // 2. Calculate size (Max - Min)
        const size = new THREE.Vector3();
        box.getSize(size);

        // 3. Calculate half-extents considering mesh scale
        const halfExtents = new CANNON.Vec3(
            (size.x * mesh.scale.x) / 2,
            (size.y * mesh.scale.y) / 2,
            (size.z * mesh.scale.z) / 2
        );

        const boxShape = new CANNON.Box(halfExtents);

        // 4. Create static body
        const body = new CANNON.Body({
            mass: 0,
            material: physicsMaterial
        });

        // 5. Account for geometry center offset and optional shape rotation
        // If the geometry center is not at (0,0,0), move the shape within the body
        const center = new THREE.Vector3();
        box.getCenter(center);
        center.multiply(mesh.scale);

        const cannonOffset = new CANNON.Vec3(center.x, center.y, center.z);
        let cannonRotation: CANNON.Quaternion | undefined;
        if (rotation) {
            const rotationQuaternion = new THREE.Quaternion().setFromEuler(rotation);
            cannonRotation = new CANNON.Quaternion(
                rotationQuaternion.x,
                rotationQuaternion.y,
                rotationQuaternion.z,
                rotationQuaternion.w
            );
        }
        body.addShape(boxShape, cannonOffset, cannonRotation);

        // 6. Synchronize world position and rotation
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        mesh.getWorldPosition(worldPos);
        mesh.getWorldQuaternion(worldQuat);

        if (offset) {
            worldPos.add(offset);
        }

        body.position.set(worldPos.x, worldPos.y, worldPos.z);
        body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

        return body;
    }
}
