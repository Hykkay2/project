import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

const visibleDurationSeconds = 3

export class CheckpointNotice implements GameSubsystem {
  private readonly element = document.createElement('p')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private wasCheckpointActive = false
  private visibleTimeRemaining = 0

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'checkpoint-notice'
    this.element.hidden = true
    this.element.textContent = 'Контрольная точка сохранена'
  }

  start(): void {
    this.container.append(this.element)
  }

  update(deltaSeconds: number): void {
    const isCheckpointActive =
      this.physicsWorld.getIsCentralCheckpointActivated()

    if (isCheckpointActive && !this.wasCheckpointActive) {
      this.visibleTimeRemaining = visibleDurationSeconds
    }

    this.wasCheckpointActive = isCheckpointActive
    this.visibleTimeRemaining = Math.max(
      0,
      this.visibleTimeRemaining - deltaSeconds,
    )
    this.element.hidden = this.visibleTimeRemaining <= 0
  }

  stop(): void {
    this.element.remove()
  }
}
