import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { Player } from './Player';
import { World } from './World';
import { InputManager } from './InputManager';
import { UIManager } from './UIManager';
import { InventoryManager } from './InventoryManager';
import { DungeonSelectionManager } from './DungeonSelectionManager';
import { AVAILABLE_DUNGEONS } from './stages';

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
    dungeonSelection: DungeonSelectionManager;

    clock: THREE.Clock;
    currentScene: string = 'lobby';

    // Debug
    physicsDebugger: any;
    debugMode: boolean = false;
    debugMeshes: THREE.Mesh[] = [];

    // Input State
    wasInventoryPressed: boolean = false;
    wasSelectPressed: boolean = false;

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
        this.world = new World(this.scene, this.physicsWorld, this.defaultMaterial);
        this.player = new Player(this.scene, this.physicsWorld, this.input, this.defaultMaterial);
        this.ui = new UIManager();
        this.inventory = new InventoryManager();
        this.dungeonSelection = new DungeonSelectionManager(AVAILABLE_DUNGEONS);
        this.clock = new THREE.Clock();

        // Debug Mode Setup
        if (import.meta.env.DEV) {
            this.physicsDebugger = CannonDebugger(this.scene, this.physicsWorld, {
                color: 0xff0000,
                onInit: (_body, mesh) => {
                    mesh.visible = this.debugMode;
                    this.debugMeshes.push(mesh);
                }
            });

            window.addEventListener('keydown', (e) => {
                if (e.code === 'F8') {
                    this.debugMode = !this.debugMode;
                    this.debugMeshes.forEach(mesh => {
                        mesh.visible = this.debugMode;
                    });
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

        // Reset player position
        this.player.body.position.set(0, 5, 0);
        this.player.body.velocity.set(0, 0, 0);

        // Snap camera
        this.camera.position.set(10, 15, 10);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = this.clock.getDelta();

        // Clean up debug meshes list occasionally (e.g. every frame is fine for small lists, or check length)
        if (this.debugMeshes.length > 0) {
            this.debugMeshes = this.debugMeshes.filter(m => m.parent !== null);
        }

        // Input Handling for UI
        const isInventoryPressed = this.input.isInventoryPressed();
        if (isInventoryPressed && !this.wasInventoryPressed) {
            this.inventory.toggle();
        }
        this.wasInventoryPressed = isInventoryPressed;

        // Update inventory if visible (pass input for navigation)
        if (this.inventory.isVisible) {
            this.inventory.update(this.player, this.input);
        }

        // Update dungeon selection if visible
        if (this.dungeonSelection.isVisible) {
            this.dungeonSelection.update(this.input);
        }

        // Update Game Logic (only if inventory and dungeon selection are closed)
        if (!this.inventory.isVisible && !this.dungeonSelection.isVisible) {
            // Step Physics
            this.physicsWorld.step(1 / 60, dt, 3);

            if (this.debugMode && this.physicsDebugger) {
                this.physicsDebugger.update();
            }

            this.player.update(dt, this.world.enemies);
            this.world.update(dt, this.player);
        }

        this.ui.update(this.player);

        // Camera Follow
        const targetX = this.player.mesh.position.x + 10;
        const targetY = this.player.mesh.position.y + 10;
        const targetZ = this.player.mesh.position.z + 10;

        const lerpFactor = Math.min(5 * dt, 1);
        this.camera.position.x += (targetX - this.camera.position.x) * lerpFactor;
        this.camera.position.y += (targetY - this.camera.position.y) * lerpFactor;
        this.camera.position.z += (targetZ - this.camera.position.z) * lerpFactor;

        // Check Portal
        const destination = this.world.checkPortalInteraction(this.player.mesh.position);
        const isSelectPressed = this.input.isSelectPressed();

        if (destination) {
            // Show hint
            this.ui.showInteractionHint(true, '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Enter Portal');

            // Check for interaction
            if (isSelectPressed && !this.wasSelectPressed) {
                if (!this.dungeonSelection.isVisible) {
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
            }
        } else {
            // Hide hint
            this.ui.showInteractionHint(false);
        }
        this.wasSelectPressed = isSelectPressed;

        this.renderer.render(this.scene, this.camera);
    }
}
