import { recordTempleCompletion } from './CollectionProgress'
import type { GameSubsystem } from './Game'
import type { PhysicsWorld } from './PhysicsWorld'

export class CollectionProgressTracker implements GameSubsystem {
  private readonly physicsWorld: PhysicsWorld
  private hasRecordedCurrentFinish = false

  constructor(physicsWorld: PhysicsWorld) {
    this.physicsWorld = physicsWorld
  }

  start(): void {}

  update(): void {
    if (!this.physicsWorld.getIsLevelFinished()) {
      this.hasRecordedCurrentFinish = false
      return
    }

    if (this.hasRecordedCurrentFinish) {
      return
    }

    recordTempleCompletion(
      this.physicsWorld.getCompletionTimeSeconds(),
      this.physicsWorld.getEggDurabilityPercentage(),
    )
    this.hasRecordedCurrentFinish = true
  }

  stop(): void {}
}
