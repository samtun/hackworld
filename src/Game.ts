import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { Player } from './Player';
import { World } from './World';
import { InputManager } from './InputManager';
import { UIManager } from './UIManager';
import { InventoryManager } from './InventoryManager';
import { TraderManager } from './TraderManager';
import { ChipTraderManager } from './ChipTraderManager';
import { DungeonSelectionManager } from './DungeonSelectionManager';
import { NPCDialogueManager } from './NPCDialogueManager';
import { XDataUpgradeManager } from './xdata/XDataUpgradeManager';
import { AVAILABLE_DUNGEONS } from './stages';
import { DebugValueEditor } from './DebugValueEditor';

export class Game {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    physicsWorld: CANNON.World;
    defaultMaterial: CANNON.Material;

    player: Player;
    world: World;
    input: InputManager;
    ui: UIManager;
    inventory: InventoryManager;
    trader: TraderManager;
    chipTrader: ChipTraderManager;
    dungeonSelection: DungeonSelectionManager;
    npcDialogue: NPCDialogueManager;
    xDataUpgrade: XDataUpgradeManager;

    clock: THREE.Clock;
    debugOutputFrequency: number = 1
    debugOutputDelta: number = 0
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
    wasTraderJustOpened: boolean = false; // Prevent immediate action when opening trader
    isTransitioning: boolean = false;

    // Last teleporter position for respawn
    lastTeleporterPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0.5, 0);

    constructor() {
        // Setup Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x202020);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        // Isometric-ish view
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
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
        this.physicsWorld.gravity.set(0, -30, 0);

        // Create a slippery material (friction = 0)
        this.defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
            friction: 0,
            restitution: 0
        });
        this.physicsWorld.addContactMaterial(defaultContactMaterial);

        // Setup Game Objects
        this.input = new InputManager();
        this.ui = new UIManager();
        this.world = new World(this.scene, this.physicsWorld, this.defaultMaterial, () => {
            this.ui.hideLoadingScreen();
            this.ui.showStartScreen();
        }, (loaded, total) => {
            this.ui.updateLoadingProgress(loaded, total);
        });
        this.player = new Player(this.scene, this.physicsWorld, this.input, this.defaultMaterial);
        this.inventory = new InventoryManager();
        this.trader = new TraderManager();
        this.chipTrader = new ChipTraderManager();
        this.dungeonSelection = new DungeonSelectionManager(AVAILABLE_DUNGEONS);
        this.npcDialogue = new NPCDialogueManager();
        this.xDataUpgrade = new XDataUpgradeManager();
        this.clock = new THREE.Clock();

        // Set up Ford NPC callback for X-Data upgrades
        this.world.setFordCallback(() => {
            this.xDataUpgrade.show();
        });

        // Set up player death callback
        this.player.setDeathCallback(() => {
            this.handlePlayerDeath();
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

            window.addEventListener('keydown', (e) => {
                if (e.code === 'F8') {
                    this.debugMode = !this.debugMode;
                    this.debugMeshes.forEach(mesh => {
                        mesh.visible = this.debugMode;
                    });
                    
                    // Toggle debug value editor visibility
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

        // Resize Handler
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Start Loop
        this.animate();
    }

    switchScene(destination?: string) {
        // Use loadStage helper method
        if (destination) {
            this.world.loadStage(destination);
            this.currentScene = destination;
        }

        // Reset player position to ground level (0.5 = half height of 1-unit box)
        this.player.body.position.set(0, 0.5, 0);
        this.player.body.velocity.set(0, 0, 0);

        // Update last teleporter position when entering a dungeon or lobby
        this.lastTeleporterPosition.copy(this.player.body.position);

        // Snap camera
        this.camera.position.set(10, 15, 10);
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
     */
    respawnPlayer() {
        console.log('Game: Respawning player at last teleporter');
        this.ui.hideDeathOverlay();
        this.player.respawn(this.lastTeleporterPosition);
    }

    /**
     * Return player to the lobby
     */
    returnToLobby() {
        console.log('Game: Returning to lobby');
        this.ui.hideDeathOverlay();
        
        // Respawn player at lobby spawn point without updating lastTeleporterPosition
        const lobbySpawnPoint = new CANNON.Vec3(0, 0.5, 0);
        this.player.respawn(lobbySpawnPoint);
        
        // Switch to lobby (but don't update lastTeleporterPosition for death returns)
        this.world.loadStage('lobby');
        this.currentScene = 'lobby';
        
        // Reset camera
        this.camera.position.set(10, 15, 10);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.currentScene === 'startScreen') {
            this.ui.showStartScreen();

            if (!this.isTransitioning && (this.input.isStartPressed() || import.meta.env.DEV)) {
                this.isTransitioning = true;
                this.ui.triggerStartTransition(() => {
                    this.ui.hideStartScreen();
                    this.currentScene = 'lobby';
                    this.clock.getDelta(); // Reset clock
                    this.isTransitioning = false;
                });
            }
            return;
        }

        const dt = this.clock.getDelta();

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
                    } else {
                        // Show and expand the editor
                        this.debugMode = true;
                        this.debugMeshes.forEach(mesh => {
                            mesh.visible = this.debugMode;
                        });
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
                this.debugMeshes.forEach(mesh => {
                    mesh.visible = this.debugMode;
                });
                
                // Toggle debug value editor visibility
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
            if (!this.trader.isVisible && !this.dungeonSelection.isVisible && !this.npcDialogue.isVisible && !this.xDataUpgrade.isVisible) {
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

        // Check if player is near any interactive entity (to prevent jumping while interacting)
        const anyMenuOpen = this.inventory.isVisible || this.trader.isVisible || this.chipTrader.isVisible || this.dungeonSelection.isVisible || this.npcDialogue.isVisible || this.xDataUpgrade.isVisible;
        
        // Define interactive entity types
        interface InteractiveEntity {
            type: 'npc' | 'trader' | 'chipTrader' | 'weaponDrop' | 'portal';
            data?: any;
            hint: string;
            action: () => void;
        }
        
        let nearbyInteractive: InteractiveEntity | null = null;
        
        if (!anyMenuOpen) {
            // Check NPCs (including dialogue NPCs and Ford)
            const allNPCs = this.world.getAllNPCs();
            for (const npc of allNPCs) {
                if (npc.isPlayerNearby(this.player.mesh.position)) {
                    nearbyInteractive = {
                        type: 'npc',
                        data: npc,
                        hint: npc.getInteractionHint(),
                        action: () => {
                            if (npc.interactionCallback) {
                                npc.interact();
                            } else {
                                this.npcDialogue.show(npc);
                            }
                        }
                    };
                    break;
                }
            }
            
            // Check weapon drop (higher priority than traders)
            if (!nearbyInteractive) {
                const weaponDropNearby = this.world.checkWeaponDropInteraction(this.player.mesh.position);
                if (weaponDropNearby) {
                    nearbyInteractive = {
                        type: 'weaponDrop',
                        data: weaponDropNearby,
                        hint: '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Pick up ' + weaponDropNearby.weaponName,
                        action: () => {
                            this.world.pickupWeaponDrop(weaponDropNearby, this.player);
                        }
                    };
                }
            }
            
            // Check weapon trader
            if (!nearbyInteractive && this.world.checkTraderInteraction(this.player.mesh.position)) {
                nearbyInteractive = {
                    type: 'trader',
                    hint: '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Talk to Trader',
                    action: () => {
                        this.trader.show();
                    }
                };
            }
            
            // Check chip trader
            if (!nearbyInteractive && this.world.checkChipTraderInteraction(this.player.mesh.position)) {
                nearbyInteractive = {
                    type: 'chipTrader',
                    hint: '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Talk to Chip Trader',
                    action: () => {
                        this.chipTrader.show();
                    }
                };
            }
            
            // Check portal
            if (!nearbyInteractive) {
                const destination = this.world.checkPortalInteraction(this.player.mesh.position);
                if (destination) {
                    nearbyInteractive = {
                        type: 'portal',
                        data: destination,
                        hint: '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Enter Portal',
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

        // Update Game Logic (only if inventory, trader, dungeon selection, and NPC dialogue are closed)
        if (!anyMenuOpen) {
            // Step Physics
            this.physicsWorld.step(1 / 60, dt, 3);

            if (this.debugMode && this.physicsDebugger) {
                this.physicsDebugger.update();
            }

            this.player.update(dt, this.world.enemies, isNearInteractive);
            this.world.update(dt, this.player, this.camera.position);
        }

        this.ui.update(this.player);

        // Update debug value editor if visible
        if (this.debugMode && this.debugValueEditor) {
            this.debugValueEditor.update(this.player);
        }

        // Camera Follow
        const targetX = this.player.mesh.position.x + 10;
        const targetY = this.player.mesh.position.y + 10;
        const targetZ = this.player.mesh.position.z + 10;

        const lerpFactor = Math.min(5 * dt, 1);
        this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor;
        this.camera.position.y += (targetY - this.camera.position.y) * lerpFactor;
        this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor;

        // Handle interactions (use variables we already calculated)
        const isSelectPressed = this.input.isSelectPressed();

        if (nearbyInteractive) {
            this.ui.showInteractionHint(true, nearbyInteractive.hint);

            // Check for interaction - prevent if just opened a menu or dialogue was just closed
            const shouldPreventInteraction = this.wasTraderJustOpened || 
                                           (nearbyInteractive.type === 'npc' && wasDialogueVisible);
            
            if (isSelectPressed && !this.wasSelectPressed && !shouldPreventInteraction) {
                nearbyInteractive.action();
                
                // Set flag if we just opened a trader to prevent immediate action
                if (nearbyInteractive.type === 'trader' || nearbyInteractive.type === 'chipTrader') {
                    this.wasTraderJustOpened = true;
                }
            }
        } else {
            // Hide hint if not near anything interactive
            this.ui.showInteractionHint(false);
        }
        
        // Reset trader just opened flag when select is released
        if (!isSelectPressed && this.wasTraderJustOpened) {
            this.wasTraderJustOpened = false;
        }

        // Handle extra debug outputs
        if (this.debugMode) {
            if (this.debugOutputDelta >= this.debugOutputFrequency) {
                console.log("Player position: " + this.player.body.position);
                this.debugOutputDelta = 0;
            } else {
                this.debugOutputDelta += dt;
            }
        }

        this.wasSelectPressed = isSelectPressed;

        this.renderer.render(this.scene, this.camera);
    }
}
