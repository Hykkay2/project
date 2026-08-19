import type { GameSubsystem } from '../game/Game'
import type { PlayerId } from '../game/InputManager'
import type { PhysicsWorld } from '../game/PhysicsWorld'

const interactionKeys: Record<PlayerId, string> = {
  red: 'E',
  blue: 'Shift',
}

export class InteractionHint implements GameSubsystem {
  private readonly element = document.createElement('p')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'interaction-hint'
    this.element.hidden = true
  }

  start(): void {
    this.container.append(this.element)
  }

  update(): void {
    const elevatorPlayer = this.physicsWorld.getElevatorLeverNearbyPlayer()
    const leverPlayer = this.physicsWorld.getLeverNearbyPlayer()
    const eggPlayer = this.getEggNearbyPlayer()
    const nearbyPlayer = elevatorPlayer ?? leverPlayer ?? eggPlayer
    this.element.hidden = nearbyPlayer === undefined

    if (nearbyPlayer !== undefined) {
      this.element.dataset.player = nearbyPlayer
      this.element.textContent =
        elevatorPlayer !== undefined
          ? `${interactionKeys[nearbyPlayer]} — удерживать подъёмник`
          : leverPlayer !== undefined
            ? `${interactionKeys[nearbyPlayer]} — переключить рычаг`
            : `${interactionKeys[nearbyPlayer]} + ${nearbyPlayer === 'red' ? 'A/D' : '←/→'} — толкать яйцо`
    } else {
      delete this.element.dataset.player
    }
  }

  stop(): void {
    this.element.remove()
  }

  private getEggNearbyPlayer(): PlayerId | undefined {
    const egg = this.physicsWorld.getEggTranslation()
    const players: readonly [PlayerId, typeof egg][] = [
      ['red', this.physicsWorld.getRedPlayerTranslation()],
      ['blue', this.physicsWorld.getBluePlayerTranslation()],
    ]

    return players.find(([, player]) => {
      const distance = Math.hypot(
        player.x - egg.x,
        player.y - egg.y,
        player.z - egg.z,
      )

      return distance <= 1.25
    })?.[0]
  }
}
