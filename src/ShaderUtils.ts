import * as THREE from 'three';

export class ShaderUtils {
    /**
     * Applies a vertical fade to the material based on world Y position.
     * Alpha will be 0 at minY and 1 at maxY.
     * @param material The material to modify
     * @param minY World Y position where alpha is 0
     * @param maxY World Y position where alpha is 1
     */
    static applyVerticalFade(material: THREE.Material, minY: number, maxY: number): void {
        material.transparent = true;

        // We hook into onBeforeCompile to inject our custom shader code
        material.onBeforeCompile = (shader) => {
            // Inject varying to pass world position to fragment shader
            shader.vertexShader = `
                varying vec3 vWorldPosition;
                ${shader.vertexShader}
            `;

            // Calculate world position
            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                `
                #include <worldpos_vertex>
                vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                `
            );

            // Inject varying in fragment shader
            shader.fragmentShader = `
                varying vec3 vWorldPosition;
                ${shader.fragmentShader}
            `;

            // Apply fade based on Y position
            // We use standard 'dithering_fragment' chunk as an anchor point at the end of the shader
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>
                float fadeAlpha = smoothstep(${minY.toFixed(2)}, ${maxY.toFixed(2)}, vWorldPosition.y);
                gl_FragColor.a *= fadeAlpha;
                `
            );
        };

        material.needsUpdate = true;
    }
}
