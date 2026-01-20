import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RapierPhysics } from '../physics/RapierPhysics';
import { Enemy } from './Enemy';

export class LargeEnemy extends Enemy {

    constructor(scene: THREE.Scene, world: any, position: CANNON.Vec3) {
        super(scene, world, position);

        // Adjust stats for LargeEnemy
        this.hp = 150;
        this.maxHp = 150;
        this.itemDropChance = 0.08;
        this.xDataDropChance = 0.04;
        this.expAmount = 25;
        this.techDropRateFactor = 1.3;
        this.damage = 15;

        // Scale up the mesh
        scene.remove(this.mesh);
        this.mesh.scale.set(1.5, 1.5, 1.5);
        scene.add(this.mesh);

        // Update physics body size for larger enemy
        // Remove the original collider and body created by parent
        RapierPhysics.Instance.removeBody(this.body);
        
        // Create new kinematic body at the same position
        const spawnPos = new THREE.Vector3(position.x, position.y, position.z);
        this.body = RapierPhysics.Instance.createKinematicBody(spawnPos);
        
        // Add larger capsule collider (scaled up by 1.5x)
        const capsuleHalfHeight = 0.7125; // 0.475 * 1.5
        const capsuleRadius = 0.9; // 0.6 * 1.5
        this.bodyHalfExtentY = capsuleHalfHeight + capsuleRadius;
        this.collider = RapierPhysics.Instance.addCapsuleCollider(
            this.body,
            capsuleHalfHeight,
            capsuleRadius,
            undefined,
            0.3, // friction
            0.0  // restitution
        );
        
        // Store entity reference on collider for collision detection
        (this.collider as any).entity = this;
        
        // Character controller is already created by parent, reuse it

        // Larger attack hitbox for larger enemy
        this.attackHitboxSize = new CANNON.Vec3(0.75, 0.75, 1.0);
        this.attackHitboxOffset = 1.5;
    }
}
