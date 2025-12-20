import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { Player } from './Player';
import { World } from './World';
import { InputManager } from './InputManager';
import { UIManager } from './UIManager';
import { InventoryManager } from './InventoryManager';
import { TraderManager } from './TraderManager';
import { DungeonSelectionManager } from './DungeonSelectionManager';
import { NPCDialogueManager } from './NPCDialogueManager';
import { XDataUpgradeManager } from './xdata/XDataUpgradeManager';
import { DeathScreenManager } from './DeathScreenManager';
import { NPC } from './NPC';
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
    dungeonSelection: DungeonSelectionManager;
    npcDialogue: NPCDialogueManager;
    xDataUpgrade: XDataUpgradeManager;
    deathScreen: DeathScreenManager;

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
    isTransitioning: boolean = false;

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
        this.dungeonSelection = new DungeonSelectionManager(AVAILABLE_DUNGEONS);
        this.npcDialogue = new NPCDialogueManager();
        this.xDataUpgrade = new XDataUpgradeManager();
        this.deathScreen = new DeathScreenManager();
        this.clock = new THREE.Clock();

        // Set up Ford NPC callback for X-Data upgrades
        this.world.setFordCallback(() => {
            this.xDataUpgrade.show();
        });

        // Set up death screen callbacks
        this.deathScreen.onRetry = () => {
            this.handleRetry();
        };

        this.deathScreen.onReturnToLobby = () => {
            this.handleReturnToLobby();
        };

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

        // Track last teleporter position for respawning
        this.player.setLastTeleporter(new THREE.Vector3(0, 0.5, 0), this.currentScene);

        // If entering lobby, clear collected items tracking
        if (destination === 'lobby') {
            this.player.clearCollectedItems();
            this.world.clearDroppedItems();
        }

        // Snap camera
        this.camera.position.set(10, 15, 10);
    }

    /**
     * Handle retry after death - respawn at last teleporter with items dropped
     */
    handleRetry() {
        // Use the saved death position (captured when player died)
        const deathPosition = this.player.deathPosition.clone();

        // Respawn player with full HP/TP at last teleporter
        this.player.respawn(true);

        // Drop items that were collected since last lobby visit at death position
        if (this.player.itemsCollectedSinceLastLobby.length > 0) {
            this.world.createDroppedItems(deathPosition, this.player.itemsCollectedSinceLastLobby);
        }

        // Hide death screen
        this.deathScreen.hide();

        console.log(`Player retried - respawned at last teleporter in ${this.currentScene}`);
    }

    /**
     * Handle return to lobby after death - lose all collected items
     */
    handleReturnToLobby() {
        // Remove items that were collected since last lobby visit from inventory
        for (const itemId of this.player.itemsCollectedSinceLastLobby) {
            const index = this.player.inventory.findIndex(item => item.id === itemId);
            if (index !== -1) {
                console.log(`Removing ${this.player.inventory[index].name} from inventory (lost on death)`);
                this.player.inventory.splice(index, 1);
            }
        }

        // Clear collected items tracking
        this.player.clearCollectedItems();

        // Respawn player with full HP/TP
        this.player.respawn(true);

        // Return to lobby
        this.switchScene('lobby');

        // Hide death screen
        this.deathScreen.hide();

        console.log('Player returned to lobby - lost all collected items since last visit');
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
        // Debug Mode: Check for Select+Start combination first (dev builds only)
        // This needs to be checked before inventory to prevent conflict with Select button
        let selectAndStartHandled = false;
        if (import.meta.env.DEV) {
            const isSelectAndStartPressed = this.input.isSelectAndStartPressed();
            if (isSelectAndStartPressed && !this.wasSelectAndStartPressed) {
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
                        console.log('Debug Mode: ON (via controller)');
                    }
                }
                selectAndStartHandled = true;
            }
            this.wasSelectAndStartPressed = isSelectAndStartPressed;
        }

        // Check inventory toggle (but not if Select+Start was just pressed)
        const isInventoryPressed = this.input.isInventoryPressed();
        if (isInventoryPressed && !this.wasInventoryPressed && !selectAndStartHandled) {
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

        // Update death screen if visible
        if (this.deathScreen.isVisible) {
            this.deathScreen.update(this.input);
        }

        // Check for player death (only if not already dead and death screen not visible)
        if (!this.player.isDead && !this.deathScreen.isVisible && this.player.hp <= 0) {
            this.player.die();
            // Show death screen immediately
            this.deathScreen.show();
        }

        // Check if player is near any interactive entity (to prevent jumping while interacting)
        const anyMenuOpen = this.inventory.isVisible || this.trader.isVisible || this.dungeonSelection.isVisible || this.npcDialogue.isVisible || this.xDataUpgrade.isVisible || this.deathScreen.isVisible;
        const isNearTrader = !anyMenuOpen && this.world.checkTraderInteraction(this.player.mesh.position);
        const weaponDropNearby = !anyMenuOpen ? this.world.checkWeaponDropInteraction(this.player.mesh.position) : null;
        const destination = !anyMenuOpen ? this.world.checkPortalInteraction(this.player.mesh.position) : null;
        
        // Check dropped items (from player death)
        const droppedItemsNearby = !anyMenuOpen && this.world.checkDroppedItemsInteraction(this.player.mesh.position);
        
        // Check NPCs
        let npcNearby: NPC | null = null;
        if (!anyMenuOpen) {
            const allNPCs = this.world.getAllNPCs();
            for (const npc of allNPCs) {
                if (npc.isPlayerNearby(this.player.mesh.position)) {
                    npcNearby = npc;
                    break;
                }
            }
        }

        const isNearInteractive = isNearTrader ||
            npcNearby != null ||
            weaponDropNearby != null ||
            droppedItemsNearby ||
            destination != null;

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

        if (npcNearby) {
            this.ui.showInteractionHint(true, npcNearby.getInteractionHint());

            // Check for interaction (but not if dialogue was just closed this frame)
            if (isSelectPressed && !this.wasSelectPressed && !wasDialogueVisible) {
                // Check if NPC has a callback (like Ford's upgrade UI)
                if (npcNearby.interactionCallback) {
                    npcNearby.interact();
                } else {
                    // Default behavior: show dialogue
                    this.npcDialogue.show(npcNearby);
                }
            }
        } else if (droppedItemsNearby && !anyMenuOpen) {
            // Show dropped items hint (prioritize over weapon drops)
            this.ui.showInteractionHint(true, '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Pick up Dropped Items');

            // Check for interaction
            if (isSelectPressed && !this.wasSelectPressed) {
                const itemIds = this.world.pickupDroppedItems();
                // Remove items from the "collected since lobby" tracking list
                this.player.removeCollectedItems(itemIds);
                console.log(`Picked up ${itemIds.length} dropped items`);
            }
        } else if (weaponDropNearby && !anyMenuOpen) {
                // Show weapon drop hint (prioritize over trader and portal)
                this.ui.showInteractionHint(true, '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Pick up ' + weaponDropNearby.weaponName);

                // Check for interaction
                if (isSelectPressed && !this.wasSelectPressed) {
                    const itemId = this.world.pickupWeaponDrop(weaponDropNearby, this.player);
                    // Track this item as collected since last lobby visit (unless we're in lobby)
                    if (this.currentScene !== 'lobby' && itemId) {
                        this.player.addCollectedItem(itemId);
                    }
                }
            } else if (isNearTrader) {
                // Show trader hint
                this.ui.showInteractionHint(true, '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Talk to Trader');

                // Check for interaction
                if (isSelectPressed && !this.wasSelectPressed) {
                    this.trader.show();
                }
            } else if (destination) {
                // Show portal hint
                this.ui.showInteractionHint(true, '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Enter Portal');

                // Check for portal interaction
                if (isSelectPressed && !this.wasSelectPressed) {
                    // If destination is 'selection', show dungeon selection UI
                    if (destination === 'selection') {
                        this.dungeonSelection.show((dungeonId: string) => {
                            this.switchScene(dungeonId);
                        });
                    } else {
                        // Otherwise, directly switch to the destination
                        this.switchScene(destination);
                    }
                }
            } else {
                // Hide hint if not near anything interactive
                this.ui.showInteractionHint(false);
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
