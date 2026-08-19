import greenTempleData from './green-temple.json'

type Vector3 = readonly [number, number, number]

interface GreenTempleLevel {
  cameraBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  startingPlatform: {
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
  }
  slope: {
    position: Vector3
    size: Vector3
    angleRadians: number
    colliderHalfExtents: Vector3
  }
  landingPlatform: {
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
  }
  centralExitPlatform: {
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
  }
  centralCheckpoint: {
    position: Vector3
    sensorColliderHalfExtents: Vector3
    redPlayerPosition: Vector3
    bluePlayerPosition: Vector3
  }
  trainingWall: {
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
  }
  spikeStrip: {
    position: Vector3
    visualPosition: Vector3
    baseSize: Vector3
    spikeRadius: number
    spikeHeight: number
    spikeCount: number
    spikeSpacing: number
    solidColliderHalfExtents: Vector3
    sensorColliderHalfExtents: Vector3
  }
  buttons: {
    red: {
      position: Vector3
      visualPosition: Vector3
      size: Vector3
      sensorColliderHalfExtents: Vector3
    }
    blue: {
      position: Vector3
      visualPosition: Vector3
      size: Vector3
      sensorColliderHalfExtents: Vector3
    }
  }
  neutralButton: {
    position: Vector3
    visualPosition: Vector3
    size: Vector3
    sensorColliderHalfExtents: Vector3
  }
  door: {
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
    passageSensorHalfExtents: Vector3
    openOffsetY: number
    closeDelaySeconds: number
  }
  lever: {
    position: Vector3
    interactionRadius: number
  }
  bridge: {
    retractedPosition: Vector3
    extendedPosition: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
    pocket: {
      floorSize: Vector3
      railSize: Vector3
      railOffsetZ: number
    }
    speed: number
  }
  blueBridge: {
    retractedPosition: Vector3
    extendedPosition: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
    speed: number
  }
  elevator: {
    lowerPosition: Vector3
    upperPosition: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
    safeZoneHalfExtents: Vector3
    speed: number
    returnSpeed: number
    chainAnchorY: number
  }
  elevatorLever: {
    position: Vector3
    interactionRadius: number
  }
  elevatorParkourPlatforms: ReadonlyArray<{
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
  }>
  finalSlope: {
    position: Vector3
    size: Vector3
    angleRadians: number
    colliderHalfExtents: Vector3
  }
  upperExitPlatform: {
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
  }
  nestIsland: {
    position: Vector3
    size: Vector3
    colliderHalfExtents: Vector3
  }
  nest: {
    position: Vector3
    sensorColliderHalfExtents: Vector3
  }
  fallZone: {
    position: Vector3
    colliderHalfExtents: Vector3
  }
  checkpoint: {
    egg: Vector3
    redPlayer: Vector3
    bluePlayer: Vector3
  }
}

const greenTemple = greenTempleData as unknown as GreenTempleLevel

export default greenTemple
