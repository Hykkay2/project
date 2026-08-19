import type { GameSubsystem } from '../game/Game'

export class FullscreenToggle implements GameSubsystem {
  private readonly button = document.createElement('button')
  private readonly container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.button.className = 'fullscreen-toggle'
    this.button.type = 'button'
    this.button.addEventListener('click', this.toggleFullscreen)
    document.addEventListener('fullscreenchange', this.render)
    this.render()
  }

  start(): void {
    this.container.append(this.button)
  }

  update(): void {}

  stop(): void {
    this.button.removeEventListener('click', this.toggleFullscreen)
    document.removeEventListener('fullscreenchange', this.render)
    this.button.remove()
  }

  private readonly toggleFullscreen = (): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    void this.container.requestFullscreen()
  }

  private readonly render = (): void => {
    const isFullscreen = document.fullscreenElement !== null
    this.button.textContent = isFullscreen
      ? 'Выйти из полного экрана'
      : 'На весь экран'
    this.button.setAttribute('aria-pressed', String(isFullscreen))
  }
}
