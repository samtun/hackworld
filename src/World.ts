import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import { Player } from './Player';
import { AssetManager } from './AssetManager';
import { BaseDungeon, Lobby, Dungeon1, Dungeon2 } from './stages';
import { NPC } from './NPC';
import { XData } from './xdata/XData';
import { XDataDropManager } from './xdata/XDataDropManager';

export class World {
    scene: THREE.Scene;
    physicsWorld: CANNON.World;
    physicsMaterial: CANNON.Material;
    assetManager: AssetManager;
    onLoadProgressCallback?: (loaded: number, total: number) => void;

    // Current active stage
    currentStage?: BaseDungeon;

    // X-Data entities
    xDataEntities: XData[] = [];

    // Stage instances
    private lobby: Lobby;
    private dungeon1: Dungeon1;
    private dungeon2: Dungeon2;

    private xDataDropManager: XDataDropManager;

    constructor(scene: THREE.Scene, physicsWorld: CANNON.World, physicsMaterial: CANNON.Material, onLoadComplete?: () => void, onLoadProgress?: (loaded: number, total: number) => void) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.getInstance();
        this.onLoadProgressCallback = onLoadProgress;

        // Initialize stage instances
        this.lobby = new Lobby(scene, physicsWorld, physicsMaterial);
        this.dungeon1 = new Dungeon1(scene, physicsWorld, physicsMaterial);
        this.dungeon2 = new Dungeon2(scene, physicsWorld, physicsMaterial);

        this.xDataDropManager = new XDataDropManager();

        // Setup progress callback for asset manager
        if (this.onLoadProgressCallback) {
            this.assetManager.setProgressCallback(this.onLoadProgressCallback);
        }

        // Preload all assets before starting
        this.preloadAssets().then(() => {
            // Start in Lobby after assets are loaded
            this.loadLobby();
            if (onLoadComplete) onLoadComplete();
        });
    }

    /**
     * Preload all assets used in all scenes
     */
    async preloadAssets(): Promise<void> {
        const assetsToPreload = [
            'models/trader_weapons.glb',
            'models/monster.glb',
            // Weapon models (used by player)
            'models/sword.glb',
            'models/double_sword.glb',
            'models/lance.glb',
            'models/hammer.glb'
        ];

        await this.assetManager.preloadAll(assetsToPreload);
    }

    loadLobby() {
        if (this.currentStage) {
            this.currentStage.clear();
        }
        this.clearXData();
        this.currentStage = this.lobby;
        this.lobby.load();
    }

    /**
     * Set callback for Ford NPC interaction
     */
    setFordCallback(callback: () => void) {
        this.lobby.fordInteractionCallback = callback;
    }

    loadDungeon() {
        if (this.currentStage) {
            this.currentStage.clear();
        }
        this.clearXData();
        this.currentStage = this.dungeon1;
        this.dungeon1.load();
    }

    loadDungeon2() {
        if (this.currentStage) {
            this.currentStage.clear();
        }
        this.clearXData();
        this.currentStage = this.dungeon2;
        this.dungeon2.load();
    }

    // Helper method to load stage by ID
    loadStage(stageId: string) {
        switch (stageId) {
            case 'lobby':
                this.loadLobby();
                break;
            case 'dungeon':
                this.loadDungeon();
                break;
            case 'dungeon2':
                this.loadDungeon2();
                break;
            default:
                console.warn(`Unknown stage: ${stageId}`);
        }
    }

    get enemies(): Enemy[] {
        return this.currentStage?.enemies || [];
    }

    update(dt: number, player: Player) {
        if (!this.currentStage) return;

        // Update stage (portals, etc.)
        this.currentStage.update(dt);

        // Update mixers
        for (const mixer of this.currentStage.mixers) {
            mixer.update(dt);
        }

        for (let i = this.currentStage.enemies.length - 1; i >= 0; i--) {
            const enemy = this.currentStage.enemies[i];
            enemy.update(dt, player);

            if (enemy.isDead) {
                // Check if enemy should drop X-Data
                const xDataAmount = this.xDataDropManager.rollDrop(player, enemy);
                if (xDataAmount > 0) {
                    this.spawnXData(enemy.getDeathPosition(), xDataAmount);
                }

                this.scene.remove(enemy.mesh);
                this.physicsWorld.removeBody(enemy.body);
                this.currentStage.enemies.splice(i, 1);
            }
        }

        // Update X-Data entities
        for (let i = this.xDataEntities.length - 1; i >= 0; i--) {
            const xData = this.xDataEntities[i];
            xData.update(dt);

            // Check for collision with player
            if (this.checkXDataCollision(xData, player)) {
                player.collectXData(xData.amount);
                xData.cleanup(this.scene, this.physicsWorld);
                this.xDataEntities.splice(i, 1);
            }
        }
    }

    /**
     * Spawn X-Data at the given position
     */
    spawnXData(position: CANNON.Vec3, amount: number): void {
        const xData = new XData(this.scene, this.physicsWorld, position, amount);
        this.xDataEntities.push(xData);
        console.log(`Spawned ${amount} X-Data at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
    }

    /**
     * Check collision between X-Data and player
     */
    private checkXDataCollision(xData: XData, player: Player): boolean {
        const playerPos = player.body.position;
        const xDataPos = xData.body.position;

        const dx = playerPos.x - xDataPos.x;
        const dy = playerPos.y - xDataPos.y;
        const dz = playerPos.z - xDataPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        // Collection radius of 1.5 units
        const collectionRadius = 1.5;
        return distSq < (collectionRadius * collectionRadius);
    }

    /**
     * Clear all X-Data entities
     */
    private clearXData(): void {
        for (const xData of this.xDataEntities) {
            xData.cleanup(this.scene, this.physicsWorld);
        }
        this.xDataEntities = [];
    }

    checkPortalInteraction(playerPosition: THREE.Vector3): string | null {
        if (!this.currentStage) return null;
        return this.currentStage.checkPortalInteraction(playerPosition);
    }

    checkTraderInteraction(playerPosition: THREE.Vector3): boolean {
        // Only check trader in lobby
        if (this.currentStage instanceof Lobby) {
            return this.currentStage.checkTraderInteraction(playerPosition);
        }
        return false;
    }

    getAllNPCs(): NPC[] {
        // Get all NPCs from current stage
        if (this.currentStage instanceof Lobby) {
            return this.currentStage.getAllNPCs();
        }
        return [];
    }
}
