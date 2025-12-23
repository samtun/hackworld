import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';
import { HealingStation } from '../HealingStation';
import { Player } from '../Player';
import { ChipTraderManager } from '../items/ChipTraderManager';
import { SaveManager } from '../SaveManager';
import { XDataUpgradeManager } from '../xdata/XDataUpgradeManager';
import { TraderManager } from '../items/TraderManager';
import { Npc } from '../npcs/Npc';

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

    // NPCs
    nylethNpc?: Npc;
    xDataManagerNpc?: Npc;
    saveManagerNpc?: Npc;
    weaponTraderNpc?: Npc;
    chipTraderNpc?: Npc;

    // Managers
    private weaponTraderManager?: TraderManager;
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

        // Create Chip Trader NPC
        const chipTraderDialogue = [
            "Hi, I'm Kelly.",
            "Are you looking for some upgrades?",
            "I've got all the chips you need."
        ];

        this.chipTraderManager = ChipTraderManager.Instance;
        this.chipTraderNpc = new Npc(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "models/npc_placeholder.glb",
            "Kelly",
            "Trade Chips",
            new CANNON.Vec3(-5, 0, -5),
            chipTraderDialogue,
            () => this.chipTraderManager?.show()
        );

        // Load Trader Model from cache
        const weaponTraderDialogue = [
            "Looking for some new gear?",
            "Trying to inflict some serious damage?",
            "Have a look at my fine collection of weapons."
        ];

        this.weaponTraderManager = TraderManager.Instance;
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
    }

    /**
     * Get all NPCs in the lobby (dialogue NPCs only, traders are handled separately)
     */
    getAllNpcs(): Npc[] {
        const npcs: Npc[] = [];
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
        if (this.weaponTraderNpc) {
            this.weaponTraderNpc.cleanup(this.scene, this.physicsWorld);
            this.weaponTraderNpc = undefined;
        }
        if (this.chipTraderNpc) {
            this.chipTraderNpc.cleanup(this.scene, this.physicsWorld);
            this.chipTraderNpc = undefined;
        }
        if (this.healingStation) {
            this.healingStation.cleanup(this.scene);
            this.healingStation = undefined;
        }
        super.clear();
    }
}
