import { ElectricTrap, ElectricTrapConfig } from './ElectricTrap';
import { singleton } from 'tsyringe';

@singleton()
export class ElectricTrapFactory {
    constructor(
        private readonly scene: THREE.Scene,
    ) { }

    public createElectricTrap(config: ElectricTrapConfig): ElectricTrap {
        return new ElectricTrap(
            this.scene,
            config,
        );
    }
}