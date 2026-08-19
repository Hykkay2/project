import {
  readCollectionProgress,
  templeChickId,
} from '../game/CollectionProgress'
import type { GameSubsystem } from '../game/Game'

const formatTime = (seconds: number | null): string => {
  if (seconds === null) {
    return '—'
  }

  const wholeSeconds = Math.round(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainingSeconds = wholeSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export class CollectionPanel implements GameSubsystem {
  private readonly toggleButton = document.createElement('button')
  private readonly panel = document.createElement('section')
  private readonly closeButton = document.createElement('button')
  private readonly chickCard = document.createElement('article')
  private readonly lockedCard = document.createElement('article')
  private readonly stats = document.createElement('p')
  private readonly container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.toggleButton.className = 'collection-panel__toggle'
    this.toggleButton.type = 'button'
    this.toggleButton.textContent = 'Коллекция'
    this.toggleButton.addEventListener('click', this.open)

    this.panel.className = 'collection-panel'
    this.panel.hidden = true
    this.panel.innerHTML = '<h2>Коллекция птенцов</h2>'
    this.closeButton.type = 'button'
    this.closeButton.textContent = 'Закрыть'
    this.closeButton.addEventListener('click', this.close)
    this.chickCard.className = 'collection-card'
    this.lockedCard.className = 'collection-card collection-card--locked'
    this.lockedCard.innerHTML = '<span>?</span><h3>Неизвестный птенец</h3>'
    this.stats.className = 'collection-panel__stats'
    this.panel.append(
      this.chickCard,
      this.lockedCard,
      this.stats,
      this.closeButton,
    )
  }

  start(): void {
    this.container.append(this.toggleButton, this.panel)
  }

  update(): void {}

  stop(): void {
    this.toggleButton.removeEventListener('click', this.open)
    this.closeButton.removeEventListener('click', this.close)
    this.toggleButton.remove()
    this.panel.remove()
  }

  readonly open = (): void => {
    const progress = readCollectionProgress()
    const hasTempleChick = progress.chicks.includes(templeChickId)

    this.chickCard.classList.toggle('collection-card--locked', !hasTempleChick)
    this.chickCard.innerHTML = hasTempleChick
      ? `<span>🐣</span><h3>Храмовый птенец</h3><p>Происхождение: Зелёный храм</p><p>Лучшее время: ${formatTime(progress.bestTimeSeconds)} · Прочность: ${Math.round(progress.bestEggDurabilityPercentage)}%</p>`
      : '<span>?</span><h3>Неизвестный птенец</h3><p>Завершите Зелёный храм</p>'
    this.stats.textContent = `Открыто: ${hasTempleChick ? 1 : 0}/2`
    this.panel.hidden = false
  }

  readonly close = (): void => {
    this.panel.hidden = true
  }
}
