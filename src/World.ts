import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './enemies/Enemy';
import { Player } from './Player';
import { AssetManager } from './AssetManager';
import { BaseStage, Lobby, createStage } from './stages';
import { Npc } from './npcs/Npc';
import { ItemDropManager } from './items/ItemDropManager';
import { ItemDropType } from './items/ItemDropType';
import { HealingSystem } from './systems/HealingSystem';
import { FloatingIndicatorManager } from './FloatingIndicatorManager';
import { GameProgressManager } from './GameProgressManager';
import { ItemDrop } from './items/ItemDrop';
import { LootChest } from './items/LootChest';
import { BreakableBarrel } from './items/BreakableBarrel';
import type { StageMinimapLayout } from './stages/StageMinimapLayout';

export class World {
    scene: THREE.Scene;
    physicsWorld: CANNON.World;
    physicsMaterial: CANNON.Material;
    assetManager: AssetManager;
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

    // Grid plane shader
    private gridPlaneMaterial: THREE.ShaderMaterial;
    private gridPlane: THREE.Mesh;

    // Track stage completion for progression
    private hasNotifiedStageCompletion: boolean = false;

    constructor(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material,
        onInitialLoadComplete: () => void,
        onInitialLoadProgress: (loaded: number, total: number) => void,
        onStageLoadStartCallback: () => void,
        onStageLoadCompleteCallback: () => void,) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.Instance;

        this.itemDropManager = ItemDropManager.Instance;

        // Initialize floating indicator manager
        this.floatingIndicatorManager = FloatingIndicatorManager.getInstance(scene);

        // Create grid plane at y=-5
        this.gridPlaneMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0.0 },
                u_cameraPosition: { value: new THREE.Vector3() }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                void main() {
                    vUv = uv;
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPos.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                uniform float u_time;
                uniform vec3 u_cameraPosition;

                // 2D Random
                float random (in vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }

                // 2D Noise based on Morgan McGuire @morgan3d
                // https://www.shadertoy.com/view/4dS3Wd
                float noise (in vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);

                    // Four corners in 2D of a tile
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));

                    vec2 u = f*f*(3.0-2.0*f);

                    return mix(a, b, u.x) +
                            (c - a)* u.y * (1.0 - u.x) +
                            (d - b) * u.x * u.y;
                }

                #define NUM_OCTAVES 5

                float fbm ( in vec2 _st) {
                    float v = 0.0;
                    float a = 0.5;
                    vec2 shift = vec2(100.0);
                    // Rotate to reduce axial bias
                    mat2 rot = mat2(cos(0.5), sin(0.5),
                                    -sin(0.5), cos(0.50));
                    for (int i = 0; i < NUM_OCTAVES; ++i) {
                        v += a * noise(_st);
                        _st = rot * _st * 2.0 + shift;
                        a *= 0.5;
                    }
                    return v;
                }

                void main() {
                    // Increase the multiplier to make the grid denser on the plane
                    vec2 uv = vUv * 140.0; 
                    
                    // Scrolling effect
                    float randomX = noise(vec2(u_time * 220.0, 0.0)) * 0.015;
                    float randomY = noise(vec2(u_time * 220.0, 0.0)) * 0.015;
                    vec2 grid = fract(uv - vec2(randomX, randomY));
                    
                    float lineThickness = 0.03;
                    vec2 dist = abs(grid - 0.5);
                    float gridLine = max(dist.x, dist.y);
                    
                    float line = smoothstep(0.5 - lineThickness, 0.5, gridLine);
                    float glow = pow(0.08 / (0.75 - gridLine), 2.0) * 0.4;

                    vec3 gridColor = (line * vec3(0.4, 0.9, 1.0)) + (glow * vec3(0.0, 0.4, 1.0));

                    // Generate cloudy noise
                    vec2 cloudUv = vUv * 40.0 + vec2(u_time * 0.06, u_time * 0.03);
                    float f = fbm(cloudUv);
                    
                    // Increase contrast
                    f = smoothstep(0.1, 0.6, f);

                    // Create cloud color (darkish blue-grey) with more variation
                    vec3 cloudColor = mix(vec3(0.12, 0.12, 0.12), vec3(0.3, 0.5, 1.0), f);
                    float mixFactor = clamp(cloudColor.b - 0.08, 0.0, 1.0);
                    cloudColor.b *= 0.7;
                    // Mix grid color with cloud color with global factor of 0.6
                    vec3 color = mix(gridColor, cloudColor, mixFactor);
                    
                    // Fade out based on distance from camera in XZ plane
                    float distFromCamera = length(vWorldPosition.xz - u_cameraPosition.xz);
                    float depthFade = 1.0 - clamp(distFromCamera / 100.0, 0.0, 1.0);

                    gl_FragColor = vec4(color * depthFade, 1.0 * depthFade);
                }
            `,
            side: THREE.FrontSide,
            transparent: true
        });
        const gridGeometry = new THREE.PlaneGeometry(500, 500);
        this.gridPlane = new THREE.Mesh(gridGeometry, this.gridPlaneMaterial);
        this.gridPlane.rotation.x = -Math.PI / 2;
        this.gridPlane.position.y = -18;
        scene.add(this.gridPlane);

        // Setup progress callback for asset manager
        this.assetManager.setProgressCallback(onInitialLoadProgress);

        this.onStageLoadStartCallback = onStageLoadStartCallback;
        this.onStageLoadCompleteCallback = onStageLoadCompleteCallback;

        // Preload common assets and start in Lobby
        this.initializeWorld(onInitialLoadComplete);
    }

    /**
     * Initialize the world by preloading common assets and loading the lobby
     */
    private async initializeWorld(onInitialLoadComplete: () => void): Promise<void> {
        try {
            await this.preloadCommonAssets();
            await this.loadStageById(Lobby.getMetadata().id);
        } catch (error) {
            console.error('Failed to initialize world:', error);
        } finally {
            // Always call onLoadComplete to ensure UI updates
            onInitialLoadComplete();
        }
    }

    /**
     * Preload common assets used across multiple scenes
     */
    async preloadCommonAssets(): Promise<void> {
        console.log("Preloading common assets ...");
        const commonAssets = [
            // Weapons
            'models/aegis_sword.glb',
            'models/rune_blade.glb',
            'models/fierce_lance.glb',
            'models/battle_hawk.glb',
            // NPCs
            'models/trader_weapons.glb',
            'models/npc_placeholder.glb',
            'models/healing_station.glb',
            'models/xdata_terminal.glb',
            'models/mainframe.glb',
            'models/teleporter.glb',
            // Stages
            'models/lobby.glb',
            'models/lobby_collider.glb',
            // Characters
            'models/main_character.glb',
            // Effects
            'models/heal_fx.glb',
            'models/area_fx.glb',
            'models/laser_fx.glb',
            // Items
            'models/coin.glb',
            'models/weapon_drop.glb',
            'models/chip_drop.glb',
            'models/core_drop.glb',
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

            this.itemDropManager.clear(this.scene);

            // Reset stage completion notification flag
            this.hasNotifiedStageCompletion = false;

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

    update(dt: number, player: Player, cameraPosition: THREE.Vector3, anyMenuOpen: boolean) {
        if (!this.currentStage) return;

        // Update grid plane shader time uniform
        this.gridPlaneMaterial.uniforms.u_time.value += dt;
        this.gridPlaneMaterial.uniforms.u_cameraPosition.value.copy(cameraPosition);

        // Update stage (teleporters, etc.)
        this.currentStage.update(dt, player, anyMenuOpen, cameraPosition);

        if (anyMenuOpen) {
            // If any menu is open, skip enemy and drop updates to pause the world
            return;
        }

        // Update systems that operate across stages (healing, etc.)
        HealingSystem.Instance.update(dt);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Set up death fade callback if not already set
            if (!enemy.onDeathFadeStart) {
                enemy.onDeathFadeStart = (e: Enemy) => {
                    // Grant EXP to player
                    const expGained = player.gainExp(e.baseExp);

                    // Spawn EXP number visual
                    this.floatingIndicatorManager.spawnEXP(e.getDeathPosition(), expGained);

                    // Try to drop an item
                    // The ItemDropManager will select one strategy based on probabilities
                    // and each strategy will check enemy.itemDropChance internally
                    this.itemDropManager.tryDropItem(this.scene, e, player);

                    // Independently try to drop an HP or TP potion (5% base chance)
                    const potionPos = e.getDeathPosition();
                    potionPos.y += 0.5;
                    this.itemDropManager.tryDropPotion(this.scene, potionPos, player, 0.05);
                };
            }

            enemy.update(dt);

            if (enemy.isDead) {
                enemy.cleanup();
                this.currentStage.enemies.splice(i, 1);

                // Check if all enemies are defeated in a dungeon stage
                this.checkStageCompletion();
            }
        }

        // Update all registered item drop strategies
        this.itemDropManager.update(dt, cameraPosition, player.position);

        // Update floating indicators (damage, EXP, tech points, etc.)
        this.floatingIndicatorManager.update(dt, cameraPosition);
    }

    /**
     * Check if the current stage has been completed (all enemies defeated)
     * and update game progress accordingly
     */
    private checkStageCompletion(): void {
        if (!this.currentStage) return;

        // Only check for dungeon stages (not lobby)
        if (this.currentStage.id === 'lobby') return;

        // Only notify once per stage load
        if (this.hasNotifiedStageCompletion) return;

        // Check if all enemies are defeated
        if (this.enemies.length === 0) {
            this.hasNotifiedStageCompletion = true;

            // Get required progress from metadata
            const stageClass = this.currentStage.constructor as typeof BaseStage;
            const metadata = stageClass.getMetadata();
            const requiredProgress = metadata.requiredProgress;

            if (requiredProgress > 0) {
                const progressManager = GameProgressManager.Instance;
                progressManager.markBossDefeated(requiredProgress);
                console.log(`Stage (requiredProgress=${requiredProgress}) completed! Progress now:`, progressManager.progress);
            }
        }
    }

    getAllNpcs(): Set<Npc> {
        if (!this.currentStage) return new Set<Npc>();

        // Get all NPCs from current stage
        return this.currentStage.npcs;
    }

    /**
     * Check if player is near any interactive drop (weapon, chip, core, booster pack)
     * Returns the first match in priority order
     */
    checkNearestInteractiveDrop(playerPosition: THREE.Vector3): ItemDrop | null {
        const dropTypes = [ItemDropType.MINIMAP, ItemDropType.WEAPON, ItemDropType.CHIP, ItemDropType.CORE, ItemDropType.BOOSTER_PACK] as const;
        for (const dropType of dropTypes) {
            const drop = this.itemDropManager.checkInteraction(dropType, playerPosition);
            if (drop) return drop;
        }
        return null;
    }

    /**
     * Check if player is near any auto-pickup drop (X-Data, money)
     * Returns the first match in priority order
     */
    checkNearestAutoPickupDrop(playerPosition: THREE.Vector3): ItemDrop | null {
        const dropTypes = [ItemDropType.XDATA, ItemDropType.MONEY, ItemDropType.HP_POTION, ItemDropType.TP_POTION] as const;
        for (const dropType of dropTypes) {
            const drop = this.itemDropManager.checkInteraction(dropType, playerPosition);
            if (drop) return drop;
        }
        return null;
    }

    /**
     * Pick up any drop type by using the drop's dropType property
     */
    pickupDrop(drop: ItemDrop, player: Player): void {
        this.floatingIndicatorManager.spawnPickupIndicator(drop);
        this.itemDropManager.pickup(drop.dropType, this.scene, drop, player);
        if (drop.dropType === ItemDropType.MINIMAP) {
            this.currentStage?.revealMinimap();
        }
    }

    getCurrentMinimapState(): { layout: StageMinimapLayout | null; visible: boolean } {
        return {
            layout: this.currentStage?.getMinimapLayout() ?? null,
            visible: this.currentStage?.isMinimapVisible() ?? false,
        };
    }

    /**
     * Get all loot chests from the current stage.
     */
    getLootChests(): LootChest[] {
        return this.currentStage?.lootChests ?? [];
    }

    /**
     * Get all non-destroyed breakable barrels from the current stage.
     */
    getBreakableBarrels(): BreakableBarrel[] {
        return (this.currentStage?.breakableBarrels ?? []).filter(b => !b.isDestroyed);
    }

    /**
     * Destroy a breakable barrel and register its loot drop with the item drop manager.
     */
    destroyBarrel(barrel: BreakableBarrel, player: Player): void {
        barrel.onHit();
        const drop = barrel.generateDrop(this.scene, player);
        if (drop) {
            this.itemDropManager.addDrop(drop);
        }
    }
}
