import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from './Player';

export class Enemy {
    mesh: THREE.Mesh;
    weaponMesh: THREE.Mesh;
    body: CANNON.Body;
    hp: number = 30;
    maxHp: number = 30;
    speed: number = 3;
    attackRange: number = 1.5;
    attackCooldown: number = 1.0;
    attackTimer: number = 0;
    isDead: boolean = false;
    isDying: boolean = false;
    deathTimer: number = 0;
    deathDuration: number = 1.0;
    flashTimer: number = 0;
    stunTimer: number = 0;
    dropChance: number = 0.02; // 2% chance to drop weapon

    // Animation
    isAttacking: boolean = false;
    attackAnimDuration: number = 0.3;
    attackAnimTimer: number = 0;
    weaponBaseRotation: THREE.Euler;

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, physicsMaterial: CANNON.Material) {
        // Visual
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red enemy
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Weapon Visual
        const weaponGeo = new THREE.BoxGeometry(0.1, 0.1, 1.2);
        const weaponMat = new THREE.MeshStandardMaterial({ color: 0x555555 }); // Grey weapon
        this.weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
        this.weaponMesh.position.set(0.6, 0, 0.4); // Held in "hand"
        this.weaponBaseRotation = this.weaponMesh.rotation.clone();
        this.mesh.add(this.weaponMesh);

        // Physics
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        this.body = new CANNON.Body({
            mass: 5, // Heavier than player?
            material: physicsMaterial,
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.body.position.copy(position);
        world.addBody(this.body);
    }

    update(dt: number, player: Player) {
        if (this.isDead) return;

        if (this.isDying) {
            this.deathTimer += dt;
            const progress = this.deathTimer / this.deathDuration;

            // Friction for dying body
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;

            if (progress >= 1) {
                this.isDead = true;
            } else {
                // Sync X/Z with body to show knockback
                this.mesh.position.x = this.body.position.x;
                this.mesh.position.z = this.body.position.z;

                // Animate Y (Sink)
                this.mesh.position.y = this.body.position.y - (0.5 * progress);

                // Flatten
                this.mesh.scale.y = 1 - progress;

                // Fade
                const mat = this.mesh.material as THREE.MeshStandardMaterial;
                mat.transparent = true;
                mat.opacity = 1 - progress;
            }
            return;
        }

        // Sync mesh with body
        this.mesh.position.copy(this.body.position as any);
        // We handle rotation manually for AI facing
        // this.mesh.quaternion.copy(this.body.quaternion as any);

        // Flash Effect
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer <= 0) {
                (this.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            }
        }

        // Stun Logic
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            // Apply friction while stunned so they don't slide forever
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            return; // Skip AI movement and attack
        }

        // AI Logic
        const playerPos = player.body.position;
        const myPos = this.body.position;

        const dist = myPos.distanceTo(playerPos);

        // Chase
        if (dist < 15) { // Aggro range
            const dir = playerPos.vsub(myPos);
            dir.y = 0; // Don't fly
            if (dir.length() > 0) {
                dir.normalize();
                // Move towards player
                this.body.velocity.x = dir.x * this.speed;
                this.body.velocity.z = dir.z * this.speed;

                // Rotate to face player
                const angle = Math.atan2(dir.x, dir.z);
                const targetQuaternion = new THREE.Quaternion();
                targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.mesh.quaternion.slerp(targetQuaternion, 10 * dt);
            }
        } else {
            // Idle friction
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
        }

        // Attack Cooldown
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
        }

        // Attack Trigger
        if (dist < this.attackRange && this.attackTimer <= 0) {
            this.attack(player);
        }

        // Attack Animation
        if (this.isAttacking) {
            this.attackAnimTimer += dt;
            const progress = this.attackAnimTimer / this.attackAnimDuration;

            if (progress >= 1) {
                this.isAttacking = false;
                this.weaponMesh.rotation.copy(this.weaponBaseRotation);
            } else {
                // Swing arc
                const swingAngle = Math.sin(progress * Math.PI) * 2;
                this.weaponMesh.rotation.x = this.weaponBaseRotation.x + swingAngle;
            }
        }
    }

    attack(player: Player) {
        this.attackTimer = this.attackCooldown;
        this.isAttacking = true;
        this.attackAnimTimer = 0;

        console.log("Enemy attacks player!");
        player.takeDamage(10);
    }

    takeDamage(amount: number, sourcePos?: THREE.Vector3) {
        if (this.isDying || this.isDead) return;

        this.hp -= amount;

        // Flash white
        (this.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xffffff);
        this.flashTimer = 0.1; // 100ms
        this.stunTimer = 0.5; // 0.5s stun

        // Knockback
        if (sourcePos) {
            const knockbackDir = this.body.position.vsub(new CANNON.Vec3(sourcePos.x, sourcePos.y, sourcePos.z));
            knockbackDir.y = 0; // Keep it horizontal
            if (knockbackDir.length() > 0) {
                knockbackDir.normalize();
                const force = 15; // Increased force
                this.body.velocity.x = knockbackDir.x * force;
                this.body.velocity.z = knockbackDir.z * force;
            }
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDying = true;
        this.deathTimer = 0;
        // Keep physics enabled for knockback
    }
}
