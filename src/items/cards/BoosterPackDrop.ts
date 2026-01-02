import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDrop } from '../ItemDrop';

/**
 * BoosterPackDrop entity - represents a booster pack that can be picked up from the ground
 * Displays a 3D text label and animates in a floating motion
 */
export class BoosterPackDrop implements ItemDrop {
    mesh: THREE.Group;
    body: CANNON.Body;
    textMesh: THREE.Mesh | null = null;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.5;
    private readonly FLOAT_AMPLITUDE: number = 0.15;
    private readonly PICKUP_DISTANCE: number = 1.5;

    constructor(scene: THREE.Scene, position: CANNON.Vec3) {
        this.baseHeight = position.y;

        // Create visual group
        this.mesh = new THREE.Group();

        // Create booster pack visual (colorful box)
        const packGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
        const packMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaa00, // Orange/gold color
            emissive: 0xffaa00,
            emissiveIntensity: 0.4,
            metalness: 0.5,
            roughness: 0.3
        });
        const packMesh = new THREE.Mesh(packGeometry, packMaterial);
        packMesh.position.y = 0.3;
        this.mesh.add(packMesh);

        // Add accent box on top
        const accentGeometry = new THREE.BoxGeometry(0.42, 0.1, 0.32);
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700, // Gold color
            emissive: 0xffd700,
            emissiveIntensity: 0.5
        });
        const accentMesh = new THREE.Mesh(accentGeometry, accentMaterial);
        accentMesh.position.y = 0.65;
        this.mesh.add(accentMesh);

        // Create text label using canvas texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 512;
        canvas.height = 128;

        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'bold 48px Arial';
        context.fillStyle = '#ffaa00';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('Booster Pack', canvas.width / 2, canvas.height / 2);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        });
        const textGeometry = new THREE.PlaneGeometry(2, 0.5);
        this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
        this.textMesh.position.y = 0;
        this.textMesh.renderOrder = 999;
        this.textMesh.visible = false; // Start hidden
        this.mesh.add(this.textMesh);

        // Position the group
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);

        // Create physics body (sensor for detection)
        const shape = new CANNON.Sphere(0.5);
        this.body = new CANNON.Body({
            mass: 0,
            isTrigger: true,
            collisionResponse: false,
            shape: shape
        });
        this.body.position.copy(position);

        // Mark as booster pack drop for detection
        (this.body as any).isBoosterPackDrop = true;
        (this.body as any).boosterPackDrop = this;
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        // Floating animation
        this.floatTimer += deltaTime;
        const floatOffset = Math.sin(this.floatTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.baseHeight + floatOffset;

        // Rotate the pack slowly
        this.mesh.children[0].rotation.y += deltaTime * 0.8;

        // Calculate distance to player
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        const isNearPlayer = distanceToPlayer < this.PICKUP_DISTANCE;

        // Show text only when player is close enough
        if (this.textMesh) {
            this.textMesh.visible = isNearPlayer;

            // Make text label face camera (billboard effect)
            if (isNearPlayer) {
                const direction = new THREE.Vector3()
                    .subVectors(cameraPosition, this.mesh.position)
                    .normalize();
                const angle = Math.atan2(direction.x, direction.z);
                this.textMesh.rotation.y = angle;
            }
        }

        // Sync body position (mainly Y for floating)
        this.body.position.y = this.mesh.position.y;
    }

    cleanup(scene: THREE.Scene, world: CANNON.World): void {
        scene.remove(this.mesh);
        world.removeBody(this.body);

        // Dispose of geometries and materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}
