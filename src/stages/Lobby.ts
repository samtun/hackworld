import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseStage } from './BaseStage';
import { HealingStation } from '../HealingStation';
import { Player } from '../Player';
import { ChipTrader } from '../items/chips/ChipTrader';
import { SaveManager } from '../SaveManager';
import { XDataUpgradeManager } from '../items/xdata/XDataUpgradeManager';
import { WeaponTrader } from '../items/weapons/WeaponTrader';
import { Npc } from '../npcs/Npc';
import { CoreTrader } from '../items/cores/CoreTrader';
import { CardManager } from '../items/cards/CardManager';

export class Lobby extends BaseStage {
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

    // NPCs
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

        // Load Lobby Model
        const lobbyAsset = this.assetManager.get('models/lobby.glb');
        const lobbyScene = lobbyAsset.scene;
        this.scene.add(lobbyScene);
        this.meshes.push(lobbyScene);

        // Create floor collider
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({
            mass: 0,
            material: this.physicsMaterial
        });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physicsWorld.addBody(floorBody);
        this.bodies.push(floorBody);

        // Portal
        this.createPortal(new CANNON.Vec3(5, 0.05, 5), 0x00ff00, 'selection');

        // Healing Station
        this.healingStation = new HealingStation(this.scene, this.healingStationPosition);

        // Create Nyleth NPC
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

        // Create XData Manager NPC
        const xDataManagerDialogue = [
            "Welcome! I'm Ford, the X-Data Manager.",
            "I can help you unlock your potential using the X-Data you collect from enemies.",
            "Step closer if you'd like to upgrade your stats!"
        ];

        this.xDataUpgradeManager = XDataUpgradeManager.Instance;
        this.xDataManagerNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/npc_placeholder.glb",
            "Ford",
            "Upgrade with X-Data",
            new CANNON.Vec3(5, 0, -5),
            xDataManagerDialogue,
            () => this.xDataUpgradeManager?.show()
        );
        this.npcs.add(this.xDataManagerNpc);

        // Create Save Manager NPC
        const saveManagerDialogue = [
            "Hello! I'm the Save Manager.",
            "I can help you save your current game progress to a file.",
            "This includes your stats, inventory, playtime, and trader inventories.",
            "Come closer when you're ready to save!"
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

        // Create Chip Trader NPC
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

        // Create Core Trader NPC
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

        // Create Weapon Trader NPC
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

        // Create Irkel NPC (Card Manager)
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

    /*
     * Override BaseStage update method to include healing station
     */
    update(dt: number, player: Player) {
        super.update(dt, player);

        if (!this.healingStation) return;
        this.healingStation.update(dt);
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
