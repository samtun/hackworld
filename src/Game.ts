import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { Player } from './Player';
import { World } from './World';
import { InputManager } from './InputManager';
import { UIManager } from './ui/UIManager';
import { Lobby } from './stages';
import { InventoryManager } from './items/InventoryManager';
import { WeaponTrader } from './items/weapons/WeaponTrader';
import { ChipTrader } from './items/chips/ChipTrader';
import { DungeonSelectionManager } from './DungeonSelectionManager';
import { NpcDialogueManager } from './npcs/NpcDialogueManager';
import { XDataUpgradeManager } from './items/xdata/XDataUpgradeManager';
import { DebugValueEditor } from './DebugValueEditor';
import { SaveManager } from './SaveManager';
import { PlayerRegistry } from './PlayerRegistry';
import { CoreTrader } from './items/cores/CoreTrader';
import { CardManager } from './items/cards/CardManager';
import { InteractiveEntityType } from './InteractiveEntityType';
import { getHint, HintConfigs } from './ui/InputHints';
import { Teleporter } from './Teleporter';
import { LoreIntroduction } from './LoreIntroduction';
import { StartMenuOption } from './StartMenu';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class Game {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    floatingIndicatorCamera: THREE.PerspectiveCamera; // Separate camera for floating indicators to render on a different layer
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    physicsWorld: CANNON.World;
    defaultMaterial: CANNON.Material;

    player!: Player;
    world: World;
    input: InputManager;
    ui: UIManager;
    inventory!: InventoryManager;
    trader!: WeaponTrader;
    chipTrader!: ChipTrader;
    coreTrader!: CoreTrader;
    dungeonSelection!: DungeonSelectionManager;
    npcDialogue!: NpcDialogueManager;
    xDataUpgrade!: XDataUpgradeManager;
    saveManager!: SaveManager;
    cardManager!: CardManager;
    playerRegistry!: PlayerRegistry;

    clock!: THREE.Clock;
    currentScene: string = 'startScreen';

    // Debug
    physicsDebugger: any;
    debugMode: boolean = false;
    debugMeshes: THREE.Mesh[] = [];
    debugValueEditor?: DebugValueEditor;

    // Input State
    wasInventoryPressed: boolean = false;
    wasSelectPressed: boolean = false;
    wasSelectAndStartPressed: boolean = false;
    wasL3Pressed: boolean = false; // Track L3 button for debug value editor toggle
    wasR3Pressed: boolean = false; // Track R3 button for debug mode toggle
    wasJustInteracted: boolean = false; // Prevent immediate action (e.g. pickup or NPC interaction)
    isTransitioning: boolean = false;

    // Spawn position constants
    // private static readonly LOBBY_SPAWN_POSITION = new CANNON.Vec3(0, 0.5, 0);

    // Last teleporter position for respawn (starts at lobby spawn)
    lastTeleporterPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.5, 0);

    // Camera follow offset
    cameraOffset: THREE.Vector3 = new THREE.Vector3(7, 9, 7);

    constructor() {
        // Setup Three.js
        this.scene = new THREE.Scene();
        this.scene.background = null;

        const bgGeometry = new THREE.PlaneGeometry(9999, 9999);
        bgGeometry.rotateX(-Math.PI / 2);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x121212, 
            depthWrite: false // Wichtig, damit es wirklich im Hintergrund bleibt
        });
        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.position.y = -10;

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.layers.enable(0); // Default layer for everything except floating indicators
        this.camera.layers.disable(1); // Hide floating indicators layer
        // Isometric-ish view
        this.camera.position.copy(this.cameraOffset);
        this.camera.lookAt(0, 0, 0);

        this.floatingIndicatorCamera = this.camera.clone();
        this.floatingIndicatorCamera.layers.set(1); // Enable only the floating indicators layer

        this.scene.add(bgMesh);

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.composer = new EffectComposer( this.renderer );

        const mainRenderPass = new RenderPass( this.scene, this.camera );
        this.composer.addPass( mainRenderPass );

        const ssaoPass = new SSAOPass( this.scene, this.camera, window.innerWidth, window.innerHeight );
        this.composer.addPass( ssaoPass );
        ssaoPass.kernelRadius = 0.2;
        ssaoPass.minDistance = 0.005;
        ssaoPass.maxDistance = 0.1;

        const floatingIndicatorRenderPass = new RenderPass( this.scene, this.floatingIndicatorCamera );
        floatingIndicatorRenderPass.clear = false; // Don't clear the depth buffer so it renders on top of the main scene
        this.composer.addPass( floatingIndicatorRenderPass );

        const outputPass = new OutputPass();
        this.composer.addPass( outputPass );

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = false;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        document.getElementById('app')!.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Setup Physics
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -25, 0); // Stronger gravity for snappier gameplay feel

        // Create physics material with no friction (player movement handles slope sliding manually)
        this.defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
            friction: 0,
            restitution: 0
        });
        this.physicsWorld.addContactMaterial(defaultContactMaterial);

        // Setup Game Objects
        this.input = InputManager.Instance;
        this.ui = UIManager.Instance;
        this.world = new World(this.scene, this.physicsWorld, this.defaultMaterial, 
            () => this.onInitialLoadComplete(),
            (loaded, total) => this.onInitialLoadProgress(loaded, total),
            // onStageLoadStartCallback
            () => this.ui.showLoadingScreen(),
            // onStageLoadCompleteCallback,
            () => this.ui.hideLoadingScreen());

        // Resize Handler
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Auto-save when tab becomes hidden (mobile/desktop)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Only auto-save if we're not on the start screen, have saveManager initialized, and have an active player
                if (this.currentScene !== 'startScreen' && this.saveManager && this.playerRegistry?.activePlayers[0]) {
                    this.saveManager.saveToLocalStorage();
                }
            }
        });

        // Debug Mode Setup
        if (import.meta.env.DEV) {
            this.physicsDebugger = CannonDebugger(this.scene, this.physicsWorld, {
                color: 0xff0000,
                onInit: (_body, mesh) => {
                    mesh.visible = this.debugMode;
                    this.debugMeshes.push(mesh);
                }
            });

            // Create debug value editor
            this.debugValueEditor = new DebugValueEditor();

            // Subscribe to collider toggle from debug editor
            this.debugValueEditor.onCollidersToggle = (visible: boolean) => {
                this.debugMeshes.forEach(mesh => {
                    mesh.visible = visible;
                });
            };

            window.addEventListener('keydown', (e) => {
                if (e.code === 'F8') {
                    this.debugMode = !this.debugMode;

                    // Toggle debug value editor visibility (colliders handled by editor callback)
                    if (this.debugMode) {
                        this.debugValueEditor?.show();
                    } else {
                        this.debugValueEditor?.hide();
                    }

                    console.log(`Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`);
                } else if (this.debugMode) {
                    console.log(`[Debug] Key pressed: ${e.code}`);
                }
            });
        }
    }

    private onInitialLoadComplete(): void {
        this.ui.hideLoadingScreen();
        this.ui.showStartScreen();
        this.initializeEntities();

        // Start Loop
        this.animate();
    }

    private onInitialLoadProgress(loaded: number, total: number): void {
        this.ui.updateLoadingProgress(loaded, total)
    }

    initializeEntities() {
        this.inventory = InventoryManager.Instance;
        this.npcDialogue = NpcDialogueManager.Instance;
        this.xDataUpgrade = XDataUpgradeManager.Instance;
        this.chipTrader = ChipTrader.Instance;
        this.coreTrader = CoreTrader.Instance;
        this.dungeonSelection = DungeonSelectionManager.Instance;
        this.trader = WeaponTrader.Instance;
        this.saveManager = SaveManager.Instance;
        this.cardManager = CardManager.Instance;
        this.clock = new THREE.Clock();

        // Set up player
        this.playerRegistry = PlayerRegistry.Instance;
        const initialSpawn = this.world.currentStage ? this.world.currentStage.spawnPosition : new CANNON.Vec3(0, 0.4, 0);
        this.playerRegistry.addPlayer(new Player(this.scene, this.physicsWorld, initialSpawn, this.input, this.defaultMaterial));
        this.player = this.playerRegistry.activePlayers[0];
        this.player.setDeathCallback(() => this.handlePlayerDeath());
        this.player.onBreakableHit = (breakable) => {
            // Find the barrel that matches this breakable and destroy it
            for (const barrel of this.world.getBreakableBarrels()) {
                if (barrel === breakable) {
                    this.world.destroyBarrel(barrel, this.player);
                    break;
                }
            }
        };

        // Register player with UI so skill indicators are created
        this.ui.registerPlayer(this.player);

        // Set up teleporter callback for handling teleporter interactions
        Teleporter.setTeleporterCallback((destination: string) => {
            if (destination === 'selection') {
                this.dungeonSelection.show((dungeonId: string) => {
                    this.switchScene(dungeonId);
                });
            } else {
                this.switchScene(destination);
            }
        });
    }

    switchScene(destination: string) {
        // Use loadStage helper method
        this.world.loadStageById(destination).then(() => {
            // Get spawn position from stage configuration
            const targetPos = this.world.currentStage
                ? this.world.currentStage.spawnPosition
                : new CANNON.Vec3(0, 0.4, 0);

            // Move player and clear velocities/rotation to prevent any impulse from previous physics steps
            this.player.move(targetPos);
            this.player.body.velocity.set(0, 0, 0);
            if (this.player.body.angularVelocity) this.player.body.angularVelocity.set(0, 0, 0);

            // Update last teleporter position when entering a stage via teleporter
            // This is used as the respawn point if the player dies
            this.lastTeleporterPosition.copy(this.player.body.position);

            // Snap camera
            this.resetCameraPosition();
            this.currentScene = destination;
        });
    }

    /**
     * Handle player death
     */
    handlePlayerDeath() {
        console.log('Game: Handling player death');
        this.ui.showDeathOverlay(
            () => this.respawnPlayer(),
            () => this.returnToLobby()
        );
    }

    /**
     * Respawn the player at the last teleporter position
     * Fully reloads the current stage to reset enemies
     */
    respawnPlayer() {
        console.log('Game: Respawning player at last teleporter');
        this.ui.hideDeathOverlay();

        // Fully reload the current stage to reset enemies and environment
        if (this.currentScene !== 'startScreen' && this.currentScene !== Lobby.getMetadata().id) {
            this.switchScene(this.currentScene);
        }

        // Respawn player at last teleporter position
        this.player.respawn(this.lastTeleporterPosition);
    }

    /**
     * Return player to the lobby
     */
    returnToLobby() {
        console.log('Game: Returning to lobby');
        this.ui.hideDeathOverlay();

        // Respawn player at lobby spawn point without updating lastTeleporterPosition
        // We don't update lastTeleporterPosition here because death returns shouldn't
        // change the respawn point for future deaths
        // Note: The actual position will be corrected when switchScene loads the lobby
        this.player.respawn(new CANNON.Vec3(0, 0.5, 0));

        // Switch to lobby
        this.switchScene(Lobby.getMetadata().id);

        // Reset camera
        this.resetCameraPosition();
    }

    private resetCameraPosition() {
        this.camera.position.copy(this.cameraOffset.clone().add(this.player.position));
        this.floatingIndicatorCamera.position.copy(this.cameraOffset.clone().add(this.player.position));
    }

    /**
     * Check if any UI menu is currently open
     */
    private isAnyMenuOpen(): boolean {
        return this.inventory.isVisible ||
            this.trader.isVisible ||
            this.chipTrader.isVisible ||
            this.coreTrader.isVisible ||
            this.dungeonSelection.isVisible ||
            this.npcDialogue.isVisible ||
            this.xDataUpgrade.isVisible ||
            this.saveManager.isVisible ||
            this.cardManager.isVisible ||
            this.isAnyChestUIOpen();
    }

    private isAnyChestUIOpen(): boolean {
        return this.world.getLootChests().some(chest => chest.isUIVisible);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.floatingIndicatorCamera.aspect = width / height;
        this.floatingIndicatorCamera.updateProjectionMatrix();// Enable only the floating indicators layer
        this.renderer.setSize(width, height);
		this.composer.setSize(width, height);

        // Update particle scale factors for screen-independent sizing
        if (this.world.currentStage) {
            // Update teleporter particles if exists
            if (this.world.currentStage.teleporter) {
                this.world.currentStage.teleporter.updateScaleFactor();
            }

            // Update healing station particles if exists (Lobby specific)
            const stage = this.world.currentStage as any;
            if (stage.healingStation && typeof stage.healingStation.updateScaleFactor === 'function') {
                stage.healingStation.updateScaleFactor();
            }
        }
    }

    /**
     * Called by UIManager after the player confirms a start menu option and the
     * fade transition / screen hide have completed. Handles all game-logic concerns:
     * save loading, scene switching, and lore introduction.
     */
    private async onStartMenuSelect(option: StartMenuOption, file?: File): Promise<void> {
        if (option === 'continue') {
            const loaded = this.saveManager.loadFromLocalStorage();
            if (loaded) {
                console.log('Auto-save loaded successfully');
            }
        } else if (option === 'newgame') {
            this.saveManager.clearLocalStorage();
        } else if (option === 'loadgame' && file) {
            console.log(`Loading save file: ${file.name}`);
            await this.saveManager.load(file);
        }

        if (this.saveManager.isLoreIntroSeen()) {
            this.continueAfterIntro();
        } else {
            this.currentScene = 'lore';
            const loreIntro = new LoreIntroduction(this.input, () => this.continueAfterIntro());
            loreIntro.show();
        }
    }

    private continueAfterIntro() {
        this.currentScene = Lobby.getMetadata().id;
        this.input.initializeMobileControls();
        this.clock.getDelta(); // Reset clock
        this.isTransitioning = false;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.currentScene === 'startScreen') {
            this.ui.showStartScreen();
            // Show the main menu after START is pressed (but not while already transitioning
            // or while the menu is already visible)
            if (!this.isTransitioning && !this.ui.isStartMenuShowing() &&
                (this.input.isStartPressed() || this.ui.startScreenTapped)) {
                this.isTransitioning = true;
                this.ui.showStartMenu(
                    this.input,
                    this.saveManager.hasLocalStorageSave(),
                    (option, file) => this.onStartMenuSelect(option, file),
                );
            }
            return;
        }

        // Lore introduction is active — the LoreIntroduction class handles its own rendering
        if (this.currentScene === 'lore') {
            return;
        }

        const dt = this.clock.getDelta();

        // Update playtime (only when not on start screen and not paused by menus)
        if (!this.isAnyMenuOpen()) {
            this.saveManager.updatePlaytime(dt);
        }

        // Clean up debug meshes list occasionally (e.g. every frame is fine for small lists, or check length)
        if (this.debugMeshes.length > 0) {
            this.debugMeshes = this.debugMeshes.filter(m => m.parent !== null);
        }

        // Input Handling for UI
        // Debug Mode: Check for L3 (left thumbstick press) for dev builds only
        // L3 toggles the debug value editor (expand/collapse)
        // R3 toggles debug mode completely (like F8)
        if (import.meta.env.DEV) {
            // L3: Toggle debug value editor
            const isL3Pressed = this.input.isL3Pressed();
            if (isL3Pressed && !this.wasL3Pressed) {
                if (this.debugValueEditor) {
                    if (this.debugValueEditor.isVisible) {
                        // Toggle expanded/collapsed state
                        this.debugValueEditor.toggle();
                        this.debugValueEditor.hide();
                    } else {
                        // Show and expand the editor
                        this.debugValueEditor.show();
                        this.debugValueEditor.expand();
                        console.log('Debug Mode: ON (via L3 button)');
                    }
                }
            }
            this.wasL3Pressed = isL3Pressed;

            // R3: Full debug mode toggle (like F8)
            const isR3Pressed = this.input.isR3Pressed();
            if (isR3Pressed && !this.wasR3Pressed) {
                this.debugMode = !this.debugMode;

                // Toggle debug value editor visibility (colliders handled by editor callback)
                if (this.debugMode) {
                    this.debugValueEditor?.show();
                } else {
                    this.debugValueEditor?.hide();
                }

                console.log(`Debug Mode: ${this.debugMode ? 'ON' : 'OFF'} (via R3 button)`);
            }
            this.wasR3Pressed = isR3Pressed;
        }

        // Check inventory toggle
        const isInventoryPressed = this.input.isInventoryPressed();
        if (isInventoryPressed && !this.wasInventoryPressed) {
            // Don't allow toggling inventory while any other UI is open
            if (!this.isAnyMenuOpen() || this.inventory.isVisible) {
                this.inventory.toggle();
            }
        }
        this.wasInventoryPressed = isInventoryPressed;

        // Update inventory if visible (pass input for navigation)
        if (this.inventory.isVisible) {
            this.inventory.update(this.player, this.input);
        }

        // Update trader if visible
        if (this.trader.isVisible) {
            this.trader.update(this.player, this.input);
        }

        // Update dungeon selection if visible
        if (this.dungeonSelection.isVisible) {
            this.dungeonSelection.update(this.input);
        }

        // Update NPC dialogue if visible
        const wasDialogueVisible = this.npcDialogue.isVisible;
        if (this.npcDialogue.isVisible) {
            this.npcDialogue.update(this.input);
        }

        // Update X-Data upgrade if visible
        if (this.xDataUpgrade.isVisible) {
            this.xDataUpgrade.update(this.player, this.input);
        }

        // Update chip trader if visible
        if (this.chipTrader.isVisible) {
            this.chipTrader.update(this.player, this.input);
        }

        // Update core trader if visible
        if (this.coreTrader.isVisible) {
            this.coreTrader.update(this.player, this.input);
        }

        // Update save manager if visible
        if (this.saveManager.isVisible) {
            this.saveManager.update(this.input);
        }

        // Update card manager if visible
        if (this.cardManager.isVisible) {
            this.cardManager.update(this.player, this.input);
        }

        // Update any open chest UIs
        for (const chest of this.world.getLootChests()) {
            if (chest.isUIVisible) {
                chest.updateUI(this.player, this.input);
            }
        }

        // Update mobile skills button visibility based on any menu being open
        if (this.input.mobileControls) {
            this.input.mobileControls.setSkillsButtonVisible(!this.isAnyMenuOpen());
        }

        // Check if player is near any interactive entity (to prevent jumping while interacting)
        const anyMenuOpen = this.isAnyMenuOpen();

        // Define interactive entity types
        interface InteractiveEntity {
            type: InteractiveEntityType;
            data?: any;
            hint: string;
            action: () => void;
        }

        let nearbyInteractive: InteractiveEntity | null = null;

        if (!anyMenuOpen) {
            // Auto-pickup XData and money drops
            const autoPickupDrop = this.world.checkNearestAutoPickupDrop(this.player.position);
            if (autoPickupDrop) {
                this.world.pickupDrop(autoPickupDrop, this.player);
            }

            // Check NPCs
            const allNpcs = this.world.getAllNpcs();
            for (const npc of allNpcs) {
                if (npc.isPlayerNearby(this.player.position)) {
                    nearbyInteractive = {
                        type: InteractiveEntityType.NPC,
                        data: npc,
                        hint: npc.getInteractionHint(this.input),
                        action: () => {
                            // If dialogue hasn't been shown yet, show it first
                            if (!npc.hasShownDialogue() && npc.dialogue.length > 0) {
                                // Show dialogue, then call the interaction callback when complete
                                this.npcDialogue.show(npc, () => {
                                    if (npc.interactionCallback) {
                                        npc.interact();
                                    }
                                });
                            } else {
                                // Dialogue already shown or no dialogue - go straight to callback
                                if (npc.interactionCallback) {
                                    npc.interact();
                                } else {
                                    // Fallback for NPCs with no callback (dialogue only NPCs) - show dialogue again
                                    this.npcDialogue.show(npc);
                                }
                            }
                        }
                    };
                    break;
                }
            }

            // Check weapon / chip / core / booster pack drops (higher priority than traders)
            if (!nearbyInteractive) {
                const interactiveDrop = this.world.checkNearestInteractiveDrop(this.player.position);
                if (interactiveDrop) {
                    nearbyInteractive = {
                        type: interactiveDrop.interactiveType,
                        data: interactiveDrop,
                        hint: getHint(HintConfigs.pickUp, this.input),
                        action: () => {
                            this.world.pickupDrop(interactiveDrop, this.player);
                        }
                    };
                }
            }

            // Check loot chests (unopened or opened with remaining items)
            if (!nearbyInteractive) {
                for (const chest of this.world.getLootChests()) {
                    if ((!chest.isOpened || chest.hasItems) && !chest.isUIVisible && chest.isPlayerNearby(this.player.position)) {
                        nearbyInteractive = {
                            type: InteractiveEntityType.CHEST,
                            data: chest,
                            hint: chest.getInteractionHint(this.input),
                            action: () => {
                                chest.open(this.player);
                            }
                        };
                        break;
                    }
                }
            }
        }

        const isNearInteractive = nearbyInteractive !== null;

        // Update Game Logic
        // Skip physics simulation while any menu is open so enemies don't drift
        if (!anyMenuOpen) {
            this.physicsWorld.step(1 / 60, dt, 3);
        }

        if (this.debugMode && this.physicsDebugger) {
            this.physicsDebugger.update();
        }

        // Prevent jumping in the frame(s) immediately after interacting
        const preventJump = isNearInteractive || this.wasJustInteracted;
        // Prevent movement when in a menu
        this.player.update(dt, preventJump, anyMenuOpen);
        this.world.update(dt, this.player, this.camera.position, anyMenuOpen);

        this.ui.update(this.player, dt);

        // Handle death overlay input
        this.ui.handleDeathOverlayInput(this.input);

        // Update debug value editor if visible
        if (this.debugMode && this.debugValueEditor) {
            this.debugValueEditor.update(this.player, dt);
        }

        // Camera Follow
        const targetX = this.player.position.x + this.cameraOffset.x;
        const targetY = this.player.position.y + this.cameraOffset.y;
        const targetZ = this.player.position.z + this.cameraOffset.z;

        const lerpFactor = Math.min(5 * dt, 1);
        this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor;
        this.camera.position.y += (targetY - this.camera.position.y) * lerpFactor;
        this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor;
        this.floatingIndicatorCamera.position.x += (targetX - this.floatingIndicatorCamera.position.x) * lerpFactor;
        this.floatingIndicatorCamera.position.y += (targetY - this.floatingIndicatorCamera.position.y) * lerpFactor;
        this.floatingIndicatorCamera.position.z += (targetZ - this.floatingIndicatorCamera.position.z) * lerpFactor;

        // Handle interactions (use variables we already calculated)
        const isSelectPressed = this.input.isSelectPressed();

        if (nearbyInteractive) {
            this.ui.showInteractionHint(true, nearbyInteractive.hint);

            // Check for interaction - prevent if just opened a menu or dialogue was just closed
            const shouldPreventInteraction = this.wasJustInteracted ||
                (nearbyInteractive.type === InteractiveEntityType.NPC && wasDialogueVisible);

            if (isSelectPressed && !this.wasSelectPressed && !shouldPreventInteraction) {
                nearbyInteractive.action();

                // Set flag if we just interacted to prevent immediate action
                this.wasJustInteracted = true;
            }
        } else {
            // Hide hint if not near anything interactive
            this.ui.showInteractionHint(false);
        }

        // Reset trader just opened flag when select is released
        if (!isSelectPressed && this.wasJustInteracted) {
            this.wasJustInteracted = false;
        }

        this.wasSelectPressed = isSelectPressed;
        this.composer.render();
    }
}
