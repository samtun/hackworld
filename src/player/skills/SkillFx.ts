import { BaseMesh } from "../../BaseMesh";
import { AssetManager } from "../../AssetManager";
import * as THREE from "three";
import * as CANNON from "cannon-es";

export abstract class SkillFx extends BaseMesh {
    protected time: number = 0;
    protected duration: number;
    protected material: THREE.MeshStandardMaterial;

    constructor(duration: number, modelAsset: string, assetManager: AssetManager) {
        super(modelAsset, assetManager);
        this.duration = duration;

        var material: THREE.MeshStandardMaterial | null = null;
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                material = child.material as THREE.MeshStandardMaterial;
            }
        });

        if (!material) {
            throw new Error("SkillFx model must contain a mesh with a material.");
        }
        this.material = material;
    }

    public addToScene(scene: THREE.Scene): void {
        this.time = 0;
        this.update(0); // Initialize scale and opacity
        scene.add(this.mesh);
        if (this.material) {
            this.material.opacity = 1.0;
        }
    }

    public removeFromScene() {
        this.mesh.parent?.remove(this.mesh);
    }

    public setPosition(pos: CANNON.Vec3) {
        this.mesh.position.set(pos.x, pos.y, pos.z);
    }

    public update(dt: number): void {
        super.update(dt);
        this.time += dt;
    }

    public setDuration(duration: number): void {
        this.duration = duration;
    }
}