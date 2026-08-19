import * as THREE from 'three'

export interface CameraBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export class CameraController {
  private static readonly heightAboveTarget = 1.5
  private static readonly minimumDistance = 8
  private static readonly maximumDistance = 18
  private readonly desiredPosition = new THREE.Vector3()
  private readonly camera: THREE.PerspectiveCamera
  private readonly bounds: CameraBounds
  private readonly smoothingSpeed: number

  constructor(
    camera: THREE.PerspectiveCamera,
    bounds: CameraBounds,
    smoothingSpeed = 5,
  ) {
    this.camera = camera
    this.bounds = bounds
    this.smoothingSpeed = smoothingSpeed
  }

  update(
    targetPosition: THREE.Vector3,
    focusOffset: THREE.Vector3,
    focusSpread: number,
    deltaSeconds: number,
  ): void {
    const zoomProgress = THREE.MathUtils.clamp((focusSpread - 2) / 10, 0, 1)
    this.desiredPosition.set(
      THREE.MathUtils.clamp(
        targetPosition.x + focusOffset.x,
        this.bounds.minX,
        this.bounds.maxX,
      ),
      THREE.MathUtils.clamp(
        targetPosition.y + focusOffset.y + CameraController.heightAboveTarget,
        this.bounds.minY,
        this.bounds.maxY,
      ),
      THREE.MathUtils.lerp(
        CameraController.minimumDistance,
        CameraController.maximumDistance,
        zoomProgress,
      ),
    )
    const smoothingFactor = 1 - Math.exp(-this.smoothingSpeed * deltaSeconds)
    this.camera.position.lerp(this.desiredPosition, smoothingFactor)
    this.camera.lookAt(
      this.camera.position.x,
      THREE.MathUtils.clamp(
        targetPosition.y + focusOffset.y,
        this.bounds.minY,
        this.bounds.maxY,
      ),
      0,
    )
  }
}
