export const CollisionLayer = {
  player: 0b00001,
  egg: 0b00010,
  solid: 0b00100,
  hazard: 0b01000,
  sensor: 0b10000,
} as const

export const createCollisionGroups = (
  membership: number,
  filter: number,
): number => (membership << 16) | filter

export const CollisionGroups = {
  player: createCollisionGroups(
    CollisionLayer.player,
    CollisionLayer.player |
      CollisionLayer.egg |
      CollisionLayer.solid |
      CollisionLayer.hazard |
      CollisionLayer.sensor,
  ),
  egg: createCollisionGroups(
    CollisionLayer.egg,
    CollisionLayer.player |
      CollisionLayer.egg |
      CollisionLayer.solid |
      CollisionLayer.hazard |
      CollisionLayer.sensor,
  ),
  solid: createCollisionGroups(
    CollisionLayer.solid,
    CollisionLayer.player | CollisionLayer.egg,
  ),
  elevatorWithoutEgg: createCollisionGroups(
    CollisionLayer.solid,
    CollisionLayer.egg,
  ),
  hazard: createCollisionGroups(
    CollisionLayer.hazard,
    CollisionLayer.player | CollisionLayer.egg,
  ),
  sensor: createCollisionGroups(
    CollisionLayer.sensor,
    CollisionLayer.player | CollisionLayer.egg,
  ),
} as const
