import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { Player } from './player/Player';
import { World } from './World';
import { InputManager } from './controls/InputManager';
import { UIManager } from './ui/UIManager';
import { Lobby } from './stages';
import { DebugValueEditor } from './DebugValueEditor';
import { PlayerRegistry } from './player/PlayerRegistry';
import { InteractiveEntityType } from './InteractiveEntityType';
import { getHint, HintConfigs } from './ui/InputHints';
import { Teleporter } from './props/Teleporter';
import { LoreIntroduction } from './LoreIntroduction';
import { StartMenuOption } from './menus/StartMenu';
import { PauseMenu, PERFORMANCE_MODE_STORAGE_KEY, CONTROL_HINTS_STORAGE_KEY } from './menus/PauseMenu';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { AudioManager } from './AudioManager';
import { container, delay, inject, singleton } from 'tsyringe';
import { Breakable } from './items/Breakable';
import { SaveManager } from './SaveManager';
import { PlayerFactory } from './player/PlayerFactory';
import { DungeonSelectionManager } from './menus/DungeonSelectionManager';
import { InventoryManager } from './items/InventoryManager';
import { WeaponTrader } from './items/weapons/WeaponTrader';
import { NpcDialogueManager } from './npcs/NpcDialogueManager';
import { CardManager } from './items/cards/CardManager';
import { XDataUpgradeManager } from './items/xdata/XDataUpgradeManager';
import { MobileControlsManager } from './controls/MobileControlsManager';
import { WorldFactory } from './WorldFactory';
import { PauseMenuFactory } from './menus/PauseMenuFactory';

@singleton()
export class Game {
    private world: World;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private floatingIndicatorCamera: THREE.PerspectiveCamera; // Separate camera for floating indicators to render on a different layer
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private ssaoPass!: SSAOPass;
    private bloomPass!: UnrealBloomPass;
    private physicsWorld: CANNON.World;
    private defaultMaterial: CANNON.Material;

    private pauseMenu: PauseMenu;

    private player!: Player;

    private clock: THREE.Clock = new THREE.Clock();
    private currentScene: string = 'startScreen';

    // Debug
    private physicsDebugger: any;
    private debugMode: boolean = false;
    private debugMeshes: THREE.Mesh[] = [];

    // Input State
    private wasInventoryPressed: boolean = false;
    private wasSelectPressed: boolean = false;
    private wasL3Pressed: boolean = false; // Track L3 button for debug value editor toggle
    private wasR3Pressed: boolean = false; // Track R3 button for debug mode toggle
    private wasJustInteracted: boolean = false; // Prevent immediate action (e.g. pickup or NPC interaction)
    private wasPausePressed: boolean = false; // Track pause button for edge detection (independent of Player.updateState)
    private wasAnyMenuOpen: boolean = false; // Track menu state for jump suppression after menu close
    private isTransitioning: boolean = false;

    // Last teleporter position for respawn (starts at lobby spawn)
    private lastTeleporterPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.5, 0);

    // Camera follow offset
    private cameraOffset: THREE.Vector3 = new THREE.Vector3(7, 9, 7);

    constructor(
        private readonly inputManager: InputManager,
        private readonly audioManager: AudioManager,
        private readonly playerRegistry: PlayerRegistry,
        private readonly playerFactory: PlayerFactory,
        private readonly uiManager: UIManager,
        private readonly saveManager: SaveManager,
        private readonly debugValueEditor: DebugValueEditor,
        private readonly dungeonSelectionManager: DungeonSelectionManager,
        private readonly inventoryManager: InventoryManager,
        private readonly WeaponTrader: WeaponTrader,
        private readonly chipTrader: WeaponTrader,
        private readonly coreTrader: WeaponTrader,
        private readonly npcDialogueManager: NpcDialogueManager,
        private readonly xDataUpgradeManager: XDataUpgradeManager,
        private readonly cardManager: CardManager,
        private readonly worldFactory: WorldFactory,
        // Inject MobileControlsManager lazy so that the mobile state is captured correctly
        @inject(delay(() => MobileControlsManager)) private readonly mobileControlsManager: MobileControlsManager,
        pauseMenuFactory: PauseMenuFactory) {

        // Setup Three.js scene
        this.scene = new THREE.Scene();
        container.registerInstance(THREE.Scene, this.scene);
        this.scene.background = null;

        const bgGeometry = new THREE.PlaneGeometry(9999, 9999);
        bgGeometry.rotateX(-Math.PI / 2);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x121212,
            depthWrite: false // Makes sure this stays in the background
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
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.composer = new EffectComposer(this.renderer);

        const mainRenderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(mainRenderPass);

        const ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
        this.composer.addPass(ssaoPass);
        this.ssaoPass = ssaoPass;
        ssaoPass.kernelRadius = 0.2;
        ssaoPass.minDistance = 0.005;
        ssaoPass.maxDistance = 0.1;

        // Bloom – selective via luminance threshold; only bright emissive objects (skills, level-up, teleporter) bloom
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.15,   // strength
            0.1,   // radius
            1   // threshold – only pixels brighter than this bloom
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // Restore Performance Mode setting from localStorage (Performance Mode on = all post-processing off)
        const savedPerfMode = localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY);
        if (savedPerfMode === 'true') {
            ssaoPass.enabled = false;
            bloomPass.enabled = false;
        }

        const floatingIndicatorRenderPass = new RenderPass(this.scene, this.floatingIndicatorCamera);
        floatingIndicatorRenderPass.clear = false; // Don't clear the depth buffer so it renders on top of the main scene
        this.composer.addPass(floatingIndicatorRenderPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

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
        container.registerInstance(CANNON.World, this.physicsWorld);

        // Create physics material with no friction (player movement handles slope sliding manually)
        this.defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
            friction: 0,
            restitution: 0
        });
        this.physicsWorld.addContactMaterial(defaultContactMaterial);
        container.registerInstance(CANNON.Material, this.defaultMaterial);

        // Restore Control Hints setting from localStorage (default: shown)
        const savedControlHints = localStorage.getItem(CONTROL_HINTS_STORAGE_KEY);
        if (savedControlHints === 'false') {
            this.uiManager.controlHintsEnabled = false;
        }

        this.world = this.worldFactory.createWorld(
            () => this.onInitialLoadComplete(),
            (loaded: number, total: number) => this.onInitialLoadProgress(loaded, total),
            // onStageLoadStartCallback
            () => this.uiManager.showLoadingScreen(),
            // onStageLoadCompleteCallback,
            () => this.uiManager.hideLoadingScreen());

        this.pauseMenu = pauseMenuFactory.createPauseMenu(
            !this.ssaoPass.enabled, this.uiManager.controlHintsEnabled,
            {
                onContinue: () => { },
                onTogglePerformanceMode: () => {
                    this.ssaoPass.enabled = !this.ssaoPass.enabled;
                    const perfMode = !this.ssaoPass.enabled;
                    this.bloomPass.enabled = !perfMode;
                    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, String(perfMode));

                    return perfMode;
                },
                onToggleControlHints: () => {
                    this.uiManager.controlHintsEnabled = !this.uiManager.controlHintsEnabled;
                    if (!this.uiManager.controlHintsEnabled) {
                        this.uiManager.hideControlHints();
                    }
                    localStorage.setItem(CONTROL_HINTS_STORAGE_KEY, String(this.uiManager.controlHintsEnabled));
                    return this.uiManager.controlHintsEnabled;
                },
            }
        );
        // Resize Handler
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Auto-save when tab becomes hidden (mobile/desktop)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Only auto-save if we're not on the start screen, have saveManager initialized, and have an active player
                if (this.currentScene !== 'startScreen' && this.saveManager && this.playerRegistry.hasActivePlayer()) {
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
            this.debugValueEditor = debugValueEditor;

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
        this.uiManager.hideLoadingScreen();
        this.uiManager.showStartScreen();
        this.initializeEntities();
        this.audioManager.setStageMusic('startScreen');

        // Start Loop
        this.animate();
    }

    private onInitialLoadProgress(loaded: number, total: number): void {
        this.uiManager.updateLoadingProgress(loaded, total)
    }

    initializeEntities() {
        this.clock = new THREE.Clock();

        // Set up player
        const initialSpawn = this.world.currentStage ? this.world.currentStage.spawnPosition : new CANNON.Vec3(0, 0.4, 0);
        this.player = this.playerFactory.createPlayer(initialSpawn);
        this.playerRegistry.addPlayer(this.player);

        this.player = this.playerRegistry.activePlayers[0];
        this.player.setDeathCallback(() => this.handlePlayerDeath());
        this.player.onSkillUnlocked = (skillIndex: number) => this.handleSkillUnlocked(skillIndex);
        this.player.onBreakableHit = (breakable: Breakable) => {
            // Find the barrel that matches this breakable and destroy it
            for (const barrel of this.world.getBreakableBarrels()) {
                if (barrel === breakable) {
                    this.world.destroyBarrel(barrel, this.player);
                    break;
                }
            }
        };

        // Register player with UI so skill indicators are created
        this.uiManager.registerPlayer(this.player);

        // Set up teleporter callback for handling teleporter interactions
        Teleporter.setTeleporterCallback((destination: string) => {
            if (destination === 'selection') {
                this.dungeonSelectionManager.show((dungeonId: string) => {
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

        // Apply death penalty immediately at the moment of death so players
        // cannot quit the game on the death screen to avoid the punishment.
        const penalty = this.player.applyDeathPenalty();

        this.uiManager.showDeathOverlay(
            () => this.respawnPlayer(),
            () => this.returnToLobby(),
            penalty
        );
    }

    /**
     * Respawn the player at the last teleporter position
     * Fully reloads the current stage to reset enemies
     */
    respawnPlayer() {
        console.log('Game: Respawning player at last teleporter');
        this.uiManager.hideDeathOverlay();

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
        this.uiManager.hideDeathOverlay();

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
        return this.inventoryManager.isVisible ||
            this.WeaponTrader.isVisible ||
            this.chipTrader.isVisible ||
            this.coreTrader.isVisible ||
            this.dungeonSelectionManager.isVisible ||
            this.npcDialogueManager.isVisible ||
            this.xDataUpgradeManager.isVisible ||
            this.saveManager.isVisible ||
            this.cardManager.isVisible ||
            this.pauseMenu.visible ||
            this.uiManager.isSkillUnlockOverlayVisible();
    }

    private handleSkillUnlocked(skillIndex: number): void {
        // Healing skill is unlocked at all times - unlock indeces start at 1
        if (skillIndex === 1) {
            this.uiManager.showSkillUnlockOverlay(
                'Laser Skill Unlocked',
                'Fires a focused ranged blast that pierces through enemies.',
                '<span class="key-icon">Q</span> + <span class="key-icon">SPACE</span> / <span class="btn-icon xbox-lb">LB</span> + <span class="btn-icon xbox-a">A</span> / Mobile: Tap Laser HUD icon',
            );
            return;
        }

        if (skillIndex === 2) {
            this.uiManager.showSkillUnlockOverlay(
                'Area Skill Unlocked',
                'Releases a high-damage expanding shockwave around the player.',
                '<span class="key-icon">Q</span> + <span class="key-icon">K</span> / <span class="btn-icon xbox-lb">LB</span> + <span class="btn-icon xbox-x">X</span> / Mobile: Tap Area HUD icon',
            );
        }
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
            // Update teleporters
            this.world.currentStage.teleporters.forEach(tp => tp.updateScaleFactor());

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
            const loreIntro = new LoreIntroduction(this.inputManager, this.saveManager, () => this.continueAfterIntro());
            loreIntro.show();
        }
    }

    private continueAfterIntro() {
        this.currentScene = Lobby.getMetadata().id;
        this.audioManager.setStageMusic(Lobby.getMetadata().id);
        this.inputManager.consumeJump();
        this.clock.getDelta(); // Reset clock
        this.isTransitioning = false;
    }

    private isStartScreenAdvancePressed(): boolean {
        if (this.inputManager.isStartPressed()) {
            return true;
        }

        if (!this.mobileControlsManager.isMobile) {
            return false;
        }

        return (this.mobileControlsManager.isJumpPressed)
            || (this.mobileControlsManager.isCancelPressed)
            || (this.mobileControlsManager.isAttackPressed);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.currentScene === 'startScreen') {
            this.uiManager.showStartScreen();
            // Show the main menu after START is pressed (but not while already transitioning
            // or while the menu is already visible)
            if (!this.isTransitioning && !this.uiManager.isStartMenuShowing() &&
                (this.isStartScreenAdvancePressed() || this.uiManager.startScreenTapped)) {
                this.isTransitioning = true;
                this.uiManager.showStartMenu(
                    this.saveManager.hasLocalStorageSave(),
                    (option, file) => this.onStartMenuSelect(option, file),
                );
            }
            return;
        }

        // Lore introduction is active — the LoreIntroduction class handles its own rendering
        if (this.currentScene === 'lore') {
            // Act as if a menu is open on the lore introduction screen so the introduction can be skipped with the B button
            this.inputManager.menuOpen = true;
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
            const isL3Pressed = this.inputManager.isL3Pressed();
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
            const isR3Pressed = this.inputManager.isR3Pressed();
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
        const isInventoryPressed = this.inputManager.isInventoryPressed();
        if (isInventoryPressed && !this.wasInventoryPressed) {
            // Don't allow toggling inventory while any other UI is open
            if (!this.isAnyMenuOpen() || this.inventoryManager.isVisible) {
                this.inventoryManager.toggle();
            }
        }
        this.wasInventoryPressed = isInventoryPressed;

        // Check pause menu toggle (ESC / Start)
        // Uses local wasPausePressed for edge detection because Player.updateState()
        // is not called while menus are open (preventMovement early-return).
        // Only opens the menu here; PauseMenu's own inputLoop handles closing.
        const isPausePressed = this.inputManager.isPausePressed();
        if (isPausePressed && !this.wasPausePressed) {
            if (!this.pauseMenu.visible && !this.isAnyMenuOpen() && !this.uiManager.isDeathOverlayVisible()) {
                this.pauseMenu.show();
            }
        }
        this.wasPausePressed = isPausePressed;

        // Update inventory if visible (pass input for navigation)
        if (this.inventoryManager.isVisible) {
            this.inventoryManager.update(this.player);
        }

        // Update trader if visible
        if (this.WeaponTrader.isVisible) {
            this.WeaponTrader.update(this.player);
        }

        // Update dungeon selection if visible
        if (this.dungeonSelectionManager.isVisible) {
            this.dungeonSelectionManager.update();
        }

        // Update NPC dialogue if visible
        const wasDialogueVisible = this.npcDialogueManager.isVisible;
        if (this.npcDialogueManager.isVisible) {
            this.npcDialogueManager.update();
        }

        // Update X-Data upgrade if visible
        if (this.xDataUpgradeManager.isVisible) {
            this.xDataUpgradeManager.update(this.player);
        }

        // Update chip trader if visible
        if (this.chipTrader.isVisible) {
            this.chipTrader.update(this.player);
        }

        // Update core trader if visible
        if (this.coreTrader.isVisible) {
            this.coreTrader.update(this.player);
        }

        // Update save manager if visible
        if (this.saveManager.isVisible) {
            this.saveManager.update();
        }

        // Update card manager if visible
        if (this.cardManager.isVisible) {
            this.cardManager.update(this.player);
        }

        // Update mobile skills button visibility based on any menu being open
        if (this.mobileControlsManager.isMobile) {
            this.mobileControlsManager.setSkillsButtonVisible(!this.isAnyMenuOpen());
        }

        // Check if player is near any interactive entity (to prevent jumping while interacting)
        const anyMenuOpen = this.isAnyMenuOpen();

        // Keep InputManager informed so B button knows whether to act as block or cancel
        this.inputManager.menuOpen = anyMenuOpen;

        // Suppress jump and block when a menu just closed so the A/B-button press that
        // confirmed/cancelled the menu action does not also make the player jump or block.
        if (this.wasAnyMenuOpen && !anyMenuOpen) {
            this.inputManager.consumeJump();
            this.inputManager.consumeCancel();
        }
        this.wasAnyMenuOpen = anyMenuOpen;

        // Define interactive entity types
        interface InteractiveEntity {
            type: InteractiveEntityType;
            data?: any;
            hint: string;
            action: () => void;
        }

        let nearbyInteractive: InteractiveEntity | null = null;

        if (!anyMenuOpen) {
            // Auto-pickup XData, money, and potion drops
            const autoPickupDrop = this.world.checkNearestAutoPickupDrop(this.player.position);
            if (autoPickupDrop && autoPickupDrop.canPickup(this.player)) {
                this.world.pickupDrop(autoPickupDrop, this.player);
            }

            // Check NPCs
            const allNpcs = this.world.getAllNpcs();
            for (const npc of allNpcs) {
                if (npc.isPlayerNearby(this.player.position)) {
                    nearbyInteractive = {
                        type: InteractiveEntityType.NPC,
                        data: npc,
                        hint: npc.getInteractionHint(this.inputManager),
                        action: () => {
                            // If dialogue hasn't been shown yet, show it first
                            if (!npc.hasShownDialogue() && npc.dialogue.length > 0) {
                                // Show dialogue, then call the interaction callback when complete
                                this.npcDialogueManager.show(npc, () => {
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
                                    this.npcDialogueManager.show(npc);
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
                        hint: getHint(HintConfigs.pickUp, this.inputManager),
                        action: () => {
                            this.world.pickupDrop(interactiveDrop, this.player);
                        }
                    };
                }
            }

            // Check loot chests (unopened only)
            if (!nearbyInteractive) {
                for (const chest of this.world.getLootChests()) {
                    if (!chest.isOpened && chest.isPlayerNearby(this.player.position)) {
                        chest.prepareLoot(this.player);
                        nearbyInteractive = {
                            type: InteractiveEntityType.CHEST,
                            data: chest,
                            hint: chest.getInteractionHint(this.inputManager),
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
        // Prevent updates when in a menu
        if (!this.pauseMenu.visible) {
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

            if (!anyMenuOpen) {
                this.physicsWorld.step(1 / 60, dt, 3);

                // Prevent jumping in the frame(s) immediately after interacting
                const preventJump = isNearInteractive || this.wasJustInteracted;
                this.player.update(dt, preventJump, anyMenuOpen);
                this.world.update(dt, this.player, this.camera.position, anyMenuOpen);

                const minimapState = this.world.getCurrentMinimapState();
                this.uiManager.setMinimapState(minimapState.layout, minimapState.visible);

                this.uiManager.update(this.player, dt);

                // Handle death overlay input
                this.uiManager.handleDeathOverlayInput(this.inputManager);
                this.uiManager.handleSkillUnlockOverlayInput(this.inputManager);
            }
        }

        if (this.debugMode && this.physicsDebugger) {
            this.physicsDebugger.update();
        }

        // Update debug value editor if visible
        if (this.debugMode && this.debugValueEditor) {
            this.debugValueEditor.update(this.player, dt);
        }

        // Handle interactions (use variables we already calculated)
        const isSelectPressed = this.inputManager.isSelectPressed();

        if (nearbyInteractive) {
            this.uiManager.showInteractionHint(true, nearbyInteractive.hint);

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
            this.uiManager.showInteractionHint(false);
        }

        // Reset trader just opened flag when select is released
        if (!isSelectPressed && this.wasJustInteracted) {
            this.wasJustInteracted = false;
        }

        this.wasSelectPressed = isSelectPressed;
        this.composer.render();
    }
}
