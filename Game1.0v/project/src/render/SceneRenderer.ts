import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { getEggVisualState } from '../game/EggIntegrity'
import type { GameSubsystem } from '../game/Game'
import type { InputManager, PlayerId } from '../game/InputManager'
import { getObjectiveState, type ObjectiveTarget } from '../game/Objective'
import type {
  ButtonColor,
  PhysicsTranslation,
  PhysicsWorld,
} from '../game/PhysicsWorld'
import greenTemple from '../levels/greenTemple'
import { CameraController } from '../systems/CameraController'
import { GameMaterials } from './GameMaterials'
import { NightSkyBackground } from './NightSkyBackground'
import { PastelToonMaterial } from './PastelToonMaterial'

const playerVisualOffsetY = -0.19

interface CameraFocus {
  offset: THREE.Vector3
  spread: number
}

interface PlayerModel {
  root: THREE.Group
  torso: THREE.Mesh
  helmet: THREE.Mesh
  visor: THREE.Mesh
  leftLeg: THREE.Mesh
  rightLeg: THREE.Mesh
  glow: THREE.PointLight
}

interface EggModel {
  root: THREE.Group
  body: THREE.Mesh
  crackedLayer: THREE.Mesh
  criticalLayer: THREE.Group
  fragments: THREE.Group
}

interface ChickModel {
  root: THREE.Group
  leftWing: THREE.Mesh
  rightWing: THREE.Mesh
}

interface DamageParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  remainingSeconds: number
}

interface GearSparkSystem {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  positions: Float32Array
  colors: Float32Array
  velocities: Float32Array
  ages: Float32Array
  lifetimes: Float32Array
}

interface ButtonModel {
  mesh: THREE.Mesh
  material: PastelToonMaterial
}

interface LeverModel {
  root: THREE.Group
  handle: THREE.Mesh
  material: PastelToonMaterial
  glow: THREE.PointLight
}

interface ElevatorModel {
  platform: THREE.Mesh
  leftChain: THREE.Mesh
  rightChain: THREE.Mesh
}

interface CheckpointModel {
  root: THREE.Group
  material: PastelToonMaterial
  glow: THREE.PointLight
}

export class SceneRenderer implements GameSubsystem {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  private readonly gameMaterials = new GameMaterials()
  private readonly landscapedPlatforms = [
    greenTemple.startingPlatform,
    greenTemple.landingPlatform,
    greenTemple.centralExitPlatform,
    greenTemple.upperExitPlatform,
    greenTemple.nestIsland,
  ]
  private readonly startingPlatformGeometry = new THREE.BoxGeometry(
    ...greenTemple.startingPlatform.size,
  )
  private readonly startingPlatform = new THREE.Mesh(
    this.startingPlatformGeometry,
    this.gameMaterials.stone,
  )
  private readonly landingPlatformGeometry = new THREE.BoxGeometry(
    ...greenTemple.landingPlatform.size,
  )
  private readonly landingPlatform = new THREE.Mesh(
    this.landingPlatformGeometry,
    this.gameMaterials.stone,
  )
  private readonly centralExitPlatformGeometry = new THREE.BoxGeometry(
    ...greenTemple.centralExitPlatform.size,
  )
  private readonly centralExitPlatform = new THREE.Mesh(
    this.centralExitPlatformGeometry,
    this.gameMaterials.stone,
  )
  private readonly grassTopGeometries = this.landscapedPlatforms.map(
    (platform) =>
      new THREE.BoxGeometry(
        platform.size[0] - 0.12,
        0.07,
        platform.size[2] - 0.12,
      ),
  )
  private readonly grassTops = this.grassTopGeometries.map(
    (geometry) => new THREE.Mesh(geometry, this.gameMaterials.grass),
  )
  private readonly blockTerrainGeometries: THREE.BufferGeometry[] = []
  private readonly terrainBlockMaterials = [
    this.gameMaterials.stone,
    this.gameMaterials.stone,
    this.gameMaterials.grass,
    this.gameMaterials.stone,
    this.gameMaterials.stone,
    this.gameMaterials.stone,
  ]
  private readonly blockyTerrain = this.landscapedPlatforms.map((platform) =>
    this.createBlockyTerrain(platform.size),
  )
  private readonly terrainLayerGeometries: THREE.BufferGeometry[] = []
  private readonly terrainSoilMaterial = new PastelToonMaterial({
    color: 0x9c694f,
    topColor: 0xd9a77b,
    gradientMin: -0.14,
    gradientMax: 0.14,
  })
  private readonly terrainClayMaterial = new PastelToonMaterial({
    color: 0xc78d68,
    topColor: 0xf0c6a3,
    gradientMin: -0.16,
    gradientMax: 0.16,
  })
  private readonly terrainRockMaterial = new PastelToonMaterial({
    color: 0x777184,
    topColor: 0xb5a9d1,
    gradientMin: -0.12,
    gradientMax: 0.12,
  })
  private readonly grassBladeGeometry = new THREE.ConeGeometry(0.06, 0.22, 3)
  private readonly grassBladeMaterial = new PastelToonMaterial({
    color: 0x5b9b5c,
    topColor: 0xbce491,
    gradientMin: -0.09,
    gradientMax: 0.09,
  })
  private readonly terrainStrata = this.landscapedPlatforms.map((platform) =>
    this.createTerrainStrata(platform.size),
  )
  private readonly grassFringes = this.landscapedPlatforms.map((platform) =>
    this.createGrassFringe(platform.size),
  )
  private readonly flowerStemGeometry = new THREE.CylinderGeometry(
    0.012,
    0.018,
    0.22,
    5,
  )
  private readonly flowerHeadGeometry = new THREE.IcosahedronGeometry(0.08, 0)
  private readonly gardenRockGeometry = new THREE.IcosahedronGeometry(0.13, 1)
  private readonly flowerStemMaterial = new PastelToonMaterial({
    color: 0x4a9e5b,
    topColor: 0x9bd476,
    gradientMin: -0.11,
    gradientMax: 0.11,
  })
  private readonly pinkFlowerMaterial = new PastelToonMaterial({
    color: 0xf0a1c2,
    topColor: 0xffd0df,
    emissive: 0x3a172a,
    emissiveIntensity: 0.08,
  })
  private readonly yellowFlowerMaterial = new PastelToonMaterial({
    color: 0xf5d275,
    topColor: 0xfff0ad,
    emissive: 0x3a2a10,
    emissiveIntensity: 0.08,
  })
  private readonly gardenRockMaterial = new PastelToonMaterial({
    color: 0xd8cdbf,
    topColor: 0xf7e8d7,
  })
  private readonly gardenDecorations = this.createGardenDecorations()
  private readonly gearGeometries: THREE.BufferGeometry[] = []
  private readonly gearMaterial = new PastelToonMaterial({
    color: 0xa76f4d,
    topColor: 0xf0c58c,
    gradientMin: -0.6,
    gradientMax: 0.6,
    emissive: 0x4a1a0c,
    emissiveIntensity: 0.1,
  })
  private readonly mechanicalDecorations = this.createMechanicalDecorations()
  private readonly gearGlow = new THREE.PointLight(0xff8d4d, 1.15, 3.8)
  private readonly gearSparks = this.createGearSparks()
  private readonly treeTrunkGeometry = new THREE.CylinderGeometry(
    0.08,
    0.13,
    0.75,
    5,
  )
  private readonly treeCrownGeometry = new THREE.DodecahedronGeometry(0.42, 0)
  private readonly shrubGeometry = new THREE.DodecahedronGeometry(0.18, 0)
  private readonly treeTrunkMaterial = new PastelToonMaterial({
    color: 0x9c6c59,
    topColor: 0xe0ab7e,
    gradientMin: -0.38,
    gradientMax: 0.38,
  })
  private readonly treeFoliageMaterial = new PastelToonMaterial({
    color: 0x6c4b78,
    topColor: 0xc07caa,
  })
  private readonly treeFoliageAccentMaterial = new PastelToonMaterial({
    color: 0x4f3f72,
    topColor: 0xa96fb5,
  })
  private readonly cozyLandscapeDecorations =
    this.createCozyLandscapeDecorations()
  private readonly checkpointBaseGeometry = new THREE.CylinderGeometry(
    0.42,
    0.5,
    0.12,
    6,
  )
  private readonly checkpointBeamGeometry = new THREE.CylinderGeometry(
    0.08,
    0.12,
    1.1,
    6,
  )
  private readonly checkpointCrystalGeometry = new THREE.ConeGeometry(
    0.28,
    0.48,
    5,
  )
  private readonly centralCheckpoint = this.createCentralCheckpoint()
  private readonly slopeGeometry = new THREE.BoxGeometry(
    ...greenTemple.slope.size,
  )
  private readonly slope = new THREE.Mesh(
    this.slopeGeometry,
    this.gameMaterials.stone,
  )
  private readonly finalSlopeGeometry = new THREE.BoxGeometry(
    ...greenTemple.finalSlope.size,
  )
  private readonly finalSlope = new THREE.Mesh(
    this.finalSlopeGeometry,
    this.gameMaterials.stone,
  )
  private readonly upperExitPlatformGeometry = new THREE.BoxGeometry(
    ...greenTemple.upperExitPlatform.size,
  )
  private readonly upperExitPlatform = new THREE.Mesh(
    this.upperExitPlatformGeometry,
    this.gameMaterials.stone,
  )
  private readonly nestIslandGeometry = new THREE.BoxGeometry(
    ...greenTemple.nestIsland.size,
  )
  private readonly nestIsland = new THREE.Mesh(
    this.nestIslandGeometry,
    this.gameMaterials.stone,
  )
  private readonly nestGeometry = new THREE.TorusGeometry(0.55, 0.14, 5, 10)
  private readonly nest = new THREE.Mesh(
    this.nestGeometry,
    this.gameMaterials.wood,
  )
  private readonly nestGlow = new THREE.PointLight(0xffc86b, 0.75, 4)
  private readonly objectiveBeaconGeometry = new THREE.TorusGeometry(
    0.34,
    0.045,
    5,
    10,
  )
  private readonly objectiveBeaconMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd36b,
    emissive: 0x7a2e04,
    emissiveIntensity: 2,
    roughness: 0.4,
  })
  private readonly objectiveBeacon = new THREE.Mesh(
    this.objectiveBeaconGeometry,
    this.objectiveBeaconMaterial,
  )
  private readonly objectiveBeaconGlow = new THREE.PointLight(0xffb34f, 1.2, 4)
  private readonly eggGeometry = new THREE.IcosahedronGeometry(1, 2)
  private readonly eggCrackGeometry = this.createEggCrackGeometry()
  private readonly eggCriticalCrackGeometry =
    this.createEggCriticalCrackGeometry()
  private readonly eggFragmentGeometry = new THREE.IcosahedronGeometry(0.48, 1)
  private readonly damageParticleGeometry = new THREE.IcosahedronGeometry(
    0.075,
    0,
  )
  private readonly damageParticleMaterial = new THREE.MeshBasicMaterial({
    color: 0xff315a,
  })
  private readonly damageParticles: DamageParticle[] = []
  private previousEggDurability: number | undefined
  private readonly eggCrackMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d8098,
    emissive: 0xa04dff,
    emissiveIntensity: 0.85,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  })
  private readonly egg = this.createEgg()
  private readonly eggAmbientGlow = new THREE.PointLight(0x8964df, 0.44, 3)
  private readonly eggPushGlow = new THREE.PointLight(0x9f8cff, 0, 3.2)
  private readonly chickBodyGeometry = new THREE.IcosahedronGeometry(0.28, 1)
  private readonly chickHeadGeometry = new THREE.IcosahedronGeometry(0.18, 1)
  private readonly chickBeakGeometry = new THREE.ConeGeometry(0.07, 0.18, 4)
  private readonly chickWingGeometry = new THREE.ConeGeometry(0.13, 0.38, 3)
  private readonly chickMaterial = new THREE.MeshStandardMaterial({
    color: 0xa98cff,
    emissive: 0x25154f,
    flatShading: true,
    roughness: 0.55,
  })
  private readonly chick = this.createChick()
  private readonly trainingWallGeometry = new THREE.BoxGeometry(
    ...greenTemple.trainingWall.size,
  )
  private readonly trainingWallMaterial =
    this.gameMaterials.redMechanism.clone()
  private readonly trainingWall = new THREE.Mesh(
    this.trainingWallGeometry,
    this.trainingWallMaterial,
  )
  private readonly spikeBaseGeometry = new THREE.BoxGeometry(
    ...greenTemple.spikeStrip.baseSize,
  )
  private readonly spikeGeometry = new THREE.ConeGeometry(
    greenTemple.spikeStrip.spikeRadius,
    greenTemple.spikeStrip.spikeHeight,
    4,
  )
  private readonly spikeMaterial = this.gameMaterials.spikes.clone()
  private readonly spikeStrip = this.createSpikeStrip()
  private readonly buttonGeometry = new THREE.BoxGeometry(
    ...greenTemple.buttons.red.size,
  )
  private readonly redButton = this.createButton(
    'red',
    this.gameMaterials.redMechanism,
  )
  private readonly blueButton = this.createButton(
    'blue',
    this.gameMaterials.blueMechanism,
  )
  private readonly neutralButtonGeometry = new THREE.BoxGeometry(
    ...greenTemple.neutralButton.size,
  )
  private readonly neutralButton = new THREE.Mesh(
    this.neutralButtonGeometry,
    this.gameMaterials.moss,
  )
  private readonly doorGeometry = new THREE.BoxGeometry(
    ...greenTemple.door.size,
  )
  private readonly door = new THREE.Mesh(
    this.doorGeometry,
    this.gameMaterials.metal,
  )
  private readonly leverBaseGeometry = new THREE.CylinderGeometry(
    0.16,
    0.2,
    0.3,
    6,
  )
  private readonly leverHandleGeometry = new THREE.BoxGeometry(0.11, 0.68, 0.11)
  private readonly lever = this.createLever(greenTemple.lever.position)
  private readonly elevatorLever = this.createLever(
    greenTemple.elevatorLever.position,
  )
  private readonly bridgeGeometry = new THREE.BoxGeometry(
    ...greenTemple.bridge.size,
  )
  private readonly bridge = new THREE.Mesh(
    this.bridgeGeometry,
    this.gameMaterials.wood,
  )
  private readonly bridgeGlow = new THREE.PointLight(0xff5a78, 0, 6)
  private readonly bridgePocketFloorGeometry = new THREE.BoxGeometry(
    ...greenTemple.bridge.pocket.floorSize,
  )
  private readonly bridgePocketRailGeometry = new THREE.BoxGeometry(
    ...greenTemple.bridge.pocket.railSize,
  )
  private readonly bridgePocketFloor = new THREE.Mesh(
    this.bridgePocketFloorGeometry,
    this.gameMaterials.metal,
  )
  private readonly bridgePocketLeftRail = new THREE.Mesh(
    this.bridgePocketRailGeometry,
    this.gameMaterials.metal,
  )
  private readonly bridgePocketRightRail = new THREE.Mesh(
    this.bridgePocketRailGeometry,
    this.gameMaterials.metal,
  )
  private readonly blueBridgeGeometry = new THREE.BoxGeometry(
    ...greenTemple.blueBridge.size,
  )
  private readonly blueBridge = new THREE.Mesh(
    this.blueBridgeGeometry,
    this.gameMaterials.wood,
  )
  private readonly blueBridgeGlow = new THREE.PointLight(0x5a9dff, 0, 6)
  private readonly elevatorPlatformGeometry = new THREE.BoxGeometry(
    ...greenTemple.elevator.size,
  )
  private readonly chainGeometry = new THREE.CylinderGeometry(
    0.025,
    0.025,
    1,
    6,
  )
  private readonly elevatorLoadRingGeometry = new THREE.TorusGeometry(
    1.1,
    0.045,
    5,
    12,
  )
  private readonly elevatorLoadRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x8dffb8,
    transparent: true,
    opacity: 0.85,
  })
  private readonly elevatorLoadRing = new THREE.Mesh(
    this.elevatorLoadRingGeometry,
    this.elevatorLoadRingMaterial,
  )
  private readonly elevatorLoadGlow = new THREE.PointLight(0x67e69b, 0, 4)
  private readonly elevatorMotionGlow = new THREE.PointLight(0x6fa8ff, 0, 4)
  private readonly elevator = this.createElevator()
  private readonly elevatorParkourGeometries =
    greenTemple.elevatorParkourPlatforms.map(
      (platform) => new THREE.BoxGeometry(...platform.size),
    )
  private readonly elevatorParkourPlatforms =
    greenTemple.elevatorParkourPlatforms.map(
      (_platform, index) =>
        new THREE.Mesh(
          this.elevatorParkourGeometries[index],
          this.gameMaterials.stone,
        ),
    )
  private readonly helmetGeometry = new THREE.SphereGeometry(0.35, 8, 6)
  private readonly visorGeometry = new THREE.BoxGeometry(0.48, 0.14, 0.1)
  private readonly torsoGeometry = new THREE.CylinderGeometry(
    0.3,
    0.35,
    0.65,
    6,
  )
  private readonly legGeometry = new THREE.BoxGeometry(0.17, 0.35, 0.28)
  private readonly redPlayer = this.createPlayer(
    this.gameMaterials.redMechanism,
    0xff5a78,
  )
  private readonly bluePlayer = this.createPlayer(
    this.gameMaterials.blueMechanism,
    0x5a9dff,
  )
  private readonly cameraController = new CameraController(this.camera, {
    ...greenTemple.cameraBounds,
  })
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true })
  private readonly composer = new EffectComposer(this.renderer)
  private readonly renderPass = new RenderPass(this.scene, this.camera)
  private readonly bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0.7,
    0.32,
    0.82,
  )
  private readonly outputPass = new OutputPass()
  private readonly skyLight = new THREE.HemisphereLight(
    0x344478,
    0x291b42,
    0.55,
  )
  private readonly keyLight = new THREE.DirectionalLight(0xb8c8ff, 1.15)
  private readonly rimLight = new THREE.DirectionalLight(0x7a5bb4, 0.7)
  private readonly nightSkyBackground = new NightSkyBackground()
  private readonly container: HTMLElement
  private readonly physicsWorld: PhysicsWorld
  private readonly input: InputManager
  private animationTime = 0
  private readonly cameraFocusOffset = new THREE.Vector3()
  private eggRollAngle = 0
  private previousEggX: number | undefined
  private readonly eggRollRotation = new THREE.Quaternion()
  private hatchingTime = 0
  private isHatchingSkipped = false

  constructor(
    container: HTMLElement,
    physicsWorld: PhysicsWorld,
    input: InputManager,
  ) {
    this.container = container
    this.physicsWorld = physicsWorld
    this.input = input
    this.camera.position.z = 8
    this.scene.background = new THREE.Color(0x11142a)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.82
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.composer.addPass(this.renderPass)
    this.composer.addPass(this.bloomPass)
    this.composer.addPass(this.outputPass)
    this.keyLight.position.set(-26, 18, 16)
    this.keyLight.target.position.set(28, 0, 0)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.set(2048, 2048)
    this.keyLight.shadow.camera.left = -68
    this.keyLight.shadow.camera.right = 68
    this.keyLight.shadow.camera.top = 34
    this.keyLight.shadow.camera.bottom = -34
    this.keyLight.shadow.camera.near = 1
    this.keyLight.shadow.camera.far = 90
    this.keyLight.shadow.bias = -0.0005
    this.keyLight.shadow.normalBias = 0.02
    this.rimLight.position.set(-20, 14, -16)
    this.scene.add(this.camera)
    this.nightSkyBackground.attachTo(this.camera)
    this.startingPlatform.position.set(...greenTemple.startingPlatform.position)
    this.landingPlatform.position.set(...greenTemple.landingPlatform.position)
    this.centralExitPlatform.position.set(
      ...greenTemple.centralExitPlatform.position,
    )
    this.slope.position.set(...greenTemple.slope.position)
    this.slope.rotation.z = greenTemple.slope.angleRadians
    this.finalSlope.position.set(...greenTemple.finalSlope.position)
    this.finalSlope.rotation.z = greenTemple.finalSlope.angleRadians
    this.upperExitPlatform.position.set(
      ...greenTemple.upperExitPlatform.position,
    )
    this.nestIsland.position.set(...greenTemple.nestIsland.position)
    this.positionGrassTop(this.grassTops[0], greenTemple.startingPlatform)
    this.positionGrassTop(this.grassTops[1], greenTemple.landingPlatform)
    this.positionGrassTop(this.grassTops[2], greenTemple.centralExitPlatform)
    this.positionGrassTop(this.grassTops[3], greenTemple.upperExitPlatform)
    this.positionGrassTop(this.grassTops[4], greenTemple.nestIsland)
    this.landscapedPlatforms.forEach((platform, index) => {
      this.blockyTerrain[index].position.set(...platform.position)
      this.terrainStrata[index].position.set(...platform.position)
      this.grassFringes[index].position.set(
        platform.position[0],
        platform.position[1] + platform.size[1] / 2,
        platform.position[2],
      )
    })
    this.nest.position.set(...greenTemple.nest.position)
    this.nest.rotation.x = Math.PI / 2
    this.nestGlow.position.set(
      greenTemple.nest.position[0],
      greenTemple.nest.position[1] + 0.35,
      greenTemple.nest.position[2],
    )
    this.objectiveBeacon.rotation.x = Math.PI / 2
    this.elevatorParkourPlatforms.forEach((platform, index) => {
      platform.position.set(
        ...greenTemple.elevatorParkourPlatforms[index].position,
      )
    })
    this.trainingWall.position.set(...greenTemple.trainingWall.position)
    this.door.position.set(...greenTemple.door.position)
    this.neutralButton.position.set(...greenTemple.neutralButton.visualPosition)
    this.bridge.position.set(...greenTemple.bridge.retractedPosition)
    this.bridgePocketFloor.position.y =
      greenTemple.bridge.size[1] / 2 +
      greenTemple.bridge.pocket.floorSize[1] / 2
    this.bridgePocketLeftRail.position.set(
      0,
      greenTemple.bridge.pocket.railSize[1],
      -greenTemple.bridge.pocket.railOffsetZ,
    )
    this.bridgePocketRightRail.position.set(
      0,
      greenTemple.bridge.pocket.railSize[1],
      greenTemple.bridge.pocket.railOffsetZ,
    )
    this.bridge.add(
      this.bridgePocketFloor,
      this.bridgePocketLeftRail,
      this.bridgePocketRightRail,
    )
    this.redPlayer.root.scale.setScalar(0.65)
    this.bluePlayer.root.scale.setScalar(0.65)
    this.scene.add(
      this.keyLight.target,
      this.startingPlatform,
      this.landingPlatform,
      this.centralExitPlatform,
      ...this.grassTops,
      ...this.blockyTerrain,
      ...this.terrainStrata,
      ...this.grassFringes,
      this.gardenDecorations,
      this.mechanicalDecorations,
      this.gearGlow,
      this.gearSparks.points,
      this.cozyLandscapeDecorations,
      this.centralCheckpoint.root,
      this.slope,
      this.finalSlope,
      this.upperExitPlatform,
      this.nestIsland,
      this.nest,
      this.trainingWall,
      this.spikeStrip,
      this.redButton.mesh,
      this.blueButton.mesh,
      this.neutralButton,
      this.door,
      this.lever.root,
      this.elevatorLever.root,
      this.bridge,
      this.blueBridge,
      this.bridgeGlow,
      this.blueBridgeGlow,
      this.elevator.platform,
      this.elevator.leftChain,
      this.elevator.rightChain,
      this.elevatorLoadRing,
      this.elevatorLoadGlow,
      this.elevatorMotionGlow,
      ...this.elevatorParkourPlatforms,
      this.nestGlow,
      this.objectiveBeacon,
      this.objectiveBeaconGlow,
    )
    this.gearGlow.position.set(-0.55, -0.34, 1.3)
    this.eggAmbientGlow.position.y = 0.5
    this.eggPushGlow.position.y = 0.55
    this.egg.root.add(this.eggAmbientGlow, this.eggPushGlow)
    this.scene.add(this.egg.root, this.chick.root)
    this.scene.add(this.redPlayer.root, this.bluePlayer.root)
    this.scene.add(this.skyLight, this.keyLight, this.rimLight)
    this.enableMeshShadows()
  }

  start(): void {
    this.container.append(this.renderer.domElement)
    window.addEventListener('resize', this.resize)
    this.resize()
  }

  update(deltaSeconds: number): void {
    this.syncPhysicsModels()
    this.updateDamageParticles(deltaSeconds)
    this.updateHatching(deltaSeconds)
    this.animationTime += deltaSeconds
    this.nightSkyBackground.update(this.animationTime)
    this.gearGlow.intensity = 0.72 + Math.sin(this.animationTime * 4.4) * 0.12
    this.gearMaterial.emissiveIntensity =
      0.08 + Math.sin(this.animationTime * 4.4) * 0.025
    this.updateGearSparks(deltaSeconds)
    this.updateObjectiveBeacon()
    this.animatePlayer(
      this.redPlayer,
      'red',
      this.physicsWorld.getRedPlayerLinearVelocity(),
    )
    this.animatePlayer(
      this.bluePlayer,
      'blue',
      this.physicsWorld.getBluePlayerLinearVelocity(),
    )
    const cameraFocus = this.getCameraFocus()
    this.cameraController.update(
      this.egg.root.position,
      cameraFocus.offset,
      cameraFocus.spread,
      deltaSeconds,
    )
    this.composer.render()
  }

  stop(): void {
    window.removeEventListener('resize', this.resize)
    this.renderer.domElement.remove()
    this.startingPlatformGeometry.dispose()
    this.landingPlatformGeometry.dispose()
    this.centralExitPlatformGeometry.dispose()
    this.grassTopGeometries.forEach((geometry) => geometry.dispose())
    this.blockTerrainGeometries.forEach((geometry) => geometry.dispose())
    this.terrainLayerGeometries.forEach((geometry) => geometry.dispose())
    this.terrainSoilMaterial.dispose()
    this.terrainClayMaterial.dispose()
    this.terrainRockMaterial.dispose()
    this.grassBladeGeometry.dispose()
    this.grassBladeMaterial.dispose()
    this.flowerStemGeometry.dispose()
    this.flowerHeadGeometry.dispose()
    this.gardenRockGeometry.dispose()
    this.flowerStemMaterial.dispose()
    this.pinkFlowerMaterial.dispose()
    this.yellowFlowerMaterial.dispose()
    this.gardenRockMaterial.dispose()
    this.gearGeometries.forEach((geometry) => geometry.dispose())
    this.gearMaterial.dispose()
    this.gearSparks.geometry.dispose()
    this.gearSparks.material.dispose()
    this.treeTrunkGeometry.dispose()
    this.treeCrownGeometry.dispose()
    this.shrubGeometry.dispose()
    this.treeTrunkMaterial.dispose()
    this.treeFoliageMaterial.dispose()
    this.treeFoliageAccentMaterial.dispose()
    this.checkpointBaseGeometry.dispose()
    this.checkpointBeamGeometry.dispose()
    this.checkpointCrystalGeometry.dispose()
    this.centralCheckpoint.material.dispose()
    this.slopeGeometry.dispose()
    this.finalSlopeGeometry.dispose()
    this.upperExitPlatformGeometry.dispose()
    this.nestIslandGeometry.dispose()
    this.objectiveBeaconGeometry.dispose()
    this.objectiveBeaconMaterial.dispose()
    this.nestGeometry.dispose()
    this.eggGeometry.dispose()
    this.eggCrackGeometry.dispose()
    this.eggCriticalCrackGeometry.dispose()
    this.eggFragmentGeometry.dispose()
    this.damageParticleGeometry.dispose()
    this.damageParticleMaterial.dispose()
    this.eggCrackMaterial.dispose()
    this.chickBodyGeometry.dispose()
    this.chickHeadGeometry.dispose()
    this.chickBeakGeometry.dispose()
    this.chickWingGeometry.dispose()
    this.chickMaterial.dispose()
    this.trainingWallGeometry.dispose()
    this.trainingWallMaterial.dispose()
    this.spikeBaseGeometry.dispose()
    this.spikeGeometry.dispose()
    this.spikeMaterial.dispose()
    this.buttonGeometry.dispose()
    this.neutralButtonGeometry.dispose()
    this.redButton.material.dispose()
    this.blueButton.material.dispose()
    this.doorGeometry.dispose()
    this.leverBaseGeometry.dispose()
    this.leverHandleGeometry.dispose()
    this.lever.material.dispose()
    this.elevatorLever.material.dispose()
    this.elevatorParkourGeometries.forEach((geometry) => geometry.dispose())
    this.bridgeGeometry.dispose()
    this.bridgePocketFloorGeometry.dispose()
    this.bridgePocketRailGeometry.dispose()
    this.blueBridgeGeometry.dispose()
    this.elevatorPlatformGeometry.dispose()
    this.chainGeometry.dispose()
    this.elevatorLoadRingGeometry.dispose()
    this.elevatorLoadRingMaterial.dispose()
    this.helmetGeometry.dispose()
    this.visorGeometry.dispose()
    this.torsoGeometry.dispose()
    this.legGeometry.dispose()
    this.gameMaterials.dispose()
    this.nightSkyBackground.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }

  skipHatching(): void {
    this.isHatchingSkipped = true
  }

  getHasHatched(): boolean {
    return (
      this.physicsWorld.getIsLevelFinished() &&
      (this.isHatchingSkipped || this.hatchingTime >= 1.6)
    )
  }

  private readonly resize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    if (width === 0 || height === 0) {
      return
    }

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(width, height)
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.composer.setSize(width, height)
  }

  private syncPhysicsModels(): void {
    const eggTranslation = this.physicsWorld.getEggTranslation()
    const eggRotation = this.physicsWorld.getEggRotation()

    this.egg.root.position.set(
      eggTranslation.x,
      eggTranslation.y,
      eggTranslation.z,
    )
    this.egg.root.quaternion.set(
      eggRotation.x,
      eggRotation.y,
      eggRotation.z,
      eggRotation.w,
    )
    this.updateEggRoll(eggTranslation.x)
    this.updateEggDamageVisual()
    this.updateEggPushVisual()
    this.updateButtonVisual(this.redButton, 'red')
    this.updateButtonVisual(this.blueButton, 'blue')
    this.updateDoorVisual()
    this.updateLeverVisual()
    this.updateElevatorLeverVisual()
    this.updateBridgeVisual()
    this.updateBlueBridgeVisual()
    this.updateElevatorVisual()
    this.updateCentralCheckpointVisual()
    this.updateNestVisual()
    this.updateSpikeVisual()
    this.syncPlayerPosition(
      this.redPlayer,
      this.physicsWorld.getRedPlayerTranslation(),
    )
    this.syncPlayerPosition(
      this.bluePlayer,
      this.physicsWorld.getBluePlayerTranslation(),
    )
  }

  private syncPlayerPosition(
    player: PlayerModel,
    translation: PhysicsTranslation,
  ): void {
    player.root.position.set(
      translation.x,
      translation.y + playerVisualOffsetY,
      translation.z,
    )
  }

  private positionGrassTop(
    top: THREE.Mesh,
    platform: {
      position: readonly [number, number, number]
      size: readonly [number, number, number]
    },
  ): void {
    top.position.set(
      platform.position[0],
      platform.position[1] + platform.size[1] / 2 + 0.035,
      platform.position[2],
    )
  }

  private createBlockyTerrain(
    size: readonly [number, number, number],
  ): THREE.Group {
    const terrain = new THREE.Group()
    const columns = Math.max(2, Math.round(size[0] / 1.25))
    const rows = Math.max(2, Math.round(size[2] / 0.85))
    const cellWidth = size[0] / columns
    const cellDepth = size[2] / rows

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const seed = (column * 29 + row * 17 + columns * 11) % 9
        const height = 0.1 + (seed - 4) * 0.012
        const geometry = new THREE.BoxGeometry(
          cellWidth - 0.025,
          height,
          cellDepth - 0.025,
        )
        const block = new THREE.Mesh(geometry, this.terrainBlockMaterials)

        block.position.set(
          -size[0] / 2 + cellWidth * (column + 0.5),
          size[1] / 2 + height / 2 - 0.008,
          -size[2] / 2 + cellDepth * (row + 0.5),
        )
        terrain.add(block)
        this.blockTerrainGeometries.push(geometry)
      }
    }

    return terrain
  }

  private createTerrainStrata(
    size: readonly [number, number, number],
  ): THREE.Group {
    const root = new THREE.Group()
    const layers: ReadonlyArray<
      readonly [number, number, number, number, THREE.Material]
    > = [
      [0, -size[1] / 2 - 0.11, 0, 0.22, this.terrainSoilMaterial],
      [0.12, -size[1] / 2 - 0.29, 0.14, 0.14, this.terrainRockMaterial],
      [0.28, -size[1] / 2 - 0.48, 0.28, 0.24, this.terrainClayMaterial],
    ]

    layers.forEach(([insetX, y, insetZ, height, material]) => {
      const geometry = new THREE.BoxGeometry(
        Math.max(0.3, size[0] - insetX),
        height,
        Math.max(0.3, size[2] - insetZ),
      )
      const mesh = new THREE.Mesh(geometry, material)

      mesh.position.y = y
      root.add(mesh)
      this.terrainLayerGeometries.push(geometry)
    })

    return root
  }

  private createGrassFringe(
    size: readonly [number, number, number],
  ): THREE.Group {
    const root = new THREE.Group()
    const clusterCount = Math.max(10, Math.round(size[0] * 1.7))

    for (let index = 0; index < clusterCount; index += 1) {
      const seed = index * 1.618
      const x =
        -size[0] / 2 +
        0.18 +
        ((Math.sin(seed * 7.1) + 1) / 2) * (size[0] - 0.36)
      const z =
        -size[2] / 2 +
        0.18 +
        ((Math.cos(seed * 4.3) + 1) / 2) * (size[2] - 0.36)
      const cluster = new THREE.Group()
      const variation = 0.7 + ((index * 19) % 5) * 0.08

      for (let bladeIndex = 0; bladeIndex < 3; bladeIndex += 1) {
        const blade = new THREE.Mesh(
          this.grassBladeGeometry,
          this.grassBladeMaterial,
        )
        const angle = (Math.PI * 2 * bladeIndex) / 3 + index * 0.43

        blade.position.set(
          Math.cos(angle) * 0.035,
          0.11 * variation,
          Math.sin(angle) * 0.035,
        )
        blade.scale.setScalar(variation)
        blade.rotation.y = angle
        cluster.add(blade)
      }

      cluster.position.set(x, 0.17, z)
      root.add(cluster)
    }

    return root
  }

  private enableMeshShadows(): void {
    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        !(object.material instanceof THREE.MeshBasicMaterial)
      ) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }

  private createGardenDecorations(): THREE.Group {
    const decorations = new THREE.Group()
    const flowers: ReadonlyArray<
      readonly [number, number, number, PastelToonMaterial]
    > = [
      [-3.2, 0.285, -1.1, this.pinkFlowerMaterial],
      [2.7, 0.285, 1.08, this.yellowFlowerMaterial],
      [14.4, -1.103, -1.12, this.yellowFlowerMaterial],
      [21.7, -1.103, 1.08, this.pinkFlowerMaterial],
      [41.8, -1.103, -1.08, this.yellowFlowerMaterial],
      [54.4, -1.103, 1.08, this.pinkFlowerMaterial],
      [64.2, 10.685, -1.06, this.yellowFlowerMaterial],
      [92.2, 4.585, 1.08, this.pinkFlowerMaterial],
      [102.1, 4.585, -1.08, this.yellowFlowerMaterial],
    ]
    const rocks: ReadonlyArray<readonly [number, number, number, number]> = [
      [-4.1, 0.41, 1.04, 0.9],
      [17.1, -0.99, 1.02, 1.1],
      [37.9, -0.99, -1.02, 0.85],
      [69.2, 10.81, 1.03, 1],
      [103.3, 4.71, -1.02, 1.2],
    ]

    flowers.forEach(([x, y, z, material]) => {
      const stem = new THREE.Mesh(
        this.flowerStemGeometry,
        this.flowerStemMaterial,
      )
      const head = new THREE.Mesh(this.flowerHeadGeometry, material)

      stem.position.set(x, y + 0.11, z)
      head.position.set(x, y + 0.24, z)
      decorations.add(stem, head)
    })

    rocks.forEach(([x, y, z, scale]) => {
      const rock = new THREE.Mesh(
        this.gardenRockGeometry,
        this.gardenRockMaterial,
      )
      rock.position.set(x, y, z)
      rock.scale.set(scale * 1.2, scale * 0.7, scale)
      decorations.add(rock)
    })

    return decorations
  }

  private createCozyLandscapeDecorations(): THREE.Group {
    const decorations = new THREE.Group()
    const trees: ReadonlyArray<
      readonly [number, number, number, number, PastelToonMaterial]
    > = [
      [-3.7, 0.29, -1.17, 0.86, this.treeFoliageMaterial],
      [12.8, -1.1, -1.17, 0.7, this.treeFoliageAccentMaterial],
      [56.2, -1.1, -1.17, 0.83, this.treeFoliageMaterial],
      [68.8, 10.7, -1.17, 0.72, this.treeFoliageAccentMaterial],
      [106.2, 4.59, -1.17, 0.92, this.treeFoliageMaterial],
    ]
    const shrubs: ReadonlyArray<readonly [number, number, number, number]> = [
      [4.25, 0.36, -1.12, 0.78],
      [18.2, -1.04, -1.12, 0.9],
      [57.9, -1.04, -1.12, 0.85],
      [63.4, 10.73, -1.12, 0.7],
      [88.2, 4.65, -1.12, 1],
    ]

    trees.forEach(([x, y, z, scale, foliageMaterial]) => {
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(
        this.treeTrunkGeometry,
        this.treeTrunkMaterial,
      )
      const crown = new THREE.Mesh(this.treeCrownGeometry, foliageMaterial)
      const accent = new THREE.Mesh(
        this.treeCrownGeometry,
        this.treeFoliageAccentMaterial,
      )

      trunk.position.y = 0.38
      crown.position.set(-0.12, 0.77, 0)
      crown.scale.set(1.14, 1.22, 0.86)
      accent.position.set(0.18, 0.69, -0.03)
      accent.scale.set(0.7, 0.76, 0.7)
      tree.position.set(x, y, z)
      tree.scale.setScalar(scale)
      tree.add(trunk, crown, accent)
      decorations.add(tree)
    })

    shrubs.forEach(([x, y, z, scale], index) => {
      const shrub = new THREE.Mesh(
        this.shrubGeometry,
        index % 2 === 0
          ? this.treeFoliageMaterial
          : this.treeFoliageAccentMaterial,
      )

      shrub.position.set(x, y + 0.16 * scale, z)
      shrub.scale.set(1.4 * scale, scale, 0.9 * scale)
      decorations.add(shrub)
    })

    return decorations
  }

  private createMechanicalDecorations(): THREE.Group {
    const decorations = new THREE.Group()
    const largeGear = this.createGear(0.38, 0.13, 10)
    const smallGear = this.createGear(0.28, 0.095, 9)

    largeGear.position.set(-0.95, -0.5, 1.53)
    largeGear.rotation.z = 0.18
    smallGear.position.set(-0.22, -0.5, 1.54)
    smallGear.rotation.z = -0.13
    decorations.add(largeGear, smallGear)

    return decorations
  }

  private createGearSparks(): GearSparkSystem {
    const count = 28
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const ages = new Float32Array(count)
    const lifetimes = new Float32Array(count)
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.PointsMaterial({
      color: 0xffbd61,
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    )
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
    )

    const sparks: GearSparkSystem = {
      points: new THREE.Points(geometry, material),
      geometry,
      material,
      positions,
      colors,
      velocities,
      ages,
      lifetimes,
    }

    for (let index = 0; index < count; index += 1) {
      lifetimes[index] = 0.7 + (index % 7) * 0.1
      ages[index] = (index / count) * lifetimes[index]
      this.resetGearSpark(sparks, index)
    }

    return sparks
  }

  private updateGearSparks(deltaSeconds: number): void {
    const sparks = this.gearSparks

    for (let index = 0; index < sparks.ages.length; index += 1) {
      const offset = index * 3

      sparks.ages[index] += deltaSeconds

      if (sparks.ages[index] >= sparks.lifetimes[index]) {
        this.resetGearSpark(sparks, index)
      }

      sparks.positions[offset] += sparks.velocities[offset] * deltaSeconds
      sparks.positions[offset + 1] +=
        sparks.velocities[offset + 1] * deltaSeconds
      sparks.positions[offset + 2] +=
        sparks.velocities[offset + 2] * deltaSeconds
      sparks.velocities[offset + 1] -= deltaSeconds * 0.28

      const lifeProgress = sparks.ages[index] / sparks.lifetimes[index]
      const brightness = Math.sin(lifeProgress * Math.PI) * 1.15

      sparks.colors[offset] = brightness
      sparks.colors[offset + 1] = brightness * 0.55
      sparks.colors[offset + 2] = brightness * 0.16
    }

    sparks.geometry.attributes.position.needsUpdate = true
    sparks.geometry.attributes.color.needsUpdate = true
  }

  private resetGearSpark(sparks: GearSparkSystem, index: number): void {
    const offset = index * 3
    const phase = index * 12.9898
    const spreadX = (Math.sin(phase) * 0.5 + 0.5 - 0.5) * 0.92
    const spreadZ = (Math.sin(phase * 0.57) * 0.5 + 0.5 - 0.5) * 0.15

    sparks.positions[offset] = -0.56 + spreadX
    sparks.positions[offset + 1] = -0.52 + (index % 4) * 0.03
    sparks.positions[offset + 2] = 1.58 + spreadZ
    sparks.velocities[offset] = (Math.sin(phase * 1.6) * 0.5 + 0.5 - 0.5) * 0.3
    sparks.velocities[offset + 1] = 0.56 + (index % 5) * 0.08
    sparks.velocities[offset + 2] = (Math.cos(phase) * 0.5 + 0.5 - 0.5) * 0.12
    sparks.ages[index] = 0
  }

  private createGear(
    radius: number,
    toothDepth: number,
    teeth: number,
  ): THREE.Mesh {
    const shape = new THREE.Shape()

    for (let index = 0; index < teeth * 2; index += 1) {
      const angle = (Math.PI * index) / teeth
      const currentRadius = index % 2 === 0 ? radius + toothDepth : radius
      const point = new THREE.Vector2(
        Math.cos(angle) * currentRadius,
        Math.sin(angle) * currentRadius,
      )

      if (index === 0) {
        shape.moveTo(point.x, point.y)
      } else {
        shape.lineTo(point.x, point.y)
      }
    }
    shape.closePath()

    const hole = new THREE.Path()
    hole.absarc(0, 0, radius * 0.3, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const geometry = new THREE.ShapeGeometry(shape)
    const gear = new THREE.Mesh(geometry, this.gearMaterial)

    this.gearGeometries.push(geometry)

    return gear
  }

  private createCentralCheckpoint(): CheckpointModel {
    const root = new THREE.Group()
    const material = this.gameMaterials.moss.clone()
    const base = new THREE.Mesh(
      this.checkpointBaseGeometry,
      this.gameMaterials.metal,
    )
    const beam = new THREE.Mesh(this.checkpointBeamGeometry, material)
    const crystal = new THREE.Mesh(this.checkpointCrystalGeometry, material)
    const glow = new THREE.PointLight(0x5bd779, 0.6, 4)

    base.position.y = 0.06
    beam.position.y = 0.61
    crystal.position.y = 1.4
    glow.position.y = 1.15
    root.position.set(...greenTemple.centralCheckpoint.position)
    root.add(base, beam, crystal, glow)

    return { root, material, glow }
  }

  private updateCentralCheckpointVisual(): void {
    const isActivated = this.physicsWorld.getIsCentralCheckpointActivated()
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 3.2)

    this.centralCheckpoint.root.rotation.y = this.animationTime * 0.4
    this.centralCheckpoint.material.emissiveIntensity = isActivated
      ? 2.4 + pulse * 0.5
      : 0.45 + pulse * 0.18
    this.centralCheckpoint.glow.intensity = isActivated
      ? 2 + pulse * 0.5
      : 0.5 + pulse * 0.18
  }

  private updateNestVisual(): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 2.4)
    const isFinished = this.physicsWorld.getIsLevelFinished()
    const isOnFinalApproach = this.physicsWorld.getEggTranslation().x >= 86

    this.nestGlow.intensity = isFinished
      ? 2.4 + pulse * 0.9
      : isOnFinalApproach
        ? 1.25 + pulse * 0.5
        : 0.6 + pulse * 0.25
  }

  private updateSpikeVisual(): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 4.4)

    this.spikeMaterial.emissive.setHex(0x67091f)
    this.spikeMaterial.emissiveIntensity = 0.35 + pulse * 0.7
  }

  private createPlayer(
    suitMaterial: THREE.Material,
    glowColor: THREE.ColorRepresentation,
  ): PlayerModel {
    const root = new THREE.Group()
    const torso = new THREE.Mesh(this.torsoGeometry, suitMaterial)
    const helmet = new THREE.Mesh(this.helmetGeometry, this.gameMaterials.metal)
    const visor = new THREE.Mesh(
      this.visorGeometry,
      this.gameMaterials.blueMechanism,
    )
    const leftLeg = new THREE.Mesh(this.legGeometry, suitMaterial)
    const rightLeg = leftLeg.clone()
    const glow = new THREE.PointLight(glowColor, 0.55, 2.8)

    glow.position.y = 0.18
    root.add(torso, helmet, visor, leftLeg, rightLeg, glow)

    return { root, torso, helmet, visor, leftLeg, rightLeg, glow }
  }

  private createEgg(): EggModel {
    const root = new THREE.Group()
    const eggBody = new THREE.Mesh(this.eggGeometry, this.gameMaterials.egg)
    const crackedLayer = new THREE.Mesh(
      this.eggCrackGeometry,
      this.eggCrackMaterial,
    )
    const criticalLayer = new THREE.Group()
    const upperCriticalCrack = new THREE.Mesh(
      this.eggCriticalCrackGeometry,
      this.eggCrackMaterial,
    )
    const lowerCriticalCrack = upperCriticalCrack.clone()

    lowerCriticalCrack.rotation.z = Math.PI
    lowerCriticalCrack.rotation.y = Math.PI
    criticalLayer.add(upperCriticalCrack, lowerCriticalCrack)
    const fragments = this.createEggFragments()
    crackedLayer.visible = false
    criticalLayer.visible = false
    fragments.visible = false

    root.scale.set(0.225, 0.375, 0.225)
    root.add(eggBody, crackedLayer, criticalLayer, fragments)

    return { root, body: eggBody, crackedLayer, criticalLayer, fragments }
  }

  private createChick(): ChickModel {
    const root = new THREE.Group()
    const body = new THREE.Mesh(this.chickBodyGeometry, this.chickMaterial)
    const head = new THREE.Mesh(this.chickHeadGeometry, this.chickMaterial)
    const beak = new THREE.Mesh(this.chickBeakGeometry, this.gameMaterials.egg)
    const leftWing = new THREE.Mesh(this.chickWingGeometry, this.chickMaterial)
    const rightWing = leftWing.clone()
    const glow = new THREE.PointLight(0x9d7dff, 2.5, 4)

    head.position.set(0.1, 0.28, 0)
    beak.position.set(0.25, 0.28, 0)
    beak.rotation.z = -Math.PI / 2
    leftWing.position.set(-0.25, 0.04, 0)
    rightWing.position.set(0.25, 0.04, 0)
    leftWing.rotation.z = -1
    rightWing.rotation.z = 1
    glow.position.y = 0.3
    root.visible = false
    root.add(body, head, beak, leftWing, rightWing, glow)

    return { root, leftWing, rightWing }
  }

  private updateHatching(deltaSeconds: number): void {
    if (!this.physicsWorld.getIsLevelFinished()) {
      this.hatchingTime = 0
      this.isHatchingSkipped = false
      this.egg.root.visible = true
      this.egg.root.scale.set(0.225, 0.375, 0.225)
      this.chick.root.visible = false
      this.gameMaterials.egg.emissive.setHex(0x000000)
      return
    }

    this.hatchingTime = this.isHatchingSkipped
      ? 1.6
      : Math.min(1.6, this.hatchingTime + deltaSeconds)
    const progress = this.hatchingTime / 1.6

    this.gameMaterials.egg.emissive.setHex(0x3a226f)
    this.gameMaterials.egg.emissiveIntensity = 0.8 + progress * 1.8
    this.egg.root.scale.set(
      0.225 * (1 - progress * 0.55),
      0.375 * (1 - progress * 0.55),
      0.225 * (1 - progress * 0.55),
    )
    this.chick.root.position.copy(this.egg.root.position)
    this.chick.root.position.y += 0.14
    this.chick.root.visible = this.hatchingTime >= 0.7
    this.chick.root.scale.setScalar(
      THREE.MathUtils.clamp((this.hatchingTime - 0.7) / 0.9, 0, 1),
    )
    this.chick.root.rotation.y = Math.sin(this.hatchingTime * 5) * 0.15
    const wingFlap = Math.sin(this.animationTime * 9) * 0.32
    this.chick.leftWing.rotation.z = -1 - wingFlap
    this.chick.rightWing.rotation.z = 1 + wingFlap

    if (progress >= 1) {
      this.egg.root.visible = false
    }
  }

  private createEggFragments(): THREE.Group {
    const fragments = new THREE.Group()
    const fragmentOffsets = [
      new THREE.Vector3(-0.42, 0.26, 0.04),
      new THREE.Vector3(0.36, 0.18, -0.04),
      new THREE.Vector3(-0.18, -0.34, -0.05),
      new THREE.Vector3(0.42, -0.18, 0.03),
    ]

    fragmentOffsets.forEach((offset, index) => {
      const fragment = new THREE.Mesh(
        this.eggFragmentGeometry,
        this.gameMaterials.egg,
      )
      fragment.position.copy(offset)
      fragment.rotation.set(index * 0.45, index * 0.3, index * 0.6)
      fragments.add(fragment)
    })

    return fragments
  }

  private createSpikeStrip(): THREE.Group {
    const strip = new THREE.Group()
    const base = new THREE.Mesh(
      this.spikeBaseGeometry,
      this.gameMaterials.metal,
    )

    base.position.y = 0.06
    strip.add(base)

    for (let index = 0; index < greenTemple.spikeStrip.spikeCount; index += 1) {
      const spike = new THREE.Mesh(this.spikeGeometry, this.spikeMaterial)
      spike.position.set(
        (index - (greenTemple.spikeStrip.spikeCount - 1) / 2) *
          greenTemple.spikeStrip.spikeSpacing,
        greenTemple.spikeStrip.spikeHeight / 2 + 0.06,
        0,
      )
      strip.add(spike)
    }

    strip.position.set(...greenTemple.spikeStrip.visualPosition)

    return strip
  }

  private createButton(
    buttonColor: ButtonColor,
    sourceMaterial: PastelToonMaterial,
  ): ButtonModel {
    const material = sourceMaterial.clone()
    const mesh = new THREE.Mesh(this.buttonGeometry, material)

    mesh.position.set(...greenTemple.buttons[buttonColor].visualPosition)

    return { mesh, material }
  }

  private updateButtonVisual(
    button: ButtonModel,
    buttonColor: ButtonColor,
  ): void {
    const isPressed = this.physicsWorld.isButtonPressed(buttonColor)
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 3.8)

    button.mesh.scale.y = isPressed ? 0.55 : 1
    button.material.emissiveIntensity = isPressed
      ? 2.2 + pulse * 0.35
      : 0.3 + pulse * 0.35
  }

  private updateDoorVisual(): void {
    const [x, y, z] = greenTemple.door.position
    const openOffsetY = this.physicsWorld.getIsDoorOpen()
      ? greenTemple.door.openOffsetY
      : 0

    this.door.position.set(x, y + openOffsetY, z)
  }

  private createLever(position: readonly [number, number, number]): LeverModel {
    const root = new THREE.Group()
    const material = this.gameMaterials.redMechanism.clone()
    const base = new THREE.Mesh(
      this.leverBaseGeometry,
      this.gameMaterials.metal,
    )
    const handle = new THREE.Mesh(this.leverHandleGeometry, material)
    const glow = new THREE.PointLight(0xff5577, 0.35, 2.6)

    base.position.y = 0.15
    handle.position.y = 0.56
    glow.position.y = 0.68
    root.position.set(...position)
    root.add(base, handle, glow)

    return { root, handle, material, glow }
  }

  private updateLeverVisual(): void {
    const isActivated = this.physicsWorld.getIsLeverActivated()
    const isNearby = this.physicsWorld.getLeverNearbyPlayer() !== undefined

    this.lever.handle.rotation.z = isActivated ? -0.75 : 0.75
    this.updateLeverGlow(this.lever, isNearby)
  }

  private updateElevatorLeverVisual(): void {
    const isNearby =
      this.physicsWorld.getElevatorLeverNearbyPlayer() !== undefined

    this.elevatorLever.handle.rotation.z = isNearby ? -0.75 : 0.75
    this.updateLeverGlow(this.elevatorLever, isNearby)
  }

  private updateLeverGlow(lever: LeverModel, isNearby: boolean): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 4)

    lever.material.emissiveIntensity = isNearby ? 1.9 + pulse * 0.7 : 0.45
    lever.glow.intensity = isNearby ? 1.1 + pulse * 0.45 : 0.22
  }

  private updateObjectiveBeacon(): void {
    const target = getObjectiveState(this.physicsWorld).target

    if (target === 'finished') {
      this.objectiveBeacon.visible = false
      this.objectiveBeaconGlow.visible = false
      return
    }

    const position = this.getObjectiveBeaconPosition(target)
    const pulse = 0.5 + Math.sin(this.animationTime * 3.2) * 0.12

    this.objectiveBeacon.visible = true
    this.objectiveBeaconGlow.visible = true
    this.objectiveBeacon.position.copy(position)
    this.objectiveBeacon.position.y += pulse
    this.objectiveBeacon.rotation.z = this.animationTime * 1.8
    this.objectiveBeacon.scale.setScalar(
      1 + Math.sin(this.animationTime * 3.2) * 0.12,
    )
    this.objectiveBeaconGlow.position.copy(this.objectiveBeacon.position)
    this.objectiveBeaconGlow.intensity =
      1.1 + Math.sin(this.animationTime * 3.2) * 0.35
  }

  private getObjectiveBeaconPosition(target: ObjectiveTarget): THREE.Vector3 {
    switch (target) {
      case 'temple':
      case 'bridge':
        return new THREE.Vector3(
          greenTemple.lever.position[0],
          greenTemple.lever.position[1] + 1,
          greenTemple.lever.position[2],
        )
      case 'checkpoint':
        return new THREE.Vector3(
          greenTemple.centralCheckpoint.position[0],
          greenTemple.centralCheckpoint.position[1] + 1.25,
          greenTemple.centralCheckpoint.position[2],
        )
      case 'elevator-lever':
        return new THREE.Vector3(
          greenTemple.elevatorLever.position[0],
          greenTemple.elevatorLever.position[1] + 1,
          greenTemple.elevatorLever.position[2],
        )
      case 'elevator':
        return new THREE.Vector3(
          greenTemple.elevator.lowerPosition[0],
          greenTemple.elevator.lowerPosition[1] + 0.65,
          greenTemple.elevator.lowerPosition[2],
        )
      case 'upper-exit':
        return new THREE.Vector3(
          greenTemple.upperExitPlatform.position[0],
          greenTemple.upperExitPlatform.position[1] + 0.8,
          greenTemple.upperExitPlatform.position[2],
        )
      case 'nest':
        return new THREE.Vector3(
          greenTemple.nest.position[0],
          greenTemple.nest.position[1] + 0.8,
          greenTemple.nest.position[2],
        )
      case 'finished':
        return new THREE.Vector3()
    }
  }

  private updateBridgeVisual(): void {
    const translation = this.physicsWorld.getBridgeTranslation()
    this.bridge.position.set(translation.x, translation.y, translation.z)
    this.updateBridgeGlow(
      this.bridgeGlow,
      translation,
      this.physicsWorld.isButtonPressed('red'),
    )
  }

  private updateBlueBridgeVisual(): void {
    const translation = this.physicsWorld.getBlueBridgeTranslation()
    this.blueBridge.position.set(translation.x, translation.y, translation.z)
    this.updateBridgeGlow(
      this.blueBridgeGlow,
      translation,
      this.physicsWorld.isButtonPressed('blue'),
    )
  }

  private updateBridgeGlow(
    glow: THREE.PointLight,
    translation: PhysicsTranslation,
    isActive: boolean,
  ): void {
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 3.5)

    glow.visible = isActive

    if (!isActive) {
      return
    }

    glow.position.set(translation.x, translation.y + 0.55, translation.z)
    glow.intensity = 0.75 + pulse * 0.5
  }

  private createElevator(): ElevatorModel {
    const platform = new THREE.Mesh(
      this.elevatorPlatformGeometry,
      this.gameMaterials.wood,
    )
    const leftChain = new THREE.Mesh(
      this.chainGeometry,
      this.gameMaterials.metal,
    )
    const rightChain = leftChain.clone()

    return { platform, leftChain, rightChain }
  }

  private updateElevatorVisual(): void {
    const translation = this.physicsWorld.getElevatorTranslation()
    const chainLength = Math.max(
      0.1,
      greenTemple.elevator.chainAnchorY - translation.y,
    )

    this.elevator.platform.position.set(
      translation.x,
      translation.y,
      translation.z,
    )
    this.updateElevatorLoadIndicator(translation)
    this.updateElevatorMotionGlow(translation)
    this.positionElevatorChain(
      this.elevator.leftChain,
      translation,
      -0.7,
      chainLength,
    )
    this.positionElevatorChain(
      this.elevator.rightChain,
      translation,
      0.7,
      chainLength,
    )
  }

  private updateElevatorLoadIndicator(
    elevatorTranslation: PhysicsTranslation,
  ): void {
    const isWaitingForEgg = this.physicsWorld.getElevatorNeedsEgg()
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 4)

    this.elevatorLoadRing.visible = isWaitingForEgg
    this.elevatorLoadGlow.visible = isWaitingForEgg

    if (!isWaitingForEgg) {
      return
    }

    this.elevatorLoadRing.position.set(
      elevatorTranslation.x,
      elevatorTranslation.y + 0.19,
      elevatorTranslation.z,
    )
    this.elevatorLoadRing.rotation.x = Math.PI / 2
    this.elevatorLoadRing.scale.setScalar(0.92 + pulse * 0.16)
    this.elevatorLoadGlow.position.copy(this.elevatorLoadRing.position)
    this.elevatorLoadGlow.intensity = 0.85 + pulse * 0.6
  }

  private updateElevatorMotionGlow(
    elevatorTranslation: PhysicsTranslation,
  ): void {
    const isControlled = this.physicsWorld.getIsElevatorLeverHeld()
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 6)

    this.elevatorMotionGlow.visible = isControlled

    if (!isControlled) {
      return
    }

    this.elevatorMotionGlow.position.set(
      elevatorTranslation.x,
      elevatorTranslation.y + 0.42,
      elevatorTranslation.z,
    )
    this.elevatorMotionGlow.intensity = 0.75 + pulse * 0.55
  }

  private positionElevatorChain(
    chain: THREE.Mesh,
    elevatorTranslation: PhysicsTranslation,
    offsetX: number,
    length: number,
  ): void {
    chain.position.set(
      elevatorTranslation.x + offsetX,
      elevatorTranslation.y + length / 2,
      elevatorTranslation.z,
    )
    chain.scale.y = length
  }

  private createEggCrackGeometry(): THREE.TubeGeometry {
    const crackPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 0.42, 0.88),
      new THREE.Vector3(-0.08, 0.2, 0.98),
      new THREE.Vector3(-0.26, -0.02, 0.94),
      new THREE.Vector3(0.04, -0.22, 0.99),
      new THREE.Vector3(-0.1, -0.48, 0.87),
    ])

    return new THREE.TubeGeometry(crackPath, 10, 0.028, 4, false)
  }

  private createEggCriticalCrackGeometry(): THREE.TubeGeometry {
    const crackPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.48, 0.68, 0.68),
      new THREE.Vector3(0.23, 0.48, 0.88),
      new THREE.Vector3(0.5, 0.22, 0.82),
      new THREE.Vector3(0.18, -0.03, 0.96),
      new THREE.Vector3(0.38, -0.31, 0.78),
    ])

    return new THREE.TubeGeometry(crackPath, 10, 0.032, 4, false)
  }

  private updateEggDamageVisual(): void {
    const isEggBroken = this.physicsWorld.getIsEggBroken()
    const durability = this.physicsWorld.getEggDurabilityPercentage()
    const visualState = getEggVisualState(durability)
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 5)

    this.egg.body.visible = !isEggBroken
    // The egg always carries a faint magical seam; only damage makes it flare.
    this.egg.crackedLayer.visible = !isEggBroken
    this.egg.criticalLayer.visible = !isEggBroken && visualState === 'critical'
    this.egg.fragments.visible = isEggBroken

    if (
      this.previousEggDurability !== undefined &&
      durability < this.previousEggDurability
    ) {
      this.spawnDamageParticles()
    }

    this.previousEggDurability = durability

    if (visualState === 'critical') {
      this.eggCrackMaterial.emissiveIntensity = 1.9 + pulse * 0.55
    } else if (visualState === 'cracked') {
      this.eggCrackMaterial.emissiveIntensity = 1.25 + pulse * 0.3
    } else {
      this.eggCrackMaterial.emissiveIntensity = 0.82 + pulse * 0.12
    }

    this.gameMaterials.egg.emissive.setHex(0x000000)
    this.gameMaterials.egg.emissiveIntensity = 0
  }

  private updateEggPushVisual(): void {
    const isPushing =
      this.physicsWorld.getIsEggBeingPushed() &&
      !this.physicsWorld.getIsEggBroken()
    const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 9)

    this.eggPushGlow.intensity = isPushing ? 0.9 + pulse * 0.55 : 0
  }

  private spawnDamageParticles(): void {
    const particleCount = 7

    for (let index = 0; index < particleCount; index += 1) {
      const angle = (Math.PI * 2 * index) / particleCount
      const mesh = new THREE.Mesh(
        this.damageParticleGeometry,
        this.damageParticleMaterial,
      )
      mesh.position.copy(this.egg.root.position)
      mesh.position.z += Math.sin(angle) * 0.06
      this.scene.add(mesh)
      this.damageParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * 1.5,
          1.1 + (index % 2) * 0.35,
          Math.sin(angle) * 0.55,
        ),
        remainingSeconds: 0.48,
      })
    }
  }

  private updateDamageParticles(deltaSeconds: number): void {
    for (let index = this.damageParticles.length - 1; index >= 0; index -= 1) {
      const particle = this.damageParticles[index]
      particle.remainingSeconds -= deltaSeconds
      particle.velocity.y -= 5 * deltaSeconds
      particle.mesh.position.addScaledVector(particle.velocity, deltaSeconds)
      particle.mesh.rotation.x += deltaSeconds * 9
      particle.mesh.rotation.z += deltaSeconds * 7
      particle.mesh.scale.setScalar(
        Math.max(0, particle.remainingSeconds / 0.48),
      )

      if (particle.remainingSeconds <= 0) {
        particle.mesh.removeFromParent()
        this.damageParticles.splice(index, 1)
      }
    }
  }

  private getCameraFocus(): CameraFocus {
    const redOffset = this.redPlayer.root.position
      .clone()
      .sub(this.egg.root.position)
    const blueOffset = this.bluePlayer.root.position
      .clone()
      .sub(this.egg.root.position)
    const furthestPlayerOffset =
      redOffset.lengthSq() >= blueOffset.lengthSq() ? redOffset : blueOffset
    const spread = furthestPlayerOffset.length()

    if (spread >= 2) {
      this.cameraFocusOffset.set(
        THREE.MathUtils.clamp(furthestPlayerOffset.x * 0.5, -4, 4),
        THREE.MathUtils.clamp(furthestPlayerOffset.y * 0.5, -4, 4),
        0,
      )

      return { offset: this.cameraFocusOffset, spread }
    }

    this.cameraFocusOffset.set(0, 0, 0)

    return { offset: this.cameraFocusOffset, spread: 0 }
  }

  private updateEggRoll(eggX: number): void {
    if (this.previousEggX === undefined) {
      this.previousEggX = eggX
      return
    }

    const traveledDistance = eggX - this.previousEggX
    this.previousEggX = eggX

    if (Math.abs(traveledDistance) > 1) {
      this.eggRollAngle = 0
    } else {
      this.eggRollAngle -= traveledDistance / 0.225
    }

    this.eggRollRotation.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      this.eggRollAngle,
    )
    this.egg.root.quaternion.multiply(this.eggRollRotation)
  }

  private animatePlayer(
    player: PlayerModel,
    playerId: PlayerId,
    velocity: PhysicsTranslation,
  ): void {
    const runCycle = Math.sin(this.animationTime * 12)
    const isJumping = Math.abs(velocity.y) > 0.1
    const isPushing = this.input.isActionHeld(playerId, 'interact')
    const isRunning = Math.abs(velocity.x) > 0.1

    player.glow.intensity = isRunning || isPushing ? 0.9 : 0.55

    player.torso.position.set(0, -0.05, 0)
    player.torso.rotation.set(0, 0, 0)
    player.torso.scale.set(1, 1, 1)
    player.helmet.position.set(0, 0.45, 0)
    player.helmet.rotation.set(0, 0, 0)
    player.visor.position.set(0, 0.47, 0.33)
    player.leftLeg.position.set(-0.12, -0.5, 0)
    player.rightLeg.position.set(0.12, -0.5, 0)
    player.leftLeg.rotation.set(0, 0, 0)
    player.rightLeg.rotation.set(0, 0, 0)

    if (isJumping) {
      player.torso.rotation.x = -0.1
      player.leftLeg.rotation.x = 0.35
      player.rightLeg.rotation.x = 0.35
      return
    }

    if (isPushing) {
      player.torso.rotation.x = -0.2
      player.leftLeg.rotation.x = 0.2
      player.rightLeg.rotation.x = 0.2
      return
    }

    if (isRunning) {
      const runBob = Math.abs(runCycle) * 0.025
      player.torso.position.y += runBob
      player.helmet.position.y += runBob
      player.visor.position.y += runBob
      player.leftLeg.rotation.x = runCycle * 0.55
      player.rightLeg.rotation.x = -runCycle * 0.55
      return
    }

    const idleBreath = Math.sin(this.animationTime * 2) * 0.012
    player.torso.position.y += idleBreath
    player.torso.scale.y = 1 + idleBreath * 0.22
    player.helmet.position.y += idleBreath
    player.helmet.rotation.z = Math.sin(this.animationTime * 1.4) * 0.012
    player.visor.position.y += idleBreath
  }
}
