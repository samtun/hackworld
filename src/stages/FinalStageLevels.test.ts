import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createStage } from './index';

describe('final stage multi-level routing metadata', () => {
    it.each([
        ['cipherNull', 0],
        ['cipherNullDepth2', 5],
        ['securityCore', 0],
        ['securityCoreDepth2', 0],
        ['securityCoreDepth3', 7],
        ['kernelTerminus', 0],
        ['kernelTerminusDepth2', 0],
        ['kernelTerminusDepth3', 9],
    ] as const)('sets required progress for %s', (stageId, expectedProgress) => {
        const stage = createStage(stageId, new THREE.Scene(), new CANNON.World(), new CANNON.Material());
        expect(stage).not.toBeNull();
        expect(stage!.id).toBe(stageId);
        expect(stage!.getRequiredProgress()).toBe(expectedProgress);
    });
});
