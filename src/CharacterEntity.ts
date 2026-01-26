import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics } from './physics/RapierPhysics';
import { BaseMesh } from './BaseMesh';

/**
 * Base class for entities that use kinematic character controllers
 * Provides shared movement logic with gravity, slope handling, autostep, etc.
 */
export abstract class CharacterEntity extends BaseMesh {
    body: RAPIER.RigidBody;
    characterController: RAPIER.KinematicCharacterController;
    collider: RAPIER.Collider;

    protected scene: THREE.Scene;
    protected world: RAPIER.World;

    // Physics constants
    protected readonly GRAVITY = 32;

    // Vertical velocity for gravity/jumping
    protected verticalVelocity: number = 0;
    protected isGrounded: boolean = true;

    // Body dimensions (set by subclass)
    protected bodyHalfExtentY: number = 0;

    constructor(
        modelAsset: string,
        scene: THREE.Scene,
        world: RAPIER.World,
        position: THREE.Vector3,
        capsuleHalfHeight: number,
        capsuleRadius: number,
        controllerOffset: number = 0.01,
        colliderOffset?: THREE.Vector3
    ) {
        super(modelAsset);

        this.scene = scene;
        this.world = world;
        this.bodyHalfExtentY = capsuleHalfHeight + capsuleRadius;

        // Add mesh to scene
        scene.add(this.mesh);

        // Create kinematic body
        this.body = RapierPhysics.Instance.createKinematicBody(position);

        // Add capsule collider
        this.collider = RapierPhysics.Instance.addCapsuleCollider(
            this.body,
            capsuleHalfHeight,
            capsuleRadius,
            colliderOffset,
            0.3, // friction
            0.0  // restitution
        );

        // Store entity reference on collider for collision detection
        (this.collider as any).entity = this;

        // Create character controller with proper settings
        this.characterController = RapierPhysics.Instance.createCharacterController(controllerOffset);
        this.characterController.enableSnapToGround(0.7);
        this.characterController.enableAutostep(0.2, 0.1, false);
        this.characterController.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        this.characterController.setMinSlopeSlideAngle(30 * Math.PI / 180);
    }

    /**
     * Apply a pre-computed movement vector via CharacterController with collision detection.
     * This is a low-level method that applies the movement as-is without adding gravity.
     * @param movement - The complete movement vector (including vertical) for this frame
     */
    protected applyMovement(movement: THREE.Vector3): void {
        this.characterController.computeColliderMovement(
            this.collider,
            movement
        );

        const correctedMovement = this.characterController.computedMovement();
        const currentPos = this.body.translation();
        this.body.setNextKinematicTranslation({
            x: currentPos.x + correctedMovement.x,
            y: currentPos.y + correctedMovement.y,
            z: currentPos.z + correctedMovement.z
        });

        this.isGrounded = this.characterController.computedGrounded();
    }

    /**
     * Apply movement via CharacterController with collision detection and automatic gravity
     * @param movement - The desired horizontal movement vector (x, z) for this frame
     * @param dt - Delta time
     */
    protected applyMovementWithGravity(movement: THREE.Vector3, dt: number): void {
        // Apply gravity
        if (!this.isGrounded) {
            this.verticalVelocity -= this.GRAVITY * dt;
        } else if (this.verticalVelocity < 0) {
            this.verticalVelocity = 0;
        }

        // Build full movement vector including vertical velocity
        const fullMovement = new THREE.Vector3(
            movement.x,
            this.verticalVelocity * dt,
            movement.z
        );

        this.applyMovement(fullMovement);
    }

    /**
     * Sync mesh position with physics body
     */
    protected syncMeshWithBody(): void {
        const pos = this.body.translation();
        this.mesh.position.set(pos.x, pos.y - this.bodyHalfExtentY, pos.z);
    }

    /**
     * Get the current position of this entity
     */
    getPosition(): THREE.Vector3 {
        const pos = this.body.translation();
        return new THREE.Vector3(pos.x, pos.y, pos.z);
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        this.scene.remove(this.mesh);
        RapierPhysics.Instance.removeBody(this.body);
        this.disposeMesh();
    }
}
