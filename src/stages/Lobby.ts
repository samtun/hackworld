import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage } from './BaseStage';
import { HealingStation } from '../HealingStation';
import { Player } from '../Player';
import { ChipTrader } from '../items/chips/ChipTrader';
import { SaveManager } from '../SaveManager';
import { XDataUpgradeManager } from '../items/xdata/XDataUpgradeManager';
import { WeaponTrader } from '../items/weapons/WeaponTrader';
import { Npc } from '../npcs/Npc';
import { MainframeNpc } from '../npcs/MainframeNpc';
import { CoreTrader } from '../items/cores/CoreTrader';
import { CardManager } from '../items/cards/CardManager';
import { ShaderUtils } from '../ShaderUtils';
import { GameProgressManager } from '../GameProgressManager';

export class Lobby extends BaseStage {
    id = 'lobby';
    name = 'Lobby';
    description = 'Safe hub area';
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    static getMetadata(): { id: string; name: string; description: string; stageIndex: number } {
        return {
            id: 'lobby',
            name: 'Lobby',
            description: 'Safe hub area',
            stageIndex: 0,
        };
    }
    /**
     * Get assets required by lobby
     */
    getRequiredAssets(): string[] {
        return [
            // Keep empty - add lobby assets to the common assets in the World to make sure the lobby is always ready at game start
        ];
    }

    // NPCs
    mainframeNpc?: Npc;
    nylethNpc?: Npc;
    xDataManagerNpc?: Npc;
    saveManagerNpc?: Npc;
    weaponTraderNpc?: Npc;
    chipTraderNpc?: Npc;
    coreTraderNpc?: Npc;
    irkelNpc?: Npc;

    // Managers
    private weaponTraderManager?: WeaponTrader;
    private chipTrader?: ChipTrader;
    private coreTrader?: CoreTrader;
    private saveManager?: SaveManager;
    private xDataUpgradeManager?: XDataUpgradeManager;
    private cardManager?: CardManager;

    private bannerTexture?: THREE.Texture | null = null;

    // Healing Station
    healingStation?: HealingStation;
    private healingStationPosition: CANNON.Vec3 = new CANNON.Vec3(-5, 0.05, 5);

    // Callback for XData Terminal interaction (set by Game)
    xDataInteractionCallback?: () => void;

    // Callback for Save Manager interaction (set by Game)
    saveManagerInteractionCallback?: () => void;

    async load(): Promise<void> {
        this.clear();
        console.log("Loading Lobby...");
        await this.loadEnvironmentMap();

        // Update Mainframe dialogue on each load (in case progress changed)
        this.updateMainframeDialogue();

        const lobbyGltf = this.assetManager.get('models/lobby.glb');
        if (lobbyGltf) {
            const lobbyScene = lobbyGltf.scene.clone();
            lobbyScene.position.set(0, 0, 0);
            this.scene.add(lobbyScene);
            this.meshes.push(lobbyScene);
            lobbyScene.traverse((node) => {
                if (!(node instanceof THREE.Mesh)) {
                    return;
                }

                if (node.name === "Banner") {
                    const material = node.material as THREE.MeshStandardMaterial;

                    // Get texture for banner mesh to animate it later
                    if (material.map) {
                        this.bannerTexture = material.map;
                    }
                } else if (node.material.name === "StageWalls") {
                    const material = node.material as THREE.MeshStandardMaterial;

                    // Fade out to alpha=0 at -18.0 to -5.0 in Y axis direction
                    ShaderUtils.applyVerticalFade(material, -18.0, -5.0);
                }
            });
        }

        const lobbyColliderModel = this.assetManager.get('models/lobby_collider.glb');
        if (lobbyColliderModel) {
            const lobbyColliderScene = lobbyColliderModel.scene.clone();
            this.createLobbyColliders(lobbyColliderScene);
        }

        // Teleporter
        this.createTeleporter(new CANNON.Vec3(5, 0, 5), 'selection');

        // Healing Station
        this.healingStation = new HealingStation(this.scene, this.healingStationPosition);

        // Create Mainframe NPC - Main quest giver
        this.createMainframeNpc();

        this.createNylethNpc();

        this.createXDataManagerNpc();

        this.createSaveManagerNpc();

        this.createChipTraderNpc();

        this.createCoreTraderNpc();

        this.createWeaponTraderNpc();

        this.createIrkelNpc();
    }

    /**
     * Create the Mainframe NPC with progressive dialogue based on game progress
     */
    private createMainframeNpc(): void {
        this.mainframeNpc = new MainframeNpc(this.scene, this.physicsWorld, this.physicsMaterial, new CANNON.Vec3(0, 0, -14));
        this.npcs.add(this.mainframeNpc);
    }

    private createNylethNpc(): void {
        const nylethDialogue = [
            "Hey there, never seen you around. You look like you pack some punches. Interested in joining our fight?",
            "There are hordes of corrupted files running around our servers and we could really need some help with that.",
            "If you are interested, the teleporter to the south can take you to our main server."
        ];

        this.nylethNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/npc_placeholder.glb",
            "Nyleth",
            "Talk",
            new CANNON.Vec3(-5, 0, 0),
            nylethDialogue
        );
        this.npcs.add(this.nylethNpc);
    }

    private createXDataManagerNpc(): void {
        const xDataManagerDialogue = [
            "Welcome to the upgrade terminal.",
            "Here you can unlock your full potential by using X-Data you collect from enemies.",
            "Step closer if you'd like to upgrade your stats!"
        ];

        this.xDataUpgradeManager = XDataUpgradeManager.Instance;
        this.xDataManagerNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/xdata_terminal.glb",
            "XData Terminal",
            "Upgrade with X-Data",
            new CANNON.Vec3(5, 0, -5),
            xDataManagerDialogue,
            () => this.xDataUpgradeManager?.show()
        );
        this.npcs.add(this.xDataManagerNpc);
    }

    private createSaveManagerNpc(): void {
        const saveManagerDialogue = [
            "Hello! I'm the Save Manager.",
            "I can help you save your current game progress to a file, or load a previously saved game.",
            "This includes your stats, inventory, playtime, and trader inventories.",
            "Come closer when you're ready to save or load!"
        ];

        this.saveManager = SaveManager.Instance;
        this.saveManagerNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            'models/npc_placeholder.glb',
            "Grant",
            "Save Game",
            new CANNON.Vec3(0, 0, 5),
            saveManagerDialogue,
            () => this.saveManager?.show(),
        );
        this.npcs.add(this.saveManagerNpc);
    }

    private createChipTraderNpc(): void {
        const chipTraderDialogue = [
            "Hi, I'm Kelly.",
            "Are you looking for some upgrades?",
            "I've got all the chips you need."
        ];

        this.chipTrader = ChipTrader.Instance;
        this.chipTraderNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/npc_placeholder.glb",
            "Kelly",
            "Trade Chips",
            new CANNON.Vec3(-5, 0, -5),
            chipTraderDialogue,
            () => this.chipTrader?.show()
        );
        this.npcs.add(this.chipTraderNpc);
    }

    private createCoreTraderNpc(): void {
        const coreTraderDialogue = [
            "Hey you. You look like you could use some upgrades for your systems.",
            "I've got just what you need."
        ];

        this.coreTrader = CoreTrader.Instance;
        this.coreTraderNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/npc_placeholder.glb",
            "Hank",
            "Trade Cores",
            new CANNON.Vec3(5, 0, 0),
            coreTraderDialogue,
            () => this.coreTrader?.show()
        );
        this.npcs.add(this.coreTraderNpc);
    }

    private createWeaponTraderNpc(): void {
        const weaponTraderDialogue = [
            "Looking for some new gear?",
            "Trying to inflict some serious damage?",
            "Have a look at my fine collection of weapons."
        ];

        this.weaponTraderManager = WeaponTrader.Instance;
        this.weaponTraderNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/trader_weapons.glb",
            "Orim",
            "Trade Weapons",
            new CANNON.Vec3(0, 0, -5),
            weaponTraderDialogue,
            () => this.weaponTraderManager?.show()
        );
        this.npcs.add(this.weaponTraderNpc);
    }

    private createIrkelNpc(): void {
        const irkelDialogue = [
            "Hey there, collector! I'm Irkel.",
            "I've got booster packs and can help you manage your card collection.",
            "Each pack contains 5 random cards from various albums.",
            "Come see me when you find some packs!"
        ];

        this.cardManager = CardManager.Instance;
        this.irkelNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/npc_placeholder.glb",
            "Irkel",
            "Card Collection",
            new CANNON.Vec3(7, 0, 0),
            irkelDialogue,
            () => this.cardManager?.show()
        );

        this.npcs.add(this.irkelNpc);
    }

    /**
     * Update Mainframe dialogue based on current progress
     */
    private updateMainframeDialogue(): void {
        if (this.mainframeNpc) {
            const progressManager = GameProgressManager.Instance;
            // mainframeNpc is a MainframeNpc instance and exposes updateDialogue
            (this.mainframeNpc as any).updateDialogue(progressManager.progress);
        }
    }



    /*
     * Override BaseStage update method to include healing station
     */
    update(dt: number, player: Player) {
        super.update(dt, player);

        // Animate banner texture
        if (this.bannerTexture) {
            const speed = 0.04;
            const time = performance.now() * 0.001;
            this.bannerTexture.offset.x = (time * speed) % 1;
        }

        if (!this.healingStation) return;
        this.healingStation.update(dt);
    }

    private createLobbyColliders(modelScene: THREE.Group | THREE.Object3D): void {
        modelScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                this.createColliderFromMesh(child);
            }
        });
    }

    private createColliderFromMesh(mesh: THREE.Mesh): void {
        const geometry = mesh.geometry;

        // 1. calculate Bounding Box (if not already done)
        geometry.computeBoundingBox();
        const box = geometry.boundingBox!;

        // 2. calculate size (Max - Min)
        const size = new THREE.Vector3();
        box.getSize(size);

        // 3. calculate half-extents considering scaling
        // Cannon needs the radius from the center to the edge
        const halfExtents = new CANNON.Vec3(
            (size.x * mesh.scale.x) / 2,
            (size.y * mesh.scale.y) / 2,
            (size.z * mesh.scale.z) / 2
        );

        const boxShape = new CANNON.Box(halfExtents);

        // 4. Create Body
        const body = new CANNON.Body({
            mass: 0, // Static
            material: this.physicsMaterial
        });

        // 5. Consider offset
        // If the geometry center is not at (0,0,0),
        // we need to move the shape within the body.
        const center = new THREE.Vector3();
        box.getCenter(center);
        center.multiply(mesh.scale); // Also apply scaling to the offset

        const cannonOffset = new CANNON.Vec3(center.x, center.y, center.z);
        body.addShape(boxShape, cannonOffset);

        // 6. Synchronize world position and rotation
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        mesh.getWorldPosition(worldPos);
        mesh.getWorldQuaternion(worldQuat);

        body.position.set(worldPos.x, worldPos.y, worldPos.z);
        body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

        this.physicsWorld.addBody(body);
        this.bodies.push(body);
    }

    /**
     * Override clear to also clean up NPCs and healing station
     */
    clear(): void {
        if (this.healingStation) {
            this.healingStation.cleanup(this.scene);
            this.healingStation = undefined;
        }
        super.clear();
    }
}
