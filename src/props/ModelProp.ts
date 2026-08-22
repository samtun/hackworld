import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseMesh } from '../BaseMesh';
import { AssetManager } from '../AssetManager';
import { ModelColliderLoader } from '../ModelColliderLoader';
import { container } from 'tsyringe';

/**
 * ModelProp — concrete, self-contained prop class for static 3D model assets.
 *
 * Extends BaseMesh to reuse model loading, animation mixer management, and
 * recursive mesh disposal. Adds collider loading, scene registration, and a
 * unified cleanup() method — making it usable directly without subclassing.
 *
 * Naming convention for paired assets:
 *   Visual model:   models/{modelName}.glb
 *   Collider model: models/{modelName}.collider.glb   (optional — skipped if not preloaded)
 *
 * Usage — pure visual prop (no subclassing needed):
 *   this.props.push(new ModelProp('pile', scene, physicsWorld, physicsMaterial, position));
 *
 * Usage — entity with extra functionality (extend this class):
 *   class HealingStation extends ModelProp { ... }
 */
export class ModelProp extends BaseMesh {
    private bodies: CANNON.Body[] = [];
    private readonly propPhysicsWorld: CANNON.World;

    constructor(
        private readonly modelColliderLoader: ModelColliderLoader,
        assetManager: AssetManager,
        modelName: string,
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        position?: THREE.Vector3,
        rotation?: THREE.Euler,
        onScene?: (mesh: THREE.Group) => void
    ) {
        super(`models/${modelName}.glb`, assetManager);
        this.propPhysicsWorld = physicsWorld;

        if (position) {
            this.mesh.position.copy(position);
        }

        if (rotation) {
            this.mesh.rotation.copy(rotation);
        }

        scene.add(this.mesh);
        onScene?.(this.mesh);

        try {
            const colliderGltf = container.resolve(AssetManager).get(`models/${modelName}.collider.glb`);
            const colliderScene = colliderGltf.scene;
            if (rotation) {
                colliderScene.rotation.copy(rotation);
            }
            this.bodies = this.modelColliderLoader.loadColliders(
                colliderScene,
                physicsWorld,
                physicsMaterial,
                position
            );
        } catch {
            // No collider model preloaded — visual-only prop
        }
    }

    /**
     * Removes the mesh from the scene, removes all collider bodies from the
     * physics world, and disposes mesh geometries and materials.
     */
    public cleanup(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        for (const body of (this.bodies ?? [])) {
            this.propPhysicsWorld.removeBody(body);
        }
        this.disposeMesh();
    }

    // update(deltaTime: number) inherited from BaseMesh — ticks animation mixers
}
