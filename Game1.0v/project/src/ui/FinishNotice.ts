import type { GameSubsystem } from '../game/Game'
import { readCollectionProgress } from '../game/CollectionProgress'
import type { PhysicsWorld } from '../game/PhysicsWorld'
import type { SceneRenderer } from '../render/SceneRenderer'
import type { CollectionPanel } from './CollectionPanel'
import type { MainMenu } from './MainMenu'

const formatTime = (seconds: number): string => {
  const wholeSeconds = Math.round(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainingSeconds = wholeSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const getCompletionAssessment = (durability: number): string => {
  if (durability === 100) {
    return 'Идеальный маршрут'
  }

  if (durability >= 75) {
    return 'Бережная доставка'
  }

  if (durability >= 50) {
    return 'Спасение выполнено'
  }

  return 'Птенец спасён!'
}

export class FinishNotice implements GameSubsystem {
  private readonly element = document.createElement('section')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private readonly renderer: SceneRenderer
  private readonly collectionPanel: CollectionPanel
  private readonly mainMenu: MainMenu
  private readonly skipButton = document.createElement('button')
  private readonly collectionButton = document.createElement('button')
  private readonly replayButton = document.createElement('button')
  private readonly mainMenuButton = document.createElement('button')
  private readonly result = document.createElement('p')

  constructor(
    container: HTMLElement,
    physicsWorld: PhysicsWorld,
    renderer: SceneRenderer,
    collectionPanel: CollectionPanel,
    mainMenu: MainMenu,
  ) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.renderer = renderer
    this.collectionPanel = collectionPanel
    this.mainMenu = mainMenu
    this.element.className = 'finish-notice'
    this.element.hidden = true
    this.element.innerHTML = '<h2>Яйцо в гнезде!</h2><p>Вылупление...</p>'
    this.skipButton.type = 'button'
    this.skipButton.textContent = 'Пропустить'
    this.skipButton.addEventListener('click', this.skipHatching)
    this.collectionButton.type = 'button'
    this.collectionButton.className = 'finish-notice__collection-button'
    this.collectionButton.textContent = 'Открыть коллекцию'
    this.collectionButton.hidden = true
    this.collectionButton.addEventListener('click', this.openCollection)
    this.replayButton.type = 'button'
    this.replayButton.className = 'finish-notice__replay-button'
    this.replayButton.textContent = 'Пройти ещё раз'
    this.replayButton.hidden = true
    this.replayButton.addEventListener('click', this.restartLevel)
    this.mainMenuButton.type = 'button'
    this.mainMenuButton.className = 'finish-notice__menu-button'
    this.mainMenuButton.textContent = 'В меню'
    this.mainMenuButton.hidden = true
    this.mainMenuButton.addEventListener('click', this.returnToMainMenu)
    this.result.className = 'finish-notice__result'
    this.result.hidden = true
    this.element.append(
      this.result,
      this.skipButton,
      this.collectionButton,
      this.replayButton,
      this.mainMenuButton,
    )
  }

  start(): void {
    this.container.append(this.element)
  }

  update(): void {
    const isFinished = this.physicsWorld.getIsLevelFinished()
    this.element.hidden = !isFinished

    if (!isFinished) {
      this.element.querySelector('p')!.textContent = 'Вылупление...'
      this.skipButton.hidden = false
      this.collectionButton.hidden = true
      this.replayButton.hidden = true
      this.mainMenuButton.hidden = true
      this.result.hidden = true
      return
    }

    if (this.renderer.getHasHatched()) {
      this.element.querySelector('p')!.textContent = 'Птенец вылупился!'
      this.skipButton.hidden = true
      this.collectionButton.hidden = false
      this.replayButton.hidden = false
      this.mainMenuButton.hidden = false
      this.renderResult()
      this.result.hidden = false
    }
  }

  stop(): void {
    this.skipButton.removeEventListener('click', this.skipHatching)
    this.collectionButton.removeEventListener('click', this.openCollection)
    this.replayButton.removeEventListener('click', this.restartLevel)
    this.mainMenuButton.removeEventListener('click', this.returnToMainMenu)
    this.element.remove()
  }

  private readonly skipHatching = (): void => {
    this.renderer.skipHatching()
  }

  private readonly openCollection = (): void => {
    this.collectionPanel.open()
  }

  private readonly restartLevel = (): void => {
    this.collectionPanel.close()
    this.physicsWorld.restartLevel()
  }

  private readonly returnToMainMenu = (): void => {
    this.collectionPanel.close()
    this.mainMenu.show(true)
  }

  private renderResult(): void {
    const completionTime = this.physicsWorld.getCompletionTimeSeconds()
    const durability = this.physicsWorld.getEggDurabilityPercentage()
    const collection = readCollectionProgress()
    const isBestTime = collection.bestTimeSeconds === completionTime
    const isBestDurability =
      collection.bestEggDurabilityPercentage === durability
    const records = [
      isBestTime ? 'лучшее время' : undefined,
      isBestDurability ? 'лучшая прочность' : undefined,
    ].filter((record): record is string => record !== undefined)
    const recordText =
      records.length > 0 ? ` · Рекорд: ${records.join(', ')}` : ''

    this.result.classList.toggle(
      'finish-notice__result--record',
      records.length > 0,
    )
    this.result.textContent = `${getCompletionAssessment(durability)} · Время: ${formatTime(completionTime)} · Прочность: ${durability}%${recordText}`
  }
}
