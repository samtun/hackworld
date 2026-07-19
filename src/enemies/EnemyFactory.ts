import { delay, inject, singleton } from 'tsyringe';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { Enemy, EnemyArchetypeConfig } from "./Enemy";
import { EnemyType } from './EnemyType';
import { BossEnemy } from './BossEnemy';
import { AssetManager } from '../AssetManager';
import { AudioManager } from '../AudioManager';
import { FloatingIndicatorManager } from '../FloatingIndicatorManager';
import { PlayerRegistry } from '../player/PlayerRegistry';


@singleton()
export class EnemyFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
        @inject(delay(() => CANNON.World)) private readonly physicsWorld: CANNON.World,
        @inject(delay(() => CANNON.Material)) private readonly physicsMaterial: CANNON.Material,
        private readonly audioManager: AudioManager,
        private readonly floatingIndicatorManager: FloatingIndicatorManager,
        private readonly playerRegistry: PlayerRegistry,
        private readonly assetManager: AssetManager,
    ) { }

    public createEnemy(
        position: CANNON.Vec3,
        config: Partial<EnemyArchetypeConfig> = {},
        enemyType: EnemyType,
    ): Enemy {
        return new Enemy(
            this.audioManager,
            this.floatingIndicatorManager,
            this.playerRegistry,
            this.assetManager,
            this.scene,
            this.physicsWorld,
            position,
            this.physicsMaterial,
            config,
            enemyType);
    }

    public createBossEnemy(
        position: CANNON.Vec3,
        config: Partial<EnemyArchetypeConfig> = {},
        enemyType: EnemyType,
    ): BossEnemy {
        return new BossEnemy(
            this.audioManager,
            this.floatingIndicatorManager,
            this.playerRegistry,
            this.assetManager,
            this.scene,
            this.physicsWorld,
            position,
            this.physicsMaterial,
            config,
            enemyType);
    }
}