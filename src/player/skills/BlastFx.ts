import * as THREE from "three";
import { AssetManager } from "../../AssetManager";
import { SkillFx } from "./SkillFx";

export class BlastFx extends SkillFx {
    private waves: number;
    private range: number;

    constructor(
        duration: number,
        range: number,
        waves: number,
        assetManager: AssetManager) {
        super(duration, 'models/fx/blast_fx.glb', assetManager);
        this.range = range;
        this.waves = waves;
    }

    public update(dt: number) {
        super.update(dt);
        const progress = this.time / this.duration;
        const scale = ((this.range * progress) * this.waves) % this.range;
        this.mesh.scale.copy(new THREE.Vector3(scale, scale, scale));
        if (this.material) {
            this.material.opacity = (1.0 - ((progress * this.waves % 1.0) - 0.7) / 0.3);
        }
    }

}