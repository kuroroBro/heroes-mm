// Content: 28 creatures across 4 factions, 7 tiers each (specs/005-castle-
// factions plan.md Decision #2). Stats are a deliberately simplified
// classic tactical-strategy baseline — see specs/001-hex-heroes/plan.md's Decision #2
// for how attack/defense/hp/dmg are used in the battle damage formula, and
// spec.md's Non-goals for what's intentionally NOT modeled (special
// abilities, flying, etc.). `tier` is per-faction (1-7), not a single
// global scale — a Human tier 4 and an Orc tier 4 aren't meant to be
// equal-power, any more than they were across the old 1-10 scale.
//
// The original 10 (peasant, pikeman, archer, wolf, orc, griffin, ogre,
// skeleton, troll, dragon) keep their exact stats verbatim, just sorted
// into their faction; every other entry is new for this feature. Enkantos
// is Philippine folklore, reusing this workspace's pinoy-board project's
// creature names/flavor/art (see specs/005-castle-factions/plan.md
// Decision #3) — its relative power ordering loosely follows pinoy-board's
// own combat/enemies.ts maxHp/attackPower for the same creatures.

export const CREATURES = [
  // --- Human (Order/chivalry) ---
  { id: 'peasant', name: 'Peasant', factionId: 'human', tier: 1, attack: 1, defense: 1, hp: 1, speed: 3, dmgMin: 1, dmgMax: 1, ranged: false, growthPerDay: 8, spriteId: 'creature-peasant' },
  { id: 'pikeman', name: 'Pikeman', factionId: 'human', tier: 2, attack: 3, defense: 4, hp: 8, speed: 4, dmgMin: 1, dmgMax: 2, ranged: false, growthPerDay: 6, spriteId: 'creature-pikeman' },
  { id: 'archer', name: 'Archer', factionId: 'human', tier: 3, attack: 5, defense: 3, hp: 6, speed: 4, dmgMin: 2, dmgMax: 3, ranged: true, growthPerDay: 5, spriteId: 'creature-archer' },
  { id: 'swordsman', name: 'Swordsman', factionId: 'human', tier: 4, attack: 7, defense: 6, hp: 10, speed: 5, dmgMin: 3, dmgMax: 5, ranged: false, growthPerDay: 4, spriteId: 'creature-swordsman' },
  { id: 'griffin', name: 'Griffin', factionId: 'human', tier: 5, attack: 9, defense: 9, hp: 18, speed: 9, dmgMin: 3, dmgMax: 6, ranged: false, growthPerDay: 3, spriteId: 'creature-griffin' },
  { id: 'cavalier', name: 'Cavalier', factionId: 'human', tier: 6, attack: 13, defense: 11, hp: 60, speed: 7, dmgMin: 6, dmgMax: 10, ranged: false, growthPerDay: 2, spriteId: 'creature-cavalier' },
  { id: 'dragon', name: 'Dragon', factionId: 'human', tier: 7, attack: 16, defense: 16, hp: 180, speed: 9, dmgMin: 25, dmgMax: 50, ranged: false, growthPerDay: 1, spriteId: 'creature-dragon' },

  // --- Orc (Stronghold/horde) ---
  { id: 'goblin', name: 'Goblin', factionId: 'orc', tier: 1, attack: 2, defense: 1, hp: 5, speed: 4, dmgMin: 1, dmgMax: 2, ranged: false, growthPerDay: 9, spriteId: 'creature-goblin' },
  { id: 'wolf', name: 'Wolf', factionId: 'orc', tier: 2, attack: 6, defense: 3, hp: 7, speed: 7, dmgMin: 2, dmgMax: 3, ranged: false, growthPerDay: 4, spriteId: 'creature-wolf' },
  { id: 'orc', name: 'Orc', factionId: 'orc', tier: 3, attack: 8, defense: 6, hp: 15, speed: 5, dmgMin: 3, dmgMax: 5, ranged: true, growthPerDay: 3, spriteId: 'creature-orc' },
  { id: 'orc-chieftain', name: 'Orc Chieftain', factionId: 'orc', tier: 4, attack: 9, defense: 7, hp: 30, speed: 5, dmgMin: 4, dmgMax: 6, ranged: false, growthPerDay: 3, spriteId: 'creature-orc-chieftain' },
  { id: 'ogre', name: 'Ogre', factionId: 'orc', tier: 5, attack: 10, defense: 8, hp: 40, speed: 4, dmgMin: 5, dmgMax: 9, ranged: false, growthPerDay: 2, spriteId: 'creature-ogre' },
  { id: 'troll', name: 'Troll', factionId: 'orc', tier: 6, attack: 12, defense: 10, hp: 40, speed: 5, dmgMin: 6, dmgMax: 10, ranged: false, growthPerDay: 2, spriteId: 'creature-troll' },
  { id: 'behemoth', name: 'Behemoth', factionId: 'orc', tier: 7, attack: 17, defense: 13, hp: 150, speed: 6, dmgMin: 10, dmgMax: 16, ranged: false, growthPerDay: 1, spriteId: 'creature-behemoth' },

  // --- Undead (Necropolis) ---
  { id: 'skeleton', name: 'Skeleton', factionId: 'undead', tier: 1, attack: 6, defense: 6, hp: 6, speed: 4, dmgMin: 1, dmgMax: 3, ranged: false, growthPerDay: 6, spriteId: 'creature-skeleton' },
  { id: 'zombie', name: 'Zombie', factionId: 'undead', tier: 2, attack: 5, defense: 9, hp: 20, speed: 3, dmgMin: 2, dmgMax: 4, ranged: false, growthPerDay: 6, spriteId: 'creature-zombie' },
  { id: 'ghost', name: 'Ghost', factionId: 'undead', tier: 3, attack: 9, defense: 7, hp: 22, speed: 7, dmgMin: 3, dmgMax: 5, ranged: false, growthPerDay: 5, spriteId: 'creature-ghost' },
  { id: 'wraith', name: 'Wraith', factionId: 'undead', tier: 4, attack: 10, defense: 9, hp: 30, speed: 6, dmgMin: 4, dmgMax: 7, ranged: false, growthPerDay: 4, spriteId: 'creature-wraith' },
  { id: 'vampire', name: 'Vampire', factionId: 'undead', tier: 5, attack: 12, defense: 10, hp: 50, speed: 6, dmgMin: 5, dmgMax: 9, ranged: false, growthPerDay: 3, spriteId: 'creature-vampire' },
  { id: 'lich', name: 'Lich', factionId: 'undead', tier: 6, attack: 13, defense: 12, hp: 80, speed: 4, dmgMin: 6, dmgMax: 11, ranged: true, growthPerDay: 2, spriteId: 'creature-lich' },
  { id: 'bone-dragon', name: 'Bone Dragon', factionId: 'undead', tier: 7, attack: 18, defense: 16, hp: 210, speed: 8, dmgMin: 20, dmgMax: 35, ranged: false, growthPerDay: 1, spriteId: 'creature-bone-dragon' },

  // --- Enkantos (Philippine folklore, pinoy-board reuse) ---
  { id: 'duwende', name: 'Duwende', factionId: 'enkantos', tier: 1, attack: 2, defense: 2, hp: 6, speed: 4, dmgMin: 1, dmgMax: 2, ranged: false, growthPerDay: 9, spriteId: 'creature-duwende' },
  { id: 'santilmo', name: 'Santilmo', factionId: 'enkantos', tier: 2, attack: 6, defense: 3, hp: 8, speed: 6, dmgMin: 2, dmgMax: 4, ranged: true, growthPerDay: 6, spriteId: 'creature-santilmo' },
  { id: 'manananggal', name: 'Manananggal', factionId: 'enkantos', tier: 3, attack: 8, defense: 5, hp: 14, speed: 7, dmgMin: 3, dmgMax: 5, ranged: true, growthPerDay: 5, spriteId: 'creature-manananggal' },
  { id: 'tikbalang', name: 'Tikbalang', factionId: 'enkantos', tier: 4, attack: 10, defense: 7, hp: 22, speed: 8, dmgMin: 4, dmgMax: 7, ranged: false, growthPerDay: 4, spriteId: 'creature-tikbalang' },
  { id: 'aswang', name: 'Aswang', factionId: 'enkantos', tier: 5, attack: 12, defense: 9, hp: 32, speed: 6, dmgMin: 5, dmgMax: 8, ranged: false, growthPerDay: 3, spriteId: 'creature-aswang' },
  { id: 'kapre', name: 'Kapre', factionId: 'enkantos', tier: 6, attack: 11, defense: 15, hp: 60, speed: 3, dmgMin: 5, dmgMax: 9, ranged: false, growthPerDay: 2, spriteId: 'creature-kapre' },
  { id: 'bakunawa', name: 'Bakunawa', factionId: 'enkantos', tier: 7, attack: 17, defense: 15, hp: 160, speed: 6, dmgMin: 15, dmgMax: 25, ranged: false, growthPerDay: 1, spriteId: 'creature-bakunawa' },
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
