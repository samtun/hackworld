import { singleton } from 'tsyringe';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

@singleton()
export class VectorExtensions {
    public toThreeVector3(position: CANNON.Vec3): THREE.Vector3 {
        return new THREE.Vector3(position.x, position.y, position.z);
    }

    public toCannonVec3(position: THREE.Vector3): CANNON.Vec3 {
        return new CANNON.Vec3(position.x, position.y, position.z);
    }
}