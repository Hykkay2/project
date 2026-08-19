import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

const flashDurationSeconds = 0.5

export class CheckpointFlash implements GameSubsystem {
  private readonly element = document.createElement('div')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private wasCheckpointActive = false
  private flashTimeRemaining = 0

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'checkpoint-flash'
    this.element.setAttribute('aria-hidden', 'true')
  }

  start(): void {
    this.container.append(this.element)
  }

  update(deltaSeconds: number): void {
    const isCheckpointActive =
      this.physicsWorld.getIsCentralCheckpointActivated()

    if (isCheckpointActive && !this.wasCheckpointActive) {
      this.flashTimeRemaining = flashDurationSeconds
    }

    this.wasCheckpointActive = isCheckpointActive
    this.flashTimeRemaining = Math.max(
      0,
      this.flashTimeRemaining - deltaSeconds,
    )
    this.element.style.opacity = String(
      (this.flashTimeRemaining / flashDurationSeconds) * 0.55,
    )
  }

  stop(): void {
    this.element.remove()
  }
}
