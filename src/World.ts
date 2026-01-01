import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './enemies/Enemy';
import { Player } from './Player';
import { AssetManager } from './AssetManager';
import { BaseStage, Lobby, createStage } from './stages';
import { Npc } from './npcs/Npc';
import { WeaponDropManager } from './items/WeaponDropManager';
import { WeaponDrop } from './items/WeaponDrop';
import { XData } from './xdata/XData';
import { XDataDropManager } from './xdata/XDataDropManager';
import { EXPNumber } from './EXPNumber';
import { HealingSystem } from './systems/HealingSystem';

export class World {
    scene: THREE.Scene;
    physicsWorld: CANNON.World;
    physicsMaterial: CANNON.Material;
    assetManager: AssetManager;
    onLoadProgressCallback?: (loaded: number, total: number) => void;
    onStageLoadStartCallback?: () => void;
    onStageLoadCompleteCallback?: () => void;

    // Current active stage
    currentStage?: BaseStage;

    // X-Data entities
    xDataEntities: XData[] = [];

    // EXP number entities
    expNumbers: EXPNumber[] = [];

    // Drop managers
    private weaponDropManager: WeaponDropManager;
    private xDataDropManager: XDataDropManager;

    // XData interaction callback (set by Game)
    private xDataInteractionCallback?: () => void;

    // Save manager interaction callback (set by Game)
    private saveManagerInteractionCallback?: () => void;

    constructor(scene: THREE.Scene, physicsWorld: CANNON.World, physicsMaterial: CANNON.Material, onLoadComplete?: () => void, onLoadProgress?: (loaded: number, total: number) => void) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.Instance;
        this.onLoadProgressCallback = onLoadProgress;

        this.weaponDropManager = new WeaponDropManager();
        this.xDataDropManager = new XDataDropManager();

        // Setup progress callback for asset manager
        if (this.onLoadProgressCallback) {
            this.assetManager.setProgressCallback(this.onLoadProgressCallback);
        }

        // Preload common assets and start in Lobby
        this.initializeWorld(onLoadComplete);
    }

    /**
     * Initialize the world by preloading common assets and loading the lobby
     */
    private async initializeWorld(onLoadComplete?: () => void): Promise<void> {
        try {
            await this.preloadCommonAssets();
            await this.loadStageById(Lobby.getMetadata().id);
        } catch (error) {
            console.error('Failed to initialize world:', error);
        } finally {
            // Always call onLoadComplete to ensure UI updates
            if (onLoadComplete) onLoadComplete();
        }
    }

    /**
     * Preload common assets used across multiple scenes
     */
    async preloadCommonAssets(): Promise<void> {
        console.log("Preloading common assets ...");
        const commonAssets = [
            'models/sword.glb',
            'models/double_sword.glb',
            'models/lance.glb',
            'models/hammer.glb',
            'models/trader_weapons.glb',
            'models/npc_placeholder.glb',
            'models/healing_station.glb',
        ];

        await this.assetManager.preloadAll(commonAssets);
    }

    /**
     * Set callbacks for stage loading
     */
    setStageLoadCallbacks(onStart?: () => void, onComplete?: () => void) {
        this.onStageLoadStartCallback = onStart;
        this.onStageLoadCompleteCallback = onComplete;
    }

    /**
     * Load a stage by ID with asset preloading
     */
    async loadStageById(stageId: string): Promise<void> {
        try {
            // Notify start of stage loading
            if (this.onStageLoadStartCallback) {
                this.onStageLoadStartCallback();
            }

            // Clear current stage
            if (this.currentStage) {
                this.currentStage.clear();
                this.currentStage = undefined;
            }
            this.weaponDropManager.clear(this.scene, this.physicsWorld);
            this.clearXData();

            // Create new stage instance
            const newStage = createStage(stageId, this.scene, this.physicsWorld, this.physicsMaterial);
            if (!newStage) {
                throw new Error(`Failed to create stage: ${stageId}`);
            }

            // Load stage-specific assets
            const requiredAssets = newStage.getRequiredAssets();
            if (requiredAssets.length > 0) {
                await this.assetManager.preloadAll(requiredAssets);
            }

            // Add callbacks for lobby
            if (stageId === Lobby.getMetadata().id) {
                const lobby = newStage as Lobby;
                if (this.xDataInteractionCallback) {
                    lobby.xDataInteractionCallback = this.xDataInteractionCallback;
                }
                if (this.saveManagerInteractionCallback) {
                    lobby.saveManagerInteractionCallback = this.saveManagerInteractionCallback;
                }
            }

            // Load the stage
            this.currentStage = newStage;
            this.currentStage.load();
        } catch (error) {
            console.error(`Error loading stage ${stageId}:`, error);
            throw error; // Re-throw to allow caller to handle
        } finally {
            // Always notify completion to hide loading screen
            if (this.onStageLoadCompleteCallback) {
                this.onStageLoadCompleteCallback();
            }
        }
    }

    get enemies(): Enemy[] {
        return this.currentStage?.enemies || [];
    }

    update(dt: number, player: Player, cameraPosition: THREE.Vector3) {
        if (!this.currentStage) return;

        // Update stage (portals, etc.)
        this.currentStage.update(dt, player);

        // Update systems that operate across stages (healing, etc.)
        HealingSystem.Instance.update(dt);

        for (let i = this.currentStage.enemies.length - 1; i >= 0; i--) {
            const enemy = this.currentStage.enemies[i];
            enemy.update(dt, player);

            if (enemy.isDead) {
                // Grant EXP to player
                player.gainExp(enemy.expAmount);

                // Spawn EXP number visual
                this.spawnEXPNumber(enemy.getDeathPosition(), enemy.expAmount);

                // Check if enemy should drop weapon drop
                if (!this.weaponDropManager.tryDropWeapon(this.scene, this.physicsWorld, enemy, player)) {
                    const xDataAmount = this.xDataDropManager.rollDrop(player, enemy);
                    if (xDataAmount > 0) {
                        this.spawnXData(enemy.getDeathPosition(), xDataAmount);
                    }
                }

                this.scene.remove(enemy.mesh);
                this.physicsWorld.removeBody(enemy.body);
                this.currentStage.enemies.splice(i, 1);
            }
        }

        // Update weapon drops
        this.weaponDropManager.update(dt, cameraPosition, player.position);

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

        // Update EXP numbers
        for (let i = this.expNumbers.length - 1; i >= 0; i--) {
            const expNum = this.expNumbers[i];
            const shouldRemove = expNum.update(dt, cameraPosition);

            if (shouldRemove) {
                expNum.cleanup(this.scene);
                this.expNumbers.splice(i, 1);
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
     * Spawn EXP number visual at the given position
     */
    spawnEXPNumber(position: CANNON.Vec3, amount: number): void {
        const expNumber = new EXPNumber(this.scene, position, amount);
        this.expNumbers.push(expNumber);
        console.log(`Spawned +${amount} EXP number at position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
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

        // Also clear EXP numbers
        for (const expNum of this.expNumbers) {
            expNum.cleanup(this.scene);
        }
        this.expNumbers = [];
    }

    checkPortalInteraction(playerPosition: THREE.Vector3): string | null {
        if (!this.currentStage) return null;
        return this.currentStage.checkPortalInteraction(playerPosition);
    }

    getAllNpcs(): Set<Npc> {
        if (!this.currentStage) return new Set<Npc>();

        // Get all NPCs from current stage
        return this.currentStage.npcs;
    }

    /**
     * Check if player is near a weapon drop
     */
    checkWeaponDropInteraction(playerPosition: THREE.Vector3): WeaponDrop | null {
        return this.weaponDropManager.checkInteraction(playerPosition);
    }

    /**
     * Pick up a weapon drop
     */
    pickupWeaponDrop(drop: WeaponDrop, player: Player): void {
        this.weaponDropManager.pickup(this.scene, this.physicsWorld, drop, player);
    }
}
