import {
  type GameKeyCode,
  type InputManager,
  type PlayerAction,
  type PlayerId,
  type PlayerInputBindings,
} from '../game/InputManager'
import type { GameSubsystem } from '../game/Game'

const redActionLabels: Record<PlayerAction, string> = {
  moveLeft: 'идти влево',
  moveRight: 'идти вправо',
  jump: 'прыжок',
  crouch: 'присесть / спуск',
  interact: 'взаимодействие',
}

const playerLabels: Record<PlayerId, string> = {
  red: 'Красный',
  blue: 'Синий',
}

const keyLabels: Record<GameKeyCode, string> = {
  KeyA: 'A',
  KeyD: 'D',
  KeyW: 'W',
  KeyS: 'S',
  KeyE: 'E',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ShiftLeft: 'L Shift',
  ShiftRight: 'R Shift',
}

export class InputDebugOverlay implements GameSubsystem {
  private readonly element = document.createElement('aside')
  private readonly details = document.createElement('details')
  private readonly controls = document.createElement('div')
  private readonly container: HTMLElement
  private readonly input: InputManager
  private readonly redBindings: PlayerInputBindings
  private readonly blueBindings: PlayerInputBindings

  constructor(
    container: HTMLElement,
    input: InputManager,
    redBindings: PlayerInputBindings,
    blueBindings: PlayerInputBindings,
  ) {
    this.container = container
    this.input = input
    this.redBindings = redBindings
    this.blueBindings = blueBindings
    this.element.className = 'input-debug-overlay'
    this.element.setAttribute('aria-live', 'polite')
    this.details.open = false
    this.details.innerHTML = '<summary>Управление</summary>'
    this.controls.className = 'input-debug-overlay__controls'
    this.details.append(this.controls)
    this.element.append(this.details)
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
    const redControls = this.renderPlayerControls('red', this.redBindings)
    const blueControls = this.renderPlayerControls('blue', this.blueBindings)

    this.controls.innerHTML = `<p>Краткие статусы «нажата» и «отпущена» видны один кадр.</p>${redControls}${blueControls}`
  }

  private renderPlayerControls(
    playerId: PlayerId,
    bindings: PlayerInputBindings,
  ): string {
    const rows = (Object.keys(bindings) as PlayerAction[])
      .map((action) => {
        const state = this.input.getActionState(playerId, action)
        const status = state.held
          ? 'удерживается'
          : state.pressed
            ? 'нажата'
            : state.released
              ? 'отпущена'
              : 'ожидание'

        const keyLabel = this.getKeyLabel(action, bindings[action])

        return `<li><kbd>${keyLabel}</kbd><span>${redActionLabels[action]}: ${status}</span></li>`
      })
      .join('')

    return `<section><h3>${playerLabels[playerId]}</h3><ul>${rows}</ul></section>`
  }

  private getKeyLabel(
    action: PlayerAction,
    binding: PlayerInputBindings[PlayerAction],
  ): string {
    if (action === 'interact' && typeof binding !== 'string') {
      return 'Shift'
    }

    return keyLabels[typeof binding === 'string' ? binding : binding[0]]
  }
}
