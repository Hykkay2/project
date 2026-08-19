import { PastelToonMaterial } from './PastelToonMaterial'

export class GameMaterials {
  readonly stone = new PastelToonMaterial({
    color: 0x796d9b,
    topColor: 0xb7a6d2,
    gradientMin: -0.75,
    gradientMax: 0.75,
  })

  readonly wood = new PastelToonMaterial({
    color: 0xb78167,
    topColor: 0xf0c796,
    gradientMin: -0.6,
    gradientMax: 0.6,
  })

  readonly moss = new PastelToonMaterial({
    color: 0x65ad78,
    topColor: 0xb8e3a5,
    gradientMin: -0.35,
    gradientMax: 0.35,
    emissive: 0x17311f,
    emissiveIntensity: 0.08,
  })

  readonly grass = new PastelToonMaterial({
    color: 0x75b86e,
    topColor: 0xd3ecae,
    gradientMin: -0.08,
    gradientMax: 0.08,
  })

  readonly metal = new PastelToonMaterial({
    color: 0xa9c2d7,
    topColor: 0xf0d9df,
    gradientMin: -0.65,
    gradientMax: 0.65,
  })

  readonly spikes = new PastelToonMaterial({
    color: 0x756f83,
    topColor: 0xc7c1d1,
    emissive: 0x211c2e,
    emissiveIntensity: 0.08,
  })

  readonly egg = new PastelToonMaterial({
    color: 0xd8d0e9,
    topColor: 0xfff4dd,
    gradientMin: -1,
    gradientMax: 1,
    emissive: 0x1d1535,
    emissiveIntensity: 0.06,
  })

  readonly redMechanism = new PastelToonMaterial({
    color: 0xd66f9a,
    topColor: 0xffb4cf,
    emissive: 0x4f1936,
    emissiveIntensity: 0.18,
  })

  readonly blueMechanism = new PastelToonMaterial({
    color: 0x6d9fd8,
    topColor: 0xb9dbf5,
    emissive: 0x1e365b,
    emissiveIntensity: 0.18,
  })

  readonly all = [
    this.stone,
    this.wood,
    this.moss,
    this.grass,
    this.metal,
    this.spikes,
    this.egg,
    this.redMechanism,
    this.blueMechanism,
  ] as const

  dispose(): void {
    this.all.forEach((material) => material.dispose())
  }
}
