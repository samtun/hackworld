import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { BaseMesh } from '../BaseMesh';
import { PlayerRegistry } from '../PlayerRegistry';

export class Enemy extends BaseMesh {
    weaponMesh: THREE.Mesh;
    body: CANNON.Body;
    hp: number = 60;
    maxHp: number = 60;
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
    itemDropChance: number = 0.04;
    xDataDropChance: number = 0.02;
    expAmount: number = 10; // EXP granted on defeat
    damage: number = 10;

    // Animation
    isAttacking: boolean = false;
    attackAnimDuration: number = 0.3;
    attackAnimTimer: number = 0;
    weaponBaseRotation: THREE.Euler;
    techDropRateFactor: number = 1.0;

    private materials: THREE.Material[] = [];
    private player: Player;
    protected scene: THREE.Scene;
    protected world: CANNON.World;

    // Callback for spawning damage numbers
    onDamageTaken?: (position: CANNON.Vec3, amount: number) => void;

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, physicsMaterial: CANNON.Material) {
        super('models/monster.glb');

        this.scene = scene;
        this.world = world;

        // Visual
        scene.add(this.mesh);
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = child.material.clone();
                this.materials.push(child.material);
            }
        });

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
            mass: 5,
            material: physicsMaterial,
            fixedRotation: true
        });
        this.body.addShape(shape);
        this.body.position.copy(position);
        (this.body as any).entity = this;
        world.addBody(this.body);

        this.player = PlayerRegistry.Instance.activePlayers[0];
    }

    update(dt: number) {
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
                this.materials.forEach((mat) => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                        mat.transparent = true;
                        mat.opacity = 1 - progress;
                    }
                });
            }
            return;
        }

        // Sync mesh with body
        this.mesh.position.copy(this.body.position as any);

        // Flash Effect
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer <= 0) {
                this.materials.forEach((mat) => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                        mat.emissive.setHex(0x000000);
                    }
                });
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
        if (this.player.isDead) {
            // Idle friction
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            return;
        }

        const playerPos = this.player.body.position;
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
            this.attack(this.player);
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
        player.takeDamage(this.damage, this.body.position);
    }

    takeDamage(amount: number, sourcePos?: CANNON.Vec3) {
        if (this.isDying || this.isDead) return;

        this.hp -= amount;

        // Spawn damage number if callback is set
        if (this.onDamageTaken) {
            this.onDamageTaken(this.body.position, amount);
        }

        // Flash white
        this.materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.setHex(0xffffff);
            }
        });
        this.flashTimer = 0.1; // 100ms
        this.stunTimer = 0.5; // 0.5s stun

        // Knockback
        if (sourcePos) {
            const knockbackDir = this.body.position.vsub(sourcePos);
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

    /**
     * Get the position where X-Data should spawn (at enemy's death location)
     */
    getDeathPosition(): CANNON.Vec3 {
        return this.body.position.clone();
    }

    /**
     * Clean up enemy resources and remove from scene/world
     */
    cleanup(): void {
        this.scene.remove(this.mesh);
        this.world.removeBody(this.body);
        this.disposeMesh();
    }
}
