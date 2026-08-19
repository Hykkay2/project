import * as THREE from 'three'

export class NightSkyBackground {
  private readonly group = new THREE.Group()
  private readonly resources: Array<
    THREE.BufferGeometry | THREE.Material | THREE.Texture
  > = []
  private starMaterial: THREE.PointsMaterial | undefined

  constructor() {
    this.group.position.z = -10
    this.group.add(
      this.createSky(),
      this.createMoon(),
      this.createStars(),
      ...this.createClouds(),
      ...this.createDistantMountains(),
      this.createDistantTemple(),
    )
  }

  attachTo(camera: THREE.Camera): void {
    camera.add(this.group)
  }

  dispose(): void {
    this.group.removeFromParent()
    this.resources.forEach((resource) => resource.dispose())
  }

  update(animationTime: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(animationTime * 0.8)

    if (this.starMaterial) {
      this.starMaterial.opacity = 0.55 + pulse * 0.45
    }
  }

  private createSky(): THREE.Mesh {
    const texture = this.createSkyTexture()
    const geometry = new THREE.PlaneGeometry(30, 18)
    const material = new THREE.MeshBasicMaterial({
      depthWrite: false,
      map: texture,
    })
    const sky = new THREE.Mesh(geometry, material)

    sky.renderOrder = -10
    this.resources.push(texture, geometry, material)

    return sky
  }

  private createSkyTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Night sky canvas context was not created')
    }

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#080b25')
    gradient.addColorStop(0.48, '#1d183f')
    gradient.addColorStop(0.7, '#4a3463')
    gradient.addColorStop(1, '#9a6b82')

    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace

    return texture
  }

  private createMoon(): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Moon canvas context was not created')
    }

    const traceLowPolyDisc = (
      centerX: number,
      centerY: number,
      radius: number,
    ) => {
      context.beginPath()

      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius

        if (index === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      }

      context.closePath()
    }

    traceLowPolyDisc(30, 32, 23)
    context.fillStyle = '#f2efff'
    context.fill()
    context.globalCompositeOperation = 'destination-out'
    traceLowPolyDisc(40, 30, 21)
    context.fill()
    context.globalCompositeOperation = 'source-over'

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    const moon = new THREE.Sprite(material)

    moon.position.set(-2.8, 1.7, 0.5)
    moon.scale.setScalar(0.85)
    moon.renderOrder = -8
    this.resources.push(texture, material)

    return moon
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array([
      -6.4, 2.9, 0.2, -5.1, 1.9, 0.2, -3.7, 3.4, 0.2, -2.1, 2.3, 0.2, -0.5, 3.1,
      0.2, 1.2, 2.1, 0.2, 2.6, 3.5, 0.2, 4.9, 2.8, 0.2, 6.2, 2.0, 0.2,
    ])
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.PointsMaterial({
      color: 0xb8c5ff,
      depthWrite: false,
      size: 0.08,
      sizeAttenuation: false,
      transparent: true,
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const stars = new THREE.Points(geometry, material)
    stars.renderOrder = -7
    this.starMaterial = material
    this.resources.push(geometry, material)

    return stars
  }

  private createClouds(): THREE.Group[] {
    return [
      this.createCloud(-5.6, 2.2, 0.72),
      this.createCloud(-0.9, 2.85, 0.48),
      this.createCloud(3.9, 2.05, 0.64),
    ]
  }

  private createCloud(x: number, y: number, scale: number): THREE.Group {
    const cloud = new THREE.Group()
    const geometry = new THREE.BoxGeometry(1.8, 0.38, 0.06)
    const material = new THREE.MeshBasicMaterial({
      color: 0x4e4a77,
      depthWrite: false,
      transparent: true,
      opacity: 0.7,
    })

    ;[
      [-0.58, 0],
      [0, 0.14],
      [0.58, -0.02],
    ].forEach(([partX, partY], index) => {
      const part = new THREE.Mesh(geometry, material)

      part.position.set(partX, partY, 0.18)
      part.scale.set(index === 1 ? 0.76 : 0.64, index === 1 ? 1.3 : 1, 1)
      cloud.add(part)
    })
    cloud.position.set(x, y, 0.18)
    cloud.scale.setScalar(scale)
    cloud.renderOrder = -7
    this.resources.push(geometry, material)

    return cloud
  }

  private createDistantMountains(): THREE.Sprite[] {
    const canvas = document.createElement('canvas')
    canvas.width = 384
    canvas.height = 128
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Mountain canvas context was not created')
    }

    const drawMountain = (
      points: ReadonlyArray<readonly [number, number]>,
      color: string,
    ) => {
      context.beginPath()
      points.forEach(([x, y], index) => {
        if (index === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      })
      context.closePath()
      context.fillStyle = color
      context.fill()
    }

    drawMountain(
      [
        [0, 128],
        [0, 86],
        [52, 24],
        [92, 80],
        [138, 42],
        [188, 128],
      ],
      '#28234f',
    )
    drawMountain(
      [
        [92, 128],
        [150, 66],
        [200, 12],
        [246, 78],
        [300, 36],
        [384, 112],
        [384, 128],
      ],
      '#33295d',
    )
    drawMountain(
      [
        [178, 128],
        [236, 76],
        [274, 46],
        [322, 89],
        [384, 58],
        [384, 128],
      ],
      '#43366b',
    )

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    const mountains = new THREE.Sprite(material)

    mountains.position.set(0, -0.35, 0.32)
    mountains.scale.set(15.5, 3.5, 1)
    mountains.renderOrder = -6
    this.resources.push(texture, material)

    return [mountains]
  }

  private createDistantTemple(): THREE.Group {
    const temple = new THREE.Group()
    const silhouetteMaterial = new THREE.MeshBasicMaterial({
      color: 0x211a3e,
      depthWrite: false,
    })
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb26b,
      depthWrite: false,
    })
    const baseGeometry = new THREE.BoxGeometry(1.05, 0.12, 0.04)
    const columnGeometry = new THREE.BoxGeometry(0.09, 0.48, 0.04)
    const roofGeometry = new THREE.ShapeGeometry(
      new THREE.Shape([
        new THREE.Vector2(-0.62, 0),
        new THREE.Vector2(0, 0.3),
        new THREE.Vector2(0.62, 0),
      ]),
    )
    const windowGeometry = new THREE.BoxGeometry(0.12, 0.16, 0.045)

    const base = new THREE.Mesh(baseGeometry, silhouetteMaterial)
    const roof = new THREE.Mesh(roofGeometry, silhouetteMaterial)
    const window = new THREE.Mesh(windowGeometry, windowMaterial)

    base.position.y = 0.06
    roof.position.y = 0.64
    window.position.set(0, 0.3, 0.025)
    temple.add(base, roof, window)
    ;[-0.34, -0.11, 0.11, 0.34].forEach((x) => {
      const column = new THREE.Mesh(columnGeometry, silhouetteMaterial)

      column.position.set(x, 0.32, 0)
      temple.add(column)
    })
    temple.position.set(3.45, 0.85, 0.55)
    temple.scale.setScalar(0.7)
    temple.renderOrder = -5
    this.resources.push(
      silhouetteMaterial,
      windowMaterial,
      baseGeometry,
      columnGeometry,
      roofGeometry,
      windowGeometry,
    )

    return temple
  }
}
