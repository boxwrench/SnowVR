import * as THREE from 'three'

const contactShadowVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const contactShadowFragmentShader = `
uniform float uOpacity;

varying vec2 vUv;

void main() {
  // Multiply blending: the output is a per-channel darkening factor, so 1.0
  // leaves the snow untouched and lower values shade it.
  float falloff = 1.0 - smoothstep(0.0, 1.0, length(vUv - 0.5) * 2.0);
  float darkening = 1.0 - falloff * uOpacity;

  gl_FragColor = vec4(vec3(darkening), 1.0);
}
`

/**
 * Fake contact shadow for the rider.
 *
 * Shadow maps are outside the Quest 3 frame budget, and without any grounding
 * cue the board reads as floating above the snow in third person.
 */
export function createContactShadowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: contactShadowVertexShader,
    fragmentShader: contactShadowFragmentShader,
    uniforms: {
      uOpacity: { value: 0.45 },
    },
    blending: THREE.MultiplyBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
}
