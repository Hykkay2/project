import { getObjectiveState } from '../game/Objective'
import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'
import type { MainMenu } from './MainMenu'

const formatTime = (seconds: number): string => {
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainingSeconds = wholeSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export class PauseMenu implements GameSubsystem {
  private readonly pauseButton = document.createElement('button')
  private readonly menu = document.createElement('section')
  private readonly resumeButton = document.createElement('button')
  private readonly restartButton = document.createElement('button')
  private readonly mainMenuButton = document.createElement('button')
  private readonly stats = document.createElement('p')
  private readonly objective = document.createElement('p')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private readonly mainMenu: MainMenu

  constructor(
    container: HTMLElement,
    physicsWorld: PhysicsWorld,
    mainMenu: MainMenu,
  ) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.mainMenu = mainMenu
    this.pauseButton.className = 'pause-menu__toggle'
    this.pauseButton.type = 'button'
    this.pauseButton.textContent = 'Пауза'
    this.pauseButton.addEventListener('click', this.pause)

    this.menu.className = 'pause-menu'
    this.menu.hidden = true
    this.menu.innerHTML = '<h2>Пауза</h2>'
    this.resumeButton.type = 'button'
    this.resumeButton.textContent = 'Продолжить'
    this.resumeButton.addEventListener('click', this.resume)
    this.restartButton.type = 'button'
    this.restartButton.textContent = 'Перезапустить с контрольной точки'
    this.restartButton.addEventListener('click', this.restartFromCheckpoint)
    this.mainMenuButton.type = 'button'
    this.mainMenuButton.textContent = 'В главное меню'
    this.mainMenuButton.addEventListener('click', this.returnToMainMenu)
    this.stats.className = 'pause-menu__stats'
    this.objective.className = 'pause-menu__objective'
    this.menu.append(
      this.stats,
      this.objective,
      this.resumeButton,
      this.restartButton,
      this.mainMenuButton,
    )
  }

  start(): void {
    this.container.append(this.pauseButton, this.menu)
    window.addEventListener('keydown', this.handleKeyDown)
  }

  update(): void {
    const shouldShowMenu =
      this.physicsWorld.getIsPaused() && !this.mainMenu.getIsVisible()
    this.menu.hidden = !shouldShowMenu
    this.pauseButton.hidden = shouldShowMenu || this.mainMenu.getIsVisible()

    if (shouldShowMenu) {
      this.stats.textContent = `Осталось: ${formatTime(this.physicsWorld.getLevelTimeRemainingSeconds())} · Прочность: ${this.physicsWorld.getEggDurabilityPercentage()}%`
      this.objective.textContent = getObjectiveState(this.physicsWorld).text
    }
  }

  stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    this.pauseButton.removeEventListener('click', this.pause)
    this.resumeButton.removeEventListener('click', this.resume)
    this.restartButton.removeEventListener('click', this.restartFromCheckpoint)
    this.mainMenuButton.removeEventListener('click', this.returnToMainMenu)
    this.pauseButton.remove()
    this.menu.remove()
  }

  private readonly pause = (): void => {
    if (!this.physicsWorld.getIsEggBroken()) {
      this.physicsWorld.setPaused(true)
    }
  }

  private readonly resume = (): void => {
    this.physicsWorld.setPaused(false)
  }

  private readonly restartFromCheckpoint = (): void => {
    this.physicsWorld.restartFromCheckpoint()
    this.physicsWorld.setPaused(false)
  }

  private readonly returnToMainMenu = (): void => {
    this.mainMenu.show(true)
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.code !== 'Escape' ||
      this.mainMenu.getIsVisible() ||
      this.physicsWorld.getIsEggBroken() ||
      this.physicsWorld.getIsLevelFinished()
    ) {
      return
    }

    event.preventDefault()
    this.physicsWorld.setPaused(!this.physicsWorld.getIsPaused())
  }
}
