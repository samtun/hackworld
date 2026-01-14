import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './enemies/Enemy';
import { Player } from './Player';
import { AssetManager } from './AssetManager';
import { BaseStage, Lobby, createStage } from './stages';
import { Npc } from './npcs/Npc';
import { ItemDropManager } from './items/ItemDropManager';
import { WeaponDrop } from './items/weapons/WeaponDrop';
import { ChipDrop } from './items/chips/ChipDrop';
import { CoreDrop } from './items/cores/CoreDrop';
import { BoosterPackDrop } from './items/cards/BoosterPackDrop';
import { XDataDrop } from './items/xdata/XDataDrop';
import { HealingSystem } from './systems/HealingSystem';
import { FloatingIndicatorManager } from './FloatingIndicatorManager';

export class World {
    scene: THREE.Scene;
    physicsWorld: CANNON.World;
    physicsMaterial: CANNON.Material;
    assetManager: AssetManager;
    onLoadProgressCallback: (loaded: number, total: number) => void;
    onStageLoadStartCallback: () => void;
    onStageLoadCompleteCallback: () => void;

    // Current active stage
    currentStage?: BaseStage;

    // Floating indicator manager (for damage, EXP, tech points, etc.)
    public floatingIndicatorManager: FloatingIndicatorManager;

    // Drop managers
    private itemDropManager: ItemDropManager;

    // XData interaction callback (set by Game)
    private xDataInteractionCallback?: () => void;

    // Save manager interaction callback (set by Game)
    private saveManagerInteractionCallback?: () => void;

    constructor(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        onLoadComplete: () => void,
        onLoadProgress: (loaded: number, total: number) => void,
        onStart: () => void,
        onComplete: () => void,) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.Instance;
        this.onLoadProgressCallback = onLoadProgress;

        this.itemDropManager = ItemDropManager.Instance;

        // Initialize floating indicator manager
        this.floatingIndicatorManager = new FloatingIndicatorManager(scene);

        // Drop strategies are now registered internally by ItemDropManager

        // Setup progress callback for asset manager
        if (this.onLoadProgressCallback) {
            this.assetManager.setProgressCallback(this.onLoadProgressCallback);
        }

        this.onStageLoadStartCallback = onStart;
        this.onStageLoadCompleteCallback = onComplete;

        // Preload common assets and start in Lobby
        this.initializeWorld(onLoadComplete);
    }

    /**
     * Initialize the world by preloading common assets and loading the lobby
     */
    private async initializeWorld(onLoadComplete: () => void): Promise<void> {
        try {
            await this.preloadCommonAssets();
            await this.loadStageById(Lobby.getMetadata().id);
        } catch (error) {
            console.error('Failed to initialize world:', error);
        } finally {
            // Always call onLoadComplete to ensure UI updates
            onLoadComplete();
        }
    }

    /**
     * Preload common assets used across multiple scenes
     */
    async preloadCommonAssets(): Promise<void> {
        console.log("Preloading common assets ...");
        const commonAssets = [
            'models/aegis_sword.glb',
            'models/rune_blade.glb',
            'models/fierce_lance.glb',
            'models/battle_hawk.glb',
            'models/trader_weapons.glb',
            'models/npc_placeholder.glb',
            'models/healing_station.glb',
            'models/lobby.glb',
            'models/lobby_collider.glb',
            'models/main_character.glb',
        ];

        await this.assetManager.preloadAll(commonAssets);
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
            this.itemDropManager.clear(this.scene, this.physicsWorld);

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
            await this.currentStage.load();
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

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Set up damage callback if not already set
            if (!enemy.onDamageTaken) {
                enemy.onDamageTaken = (position: CANNON.Vec3, amount: number) => {
                    this.spawnDamageNumber(position, amount, '#fdc650ff');
                };
            }

            // Set up death fade callback if not already set
            if (!enemy.onDeathFadeStart) {
                enemy.onDeathFadeStart = (e: Enemy) => {
                    // Grant EXP to player
                    player.gainExp(e.expAmount);

                    // Spawn EXP number visual
                    this.spawnEXPNumber(e.getDeathPosition(), e.expAmount);

                    // Try to drop an item (weapon, chip, core, or booster pack)
                    // The ItemDropManager will select one strategy based on probabilities
                    // and each strategy will check enemy.itemDropChance internally
                    if (!(this.itemDropManager.tryDropItem(this.scene, this.physicsWorld, e, player))) {
                        // Try to drop X-Data separately (independent of item drops) if no item was dropped
                        this.itemDropManager.tryDrop('xData', this.scene, this.physicsWorld, e, player);
                    }
                };
            }

            enemy.update(dt);

            if (enemy.isDead) {
                enemy.cleanup();
                this.currentStage.enemies.splice(i, 1);
            }
        }

        // Update all registered item drop strategies
        this.itemDropManager.update(dt, cameraPosition, player.position);

        // Update floating indicators (damage, EXP, tech points, etc.)
        this.floatingIndicatorManager.update(dt, cameraPosition);
    }

    /**
     * Spawn EXP number visual at the given position
     */
    spawnEXPNumber(position: CANNON.Vec3, amount: number): void {
        // Use new floating indicator manager for consistent styling
        this.floatingIndicatorManager.spawnEXP(position, amount);
    }

    /**
     * Spawn damage number visual at the given position
     */
    spawnDamageNumber(position: CANNON.Vec3, amount: number, color: string): void {
        this.floatingIndicatorManager.spawnDamage(position, amount, color);
    }

    /**
     * Spawn tech point indicator visual at the given position
     */
    spawnTechIndicator(position: CANNON.Vec3): void {
        this.floatingIndicatorManager.spawnTech(position);
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
        return this.itemDropManager.checkInteraction('weapon', playerPosition) as WeaponDrop | null;
    }

    /**
     * Pick up a weapon drop
     */
    pickupWeaponDrop(drop: WeaponDrop, player: Player): void {
        this.itemDropManager.pickup('weapon', this.scene, this.physicsWorld, drop, player);
    }

    /**
     * Check if player is near a chip drop
     */
    checkChipDropInteraction(playerPosition: THREE.Vector3) {
        return this.itemDropManager.checkInteraction('chip', playerPosition) as ChipDrop | null;
    }

    /**
     * Pick up a chip drop
     */
    pickupChipDrop(drop: ChipDrop, player: Player): void {
        this.itemDropManager.pickup('chip', this.scene, this.physicsWorld, drop, player);
    }

    /**
     * Check if player is near a core drop
     */
    checkCoreDropInteraction(playerPosition: THREE.Vector3) {
        return this.itemDropManager.checkInteraction('core', playerPosition) as CoreDrop | null;
    }

    /**
     * Pick up a core drop
     */
    pickupCoreDrop(drop: CoreDrop, player: Player): void {
        this.itemDropManager.pickup('core', this.scene, this.physicsWorld, drop, player);
    }

    /**
     * Check if player is near a booster pack drop
     */
    checkBoosterPackDropInteraction(playerPosition: THREE.Vector3): BoosterPackDrop | null {
        return this.itemDropManager.checkInteraction('boosterPack', playerPosition) as BoosterPackDrop | null;
    }

    /**
     * Pick up a booster pack drop
     */
    pickupBoosterPackDrop(drop: BoosterPackDrop, player: Player): void {
        this.itemDropManager.pickup('boosterPack', this.scene, this.physicsWorld, drop, player);
    }

    /**
     * Check if player is near an X-Data drop
     */
    checkXDataDropInteraction(playerPosition: THREE.Vector3): XDataDrop | null {
        return this.itemDropManager.checkInteraction('xData', playerPosition) as XDataDrop | null;
    }

    /**
     * Pick up an X-Data drop
     */
    pickupXDataDrop(drop: XDataDrop, player: Player): void {
        this.itemDropManager.pickup('xData', this.scene, this.physicsWorld, drop, player);
    }
}
