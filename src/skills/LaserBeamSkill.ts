import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { Skill } from './Skill';
import { BaseMesh } from '../BaseMesh';
import { SkillTechType } from './SkillTechType';
import { Tier } from '../items/TierManager';
import { Breakable, isBreakable } from '../items/Breakable';
import { AudioManager } from '../AudioManager';

/**
 * Laser Beam Skill
 */
export class LaserBeamSkill extends Skill {
    private readonly BASE_DAMAGE = 20;
    private readonly RANGE = 10;
    private readonly BASE_RADIUS = 1;
    private effectTimer: number = 0;
    private readonly DURATION: number = 0.6;
    private laserAttackEffect: LaserAttackEffect | undefined;
    private laserAttackEffect2: LaserAttackEffect | undefined; // Leet: +25° beam
    private laserAttackEffect3: LaserAttackEffect | undefined; // Leet: -25° beam
    private isBeingExecuted: boolean = false;

    private world: CANNON.World | undefined;
    private player: Player | undefined;
    private startPos: CANNON.Vec3 | undefined;
    private forward: THREE.Vector3 | undefined;
    private forward2: THREE.Vector3 | undefined; // Leet extra beam direction
    private forward3: THREE.Vector3 | undefined; // Leet extra beam direction
    private hitEnemies: Set<Enemy> = new Set();
    private hitEnemies2: Set<Enemy> = new Set(); // Leet: +25° beam
    private hitEnemies3: Set<Enemy> = new Set(); // Leet: -25° beam
    private effectiveDamage: number = this.BASE_DAMAGE;
    private effectiveRadius: number = this.BASE_RADIUS;
    private isLeet: boolean = false;

    constructor(onCompletedCallback: () => void) {
        super('Laser Beam', 5, 25, onCompletedCallback, 'images/ui_icons/laser.png');
    }

    getEffectiveTpCost(player: Player): number {
        return Math.round(this.tpCost * this.getTpMultiplier(player.getSkillTier(SkillTechType.RANGED)));
    }

    private getTpMultiplier(tier: Tier): number {
        switch (tier) {
            case Tier.MAINTAINED: return 2;
            case Tier.OVERCLOCKED: return 3;
            case Tier.ZERODAY: return 5;
            case Tier.LEET: return 8;
            default: return 1;
        }
    }

    protected execute(player: Player, scene: THREE.Scene, world: CANNON.World): void {
        console.log('Executing Laser Beam skill');
        AudioManager.Instance.playLaserBeamSkill();

        const tier = player.getSkillTier(SkillTechType.RANGED);
        this.effectiveDamage = this.BASE_DAMAGE * this.getDamageMultiplier(tier);
        this.effectiveRadius = tier === Tier.OVERCLOCKED || tier === Tier.ZERODAY || tier === Tier.LEET
            ? this.BASE_RADIUS * 1.5
            : this.BASE_RADIUS;
        this.isLeet = tier === Tier.LEET;

        this.world = world;
        this.player = player;
        this.hitEnemies.clear();
        this.hitEnemies2.clear();
        this.hitEnemies3.clear();

        // Get player's forward direction
        this.forward = player.getForwardDirection();

        // Create laser beam starting position (in front of player)
        this.startPos = new CANNON.Vec3(
            player.body.position.x + this.forward.x * 0.5,
            player.body.position.y + 0.5,
            player.body.position.z + this.forward.z * 0.5
        );

        this.isBeingExecuted = true;
        this.effectTimer = 0;
        this.createVisual(player, scene, this.startPos, this.forward, tier);
    }

    private getDamageMultiplier(tier: Tier): number {
        switch (tier) {
            case Tier.MAINTAINED: return 3;
            case Tier.OVERCLOCKED: return 6;
            case Tier.ZERODAY: return 12;
            case Tier.LEET: return 20;
            default: return 1;
        }
    }

    private createVisual(player: Player, scene: THREE.Scene, startPos: CANNON.Vec3, forward: THREE.Vector3, tier: Tier): void {
        const startVec = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
        this.laserAttackEffect = new LaserAttackEffect(
            this.DURATION,
            this.RANGE,
            player.getRotationY(),
            startVec,
            forward);
        this.laserAttackEffect.addToScene(scene);

        // Leet tier: two extra beams at ±25° in the y-axis direction
        if (tier === Tier.LEET) {
            const angle = Math.PI * 25 / 180;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            this.forward2 = new THREE.Vector3(
                forward.x * cosA + forward.z * sinA,
                0,
                -forward.x * sinA + forward.z * cosA
            ).normalize();

            this.forward3 = new THREE.Vector3(
                forward.x * cosA - forward.z * sinA,
                0,
                forward.x * sinA + forward.z * cosA
            ).normalize();

            this.laserAttackEffect2 = new LaserAttackEffect(
                this.DURATION,
                this.RANGE,
                player.getRotationY() + angle,
                startVec,
                this.forward2);
            this.laserAttackEffect2.addToScene(scene);

            this.laserAttackEffect3 = new LaserAttackEffect(
                this.DURATION,
                this.RANGE,
                player.getRotationY() - angle,
                startVec,
                this.forward3);
            this.laserAttackEffect3.addToScene(scene);
        }
    }

    update(dt: number): void {
        super.update(dt);
        if (!this.isBeingExecuted || !this.world || !this.startPos || !this.forward || !this.player) {
            return;
        }

        this.effectTimer += dt;
        const progress = this.effectTimer / this.DURATION;

        // Calculate current beam length based on progress (matching visual effect), clamped to RANGE
        const currentLength = Math.min(this.RANGE * Math.pow(progress, 2), this.RANGE);

        // Check for hits on all active beams
        this.checkBeamHits(currentLength, this.startPos, this.forward, this.hitEnemies);
        if (this.isLeet && this.forward2 && this.forward3) {
            this.checkBeamHits(currentLength, this.startPos, this.forward2, this.hitEnemies2);
            this.checkBeamHits(currentLength, this.startPos, this.forward3, this.hitEnemies3);
        }

        if (progress >= 1) {
            this.cleanup();
        } else {
            this.laserAttackEffect?.update(dt);
            this.laserAttackEffect2?.update(dt);
            this.laserAttackEffect3?.update(dt);
        }
    }

    private checkBeamHits(currentLength: number, startPos: CANNON.Vec3, forward: THREE.Vector3, hitEnemies: Set<Enemy>): void {
        if (!this.world || !this.player) return;

        for (const body of this.world.bodies) {
            const entity = (body as any).entity;
            if (entity && entity instanceof Enemy && !entity.isDead && !entity.isDying) {
                if (hitEnemies.has(entity)) continue;

                for (let distance = 0; distance <= currentLength; distance += 1) {
                    const checkPos = new CANNON.Vec3(
                        startPos.x + forward.x * distance,
                        startPos.y,
                        startPos.z + forward.z * distance
                    );

                    const dx = body.position.x - checkPos.x;
                    const dy = body.position.y - checkPos.y;
                    const dz = body.position.z - checkPos.z;
                    const distanceToBeam = Math.sqrt(dx * dx + dz * dz);

                    if (distanceToBeam <= this.effectiveRadius && Math.abs(dy) <= 2) {
                        const isCriticalHit = Math.random() < this.player.getCriticalChance();
                        const damage = Math.floor(isCriticalHit ? this.effectiveDamage * this.player.getCriticalHitMultiplier() : this.effectiveDamage);
                        entity.takeDamage(damage, isCriticalHit, this.player.body.position);
                        hitEnemies.add(entity);
                        this.player.tryIncrementSkillTech(SkillTechType.RANGED);
                        console.log(`Laser beam hit enemy for ${damage} damage`);
                        break;
                    }
                }
            } else if (isBreakable(entity) && !entity.isDestroyed) {
                for (let distance = 0; distance <= currentLength; distance += 1) {
                    const checkPos = new CANNON.Vec3(
                        startPos.x + forward.x * distance,
                        startPos.y,
                        startPos.z + forward.z * distance
                    );
                    const dx = body.position.x - checkPos.x;
                    const dz = body.position.z - checkPos.z;
                    const distanceToBeam = Math.sqrt(dx * dx + dz * dz);
                    if (distanceToBeam <= this.effectiveRadius && this.player.onBreakableHit) {
                        this.player.onBreakableHit(entity as Breakable);
                        break;
                    }
                }
            }
        }
    }

    cleanup(): void {
        this.effectTimer = 0;
        this.laserAttackEffect?.removeFromScene();
        this.laserAttackEffect = undefined;
        this.laserAttackEffect2?.removeFromScene();
        this.laserAttackEffect2 = undefined;
        this.laserAttackEffect3?.removeFromScene();
        this.laserAttackEffect3 = undefined;
        this.isBeingExecuted = false;
        this.isLeet = false;

        this.world = undefined;
        this.player = undefined;
        this.startPos = undefined;
        this.forward = undefined;
        this.forward2 = undefined;
        this.forward3 = undefined;
        this.hitEnemies.clear();
        this.hitEnemies2.clear();
        this.hitEnemies3.clear();

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
