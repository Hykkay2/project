export const collectionProgressKey = 'egg-temple:collection:v1'
export const templeChickId = 'temple-hatchling'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface CollectionProgress {
  version: 1
  chicks: string[]
  bestTimeSeconds: number | null
  bestEggDurabilityPercentage: number
}

const defaultProgress = (): CollectionProgress => ({
  version: 1,
  chicks: [],
  bestTimeSeconds: null,
  bestEggDurabilityPercentage: 0,
})

const getBrowserStorage = (): StorageLike | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export const readCollectionProgress = (
  storage: StorageLike | undefined = getBrowserStorage(),
): CollectionProgress => {
  if (!storage) {
    return defaultProgress()
  }

  try {
    const storedValue = storage.getItem(collectionProgressKey)

    if (!storedValue) {
      return defaultProgress()
    }

    const parsedValue = JSON.parse(storedValue) as Partial<CollectionProgress>

    if (parsedValue.version !== 1 || !Array.isArray(parsedValue.chicks)) {
      return defaultProgress()
    }

    return {
      version: 1,
      chicks: parsedValue.chicks.filter(
        (chick): chick is string => typeof chick === 'string',
      ),
      bestTimeSeconds:
        typeof parsedValue.bestTimeSeconds === 'number'
          ? parsedValue.bestTimeSeconds
          : null,
      bestEggDurabilityPercentage:
        typeof parsedValue.bestEggDurabilityPercentage === 'number'
          ? parsedValue.bestEggDurabilityPercentage
          : 0,
    }
  } catch {
    return defaultProgress()
  }
}

export const recordTempleCompletion = (
  timeSeconds: number,
  eggDurabilityPercentage: number,
  storage: StorageLike | undefined = getBrowserStorage(),
): CollectionProgress => {
  const current = readCollectionProgress(storage)
  const next: CollectionProgress = {
    version: 1,
    chicks: current.chicks.includes(templeChickId)
      ? current.chicks
      : [...current.chicks, templeChickId],
    bestTimeSeconds:
      current.bestTimeSeconds === null
        ? timeSeconds
        : Math.min(current.bestTimeSeconds, timeSeconds),
    bestEggDurabilityPercentage: Math.max(
      current.bestEggDurabilityPercentage,
      eggDurabilityPercentage,
    ),
  }

  try {
    storage?.setItem(collectionProgressKey, JSON.stringify(next))
  } catch {
    // Storage may be unavailable in private browsing; the current run still ends.
  }

  return next
}
