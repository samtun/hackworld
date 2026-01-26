import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Utility class for Rapier physics integration
 * Provides helper methods for common physics operations
 */
export class RapierPhysics {
    world: RAPIER.World;
    eventQueue: RAPIER.EventQueue;
    private static _instance: RapierPhysics | null = null;
    debugRenderer: THREE.LineSegments | null = null; // Public for debug access

    private constructor(world: RAPIER.World) {
        this.world = world;
        this.eventQueue = new RAPIER.EventQueue(true);
    }

    static async initialize(gravity: THREE.Vector3 = new THREE.Vector3(0, -25, 0)): Promise<RapierPhysics> {
        if (RapierPhysics._instance) {
            return RapierPhysics._instance;
        }

        await RAPIER.init();
        const world = new RAPIER.World(gravity);
        RapierPhysics._instance = new RapierPhysics(world);
        return RapierPhysics._instance;
    }

    static get Instance(): RapierPhysics {
        if (!RapierPhysics._instance) {
            throw new Error('RapierPhysics not initialized. Call RapierPhysics.initialize() first.');
        }
        return RapierPhysics._instance;
    }

    /**
     * Get the instance if it exists (for helper functions)
     */
    static getInstance(): RapierPhysics | null {
        return RapierPhysics._instance;
    }

    /**
     * Step the physics simulation
     */
    step(_deltaTime: number): void {
        this.world.step(this.eventQueue);
    }

    /**
     * Create a dynamic rigid body with a collider
     */
    createDynamicBody(
        position: THREE.Vector3,
        rotation: THREE.Quaternion = new THREE.Quaternion()
    ): RAPIER.RigidBody {
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
        return this.world.createRigidBody(rigidBodyDesc);
    }

    /**
     * Create a static rigid body (for terrain, walls, etc.)
     */
    createStaticBody(
        position: THREE.Vector3,
        rotation: THREE.Quaternion = new THREE.Quaternion()
    ): RAPIER.RigidBody {
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
        return this.world.createRigidBody(rigidBodyDesc);
    }

    /**
     * Create a kinematic position-based rigid body
     */
    createKinematicBody(
        position: THREE.Vector3,
        rotation: THREE.Quaternion = new THREE.Quaternion()
    ): RAPIER.RigidBody {
        const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
        return this.world.createRigidBody(rigidBodyDesc);
    }

    /**
     * Add a box collider to a rigid body
     */
    addBoxCollider(
        body: RAPIER.RigidBody,
        halfExtents: THREE.Vector3,
        offset?: THREE.Vector3,
        friction: number = 0,
        restitution: number = 0
    ): RAPIER.Collider {
        let colliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
            .setFriction(friction)
            .setRestitution(restitution);

        if (offset) {
            colliderDesc = colliderDesc.setTranslation(offset.x, offset.y, offset.z);
        }

        return this.world.createCollider(colliderDesc, body);
    }

    /**
     * Add a sphere collider to a rigid body
     */
    addSphereCollider(
        body: RAPIER.RigidBody,
        radius: number,
        offset?: THREE.Vector3,
        friction: number = 0,
        restitution: number = 0
    ): RAPIER.Collider {
        let colliderDesc = RAPIER.ColliderDesc.ball(radius)
            .setFriction(friction)
            .setRestitution(restitution);

        if (offset) {
            colliderDesc = colliderDesc.setTranslation(offset.x, offset.y, offset.z);
        }

        return this.world.createCollider(colliderDesc, body);
    }

    /**
     * Add a capsule collider to a rigid body
     */
    addCapsuleCollider(
        body: RAPIER.RigidBody,
        halfHeight: number,
        radius: number,
        offset?: THREE.Vector3,
        friction: number = 0,
        restitution: number = 0
    ): RAPIER.Collider {
        let colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius)
            .setFriction(friction)
            .setRestitution(restitution);

        if (offset) {
            colliderDesc = colliderDesc.setTranslation(offset.x, offset.y, offset.z);
        }

        return this.world.createCollider(colliderDesc, body);
    }

    /**
     * Add a cylinder collider to a rigid body
     */
    addCylinderCollider(
        body: RAPIER.RigidBody,
        halfHeight: number,
        radius: number,
        offset?: THREE.Vector3,
        friction: number = 0,
        restitution: number = 0
    ): RAPIER.Collider {
        let colliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
            .setFriction(friction)
            .setRestitution(restitution);

        if (offset) {
            colliderDesc = colliderDesc.setTranslation(offset.x, offset.y, offset.z);
        }

        return this.world.createCollider(colliderDesc, body);
    }

    /**
     * Add a trimesh collider from Three.js geometry (for static level geometry)
     */
    addTrimeshCollider(
        body: RAPIER.RigidBody,
        geometry: THREE.BufferGeometry,
        friction: number = 0,
        restitution: number = 0
    ): RAPIER.Collider {
        const position = geometry.attributes.position;
        const vertices = new Float32Array(position.array);

        let indices: Uint32Array;
        if (geometry.index) {
            indices = new Uint32Array(geometry.index.array);
        } else {
            // Generate indices if not present
            indices = new Uint32Array(vertices.length / 3);
            for (let i = 0; i < indices.length; i++) {
                indices[i] = i;
            }
        }

        const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
            .setFriction(friction)
            .setRestitution(restitution);

        return this.world.createCollider(colliderDesc, body);
    }

    /**
     * Create a character controller
     */
    createCharacterController(offset: number = 0.01): RAPIER.KinematicCharacterController {
        const controller = this.world.createCharacterController(offset);

        controller.enableSnapToGround(0.5);
        controller.enableAutostep(0.2, 0.1, false);
        controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        controller.setMinSlopeSlideAngle(30 * Math.PI / 180);
        
        return controller;
    }

    /**
     * Cast a ray and return the first hit
     */
    castRay(
        origin: THREE.Vector3,
        direction: THREE.Vector3,
        maxDistance: number = 100,
        filterFlags?: RAPIER.QueryFilterFlags,
        filterGroups?: number,
        filterExcludeCollider?: RAPIER.Collider,
        filterExcludeRigidBody?: RAPIER.RigidBody
    ): RAPIER.RayColliderHit | null {
        const ray = new RAPIER.Ray(origin, direction);

        return this.world.castRay(ray, maxDistance, true, filterFlags, filterGroups, filterExcludeCollider, filterExcludeRigidBody);
    }

    /**
     * Remove a rigid body from the world
     * Automatically removes all attached colliders first to avoid crashes
     */
    removeBody(body: RAPIER.RigidBody): void {
        // Remove all colliders attached to this body first
        // Iterate backwards since we're removing items
        const numColliders = body.numColliders();
        for (let i = numColliders - 1; i >= 0; i--) {
            const collider = body.collider(i);
            this.world.removeCollider(collider, true);
        }
        // Now safe to remove the body
        this.world.removeRigidBody(body);
    }

    /**
     * Remove a collider from the world
     */
    removeCollider(collider: RAPIER.Collider): void {
        this.world.removeCollider(collider, true);
    }

    /**
     * Get rigid body from collider
     */
    getBodyFromCollider(collider: RAPIER.Collider): RAPIER.RigidBody | null {
        return collider.parent();
    }

    /**
     * Convert Rapier Vector3 to Three.js Vector3
     */
    static rapierToThree(v: RAPIER.Vector3): THREE.Vector3 {
        return new THREE.Vector3(v.x, v.y, v.z);
    }

    /**
     * Convert Three.js Vector3 to Rapier Vector3
     */
    static threeToRapier(v: THREE.Vector3): RAPIER.Vector3 {
        return { x: v.x, y: v.y, z: v.z };
    }

    /**
     * Convert Rapier Quaternion to Three.js Quaternion
     */
    static rapierQuatToThree(q: RAPIER.Rotation): THREE.Quaternion {
        return new THREE.Quaternion(q.x, q.y, q.z, q.w);
    }

    /**
     * Convert Three.js Quaternion to Rapier Quaternion
     */
    static threeQuatToRapier(q: THREE.Quaternion): RAPIER.Rotation {
        return { x: q.x, y: q.y, z: q.z, w: q.w };
    }
}

/**
 * Type guard to check if an object is a Rapier rigid body
 */
export function isRapierBody(obj: any): obj is RAPIER.RigidBody {
    return obj && typeof obj.translation === 'function';
}

/**
 * Helper to sync Three.js mesh with Rapier rigid body
 */
export function syncMeshWithBody(mesh: THREE.Object3D, body: RAPIER.RigidBody, offset?: THREE.Vector3): void {
    const translation = body.translation();
    const rotation = body.rotation();

    mesh.position.set(translation.x, translation.y, translation.z);
    if (offset) {
        mesh.position.add(offset);
    }

    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
}

/**
 * Helper to set body position from Three.js vector
 */
export function setBodyPosition(body: RAPIER.RigidBody, position: THREE.Vector3): void {
    body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
}

/**
 * Helper to set body rotation from Three.js quaternion
 */
export function setBodyRotation(body: RAPIER.RigidBody, quaternion: THREE.Quaternion): void {
    body.setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }, true);
}

/**
 * Helper to apply an impulse to a body
 */
export function applyImpulse(body: RAPIER.RigidBody, impulse: THREE.Vector3, point?: THREE.Vector3): void {
    if (point) {
        body.applyImpulseAtPoint(
            { x: impulse.x, y: impulse.y, z: impulse.z },
            { x: point.x, y: point.y, z: point.z },
            true
        );
    } else {
        body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }
}

/**
 * Helper to set linear velocity of a body
 */
export function setLinearVelocity(body: RAPIER.RigidBody, velocity: THREE.Vector3): void {
    body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
}

/**
 * Helper to get linear velocity of a body
 */
export function getLinearVelocity(body: RAPIER.RigidBody): THREE.Vector3 {
    const vel = body.linvel();
    return new THREE.Vector3(vel.x, vel.y, vel.z);
}

/**
 * Create or update the debug renderer for visualizing physics colliders
 */
export function createDebugRenderer(scene: THREE.Scene, _world: RAPIER.World): THREE.LineSegments {
    const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        vertexColors: true
    });
    const geometry = new THREE.BufferGeometry();
    const debugRenderer = new THREE.LineSegments(geometry, material);
    debugRenderer.visible = false; // Hidden by default
    scene.add(debugRenderer);

    // Store reference in RapierPhysics instance
    const instance = RapierPhysics.getInstance();
    if (instance) {
        instance.debugRenderer = debugRenderer;
    }

    return debugRenderer;
}

/**
 * Update the debug renderer with current physics state
 */
export function updateDebugRenderer(world: RAPIER.World, debugRenderer: THREE.LineSegments): void {
    if (!debugRenderer.visible) return;

    const buffers = world.debugRender();
    const geometry = debugRenderer.geometry;

    geometry.setAttribute('position', new THREE.BufferAttribute(buffers.vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 4));
}

/**
 * Toggle debug renderer visibility
 */
export function setDebugRendererVisible(visible: boolean): void {
    const instance = RapierPhysics.getInstance();
    if (instance && instance.debugRenderer) {
        instance.debugRenderer.visible = visible;
    }
}
