import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

export class ElevatorHint implements GameSubsystem {
  private readonly element = document.createElement('p')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private wasWaitingForEgg = false
  private loadedNoticeRemainingSeconds = 0

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'elevator-hint'
    this.element.textContent = 'Загрузите яйцо на подъёмник'
    this.element.hidden = true
  }

  start(): void {
    this.container.append(this.element)
  }

  update(deltaSeconds: number): void {
    const isWaitingForEgg = this.physicsWorld.getElevatorNeedsEgg()

    if (
      this.wasWaitingForEgg &&
      !isWaitingForEgg &&
      this.physicsWorld.getIsLeverActivated()
    ) {
      this.loadedNoticeRemainingSeconds = 2
    }

    this.wasWaitingForEgg = isWaitingForEgg
    this.loadedNoticeRemainingSeconds = Math.max(
      0,
      this.loadedNoticeRemainingSeconds - deltaSeconds,
    )

    if (isWaitingForEgg) {
      this.element.hidden = false
      this.element.classList.remove('elevator-hint--loaded')
      this.element.textContent = 'Загрузите яйцо на подъёмник'
      return
    }

    const showLoadedNotice = this.loadedNoticeRemainingSeconds > 0
    this.element.hidden = !showLoadedNotice
    this.element.classList.toggle('elevator-hint--loaded', showLoadedNotice)

    if (showLoadedNotice) {
      this.element.textContent = 'Яйцо загружено — подъёмник активирован'
    }
  }

  stop(): void {
    this.element.remove()
  }
}
