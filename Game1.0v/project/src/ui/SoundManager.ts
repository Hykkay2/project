import type { PhysicsWorld } from '../game/PhysicsWorld'
import type { GameSubsystem } from '../game/Game'
import type { InputManager } from '../game/InputManager'
import type { SceneRenderer } from '../render/SceneRenderer'

const settingsKey = 'egg-temple:sound:v1'
const defaultVolume = 0.35

const clampVolume = (volume: number): number => Math.min(1, Math.max(0, volume))

const readVolume = (): number => {
  try {
    const stored = window.localStorage.getItem(settingsKey)
    const parsed = stored
      ? (JSON.parse(stored) as { volume?: unknown })
      : undefined
    return typeof parsed?.volume === 'number'
      ? clampVolume(parsed.volume)
      : defaultVolume
  } catch {
    return defaultVolume
  }
}

export class SoundManager implements GameSubsystem {
  private readonly physicsWorld: PhysicsWorld
  private readonly renderer: SceneRenderer
  private readonly input: InputManager
  private audioContext: AudioContext | undefined
  private volume = readVolume()
  private previousDurability: number
  private wasLeverActivated = false
  private wasFinished = false
  private hasPlayedHatch = false
  private wasRedButtonPressed = false
  private wasBlueButtonPressed = false
  private elapsedSeconds = 0
  private nextPushSoundAt = 0
  private nextFootstepSoundAt = 0
  private nextElevatorSoundAt = 0
  private previousElevatorY: number
  private previousTimeWarningSecond: number | undefined

  constructor(
    physicsWorld: PhysicsWorld,
    renderer: SceneRenderer,
    input: InputManager,
  ) {
    this.physicsWorld = physicsWorld
    this.renderer = renderer
    this.input = input
    this.previousDurability = physicsWorld.getEggDurabilityPercentage()
    this.previousElevatorY = physicsWorld.getElevatorTranslation().y
  }

  start(): void {
    document.addEventListener('pointerdown', this.enableAudio, { once: true })
    document.addEventListener('keydown', this.enableAudio, { once: true })
  }

  update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds
    this.playPushSound()
    this.playMovementSounds()
    this.playMechanismSounds()
    this.playEggDamageSound()
    this.playTimeWarning()
    this.playFinishSounds()
  }

  stop(): void {
    document.removeEventListener('pointerdown', this.enableAudio)
    document.removeEventListener('keydown', this.enableAudio)
    void this.audioContext?.close()
  }

  getVolume(): number {
    return this.volume
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume)
    try {
      window.localStorage.setItem(
        settingsKey,
        JSON.stringify({ version: 1, volume: this.volume }),
      )
    } catch {
      // Sound still works during the current session when storage is unavailable.
    }
  }

  private readonly enableAudio = (): void => {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    void this.audioContext.resume()
  }

  private playPushSound(): void {
    const isPushing = this.physicsWorld.getIsEggBeingPushed()
    if (isPushing && this.elapsedSeconds >= this.nextPushSoundAt) {
      this.tone(95, 0.06, 'square', 0.15)
      this.nextPushSoundAt = this.elapsedSeconds + 0.22
    }
  }

  private playMovementSounds(): void {
    const isMoving =
      this.input.isActionHeld('red', 'moveLeft') ||
      this.input.isActionHeld('red', 'moveRight') ||
      this.input.isActionHeld('blue', 'moveLeft') ||
      this.input.isActionHeld('blue', 'moveRight')
    if (isMoving && this.elapsedSeconds >= this.nextFootstepSoundAt) {
      this.tone(175, 0.035, 'sine', 0.08)
      this.nextFootstepSoundAt = this.elapsedSeconds + 0.28
    }

    const elevatorY = this.physicsWorld.getElevatorTranslation().y
    if (
      Math.abs(elevatorY - this.previousElevatorY) > 0.002 &&
      this.elapsedSeconds >= this.nextElevatorSoundAt
    ) {
      this.tone(82, 0.12, 'triangle', 0.1)
      this.nextElevatorSoundAt = this.elapsedSeconds + 0.35
    }
    this.previousElevatorY = elevatorY
  }

  private playMechanismSounds(): void {
    const redPressed = this.physicsWorld.isButtonPressed('red')
    const bluePressed = this.physicsWorld.isButtonPressed('blue')
    if (
      (redPressed && !this.wasRedButtonPressed) ||
      (bluePressed && !this.wasBlueButtonPressed)
    ) {
      this.tone(480, 0.08, 'sine', 0.25)
    }
    this.wasRedButtonPressed = redPressed
    this.wasBlueButtonPressed = bluePressed

    const leverActivated = this.physicsWorld.getIsLeverActivated()
    if (leverActivated !== this.wasLeverActivated) {
      this.tone(230, 0.12, 'sawtooth', 0.22)
    }
    this.wasLeverActivated = leverActivated
  }

  private playEggDamageSound(): void {
    const durability = this.physicsWorld.getEggDurabilityPercentage()
    if (durability < this.previousDurability) {
      this.tone(durability === 0 ? 70 : 145, 0.2, 'triangle', 0.38)
    }
    this.previousDurability = durability
  }

  private playTimeWarning(): void {
    const remainingSeconds = Math.ceil(
      this.physicsWorld.getLevelTimeRemainingSeconds(),
    )
    const shouldWarn =
      !this.physicsWorld.getIsLevelFinished() &&
      !this.physicsWorld.getIsTimeExpired() &&
      remainingSeconds > 0 &&
      remainingSeconds <= 10

    if (shouldWarn && remainingSeconds !== this.previousTimeWarningSecond) {
      this.tone(640, 0.07, 'square', 0.16)
    }

    this.previousTimeWarningSecond = shouldWarn ? remainingSeconds : undefined
  }

  private playFinishSounds(): void {
    const isFinished = this.physicsWorld.getIsLevelFinished()
    if (isFinished && !this.wasFinished) {
      this.tone(660, 0.16, 'sine', 0.32)
      window.setTimeout(() => this.tone(880, 0.24, 'sine', 0.32), 170)
    }
    if (!isFinished) {
      this.hasPlayedHatch = false
    }
    if (this.renderer.getHasHatched() && !this.hasPlayedHatch) {
      this.tone(1040, 0.18, 'sine', 0.25)
      this.hasPlayedHatch = true
    }
    this.wasFinished = isFinished
  }

  private tone(
    frequency: number,
    durationSeconds: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const context = this.audioContext
    if (!context || this.volume === 0) {
      return
    }

    const startTime = context.currentTime
    const oscillator = context.createOscillator()
    const volumeGain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, startTime)
    volumeGain.gain.setValueAtTime(gain * this.volume, startTime)
    volumeGain.gain.linearRampToValueAtTime(0, startTime + durationSeconds)
    oscillator.connect(volumeGain)
    volumeGain.connect(context.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + durationSeconds)
  }
}
