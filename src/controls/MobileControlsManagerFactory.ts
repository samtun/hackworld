import { singleton } from "tsyringe";
import { MobileControlsManager } from "./MobileControlsManager";

@singleton()
export class MobileControlsManagerFactory {
    public createMobileControlsManager(): MobileControlsManager {
        return new MobileControlsManager();
    }
}