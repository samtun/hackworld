import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { AssetManager } from '../../AssetManager';
import { SkillFx } from './SkillFx';

export class RecoveryFx extends SkillFx {
    constructor(duration: number, assetManager: AssetManager) {
        super(duration, 'models/heal_fx.glb', assetManager);
    }

    public update(dt: number) {
        super.update(dt);
        const progress = this.time / this.duration;
        const horizontalScale = 1.2 + Math.sin(Math.PI * progress * 4.5) * 0.1;
        this.mesh.scale.copy(new THREE.Vector3(horizontalScale, progress, horizontalScale));
        if (this.material) {
            this.material.opacity = Math.sin(Math.PI * progress);
        }
    }

    public setPosition(pos: CANNON.Vec3) {
        this.mesh.position.set(pos.x, pos.y, pos.z);
    }
}
