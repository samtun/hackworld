import { singleton } from "tsyringe";
import { AssetManager } from "./AssetManager";
import { AudioManager } from "./AudioManager";
import { FloatingIndicatorManager } from "./FloatingIndicatorManager";
import { GameProgressManager } from "./GameProgressManager";
import { ItemDropManager } from "./items/ItemDropManager";
import { StageFactory } from "./stages/StageFactory";
import { HealingSystem } from "./systems/HealingSystem";
import { World } from "./World";

@singleton()
export class WorldFactory {
    constructor(
        private readonly scene: THREE.Scene,
        private readonly stageFactory: StageFactory,
        private readonly assetManager: AssetManager,
        private readonly audioManager: AudioManager,
        private readonly floatingIndicatorManager: FloatingIndicatorManager,
        private readonly itemDropManager: ItemDropManager,
        private readonly healingSystem: HealingSystem,
        private readonly gameProgressManager: GameProgressManager,
    ) { }

    public createWorld(
        onInitialLoadComplete: () => void,
        onInitialLoadProgress: (loaded: number, total: number) => void,
        onStageLoadStartCallback: () => void,
        onStageLoadCompleteCallback: () => void,
    ): World {
        return new World(
            this.scene,
            this.stageFactory,
            this.assetManager,
            this.audioManager,
            this.floatingIndicatorManager,
            this.itemDropManager,
            this.healingSystem,
            this.gameProgressManager,
            onInitialLoadComplete,
            onInitialLoadProgress,
            onStageLoadStartCallback,
            onStageLoadCompleteCallback,
        );
    }
}