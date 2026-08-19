import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'
import type { CollectionPanel } from './CollectionPanel'
import type { SoundManager } from './SoundManager'

export class MainMenu implements GameSubsystem {
  private readonly element = document.createElement('section')
  private readonly startButton = document.createElement('button')
  private readonly collectionButton = document.createElement('button')
  private readonly controlsButton = document.createElement('button')
  private readonly controls = document.createElement('p')
  private readonly volumeControl = document.createElement('input')
  private readonly volumeValue = document.createElement('strong')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private readonly collectionPanel: CollectionPanel
  private readonly soundManager: SoundManager

  constructor(
    container: HTMLElement,
    physicsWorld: PhysicsWorld,
    collectionPanel: CollectionPanel,
    soundManager: SoundManager,
  ) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.collectionPanel = collectionPanel
    this.soundManager = soundManager
    this.element.className = 'main-menu'
    this.element.innerHTML =
      '<h1>Яйцо: Зелёный храм</h1><p>Проведите яйцо через храм и сохраните птенца. Лимит уровня: 3 минуты.</p>'
    this.startButton.type = 'button'
    this.startButton.textContent = 'Начать игру'
    this.startButton.addEventListener('click', this.startGame)
    this.collectionButton.type = 'button'
    this.collectionButton.className = 'main-menu__secondary-button'
    this.collectionButton.textContent = 'Коллекция'
    this.collectionButton.addEventListener('click', this.openCollection)
    this.controlsButton.type = 'button'
    this.controlsButton.className = 'main-menu__secondary-button'
    this.controlsButton.textContent = 'Управление'
    this.controlsButton.addEventListener('click', this.toggleControls)
    this.controls.hidden = true
    this.controls.textContent =
      'Красный: A/D — движение, W — прыжок, E — действие. Синий: стрелки — движение, Shift — действие. Esc — пауза, R — перезапуск после разбития яйца.'
    this.volumeControl.type = 'range'
    this.volumeControl.min = '0'
    this.volumeControl.max = '100'
    this.volumeControl.value = String(
      Math.round(this.soundManager.getVolume() * 100),
    )
    this.volumeControl.setAttribute('aria-label', 'Громкость')
    this.volumeControl.addEventListener('input', this.updateVolume)
    const volumeLabel = document.createElement('label')
    volumeLabel.className = 'main-menu__volume'
    volumeLabel.innerHTML = '<span>Громкость</span>'
    this.volumeValue.textContent = `${this.volumeControl.value}%`
    volumeLabel.append(this.volumeControl)
    volumeLabel.append(this.volumeValue)
    this.element.append(
      this.startButton,
      this.collectionButton,
      this.controlsButton,
      this.controls,
      volumeLabel,
    )
  }

  start(): void {
    this.container.append(this.element)
    this.show()
  }

  update(): void {}

  stop(): void {
    this.startButton.removeEventListener('click', this.startGame)
    this.collectionButton.removeEventListener('click', this.openCollection)
    this.controlsButton.removeEventListener('click', this.toggleControls)
    this.volumeControl.removeEventListener('input', this.updateVolume)
    document.body.classList.remove('main-menu-open')
    this.element.remove()
  }

  show(restartLevel = false): void {
    if (restartLevel) {
      this.physicsWorld.restartLevel()
    }

    this.physicsWorld.setPaused(true)
    this.controls.hidden = true
    this.element.hidden = false
    document.body.classList.add('main-menu-open')
  }

  getIsVisible(): boolean {
    return !this.element.hidden
  }

  private readonly startGame = (): void => {
    this.element.hidden = true
    document.body.classList.remove('main-menu-open')
    this.physicsWorld.setPaused(false)
  }

  private readonly openCollection = (): void => {
    this.collectionPanel.open()
  }

  private readonly toggleControls = (): void => {
    this.controls.hidden = !this.controls.hidden
  }

  private readonly updateVolume = (): void => {
    this.soundManager.setVolume(Number(this.volumeControl.value) / 100)
    this.volumeValue.textContent = `${this.volumeControl.value}%`
  }
}
