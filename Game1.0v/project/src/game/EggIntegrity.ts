export type EggVisualState = 'intact' | 'cracked' | 'critical'

export const getEggVisualState = (
  durabilityPercentage: number,
): EggVisualState => {
  if (durabilityPercentage >= 80) {
    return 'intact'
  }

  if (durabilityPercentage >= 40) {
    return 'cracked'
  }

  return 'critical'
}

export const clampEggDurability = (durabilityPercentage: number): number =>
  Math.min(100, Math.max(0, durabilityPercentage))

export const applyEggDamage = (
  durabilityPercentage: number,
  damagePercentage: number,
): number => clampEggDurability(durabilityPercentage - damagePercentage)

export const isHardEggImpact = (
  impactSpeed: number,
  damageThreshold: number,
): boolean => impactSpeed > damageThreshold
