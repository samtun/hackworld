import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import { Player } from '../Player';

export class LargeEnemy extends Enemy {

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, physicsMaterial: CANNON.Material) {
        super(scene, world, position, physicsMaterial);

        // Adjust stats for LargeEnemy
        this.hp = 90;
        this.maxHp = 90;
        this.weaponDropChance = 0.08;
        this.xDataDropChance = 0.04;
        this.expAmount = 30;

        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x8b0000 }); // Dark red

        // Replace the mesh
        scene.remove(this.mesh);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
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
        world.addBody(this.body);
    }

    attack(player: Player) {
        this.attackTimer = this.attackCooldown;
        this.isAttacking = true;
        this.attackAnimTimer = 0;

        console.log("Large Enemy attacks player!");
        player.takeDamage(13);
    }
}
