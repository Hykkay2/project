import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

const formatTime = (seconds: number): string => {
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainingSeconds = wholeSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export class LevelTimerHud implements GameSubsystem {
  private readonly element = document.createElement('aside')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'level-timer-hud'
    this.element.setAttribute('aria-live', 'off')
  }

  start(): void {
    this.container.append(this.element)
    this.render()
  }

  update(): void {
    this.render()
  }

  stop(): void {
    this.element.remove()
  }

  private render(): void {
    const isFinished = this.physicsWorld.getIsLevelFinished()
    const displayedSeconds = isFinished
      ? this.physicsWorld.getCompletionTimeSeconds()
      : this.physicsWorld.getLevelTimeRemainingSeconds()
    const isUrgent = !isFinished && displayedSeconds <= 60

    this.element.dataset.urgent = String(isUrgent)
    this.element.dataset.critical = String(
      !isFinished && displayedSeconds <= 10,
    )
    this.element.innerHTML = `<span>${isFinished ? 'Время прохождения' : 'Осталось времени'}</span><strong>${formatTime(displayedSeconds)}</strong>`
  }
}
