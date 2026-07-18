import * as CANNON from 'cannon-es';
import { Enemy, EnemyArchetypeConfig } from "./Enemy";
import { EnemyType } from './EnemyType';
import { BossEnemy } from './BossEnemy';
import { AssetManager } from '../AssetManager';
import { AudioManager } from '../AudioManager';
import { FloatingIndicatorManager } from '../FloatingIndicatorManager';
import { PlayerRegistry } from '../player/PlayerRegistry';
import { singleton } from 'tsyringe';

@singleton()
export class EnemyFactory {
    constructor(
        private readonly scene: THREE.Scene,
        private readonly world: CANNON.World,
        private readonly physicsMaterial: CANNON.Material,
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
            this.world,
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
            this.world,
            position,
            this.physicsMaterial,
            config,
            enemyType);
    }
}