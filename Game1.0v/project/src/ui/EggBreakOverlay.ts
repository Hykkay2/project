import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

export class EggBreakOverlay implements GameSubsystem {
  private readonly element = document.createElement('section')
  private readonly restartButton = document.createElement('button')
  private readonly heading = document.createElement('h2')
  private readonly message = document.createElement('p')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private isVisible = false

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'egg-break-overlay'
    this.element.setAttribute('aria-live', 'assertive')
    this.element.hidden = true
    this.heading.textContent = 'Яйцо разбито'
    this.restartButton.type = 'button'
    this.restartButton.textContent = 'Перезапустить (R)'
    this.restartButton.addEventListener('click', this.restartFromCheckpoint)
    this.element.append(this.heading, this.message, this.restartButton)
  }

  start(): void {
    this.container.append(this.element)
    window.addEventListener('keydown', this.handleKeyDown)
  }

  update(): void {
    const isTimeExpired = this.physicsWorld.getIsTimeExpired()
    const shouldBeVisible = this.physicsWorld.getIsEggBroken() || isTimeExpired

    if (shouldBeVisible === this.isVisible) {
      return
    }

    this.isVisible = shouldBeVisible
    this.element.hidden = !shouldBeVisible

    if (shouldBeVisible) {
      this.heading.textContent = isTimeExpired ? 'Время вышло' : 'Яйцо разбито'
      this.message.textContent = isTimeExpired
        ? 'Лимит уровня — 3 минуты. Попробуйте пройти маршрут заново.'
        : this.physicsWorld.getIsCentralCheckpointActivated()
          ? 'Возврат к центральной контрольной точке.'
          : 'Возврат к началу храма.'
      this.restartButton.textContent = isTimeExpired
        ? 'Начать заново (R)'
        : 'Перезапустить (R)'
    }
  }

  stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    this.restartButton.removeEventListener('click', this.restartFromCheckpoint)
    this.element.remove()
  }

  private readonly restartFromCheckpoint = (): void => {
    if (this.physicsWorld.getIsTimeExpired()) {
      this.physicsWorld.restartLevel()
      return
    }

    this.physicsWorld.restartFromCheckpoint()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.code !== 'KeyR' ||
      (!this.physicsWorld.getIsEggBroken() &&
        !this.physicsWorld.getIsTimeExpired())
    ) {
      return
    }

    event.preventDefault()
    this.restartFromCheckpoint()
  }
}
