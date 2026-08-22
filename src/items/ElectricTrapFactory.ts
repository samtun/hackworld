import { delay, inject, singleton } from 'tsyringe';
import { ElectricTrap, ElectricTrapConfig } from './ElectricTrap';
import * as THREE from 'three';

@singleton()
export class ElectricTrapFactory {
    constructor(
        @inject(delay(() => THREE.Scene)) private readonly scene: THREE.Scene,
    ) { }

    public createElectricTrap(config: ElectricTrapConfig): ElectricTrap {
        return new ElectricTrap(
            this.scene,
            config,
        );
    }
}