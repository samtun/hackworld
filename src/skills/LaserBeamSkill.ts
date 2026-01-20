import * as THREE from 'three';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { Skill } from './Skill';
import { BaseMesh } from '../BaseMesh';

/**
 * Laser Beam Skill
 */
export class LaserBeamSkill extends Skill {
    private readonly DAMAGE = 20;
    private readonly RANGE = 10;
    private readonly RADIUS = 1;
    private effectTimer: number = 0;
    private readonly DURATION: number = 0.6;
    private laserAttackEffect: LaserAttackEffect | undefined;
    private isBeingExecuted: boolean = false;

    private world: any | undefined;
    private player: Player | undefined;
    private startPos: THREE.Vector3 | undefined;
    private forward: THREE.Vector3 | undefined;
    private hitEnemies: Set<Enemy> = new Set();

    constructor(onCompletedCallback: () => void) {
        super('Laser Beam', 5, 25, onCompletedCallback);
    }

    protected execute(player: Player, scene: THREE.Scene, world: any): void {
        console.log('Executing Laser Beam skill');

        this.world = world;
        this.player = player;
        this.hitEnemies.clear();

        // Get player's forward direction
        this.forward = player.getForwardDirection();

        // Create laser beam starting position (in front of player)
        const playerPos = player.body.translation();
        this.startPos = new THREE.Vector3(
            playerPos.x + this.forward.x * 0.5,
            playerPos.y + 0.5,
            playerPos.z + this.forward.z * 0.5
        );

        // Create visual particle effect
        this.isBeingExecuted = true;
        this.effectTimer = 0;
        this.createVisual(player, scene, this.startPos, this.forward);
    }

    private createVisual(player: Player, scene: THREE.Scene, startPos: THREE.Vector3, forward: THREE.Vector3): void {
        if (!this.laserAttackEffect) {
            this.laserAttackEffect = new LaserAttackEffect(
                this.DURATION,
                this.RANGE,
                player.getRotationY(),
                new THREE.Vector3(startPos.x, startPos.y, startPos.z),
                forward);
        }
        this.laserAttackEffect.addToScene(scene);
    }

    update(dt: number): void {
        super.update(dt);
        if (!this.isBeingExecuted || !this.world || !this.startPos || !this.forward || !this.player) {
            return;
        }

        this.effectTimer += dt;
        const progress = this.effectTimer / this.DURATION;

        // Calculate current beam length based on progress (matching visual effect)
        const currentLength = this.RANGE * Math.pow(progress, 2);

        // Check for hits
        for (const body of this.world.bodies) {
            const entity = (body as any).entity;
            if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                if (this.hitEnemies.has(entity)) continue;

                // Check distance along the beam
                for (let distance = 0; distance <= currentLength; distance += 1) {
                    const checkPos = new THREE.Vector3(
                        this.startPos.x + this.forward.x * distance,
                        this.startPos.y,
                        this.startPos.z + this.forward.z * distance
                    );

                    const dx = body.position.x - checkPos.x;
                    const dy = body.position.y - checkPos.y;
                    const dz = body.position.z - checkPos.z;
                    const distanceToBeam = Math.sqrt(dx * dx + dz * dz); // Horizontal distance

                    if (distanceToBeam <= this.RADIUS && Math.abs(dy) <= 2) {
                        // Hit!
                        const playerPos = this.player.body.translation();
                        const position = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
                        entity.takeDamage(this.DAMAGE, position);
                        this.hitEnemies.add(entity);
                        console.log(`Laser beam hit enemy for ${this.DAMAGE} damage`);
                        break;
                    }
                }
            }
        }

        if (progress >= 1) {
            this.cleanup();
        } else {
            this.laserAttackEffect?.update(dt);
        }
    }

    cleanup(): void {
        this.effectTimer = 0;
        this.laserAttackEffect?.removeFromScene();
        this.laserAttackEffect = undefined;
        this.isBeingExecuted = false;

        this.world = undefined;
        this.player = undefined;
        this.startPos = undefined;
        this.forward = undefined;
        this.hitEnemies.clear();

        this.onCompletedCallback();
    }
}

class LaserAttackEffect extends BaseMesh {
    private time: number = 0;
    private duration: number;
    private range: number;
    private material: THREE.MeshStandardMaterial | null = null;
    private forward: THREE.Vector3;
    private initialPosition: THREE.Vector3;

    constructor(duration: number, range: number, rotationY: number, position: THREE.Vector3, forward: THREE.Vector3) {
        super('models/laser_fx.glb');
        this.duration = duration;
        this.range = range;
        this.mesh.rotation.y = rotationY;
        this.initialPosition = position;
        this.forward = forward.clone().normalize();
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Clone the material so each laser beam instance has its own unique uniforms/shader state
                // This fixes the issue where subsequent uses of the skill would try to reuse the old shader state/uniforms
                const originalMaterial = child.material as THREE.MeshStandardMaterial;
                this.material = originalMaterial.clone();
                child.material = this.material;

                this.material.transparent = true;
                this.material.onBeforeCompile = (shader) => {
                    shader.uniforms.uStartPosition = { value: this.initialPosition };
                    shader.uniforms.uDirection = { value: this.forward };

                    shader.vertexShader = `
                        varying vec3 vWorldPosition;
                    ` + shader.vertexShader;

                    shader.vertexShader = shader.vertexShader.replace(
                        '#include <worldpos_vertex>',
                        `
                        #include <worldpos_vertex>
                        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                        `
                    );

                    shader.fragmentShader = `
                        uniform vec3 uStartPosition;
                        uniform vec3 uDirection;
                        varying vec3 vWorldPosition;
                    ` + shader.fragmentShader;

                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <dithering_fragment>',
                        `
                        #include <dithering_fragment>
                        vec3 diff = vWorldPosition - uStartPosition;
                        float axialDistance = dot(diff, uDirection);
                        
                        // Calculate radial distance from the beam axis
                        vec3 radialVec = diff - (axialDistance * uDirection);
                        float radialDistance = length(radialVec);

                        // We want inner part (small radius) to be visible faster (at shorter axial distance)
                        // than outer part.
                        // Metric = axialDistance - radialDistance
                        float alphaMetric = axialDistance - radialDistance;

                        // Fade from 0 to 1 over first meter
                        float alphaFade = smoothstep(0.0, 1.0, alphaMetric);
                        gl_FragColor.a *= alphaFade;
                        `
                    );
                };
            }
        });
    }

    public update(dt: number) {
        super.update(dt);
        this.time += dt;
        const progress = this.time / this.duration;
        const scale = this.range * Math.pow(progress, 2);
        this.mesh.scale.z = scale;
        const scaledForward = this.forward.clone().multiplyScalar(scale)
        this.mesh.position.set(
            this.initialPosition.x + scaledForward.x,
            this.initialPosition.y,
            this.initialPosition.z + scaledForward.z
        );
        if (this.material && progress >= 0.8) {
            this.material.opacity = 1.0 - (progress - 0.8) / 0.2;
        }
    }

    public addToScene(scene: THREE.Scene) {
        this.time = 0;
        this.update(0); // Initialize scale and opacity
        scene.add(this.mesh);
        if (this.material) {
            this.material.opacity = 1.0;
        }
    }

    public removeFromScene() {
        this.mesh.parent?.remove(this.mesh);
    }
}