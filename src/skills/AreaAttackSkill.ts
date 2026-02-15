import * as THREE from 'three';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { Skill } from './Skill';
import { BaseMesh } from '../BaseMesh';
import RAPIER, { Collider } from '@dimforge/rapier3d-compat';
import { RapierPhysics } from '../physics/RapierPhysics';

/**
 * Area Attack Skill
 */
export class AreaAttackSkill extends Skill {
    private readonly DAMAGE = 18;
    private readonly RANGE = 5;
    private effectTimer: number = 0;
    private readonly DURATION = 0.8;
    private areaAttackEffect: AreaAttackEffect | undefined;
    private isBeingExecuted: boolean = false;
    private sensorCollider: RAPIER.Collider | undefined;
    private hitEnemies: Set<Enemy> = new Set();

    constructor(onCompletedCallback: () => void) {
        super('Area Attack', 10, 30, onCompletedCallback);
    }

    protected execute(player: Player, scene: THREE.Scene): void {
        console.log('Executing Area Attack skill');
        // Reset per-use state and create visual effect. Hit detection is handled per-frame in update().
        this.hitEnemies.clear();

        // Create visual effect
        if (!this.areaAttackEffect) {
            this.areaAttackEffect = new AreaAttackEffect(this.DURATION, this.RANGE);
        }
        this.areaAttackEffect.setPosition(player.position as any);
        this.areaAttackEffect.addToScene(scene);
        this.isBeingExecuted = true;
    }

    update(dt: number): void {
        super.update(dt);

        if (!this.isBeingExecuted) {
            return;
        }

        this.effectTimer += dt;
        const progress = this.effectTimer / this.DURATION;

        if (progress >= 1) {
            this.cleanup();
        } else {
            this.areaAttackEffect?.update(dt);

            // Match sensor size to the visual scale used by AreaAttackEffect
            const visualProgress = (this.areaAttackEffect) ? (this.areaAttackEffect as any).time / this.areaAttackEffect.duration : progress;
            const scale = ((this.RANGE * visualProgress) * 2.0) % this.RANGE;

            if (scale > 0.001) {
                try {
                    const rapierWorld = RapierPhysics.Instance.world;
                    // Create a temporary sensor collider with radius equal to visual scale
                    const colliderDesc = RAPIER.ColliderDesc.ball(scale).setSensor(true);
                    const sensor = rapierWorld.createCollider(colliderDesc);

                    const playerPos = (this as any).player ? (this as any).player.body.translation() : { x: 0, y: 0, z: 0 };
                    const playerRot = (this as any).player ? (this as any).player.body.rotation() : { x: 0, y: 0, z: 0, w: 1 };

                    rapierWorld.intersectionsWithShape(playerPos, playerRot, sensor.shape, (collider: Collider) => {
                        if (collider === sensor) return true;
                        const entity = (collider as any).entity;
                        if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying && !this.hitEnemies.has(entity)) {
                            const position = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
                            entity.takeDamage(this.DAMAGE, position);
                            this.hitEnemies.add(entity);
                            console.log(`Area attack hit enemy for ${this.DAMAGE} damage`);
                        }
                        return true;
                    });

                    // Remove temporary sensor
                    try { RapierPhysics.Instance.removeCollider(sensor); } catch (e) { try { rapierWorld.removeCollider(sensor, true); } catch (_) { } }
                } catch (e) {
                    console.error('Error during area attack collision detection:', e);
                }
            }
        }
    }

    cleanup(): void {
        this.effectTimer = 0;
        this.areaAttackEffect?.removeFromScene();
        this.isBeingExecuted = false;
        // Ensure any lingering sensor is removed
        if (this.sensorCollider) {
            try { RapierPhysics.Instance.removeCollider(this.sensorCollider); } catch (e) { try { RapierPhysics.Instance.world.removeCollider(this.sensorCollider, true); } catch (_) { } }
            this.sensorCollider = undefined;
        }
        this.hitEnemies.clear();
        this.onCompletedCallback();
    }
}

class AreaAttackEffect extends BaseMesh {
    private time: number = 0;
    private duration: number;
    private range: number;
    private material: THREE.MeshStandardMaterial | null = null;

    constructor(duration: number, range: number) {
        super('models/area_fx.glb');
        this.duration = duration;
        this.range = range;
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                this.material = child.material as THREE.MeshStandardMaterial;
            }
        });
    }

    public update(dt: number) {
        super.update(dt);
        this.time += dt;
        const progress = this.time / this.duration;
        const scale = ((this.range * progress) * 2.0) % this.range;
        this.mesh.scale.copy(new THREE.Vector3(scale, scale, scale));
        if (this.material) {
            this.material.opacity = (1.0 - ((progress * 2.0 % 1.0) - 0.7) / 0.3);
        }
    }

    public setPosition(pos: THREE.Vector3) {
        this.mesh.position.set(pos.x, pos.y, pos.z);
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