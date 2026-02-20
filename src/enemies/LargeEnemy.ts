import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';

export class LargeEnemy extends Enemy {

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, physicsMaterial: CANNON.Material) {
        super(scene, world, position, physicsMaterial);

        // Adjust stats for LargeEnemy
        this.hp = 150;
        this.maxHp = 150;
        this.itemDropChance = 0.15;
        this.xDataDropChanceWeight = 1.5;
        this.baseExp = 25;
        this.techDropRateFactor = 1.3;
        this.damage = 15;
        this.size = 2.75;
        this.radius = 0.85;
        this.attackRange = 2.0;

        // Scale up the mesh
        scene.remove(this.mesh);
        this.mesh.scale.set(1.5, 1.5, 1.5);
        scene.add(this.mesh);

        // Update physics body size
        world.removeBody(this.body);
        const radius = this.size * 0.31;
        const shape = new CANNON.Cylinder(radius, radius, this.size, 8);
        this.bodyHalfExtentY = shape.height / 2;
        this.body = new CANNON.Body({
            mass: 17, // Proportional to volume: 5 * (1.5^3) ≈ 17
            material: physicsMaterial,
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.body.position.copy(position);
        (this.body as any).entity = this;
        world.addBody(this.body);

        // Larger attack hitbox for larger enemy
        this.attackHitboxSize = new CANNON.Vec3(0.75, 0.75, 1.0);
        this.attackHitboxOffset = 1.5;
    }
}
