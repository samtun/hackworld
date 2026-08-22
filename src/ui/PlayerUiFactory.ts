import { singleton } from "tsyringe";
import { MobileControlsManager } from "../controls/MobileControlsManager";
import { Player } from "../player/Player";
import { PlayerUi } from "./PlayerUi";

@singleton()
export class PlayerUiFactory {
    constructor(private readonly mobileControlsManager: MobileControlsManager) { }

    public createPlayerUi(parent: HTMLDivElement, player: Player): PlayerUi {
        return new PlayerUi(parent, player, this.mobileControlsManager);
    }
}