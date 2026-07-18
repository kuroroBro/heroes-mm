// Content: the 10 creature tiers (plan.md "Content values"). Stats are a
// deliberately simplified HoMM3-inspired baseline — see plan.md's Decision
// #2 for how attack/defense/hp/dmg are used in the battle damage formula,
// and spec.md's Non-goals for what's intentionally NOT modeled (special
// abilities, flying, etc.).

export const CREATURES = [
  { id: 'peasant', name: 'Peasant', tier: 1, attack: 1, defense: 1, hp: 1, speed: 3, dmgMin: 1, dmgMax: 1, ranged: false, growthPerDay: 8, spriteId: 'creature-peasant' },
  { id: 'pikeman', name: 'Pikeman', tier: 2, attack: 3, defense: 4, hp: 8, speed: 4, dmgMin: 1, dmgMax: 2, ranged: false, growthPerDay: 6, spriteId: 'creature-pikeman' },
  { id: 'archer', name: 'Archer', tier: 3, attack: 5, defense: 3, hp: 6, speed: 4, dmgMin: 2, dmgMax: 3, ranged: true, growthPerDay: 5, spriteId: 'creature-archer' },
  { id: 'wolf', name: 'Wolf', tier: 4, attack: 6, defense: 3, hp: 7, speed: 7, dmgMin: 2, dmgMax: 3, ranged: false, growthPerDay: 4, spriteId: 'creature-wolf' },
  { id: 'orc', name: 'Orc', tier: 5, attack: 8, defense: 6, hp: 15, speed: 5, dmgMin: 3, dmgMax: 5, ranged: true, growthPerDay: 3, spriteId: 'creature-orc' },
  { id: 'griffin', name: 'Griffin', tier: 6, attack: 9, defense: 9, hp: 18, speed: 9, dmgMin: 3, dmgMax: 6, ranged: false, growthPerDay: 3, spriteId: 'creature-griffin' },
  { id: 'ogre', name: 'Ogre', tier: 7, attack: 10, defense: 8, hp: 40, speed: 4, dmgMin: 5, dmgMax: 9, ranged: false, growthPerDay: 2, spriteId: 'creature-ogre' },
  { id: 'skeleton', name: 'Skeleton', tier: 8, attack: 6, defense: 6, hp: 6, speed: 4, dmgMin: 1, dmgMax: 3, ranged: false, growthPerDay: 6, spriteId: 'creature-skeleton' },
  { id: 'troll', name: 'Troll', tier: 9, attack: 12, defense: 10, hp: 40, speed: 5, dmgMin: 6, dmgMax: 10, ranged: false, growthPerDay: 2, spriteId: 'creature-troll' },
  { id: 'dragon', name: 'Dragon', tier: 10, attack: 16, defense: 16, hp: 180, speed: 9, dmgMin: 25, dmgMax: 50, ranged: false, growthPerDay: 1, spriteId: 'creature-dragon' },
];

const BY_ID = new Map(CREATURES.map((c) => [c.id, c]));

export function getCreature(id) {
  const creature = BY_ID.get(id);
  if (!creature) throw new Error(`Unknown creature id: ${id}`);
  return creature;
}

// Rough relative power used by Kingdom Score and AI "can we win this"
// heuristics (plan.md Decision #5) — not the battle damage formula itself.
export function creaturePower(creature) {
  return creature.attack + creature.defense + creature.hp * 0.1;
}
