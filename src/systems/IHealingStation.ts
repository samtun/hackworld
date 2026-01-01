import * as THREE from 'three';

export interface IHealingStation {
    getPosition(): THREE.Vector3;
    getRadius(): number;
    setHealing(isHealing: boolean): void;
}
