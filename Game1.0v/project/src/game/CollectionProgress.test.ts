import { describe, expect, it } from 'vitest'
import {
  collectionProgressKey,
  recordTempleCompletion,
  templeChickId,
} from './CollectionProgress'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('collection progress', () => {
  it('opens one chick and keeps the best completion values', () => {
    const storage = new MemoryStorage()
    const first = recordTempleCompletion(120, 75, storage)
    const second = recordTempleCompletion(90, 60, storage)

    expect(first.chicks).toEqual([templeChickId])
    expect(second.chicks).toEqual([templeChickId])
    expect(second.bestTimeSeconds).toBe(90)
    expect(second.bestEggDurabilityPercentage).toBe(75)
    expect(storage.getItem(collectionProgressKey)).not.toBeNull()
  })
})
