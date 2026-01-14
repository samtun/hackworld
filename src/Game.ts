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

export class Game {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
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
        this.scene.background = new THREE.Color(0x121212);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
        // Isometric-ish view
        this.camera.position.copy(this.cameraOffset);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
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

        // Create a slippery material (friction = 0)
        this.defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
            friction: 0,
            restitution: 0
        });
        this.physicsWorld.addContactMaterial(defaultContactMaterial);

        // Setup Game Objects
        this.input = InputManager.Instance;
        this.ui = UIManager.Instance;
        this.world = new World(this.scene, this.physicsWorld, this.defaultMaterial, () => {
            this.ui.hideLoadingScreen();
            this.ui.showStartScreen();
            this.initializeEntities();

            // Start Loop
            this.animate();
        },
            (loaded, total) => this.ui.updateLoadingProgress(loaded, total),
            () => this.ui.showLoadingScreen(),
            () => this.ui.hideLoadingScreen());

        // Resize Handler
        window.addEventListener('resize', () => this.onWindowResize(), false);

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
        const initialSpawn = this.world.currentStage ? this.world.currentStage.spawnPosition : new CANNON.Vec3(0, 0.5, 0);
        this.playerRegistry.addPlayer(new Player(this.scene, this.physicsWorld, initialSpawn, this.input, this.defaultMaterial));
        this.player = this.playerRegistry.activePlayers[0];
        this.player.setDeathCallback(() => this.handlePlayerDeath());

        // Set up damage number callback for player
        this.player.onDamageTaken = (position: CANNON.Vec3, amount: number) => {
            this.world.spawnDamageNumber(position, amount, '#ff2424ff');
        };

        // Set up tech indicator callback for player
        this.player.onTechGained = (position: CANNON.Vec3) => {
            this.world.spawnTechIndicator(position);
        };
    }

    switchScene(destination: string) {
        // Use loadStage helper method
        this.world.loadStageById(destination).then(() => {
            // Get spawn position from stage configuration
            const targetPos = this.world.currentStage
                ? this.world.currentStage.spawnPosition
                : new CANNON.Vec3(0, 0.5, 0);

            // Move player and clear velocities/rotation to prevent any impulse from previous physics steps
            this.player.move(targetPos);
            this.player.body.velocity.set(0, 0, 0);
            if (this.player.body.angularVelocity) this.player.body.angularVelocity.set(0, 0, 0);

            // Update last teleporter position when entering a stage via portal
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
            this.cardManager.isVisible;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Update particle scale factors for screen-independent sizing
        if (this.world.currentStage) {
            // Update portal particles if exists
            if (this.world.currentStage.portal) {
                this.world.currentStage.portal.updateScaleFactor();
            }

            // Update healing station particles if exists (Lobby specific)
            const stage = this.world.currentStage as any;
            if (stage.healingStation && typeof stage.healingStation.updateScaleFactor === 'function') {
                stage.healingStation.updateScaleFactor();
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.currentScene === 'startScreen') {
            this.ui.showStartScreen();
            if (!this.isTransitioning && (this.input.isStartPressed() || this.ui.startScreenTapped || import.meta.env.DEV)) {
                this.isTransitioning = true;
                this.ui.triggerStartTransition(() => {
                    this.ui.hideStartScreen();
                    this.currentScene = Lobby.getMetadata().id;
                    this.input.initializeMobileControls();
                    this.clock.getDelta(); // Reset clock
                    this.isTransitioning = false;
                });
            }
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

        // Check if player is near any interactive entity (to prevent jumping while interacting)
        const anyMenuOpen = this.isAnyMenuOpen();

        // Update mobile controls button state (show close button when menu is open)
        if (this.input?.isMobile) {
            this.input.setMenuOpen(anyMenuOpen);
        }

        // Define interactive entity types
        interface InteractiveEntity {
            type: InteractiveEntityType;
            data?: any;
            hint: string;
            action: () => void;
        }

        let nearbyInteractive: InteractiveEntity | null = null;

        if (!anyMenuOpen) {
            // Auto-pickup XData drops
            const xDataDropNearby = this.world.checkXDataDropInteraction(this.player.position);
            if (xDataDropNearby) {
                this.world.pickupXDataDrop(xDataDropNearby, this.player);
            }

            // Check NPCs (including dialogue NPCs and Ford)
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
                                    // Fallback for NPCs with no callback (like Nyleth) - show dialogue again
                                    this.npcDialogue.show(npc);
                                }
                            }
                        }
                    };
                    break;
                }
            }

            // Check weapon / chip / core drops (higher priority than traders)
            if (!nearbyInteractive) {
                const weaponDropNearby = this.world.checkWeaponDropInteraction(this.player.position);
                if (weaponDropNearby) {
                    nearbyInteractive = {
                        type: InteractiveEntityType.WEAPON_DROP,
                        data: weaponDropNearby,
                        hint: getHint(HintConfigs.pickUp, this.input),
                        action: () => {
                            this.world.pickupWeaponDrop(weaponDropNearby, this.player);
                        }
                    };
                }

                if (!nearbyInteractive) {
                    const chipDropNearby = this.world.checkChipDropInteraction(this.player.position);
                    if (chipDropNearby) {
                        nearbyInteractive = {
                            type: InteractiveEntityType.CHIP_DROP,
                            data: chipDropNearby,
                            hint: getHint(HintConfigs.pickUp, this.input),
                            action: () => {
                                this.world.pickupChipDrop(chipDropNearby, this.player);
                            }
                        };
                    }
                }

                if (!nearbyInteractive) {
                    const coreDropNearby = this.world.checkCoreDropInteraction(this.player.position);
                    if (coreDropNearby) {
                        nearbyInteractive = {
                            type: InteractiveEntityType.CORE_DROP,
                            data: coreDropNearby,
                            hint: getHint(HintConfigs.pickUp, this.input),
                            action: () => {
                                this.world.pickupCoreDrop(coreDropNearby, this.player);
                            }
                        };
                    }
                }

                if (!nearbyInteractive) {
                    const boosterPackDropNearby = this.world.checkBoosterPackDropInteraction(this.player.position);
                    if (boosterPackDropNearby) {
                        nearbyInteractive = {
                            type: InteractiveEntityType.BOOSTER_PACK_DROP,
                            data: boosterPackDropNearby,
                            hint: getHint(HintConfigs.pickUp, this.input),
                            action: () => {
                                this.world.pickupBoosterPackDrop(boosterPackDropNearby, this.player);
                            }
                        };
                    }
                }
            }

            // Check portal
            if (!nearbyInteractive) {
                const destination = this.world.checkPortalInteraction(this.player.position);
                if (destination) {
                    nearbyInteractive = {
                        type: InteractiveEntityType.PORTAL,
                        data: destination,
                        hint: getHint(HintConfigs.enterPortal, this.input),
                        action: () => {
                            if (destination === 'selection') {
                                this.dungeonSelection.show((dungeonId: string) => {
                                    this.switchScene(dungeonId);
                                });
                            } else {
                                this.switchScene(destination);
                            }
                        }
                    };
                }
            }
        }

        const isNearInteractive = nearbyInteractive !== null;

        // Update Game Logic (only if no menu is open)
        if (!anyMenuOpen) {
            // Step Physics
            this.physicsWorld.step(1 / 60, dt, 3);

            if (this.debugMode && this.physicsDebugger) {
                this.physicsDebugger.update();
            }

            // Prevent jumping in the frame(s) immediately after interacting
            const preventJump = isNearInteractive || this.wasJustInteracted;
            this.player.update(dt, preventJump);
            this.world.update(dt, this.player, this.camera.position);
        }

        this.ui.update(this.player);

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
        this.renderer.render(this.scene, this.camera);
    }
}
