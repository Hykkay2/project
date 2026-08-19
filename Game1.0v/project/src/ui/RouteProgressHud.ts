import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

interface RouteStage {
  label: string
  startsAtX: number
}

const routeStages: readonly RouteStage[] = [
  { label: 'Старт', startsAtX: 0 },
  { label: 'Храм', startsAtX: 24 },
  { label: 'Подъёмник', startsAtX: 57 },
  { label: 'Гнездо', startsAtX: 86 },
]

const getStage = (eggX: number): RouteStage =>
  routeStages.findLast((stage) => eggX >= stage.startsAtX) ?? routeStages[0]

export class RouteProgressHud implements GameSubsystem {
  private readonly element = document.createElement('aside')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'route-progress-hud'
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
    const eggX = this.physicsWorld.getEggTranslation().x
    const stage = getStage(eggX)
    const progress = Math.round(Math.min(100, Math.max(0, (eggX / 97.5) * 100)))
    const checkpointText = this.physicsWorld.getIsCentralCheckpointActivated()
      ? 'Контрольная точка: активна'
      : 'Контрольная точка: впереди'

    this.element.innerHTML = `<div class="route-progress-hud__heading"><span>Маршрут</span><strong>${stage.label}</strong></div><div class="route-progress-hud__track" role="progressbar" aria-label="Прогресс маршрута" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width: ${progress}%"></span></div><div class="route-progress-hud__labels"><span>Старт</span><span>Гнездо</span></div><p class="route-progress-hud__checkpoint">${checkpointText}</p>`
  }
}
