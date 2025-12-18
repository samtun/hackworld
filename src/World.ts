import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import { Player } from './Player';
import { AssetManager } from './AssetManager';
import { BaseDungeon, Lobby, Dungeon1, Dungeon2 } from './stages';
import { NPC } from './NPC';
import { WeaponDrop } from './WeaponDrop';
import { WeaponType } from './Weapon';

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
    
    // Weapon drops
    weaponDrops: WeaponDrop[] = [];

    constructor(scene: THREE.Scene, physicsWorld: CANNON.World, physicsMaterial: CANNON.Material, onLoadComplete?: () => void) {
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
        this.clearWeaponDrops();
        this.currentStage = this.lobby;
        this.lobby.load();
    }

    loadDungeon() {
        if (this.currentStage) {
            this.currentStage.clear();
        }
        this.clearWeaponDrops();
        this.currentStage = this.dungeon1;
        this.dungeon1.load();
    }

    loadDungeon2() {
        if (this.currentStage) {
            this.currentStage.clear();
        }
        this.clearWeaponDrops();
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
                // Check for weapon drop before removing enemy
                this.tryDropWeapon(enemy, player);
                
                this.scene.remove(enemy.mesh);
                this.physicsWorld.removeBody(enemy.body);
                this.currentStage.enemies.splice(i, 1);
            }
        }
        
        // Update weapon drops
        for (const drop of this.weaponDrops) {
            drop.update(dt, player.mesh.position);
        }
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

    checkNPCInteraction(playerPosition: THREE.Vector3): NPC | null {
        // Only check NPC in lobby
        if (this.currentStage instanceof Lobby) {
            return this.currentStage.checkNPCInteraction(playerPosition);
        }
        return null;
    }
    
    /**
     * Randomly drop a weapon from defeated enemy
     */
    private tryDropWeapon(enemy: Enemy, player: Player): void {
        // Roll for drop
        if (Math.random() > enemy.dropChance) {
            return; // No drop
        }
        
        // Select random weapon type with weighted probability
        const weaponType = this.selectRandomWeaponType(player.currentWeaponType);
        
        // Generate weapon name
        const weaponName = this.generateWeaponName(weaponType);
        
        // Create weapon drop at enemy position
        const dropPosition = enemy.body.position.clone();
        dropPosition.y = 0.5; // Slightly above ground
        
        const weaponDrop = new WeaponDrop(
            this.scene,
            this.physicsWorld,
            dropPosition,
            weaponType,
            weaponName
        );
        
        this.weaponDrops.push(weaponDrop);
        console.log(`Enemy dropped ${weaponName} (${weaponType})`);
    }
    
    /**
     * Select random weapon type with weighted probability
     * Current weapon type gets 45% chance, others split the remaining 55%
     */
    private selectRandomWeaponType(currentWeaponType: WeaponType): WeaponType {
        const allTypes = [
            WeaponType.SWORD,
            WeaponType.DUAL_BLADE,
            WeaponType.LANCE,
            WeaponType.HAMMER
        ];
        
        const random = Math.random();
        
        // 45% chance for current weapon type
        if (random < 0.45) {
            return currentWeaponType;
        }
        
        // 55% chance split among other weapon types (13.75% each)
        const otherTypes = allTypes.filter(type => type !== currentWeaponType);
        const otherIndex = Math.floor((random - 0.45) / (0.55 / otherTypes.length));
        return otherTypes[Math.min(otherIndex, otherTypes.length - 1)];
    }
    
    /**
     * Generate a random name for a weapon
     */
    private generateWeaponName(weaponType: WeaponType): string {
        const prefixes = ['Ancient', 'Mystic', 'Steel', 'Crystal', 'Shadow', 'Flame', 'Ice', 'Thunder'];
        const swordNames = ['Blade', 'Sword', 'Edge', 'Saber'];
        const dualBladeNames = ['Twin Blades', 'Dual Edge', 'Double Sword'];
        const lanceNames = ['Lance', 'Spear', 'Pike', 'Halberd'];
        const hammerNames = ['Hammer', 'Mace', 'Maul', 'Crusher'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        
        let suffix: string;
        switch (weaponType) {
            case WeaponType.SWORD:
                suffix = swordNames[Math.floor(Math.random() * swordNames.length)];
                break;
            case WeaponType.DUAL_BLADE:
                suffix = dualBladeNames[Math.floor(Math.random() * dualBladeNames.length)];
                break;
            case WeaponType.LANCE:
                suffix = lanceNames[Math.floor(Math.random() * lanceNames.length)];
                break;
            case WeaponType.HAMMER:
                suffix = hammerNames[Math.floor(Math.random() * hammerNames.length)];
                break;
        }
        
        return `${prefix} ${suffix}`;
    }
    
    /**
     * Check if player is near a weapon drop
     */
    checkWeaponDropInteraction(playerPosition: THREE.Vector3): WeaponDrop | null {
        for (const drop of this.weaponDrops) {
            const dist = playerPosition.distanceTo(drop.mesh.position);
            if (dist < 1.5) {
                return drop;
            }
        }
        return null;
    }
    
    /**
     * Pick up a weapon drop
     */
    pickupWeaponDrop(drop: WeaponDrop, player: Player): void {
        // Add weapon to player inventory
        const newItem = {
            id: crypto.randomUUID(),
            name: drop.weaponName,
            type: 'weapon' as const,
            weaponType: drop.weaponType,
            buyPrice: 100,
            sellPrice: 50,
            isEquipped: false
        };
        
        player.inventory.push(newItem);
        console.log(`Picked up ${drop.weaponName}`);
        
        // Remove drop from world
        const index = this.weaponDrops.indexOf(drop);
        if (index > -1) {
            drop.cleanup(this.scene, this.physicsWorld);
            this.weaponDrops.splice(index, 1);
        }
    }
    
    /**
     * Clear all weapon drops (when changing stages)
     */
    private clearWeaponDrops(): void {
        for (const drop of this.weaponDrops) {
            drop.cleanup(this.scene, this.physicsWorld);
        }
        this.weaponDrops = [];
    }
}
