import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const threeToCannon = (v: THREE.Vector3): CANNON.Vec3 => new CANNON.Vec3(v.x, v.y, v.z);
export const cannonToThree = (v: CANNON.Vec3): THREE.Vector3 => new THREE.Vector3(v.x, v.y, v.z);