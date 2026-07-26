// Content: the 5 factions (specs/005-castle-factions plan.md Decision #1
// — replaces js/heroTypes.js; picking a faction at setup is now the same
// choice hero type used to be, so this is that same shape plus a
// `creatures` roster; Sunborn added by specs/006-sunborn-faction). No
// spell/magic stats — see specs/001-hex-heroes/spec.md Non-goals.
//
// Human and Orc reuse the old Marshal/Warlord stat splits and starting
// armies verbatim; Undead reuses the old Sentinel's stat split (fitting —
// durable, low-attack) but not its starting army, since Peasant/Griffin
// now belong to Human. Enkantos and Sunborn have no hero-type precedent
// to reuse; Sunborn's (2 attack, 3 defense) split is deliberately
// distinct from all 4 existing combos (2/2, 3/1, 1/3, 3/0) — a
// disciplined, defense-leaning order rather than a glass cannon.

import { CREATURES } from './creatures.js';

export const FACTIONS = [
  {
    id: 'human',
    name: 'Human',
    attack: 2,
    defense: 2,
    startingArmy: [
      { creatureTypeId: 'pikeman', count: 10 },
      { creatureTypeId: 'archer', count: 6 },
    ],
    spriteId: 'hero-human',
  },
  {
    id: 'orc',
    name: 'Orc',
    attack: 3,
    defense: 1,
    startingArmy: [
      { creatureTypeId: 'wolf', count: 8 },
      { creatureTypeId: 'orc', count: 4 },
    ],
    spriteId: 'hero-orc',
  },
  {
    id: 'undead',
    name: 'Undead',
    attack: 1,
    defense: 3,
    startingArmy: [
      { creatureTypeId: 'zombie', count: 8 },
      { creatureTypeId: 'ghost', count: 5 },
    ],
    spriteId: 'hero-undead',
  },
  {
    id: 'enkantos',
    name: 'Enkantos',
    attack: 3,
    defense: 0,
    startingArmy: [
      { creatureTypeId: 'santilmo', count: 10 },
      { creatureTypeId: 'manananggal', count: 6 },
    ],
    spriteId: 'hero-enkantos',
  },
  {
    id: 'sunborn',
    name: 'Sunborn',
    attack: 2,
    defense: 3,
    startingArmy: [
      { creatureTypeId: 'salamander', count: 10 },
      { creatureTypeId: 'flame-dancer', count: 6 },
    ],
    spriteId: 'hero-sunborn',
  },
];

// Each faction's 7 creatureTypeIds in tier order — derived from
// creatures.js rather than hand-duplicated, so the two files can never
// drift out of sync.
for (const faction of FACTIONS) {
  faction.creatures = CREATURES
    .filter((c) => c.factionId === faction.id)
    .sort((a, b) => a.tier - b.tier)
    .map((c) => c.id);
}

const BY_ID = new Map(FACTIONS.map((f) => [f.id, f]));

export function getFaction(id) {
  const faction = BY_ID.get(id);
  if (!faction) throw new Error(`Unknown faction id: ${id}`);
  return faction;
}
