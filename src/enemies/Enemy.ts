import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics, setBodyPosition, setLinearVelocity, getLinearVelocity } from '../physics/RapierPhysics';
import { Player } from '../Player';
import { BaseMesh } from '../BaseMesh';
import { PlayerRegistry } from '../PlayerRegistry';
import { AssetManager } from '../AssetManager';

enum EnemyActionType {
    Idle = 'Idle',
    Run = 'Run',
    Attack = 'Attack',
    Death = 'Death',
    TakeHit = 'TakeHit'
}

export class Enemy extends BaseMesh {
    body: RAPIER.RigidBody;
    characterController: RAPIER.KinematicCharacterController;
    collider: RAPIER.Collider;
    hp: number = 60;
    maxHp: number = 60;
    speed: number = 3;
    attackRange: number = 2.0;
    attackCooldown: number = 1.0;
    attackTimer: number = 0;
    isDead: boolean = false;
    isDying: boolean = false;
    deathTimer: number = 0;
    flashTimer: number = 0;
    stunTimer: number = 0;
    itemDropChance: number = 0.04;
    xDataDropChance: number = 0.02;
    expAmount: number = 10; // EXP granted on defeat
    damage: number = 10;

    // Base position tracking for return behavior
    basePosition: THREE.Vector3;
    returnToBaseTimer: number = 0;
    isReturningToBase: boolean = false;
    aggroRange: number = 15;
    returnWaitTime: number = 2.0; // Wait 2 seconds before returning to base
    baseArrivalThreshold: number = 0.5; // Distance to consider arrived at base

    // Animation
    isAttacking: boolean = false;
    attackAnimTimer: number = 0;
    techDropRateFactor: number = 1.0;
    bodyHalfExtentY: number;

    // Animation system
    protected mixer!: THREE.AnimationMixer;
    protected actions: Record<string, THREE.AnimationAction> = {};
    protected currentAction: THREE.AnimationAction | null = null;

    // Attack hitbox
    protected attackHitboxBody: RAPIER.RigidBody | null = null;
    protected attackHitboxCollider: RAPIER.Collider | null = null;
    protected attackHitboxActive: boolean = false;
    protected attackHitboxDelay: number = 0.42;
    protected attackHitboxDuration: number = 0.2;
    protected attackMaxDuration: number = 1.0;
    protected attackHitboxSize: THREE.Vector3 = new THREE.Vector3(0.5, 0.5, 0.8);
    protected attackHitboxOffset: number = 1.0;
    private hasDealtDamageThisAttack: boolean = false;

    // Death fade
    protected deathFadeDuration: number = 0.5;
    protected deathFadeTimer: number = 0;
    protected isDeathFading: boolean = false;
    private deathYPosition: number = 0;

    protected materials: THREE.Material[] = [];
    private player: Player;
    protected scene: THREE.Scene;
    protected world: RAPIER.World;

    // Callback for spawning damage numbers
    onDamageTaken?: (position: THREE.Vector3, amount: number) => void;

    // Callback when death fade starts (for rewards, drops, etc.)
    onDeathFadeStart?: (enemy: Enemy) => void;

    constructor(scene: THREE.Scene, world: RAPIER.World, position: THREE.Vector3) {
        super('models/monster.glb');

        this.scene = scene;
        this.world = world;

        // Store base position for return behavior
        this.basePosition = position.clone();

        // Visual
        scene.add(this.mesh);
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = child.material.clone();
                this.materials.push(child.material);
            }
        });

        // Setup animations
        this.setupAnimations();

        // Physics - Rapier Kinematic Body with CharacterController
        const spawnPos = new THREE.Vector3(position.x, position.y, position.z);

        // Create kinematic body
        this.body = RapierPhysics.Instance.createKinematicBody(spawnPos);

        // Add capsule collider (height ~1.75, radius 0.6)
        const capsuleHalfHeight = 0.475; // Total height = 0.95 + 2*radius = 2.15m
        const capsuleRadius = 0.6;
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

        // Create character controller
        this.characterController = RapierPhysics.Instance.createCharacterController();

        this.player = PlayerRegistry.Instance.activePlayers[0];
    }

    protected setupAnimations() {
        // Clear BaseMesh mixer to avoid conflict
        this.mixers = [];

        this.mixer = new THREE.AnimationMixer(this.mesh);

        const gltf = AssetManager.Instance.get('models/monster.glb');
        const animations = gltf.animations;

        if (animations && animations.length > 0) {
            const getClip = (name: string) => animations.find(a => a.name === name);

            const idleClip = getClip(EnemyActionType.Idle);
            const runClip = getClip(EnemyActionType.Run);
            const attackClip = getClip(EnemyActionType.Attack);
            const deathClip = getClip(EnemyActionType.Death);
            const takeHitClip = getClip(EnemyActionType.TakeHit);

            if (idleClip) {
                const action = this.mixer.clipAction(idleClip);
                this.actions[EnemyActionType.Idle] = action;
            }
            if (runClip) {
                const action = this.mixer.clipAction(runClip);
                this.actions[EnemyActionType.Run] = action;
            }
            if (attackClip) {
                const action = this.mixer.clipAction(attackClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[EnemyActionType.Attack] = action;
            }
            if (deathClip) {
                const action = this.mixer.clipAction(deathClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                this.actions[EnemyActionType.Death] = action;
            }
            if (takeHitClip) {
                const action = this.mixer.clipAction(takeHitClip);
                action.loop = THREE.LoopOnce;
                action.clampWhenFinished = true;
                action.timeScale = 1.6;
                this.actions[EnemyActionType.TakeHit] = action;
            }

            // Listen for animation finished events
            this.mixer.addEventListener('finished', (e) => {
                const finishedAction = e.action;
                if (finishedAction === this.actions[EnemyActionType.Attack]) {
                    this.isAttacking = false;
                    this.deactivateAttackHitbox();
                }
                if (finishedAction === this.actions[EnemyActionType.Death]) {
                    this.isDeathFading = true;
                    this.deathFadeTimer = 0;
                    // Trigger death fade callback for rewards/drops
                    if (this.onDeathFadeStart) {
                        this.onDeathFadeStart(this);
                    }
                }
            });
        }

        // Start Idle
        this.fadeToAction(EnemyActionType.Idle, 0.0);
    }

    protected fadeToAction(actionType: EnemyActionType, duration: number) {
        const activeAction = this.actions[actionType];
        const previousAction = this.currentAction;

        if (previousAction !== activeAction && activeAction) {
            if (previousAction) {
                previousAction.fadeOut(duration);
            }
            activeAction.reset().fadeIn(duration).play();
            this.currentAction = activeAction;
        }
    }

    protected updateAnimations(isMoving: boolean) {
        if (this.isDying) {
            return;
        }

        // High priority: Take Hit
        const takeHitAction = this.actions[EnemyActionType.TakeHit];
        if (this.currentAction === takeHitAction && takeHitAction && takeHitAction.isRunning()) {
            return;
        }

        // High priority: Attack
        if (this.isAttacking) {
            this.fadeToAction(EnemyActionType.Attack, 0.1);
            return;
        }

        // Run / Idle
        if (isMoving) {
            this.fadeToAction(EnemyActionType.Run, 0.2);
        } else {
            this.fadeToAction(EnemyActionType.Idle, 0.2);
        }
    }

    protected createAttackHitbox() {
        // Create kinematic body for attack hitbox
        const hitboxPos = this.body.translation();
        this.attackHitboxBody = RapierPhysics.Instance.createKinematicBody(
            new THREE.Vector3(hitboxPos.x, hitboxPos.y, hitboxPos.z)
        );

        // Add box collider
        this.attackHitboxCollider = RapierPhysics.Instance.addBoxCollider(
            this.attackHitboxBody,
            new THREE.Vector3(this.attackHitboxSize.x, this.attackHitboxSize.y, this.attackHitboxSize.z)
        );

        // Set sensor to not affect physics (collision detection only)
        this.attackHitboxCollider.setSensor(true);

        (this.attackHitboxBody as any).isEnemyAttackHitbox = true;
        (this.attackHitboxBody as any).enemy = this;
    }

    protected activateAttackHitbox() {
        if (!this.attackHitboxBody) {
            this.createAttackHitbox();
        }
        this.attackHitboxActive = true;
    }

    protected deactivateAttackHitbox() {
        if (this.attackHitboxBody && this.attackHitboxActive) {
            // Just mark as inactive, body stays in world
            this.attackHitboxActive = false;
        }
    }

    protected updateAttackHitboxPosition() {
        if (!this.attackHitboxBody || !this.attackHitboxActive) return;

        // Position the hitbox in front of the enemy
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        const bodyPos = this.body.translation();
        setBodyPosition(
            this.attackHitboxBody,
            new THREE.Vector3(
                bodyPos.x + forward.x * this.attackHitboxOffset,
                bodyPos.y,
                bodyPos.z + forward.z * this.attackHitboxOffset
            )
        );
    }

    protected checkAttackHitboxCollision() {
        if (!this.attackHitboxBody || !this.attackHitboxActive || this.hasDealtDamageThisAttack) return;

        const playerBody = this.player.body;
        const hitboxPos = this.attackHitboxBody.translation();
        const playerPos = playerBody.translation();

        // Simple distance check for collision
        const dx = hitboxPos.x - playerPos.x;
        const dz = hitboxPos.z - playerPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < this.attackHitboxSize.x + 0.5) {
            console.log("Enemy attack hits player!");
            const enemyPos = this.body.translation();
            const threePos = new THREE.Vector3(enemyPos.x, enemyPos.y, enemyPos.z);
            this.player.takeDamage(this.damage, threePos);
            this.hasDealtDamageThisAttack = true;
        }
    }

    update(dt: number) {
        // Update animation mixer
        if (this.mixer) this.mixer.update(dt);

        if (this.isDead) return;

        if (this.isDying || this.isDead || this.isDeathFading) {
            // Keep at death height to prevent falling through floor
            const pos = this.body.translation();
            setBodyPosition(this.body, new THREE.Vector3(pos.x, this.deathYPosition, pos.z));
        }

        // Handle death fade after death animation completes
        if (this.isDeathFading) {
            this.deathFadeTimer += dt;
            const progress = this.deathFadeTimer / this.deathFadeDuration;

            if (progress >= 1) {
                this.isDead = true;
            } else {
                // Fade out materials
                this.materials.forEach((mat) => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                        mat.transparent = true;
                        mat.opacity = 1 - progress;
                    }
                });
            }

            // Sync position during fade
            const fadePos = this.body.translation();
            this.mesh.position.set(fadePos.x, fadePos.y - this.bodyHalfExtentY, fadePos.z);
            return;
        }

        // Flash Effect
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            if (this.flashTimer <= 0) {
                this.setFlashColor(0x000000);
            }
        }

        if (this.isDying) {
            this.deathTimer += dt;

            // Friction for dying body
            const dyingVel = getLinearVelocity(this.body);
            dyingVel.x *= 0.9;
            dyingVel.z *= 0.9;
            setLinearVelocity(this.body, dyingVel);

            // Sync position while playing death animation
            const dyingPos = this.body.translation();
            this.mesh.position.set(dyingPos.x, dyingPos.y - this.bodyHalfExtentY, dyingPos.z);
            return;
        }

        // Sync mesh with body
        const bodyPos = this.body.translation();
        this.mesh.position.set(bodyPos.x, bodyPos.y - this.bodyHalfExtentY, bodyPos.z);

        // Stun Logic
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            // Apply friction while stunned so they don't slide forever
            const stunVel = getLinearVelocity(this.body);
            stunVel.x *= 0.9;
            stunVel.z *= 0.9;
            setLinearVelocity(this.body, stunVel);
            this.updateAnimations(false);
            return; // Skip AI movement and attack
        }

        // AI Logic
        if (this.player.isDead) {
            // Idle friction
            const idleVel = getLinearVelocity(this.body);
            idleVel.x *= 0.9;
            idleVel.z *= 0.9;
            setLinearVelocity(this.body, idleVel);
            this.updateAnimations(false);
            return;
        }

        const playerPos = this.player.body.translation();
        const myPos = this.body.translation();

        const distToPlayer = Math.sqrt(
            Math.pow(myPos.x - playerPos.x, 2) +
            Math.pow(myPos.y - playerPos.y, 2) +
            Math.pow(myPos.z - playerPos.z, 2)
        );
        const distToBase = Math.sqrt(
            Math.pow(myPos.x - this.basePosition.x, 2) +
            Math.pow(myPos.y - this.basePosition.y, 2) +
            Math.pow(myPos.z - this.basePosition.z, 2)
        );

        let isMoving = false;

        // Don't move while attacking
        if (!this.isAttacking) {
            // Check if player is in aggro range
            if (distToPlayer < this.aggroRange) {
                // Player in range - chase player
                this.isReturningToBase = false;
                this.returnToBaseTimer = 0;

                const dir = new THREE.Vector3(
                    playerPos.x - myPos.x,
                    0, // Don't fly
                    playerPos.z - myPos.z
                );
                if (dir.length() > 0) {
                    dir.normalize();

                    // Get current velocity
                    const currentVel = getLinearVelocity(this.body);

                    // Compute desired velocity
                    const desiredVelocity = new THREE.Vector3(
                        dir.x * this.speed,
                        currentVel.y, // Keep vertical velocity
                        dir.z * this.speed
                    );

                    // Use character controller to compute movement
                    this.characterController.computeColliderMovement(
                        this.collider,
                        desiredVelocity
                    );

                    // Get computed movement and apply to body
                    const correctedMovement = this.characterController.computedMovement();
                    const newPos = new THREE.Vector3(
                        myPos.x + correctedMovement.x * dt,
                        myPos.y + correctedMovement.y * dt,
                        myPos.z + correctedMovement.z * dt
                    );
                    setBodyPosition(this.body, newPos);

                    isMoving = true;

                    // Rotate to face player
                    const angle = Math.atan2(dir.x, dir.z);
                    const targetQuaternion = new THREE.Quaternion();
                    targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                    this.mesh.quaternion.slerp(targetQuaternion, 10 * dt);
                }
            } else {
                // Player out of range - return to base after delay
                if (!this.isReturningToBase) {
                    // Start the wait timer
                    this.returnToBaseTimer += dt;

                    // After wait time, start returning
                    if (this.returnToBaseTimer >= this.returnWaitTime) {
                        this.isReturningToBase = true;
                    } else {
                        // Still waiting - apply idle friction
                        const waitVel = getLinearVelocity(this.body);
                        waitVel.x *= 0.9;
                        waitVel.z *= 0.9;
                        setLinearVelocity(this.body, waitVel);
                    }
                } else {
                    // Return to base position
                    if (distToBase > this.baseArrivalThreshold) {
                        const dir = new THREE.Vector3(
                            this.basePosition.x - myPos.x,
                            0,
                            this.basePosition.z - myPos.z
                        );
                        if (dir.length() > 0) {
                            dir.normalize();

                            // Get current velocity
                            const currentVel = getLinearVelocity(this.body);

                            // Compute desired velocity
                            const desiredVelocity = new THREE.Vector3(
                                dir.x * this.speed,
                                currentVel.y, // Keep vertical velocity
                                dir.z * this.speed
                            );

                            // Use character controller to compute movement
                            this.characterController.computeColliderMovement(
                                this.collider,
                                desiredVelocity
                            );

                            // Get computed movement and apply to body
                            const correctedMovement = this.characterController.computedMovement();
                            const newPos = new THREE.Vector3(
                                myPos.x + correctedMovement.x * dt,
                                myPos.y + correctedMovement.y * dt,
                                myPos.z + correctedMovement.z * dt
                            );
                            setBodyPosition(this.body, newPos);

                            isMoving = true;

                            // Rotate to face base position
                            const angle = Math.atan2(dir.x, dir.z);
                            const targetQuaternion = new THREE.Quaternion();
                            targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                            this.mesh.quaternion.slerp(targetQuaternion, 10 * dt);
                        }
                    } else {
                        // Reached base - stop and reset
                        const baseVel = getLinearVelocity(this.body);
                        baseVel.x *= 0.9;
                        baseVel.z *= 0.9;
                        setLinearVelocity(this.body, baseVel);
                        this.isReturningToBase = false;
                        this.returnToBaseTimer = 0;
                    }
                }
            }
        } else {
            // Stop movement while attacking
            const attackVel = getLinearVelocity(this.body);
            attackVel.x *= 0.9;
            attackVel.z *= 0.9;
            setLinearVelocity(this.body, attackVel);
        }

        // Attack Cooldown
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
        }

        // Attack Trigger
        if (this.canAttackPlayer(distToPlayer)) {
            console.log(`Attack range check: dist=${distToPlayer.toFixed(2)}`);
            this.attack();
        }

        // Handle attack hitbox activation and collision
        if (this.isAttacking) {
            this.attackAnimTimer += dt;

            // Fallback: end attack after max duration in case animation event doesn't fire
            if (this.attackAnimTimer >= this.attackMaxDuration) {
                this.isAttacking = false;
                this.deactivateAttackHitbox();
            } else {
                // Activate hitbox after delay
                if (this.attackAnimTimer >= this.attackHitboxDelay && !this.attackHitboxActive) {
                    this.activateAttackHitbox();
                }

                // Deactivate hitbox after its active duration
                if (this.attackHitboxActive && this.attackAnimTimer >= this.attackHitboxDelay + this.attackHitboxDuration) {
                    this.deactivateAttackHitbox();
                }

                // Update hitbox position and check collision while active
                if (this.attackHitboxActive) {
                    this.updateAttackHitboxPosition();
                    this.checkAttackHitboxCollision();
                }
            }
        }

        // Update animations
        this.updateAnimations(isMoving);
    }

    // Set flash color for damage effect
    // Setting the color to black (0x000000) resets to normal
    private setFlashColor(color: number) {
        this.materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.setHex(color);
            }
        });
    }

    /**
     * Check if the enemy can attack the player
     */
    private canAttackPlayer(distToPlayer: number): boolean {
        const attackRangeVariance = (Math.random() * 0.8 - 0.4);
        return distToPlayer < this.aggroRange &&
            distToPlayer < this.attackRange + attackRangeVariance &&
            this.attackTimer <= 0 &&
            !this.isAttacking;
    }

    attack() {
        this.attackTimer = this.attackCooldown;
        this.isAttacking = true;
        this.attackAnimTimer = 0;
        this.hasDealtDamageThisAttack = false;

        console.log("Enemy attacks!");
        this.fadeToAction(EnemyActionType.Attack, 0.1);
    }

    takeDamage(amount: number, sourcePos?: THREE.Vector3) {
        if (this.isDying || this.isDead) return;

        this.hp -= amount;

        // Reset return-to-base behavior when taking damage
        this.isReturningToBase = false;
        this.returnToBaseTimer = 0;

        // Spawn damage number if callback is set
        if (this.onDamageTaken) {
            const myPos = this.body.translation();
            const threePos = new THREE.Vector3(myPos.x, myPos.y, myPos.z);
            this.onDamageTaken(threePos, amount);
        }

        // Knockback
        if (sourcePos) {
            const myPos = this.body.translation();
            const knockbackDir = new THREE.Vector3(
                myPos.x - sourcePos.x,
                0, // Keep it horizontal
                myPos.z - sourcePos.z
            );
            if (knockbackDir.length() > 0) {
                knockbackDir.normalize();
                const force = 15;
                const vel = getLinearVelocity(this.body);
                vel.x = knockbackDir.x * force;
                vel.z = knockbackDir.z * force;
                setLinearVelocity(this.body, vel);
            }
        }

        // Flash white
        this.setFlashColor(0xffffff);
        this.flashTimer = 0.1; // 100ms
        this.stunTimer = 0.5; // 0.5s stun

        if (this.hp <= 0) {
            this.die();
            // Stop further processing to avoid unintended behavior
            return;
        }

        // Play TakeHit animation
        this.fadeToAction(EnemyActionType.TakeHit, 0.05);

        // Cancel attack if in progress
        if (this.isAttacking) {
            this.isAttacking = false;
            this.deactivateAttackHitbox();
        }
    }

    die() {
        this.isDying = true;
        this.deathTimer = 0;
        const deathPos = this.body.translation();
        this.deathYPosition = deathPos.y;

        // Cancel any ongoing attack
        if (this.isAttacking) {
            this.isAttacking = false;
            this.deactivateAttackHitbox();
        }

        // Disable collision with other objects by making collider a sensor
        this.collider.setSensor(true);

        // Play death animation
        this.fadeToAction(EnemyActionType.Death, 0.1);
    }

    /**
     * Get the position where X-Data should spawn (at enemy's death location)
     */
    getDeathPosition(): THREE.Vector3 {
        const pos = this.body.translation();
        return new THREE.Vector3(pos.x, pos.y, pos.z);
    }

    /**
     * Clean up enemy resources and remove from scene/world
     */
    cleanup(): void {
        this.deactivateAttackHitbox();

        // Remove attack hitbox (removeBody now automatically removes all colliders)
        if (this.attackHitboxBody) {
            RapierPhysics.Instance.removeBody(this.attackHitboxBody);
            this.attackHitboxBody = null;
            this.attackHitboxCollider = null;
        }

        // Remove character controller and body
        this.scene.remove(this.mesh);
        RapierPhysics.Instance.removeBody(this.body);

        this.disposeMesh();
    }
}
