// Content: the 3 hero types (plan.md "Content values"). No spell/magic
// stats — see spec.md Non-goals.

export const HERO_TYPES = [
  {
    id: 'marshal',
    name: 'Marshal',
    attack: 2,
    defense: 2,
    startingArmy: [
      { creatureTypeId: 'pikeman', count: 10 },
      { creatureTypeId: 'archer', count: 6 },
    ],
    spriteId: 'hero-marshal',
  },
  {
    id: 'warlord',
    name: 'Warlord',
    attack: 3,
    defense: 1,
    startingArmy: [
      { creatureTypeId: 'wolf', count: 8 },
      { creatureTypeId: 'orc', count: 4 },
    ],
    spriteId: 'hero-warlord',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    attack: 1,
    defense: 3,
    startingArmy: [
      { creatureTypeId: 'peasant', count: 15 },
      { creatureTypeId: 'griffin', count: 3 },
    ],
    spriteId: 'hero-sentinel',
  },
];

const BY_ID = new Map(HERO_TYPES.map((h) => [h.id, h]));

export function getHeroType(id) {
  const heroType = BY_ID.get(id);
  if (!heroType) throw new Error(`Unknown hero type id: ${id}`);
  return heroType;
}
