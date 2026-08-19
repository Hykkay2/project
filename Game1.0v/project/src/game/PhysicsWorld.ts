import RAPIER from '@dimforge/rapier3d-compat'
import { CollisionGroups } from './CollisionLayers'
import {
  applyEggDamage,
  clampEggDurability,
  isHardEggImpact,
} from './EggIntegrity'
import type { GameSubsystem } from './Game'
import type { InputManager, PlayerId } from './InputManager'
import greenTemple from '../levels/greenTemple'

const fixedDeltaSeconds = 1 / 60
const maximumFrameDeltaSeconds = 0.25
const playerSpeed = 7
const playerAcceleration = 24
const playerDeceleration = 24
const playerCapsuleHalfHeight = 0.37
const playerCapsuleRadius = 0.26
const playerJumpVelocity = Math.sqrt(2 * 9.81 * 2.75)
const groundedRayLength = playerCapsuleHalfHeight + playerCapsuleRadius + 0.08
const eggCapsuleHalfHeight = 0.15
const eggCapsuleRadius = 0.225
const eggMass = 4.5
const eggRollingFriction = 0.1
const eggLinearDamping = 2
const eggPushForce = 10
const eggPushDistance = 1.1
const eggBrakeDeceleration = 12
const eggCoastDeceleration = 1
const maximumEggSpeed = 14
const hardImpactSpeedThreshold = 7
const hardImpactDamagePercentage = 25
const trainingWallImpactSpeedThreshold = 1
export const levelTimeLimitSeconds = 180

export interface PhysicsTranslation {
  x: number
  y: number
  z: number
}

export interface PhysicsRotation {
  w: number
  x: number
  y: number
  z: number
}

export interface PhysicsWorldOptions {
  initialEggDurabilityPercentage?: number
}

interface CentralCheckpointState {
  egg: PhysicsTranslation
  redPlayer: PhysicsTranslation
  bluePlayer: PhysicsTranslation
  eggDurabilityPercentage: number
  isLeverActivated: boolean
  isDoorLockedOpen: boolean
  isRedBridgeLatched: boolean
  isBlueBridgeLatched: boolean
  bridge: PhysicsTranslation
  blueBridge: PhysicsTranslation
  elevator: PhysicsTranslation
}

export type ButtonColor = 'red' | 'blue'

export class PhysicsWorld implements GameSubsystem {
  private accumulatorSeconds = 0
  private readonly world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  private readonly startingPlatform = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed(),
  )
  private readonly landingPlatform = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.landingPlatform.position,
    ),
  )
  private readonly centralExitPlatform = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.centralExitPlatform.position,
    ),
  )
  private readonly centralCheckpoint = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.centralCheckpoint.position,
    ),
  )
  private readonly nestIsland = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.nestIsland.position,
    ),
  )
  private readonly upperExitPlatform = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.upperExitPlatform.position,
    ),
  )
  private readonly nest = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(...greenTemple.nest.position),
  )
  private readonly egg = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(...greenTemple.checkpoint.egg)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, true)
      .setAngularDamping(eggRollingFriction)
      .setLinearDamping(eggLinearDamping)
      .setCcdEnabled(true),
  )
  private readonly redPlayer = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(...greenTemple.checkpoint.redPlayer)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, false),
  )
  private readonly bluePlayer = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(...greenTemple.checkpoint.bluePlayer)
      .enabledTranslations(true, true, false)
      .enabledRotations(false, false, false),
  )
  private readonly trainingWall = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.trainingWall.position,
    ),
  )
  private readonly spikeStrip = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.spikeStrip.position,
    ),
  )
  private readonly fallZone = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.fallZone.position,
    ),
  )
  private readonly redButton = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.buttons.red.position,
    ),
  )
  private readonly blueButton = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.buttons.blue.position,
    ),
  )
  private readonly neutralButton = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      ...greenTemple.neutralButton.position,
    ),
  )
  private readonly door = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(...greenTemple.door.position),
  )
  private readonly bridge = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      ...greenTemple.bridge.retractedPosition,
    ),
  )
  private readonly blueBridge = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      ...greenTemple.blueBridge.retractedPosition,
    ),
  )
  private readonly elevator = this.world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      ...greenTemple.elevator.lowerPosition,
    ),
  )
  private readonly elevatorParkourPlatforms =
    greenTemple.elevatorParkourPlatforms.map((platform) =>
      this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(...platform.position),
      ),
    )
  private readonly eventQueue = new RAPIER.EventQueue(true)
  private readonly input: InputManager
  private eggDurabilityPercentage: number
  private readonly eggCollider: RAPIER.Collider
  private readonly trainingWallCollider: RAPIER.Collider
  private readonly redPlayerCollider: RAPIER.Collider
  private readonly bluePlayerCollider: RAPIER.Collider
  private readonly spikeSensor: RAPIER.Collider
  private readonly fallSensor: RAPIER.Collider
  private readonly centralCheckpointSensor: RAPIER.Collider
  private readonly nestSensor: RAPIER.Collider
  private readonly redButtonSensor: RAPIER.Collider
  private readonly blueButtonSensor: RAPIER.Collider
  private readonly neutralButtonSensor: RAPIER.Collider
  private readonly doorCollider: RAPIER.Collider
  private readonly doorPassageSensor: RAPIER.Collider
  private readonly bridgeCollider: RAPIER.Collider
  private readonly blueBridgeCollider: RAPIER.Collider
  private readonly elevatorCollider: RAPIER.Collider
  private readonly elevatorEggSafeZone: RAPIER.Collider
  private isEggBeingPushed = false
  private eggSpikeSensorEntries = 0
  private isEggBroken = false
  private isPaused = false
  private readonly buttonContactHandles: Record<ButtonColor, Set<number>> = {
    red: new Set<number>(),
    blue: new Set<number>(),
  }
  private readonly doorOccupantHandles = new Set<number>()
  private isDoorOpen = false
  private doorCloseTimeRemaining = 0
  private isLeverActivated = false
  private isEggOnElevator = false
  private isNeutralButtonPressed = false
  private isDoorLockedOpen = false
  private isRedBridgeLatched = false
  private isBlueBridgeLatched = false
  private isElevatorLeverHeld = false
  private isLevelFinished = false
  private isTimeExpired = false
  private levelElapsedSeconds = 0
  private completionTimeSeconds: number | undefined
  private centralCheckpointState: CentralCheckpointState | undefined

  private constructor(input: InputManager, options: PhysicsWorldOptions) {
    this.input = input
    this.eggDurabilityPercentage = clampEggDurability(
      options.initialEggDurabilityPercentage ?? 100,
    )
    this.world.integrationParameters.dt = fixedDeltaSeconds
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.startingPlatform.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.startingPlatform,
    )
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.landingPlatform.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.landingPlatform,
    )
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.centralExitPlatform.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.centralExitPlatform,
    )
    this.centralCheckpointSensor = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.centralCheckpoint.sensorColliderHalfExtents,
      )
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      this.centralCheckpoint,
    )
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.nestIsland.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.nestIsland,
    )
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.upperExitPlatform.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.upperExitPlatform,
    )
    this.nestSensor = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(...greenTemple.nest.sensorColliderHalfExtents)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      this.nest,
    )
    this.eggCollider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(eggCapsuleHalfHeight, eggCapsuleRadius)
        .setMass(eggMass)
        .setFriction(eggRollingFriction)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.egg),
      this.egg,
    )
    this.redPlayerCollider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(playerCapsuleHalfHeight, playerCapsuleRadius)
        .setMass(1)
        .setCollisionGroups(CollisionGroups.player),
      this.redPlayer,
    )
    this.bluePlayerCollider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(playerCapsuleHalfHeight, playerCapsuleRadius)
        .setMass(1)
        .setCollisionGroups(CollisionGroups.player),
      this.bluePlayer,
    )
    this.trainingWallCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.trainingWall.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.trainingWall,
    )
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.spikeStrip.solidColliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.spikeStrip,
    )
    this.spikeSensor = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.spikeStrip.sensorColliderHalfExtents,
      )
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      this.spikeStrip,
    )
    this.fallSensor = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(...greenTemple.fallZone.colliderHalfExtents)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      this.fallZone,
    )
    this.redButtonSensor = this.createButtonSensor('red', this.redButton)
    this.blueButtonSensor = this.createButtonSensor('blue', this.blueButton)
    this.neutralButtonSensor = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.neutralButton.sensorColliderHalfExtents,
      )
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      this.neutralButton,
    )
    this.doorCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.door.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.door,
    )
    this.doorPassageSensor = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(...greenTemple.door.passageSensorHalfExtents)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      this.door,
    )
    this.bridgeCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.bridge.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.bridge,
    )
    for (const railDirection of [-1, 1]) {
      const [railWidth, railHeight, railDepth] =
        greenTemple.bridge.pocket.railSize
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(railWidth / 2, railHeight / 2, railDepth / 2)
          .setTranslation(
            0,
            railHeight,
            railDirection * greenTemple.bridge.pocket.railOffsetZ,
          )
          .setCollisionGroups(CollisionGroups.solid),
        this.bridge,
      )
    }
    this.blueBridgeCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.blueBridge.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      this.blueBridge,
    )
    this.elevatorCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...greenTemple.elevator.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.elevatorWithoutEgg),
      this.elevator,
    )
    this.elevatorEggSafeZone = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(...greenTemple.elevator.safeZoneHalfExtents)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      this.elevator,
    )
    greenTemple.elevatorParkourPlatforms.forEach((platform, index) => {
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          ...platform.colliderHalfExtents,
        ).setCollisionGroups(CollisionGroups.solid),
        this.elevatorParkourPlatforms[index],
      )
    })
    this.createSlope()
  }

  static async create(
    input: InputManager,
    options: PhysicsWorldOptions = {},
  ): Promise<PhysicsWorld> {
    await RAPIER.init()

    return new PhysicsWorld(input, options)
  }

  start(): void {}

  update(deltaSeconds: number): void {
    if (this.isPaused) {
      return
    }

    this.accumulatorSeconds += Math.min(deltaSeconds, maximumFrameDeltaSeconds)

    while (this.accumulatorSeconds >= fixedDeltaSeconds) {
      if (!this.isEggBroken && !this.isLevelFinished && !this.isTimeExpired) {
        this.levelElapsedSeconds += fixedDeltaSeconds

        if (this.levelElapsedSeconds >= levelTimeLimitSeconds) {
          this.levelElapsedSeconds = levelTimeLimitSeconds
          this.isTimeExpired = true
        }
      }

      if (this.isEggBroken || this.isLevelFinished || this.isTimeExpired) {
        this.isEggBeingPushed = false
        this.stopControlledBodies()
      } else {
        this.updatePlayerMovement(this.redPlayer, 'red')
        this.updatePlayerMovement(this.bluePlayer, 'blue')
        this.isEggBeingPushed = false
        this.tryPushEgg(this.redPlayer, 'red')
        this.tryPushEgg(this.bluePlayer, 'blue')
        this.tryBrakeEgg(this.redPlayer, 'red')
        this.tryBrakeEgg(this.bluePlayer, 'blue')
        this.applyEggCoastResistance()
        this.tryPlayerJump(this.redPlayer, 'red')
        this.tryPlayerJump(this.bluePlayer, 'blue')
        this.tryToggleLever()
        this.updateElevatorLever()
        this.updateDoor()
        this.updateBridge()
        this.updateElevator()
      }
      const eggVelocityBeforeStep = this.egg.linvel()
      this.world.step(this.eventQueue)
      this.recordEggCollisionEvents(eggVelocityBeforeStep)
      this.limitEggSpeed()
      this.egg.resetForces(false)
      this.accumulatorSeconds -= fixedDeltaSeconds
    }
  }

  stop(): void {
    this.eventQueue.free()
    this.world.free()
  }

  getEggTranslation(): PhysicsTranslation {
    const translation = this.egg.translation()

    return { x: translation.x, y: translation.y, z: translation.z }
  }

  getEggRotation(): PhysicsRotation {
    const rotation = this.egg.rotation()

    return { w: rotation.w, x: rotation.x, y: rotation.y, z: rotation.z }
  }

  getEggDurabilityPercentage(): number {
    return this.eggDurabilityPercentage
  }

  getIsEggBeingPushed(): boolean {
    return this.isEggBeingPushed
  }

  getIsEggBroken(): boolean {
    return this.isEggBroken
  }

  getIsPaused(): boolean {
    return this.isPaused
  }

  isButtonPressed(buttonColor: ButtonColor): boolean {
    return (
      this.buttonContactHandles[buttonColor].size > 0 ||
      (buttonColor === 'red' && this.isRedBridgeLatched) ||
      (buttonColor === 'blue' && this.isBlueBridgeLatched)
    )
  }

  getIsDoorOpen(): boolean {
    return this.isDoorOpen
  }

  getIsLeverActivated(): boolean {
    return this.isLeverActivated
  }

  getBridgeTranslation(): PhysicsTranslation {
    const translation = this.bridge.translation()

    return { x: translation.x, y: translation.y, z: translation.z }
  }

  getBlueBridgeTranslation(): PhysicsTranslation {
    const translation = this.blueBridge.translation()
    return { x: translation.x, y: translation.y, z: translation.z }
  }

  getElevatorTranslation(): PhysicsTranslation {
    const translation = this.elevator.translation()

    return { x: translation.x, y: translation.y, z: translation.z }
  }

  getElevatorNeedsEgg(): boolean {
    return this.isLeverActivated && !this.isEggOnElevator
  }

  getIsCentralCheckpointActivated(): boolean {
    return this.centralCheckpointState !== undefined
  }

  getIsLevelFinished(): boolean {
    return this.isLevelFinished
  }

  getIsTimeExpired(): boolean {
    return this.isTimeExpired
  }

  getLevelTimeRemainingSeconds(): number {
    return Math.max(0, levelTimeLimitSeconds - this.levelElapsedSeconds)
  }

  getCompletionTimeSeconds(): number {
    return this.completionTimeSeconds ?? this.levelElapsedSeconds
  }

  getLeverNearbyPlayer(): PlayerId | undefined {
    if (this.isPlayerNearLever(this.redPlayer)) {
      return 'red'
    }

    if (this.isPlayerNearLever(this.bluePlayer)) {
      return 'blue'
    }

    return undefined
  }

  getElevatorLeverNearbyPlayer(): PlayerId | undefined {
    if (this.isPlayerNearPosition(this.redPlayer, greenTemple.elevatorLever)) {
      return 'red'
    }

    if (this.isPlayerNearPosition(this.bluePlayer, greenTemple.elevatorLever)) {
      return 'blue'
    }

    return undefined
  }

  getIsElevatorLeverHeld(): boolean {
    return this.isElevatorLeverHeld
  }

  setPaused(isPaused: boolean): void {
    this.isPaused = isPaused
  }

  getEggSpikeSensorEntriesForTesting(): number {
    return this.eggSpikeSensorEntries
  }

  restartFromCheckpoint(): void {
    const checkpointState = this.centralCheckpointState
    this.isEggBroken = false
    this.isLevelFinished = false
    this.isTimeExpired = false
    this.completionTimeSeconds = undefined
    this.eggDurabilityPercentage =
      checkpointState?.eggDurabilityPercentage ?? 100
    this.eggSpikeSensorEntries = 0
    this.buttonContactHandles.red.clear()
    this.buttonContactHandles.blue.clear()
    this.doorOccupantHandles.clear()
    this.doorCloseTimeRemaining = 0
    this.setDoorOpen(checkpointState?.isDoorLockedOpen ?? false)
    this.isLeverActivated = checkpointState?.isLeverActivated ?? false
    this.isEggOnElevator = false
    this.isElevatorLeverHeld = false
    this.isNeutralButtonPressed = false
    this.isDoorLockedOpen = checkpointState?.isDoorLockedOpen ?? false
    this.isRedBridgeLatched = checkpointState?.isRedBridgeLatched ?? false
    this.isBlueBridgeLatched = checkpointState?.isBlueBridgeLatched ?? false

    if (checkpointState) {
      this.restoreCheckpointState(checkpointState)
      return
    }

    this.resetBridge()
    this.resetElevator()
    this.resetBody(this.egg, greenTemple.checkpoint.egg)
    this.resetBody(this.redPlayer, greenTemple.checkpoint.redPlayer)
    this.resetBody(this.bluePlayer, greenTemple.checkpoint.bluePlayer)
  }

  restartLevel(): void {
    this.centralCheckpointState = undefined
    this.levelElapsedSeconds = 0
    this.restartFromCheckpoint()
  }

  getRedPlayerTranslation(): PhysicsTranslation {
    const translation = this.redPlayer.translation()

    return { x: translation.x, y: translation.y, z: translation.z }
  }

  getBluePlayerTranslation(): PhysicsTranslation {
    const translation = this.bluePlayer.translation()

    return { x: translation.x, y: translation.y, z: translation.z }
  }

  getRedPlayerLinearVelocity(): PhysicsTranslation {
    const velocity = this.redPlayer.linvel()

    return { x: velocity.x, y: velocity.y, z: velocity.z }
  }

  getBluePlayerLinearVelocity(): PhysicsTranslation {
    const velocity = this.bluePlayer.linvel()

    return { x: velocity.x, y: velocity.y, z: velocity.z }
  }

  private updatePlayerMovement(
    player: RAPIER.RigidBody,
    playerId: PlayerId,
  ): void {
    const movementDirection =
      Number(this.input.isActionHeld(playerId, 'moveRight')) -
      Number(this.input.isActionHeld(playerId, 'moveLeft'))
    const currentVelocity = player.linvel()
    const targetVelocityX = movementDirection * playerSpeed
    const velocityChange =
      (movementDirection === 0 ? playerDeceleration : playerAcceleration) *
      fixedDeltaSeconds
    const nextVelocityX = moveTowards(
      currentVelocity.x,
      targetVelocityX,
      velocityChange,
    )

    player.setLinvel({ x: nextVelocityX, y: currentVelocity.y, z: 0 }, true)
  }

  private tryPlayerJump(player: RAPIER.RigidBody, playerId: PlayerId): void {
    if (
      !this.input.wasActionPressed(playerId, 'jump') ||
      !this.isPlayerGrounded(player)
    ) {
      return
    }

    const velocity = player.linvel()
    player.setLinvel(
      { x: velocity.x, y: playerJumpVelocity, z: velocity.z },
      true,
    )
  }

  private tryPushEgg(player: RAPIER.RigidBody, playerId: PlayerId): void {
    if (!this.input.isActionHeld(playerId, 'interact')) {
      return
    }

    const movementDirection =
      Number(this.input.isActionHeld(playerId, 'moveRight')) -
      Number(this.input.isActionHeld(playerId, 'moveLeft'))

    if (movementDirection === 0) {
      return
    }

    const playerPosition = player.translation()
    const eggPosition = this.egg.translation()
    const eggDirection = Math.sign(eggPosition.x - playerPosition.x)
    const isCloseEnough =
      Math.abs(eggPosition.x - playerPosition.x) <= eggPushDistance
    const isPushingTowardEgg = eggDirection === movementDirection

    if (!isCloseEnough || !isPushingTowardEgg) {
      return
    }

    this.egg.addForce({ x: movementDirection * eggPushForce, y: 0, z: 0 }, true)
    this.isEggBeingPushed = true
  }

  private tryBrakeEgg(player: RAPIER.RigidBody, playerId: PlayerId): void {
    if (!this.input.isActionHeld(playerId, 'interact')) {
      return
    }

    const playerPosition = player.translation()
    const eggPosition = this.egg.translation()
    const eggVelocity = this.egg.linvel()
    const playerDirection = Math.sign(playerPosition.x - eggPosition.x)
    const isCloseEnough =
      Math.abs(playerPosition.x - eggPosition.x) <= eggPushDistance
    const isEggMovingTowardPlayer =
      eggVelocity.x !== 0 && Math.sign(eggVelocity.x) === playerDirection

    if (!isCloseEnough || !isEggMovingTowardPlayer) {
      return
    }

    const nextVelocityX = moveTowards(
      eggVelocity.x,
      0,
      eggBrakeDeceleration * fixedDeltaSeconds,
    )

    this.egg.setLinvel(
      { x: nextVelocityX, y: eggVelocity.y, z: eggVelocity.z },
      true,
    )
  }

  private applyEggCoastResistance(): void {
    if (this.isEggBeingPushed) {
      return
    }

    const velocity = this.egg.linvel()
    const nextVelocityX = moveTowards(
      velocity.x,
      0,
      eggCoastDeceleration * fixedDeltaSeconds,
    )

    this.egg.setLinvel({ x: nextVelocityX, y: velocity.y, z: velocity.z }, true)
  }

  private limitEggSpeed(): void {
    const velocity = this.egg.linvel()
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z)

    if (speed <= maximumEggSpeed) {
      return
    }

    const speedScale = maximumEggSpeed / speed
    this.egg.setLinvel(
      {
        x: velocity.x * speedScale,
        y: velocity.y * speedScale,
        z: velocity.z * speedScale,
      },
      true,
    )
  }

  private recordEggCollisionEvents(
    eggVelocityBeforeStep: PhysicsTranslation,
  ): void {
    this.eventQueue.drainCollisionEvents(
      (firstColliderHandle, secondColliderHandle, started) => {
        if (
          firstColliderHandle === this.nestSensor.handle ||
          secondColliderHandle === this.nestSensor.handle
        ) {
          const otherColliderHandle =
            firstColliderHandle === this.nestSensor.handle
              ? secondColliderHandle
              : firstColliderHandle

          if (
            started &&
            otherColliderHandle === this.eggCollider.handle &&
            !this.isEggBroken &&
            !this.isTimeExpired
          ) {
            this.isLevelFinished = true
            this.completionTimeSeconds = this.levelElapsedSeconds
          }

          return
        }

        if (
          firstColliderHandle === this.centralCheckpointSensor.handle ||
          secondColliderHandle === this.centralCheckpointSensor.handle
        ) {
          const otherColliderHandle =
            firstColliderHandle === this.centralCheckpointSensor.handle
              ? secondColliderHandle
              : firstColliderHandle

          if (started && otherColliderHandle === this.eggCollider.handle) {
            this.activateCentralCheckpoint()
          }

          return
        }

        if (
          firstColliderHandle === this.neutralButtonSensor.handle ||
          secondColliderHandle === this.neutralButtonSensor.handle
        ) {
          const otherColliderHandle =
            firstColliderHandle === this.neutralButtonSensor.handle
              ? secondColliderHandle
              : firstColliderHandle

          if (otherColliderHandle === this.eggCollider.handle) {
            this.isNeutralButtonPressed = started
          }

          return
        }

        if (
          firstColliderHandle === this.elevatorEggSafeZone.handle ||
          secondColliderHandle === this.elevatorEggSafeZone.handle
        ) {
          const otherColliderHandle =
            firstColliderHandle === this.elevatorEggSafeZone.handle
              ? secondColliderHandle
              : firstColliderHandle

          if (otherColliderHandle === this.eggCollider.handle) {
            this.isEggOnElevator = started
          }

          return
        }

        if (
          firstColliderHandle === this.doorPassageSensor.handle ||
          secondColliderHandle === this.doorPassageSensor.handle
        ) {
          this.updateDoorOccupants(
            firstColliderHandle,
            secondColliderHandle,
            started,
          )
          return
        }

        const buttonColor = this.getButtonColorFromEvent(
          firstColliderHandle,
          secondColliderHandle,
        )

        if (buttonColor) {
          this.updateButtonContacts(
            buttonColor,
            firstColliderHandle,
            secondColliderHandle,
            started,
          )
          return
        }

        if (!started) {
          return
        }

        const isFirstColliderEgg =
          firstColliderHandle === this.eggCollider.handle
        const isSecondColliderEgg =
          secondColliderHandle === this.eggCollider.handle
        const isFirstColliderFallSensor =
          firstColliderHandle === this.fallSensor.handle
        const isSecondColliderFallSensor =
          secondColliderHandle === this.fallSensor.handle

        if (isFirstColliderFallSensor || isSecondColliderFallSensor) {
          const fallingColliderHandle = isFirstColliderFallSensor
            ? secondColliderHandle
            : firstColliderHandle
          const isRestartableBody =
            fallingColliderHandle === this.eggCollider.handle ||
            fallingColliderHandle === this.redPlayerCollider.handle ||
            fallingColliderHandle === this.bluePlayerCollider.handle

          if (isRestartableBody) {
            this.restartFromCheckpoint()
          }

          return
        }

        if (!isFirstColliderEgg && !isSecondColliderEgg) {
          return
        }

        const otherColliderHandle = isFirstColliderEgg
          ? secondColliderHandle
          : firstColliderHandle

        if (otherColliderHandle === this.spikeSensor.handle) {
          this.eggSpikeSensorEntries += 1
          this.damageEgg(100)
          return
        }

        const otherCollider = this.world.getCollider(otherColliderHandle)
        const isSolidImpact =
          otherCollider?.collisionGroups() === CollisionGroups.solid
        const isTrainingWall =
          otherColliderHandle === this.trainingWallCollider.handle
        const impactSpeed = Math.hypot(
          eggVelocityBeforeStep.x,
          eggVelocityBeforeStep.y,
          eggVelocityBeforeStep.z,
        )

        if (
          isSolidImpact &&
          isHardEggImpact(
            impactSpeed,
            isTrainingWall
              ? trainingWallImpactSpeedThreshold
              : hardImpactSpeedThreshold,
          )
        ) {
          this.damageEgg(hardImpactDamagePercentage)
        }
      },
    )
  }

  private activateCentralCheckpoint(): void {
    if (this.centralCheckpointState) {
      return
    }

    this.isRedBridgeLatched = true
    this.centralCheckpointState = {
      egg: this.getBodyTranslation(this.egg),
      redPlayer: this.toPhysicsTranslation(
        greenTemple.centralCheckpoint.redPlayerPosition,
      ),
      bluePlayer: this.toPhysicsTranslation(
        greenTemple.centralCheckpoint.bluePlayerPosition,
      ),
      eggDurabilityPercentage: this.eggDurabilityPercentage,
      isLeverActivated: this.isLeverActivated,
      isDoorLockedOpen: this.isDoorLockedOpen,
      isRedBridgeLatched: true,
      isBlueBridgeLatched: this.isBlueBridgeLatched,
      bridge: this.getBodyTranslation(this.bridge),
      blueBridge: this.getBodyTranslation(this.blueBridge),
      elevator: this.getBodyTranslation(this.elevator),
    }
  }

  private restoreCheckpointState(state: CentralCheckpointState): void {
    this.resetBodyAt(this.egg, state.egg)
    this.resetBodyAt(this.redPlayer, state.redPlayer)
    this.resetBodyAt(this.bluePlayer, state.bluePlayer)
    this.restoreKinematicBody(this.bridge, state.bridge)
    this.restoreKinematicBody(this.blueBridge, state.blueBridge)
    this.restoreKinematicBody(this.elevator, state.elevator)
    this.updateDoor()
    this.elevatorCollider.setCollisionGroups(CollisionGroups.elevatorWithoutEgg)
  }

  private getBodyTranslation(body: RAPIER.RigidBody): PhysicsTranslation {
    const translation = body.translation()

    return { x: translation.x, y: translation.y, z: translation.z }
  }

  private toPhysicsTranslation(
    translation: readonly [number, number, number],
  ): PhysicsTranslation {
    const [x, y, z] = translation

    return { x, y, z }
  }

  private restoreKinematicBody(
    body: RAPIER.RigidBody,
    translation: PhysicsTranslation,
  ): void {
    body.setTranslation(translation, true)
    body.setNextKinematicTranslation(translation)
  }

  private damageEgg(damagePercentage: number): void {
    if (this.isEggBroken) {
      return
    }

    this.eggDurabilityPercentage = applyEggDamage(
      this.eggDurabilityPercentage,
      damagePercentage,
    )
    this.isEggBroken = this.eggDurabilityPercentage === 0
  }

  private createButtonSensor(
    buttonColor: ButtonColor,
    button: RAPIER.RigidBody,
  ): RAPIER.Collider {
    const halfExtents =
      greenTemple.buttons[buttonColor].sensorColliderHalfExtents

    return this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(...halfExtents)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        .setCollisionGroups(CollisionGroups.sensor),
      button,
    )
  }

  private getButtonColorFromEvent(
    firstColliderHandle: number,
    secondColliderHandle: number,
  ): ButtonColor | undefined {
    if (
      firstColliderHandle === this.redButtonSensor.handle ||
      secondColliderHandle === this.redButtonSensor.handle
    ) {
      return 'red'
    }

    if (
      firstColliderHandle === this.blueButtonSensor.handle ||
      secondColliderHandle === this.blueButtonSensor.handle
    ) {
      return 'blue'
    }

    return undefined
  }

  private updateButtonContacts(
    buttonColor: ButtonColor,
    firstColliderHandle: number,
    secondColliderHandle: number,
    started: boolean,
  ): void {
    const sensorHandle =
      buttonColor === 'red'
        ? this.redButtonSensor.handle
        : this.blueButtonSensor.handle
    const actorHandle =
      firstColliderHandle === sensorHandle
        ? secondColliderHandle
        : firstColliderHandle
    const isMatchingPlayer =
      (buttonColor === 'red' &&
        actorHandle === this.redPlayerCollider.handle) ||
      (buttonColor === 'blue' && actorHandle === this.bluePlayerCollider.handle)

    if (!isMatchingPlayer) {
      return
    }

    const contacts = this.buttonContactHandles[buttonColor]

    if (started) {
      contacts.add(actorHandle)
      if (buttonColor === 'blue') {
        this.isBlueBridgeLatched = true
      }
      return
    }

    contacts.delete(actorHandle)
  }

  private updateDoor(): void {
    if (this.isNeutralButtonPressed || this.isDoorLockedOpen) {
      this.doorCloseTimeRemaining = greenTemple.door.closeDelaySeconds
      this.setDoorOpen(true)
      return
    }

    if (!this.isDoorOpen) {
      return
    }

    this.doorCloseTimeRemaining = Math.max(
      0,
      this.doorCloseTimeRemaining - fixedDeltaSeconds,
    )

    if (
      this.doorCloseTimeRemaining === 0 &&
      this.doorOccupantHandles.size === 0
    ) {
      this.setDoorOpen(false)
    }
  }

  private updateBridge(): void {
    const targetPosition =
      this.isButtonPressed('red') || this.isRedBridgeLatched
        ? greenTemple.bridge.extendedPosition
        : greenTemple.bridge.retractedPosition
    const position = this.bridge.translation()
    const maximumDistance = greenTemple.bridge.speed * fixedDeltaSeconds

    this.bridge.setNextKinematicTranslation({
      x: moveTowards(position.x, targetPosition[0], maximumDistance),
      y: moveTowards(position.y, targetPosition[1], maximumDistance),
      z: moveTowards(position.z, targetPosition[2], maximumDistance),
    })
    const blueTarget = this.isButtonPressed('blue')
      ? greenTemple.blueBridge.extendedPosition
      : greenTemple.blueBridge.retractedPosition
    const bluePosition = this.blueBridge.translation()
    const blueDistance = greenTemple.blueBridge.speed * fixedDeltaSeconds
    this.blueBridge.setNextKinematicTranslation({
      x: moveTowards(bluePosition.x, blueTarget[0], blueDistance),
      y: moveTowards(bluePosition.y, blueTarget[1], blueDistance),
      z: moveTowards(bluePosition.z, blueTarget[2], blueDistance),
    })
  }

  private resetBridge(): void {
    const [x, y, z] = greenTemple.bridge.retractedPosition
    this.bridge.setTranslation({ x, y, z }, true)
    this.bridge.setNextKinematicTranslation({ x, y, z })
    this.bridgeCollider.setEnabled(true)
    const [blueX, blueY, blueZ] = greenTemple.blueBridge.retractedPosition
    this.blueBridge.setTranslation({ x: blueX, y: blueY, z: blueZ }, true)
    this.blueBridge.setNextKinematicTranslation({
      x: blueX,
      y: blueY,
      z: blueZ,
    })
    this.blueBridgeCollider.setEnabled(true)
  }

  private updateElevator(): void {
    const position = this.elevator.translation()
    const isAtLowerPosition =
      Math.abs(position.y - greenTemple.elevator.lowerPosition[1]) < 0.05
    this.elevatorCollider.setCollisionGroups(
      !this.isEggOnElevator && isAtLowerPosition
        ? CollisionGroups.elevatorWithoutEgg
        : CollisionGroups.solid,
    )
    const isActivated = this.isElevatorLeverHeld && this.isEggOnElevator
    const targetPosition = isActivated
      ? greenTemple.elevator.upperPosition
      : greenTemple.elevator.lowerPosition
    const maximumDistance =
      (isActivated
        ? greenTemple.elevator.speed
        : greenTemple.elevator.returnSpeed) * fixedDeltaSeconds

    this.elevator.setNextKinematicTranslation({
      x: moveTowards(position.x, targetPosition[0], maximumDistance),
      y: moveTowards(position.y, targetPosition[1], maximumDistance),
      z: moveTowards(position.z, targetPosition[2], maximumDistance),
    })
  }

  private resetElevator(): void {
    const [x, y, z] = greenTemple.elevator.lowerPosition
    this.elevator.setTranslation({ x, y, z }, true)
    this.elevator.setNextKinematicTranslation({ x, y, z })
    this.elevatorCollider.setEnabled(true)
    this.elevatorCollider.setCollisionGroups(CollisionGroups.elevatorWithoutEgg)
  }

  private tryToggleLever(): void {
    const nearbyPlayer = this.getLeverNearbyPlayer()

    if (
      nearbyPlayer === undefined ||
      !this.input.wasActionPressed(nearbyPlayer, 'interact')
    ) {
      return
    }

    this.isLeverActivated = !this.isLeverActivated
    this.isDoorLockedOpen ||= this.isLeverActivated
  }

  private updateElevatorLever(): void {
    const nearbyPlayer = this.getElevatorLeverNearbyPlayer()
    this.isElevatorLeverHeld =
      nearbyPlayer !== undefined &&
      this.input.isActionHeld(nearbyPlayer, 'interact')
  }

  private isPlayerNearLever(player: RAPIER.RigidBody): boolean {
    return this.isPlayerNearPosition(player, greenTemple.lever)
  }

  private isPlayerNearPosition(
    player: RAPIER.RigidBody,
    interactionTarget: {
      position: readonly [number, number, number]
      interactionRadius: number
    },
  ): boolean {
    const playerPosition = player.translation()
    const [leverX, leverY] = interactionTarget.position

    return (
      Math.hypot(playerPosition.x - leverX, playerPosition.y - leverY) <=
      interactionTarget.interactionRadius
    )
  }

  private setDoorOpen(isOpen: boolean): void {
    this.isDoorOpen = isOpen
    this.doorCollider.setEnabled(!isOpen)
  }

  private updateDoorOccupants(
    firstColliderHandle: number,
    secondColliderHandle: number,
    started: boolean,
  ): void {
    const actorHandle =
      firstColliderHandle === this.doorPassageSensor.handle
        ? secondColliderHandle
        : firstColliderHandle
    const isDoorOccupant =
      actorHandle === this.eggCollider.handle ||
      actorHandle === this.redPlayerCollider.handle ||
      actorHandle === this.bluePlayerCollider.handle

    if (!isDoorOccupant) {
      return
    }

    if (started) {
      this.doorOccupantHandles.add(actorHandle)
      return
    }

    this.doorOccupantHandles.delete(actorHandle)
  }

  private stopControlledBodies(): void {
    this.stopBody(this.egg)
    this.stopBody(this.redPlayer)
    this.stopBody(this.bluePlayer)
  }

  private resetBody(
    body: RAPIER.RigidBody,
    translation: readonly [number, number, number],
  ): void {
    const [x, y, z] = translation
    this.resetBodyAt(body, { x, y, z })
  }

  private resetBodyAt(
    body: RAPIER.RigidBody,
    translation: PhysicsTranslation,
  ): void {
    body.setTranslation(translation, true)
    body.setRotation({ w: 1, x: 0, y: 0, z: 0 }, true)
    this.stopBody(body)
  }

  private stopBody(body: RAPIER.RigidBody): void {
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    body.resetForces(true)
    body.resetTorques(true)
  }

  private isPlayerGrounded(player: RAPIER.RigidBody): boolean {
    const position = player.translation()
    const groundRay = new RAPIER.Ray(position, { x: 0, y: -1, z: 0 })
    const groundHit = this.world.castRay(
      groundRay,
      groundedRayLength,
      true,
      undefined,
      undefined,
      undefined,
      player,
      (collider) => collider.collisionGroups() === CollisionGroups.solid,
    )

    return groundHit !== null
  }

  private createSlope(): void {
    this.createStaticSlope(greenTemple.slope)
    this.createStaticSlope(greenTemple.finalSlope)
  }

  private createStaticSlope(slopeDefinition: {
    position: readonly [number, number, number]
    angleRadians: number
    colliderHalfExtents: readonly [number, number, number]
  }): void {
    const slopeAngle = slopeDefinition.angleRadians
    const slope = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(...slopeDefinition.position)
        .setRotation({
          w: Math.cos(slopeAngle / 2),
          x: 0,
          y: 0,
          z: Math.sin(slopeAngle / 2),
        }),
    )

    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        ...slopeDefinition.colliderHalfExtents,
      ).setCollisionGroups(CollisionGroups.solid),
      slope,
    )
  }
}

const moveTowards = (
  current: number,
  target: number,
  maximumChange: number,
): number => {
  if (Math.abs(target - current) <= maximumChange) {
    return target
  }

  return current + Math.sign(target - current) * maximumChange
}
