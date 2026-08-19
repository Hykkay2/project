import type { PhysicsWorld } from './PhysicsWorld'

export type ObjectiveTarget =
  | 'temple'
  | 'bridge'
  | 'checkpoint'
  | 'elevator-lever'
  | 'elevator'
  | 'upper-exit'
  | 'nest'
  | 'finished'

export interface ObjectiveState {
  text: string
  target: ObjectiveTarget
}

export const getObjectiveState = (
  physicsWorld: PhysicsWorld,
): ObjectiveState => {
  if (physicsWorld.getIsLevelFinished()) {
    return { text: 'Цель выполнена: птенец спасён', target: 'finished' }
  }

  const eggX = physicsWorld.getEggTranslation().x

  if (eggX < 24) {
    return { text: 'Цель: доведите яйцо к храму', target: 'temple' }
  }

  if (eggX < 45) {
    return { text: 'Цель: откройте путь через мосты', target: 'bridge' }
  }

  if (!physicsWorld.getIsCentralCheckpointActivated()) {
    return {
      text: 'Цель: доведите яйцо до контрольной точки',
      target: 'checkpoint',
    }
  }

  if (!physicsWorld.getIsLeverActivated()) {
    return {
      text: 'Цель: переключите рычаг подъёмника',
      target: 'elevator-lever',
    }
  }

  if (physicsWorld.getElevatorNeedsEgg()) {
    return { text: 'Цель: загрузите яйцо на подъёмник', target: 'elevator' }
  }

  if (eggX < 86) {
    return {
      text: 'Цель: поднимите яйцо на верхнюю площадку',
      target: 'upper-exit',
    }
  }

  return { text: 'Цель: докатите яйцо до гнезда', target: 'nest' }
}
