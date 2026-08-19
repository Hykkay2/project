export interface GameSubsystem {
  start(): void
  update(deltaSeconds: number): void
  stop(): void
}

export class GameSubsystemStub implements GameSubsystem {
  start(): void {}

  update(): void {}

  stop(): void {}
}

export class Game {
  private animationFrameId: number | undefined
  private isRunning = false
  private lastFrameTime: number | undefined
  private readonly subsystems: readonly GameSubsystem[]

  constructor(subsystems: readonly GameSubsystem[]) {
    this.subsystems = subsystems
  }

  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.subsystems.forEach((subsystem) => subsystem.start())
    this.animationFrameId = requestAnimationFrame(this.runFrame)
  }

  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    this.lastFrameTime = undefined

    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = undefined
    }

    const subsystemsInReverseOrder = [...this.subsystems].reverse()
    subsystemsInReverseOrder.forEach((subsystem) => subsystem.stop())
  }

  private readonly runFrame = (currentTime: number): void => {
    if (!this.isRunning) {
      return
    }

    const deltaSeconds =
      this.lastFrameTime === undefined
        ? 0
        : Math.min((currentTime - this.lastFrameTime) / 1000, 0.1)

    this.lastFrameTime = currentTime
    this.subsystems.forEach((subsystem) => subsystem.update(deltaSeconds))
    this.animationFrameId = requestAnimationFrame(this.runFrame)
  }
}
