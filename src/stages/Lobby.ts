import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';
import { NPC } from '../NPC';
import { HealingStation } from '../HealingStation';
import { Player } from '../Player';
import { ChipTraderManager } from '../ChipTraderManager';
import { SaveManager } from '../SaveManager';
import { TraderManager } from '../TraderManager';
import { XDataUpgradeManager } from '../xdata/XDataUpgradeManager';
import { PlayerRegistry } from '../PlayerRegistry';

export class Lobby extends BaseDungeon {
    id = 'lobby';
    name = 'Lobby';
    description = 'Safe hub area';

    static getMetadata() {
        return {
            id: 'lobby',
            name: 'Lobby',
            description: 'Safe hub area'
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

    // Store trader position for interaction
    private traderPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, -5);

    // NPCs
    nylethNpc?: NPC;
    xDataManagerNpc?: NPC;
    saveManagerNpc?: NPC;
    weaponTraderNpc?: NPC;
    chipTraderNpc?: NPC;

    // Managers
    private tradeManager?: TraderManager;
    private chipTraderManager?: ChipTraderManager;
    private saveManager?: SaveManager;
    private xDataUpgradeManager?: XDataUpgradeManager;

    // Healing Station
    healingStation?: HealingStation;
    private healingStationPosition: CANNON.Vec3 = new CANNON.Vec3(-5, 0.05, 5);

    // Callback for Ford interaction (set by Game)
    xDataInteractionCallback?: () => void;

    // Callback for Save Manager interaction (set by Game)
    saveManagerInteractionCallback?: () => void;

    load(): void {
        this.clear();
        console.log("Loading Lobby...");

        // Floor
        this.createFloor(20, 0x808080);

        // Portal (single portal that will show selection UI)
        this.createPortal(new CANNON.Vec3(5, 0.05, 5), 0x00ff00, 'selection');

        // Healing Station (moved to avoid conflict with Save Manager)
        this.healingStation = new HealingStation(this.scene, this.healingStationPosition, 0x00ffff);

        // Create Nyleth NPC
        const nylethMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0xffff00 }));

        const nylethDialogue = [
            "Hey there, never seen you around. You look like you pack some punches. Interested in joining our fight?",
            "There are hordes of corrupted files running around our servers and we could really need some help with that.",
            "If you are interested, the teleporter to the south can take you to our main server."
        ];

        this.nylethNpc = new NPC(
            this.scene,
            this.physicsWorld,
            nylethMesh,
            this.physicsMaterial,
            "Nyleth",
            new CANNON.Vec3(-5, 0, 0),
            nylethDialogue
        );

        // Create XData Manager NPC
        // TODO: Replace placeholder mesh
        const xDataManagerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0xffff00 }));

        const xDataManagerDialogue = [
            "Welcome! I'm Ford, the X-Data Manager.",
            "I can help you unlock your potential using the X-Data you collect from enemies.",
            "Step closer if you'd like to upgrade your stats!"
        ];

        this.xDataUpgradeManager = XDataUpgradeManager.Instance;
        this.xDataManagerNpc = new NPC(
            this.scene,
            this.physicsWorld,
            xDataManagerMesh,
            this.physicsMaterial,
            "Ford",
            new CANNON.Vec3(5, 0, -5),
            xDataManagerDialogue,
            () => this.xDataUpgradeManager?.show()
        );

        // Create Save Manager NPC
        // TODO: Replace placeholder mesh
        const saveManagerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 }));

        const saveManagerDialogue = [
            "Hello! I'm the Save Manager.",
            "I can help you save your current game progress to a file.",
            "This includes your stats, inventory, playtime, and trader inventories.",
            "Come closer when you're ready to save!"
        ];

        this.saveManager = SaveManager.Instance;
        this.saveManagerNpc = new NPC(
            this.scene,
            this.physicsWorld,
            saveManagerMesh,
            this.physicsMaterial,
            "Grant",
            new CANNON.Vec3(0, 0, 5),
            saveManagerDialogue,
            () => this.saveManager?.show(),
        );

        // Create Chip Trader NPC
        // TODO: Replace placeholder mesh
        const chipTraderMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 }));

        const chipTraderDialogue = [
            "Hi, I'm Kelly.",
            "Are you looking for some upgrades?",
            "I've got all the chips you need."
        ];

        this.chipTraderManager = ChipTraderManager.Instance;
        this.chipTraderNpc = new NPC(
            this.scene,
            this.physicsWorld,
            chipTraderMesh,
            this.physicsMaterial,
            "Kelly",
            new CANNON.Vec3(-5, 0, -5),
            chipTraderDialogue,
            () => this.chipTraderManager?.show()
        );

        // Load Trader Model from cache
        const traderGltf = this.assetManager.get('models/trader_weapons.glb');
        if (traderGltf) {
            const model = traderGltf.scene;
            model.position.set(0, 0, -5);
            this.scene.add(model);
            this.meshes.push(model);

            // Shadows
            model.traverse((child) => {
                if ((child as any).isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Animation
            if (traderGltf.animations && traderGltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                const action = mixer.clipAction(traderGltf.animations[0]);
                action.play();
                this.mixers.push(mixer);
            }

            // Physics Body (Simple Box)
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
            const shape = new CANNON.Box(halfExtents);
            const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
            body.addShape(shape);
            body.position.set(center.x, center.y, center.z);

            this.physicsWorld.addBody(body);
            this.bodies.push(body);
        } else {
            console.warn('Trader model not preloaded');
        }
    }

    /**
     * Check if player is near trader
     */
    checkTraderInteraction(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.traderPosition.x, this.traderPosition.y, this.traderPosition.z)
        );
        return dist < 2.0; // Interaction range
    }

    /**
     * Check if player is near chip trader
     */
    checkChipTraderInteraction(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.chipTraderNpc?.position.x, this.chipTraderNpc?.position.y, this.chipTraderNpc?.position.z)
        );
        return dist < 2.0; // Interaction range
    }

    /**
     * Check if player is near save manager
     */
    checkSaveManagerInteraction(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.saveManagerNpc?.position.x, this.saveManagerNpc?.position.y, this.saveManagerNpc?.position.z)
        );
        return dist < 2.0; // Interaction range
    }

    /**
     * Get all NPCs in the lobby (dialogue NPCs only, traders are handled separately)
     */
    getAllNPCs(): NPC[] {
        const npcs: NPC[] = [];
        if (this.nylethNpc) npcs.push(this.nylethNpc);
        if (this.xDataManagerNpc) npcs.push(this.xDataManagerNpc);
        if (this.saveManagerNpc) npcs.push(this.saveManagerNpc);
        if (this.weaponTraderNpc) npcs.push(this.weaponTraderNpc);
        if (this.chipTraderNpc) npcs.push(this.chipTraderNpc);
        return npcs;
    }

    /*
     * Override BaseDungeon update method to include healing station
     */
    update(dt: number, player: Player) {
        super.update(dt, player);

        if (!this.healingStation) return;
        this.healingStation.update(dt, player);
    }

    /**
     * Override clear to also clean up NPCs and healing station
     */
    clear(): void {
        if (this.nylethNpc) {
            this.nylethNpc.cleanup(this.scene, this.physicsWorld);
            this.nylethNpc = undefined;
        }
        if (this.xDataManagerNpc) {
            this.xDataManagerNpc.cleanup(this.scene, this.physicsWorld);
            this.xDataManagerNpc = undefined;
        }
        if (this.saveManagerNpc) {
            this.saveManagerNpc.cleanup(this.scene, this.physicsWorld);
            this.saveManagerNpc = undefined;
        }
        if (this.healingStation) {
            this.healingStation.cleanup(this.scene);
            this.healingStation = undefined;
        }
        super.clear();
    }
}
