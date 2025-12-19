import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';
import { NPC } from '../NPC';
import { HealingStation } from '../HealingStation';
import { Player } from '../Player';

export class Lobby extends BaseDungeon {
    id = 'lobby';
    name = 'Lobby';
    description = 'Safe hub area';
    
    // Store trader position for interaction
    private traderPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, -5);
    
    // Store chip trader position for interaction
    private chipTraderPosition: CANNON.Vec3 = new CANNON.Vec3(-5, 0, -5);
    
    // Store Ford position for interaction
    private fordPosition: CANNON.Vec3 = new CANNON.Vec3(5, 0, -5);
    
    // NPCs
    npc?: NPC;
    fordNpc?: NPC;
    
    // Healing Station
    healingStation?: HealingStation;
    private healingStationPosition: CANNON.Vec3 = new CANNON.Vec3(-5, 0.05, 5);
    
    // Callback for Ford interaction (set by Game)
    fordInteractionCallback?: () => void;

    load(): void {
        this.clear();
        console.log("Loading Lobby...");

        // Floor
        this.createFloor(20, 0x808080);

        // Portal (single portal that will show selection UI)
        this.createPortal(new CANNON.Vec3(5, 0.05, 5), 0x00ff00, 'selection');

        // Healing Station
        this.healingStation = new HealingStation(this.scene, this.healingStationPosition, 0x00ffff);

        // Add some walls or obstacles
        this.createBox(2, 2, 2, new CANNON.Vec3(-5, 1, -5));

        // Create Nyleth NPC
        const nylethDialogue = [
            "Hey there, never seen you around. You look like you pack some punches. Interested in joining our fight?",
            "There are hordes of corrupted files running around our servers and we could really need some help with that.",
            "If you are interested, the teleporter to the south can take you to our main server."
        ];
        this.npc = new NPC(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "Nyleth",
            new CANNON.Vec3(-5, 0, 0),
            nylethDialogue
        );
        
        // Create Ford NPC (X-Data Manager)
        const fordDialogue = [
            "Welcome! I'm Ford, the X-Data Manager.",
            "I can help you unlock your potential using the X-Data you collect from enemies.",
            "Step closer if you'd like to upgrade your stats!"
        ];
        this.fordNpc = new NPC(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            "Ford",
            this.fordPosition,
            fordDialogue,
            this.fordInteractionCallback
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

        // Add Chip Trader - use a simple colored cube for now
        const chipTraderGeometry = new THREE.BoxGeometry(1, 2, 1);
        const chipTraderMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffaa });
        const chipTraderMesh = new THREE.Mesh(chipTraderGeometry, chipTraderMaterial);
        chipTraderMesh.position.set(this.chipTraderPosition.x, this.chipTraderPosition.y + 1, this.chipTraderPosition.z);
        chipTraderMesh.castShadow = true;
        chipTraderMesh.receiveShadow = true;
        this.scene.add(chipTraderMesh);
        this.meshes.push(chipTraderMesh);

        // Chip Trader Physics Body
        const chipTraderShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
        const chipTraderBody = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
        chipTraderBody.addShape(chipTraderShape);
        chipTraderBody.position.set(this.chipTraderPosition.x, this.chipTraderPosition.y + 1, this.chipTraderPosition.z);
        this.physicsWorld.addBody(chipTraderBody);
        this.bodies.push(chipTraderBody);
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
            new THREE.Vector3(this.chipTraderPosition.x, this.chipTraderPosition.y, this.chipTraderPosition.z)
        );
        return dist < 2.0; // Interaction range
    }

    /**
     * Get all NPCs in the lobby (dialogue NPCs only, traders are handled separately)
     */
    getAllNPCs(): NPC[] {
        const npcs: NPC[] = [];
        if (this.npc) npcs.push(this.npc);
        if (this.fordNpc) npcs.push(this.fordNpc);
        return npcs;
    }

    /**
     * Update healing station
     */
    updateHealing(deltaTime: number, player: Player): void {
        if (!this.healingStation) return;
        this.healingStation.update(deltaTime, player);
    }

    /**
     * Override clear to also clean up NPCs and healing station
     */
    clear(): void {
        if (this.npc) {
            this.npc.cleanup(this.scene, this.physicsWorld);
            this.npc = undefined;
        }
        if (this.fordNpc) {
            this.fordNpc.cleanup(this.scene, this.physicsWorld);
            this.fordNpc = undefined;
        }
        if (this.healingStation) {
            this.healingStation.cleanup(this.scene);
            this.healingStation = undefined;
        }
        super.clear();
    }
}
