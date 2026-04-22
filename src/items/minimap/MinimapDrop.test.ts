import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MinimapDrop } from './MinimapDrop';

describe('MinimapDrop', () => {
    beforeEach(() => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            fillStyle: '#000',
            fillRect: () => {},
            font: '',
            textBaseline: 'middle',
            textAlign: 'left',
            measureText: (text: string) => ({ width: text.length * 20 }),
            fillText: () => {},
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('rotates only the plate mesh while keeping the drop group stable for label billboarding', () => {
        const scene = new THREE.Scene();
        const drop = new MinimapDrop(scene, new CANNON.Vec3(0, 0.2, 0));
        const cameraPosition = new THREE.Vector3(4, 3, 5);
        const playerPosition = new THREE.Vector3(0.5, 0.2, 0.5);

        drop.update(1.0, cameraPosition, playerPosition);

        const plateMesh = (drop as any).plateMesh as THREE.Mesh;
        expect(drop.mesh.rotation.y).toBeCloseTo(0, 6);
        expect(plateMesh.rotation.y).toBeCloseTo(0.4, 6);
        expect(((drop as any).textMesh as THREE.Mesh).visible).toBe(true);
    });

    it('hides the label when the player is outside pickup range', () => {
        const scene = new THREE.Scene();
        const drop = new MinimapDrop(scene, new CANNON.Vec3(0, 0.2, 0));
        const cameraPosition = new THREE.Vector3(4, 3, 5);
        const distantPlayer = new THREE.Vector3(10, 0.2, 10);

        drop.update(0.1, cameraPosition, distantPlayer);

        expect(((drop as any).textMesh as THREE.Mesh).visible).toBe(false);
    });
});
