import { singleton } from "tsyringe";
import { AudioManager } from "../AudioManager";
import { InputManager } from "../controls/InputManager";
import { StartMenu, StartMenuOption } from "./StartMenu";

@singleton()
export class StartMenuFactory {
    constructor(
        private readonly inputManager: InputManager,
        private readonly audioManager: AudioManager,
    ) { }

    public createStartMenu(
        container: HTMLElement,
        hasSave: boolean,
        onSelect: (option: StartMenuOption) => void,
    ): StartMenu {
        return new StartMenu(this.inputManager, this.audioManager, container, hasSave, onSelect);
    }
}