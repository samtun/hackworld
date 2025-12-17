import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import { Player } from './Player';
import { AssetManager } from './AssetManager';
import { BaseDungeon, Lobby, Dungeon1, Dungeon2 } from './stages';

export class World {
    scene: THREE.Scene;
    physicsWorld: CANNON.World;
    physicsMaterial: CANNON.Material;
    assetManager: AssetManager;
    
    // Current active stage
    currentStage?: BaseDungeon;
    
    // Stage instances
    private lobby: Lobby;
    private dungeon1: Dungeon1;
    private dungeon2: Dungeon2;

    constructor(scene: THREE.Scene, physicsWorld: CANNON.World, physicsMaterial: CANNON.Material) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.getInstance();

        // Initialize stage instances
        this.lobby = new Lobby(scene, physicsWorld, physicsMaterial);
        this.dungeon1 = new Dungeon1(scene, physicsWorld, physicsMaterial);
        this.dungeon2 = new Dungeon2(scene, physicsWorld, physicsMaterial);

        // Preload all assets before starting
        this.preloadAssets().then(() => {
            // Start in Lobby after assets are loaded
            this.loadLobby();
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
        this.currentStage = this.lobby;
        this.lobby.load();
    }

    loadDungeon() {
        if (this.currentStage) {
            this.currentStage.clear();
        }
        this.currentStage = this.dungeon1;
        this.dungeon1.load();
    }

    loadDungeon2() {
        if (this.currentStage) {
            this.currentStage.clear();
        }
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

        // Update mixers
        for (const mixer of this.currentStage.mixers) {
            mixer.update(dt);
        }

        for (let i = this.currentStage.enemies.length - 1; i >= 0; i--) {
            const enemy = this.currentStage.enemies[i];
            enemy.update(dt, player);

            if (enemy.isDead) {
                this.scene.remove(enemy.mesh);
                this.physicsWorld.removeBody(enemy.body);
                this.currentStage.enemies.splice(i, 1);
            }
        }
    }

    checkPortalInteraction(playerPosition: THREE.Vector3): string | null {
        if (!this.currentStage) return null;
        return this.currentStage.checkPortalInteraction(playerPosition);
    }
}
