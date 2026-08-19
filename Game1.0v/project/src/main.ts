import './style.css'
import { Game } from './game/Game'
import { CollectionProgressTracker } from './game/CollectionProgressTracker'
import { InputManager, type PlayerInputBindings } from './game/InputManager'
import { PhysicsWorld } from './game/PhysicsWorld'
import { SceneRenderer } from './render/SceneRenderer'
import { EggBreakOverlay } from './ui/EggBreakOverlay'
import { CollectionPanel } from './ui/CollectionPanel'
import { CheckpointNotice } from './ui/CheckpointNotice'
import { CheckpointFlash } from './ui/CheckpointFlash'
import { EggDurabilityHud } from './ui/EggDurabilityHud'
import { EggDamageVignette } from './ui/EggDamageVignette'
import { ElevatorHint } from './ui/ElevatorHint'
import { FinishNotice } from './ui/FinishNotice'
import { FinishFlash } from './ui/FinishFlash'
import { FullscreenToggle } from './ui/FullscreenToggle'
import { InputDebugOverlay } from './ui/InputDebugOverlay'
import { InteractionHint } from './ui/InteractionHint'
import { LevelTimerHud } from './ui/LevelTimerHud'
import { hideLoadingScreen } from './ui/LoadingScreen'
import { MainMenu } from './ui/MainMenu'
import { ObjectiveHud } from './ui/ObjectiveHud'
import { PauseMenu } from './ui/PauseMenu'
import { RouteProgressHud } from './ui/RouteProgressHud'
import { SoundManager } from './ui/SoundManager'

const app = document.querySelector<HTMLElement>('#app')

if (!app) {
  throw new Error('Game container #app was not found')
}

const inputSubsystem = new InputManager()
const redBindings: PlayerInputBindings = {
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  jump: 'KeyW',
  crouch: 'KeyS',
  interact: 'KeyE',
}
const blueBindings: PlayerInputBindings = {
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  jump: 'ArrowUp',
  crouch: 'ArrowDown',
  interact: ['ShiftLeft', 'ShiftRight'],
}

const eggDurabilityQueryParameter = new URLSearchParams(
  window.location.search,
).get('eggDurability')
const eggDurabilityQueryValue =
  eggDurabilityQueryParameter === null
    ? Number.NaN
    : Number(eggDurabilityQueryParameter)
const initialEggDurabilityPercentage = Number.isFinite(eggDurabilityQueryValue)
  ? eggDurabilityQueryValue
  : undefined

inputSubsystem.setBindings('red', redBindings)
inputSubsystem.setBindings('blue', blueBindings)
const physicsSubsystem = await PhysicsWorld.create(inputSubsystem, {
  initialEggDurabilityPercentage,
})
const collectionProgressTracker = new CollectionProgressTracker(
  physicsSubsystem,
)
const collectionPanel = new CollectionPanel(app)
const checkpointNotice = new CheckpointNotice(app, physicsSubsystem)
const checkpointFlash = new CheckpointFlash(app, physicsSubsystem)
const rendererSubsystem = new SceneRenderer(
  app,
  physicsSubsystem,
  inputSubsystem,
)
const soundManager = new SoundManager(
  physicsSubsystem,
  rendererSubsystem,
  inputSubsystem,
)
const mainMenu = new MainMenu(
  app,
  physicsSubsystem,
  collectionPanel,
  soundManager,
)
const uiSubsystem = new InputDebugOverlay(
  app,
  inputSubsystem,
  redBindings,
  blueBindings,
)
const eggDurabilityHud = new EggDurabilityHud(app, physicsSubsystem)
const eggDamageVignette = new EggDamageVignette(app, physicsSubsystem)
const levelTimerHud = new LevelTimerHud(app, physicsSubsystem)
const routeProgressHud = new RouteProgressHud(app, physicsSubsystem)
const objectiveHud = new ObjectiveHud(app, physicsSubsystem)
const fullscreenToggle = new FullscreenToggle(app)
const eggBreakOverlay = new EggBreakOverlay(app, physicsSubsystem)
const finishFlash = new FinishFlash(app, physicsSubsystem)
const finishNotice = new FinishNotice(
  app,
  physicsSubsystem,
  rendererSubsystem,
  collectionPanel,
  mainMenu,
)
const pauseMenu = new PauseMenu(app, physicsSubsystem, mainMenu)
const interactionHint = new InteractionHint(app, physicsSubsystem)
const elevatorHint = new ElevatorHint(app, physicsSubsystem)
const game = new Game([
  inputSubsystem,
  physicsSubsystem,
  collectionProgressTracker,
  rendererSubsystem,
  soundManager,
  collectionPanel,
  mainMenu,
  checkpointNotice,
  checkpointFlash,
  uiSubsystem,
  eggDurabilityHud,
  eggDamageVignette,
  levelTimerHud,
  routeProgressHud,
  objectiveHud,
  fullscreenToggle,
  eggBreakOverlay,
  finishFlash,
  finishNotice,
  pauseMenu,
  interactionHint,
  elevatorHint,
])

const cleanupGame = (): void => {
  game.stop()
  window.removeEventListener('beforeunload', cleanupGame)
}

window.addEventListener('beforeunload', cleanupGame)
game.start()
hideLoadingScreen()

if (import.meta.hot) {
  import.meta.hot.dispose(cleanupGame)
}
