import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { BaseMesh } from '../BaseMesh';
import { PlayerRegistry } from '../PlayerRegistry';
import { AssetManager } from '../AssetManager';
import { FloatingIndicatorManager } from '../FloatingIndicatorManager';

enum EnemyActionType {
    Idle = 'Idle',
    Run = 'Run',
    Attack = 'Attack',
    Death = 'Death',
    TakeHit = 'TakeHit'
}

export class Enemy extends BaseMesh {
    body: CANNON.Body;
    hp: number = 60;
    maxHp: number = 60;
    speed: number = 3;
    protected size: number = 1.75;
    protected radius: number = 0.6;
    protected attackRange: number = 1.5;
    protected attackCooldown: number = 1.0;
    protected attackTimer: number = 0;
    isDead: boolean = false;
    isDying: boolean = false;
    deathTimer: number = 0;
    flashTimer: number = 0;
    stunTimer: number = 0;
    itemDropChance: number = 0.05;
    xDataDropChanceWeight: number = 1;
    baseExp: number = 10; // EXP granted on defeat, is influenced by player luck
    damage: number = 10;

    // Base position tracking for return behavior
    protected basePosition: CANNON.Vec3;
    protected returnToBaseTimer: number = 0;
    protected isReturningToBase: boolean = false;
    protected aggroRange: number = 15;
    protected returnWaitTime: number = 2.0; // Wait 2 seconds before returning to base
    protected baseArrivalThreshold: number = 0.5; // Distance to consider arrived at base

    // Animation
    isAttacking: boolean = false;
    protected attackAnimTimer: number = 0;
    techDropRateFactor: number = 1.0;
    protected bodyHalfExtentY: number;

    // Animation system
    protected mixer!: THREE.AnimationMixer;
    protected actions: Record<string, THREE.AnimationAction> = {};
    protected currentAction: THREE.AnimationAction | null = null;

    // Attack hitbox
    protected attackHitboxBody: CANNON.Body | null = null;
    protected attackHitboxActive: boolean = false;
    protected attackHitboxDelay: number = 0.42;
    protected attackHitboxDuration: number = 0.2;
    protected attackMaxDuration: number = 1.0;
    protected attackHitboxSize: CANNON.Vec3 = new CANNON.Vec3(0.5, 0.5, 0.8);
    protected attackHitboxOffset: number = 1.0;
    protected hasDealtDamageThisAttack: boolean = false;

    // Death fade
    protected deathFadeDuration: number = 0.5;
    protected deathFadeTimer: number = 0;
    protected isDeathFading: boolean = false;
    private deathYPosition: number = 0;

    protected materials: THREE.Material[] = [];
    private player: Player;
    protected scene: THREE.Scene;
    protected world: CANNON.World;
    protected physicsMaterial: CANNON.Material;

    private floatingIndicatorManager: FloatingIndicatorManager;


    // Callback for spawning damage numbers
    onDamageTaken?: (position: CANNON.Vec3, amount: number) => void;

    // Callback when death fade starts (for rewards, drops, etc.)
    onDeathFadeStart?: (enemy: Enemy) => void;

    constructor(scene: THREE.Scene, world: CANNON.World, position: CANNON.Vec3, physicsMaterial: CANNON.Material) {
        super('models/monster.glb');

        this.scene = scene;
        this.world = world;
        this.physicsMaterial = physicsMaterial;
        this.floatingIndicatorManager = FloatingIndicatorManager.getInstance(scene);

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

        // Physics
        const shape = new CANNON.Cylinder(this.radius, this.radius, this.size, 8);
        this.bodyHalfExtentY = shape.height / 2;
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

    /**
     * @param actionType The action to fade to
     * @param duration The duration of the fade
     * @param reset Wether the current action should be reset
     */
    protected fadeToAction(actionType: EnemyActionType, duration: number, reset: boolean = false) {
        const activeAction = this.actions[actionType];
        const previousAction = this.currentAction;

        if (previousAction !== activeAction || reset && activeAction) {
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
        const shape = new CANNON.Box(this.attackHitboxSize);
        this.attackHitboxBody = new CANNON.Body({
            mass: 0,
            type: CANNON.Body.KINEMATIC,
            collisionResponse: false,
            material: this.physicsMaterial
        });
        this.attackHitboxBody.addShape(shape);
        (this.attackHitboxBody as any).isEnemyAttackHitbox = true;
        (this.attackHitboxBody as any).enemy = this;
    }

    protected activateAttackHitbox() {
        if (!this.attackHitboxBody) {
            this.createAttackHitbox();
        }
        if (this.attackHitboxBody && !this.attackHitboxActive) {
            this.world.addBody(this.attackHitboxBody);
            this.attackHitboxActive = true;
        }
    }

    protected deactivateAttackHitbox() {
        if (this.attackHitboxBody && this.attackHitboxActive) {
            this.world.removeBody(this.attackHitboxBody);
            this.attackHitboxActive = false;
        }
    }

    protected updateAttackHitboxPosition() {
        if (!this.attackHitboxBody || !this.attackHitboxActive) return;

        // Position the hitbox in front of the enemy
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        this.attackHitboxBody.position.set(
            this.body.position.x + forward.x * this.attackHitboxOffset,
            this.body.position.y,
            this.body.position.z + forward.z * this.attackHitboxOffset
        );
    }

    /**
     * Get the distance from this enemy to the player
     */
    protected getDistanceToPlayer(): number {
        return this.body.position.distanceTo(this.player.body.position);
    }

    protected checkAttackHitboxCollision() {
        if (!this.attackHitboxBody || !this.attackHitboxActive || this.hasDealtDamageThisAttack) return;

        const playerBody = this.player.body;
        const hitboxPos = this.attackHitboxBody.position;
        const playerPos = playerBody.position;

        // Simple distance check for collision
        const dx = hitboxPos.x - playerPos.x;
        const dz = hitboxPos.z - playerPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < this.attackHitboxSize.x + 0.5) {
            console.log("Enemy attack hits player!");
            this.player.takeDamage(this.damage, this.body.position);
            this.hasDealtDamageThisAttack = true;
        }
    }

    update(dt: number) {
        // Update animation mixer
        if (this.mixer) this.mixer.update(dt);

        if (this.isDead) return;

        if (this.isDying || this.isDead || this.isDeathFading) {
            // Keep at death height to prevent falling through floor
            this.body.velocity.y = 0;
            this.body.position.y = this.deathYPosition;
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
            this.mesh.position.copy(this.body.position as any);
            this.mesh.position.y -= this.bodyHalfExtentY;
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
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;

            // Sync position while playing death animation
            this.mesh.position.copy(this.body.position as any);
            this.mesh.position.y -= this.bodyHalfExtentY;
            return;
        }

        // Sync mesh with body
        this.mesh.position.copy(this.body.position as any);
        this.mesh.position.y -= this.bodyHalfExtentY;

        // Stun Logic
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            // Apply friction while stunned so they don't slide forever
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            this.updateAnimations(false);
            return; // Skip AI movement and attack
        }

        // AI Logic
        if (this.player.isDead) {
            // Idle friction
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
            this.updateAnimations(false);
            return;
        }

        const playerPos = this.player.body.position;
        const myPos = this.body.position;

        const distToPlayer = myPos.distanceTo(playerPos);
        const distToBase = myPos.distanceTo(this.basePosition);

        let isMoving = false;

        // Don't move while attacking
        if (!this.isAttacking) {
            // Check if player is in aggro range
            if (distToPlayer < this.aggroRange) {
                // Player in range - chase player
                this.isReturningToBase = false;
                this.returnToBaseTimer = 0;

                const dir = playerPos.vsub(myPos);
                dir.y = 0; // Don't fly
                if (dir.length() > 0) {
                    dir.normalize();
                    // Move towards player
                    this.body.velocity.x = dir.x * this.speed;
                    this.body.velocity.z = dir.z * this.speed;
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
                        this.body.velocity.x *= 0.9;
                        this.body.velocity.z *= 0.9;
                    }
                } else {
                    // Return to base position
                    if (distToBase > this.baseArrivalThreshold) {
                        const dir = this.basePosition.vsub(myPos);
                        dir.y = 0;
                        if (dir.length() > 0) {
                            dir.normalize();
                            this.body.velocity.x = dir.x * this.speed;
                            this.body.velocity.z = dir.z * this.speed;
                            isMoving = true;

                            // Rotate to face base position
                            const angle = Math.atan2(dir.x, dir.z);
                            const targetQuaternion = new THREE.Quaternion();
                            targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                            this.mesh.quaternion.slerp(targetQuaternion, 10 * dt);
                        }
                    } else {
                        // Reached base - stop and reset
                        this.body.velocity.x *= 0.9;
                        this.body.velocity.z *= 0.9;
                        this.isReturningToBase = false;
                        this.returnToBaseTimer = 0;
                    }
                }
            }
        } else {
            // Stop movement while attacking
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
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
        const attackRangeVariance = Math.random() * this.attackRange * 0.3;
        return distToPlayer < this.attackRange + attackRangeVariance && 
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

    takeDamage(amount: number, sourcePos?: CANNON.Vec3, knockbackFactor: number = 1.0) {
        if (this.isDying || this.isDead) return;

        this.hp -= amount;

        // Reset return-to-base behavior when taking damage
        this.isReturningToBase = false;
        this.returnToBaseTimer = 0;
        this.floatingIndicatorManager.spawnDamage(this.body.position, amount, '#fdc650ff');

        // Knockback
        if (sourcePos) {
            const knockbackDir = this.body.position.vsub(sourcePos);
            knockbackDir.y = 0; // Keep it horizontal
            if (knockbackDir.length() > 0) {
                knockbackDir.normalize();
                const force = 15 * knockbackFactor; // Increased force
                this.body.velocity.x = knockbackDir.x * force;
                this.body.velocity.z = knockbackDir.z * force;
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
        this.fadeToAction(EnemyActionType.TakeHit, 0.05, true);

        // Cancel attack if in progress
        if (this.isAttacking) {
            this.isAttacking = false;
            this.deactivateAttackHitbox();
        }
    }

    die() {
        this.isDying = true;
        this.deathTimer = 0;
        this.deathYPosition = this.body.position.y;

        // Cancel any ongoing attack
        if (this.isAttacking) {
            this.isAttacking = false;
            this.deactivateAttackHitbox();
        }

        // Disable collision with other objects while keeping knockback velocity
        this.body.collisionResponse = false;

        // Play death animation
        this.fadeToAction(EnemyActionType.Death, 0.1);
    }

    /**
     * Get the position where X-Data should spawn (at enemy's death location)
     */
    getDeathPosition(): CANNON.Vec3 {
        return new CANNON.Vec3(this.body.position.x, this.body.position.y - this.bodyHalfExtentY, this.body.position.z);
    }

    /**
     * Clean up enemy resources and remove from scene/world
     */
    cleanup(): void {
        this.deactivateAttackHitbox();
        this.scene.remove(this.mesh);
        this.world.removeBody(this.body);
        this.disposeMesh();
    }
}
