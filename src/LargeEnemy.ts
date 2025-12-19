import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import { Player } from './Player';

export class LargeEnemy extends Enemy {
    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, physicsMaterial: CANNON.Material) {
        super(scene, world, position, physicsMaterial);
        
        // Override HP: 3x normal (90 instead of 30)
        this.hp = 90;
        this.maxHp = 90;
        
        // Make it larger
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x8b0000 }); // Dark red to distinguish
        
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
        player.takeDamage(13); // 1.3x damage (10 * 1.3 = 13)
    }
    
    /**
     * Override X-Data drop rate for Large Enemy: 3% chance
     */
    rollXDataDrop(): number {
        const dropChance = Math.random();
        
        // 3% chance to drop X-Data
        if (dropChance < 0.03) {
            return this.determineXDataAmount();
        }
        
        return 0;
    }
}
