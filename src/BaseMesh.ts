import * as THREE from 'three';
import { AssetManager } from './AssetManager';

export abstract class BaseMesh {
    protected mesh: THREE.Group;
    protected mixers: THREE.AnimationMixer[] = [];

    constructor(modelAsset: string, private readonly assetManager: AssetManager) {
        // Load model from assets
        const gltfModel = this.assetManager.get(modelAsset);

        this.mesh = gltfModel.scene;

        // Animation
        if (gltfModel.animations && gltfModel.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(this.mesh);
            const action = mixer.clipAction(gltfModel.animations[0]);
            action.play();
            this.mixers.push(mixer);
        }
    }

    protected replaceModel(modelPath: string) {
        try {
            // Try to use preloaded asset first
            let gltf = this.assetManager.get(modelPath);
            const model = gltf.scene.clone();

            // Clear any existing children and dispose resources
            this.disposeMesh();

            // Add the loaded model to the weapon group
            this.mesh.add(model);

            console.log(`Loaded model: ${modelPath}`);
        } catch (error) {
            throw new Error(`Failed to load model ${modelPath}: ${error}`);
        }
    }

    private disposeMeshRecursive(group: THREE.Group): void {
        // Remove and dispose all children
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child);

            // Dispose geometries and materials if it's a mesh
            if (child instanceof THREE.Mesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }

            // Recursively dispose children if it's a group
            if (child instanceof THREE.Group) {
                this.disposeMeshRecursive(child);
            }
        }
    }

    protected disposeMesh(): void {
        this.disposeMeshRecursive(this.mesh);
    }

    public update(deltaTime: number): void {
        for (const mixer of this.mixers) {
            mixer.update(deltaTime);
        }
    }
}