/**
 * Liquid Glass Shader
 * Realistic glass material with refraction, reflections, and fresnel
 */

import * as THREE from "https://esm.sh/three@0.152.2";
import { LIQUID_GLASS_CONFIG } from "./config.js";

// Vertex Shader - with skinning support
const vertexShader = `
#include <common>
#include <skinning_pars_vertex>

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    
    #include <begin_vertex>
    #include <skinning_vertex>
    
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    vec3 transformedNormal = normalMatrix * objectNormal;
    vWorldNormal = normalize(transformedNormal);
    
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment Shader - liquid glass effect
const fragmentShader = `
uniform samplerCube envMap;
uniform float time;
uniform float thickness;
uniform float ior;
uniform float reflectivity;
uniform float fresnelPower;
uniform vec3 glassColor;
uniform float opacity;
uniform float chromaticAberration;
uniform float distortion;
uniform float distortionScale;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

// Fresnel effect (Schlick's approximation)
float fresnel(vec3 viewDir, vec3 normal, float power) {
    float cosTheta = abs(dot(viewDir, normal)); // abs for consistent edges
    float f0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
    return f0 + (1.0 - f0) * pow(1.0 - cosTheta, power);
}

// Improved noise for liquid distortion
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// Animated liquid distortion
vec3 getDistortedNormal(vec3 normal, vec2 uv, float time) {
    float n1 = snoise(uv * distortionScale + vec2(time * 0.3, time * 0.2));
    float n2 = snoise(uv * distortionScale * 2.0 - vec2(time * 0.2, time * 0.3));
    float n3 = snoise(uv * distortionScale * 0.5 + vec2(time * 0.15, -time * 0.15));
    
    vec3 distortionVec = vec3(
        n1 * 0.4 + n2 * 0.2,
        n2 * 0.4 + n3 * 0.2,
        n3 * 0.4 + n1 * 0.2
    ) * distortion;
    
    return normalize(normal + distortionVec);
}

void main() {
    // CRITICAL: Use world space for view direction
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    
    // Get and distort normal
    vec3 normal = normalize(vWorldNormal);
    vec3 distortedNormal = getDistortedNormal(normal, vUv, time);
    
    // Calculate reflection direction
    vec3 reflectDir = reflect(-viewDir, distortedNormal);
    
    // Calculate refraction with STRONG chromatic aberration
    // Multiply aberration for more visible effect
    float chromaticStrength = chromaticAberration * 0.05;
    float iorR = ior + chromaticStrength;
    float iorG = ior;
    float iorB = ior - chromaticStrength;
    
    vec3 refractDirR = refract(-viewDir, distortedNormal, 1.0 / iorR);
    vec3 refractDirG = refract(-viewDir, distortedNormal, 1.0 / iorG);
    vec3 refractDirB = refract(-viewDir, distortedNormal, 1.0 / iorB);
    
    // Fallback to reflection if total internal reflection occurs
    if (length(refractDirR) < 0.01) refractDirR = reflectDir;
    if (length(refractDirG) < 0.01) refractDirG = reflectDir;
    if (length(refractDirB) < 0.01) refractDirB = reflectDir;
    
    // Sample environment map for reflection
    vec3 reflectColor = textureCube(envMap, reflectDir).rgb;
    
    // Sample environment map with chromatic aberration
    float refractR = textureCube(envMap, refractDirR).r;
    float refractG = textureCube(envMap, refractDirG).g;
    float refractB = textureCube(envMap, refractDirB).b;
    vec3 refractColor = vec3(refractR, refractG, refractB);
    
    // Calculate fresnel (edge glow)
    float fresnelFactor = fresnel(viewDir, distortedNormal, fresnelPower);
    
    // Mix reflection and refraction based on fresnel
    vec3 finalColor = mix(refractColor, reflectColor, fresnelFactor * reflectivity);
    
    // Apply glass color tint
    finalColor *= glassColor;
    
    // Add depth/thickness effect
    float depthFactor = 1.0 - pow(fresnelFactor, thickness);
    vec3 depthColor = glassColor * 0.3;
    finalColor = mix(finalColor, depthColor, depthFactor * 0.4);
    
    // Boost brightness for more striking effect
    finalColor *= 1.8;
    
    gl_FragColor = vec4(finalColor, opacity);
}
`;

/**
 * Create a liquid glass shader material
 * @param {THREE.CubeTexture} envMap - The environment map
 * @param {boolean} isSkinnedMesh - Whether this material is for a skinned mesh
 * @returns {THREE.ShaderMaterial} The shader material
 */
export function createLiquidGlassMaterial(envMap, isSkinnedMesh = true) {
    const material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.common,
            THREE.UniformsLib.skinning,
            {
                envMap: { value: envMap },
                time: { value: 0.0 },
                thickness: { value: LIQUID_GLASS_CONFIG.THICKNESS },
                ior: { value: LIQUID_GLASS_CONFIG.IOR },
                reflectivity: { value: LIQUID_GLASS_CONFIG.REFLECTIVITY },
                fresnelPower: { value: LIQUID_GLASS_CONFIG.FRESNEL_POWER },
                glassColor: { value: new THREE.Color(
                    LIQUID_GLASS_CONFIG.COLOR_R,
                    LIQUID_GLASS_CONFIG.COLOR_G,
                    LIQUID_GLASS_CONFIG.COLOR_B
                )},
                opacity: { value: LIQUID_GLASS_CONFIG.OPACITY },
                chromaticAberration: { value: LIQUID_GLASS_CONFIG.CHROMATIC_ABERRATION },
                distortion: { value: LIQUID_GLASS_CONFIG.DISTORTION },
                distortionScale: { value: LIQUID_GLASS_CONFIG.DISTORTION_SCALE }
            }
        ]),
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.FrontSide, // Only render front faces (back-face culling)
        transparent: true,
        skinning: isSkinnedMesh,
        lights: false,
        depthWrite: false, // Important for proper transparency
        depthTest: true
    });
    
    // CRITICAL: Ensure no texture is used
    material.map = null;
    material.defines = material.defines || {};
    material.defines.USE_MAP = false;
    material.needsUpdate = true;
    
    return material;
}

/**
 * Update shader uniforms (call this in your animation loop if ANIMATE is enabled)
 * @param {THREE.ShaderMaterial} material - The shader material to update
 * @param {number} deltaTime - Time elapsed since last frame
 */
export function updateLiquidGlassShader(material, deltaTime) {
    if (!material || !material.uniforms) return;
    
    if (LIQUID_GLASS_CONFIG.ANIMATE) {
        material.uniforms.time.value += deltaTime * LIQUID_GLASS_CONFIG.ANIMATION_SPEED;
    }
    
    // Update uniforms from config (allows live tweaking)
    material.uniforms.thickness.value = LIQUID_GLASS_CONFIG.THICKNESS;
    material.uniforms.ior.value = LIQUID_GLASS_CONFIG.IOR;
    material.uniforms.reflectivity.value = LIQUID_GLASS_CONFIG.REFLECTIVITY;
    material.uniforms.fresnelPower.value = LIQUID_GLASS_CONFIG.FRESNEL_POWER;
    material.uniforms.glassColor.value.set(
        LIQUID_GLASS_CONFIG.COLOR_R,
        LIQUID_GLASS_CONFIG.COLOR_G,
        LIQUID_GLASS_CONFIG.COLOR_B
    );
    material.uniforms.opacity.value = LIQUID_GLASS_CONFIG.OPACITY;
    material.uniforms.chromaticAberration.value = LIQUID_GLASS_CONFIG.CHROMATIC_ABERRATION;
    material.uniforms.distortion.value = LIQUID_GLASS_CONFIG.DISTORTION;
    material.uniforms.distortionScale.value = LIQUID_GLASS_CONFIG.DISTORTION_SCALE;
}