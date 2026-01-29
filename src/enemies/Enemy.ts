import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics } from '../physics/RapierPhysics';
import { Player } from '../Player';
import { CharacterEntity } from '../CharacterEntity';
import { PlayerRegistry } from '../PlayerRegistry';
import { AssetManager } from '../AssetManager';

enum EnemyActionType {
    Idle = 'Idle',
    Run = 'Run',
    Attack = 'Attack',
    Death = 'Death',
    TakeHit = 'TakeHit'
}

export class Enemy extends CharacterEntity {
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

    // Knockback velocity (applied during stun)
    private knockbackVelocity: THREE.Vector3 = new THREE.Vector3();
    private readonly KNOCKBACK_FRICTION: number = 0.85;

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

    protected deathFadeDuration: number = 0.5;
    protected deathFadeTimer: number = 0;
    protected isDeathFading: boolean = false;

    protected materials: THREE.Material[] = [];
    private player: Player;

    // Callback for spawning damage numbers
    onDamageTaken?: (position: THREE.Vector3, amount: number) => void;

    // Callback when death fade starts (for rewards, drops, etc.)
    onDeathFadeStart?: (enemy: Enemy) => void;

    constructor(scene: THREE.Scene, world: RAPIER.World, position: THREE.Vector3) {
        // Call CharacterEntity constructor with capsule dimensions
        const capsuleHalfHeight = 0.475; // Total height = 0.95 + 2*radius = 2.15m
        const capsuleRadius = 0.6;
        super('models/monster.glb', scene, world, position, capsuleHalfHeight, capsuleRadius, 0.01);

        // Store base position for return behavior
        this.basePosition = position.clone();

        // Clone materials for individual enemy instances
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = child.material.clone();
                this.materials.push(child.material);
            }
        });

        // Setup animations
        this.setupAnimations();

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
        // Create static body for attack hitbox (sensor only - won't block movement)
        const hitboxPos = this.body.translation();
        this.attackHitboxBody = RapierPhysics.Instance.createStaticBody(
            new THREE.Vector3(hitboxPos.x, hitboxPos.y, hitboxPos.z)
        );

        // Create sensor collider directly - use sensor from the start to avoid blocking
        const colliderDesc = RAPIER.ColliderDesc.cuboid(
            this.attackHitboxSize.x,
            this.attackHitboxSize.y,
            this.attackHitboxSize.z
        ).setSensor(true);

        this.attackHitboxCollider = this.world.createCollider(colliderDesc, this.attackHitboxBody);

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
        if (this.attackHitboxBody) {
            // Remove the hitbox body from the physics world
            RapierPhysics.Instance.removeBody(this.attackHitboxBody);
            this.attackHitboxBody = null;
            this.attackHitboxCollider = null;
        }
        this.attackHitboxActive = false;
    }
 
    protected updateAttackHitbox() {
        if (!this.attackHitboxBody || !this.attackHitboxActive) return;

        // Position the hitbox in front of the enemy
        const forward = new THREE.Vector3(0, 0, 1.4).applyQuaternion(this.mesh.quaternion);
        const bodyPos = this.body.translation();
        
        // Use setTranslation for static bodies
        this.attackHitboxBody.setTranslation({
            x: bodyPos.x + forward.x * this.attackHitboxOffset,
            y: bodyPos.y,
            z: bodyPos.z + forward.z * this.attackHitboxOffset
        }, true);

        this.attackHitboxBody.setRotation(this.body.rotation(), true);
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

        // Handle death fade after death animation completes
        if (this.isDeathFading) {
            this.updateDeathFade(dt);
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
            // During death animation - disable collider and body
            //Cannot doe this in the die() method because that breaks the code execution
            this.collider.setEnabled(false);
            this.body.setEnabled(false);
            this.deathTimer += dt;
            return;
        }

        // Stun Logic - apply knockback with friction
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            this.knockbackVelocity.multiplyScalar(this.KNOCKBACK_FRICTION);
            this.applyMovementWithGravity(new THREE.Vector3(
                this.knockbackVelocity.x * dt,
                0,
                this.knockbackVelocity.z * dt
            ), dt);
            this.syncMeshWithBody();
            this.updateAnimations(false);
            return;
        }

        // AI Logic
        if (this.player.isDead) {
            // Just apply gravity, no horizontal movement
            this.applyMovementWithGravity(new THREE.Vector3(0, 0, 0), dt);
            this.syncMeshWithBody();
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
                    0,
                    playerPos.z - myPos.z
                );
                if (dir.length() > 0) {
                    dir.normalize();
                    isMoving = this.moveInDirection(dir, dt);
                }
            } else {
                // Player out of range - return to base after delay
                isMoving = this.handleReturnToBase(distToBase, dt);
            }
        } else {
            // No movement while attacking, but still apply gravity
            this.applyMovementWithGravity(new THREE.Vector3(0, 0, 0), dt);
        }

        // Sync mesh position
        this.syncMeshWithBody();

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
            this.updateAttackLogic(dt);
        }

        // Update animations
        this.updateAnimations(isMoving);
    }

    /**
     * Move in a direction at the enemy's speed
     */
    private moveInDirection(dir: THREE.Vector3, dt: number): boolean {
        // Calculate movement for this frame
        const movement = new THREE.Vector3(
            dir.x * this.speed * dt,
            0,
            dir.z * this.speed * dt
        );

        // Apply movement with gravity
        this.applyMovementWithGravity(movement, dt);

        // Rotate to face direction
        const angle = Math.atan2(dir.x, dir.z);
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.mesh.quaternion.slerp(targetQuaternion, 10 * dt);

        // Sync body rotation with mesh rotation
        this.syncBodyRotation();

        return true;
    }

    /**
     * Handle return to base behavior when player is out of aggro range
     */
    private handleReturnToBase(distToBase: number, dt: number): boolean {
        if (!this.isReturningToBase) {
            // Start the wait timer
            this.returnToBaseTimer += dt;

            // After wait time, start returning
            if (this.returnToBaseTimer >= this.returnWaitTime) {
                this.isReturningToBase = true;
            } else {
                // Still waiting - apply gravity only
                this.applyMovementWithGravity(new THREE.Vector3(0, 0, 0), dt);
                return false;
            }
        }

        // Return to base position
        if (distToBase > this.baseArrivalThreshold) {
            const myPos = this.body.translation();
            const dir = new THREE.Vector3(
                this.basePosition.x - myPos.x,
                0,
                this.basePosition.z - myPos.z
            );
            if (dir.length() > 0) {
                dir.normalize();
                return this.moveInDirection(dir, dt);
            }
        } else {
            // Reached base - stop and reset
            this.applyMovementWithGravity(new THREE.Vector3(0, 0, 0), dt);
            this.isReturningToBase = false;
            this.returnToBaseTimer = 0;
        }

        return false;
    }

    /**
     * Update attack hitbox logic
     */
    private updateAttackLogic(dt: number): void {
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
                this.updateAttackHitbox();
                this.checkAttackHitboxCollision();
            }
        }
    }

    /**
     * Update death fade effect
     */
    private updateDeathFade(dt: number): void {
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

        // Sync position during fade (no movement)
        this.syncMeshWithBody();
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
                0,
                myPos.z - sourcePos.z
            );
            if (knockbackDir.length() > 0) {
                knockbackDir.normalize();
                const force = 15;
                this.knockbackVelocity.set(
                    knockbackDir.x * force,
                    0,
                    knockbackDir.z * force
                );
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

        // Cancel any ongoing attack
        if (this.isAttacking) {
            this.isAttacking = false;
            this.deactivateAttackHitbox();
        }

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
        // Remove attack hitbox if still active
        this.deactivateAttackHitbox();

        // Call parent cleanup (removes body, mesh, disposes resources)
        super.cleanup();
    }
}
