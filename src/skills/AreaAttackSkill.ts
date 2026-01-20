import * as THREE from 'three';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { Skill } from './Skill';
import { BaseMesh } from '../BaseMesh';

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

    constructor(onCompletedCallback: () => void) {
        super('Area Attack', 10, 30, onCompletedCallback);
    }

    protected execute(player: Player, scene: THREE.Scene, world: any): void {
        console.log('Executing Area Attack skill');

        // Find all enemies within range
        const hitEnemies = new Set<Enemy>();

        for (const body of world.bodies) {
            const entity = (body as any).entity;
            if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                const playerPos = player.body.translation();
                const dx = body.position.x - playerPos.x;
                const dz = body.position.z - playerPos.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance <= this.RANGE) {
                    const position = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
                    entity.takeDamage(this.DAMAGE, position);
                    hitEnemies.add(entity);
                    console.log(`Area attack hit enemy for ${this.DAMAGE} damage`);
                }
            }
        }

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
        }
    }

    cleanup(): void {
        this.effectTimer = 0;
        this.areaAttackEffect?.removeFromScene();
        this.isBeingExecuted = false;
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