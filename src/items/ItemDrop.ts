import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface ItemDrop {
    mesh: THREE.Object3D;
    body?: CANNON.Body;
    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void;
    cleanup(scene: THREE.Scene, world: CANNON.World): void;
}
