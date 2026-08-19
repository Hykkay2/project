import type { GameSubsystem } from './Game'

export const gameKeyCodes = [
  'KeyA',
  'KeyD',
  'KeyW',
  'KeyS',
  'KeyE',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'ShiftLeft',
  'ShiftRight',
] as const

export type GameKeyCode = (typeof gameKeyCodes)[number]

export type PlayerId = 'red' | 'blue'

export type PlayerAction =
  'moveLeft' | 'moveRight' | 'jump' | 'crouch' | 'interact'

export type PlayerInputBindings = Record<
  PlayerAction,
  GameKeyCode | readonly GameKeyCode[]
>

export interface InputKeyState {
  held: boolean
  pressed: boolean
  released: boolean
}

const gameKeyCodeSet = new Set<string>(gameKeyCodes)

/**
 * Owns the keyboard state for the game loop. Short presses are promoted at
 * the start of an update, so every subsystem can observe them for one frame.
 */
export class InputManager implements GameSubsystem {
  private readonly heldKeys = new Set<GameKeyCode>()
  private readonly pendingPressedKeys = new Set<GameKeyCode>()
  private readonly pendingReleasedKeys = new Set<GameKeyCode>()
  private readonly pressedKeys = new Set<GameKeyCode>()
  private readonly releasedKeys = new Set<GameKeyCode>()
  private readonly bindings = new Map<PlayerId, PlayerInputBindings>()

  start(): void {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    window.addEventListener('blur', this.handleWindowBlur)
  }

  update(): void {
    this.pressedKeys.clear()
    this.releasedKeys.clear()
    this.pendingPressedKeys.forEach((keyCode) => this.pressedKeys.add(keyCode))
    this.pendingReleasedKeys.forEach((keyCode) =>
      this.releasedKeys.add(keyCode),
    )
    this.pendingPressedKeys.clear()
    this.pendingReleasedKeys.clear()
  }

  stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    window.removeEventListener('blur', this.handleWindowBlur)
    this.heldKeys.clear()
    this.pendingPressedKeys.clear()
    this.pendingReleasedKeys.clear()
    this.pressedKeys.clear()
    this.releasedKeys.clear()
  }

  isHeld(keyCode: GameKeyCode): boolean {
    return this.heldKeys.has(keyCode)
  }

  wasPressed(keyCode: GameKeyCode): boolean {
    return this.pressedKeys.has(keyCode)
  }

  wasReleased(keyCode: GameKeyCode): boolean {
    return this.releasedKeys.has(keyCode)
  }

  getState(keyCode: GameKeyCode): InputKeyState {
    return {
      held: this.isHeld(keyCode),
      pressed: this.wasPressed(keyCode),
      released: this.wasReleased(keyCode),
    }
  }

  setBindings(playerId: PlayerId, bindings: PlayerInputBindings): void {
    this.bindings.set(playerId, bindings)
  }

  isActionHeld(playerId: PlayerId, action: PlayerAction): boolean {
    return this.getBoundKeyCodes(playerId, action).some((keyCode) =>
      this.isHeld(keyCode),
    )
  }

  wasActionPressed(playerId: PlayerId, action: PlayerAction): boolean {
    return this.getBoundKeyCodes(playerId, action).some((keyCode) =>
      this.wasPressed(keyCode),
    )
  }

  wasActionReleased(playerId: PlayerId, action: PlayerAction): boolean {
    return this.getBoundKeyCodes(playerId, action).some((keyCode) =>
      this.wasReleased(keyCode),
    )
  }

  getActionState(playerId: PlayerId, action: PlayerAction): InputKeyState {
    return {
      held: this.isActionHeld(playerId, action),
      pressed: this.wasActionPressed(playerId, action),
      released: this.wasActionReleased(playerId, action),
    }
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isGameKeyCode(event.code)) {
      return
    }

    event.preventDefault()

    if (!this.heldKeys.has(event.code)) {
      this.heldKeys.add(event.code)
      this.pendingPressedKeys.add(event.code)
    }
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.isGameKeyCode(event.code)) {
      return
    }

    event.preventDefault()

    if (this.heldKeys.delete(event.code)) {
      this.pendingReleasedKeys.add(event.code)
    }
  }

  private readonly handleWindowBlur = (): void => {
    this.heldKeys.forEach((keyCode) => this.pendingReleasedKeys.add(keyCode))
    this.heldKeys.clear()
  }

  private isGameKeyCode(keyCode: string): keyCode is GameKeyCode {
    return gameKeyCodeSet.has(keyCode)
  }

  private getBoundKeyCodes(
    playerId: PlayerId,
    action: PlayerAction,
  ): readonly GameKeyCode[] {
    const binding = this.bindings.get(playerId)?.[action]

    if (binding === undefined) {
      return []
    }

    return typeof binding === 'string' ? [binding] : binding
  }
}
