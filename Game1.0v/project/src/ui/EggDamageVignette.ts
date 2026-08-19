import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

const flashDurationSeconds = 0.42

export class EggDamageVignette implements GameSubsystem {
  private readonly element = document.createElement('div')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private previousDurability: number
  private flashTimeRemaining = 0

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.previousDurability = physicsWorld.getEggDurabilityPercentage()
    this.element.className = 'egg-damage-vignette'
    this.element.setAttribute('aria-hidden', 'true')
  }

  start(): void {
    this.container.append(this.element)
  }

  update(deltaSeconds: number): void {
    const durability = this.physicsWorld.getEggDurabilityPercentage()

    if (durability < this.previousDurability) {
      this.flashTimeRemaining = flashDurationSeconds
    }

    this.previousDurability = durability
    this.flashTimeRemaining = Math.max(
      0,
      this.flashTimeRemaining - deltaSeconds,
    )
    this.container.classList.toggle(
      'egg-damage-shake',
      this.flashTimeRemaining > flashDurationSeconds * 0.55,
    )
    this.element.style.opacity = String(
      (this.flashTimeRemaining / flashDurationSeconds) * 0.9,
    )
  }

  stop(): void {
    this.container.classList.remove('egg-damage-shake')
    this.element.remove()
  }
}
