import * as THREE from 'three';

/**
 * Maps wall materials to their compiled shader objects so we can update
 * the player/camera position uniforms each frame without casting to `any`.
 */
const wallShaderMap = new WeakMap<THREE.MeshStandardMaterial, THREE.WebGLProgramParametersWithUniforms>();

/**
 * Creates a wall material that becomes transparent when the player is between
 * the wall and the camera, with a tech-styled circuit-pattern alpha mask on
 * the transparency edge.
 *
 * The shader keeps walls fully opaque when the player is on the camera side,
 * and smoothly fades them out when the player is occluded.
 */
export function createWallMaterial(color: number = 0x555555): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color, transparent: true });

    material.onBeforeCompile = (shader) => {
        // Uniforms updated each frame by BaseStage
        shader.uniforms.u_playerPos = { value: new THREE.Vector3() };
        shader.uniforms.u_cameraPos = { value: new THREE.Vector3() };

        // ---- vertex ----
        shader.vertexShader = `
            varying vec3 vWorldPosition;
            ${shader.vertexShader}
        `;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
            `
        );

        // ---- fragment ----
        shader.fragmentShader = `
            uniform vec3 u_playerPos;
            uniform vec3 u_cameraPos;
            varying vec3 vWorldPosition;
            ${shader.fragmentShader}
        `;

        // Inject transparency logic at the very end of the fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>

            // Distance from this wall fragment to the player on the XZ plane
            float distToPlayer = length(vWorldPosition.xz - u_playerPos.xz);

            // Only fade walls that are close to the player (within a radius)
            float proximityRadius = 5.0;
            float proximityFactor = 1.0 - smoothstep(0.0, proximityRadius, distToPlayer);

            // Direction from camera to player (on XZ plane only)
            vec2 camToPlayer = normalize(u_playerPos.xz - u_cameraPos.xz);

            // How far along the camera→player line is this fragment?
            float wallDist   = dot(vWorldPosition.xz - u_cameraPos.xz, camToPlayer);
            float playerDist = dot(u_playerPos.xz    - u_cameraPos.xz, camToPlayer);

            // Lateral offset of the fragment from the camera→player line
            vec2 wallOffset = (vWorldPosition.xz - u_cameraPos.xz) - wallDist * camToPlayer;
            float lateralDist = length(wallOffset);

            // The wall fragment must be between the camera and the player
            // (closer to camera than the player) and close to the camera-player line
            float behindFactor = smoothstep(playerDist + 1.0, playerDist - 2.0, wallDist);
            float lateralFactor = 1.0 - smoothstep(0.0, 3.0, lateralDist);
            float fadeMask = behindFactor * lateralFactor * proximityFactor;

            // --- Tech-styled circuit alpha mask on the transparency edge ---
            // Use world XZ coordinates to create a grid pattern
            vec2 gridPos = vWorldPosition.xz * 2.0;
            float gridX = abs(fract(gridPos.x) - 0.4);
            float gridZ = abs(fract(gridPos.y) - 0.4);
            // Circuit-like line pattern: horizontal and vertical lines
            float lineW = 0.1;
            float circuitH = step(lineW, gridX);
            float circuitV = step(lineW, gridZ);
            // Combine into a grid where lines are visible
            float circuit = 1.0 - circuitH * circuitV;
            // Add nodes at intersections
            float nodeDist = min(gridX, gridZ);
            float nodes = 1.0 - step(0.15, nodeDist);
            circuit = max(circuit, nodes);

            // Edge band: partially transparent region where circuit pattern shows
            float edgeLow  = 0.15;
            float edgeHigh = 0.85;
            float edgeBand = smoothstep(edgeLow, edgeLow + 0.1, fadeMask) *
                             (1.0 - smoothstep(edgeHigh - 0.1, edgeHigh, fadeMask));

            // Final alpha:
            //   fully opaque when fadeMask < edgeLow
            //   circuit-masked in the edge band
            //   fully transparent when fadeMask > edgeHigh
            float solidAlpha = 1.0 - smoothstep(edgeLow, edgeLow + 0.1, fadeMask);
            float coreTransp = smoothstep(edgeHigh - 0.1, edgeHigh, fadeMask);
            float circuitAlpha = edgeBand * circuit * 0.6;
            float finalAlpha = solidAlpha + circuitAlpha;
            finalAlpha = clamp(finalAlpha, 0.0, 1.0);
            finalAlpha = mix(finalAlpha, 0.0, coreTransp);

            gl_FragColor.a *= finalAlpha;
            `
        );

        // Store the shader reference in the WeakMap for uniform updates
        wallShaderMap.set(material, shader);
    };

    material.needsUpdate = true;
    return material;
}

/**
 * Update the player and camera position uniforms for all wall materials.
 */
export function updateWallUniforms(
    materials: THREE.MeshStandardMaterial[],
    playerPos: THREE.Vector3,
    cameraPos: THREE.Vector3,
): void {
    for (const mat of materials) {
        const shader = wallShaderMap.get(mat);
        if (shader) {
            shader.uniforms.u_playerPos.value.copy(playerPos);
            shader.uniforms.u_cameraPos.value.copy(cameraPos);
        }
    }
}
