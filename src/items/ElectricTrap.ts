import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from '../Player';
import { Enemy } from '../enemies/Enemy';
import { createParticleShaderMaterial, updateParticleScaleFactor } from '../ParticleShaderUtils';

/** Configuration for placing an electric trap in a dungeon room. */
export interface ElectricTrapConfig {
    /** Centre X position in world space. */
    x: number;
    /** Centre Z position in world space. */
    z: number;
    /** Trap extent along the X axis (metres). */
    width: number;
    /** Trap extent along the Z axis (metres). */
    length: number;
    /** Damage dealt per activation tick. */
    damage: number;
    /**
     * Activation pattern as an array of millisecond durations.
     * Even indices (0, 2, 4…) are *active* durations, odd indices (1, 3, 5…)
     * are *pause* durations.  The pattern repeats when the end is reached.
     * An empty array means the trap is **always active**.
     */
    activationInterval: number[];
}

/** Bright electric‑yellow colour used for the active state. */
const ELECTRIC_COLOR = new THREE.Color(1.0, 0.95, 0.2);

/** Number of particles emitted while the trap is active. */
const PARTICLE_COUNT = 60;

/** How high particles travel before resetting (metres). */
const PARTICLE_MAX_Y = 0.8;

/** Base particle size. */
const PARTICLE_SIZE = 0.7;

/** Minimum time between consecutive damage ticks to the same target (seconds). */
const DAMAGE_COOLDOWN = 0.5;

/**
 * An electric trap placed on the ground.
 *
 * **Visual** – a flat plane with a custom shader (grey cables when inactive,
 * glowing yellow cables when active) plus additive point‑sprite particles
 * that float upward while the trap is active.
 *
 * **Activation** – follows a repeating pattern described by
 * {@link ElectricTrapConfig.activationInterval}.
 *
 * **Interaction** – damages the player (with defence reduction and knockback)
 * and enemies (with knockback; respects the {@link Enemy.trapImmune} flag).
 */
export class ElectricTrap {
    /** Ground‑plane mesh rendered with the cable shader. */
    mesh: THREE.Mesh;
    /** Particle system rendered while the trap is active. */
    particles: THREE.Points;

    /** World‑space centre of the trap. */
    readonly centerX: number;
    readonly centerZ: number;
    /** Trap half‑extents used for AABB overlap checks. */
    readonly halfWidth: number;
    readonly halfLength: number;
    /** Damage dealt per activation tick. */
    readonly damage: number;

    /** Whether the trap is currently electrified. */
    private active: boolean = true;
    /** Activation interval pattern (ms). Empty → always active. */
    private readonly pattern: number[];
    /** Index into the pattern array. */
    private patternIndex: number = 0;
    /** Elapsed time within the current pattern segment (ms). */
    private patternElapsed: number = 0;

    /** The cable shader material (needs u_active uniform updates). */
    private cableMaterial: THREE.ShaderMaterial;
    /** The particle shader material. */
    private particleMaterial: THREE.ShaderMaterial;

    /** Per‑particle state. */
    private particlePositions: Float32Array;
    private particleSizes: Float32Array;
    private particleLifetimes: Float32Array;

    /** Cooldown tracker: entity → seconds until next allowed damage tick. */
    private damageCooldowns: Map<object, number> = new Map();

    private scene: THREE.Scene;

    constructor(
        scene: THREE.Scene,
        config: ElectricTrapConfig,
    ) {
        this.scene = scene;
        this.centerX = config.x;
        this.centerZ = config.z;
        this.halfWidth = config.width / 2;
        this.halfLength = config.length / 2;
        this.damage = config.damage;
        this.pattern = config.activationInterval;

        // Determine initial state: index 0 is always an *active* period
        if (this.pattern.length > 0) {
            this.active = true;
        }

        // ----- Cable ground plane -----
        const geo = new THREE.PlaneGeometry(config.width, config.length);
        geo.rotateX(-Math.PI / 2);
        this.cableMaterial = this.createCableShaderMaterial(config.width, config.length);
        this.mesh = new THREE.Mesh(geo, this.cableMaterial);
        this.mesh.position.set(config.x, 0.01, config.z); // slightly above floor
        this.mesh.receiveShadow = false;
        this.mesh.castShadow = false;
        scene.add(this.mesh);

        // ----- Particle system -----
        this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
        this.particleSizes = new Float32Array(PARTICLE_COUNT);
        this.particleLifetimes = new Float32Array(PARTICLE_COUNT);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this.resetParticle(i, true);
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

        this.particleMaterial = createParticleShaderMaterial(ELECTRIC_COLOR);
        this.particles = new THREE.Points(particleGeo, this.particleMaterial);
        this.particles.visible = this.active;
        scene.add(this.particles);
    }

    // ------------------------------------------------------------------
    // Shader
    // ------------------------------------------------------------------

    private createCableShaderMaterial(_width: number, _length: number): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            uniforms: {
                u_active: { value: this.active ? 1.0 : 0.0 },
                u_time: { value: 0.0 },
            },
            vertexShader: /* glsl */ `
                varying vec3 vWorldPos;
                void main() {
                    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float u_active;
                uniform float u_time;
                varying vec3 vWorldPos;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }

                void main() {
                    // World-space XZ as UV — tiles at 1 m intervals
                    vec2 uv = vWorldPos.xz;

                    // Layered cable lines (horizontal + vertical), tiling per metre
                    float cable = 0.0;
                    for (float i = 0.0; i < 4.0; i++) {
                        float seed = i * 3.17;
                        float freq = 1.5 + hash(vec2(seed, 0.0)) * 1.5;
                        float offset = hash(vec2(0.0, seed)) * 6.28;
                        // Horizontal cable (wiggles along x, distance in z)
                        float zLine = sin(uv.x * freq + offset) * 0.3 + 0.5;
                        float dH = abs(fract(uv.y) - zLine);
                        cable += smoothstep(0.06, 0.02, dH);
                        // Vertical cable (wiggles along z, distance in x)
                        float xLine = sin(uv.y * freq + offset + 1.57) * 0.3 + 0.5;
                        float dV = abs(fract(uv.x) - xLine);
                        cable += smoothstep(0.06, 0.02, dV);
                    }
                    cable = clamp(cable, 0.0, 1.0);

                    // Inactive: light grey cables (#DDDDDD)
                    vec3 inactiveColor = vec3(0.18) * cable;
                    // Active: bright yellow glow with pulsing
                    float pulse = 0.85 + 0.15 * sin(u_time * 8.0);
                    vec3 activeColor = vec3(1.0, 0.95, 0.2) * cable * pulse;
                    // Subtle electric flicker noise when active
                    float flicker = 0.9 + 0.1 * noise(uv * 4.0 + u_time * 2.0);
                    activeColor *= flicker;

                    vec3 col = mix(inactiveColor, activeColor, u_active);
                    float alpha = cable * mix(0.7, 0.9, u_active);

                    gl_FragColor = vec4(col, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
    }

    // ------------------------------------------------------------------
    // Particles
    // ------------------------------------------------------------------

    private resetParticle(index: number, stagger: boolean = false): void {
        const i3 = index * 3;
        this.particlePositions[i3] = this.centerX + (Math.random() - 0.5) * this.halfWidth * 2;
        this.particlePositions[i3 + 1] = Math.random() * PARTICLE_MAX_Y * (stagger ? Math.random() : 0);
        this.particlePositions[i3 + 2] = this.centerZ + (Math.random() - 0.5) * this.halfLength * 2;
        this.particleSizes[index] = PARTICLE_SIZE * (0.5 + Math.random() * 0.5);
        this.particleLifetimes[index] = 0.6 + Math.random() * 0.8;
    }

    private updateParticles(dt: number): void {
        if (!this.active) {
            this.particles.visible = false;
            return;
        }
        this.particles.visible = true;
        const speed = 1.2;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this.particleLifetimes[i] -= dt;
            if (this.particleLifetimes[i] <= 0) {
                this.resetParticle(i);
                continue;
            }
            this.particlePositions[i * 3 + 1] += speed * dt;
            // Shrink as lifetime expires
            const lifeFrac = Math.max(0, this.particleLifetimes[i] / 1.4);
            this.particleSizes[i] = PARTICLE_SIZE * lifeFrac * (0.5 + Math.random() * 0.5);
        }
        (this.particles.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        (this.particles.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
    }

    // ------------------------------------------------------------------
    // Activation logic
    // ------------------------------------------------------------------

    private updateActivation(dt: number): void {
        if (this.pattern.length === 0) {
            // Always active
            this.active = true;
            return;
        }

        this.patternElapsed += dt * 1000; // convert seconds → ms
        const currentDuration = this.pattern[this.patternIndex];

        if (this.patternElapsed >= currentDuration) {
            this.patternElapsed -= currentDuration;
            this.patternIndex = (this.patternIndex + 1) % this.pattern.length;
            // Even indices (0, 2, 4…) are active periods
            this.active = this.patternIndex % 2 === 0;
        }

        this.cableMaterial.uniforms.u_active.value = this.active ? 1.0 : 0.0;
    }

    // ------------------------------------------------------------------
    // Collision / damage
    // ------------------------------------------------------------------

    /** Check whether a world‑space point (x, z) overlaps the trap's AABB. */
    overlaps(x: number, z: number): boolean {
        return (
            Math.abs(x - this.centerX) <= this.halfWidth &&
            Math.abs(z - this.centerZ) <= this.halfLength
        );
    }

    /**
     * Apply trap effects to the player if they are standing on the trap.
     * Defence reduction and knockback are handled by {@link Player.takeDamage}.
     */
    private checkPlayer(player: Player, _dt: number): void {
        if (!this.active) return;
        if (player.isDead) return;

        const px = player.body.position.x;
        const pz = player.body.position.z;
        if (!this.overlaps(px, pz)) return;

        // Check cooldown
        const remaining = this.damageCooldowns.get(player) ?? 0;
        if (remaining > 0) return;

        // Apply damage with knockback from trap centre
        const sourcePos = new CANNON.Vec3(this.centerX, 0, this.centerZ);
        player.takeDamage(this.damage, sourcePos);

        this.damageCooldowns.set(player, DAMAGE_COOLDOWN);
    }

    /**
     * Apply trap effects to enemies standing on the trap.
     * Respects {@link Enemy.trapImmune}.
     */
    private checkEnemies(enemies: Enemy[], _dt: number): void {
        if (!this.active) return;

        for (const enemy of enemies) {
            if (enemy.isDead || enemy.isDying) continue;
            if (enemy.trapImmune) continue;

            const ex = enemy.body.position.x;
            const ez = enemy.body.position.z;
            if (!this.overlaps(ex, ez)) continue;

            const remaining = this.damageCooldowns.get(enemy) ?? 0;
            if (remaining > 0) continue;

            const sourcePos = new CANNON.Vec3(this.centerX, 0, this.centerZ);
            enemy.takeDamage(this.damage, false, sourcePos);

            this.damageCooldowns.set(enemy, DAMAGE_COOLDOWN);
        }
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /** Per‑frame update.  Call from the stage's update loop. */
    update(dt: number, player: Player, enemies: Enemy[]): void {
        // Tick cooldowns
        for (const [key, remaining] of this.damageCooldowns) {
            const next = remaining - dt;
            if (next <= 0) {
                this.damageCooldowns.delete(key);
            } else {
                this.damageCooldowns.set(key, next);
            }
        }

        this.updateActivation(dt);
        this.cableMaterial.uniforms.u_time.value += dt;
        this.updateParticles(dt);

        this.checkPlayer(player, dt);
        this.checkEnemies(enemies, dt);
    }

    /** Update the particle scale factor when the window is resized. */
    updateScaleFactor(): void {
        updateParticleScaleFactor(this.particleMaterial);
    }

    /** Whether the trap is currently electrified. */
    get isActive(): boolean {
        return this.active;
    }

    /** Clean up all GPU resources and remove objects from the scene. */
    cleanup(): void {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.cableMaterial.dispose();

        this.scene.remove(this.particles);
        this.particles.geometry.dispose();
        this.particleMaterial.dispose();
    }
}
