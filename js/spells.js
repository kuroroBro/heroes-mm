// Content: the 6 v1 spells (specs/003-siege-and-spells/plan.md content
// table). Hand-tabulated and explicitly tunable, same status as every
// other content table in this project (creatures.js, castle.js's cost
// tables). Learned permanently at the Castle (js/castle.js), cast in
// battle by spending mana (js/battle.js).

export const SPELLS = [
  {
    id: 'magicArrow', name: 'Magic Arrow', manaCost: 8,
    learnCost: { gold: 400, crystal: 2 },
    effect: 'damage', target: 'singleEnemy', power: 15,
  },
  {
    id: 'fireball', name: 'Fireball', manaCost: 20,
    learnCost: { gold: 1500, sulfur: 6 },
    effect: 'damage', target: 'allEnemies', power: 10,
  },
  {
    id: 'bless', name: 'Bless', manaCost: 10,
    learnCost: { gold: 800, gems: 2 },
    effect: 'buff', target: 'allAllies', stat: 'attack', amount: 3, durationRounds: 3,
  },
  {
    id: 'curse', name: 'Curse', manaCost: 10,
    learnCost: { gold: 800, sulfur: 3 },
    effect: 'debuff', target: 'allEnemies', stat: 'attack', amount: -3, durationRounds: 3,
  },
  {
    id: 'haste', name: 'Haste', manaCost: 12,
    learnCost: { gold: 1000, mercury: 3 },
    effect: 'buff', target: 'allAllies', stat: 'speed', amount: 3, durationRounds: 3,
  },
  {
    id: 'heal', name: 'Heal', manaCost: 15,
    learnCost: { gold: 1200, crystal: 4 },
    effect: 'heal', target: 'singleAlly', power: 20,
  },
];

const BY_ID = new Map(SPELLS.map((s) => [s.id, s]));

export function getSpell(id) {
  const spell = BY_ID.get(id);
  if (!spell) throw new Error(`Unknown spell id: ${id}`);
  return spell;
}
