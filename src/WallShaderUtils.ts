import * as THREE from 'three';

/**
 * Maps materials to their compiled shader objects so we can update
 * the player/camera position uniforms each frame without casting to `any`.
 */
const wallShaderMap = new WeakMap<THREE.MeshStandardMaterial, THREE.WebGLProgramParametersWithUniforms>();

// ---------------------------------------------------------------------------
// Shared GLSL helpers
// ---------------------------------------------------------------------------

/** Hash function for procedural patterns. */
const GLSL_HASH = `
float shaderHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;

/** Smooth 2D value noise built on top of shaderHash. */
const GLSL_VALUE_NOISE = `
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = shaderHash(i);
    float b = shaderHash(i + vec2(1.0, 0.0));
    float c = shaderHash(i + vec2(0.0, 1.0));
    float d = shaderHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

/** Vertex shader: declare the world-position varying. */
const VERTEX_WORLD_POS_PREAMBLE = 'varying vec3 vWorldPosition;\n';

/** Vertex shader: declare the world-normal varying (for tri-planar projection). */
const VERTEX_WORLD_NORMAL_PREAMBLE = 'varying vec3 vWorldNormal;\n';

/** Vertex shader: compute the world-position varying. */
const VERTEX_WORLD_POS_CALC = `
#include <worldpos_vertex>
vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

/** Vertex shader: compute the world-normal varying. */
const VERTEX_WORLD_NORMAL_CALC = `
vWorldNormal = normalize(mat3(modelMatrix) * normal);
`;

/**
 * Shared transparency logic for walls and obstacles. Injected in place of
 * `#include <dithering_fragment>` so it runs at the very end.
 */
const TRANSPARENCY_FRAGMENT = `
#include <dithering_fragment>

float distToPlayer = length(vWorldPosition.xz - u_playerPos.xz);
float proximityRadius = 5.0;
float proximityFactor = 1.0 - smoothstep(0.0, proximityRadius, distToPlayer);

vec2 camToPlayer = normalize(u_playerPos.xz - u_cameraPos.xz);
float wallDist   = dot(vWorldPosition.xz - u_cameraPos.xz, camToPlayer);
float playerDist = dot(u_playerPos.xz    - u_cameraPos.xz, camToPlayer);

vec2 wallOffset = (vWorldPosition.xz - u_cameraPos.xz) - wallDist * camToPlayer;
float lateralDist = length(wallOffset);

float behindFactor = smoothstep(playerDist + 1.0, playerDist - 2.0, wallDist);
float lateralFactor = 1.0 - smoothstep(0.0, 3.0, lateralDist);
float fadeMask = behindFactor * lateralFactor * proximityFactor;

vec2 gridPos = vWorldPosition.xz * 2.0;
float gridX = abs(fract(gridPos.x) - 0.4);
float gridZ = abs(fract(gridPos.y) - 0.4);
float lineW = 0.1;
float circuitH = step(lineW, gridX);
float circuitV = step(lineW, gridZ);
float circuit = 1.0 - circuitH * circuitV;
float nodeDist = min(gridX, gridZ);
float nodes = 1.0 - step(0.15, nodeDist);
circuit = max(circuit, nodes);

float edgeLow  = 0.15;
float edgeHigh = 0.85;
float edgeBand = smoothstep(edgeLow, edgeLow + 0.1, fadeMask) *
                 (1.0 - smoothstep(edgeHigh - 0.1, edgeHigh, fadeMask));

float solidAlpha = 1.0 - smoothstep(edgeLow, edgeLow + 0.1, fadeMask);
float coreTransp = smoothstep(edgeHigh - 0.1, edgeHigh, fadeMask);
float circuitAlpha = edgeBand * circuit * 0.6;
float finalAlpha = solidAlpha + circuitAlpha;
finalAlpha = clamp(finalAlpha, 0.0, 1.0);
finalAlpha = mix(finalAlpha, 0.0, coreTransp);

gl_FragColor.a *= finalAlpha;
`;

// ---------------------------------------------------------------------------
// Wall material – grayish metal sheets with random irregularities
// ---------------------------------------------------------------------------

/**
 * Creates a wall material that looks like metal panels with seams and subtle
 * surface irregularities.  Becomes transparent when the player is between the
 * wall and the camera.
 */
export function createWallMaterial(color: number = 0x555555): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        metalness: 0.6,
        roughness: 0.7,
    });

    material.onBeforeCompile = (shader) => {
        shader.uniforms.u_playerPos = { value: new THREE.Vector3() };
        shader.uniforms.u_cameraPos = { value: new THREE.Vector3() };

        // ---- vertex ----
        shader.vertexShader = VERTEX_WORLD_POS_PREAMBLE + VERTEX_WORLD_NORMAL_PREAMBLE + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            VERTEX_WORLD_POS_CALC + VERTEX_WORLD_NORMAL_CALC,
        );

        // ---- fragment ----
        shader.fragmentShader = `
            uniform vec3 u_playerPos;
            uniform vec3 u_cameraPos;
            varying vec3 vWorldPosition;
            varying vec3 vWorldNormal;
            ${GLSL_HASH}
            ${GLSL_VALUE_NOISE}
            ${shader.fragmentShader}
        `;

        // Metal panel pattern using tri-planar projection so seams are
        // not stretched on thin walls.
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            // Tri-planar projection: pick the two axes perpendicular to the
            // dominant normal so the pattern maps flat onto each face.
            vec3 wallAbsN = abs(vWorldNormal);
            vec2 panelUV;
            float panelSeed;
            if (wallAbsN.x >= wallAbsN.y && wallAbsN.x >= wallAbsN.z) {
                panelUV = vWorldPosition.yz;
                panelSeed = floor(vWorldPosition.x * 0.5);
            } else if (wallAbsN.y >= wallAbsN.z) {
                panelUV = vWorldPosition.xz;
                panelSeed = floor(vWorldPosition.y * 0.5);
            } else {
                panelUV = vWorldPosition.xy;
                panelSeed = floor(vWorldPosition.z * 0.5);
            }

            // 2 m metal panel grid
            vec2 pScaled = panelUV * 0.5;
            vec2 pFrac = fract(pScaled);
            vec2 pId = floor(pScaled);

            float sw = 0.04;
            float sA = smoothstep(0.0, sw, pFrac.x) * smoothstep(0.0, sw, 1.0 - pFrac.x);
            float sB = smoothstep(0.0, sw, pFrac.y) * smoothstep(0.0, sw, 1.0 - pFrac.y);
            float seam = sA * sB;

            float panelVar = shaderHash(pId + panelSeed * 37.0) * 0.12 - 0.06;
            float surfNoise = valueNoise(panelUV * 4.0) * 0.08 - 0.04;

            diffuseColor.rgb *= mix(0.65, 1.0, seam);
            diffuseColor.rgb += panelVar + surfNoise;
            `,
        );

        // Transparency
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            TRANSPARENCY_FRAGMENT,
        );

        wallShaderMap.set(material, shader);
    };

    material.needsUpdate = true;
    return material;
}

// ---------------------------------------------------------------------------
// Obstacle material – random rectangular shapes and tech lines
// ---------------------------------------------------------------------------

/**
 * Creates an obstacle material with a procedural tech pattern (rectangular
 * panels, component outlines, and horizontal/vertical lines).  Uses the same
 * transparency shader as walls.
 */
export function createObstacleMaterial(color: number = 0x555555): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        metalness: 0.5,
        roughness: 0.6,
    });

    material.onBeforeCompile = (shader) => {
        shader.uniforms.u_playerPos = { value: new THREE.Vector3() };
        shader.uniforms.u_cameraPos = { value: new THREE.Vector3() };

        // ---- vertex ----
        shader.vertexShader = VERTEX_WORLD_POS_PREAMBLE + VERTEX_WORLD_NORMAL_PREAMBLE + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            VERTEX_WORLD_POS_CALC + VERTEX_WORLD_NORMAL_CALC,
        );

        // ---- fragment ----
        shader.fragmentShader = `
            uniform vec3 u_playerPos;
            uniform vec3 u_cameraPos;
            varying vec3 vWorldPosition;
            varying vec3 vWorldNormal;
            ${GLSL_HASH}
            ${shader.fragmentShader}
        `;

        // Tech panel + line pattern with dark top and tri-planar sides
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            vec3 obsAbsN = abs(vWorldNormal);
            bool isTopFace = obsAbsN.y > 0.5;

            if (isTopFace) {
                // Dark flat surface on top
                diffuseColor.rgb *= 0.7;
            } else {
                // Tri-planar side UV
                vec2 sideUV;
                float sideSeed;
                if (obsAbsN.x >= obsAbsN.z) {
                    sideUV = vWorldPosition.yz;
                    sideSeed = floor(vWorldPosition.x);
                } else {
                    sideUV = vWorldPosition.xy;
                    sideSeed = floor(vWorldPosition.z);
                }

                // Block grid with non-square cells for less regularity
                vec2 blkScaled = sideUV * vec2(1.5, 1.2);
                vec2 blkFrac = fract(blkScaled);
                vec2 blkId = floor(blkScaled);
                float blkHash = shaderHash(blkId + sideSeed * 19.0);
                float blkShade = blkHash * 0.15 - 0.075;

                // Seams between blocks
                float obsW = 0.03;
                float obsSA = smoothstep(0.0, obsW, blkFrac.x) * smoothstep(0.0, obsW, 1.0 - blkFrac.x);
                float obsSB = smoothstep(0.0, obsW, blkFrac.y) * smoothstep(0.0, obsW, 1.0 - blkFrac.y);
                float obsSeam = obsSA * obsSB;

                // Irregular rectangular components with varying sizes
                vec2 cmpScaled = sideUV * vec2(3.5, 4.5);
                vec2 cmpFrac = fract(cmpScaled);
                vec2 cmpId = floor(cmpScaled);
                float cmpHash = shaderHash(cmpId + sideSeed * 41.0);
                float cmpW = 0.15 + cmpHash * 0.65;
                float cmpH = 0.15 + shaderHash(cmpId.yx + sideSeed * 37.0) * 0.65;
                float hasCmp = step(0.55, cmpHash);
                float cmpRect = step(0.5 - cmpW * 0.5, cmpFrac.x) * step(cmpFrac.x, 0.5 + cmpW * 0.5) *
                                step(0.5 - cmpH * 0.5, cmpFrac.y) * step(cmpFrac.y, 0.5 + cmpH * 0.5) * hasCmp;

                // Horizontal and vertical lines
                vec2 lnFrac = fract(sideUV * 6.0);
                float lnW = 0.04;
                float lnH = step(0.5 - lnW, lnFrac.x) * step(lnFrac.x, 0.5 + lnW);
                float lnV = step(0.5 - lnW, lnFrac.y) * step(lnFrac.y, 0.5 + lnW);
                float linePattern = max(lnH, lnV);

                diffuseColor.rgb *= mix(0.7, 1.0, obsSeam);
                diffuseColor.rgb += blkShade + cmpRect * 0.1 + linePattern * 0.06;
            }
            `,
        );

        // Transparency (same as walls)
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            TRANSPARENCY_FRAGMENT,
        );

        wallShaderMap.set(material, shader);
    };

    material.needsUpdate = true;
    return material;
}

// ---------------------------------------------------------------------------
// Floor material – circuit board pattern
// ---------------------------------------------------------------------------

/**
 * Creates a floor material with a procedural circuit-board pattern.
 * The base colour tints the board (e.g. green, blue).
 */
export function createFloorMaterial(color: number = 0x0a2a0a): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
        color,
        side: THREE.FrontSide,
        metalness: 0.1,
        roughness: 0.8,
    });

    material.onBeforeCompile = (shader) => {
        // ---- vertex ----
        shader.vertexShader = VERTEX_WORLD_POS_PREAMBLE + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            VERTEX_WORLD_POS_CALC,
        );

        // ---- fragment ----
        shader.fragmentShader = `
            varying vec3 vWorldPosition;
            ${GLSL_HASH}
            ${shader.fragmentShader}
        `;

        // Circuit board traces and pads
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            vec2 cbUV = vWorldPosition.xz;

            // Main trace grid (~0.33 m cells)
            vec2 trUV = cbUV * 3.0;
            vec2 trFrac = fract(trUV);
            vec2 trId = floor(trUV);
            float hasH = step(0.45, shaderHash(trId));
            float hasV = step(0.45, shaderHash(trId + 73.0));
            float trW = 0.06;
            float trH = step(0.5 - trW, trFrac.y) * step(trFrac.y, 0.5 + trW) * hasH;
            float trV = step(0.5 - trW, trFrac.x) * step(trFrac.x, 0.5 + trW) * hasV;
            float traces = max(trH, trV);

            // Solder pads at some intersections
            float padHash = shaderHash(trId + 137.0);
            float padDist = length(trFrac - 0.5);
            float pad = step(padHash, 0.25) * (1.0 - smoothstep(0.06, 0.09, padDist));

            // Finer sub-grid traces
            vec2 fUV = cbUV * 8.0;
            vec2 fFrac = fract(fUV);
            vec2 fId = floor(fUV);
            float fHas = step(0.6, shaderHash(fId + 200.0));
            float fVHas = step(0.6, shaderHash(fId + 300.0));
            float fW = 0.03;
            float fTraceH = step(0.5 - fW, fFrac.y) * step(fFrac.y, 0.5 + fW) * fHas;
            float fTraceV = step(0.5 - fW, fFrac.x) * step(fFrac.x, 0.5 + fW) * fVHas;
            float fineTraces = max(fTraceH, fTraceV);

            float circuitPattern = max(max(traces, pad), fineTraces);

            // Copper-tinted traces on the base colour
            vec3 traceTint = diffuseColor.rgb * 1.6 + vec3(0.04, 0.03, 0.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, traceTint, circuitPattern * 0.5);
            `,
        );
    };

    material.needsUpdate = true;
    return material;
}

// ---------------------------------------------------------------------------
// Uniform updates
// ---------------------------------------------------------------------------

/**
 * Update the player and camera position uniforms for all wall / obstacle
 * materials that use the transparency shader.
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
