import * as THREE from "three";
import { AssetManager } from "../../AssetManager";
import { SkillFx } from "./SkillFx";

export class RangedFx extends SkillFx {
    private range: number;
    private forward: THREE.Vector3;
    private initialPosition: THREE.Vector3;

    constructor(
        duration: number,
        range: number,
        rotationY: number,
        position: THREE.Vector3,
        forward: THREE.Vector3,
        assetManager: AssetManager) {
        super(duration, 'models/fx/ranged_fx.glb', assetManager);
        this.range = range;
        this.mesh.rotation.y = rotationY;
        this.initialPosition = position;
        this.forward = forward.clone().normalize();
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Clone the material so each fx instance has its own unique uniforms/shader state
                // This fixes the issue where subsequent uses of the skill would try to reuse the old shader state/uniforms
                const originalMaterial = child.material as THREE.MeshStandardMaterial;
                this.material = originalMaterial.clone();
                child.material = this.material;

                this.material.transparent = true;
                this.material.onBeforeCompile = (shader) => {
                    shader.uniforms.uStartPosition = { value: this.initialPosition };
                    shader.uniforms.uDirection = { value: this.forward };

                    shader.vertexShader = `
                        varying vec3 vWorldPosition;
                    ` + shader.vertexShader;

                    shader.vertexShader = shader.vertexShader.replace(
                        '#include <worldpos_vertex>',
                        `
                        #include <worldpos_vertex>
                        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                        `
                    );

                    shader.fragmentShader = `
                        uniform vec3 uStartPosition;
                        uniform vec3 uDirection;
                        varying vec3 vWorldPosition;
                    ` + shader.fragmentShader;

                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <dithering_fragment>',
                        `
                        #include <dithering_fragment>
                        vec3 diff = vWorldPosition - uStartPosition;
                        float axialDistance = dot(diff, uDirection);
                        
                        // Calculate radial distance from the beam axis
                        vec3 radialVec = diff - (axialDistance * uDirection);
                        float radialDistance = length(radialVec);

                        // We want inner part (small radius) to be visible faster (at shorter axial distance)
                        // than outer part.
                        // Metric = axialDistance - radialDistance
                        float alphaMetric = axialDistance - radialDistance;

                        // Fade from 0 to 1 over first meter
                        float alphaFade = smoothstep(0.0, 1.0, alphaMetric);
                        gl_FragColor.a *= alphaFade;
                        `
                    );
                };
            }
        });
    }

    public update(dt: number) {
        super.update(dt);
        const progress = this.time / this.duration;
        const scale = this.range * Math.pow(progress, 2);
        this.mesh.scale.z = scale;
        const scaledForward = this.forward.clone().multiplyScalar(scale)
        this.mesh.position.set(
            this.initialPosition.x + scaledForward.x,
            this.initialPosition.y,
            this.initialPosition.z + scaledForward.z
        );
        if (this.material && progress >= 0.8) {
            this.material.opacity = 1.0 - (progress - 0.8) / 0.2;
        }
    }
}