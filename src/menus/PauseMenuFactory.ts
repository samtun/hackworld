import { singleton } from "tsyringe";
import { AudioManager } from "../AudioManager";
import { InputManager } from "../controls/InputManager";
import { PauseMenu, PauseMenuCallbacks } from "./PauseMenu";

@singleton()
export class PauseMenuFactory {
    constructor(
        private readonly inputManager: InputManager,
        private readonly audioManager: AudioManager,
    ) { }

    public createPauseMenu(
        performanceModeEnabled: boolean,
        controlHintsEnabled: boolean,
        callbacks: PauseMenuCallbacks,
    ): PauseMenu {
        return new PauseMenu(
            this.inputManager,
            this.audioManager,
            performanceModeEnabled,
            controlHintsEnabled,
            callbacks,
        );
    }
}