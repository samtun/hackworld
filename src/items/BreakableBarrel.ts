import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Breakable } from './Breakable';
import { Player } from '../Player';
import { ItemDrop } from './ItemDrop';
import { WeaponDrop } from './weapons/WeaponDrop';
import { WeaponRepository } from './weapons/WeaponRepository';
import { WeaponType } from './weapons/WeaponType';
import { ChipDrop } from './chips/ChipDrop';
import { ChipRepository } from './chips/ChipRepository';
import { CoreDrop } from './cores/CoreDrop';
import { CoreRepository } from './cores/CoreRepository';
import { MoneyDrop } from './bits/MoneyDrop';
import { ItemLevelHelper } from './ItemLevelHelper';
import { Tier, TierManager } from './TierManager';
import { WeaponItem } from './weapons/WeaponItem';

/** Configuration for a single breakable barrel placement. */
export interface BreakableBarrelConfig {
    x: number;
    y: number;
    z: number;
    /** Maximum weapon tier that can drop from this barrel (default: Overclocked). */
    maxTier?: Tier;
}

/**
 * A barrel that can be destroyed by a single hit from any weapon or skill.
 * Once destroyed it spawns loot (weapons, chips, cores, or bits) on the floor,
 * similar to enemy drops. Does NOT grant tech points.
 */
/** A single fragment spawned when the barrel is destroyed. */
interface BarrelFragment {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
}

export class BreakableBarrel implements Breakable {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    isDestroyed: boolean = false;

    private scene: THREE.Scene;
    private world: CANNON.World;
    private maxTier: Tier;

    /** Radius of the barrel at the top and bottom. */
    private static readonly RADIUS = 0.3;
    /** Radius of the barrel at the middle (bulge). */
    private static readonly MID_RADIUS = 0.4;
    /** Height of the barrel cylinder. */
    private static readonly HEIGHT = 1;
    /** Height of the physics collider (tall to prevent jumping on). */
    private static readonly COLLIDER_HEIGHT = 2;
    /** Number of radial segments. */
    private static readonly RADIAL_SEGMENTS = 8;
    /** Number of height segments (must be even so there is a middle ring). */
    private static readonly HEIGHT_SEGMENTS = 4;

    /** Number of fragments spawned on destruction. */
    private static readonly FRAGMENT_COUNT = 8;
    /** Time (seconds) after destruction when fragments start fading. */
    private static readonly FADE_START = 0.8;
    /** Time (seconds) after destruction when fragments are fully transparent. */
    private static readonly FADE_END = 1.1;
    /** Gravity applied to fragments (m/s²). */
    private static readonly FRAGMENT_GRAVITY = 9.8;

    /** Active destruction fragments (empty until the barrel is hit). */
    private fragments: BarrelFragment[] = [];
    /** Shared geometry for all fragments. */
    private fragmentGeometry: THREE.BoxGeometry | null = null;
    /** Elapsed time since the barrel was destroyed. */
    private destroyTimer: number = 0;
    /** Whether the destruction animation has finished and resources are disposed. */
    private animationDone: boolean = false;

    constructor(
        scene: THREE.Scene,
        world: CANNON.World,
        physicsMaterial: CANNON.Material,
        position: CANNON.Vec3,
        maxTier: Tier = Tier.OVERCLOCKED,
    ) {
        this.scene = scene;
        this.world = world;
        this.maxTier = maxTier;

        // Visual: barrel shape with a bulge in the middle
        const geo = new THREE.CylinderGeometry(
            BreakableBarrel.RADIUS,
            BreakableBarrel.RADIUS,
            BreakableBarrel.HEIGHT,
            BreakableBarrel.RADIAL_SEGMENTS,
            BreakableBarrel.HEIGHT_SEGMENTS,
        );
        // Expand the middle ring(s) outward to create a barrel bulge
        const posAttr = geo.attributes.position;
        const halfH = BreakableBarrel.HEIGHT / 2;
        for (let i = 0; i < posAttr.count; i++) {
            const y = posAttr.getY(i);
            // t=0 at top/bottom, t=1 at centre
            const t = 1 - Math.abs(y) / halfH;
            const bulge = 1 + (BreakableBarrel.MID_RADIUS / BreakableBarrel.RADIUS - 1) * t;
            posAttr.setX(i, posAttr.getX(i) * bulge);
            posAttr.setZ(i, posAttr.getZ(i) * bulge);
        }
        posAttr.needsUpdate = true;
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(position.x, position.y + BreakableBarrel.HEIGHT / 2, position.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);

        // Physics body for collision detection and blocking movement.
        // Body is STATIC (mass 0) so it never moves or falls through the ground.
        // Weapon hits are detected via manual distance checks in Player.update()
        // because cannon-es broadphase skips static-static pairs (weapon trigger
        // is also static).
        const physShape = new CANNON.Cylinder(
            BreakableBarrel.MID_RADIUS,
            BreakableBarrel.MID_RADIUS,
            BreakableBarrel.COLLIDER_HEIGHT,
            BreakableBarrel.RADIAL_SEGMENTS,
        );
        this.body = new CANNON.Body({
            mass: 0,
            material: physicsMaterial,
        });
        this.body.addShape(physShape);
        this.body.position.set(position.x, position.y + BreakableBarrel.COLLIDER_HEIGHT / 2, position.z);
        (this.body as any).entity = this;
        world.addBody(this.body);
    }

    /** Called when the barrel receives a hit. Destroys the barrel and spawns loot. */
    onHit(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        // Remove original mesh and physics body immediately
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.world.removeBody(this.body);

        // Spawn fragment meshes that fall apart
        this.spawnFragments();
        this.destroyTimer = 0;
    }

    /**
     * Update the destruction animation. Must be called each frame after onHit.
     * Moves fragments under gravity, applies tumble rotation, and fades them
     * out between FADE_START and FADE_END seconds. Disposes resources once done.
     */
    update(dt: number): void {
        if (!this.isDestroyed || this.animationDone || this.fragments.length === 0) return;

        this.destroyTimer += dt;

        // Compute opacity: 1 before FADE_START, ramp to 0 at FADE_END
        let opacity = 1;
        if (this.destroyTimer >= BreakableBarrel.FADE_END) {
            opacity = 0;
        } else if (this.destroyTimer >= BreakableBarrel.FADE_START) {
            opacity = 1 - (this.destroyTimer - BreakableBarrel.FADE_START) /
                (BreakableBarrel.FADE_END - BreakableBarrel.FADE_START);
        }

        for (const frag of this.fragments) {
            // Apply gravity
            frag.velocity.y -= BreakableBarrel.FRAGMENT_GRAVITY * dt;

            // Move
            frag.mesh.position.x += frag.velocity.x * dt;
            frag.mesh.position.y += frag.velocity.y * dt;
            frag.mesh.position.z += frag.velocity.z * dt;

            // Tumble
            frag.mesh.rotation.x += frag.angularVelocity.x * dt;
            frag.mesh.rotation.y += frag.angularVelocity.y * dt;
            frag.mesh.rotation.z += frag.angularVelocity.z * dt;

            // Fade
            (frag.mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
        }

        // Once fully transparent, dispose all fragment resources
        if (opacity <= 0) {
            this.disposeFragments();
        }
    }

    /** Create fragment meshes radiating outward from the barrel centre. */
    private spawnFragments(): void {
        const cx = this.mesh.position.x;
        const cy = this.mesh.position.y;
        const cz = this.mesh.position.z;
        const halfH = BreakableBarrel.HEIGHT / 2;

        const sharedGeo = new THREE.BoxGeometry(0.12, 0.25, 0.08);
        this.fragmentGeometry = sharedGeo;

        for (let i = 0; i < BreakableBarrel.FRAGMENT_COUNT; i++) {
            const angle = (i / BreakableBarrel.FRAGMENT_COUNT) * Math.PI * 2;
            const r = BreakableBarrel.MID_RADIUS * 0.6;

            const mat = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                transparent: true,
                opacity: 1.0,
            });

            const fMesh = new THREE.Mesh(sharedGeo, mat);
            // Position fragments in a ring around the barrel centre, random height
            fMesh.position.set(
                cx + Math.cos(angle) * r,
                cy + (Math.random() - 0.5) * halfH,
                cz + Math.sin(angle) * r,
            );
            // Random initial rotation
            fMesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
            );
            fMesh.castShadow = true;
            this.scene.add(fMesh);

            // Outward + upward velocity
            const speed = 1.5 + Math.random() * 1.5;
            const vy = 2 + Math.random() * 2;
            const velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                vy,
                Math.sin(angle) * speed,
            );

            const angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
            );

            this.fragments.push({ mesh: fMesh, velocity, angularVelocity });
        }
    }

    /** Remove all fragment meshes from the scene and dispose their materials. */
    private disposeFragments(): void {
        for (const frag of this.fragments) {
            this.scene.remove(frag.mesh);
            (frag.mesh.material as THREE.Material).dispose();
        }
        if (this.fragmentGeometry) {
            this.fragmentGeometry.dispose();
            this.fragmentGeometry = null;
        }
        this.fragments = [];
        this.animationDone = true;
    }

    /**
     * Generate a single loot drop from this barrel at its position.
     * Uses the same level/tier logic as enemy drops, minus XData and BoosterPacks.
     * @returns The created ItemDrop, or null if nothing drops.
     */
    generateDrop(scene: THREE.Scene, player: Player): ItemDrop | null {
        const dropPosition = new CANNON.Vec3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z,
        );

        // Determine item to drop, or drop nothing
        const roll = Math.random() - player.luckDropChanceBonus;
        if (roll < 0.08) {
            return this.generateWeaponDrop(scene, player, dropPosition);
        } else if (roll < 0.16) {
            return this.generateChipDrop(scene, player, dropPosition);
        } else if (roll < 0.24) {
            return this.generateCoreDrop(scene, player, dropPosition);
        } else if (roll < 0.40){
            return this.generateMoneyDrop(scene, player, dropPosition);
        } else {
            return null;
        }
    }

    private generateWeaponDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop | null {
        const allTypes = [WeaponType.SWORD, WeaponType.DUAL_BLADE, WeaponType.LANCE, WeaponType.HAMMER];
        const weaponType = allTypes[Math.floor(Math.random() * allTypes.length)];
        const weaponLevel = this.determineWeaponLevel(player.getTechForWeapon(weaponType));
        const weaponItem = WeaponRepository.Instance.getWeaponByTypeAndLevel(weaponType, weaponLevel);
        if (!weaponItem) return null;

        // Generate a bonus multiplier capped to the maxTier
        const bonusMultiplier = this.generateCappedBonusMultiplier();
        const finalDamage = Math.floor(weaponItem.damage * bonusMultiplier);
        const damageFactor = finalDamage / weaponItem.damage;
        const finalBuyPrice = Math.floor(weaponItem.buyPrice * damageFactor);
        const finalSellPrice = Math.floor(weaponItem.sellPrice * damageFactor);

        return new WeaponDrop(
            weaponItem.id, scene, pos, weaponType, weaponItem.name,
            finalDamage, finalBuyPrice, finalSellPrice, weaponLevel, damageFactor,
        );
    }

    private generateChipDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const chipItem = ChipRepository.Instance.getRandomChipOfLevel(level);
        if (!chipItem) return null;
        return new ChipDrop(scene, pos, chipItem.id, chipItem.name, chipItem.chipType, chipItem.buyPrice, chipItem.sellPrice, level);
    }

    private generateCoreDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop | null {
        const level = ItemLevelHelper.determineDropLevel(player.level);
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return null;
        return new CoreDrop(scene, pos, coreItem.id, coreItem.name, coreItem.buyPrice, coreItem.sellPrice, level);
    }

    private generateMoneyDrop(scene: THREE.Scene, player: Player, pos: CANNON.Vec3): ItemDrop {
        const levelBonus = Math.pow(Math.log10(player.level), 2) / 400;
        const chances = [
            { amount: 500, baseChance: 0.01 },
            { amount: 200, baseChance: 0.05 },
            { amount: 100, baseChance: 0.10 },
        ];
        const random = Math.random();
        let cumulative = 0;
        for (const { amount, baseChance } of chances) {
            cumulative += Math.min(1.0, baseChance + levelBonus);
            if (random < cumulative) return new MoneyDrop(scene, pos, amount);
        }
        return new MoneyDrop(scene, pos, 10);
    }

    /**
     * Determine weapon level based on player tech (same logic as WeaponDropStrategy).
     */
    private determineWeaponLevel(playerTech: number): number {
        let baseLevel = 1;
        for (let i = 0; i < WeaponItem.WEAPON_LEVELS.length; i++) {
            if (playerTech >= WeaponItem.WEAPON_LEVELS[i].requiredTech) {
                baseLevel = i + 1;
            } else {
                break;
            }
        }
        return baseLevel;
    }

    /**
     * Generate a weapon bonus multiplier capped so it does not exceed the maxTier.
     */
    private generateCappedBonusMultiplier(): number {
        const tierManager = TierManager.Instance;
        const maxTierDef = tierManager.tiers.get(this.maxTier);
        // Default to OVERCLOCKED max percentage (+12%)
        const maxPercent = maxTierDef ? maxTierDef.maxPercent : 12;
        // Cap the multiplier so the bonus stays below the maxTier boundary
        const cappedMax = isFinite(maxPercent) ? maxPercent : 12;

        // Random bonus: -5% to cappedMax%
        const bonusPercent = -5 + Math.random() * (cappedMax + 5);
        return 1 + bonusPercent / 100;
    }

    /** Clean up resources when the stage is cleared. */
    cleanup(): void {
        if (!this.isDestroyed) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            (this.mesh.material as THREE.Material).dispose();
            this.world.removeBody(this.body);
        }
        // Always clean up any in-flight fragments
        this.disposeFragments();
    }
}
