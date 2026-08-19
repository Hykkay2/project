import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

type DurabilityStatus = 'safe' | 'warning' | 'critical'

const getDurabilityStatus = (
  durabilityPercentage: number,
): DurabilityStatus => {
  if (durabilityPercentage >= 80) {
    return 'safe'
  }

  if (durabilityPercentage >= 40) {
    return 'warning'
  }

  return 'critical'
}

export class EggDurabilityHud implements GameSubsystem {
  private readonly element = document.createElement('aside')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'egg-durability-hud'
    this.element.setAttribute('aria-live', 'polite')
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
    const durabilityPercentage = this.physicsWorld.getEggDurabilityPercentage()
    const durabilityStatus = getDurabilityStatus(durabilityPercentage)

    this.element.dataset.status = durabilityStatus
    this.element.innerHTML = `<div class="egg-durability-hud__heading"><span>Прочность яйца</span><strong>${durabilityPercentage}%</strong></div><div class="egg-durability-hud__track" role="progressbar" aria-label="Прочность яйца" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${durabilityPercentage}"><span class="egg-durability-hud__fill" style="width: ${durabilityPercentage}%"></span></div>`
  }
}
