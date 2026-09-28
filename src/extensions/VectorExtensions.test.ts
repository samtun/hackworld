import * as CANNON from 'cannon-es';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { VectorExtensions } from './VectorExtensions';

describe('VectorExtensions', () => {
    const vectorExtensions = new VectorExtensions();

    it('converts a Cannon vector to a Three vector', () => {
        const result = vectorExtensions.toThreeVector3(new CANNON.Vec3(1, 2, 3));

        expect(result).toEqual(new THREE.Vector3(1, 2, 3));
    });

    it('converts a Three vector to a Cannon vector', () => {
        const result = vectorExtensions.toCannonVec3(new THREE.Vector3(4, 5, 6));

        expect(result).toEqual(new CANNON.Vec3(4, 5, 6));
    });
});