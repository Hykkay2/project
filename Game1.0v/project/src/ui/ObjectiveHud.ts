import { getObjectiveState } from '../game/Objective'
import type { GameSubsystem } from '../game/Game'
import type { PhysicsWorld } from '../game/PhysicsWorld'

export class ObjectiveHud implements GameSubsystem {
  private readonly element = document.createElement('p')
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private previousObjective = ''

  constructor(container: HTMLElement, physicsWorld: PhysicsWorld) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.element.className = 'objective-hud'
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
    const objective = getObjectiveState(this.physicsWorld).text

    if (objective !== this.previousObjective) {
      this.element.classList.remove('objective-hud--updated')
      void this.element.offsetWidth
      this.element.classList.add('objective-hud--updated')
      this.previousObjective = objective
    }

    this.element.textContent = objective
  }
}
