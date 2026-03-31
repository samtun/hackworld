import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { Lobby } from './Lobby';
import { WeaponDrop } from '../items/weapons/WeaponDrop';
import { WeaponType } from '../items/weapons/WeaponType';
import { PotionDrop } from '../items/potions/PotionDrop';
import { PotionType } from '../items/potions/PotionDefinitions';
import { ItemDropManager } from '../items/ItemDropManager';
import { Player } from '../Player';

/** Spawn config for a test potion that auto-respawns after collection. */
interface PotionSpawnConfig {
    position: CANNON.Vec3;
    potionType: PotionType;
    level: number;
}

/** Respawn delay in seconds for collected test potions. */
const POTION_RESPAWN_DELAY = 3;

export class GameTest extends BaseStage {
    private static id: string = "gameTest";
    private static name: string = "Game Test";
    private static description: string = "A test stage for game mechanics";

    id = GameTest.id;
    name = GameTest.name;
    description = GameTest.description;
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    private testDrops: WeaponDrop[] = [];
    private potionSpawns: PotionSpawnConfig[] = [];
    private activePotions: Map<PotionDrop, PotionSpawnConfig> = new Map();
    private respawnTimers: { config: PotionSpawnConfig; timer: number }[] = [];

    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        return {
            id: GameTest.id,
            name: GameTest.name,
            description: GameTest.description,
            requiredProgress: -1,
        };
    }

    /**
     * Get assets required by this dungeon
     */
    getRequiredAssets(): string[] {
        return [];
    }

    clear(): void {
        for (const drop of this.testDrops) {
            drop.cleanup(this.scene);
        }
        this.testDrops = [];
        this.potionSpawns = [];
        this.activePotions.clear();
        this.respawnTimers = [];
        super.clear();
    }

    async load(): Promise<void> {
        this.clear();
        await this.loadEnvironmentMap();
        this.createFloorCollider();

        // Teleporter back to Lobby
        this.createTeleporter(new CANNON.Vec3(0, 0, -8), Lobby.getMetadata().id);

        const geo = new THREE.PlaneGeometry(50, 50);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.FrontSide });
        const floorPlane = new THREE.Mesh(geo, mat);
        this.scene.add(floorPlane);
        this.meshes.push(floorPlane);

        // Obstacles
        let yPos = -0.45;
        for (let i = 0; i < 10; i++) {
            this.createBox(2, 1.0, 2, new CANNON.Vec3(4 + i * 2, yPos, 0));
            yPos += i * 0.05;
        }

        let xDepth = 1;
        let accXDepth = xDepth;
        for (let i = 0; i < 10; i++) {
            this.createBox(xDepth, 1, 3, new CANNON.Vec3(-4 - accXDepth, i, 0));
            accXDepth += xDepth;
            xDepth += i * 0.2;
        }

        for (let i = 0; i <= 24; i++) {
            this.createBox(6, 0.5, 2, new CANNON.Vec3(0, 0.5, 4 + i * 2), new CANNON.Quaternion().setFromEuler(0, 0, -Math.PI / 2 + i * 0.2));
        }

        // Test weapon drops (unusable, just for visual testing)
        // Broken
        this.testDrops.push(new WeaponDrop(
            "aegis_sword_alpha",
            this.scene,
            new CANNON.Vec3(10, 0.5, 10),
            WeaponType.SWORD,
            "Aegis Sword Alpha",
            8,
            100,
            50,
            3,
            0.8
        ));

        // Stable
        this.testDrops.push(new WeaponDrop(
            "aegis_sword_alpha",
            this.scene,
            new CANNON.Vec3(11, 0.5, 10),
            WeaponType.SWORD,
            "Aegis Sword Alpha",
            10,
            100,
            50,
            3,
            1
        ));

        // Maintained
        this.testDrops.push(new WeaponDrop(
            "aegis_sword_alpha",
            this.scene,
            new CANNON.Vec3(12, 0.5, 10),
            WeaponType.SWORD,
            "Aegis Sword Alpha",
            10.5,
            100,
            50,
            3,
            1.05
        ));

        // Overclocked
        this.testDrops.push(new WeaponDrop(
            "aegis_sword_alpha",
            this.scene,
            new CANNON.Vec3(13, 0.5, 10),
            WeaponType.SWORD,
            "Aegis Sword Alpha",
            12,
            100,
            50,
            1,
            1.1
        ));

        // ZeroDay
        this.testDrops.push(new WeaponDrop(
            "aegis_sword_alpha",
            this.scene,
            new CANNON.Vec3(14, 0.5, 10),
            WeaponType.SWORD,
            "Aegis Sword Alpha",
            12,
            100,
            50,
            1,
            1.15
        ));

        // Leet
        this.testDrops.push(new WeaponDrop(
            "aegis_sword_alpha",
            this.scene,
            new CANNON.Vec3(15, 0.5, 10),
            WeaponType.SWORD,
            "Aegis Sword Alpha",
            12,
            100,
            50,
            1,
            1.2
        ));

        // HP potion test drops (levels 1–6, 2m apart along X at z = -4)
        for (let level = 1; level <= 6; level++) {
            this.potionSpawns.push({
                position: new CANNON.Vec3(2 + (level - 1) * 2, 0.5, -4),
                potionType: PotionType.HP,
                level,
            });
        }

        // TP potion test drops (levels 1–6, 2m apart along X at z = -6)
        for (let level = 1; level <= 6; level++) {
            this.potionSpawns.push({
                position: new CANNON.Vec3(2 + (level - 1) * 2, 0.5, -6),
                potionType: PotionType.TP,
                level,
            });
        }

        // Spawn all test potions and register them with the drop manager
        for (const config of this.potionSpawns) {
            this.spawnTestPotion(config);
        }
    }

    /**
     * Called each frame by World. Ticks respawn timers for collected potions
     * and re-spawns them after the delay.
     */
    update(dt: number, player: Player, anyMenuOpen: boolean, cameraPosition?: THREE.Vector3): void {
        super.update(dt, player, anyMenuOpen, cameraPosition);

        // Check for collected potions and start their respawn timers
        for (const [drop, config] of this.activePotions) {
            if (!drop.mesh.parent) {
                // Drop was picked up and removed from scene → start respawn
                this.activePotions.delete(drop);
                this.respawnTimers.push({ config, timer: POTION_RESPAWN_DELAY });
            }
        }

        // Tick respawn timers
        for (let i = this.respawnTimers.length - 1; i >= 0; i--) {
            this.respawnTimers[i].timer -= dt;
            if (this.respawnTimers[i].timer <= 0) {
                this.spawnTestPotion(this.respawnTimers[i].config);
                this.respawnTimers.splice(i, 1);
            }
        }
    }

    private spawnTestPotion(config: PotionSpawnConfig): void {
        const drop = new PotionDrop(this.scene, config.position, config.potionType, config.level);
        ItemDropManager.Instance.addDrop(drop);
        this.activePotions.set(drop, config);
    }
}
