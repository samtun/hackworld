import * as THREE from 'three';

/**
 * Shared utilities for particle shader calculations
 * Used by particle systems (Portal, HealingStation, etc.)
 */

// Camera FOV constant (45 degrees) - matches Game.ts camera setup
export const CAMERA_FOV_RADIANS = (45 * Math.PI) / 180;

/**
 * Calculate the scale factor for perspective-correct particle sizing
 * Formula: viewportHeight / (2 * tan(fov/2))
 * 
 * This ensures particles maintain consistent visual size across different screen resolutions
 * by accounting for the viewport height and camera field of view.
 */
export function calculateParticleScaleFactor(): number {
    return window.innerHeight / (2.0 * Math.tan(CAMERA_FOV_RADIANS / 2.0));
}

/**
 * Vertex shader for screen-independent particle sizing
 * Uses scaleFactor uniform to calculate perspective-correct point size
 */
export const PARTICLE_VERTEX_SHADER = `
    attribute float size;
    uniform float scaleFactor;
    
    void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (scaleFactor / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

/**
 * Fragment shader for particle rendering with circular alpha gradient
 * Creates soft, circular particles with color from uniform
 */
export const PARTICLE_FRAGMENT_SHADER = `
    uniform vec3 color;
    
    void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - (dist * 2.0);
        alpha = alpha * alpha;
        
        gl_FragColor = vec4(color, alpha * 0.9);
    }
`;

/**
 * Create a shader material for particles with screen-independent sizing
 * @param color - The color of the particles
 * @returns THREE.ShaderMaterial configured for particle rendering
 */
export function createParticleShaderMaterial(color: THREE.Color): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            color: { value: color },
            scaleFactor: { value: calculateParticleScaleFactor() }
        },
        vertexShader: PARTICLE_VERTEX_SHADER,
        fragmentShader: PARTICLE_FRAGMENT_SHADER,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
}

/**
 * Update the scale factor uniform in a particle shader material
 * Should be called when window is resized
 * @param material - The shader material to update
 */
export function updateParticleScaleFactor(material: THREE.ShaderMaterial): void {
    if (material && material.uniforms && material.uniforms.scaleFactor) {
        material.uniforms.scaleFactor.value = calculateParticleScaleFactor();
    }
}
