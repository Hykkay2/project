import { describe, expect, it } from 'vitest'
import {
  applyEggDamage,
  getEggVisualState,
  isHardEggImpact,
} from './EggIntegrity'

describe('egg visual damage state', () => {
  it.each([
    [100, 'intact'],
    [60, 'cracked'],
    [20, 'critical'],
  ] as const)(
    'uses the correct cracks at %i%% durability',
    (durability, state) => {
      expect(getEggVisualState(durability)).toBe(state)
    },
  )

  it('reduces durability to zero immediately for spike damage', () => {
    expect(applyEggDamage(100, 100)).toBe(0)
  })

  it('only treats an impact above 7 units per second as damaging', () => {
    expect(isHardEggImpact(6.9, 7)).toBe(false)
    expect(isHardEggImpact(7.1, 7)).toBe(true)
  })
})
