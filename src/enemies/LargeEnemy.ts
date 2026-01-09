import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import { Player } from '../Player';

export class LargeEnemy extends Enemy {

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, physicsMaterial: CANNON.Material) {
        super(scene, world, position, physicsMaterial);

        // Adjust stats for LargeEnemy
        this.hp = 150;
        this.maxHp = 150;
        this.itemDropChance = 0.08;
        this.xDataDropChance = 0.04;
        this.expAmount = 25;
        this.techDropRateFactor = 1.3;

        // Replace the mesh
        scene.remove(this.mesh);
        this.mesh.scale.set(1.5, 1.5, 1.5);
        scene.add(this.mesh);

        // Re-attach weapon to new mesh
        this.mesh.add(this.weaponMesh);

        // Update physics body size
        world.removeBody(this.body);
        const shape = new CANNON.Box(new CANNON.Vec3(0.75, 0.75, 0.75)); // 1.5 / 2
        this.body = new CANNON.Body({
            mass: 17, // Proportional to volume: 5 * (1.5^3) ≈ 17
            material: physicsMaterial,
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.body.position.copy(position);
        (this.body as any).entity = this;
        world.addBody(this.body);
    }

    attack(player: Player) {
        this.attackTimer = this.attackCooldown;
        this.isAttacking = true;
        this.attackAnimTimer = 0;

        console.log("Large Enemy attacks player!");
        player.takeDamage(13, this.body.position);
    }
}
