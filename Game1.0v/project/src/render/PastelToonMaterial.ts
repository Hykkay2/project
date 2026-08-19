import * as THREE from 'three'

export interface PastelToonMaterialOptions {
  color: THREE.ColorRepresentation
  topColor?: THREE.ColorRepresentation
  gradientMin?: number
  gradientMax?: number
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  toonSteps?: number
}

const vertexShader = /* glsl */ `
  #include <common>
  #include <normal_pars_vertex>
  #include <shadowmap_pars_vertex>

  varying vec3 vLocalPosition;
  varying vec3 vWorldPosition;

  void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>

    vLocalPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;

    #include <shadowmap_vertex>
  }
`

const fragmentShader = /* glsl */ `
  #include <common>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>

  uniform vec3 baseColor;
  uniform vec3 topColor;
  uniform vec3 emissiveColor;
  uniform float emissiveIntensity;
  uniform float gradientMin;
  uniform float gradientMax;
  uniform float toonSteps;

  varying vec3 vLocalPosition;
  varying vec3 vWorldPosition;

  void main() {
    // Derivatives produce one normal per visible polygon: deliberately faceted.
    vec3 faceNormal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    vec3 lightDirection = normalize(vec3(-0.32, 0.74, 0.58));
    float diffuse = max(dot(faceNormal, lightDirection), 0.0);
    float steppedDiffuse = floor(diffuse * toonSteps + 0.5) / toonSteps;
    float softGradient = smoothstep(gradientMin, gradientMax, vLocalPosition.y);
    vec3 pastelColor = mix(baseColor, topColor, softGradient);
    float shadowMask = getShadowMask();
    vec3 softPurpleShadow = vec3(0.48, 0.45, 0.7);
    vec3 shadowTint = mix(softPurpleShadow, vec3(1.0), shadowMask);

    // This is a matte toon response, not a PBR lighting model: no specular or metalness.
    vec3 outgoingLight = pastelColor * (0.58 + steppedDiffuse * 0.26) * shadowTint;
    outgoingLight += emissiveColor * emissiveIntensity;
    gl_FragColor = vec4(outgoingLight, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export class PastelToonMaterial extends THREE.ShaderMaterial {
  color: THREE.Color
  topColor: THREE.Color
  emissive: THREE.Color

  constructor({
    color = 0xffffff,
    topColor = color,
    gradientMin = -0.65,
    gradientMax = 0.65,
    emissive = 0x000000,
    emissiveIntensity = 0,
    toonSteps = 3,
  }: Partial<PastelToonMaterialOptions> = {}) {
    super({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.lights,
        {
          baseColor: { value: new THREE.Color(color) },
          topColor: { value: new THREE.Color(topColor) },
          emissiveColor: { value: new THREE.Color(emissive) },
          emissiveIntensity: { value: emissiveIntensity },
          gradientMin: { value: gradientMin },
          gradientMax: { value: gradientMax },
          toonSteps: { value: toonSteps },
        },
      ]),
      vertexShader,
      fragmentShader,
      toneMapped: true,
      lights: true,
    })
    this.color = this.uniforms.baseColor.value
    this.topColor = this.uniforms.topColor.value
    this.emissive = this.uniforms.emissiveColor.value
  }

  get emissiveIntensity(): number {
    return this.uniforms.emissiveIntensity.value
  }

  set emissiveIntensity(value: number) {
    this.uniforms.emissiveIntensity.value = value
  }

  copy(source: this): this {
    super.copy(source)
    this.color = this.uniforms.baseColor.value
    this.topColor = this.uniforms.topColor.value
    this.emissive = this.uniforms.emissiveColor.value

    return this
  }
}
