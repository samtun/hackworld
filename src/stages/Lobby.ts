import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { BaseStage, StageMetadata } from './BaseStage';
import { HealingStation } from '../props/HealingStation';
import { Player } from '../player/Player';
import { ChipTrader } from '../items/chips/ChipTrader';
import { SaveManager } from '../SaveManager';
import { XDataUpgradeManager } from '../items/xdata/XDataUpgradeManager';
import { WeaponTrader } from '../items/weapons/WeaponTrader';
import { Npc } from '../npcs/Npc';
import { CoreTrader } from '../items/cores/CoreTrader';
import { CardManager } from '../items/cards/CardManager';
import { ShaderUtils } from '../ShaderUtils';
import { GameProgressManager } from '../GameProgressManager';
import type { StageMinimapLayout } from './StageMinimapLayout';
import { HealingStationFactory } from '../props/HealingStationFactory';
import { TeleporterFactory } from '../props/TeleporterFactory';
import { AudioManager } from '../AudioManager';
import { EnemyFactory } from '../enemies/EnemyFactory';
import { BreakableBarrelFactory } from '../items/BreakableBarrelFactory';
import { ElectricTrapFactory } from '../items/ElectricTrapFactory';
import { ItemDropManager } from '../items/ItemDropManager';
import { LootChestFactory } from '../items/LootChestFactory';
import { ModelPropFactory } from '../props/ModelPropFactory';
import { NpcFactory } from '../npcs/NpcFactory';

export class Lobby extends BaseStage {
    id = 'lobby';
    name = 'Lobby';
    description = 'Safe hub area';
    environmentMap: string = 'textures/environments/lobby_env.exr';
    spawnPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.4, 0);

    static getStageMetadata(): StageMetadata {
        return {
            id: 'lobby',
            name: 'Lobby',
            description: 'Safe hub area',
            requiredProgress: 0,
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
    cardCollectionNpc?: Npc;

    private bannerTexture?: THREE.Texture | null = null;
    private static readonly minimapLayout: StageMinimapLayout = {
        rects: [{ x: 0, z: 0, width: 34, depth: 34, kind: 'room' }],
        bounds: { minX: -18, maxX: 18, minZ: -18, maxZ: 18 },
    };

    // Healing Station
    private healingStation?: HealingStation;
    private healingStationPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, 6);
    private upperLevelY: number = 6.75; // Y position for entities on the upper level

    // Callback for XData Terminal interaction (set by Game)
    xDataInteractionCallback?: () => void;

    // Callback for Save Manager interaction (set by Game)
    saveManagerInteractionCallback?: () => void;

    constructor(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        teleporterFactory: TeleporterFactory,
        modelPropFactory: ModelPropFactory,
        lootChestFactory: LootChestFactory,
        breakableBarrelFactory: BreakableBarrelFactory,
        electricTrapFactory: ElectricTrapFactory,
        enemyFactory: EnemyFactory,
        audioManager: AudioManager,
        itemDropManager: ItemDropManager,
        private readonly npcFactory: NpcFactory,
        private readonly gameProgressManager: GameProgressManager,
        private readonly cardManager: CardManager,
        private readonly weaponTrader: WeaponTrader,
        private readonly chipTrader: ChipTrader,
        private readonly coreTrader: CoreTrader,
        private readonly saveManager: SaveManager,
        private readonly xDataUpgradeManager: XDataUpgradeManager,
        private readonly healingStationFactory: HealingStationFactory,
    ) {
        super(
            scene,
            physicsWorld,
            physicsMaterial,
            teleporterFactory,
            modelPropFactory,
            lootChestFactory,
            breakableBarrelFactory,
            electricTrapFactory,
            enemyFactory,
            audioManager,
            itemDropManager,
        );
    }

    async load(): Promise<void> {
        this.clear();
        console.log("Loading Lobby...");
        await this.loadEnvironmentMap();
        this.setMinimapLayout(Lobby.minimapLayout, false);

        // Update Mainframe dialogue on each load (in case progress changed)
        this.updateMainframeDialogue();

        this.props.push(this.modelPropFactory.createModelProp(
            'lobby',
            undefined,
            undefined,
            (lobbyScene) => {
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
        ));

        // Teleporter
        this.createTeleporter(new CANNON.Vec3(0, 0, -6), 'selection');

        // Healing Station
        this.healingStation = this.healingStationFactory.createHealingStation(this.healingStationPosition);

        // Create Mainframe NPC - Main quest giver
        this.createMainframeNpc();

        this.createNylethNpc();

        this.createXDataManagerNpc();

        this.createSaveManagerNpc();

        this.createChipTraderNpc();

        this.createCoreTraderNpc();

        this.createWeaponTraderNpc();

        this.createCardCollectionNpc();

    }

    /**
     * Create the Mainframe NPC with progressive dialogue based on game progress
     */
    private createMainframeNpc(): void {
        this.mainframeNpc = this.npcFactory.createMainframeNpc(new CANNON.Vec3(38, 6.75, -30));
        this.npcs.add(this.mainframeNpc);
    }

    private createNylethNpc(): void {
        const nylethDialogue = [
            "Hey there, never seen you around. You look like you pack some punches. Interested in joining our fight?",
            "There are hordes of corrupted files running around our servers and we could really need some help with that.",
            "If you are interested, the teleporter to the south can take you to our main server."
        ];

        this.nylethNpc = this.npcFactory.createNpc(
            "models/npc_placeholder.glb",
            "Nyleth",
            "Talk",
            new CANNON.Vec3(-30, this.upperLevelY, -30),
            nylethDialogue,
            () => { }
        );
        this.npcs.add(this.nylethNpc);
    }

    private createXDataManagerNpc(): void {
        const xDataManagerDialogue = [
            "Welcome to the upgrade terminal.",
            "Here you can unlock your full potential by using X-Data you collect from enemies.",
            "Step closer if you'd like to upgrade your stats!"
        ];

        this.xDataManagerNpc = this.npcFactory.createNpc(
            "models/xdata_terminal.glb",
            "XData Terminal",
            "Upgrade with X-Data",
            new CANNON.Vec3(18, 0, 0),
            xDataManagerDialogue,
            () => this.xDataUpgradeManager.show()
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

        this.saveManagerNpc = this.npcFactory.createNpc(
            'models/npc_placeholder.glb',
            "Grant",
            "Save Game",
            new CANNON.Vec3(34, this.upperLevelY, 30),
            saveManagerDialogue,
            () => this.saveManager.show(),
        );
        this.npcs.add(this.saveManagerNpc);
    }

    private createChipTraderNpc(): void {
        const chipTraderDialogue = [
            "Hi, I'm Kelly.",
            "Are you looking for some upgrades?",
            "I've got all the chips you need."
        ];

        this.chipTraderNpc = this.npcFactory.createNpc(
            "models/npc_placeholder.glb",
            "Kelly",
            "Trade Chips",
            new CANNON.Vec3(-42, this.upperLevelY, 29),
            chipTraderDialogue,
            () => this.chipTrader.show()
        );
        this.npcs.add(this.chipTraderNpc);
    }

    private createCoreTraderNpc(): void {
        const coreTraderDialogue = [
            "Hey you. You look like you could use some upgrades for your systems.",
            "I've got just what you need."
        ];

        this.coreTraderNpc = this.npcFactory.createNpc(
            "models/npc_placeholder.glb",
            "Hank",
            "Trade Cores",
            new CANNON.Vec3(-46, this.upperLevelY, 21),
            coreTraderDialogue,
            () => this.coreTrader.show()
        );
        this.npcs.add(this.coreTraderNpc);
    }

    private createWeaponTraderNpc(): void {
        const weaponTraderDialogue = [
            "Looking for some new gear?",
            "Trying to inflict some serious damage?",
            "Have a look at my fine collection of weapons."
        ];

        this.weaponTraderNpc = this.npcFactory.createNpc(
            "models/trader_weapons.glb",
            "Orim",
            "Trade Weapons",
            new CANNON.Vec3(-42, this.upperLevelY, 17),
            weaponTraderDialogue,
            () => this.weaponTrader.show()
        );
        this.npcs.add(this.weaponTraderNpc);
    }

    private createCardCollectionNpc(): void {
        const cardCollectionNpcDialogue = [
            "Hey there, collector! I'm Irkel.",
            "I've got booster packs and can help you manage your card collection.",
            "Each pack contains 5 random cards from various albums.",
            "Come see me when you find some packs!"
        ];

        this.cardCollectionNpc = this.npcFactory.createNpc(
            "models/npc_placeholder.glb",
            "Irkel",
            "Card Collection",
            new CANNON.Vec3(38, this.upperLevelY, 28),
            cardCollectionNpcDialogue,
            () => this.cardManager.show()
        );

        this.npcs.add(this.cardCollectionNpc);
    }

    /**
     * Update Mainframe dialogue based on current progress
     */
    private updateMainframeDialogue(): void {
        if (this.mainframeNpc) {
            // mainframeNpc is a MainframeNpc instance and exposes updateDialogue
            (this.mainframeNpc as any).updateDialogue(this.gameProgressManager.progress);
        }
    }

    /*
     * Override BaseStage update method
     */
    update(dt: number, player: Player, anyMenuOpen: boolean, cameraPosition?: THREE.Vector3): void {
        super.update(dt, player, anyMenuOpen, cameraPosition);

        // Animate banner texture
        if (this.bannerTexture) {
            const speed = 0.04;
            const time = performance.now() * 0.001;
            this.bannerTexture.offset.x = (time * speed) % 1;
        }

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
