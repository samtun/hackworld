import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyTransparencyShaderToModel, createWallMaterial } from './WallShaderUtils';

function createShaderStub(): THREE.WebGLProgramParametersWithUniforms {
    return {
        uniforms: {},
        vertexShader: `
            void main() {
                #include <worldpos_vertex>
            }
        `,
        fragmentShader: `
            void main() {
                #include <color_fragment>
                #include <dithering_fragment>
            }
        `,
    } as THREE.WebGLProgramParametersWithUniforms;
}

describe('applyTransparencyShaderToModel', () => {
    it('clones mesh-standard materials and returns tracked transparent copies', () => {
        const group = new THREE.Group();
        const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), originalMaterial);
        group.add(mesh);

        const trackedMaterials = applyTransparencyShaderToModel(group);
        const updatedMaterial = mesh.material as THREE.MeshStandardMaterial;

        expect(trackedMaterials).toHaveLength(1);
        expect(trackedMaterials[0]).toBe(updatedMaterial);
        expect(updatedMaterial).not.toBe(originalMaterial);
        expect(updatedMaterial.transparent).toBe(true);
        expect(updatedMaterial.onBeforeCompile).toBeTypeOf('function');
    });

    it('only replaces mesh-standard materials when a mesh has mixed material types', () => {
        const group = new THREE.Group();
        const originalStandardMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const originalBasicMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            [originalStandardMaterial, originalBasicMaterial],
        );
        group.add(mesh);

        const trackedMaterials = applyTransparencyShaderToModel(group);
        const [updatedStandardMaterial, updatedBasicMaterial] = mesh.material as THREE.Material[];

        expect(trackedMaterials).toEqual([updatedStandardMaterial as THREE.MeshStandardMaterial]);
        expect(updatedStandardMaterial).not.toBe(originalStandardMaterial);
        expect(updatedBasicMaterial).toBe(originalBasicMaterial);
    });

    it('applies a frustum-based occlusion shader to cloned model materials', () => {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xffffff }),
        );
        group.add(mesh);

        applyTransparencyShaderToModel(group);
        const updatedMaterial = mesh.material as THREE.MeshStandardMaterial;
        const shader = createShaderStub();

        updatedMaterial.onBeforeCompile?.(shader, {} as THREE.WebGLRenderer);

        expect(shader.vertexShader).toContain('varying vec3 vWorldNormal;');
        expect(shader.fragmentShader).toContain('closestPointOnView');
        expect(shader.fragmentShader).toContain('frustumDistance');
        expect(shader.fragmentShader).toContain('surfaceFacingCamera');
        expect(shader.fragmentShader).not.toContain('proximityFactor');
    });
});

describe('createWallMaterial', () => {
    it('uses the same camera-to-player frustum mask for wall occlusion fades', () => {
        const material = createWallMaterial();
        const shader = createShaderStub();

        material.onBeforeCompile?.(shader, {} as THREE.WebGLRenderer);

        expect(shader.fragmentShader).toContain('horizontalRadius');
        expect(shader.fragmentShader).toContain('verticalRadius');
        expect(shader.fragmentShader).toContain('segmentFactor');
        expect(shader.fragmentShader).not.toContain('distToPlayer = length(vWorldPosition.xz - u_playerPos.xz);');
    });
});
