import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

const flashDurationSeconds = 0.7

export class FinishFlash implements GameSubsystem {
  private readonly element = document.createElement('div')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private wasFinished = false
  private flashTimeRemaining = 0

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'finish-flash'
    this.element.setAttribute('aria-hidden', 'true')
  }

  start(): void {
    this.container.append(this.element)
  }

  update(deltaSeconds: number): void {
    const isFinished = this.physicsWorld.getIsLevelFinished()

    if (isFinished && !this.wasFinished) {
      this.flashTimeRemaining = flashDurationSeconds
    }

    this.wasFinished = isFinished
    this.flashTimeRemaining = Math.max(
      0,
      this.flashTimeRemaining - deltaSeconds,
    )
    this.element.style.opacity = String(
      (this.flashTimeRemaining / flashDurationSeconds) * 0.6,
    )
  }

  stop(): void {
    this.element.remove()
  }
}
