// Content: the fixed v1 adventure map layout (spec.md Non-goals — no
// procedural generation yet). 30x22 hexes (4x the original 15x11's total
// tile count), roughly mirrored between the two Keep corners — every
// pair below sits at col,row and its (W-1-col, H-1-row) mirror, usually
// with a different resource/creature at each end of the pair (same
// pattern the original hand-placed map used) — so neither hero starts
// with a structural advantage (plan.md "Content values").

export const MAP_WIDTH = 30;
export const MAP_HEIGHT = 22;

// Column/row -> axial hex, matching hexgrid.js's rectHexes/inRect layout
// (r = row - floor(col/2)) so hand-placed content lines up with the
// engine's own coordinate system.
function at(col, row) {
  return { q: col, r: row - Math.floor(col / 2) };
}

export const KEEP_PLAYER = at(2, 10);
export const KEEP_AI = at(27, 11);

// type: 'mine' | 'dwelling' | 'monster' | 'keep' | 'treasure'
export const MAP_OBJECTS = [
  { hex: KEEP_PLAYER, object: { type: 'keep', ownerId: 'player', spriteId: 'keep' } },
  { hex: KEEP_AI, object: { type: 'keep', ownerId: 'ai', spriteId: 'keep' } },

  // Mines — gold x2 (unguarded, one pair), and 2 of every other resource
  // (the original map had only 1 of each non-gold resource total, which
  // meant only one hero could ever economically build from it; this map
  // gives each side a same-resource mine reasonably close to home).
  { hex: at(5, 8), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(24, 13), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(4, 15), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(25, 6), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(9, 2), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(20, 19), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(7, 19), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(22, 2), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(12, 1), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(17, 20), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(3, 3), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur' } },
  { hex: at(26, 18), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems' } },
  { hex: at(11, 18), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems' } },
  { hex: at(18, 3), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur' } },

  // Dwellings — all 10 creature tiers now (the original only had 4:
  // archer/orc/ogre/troll), each guarded by its own creature type.
  { hex: at(6, 10), object: { type: 'dwelling', creatureTypeId: 'peasant', ownerId: null, spriteId: 'dwelling-peasant', guard: { creatureTypeId: 'peasant', count: 10 } } },
  { hex: at(23, 11), object: { type: 'dwelling', creatureTypeId: 'pikeman', ownerId: null, spriteId: 'dwelling-pikeman', guard: { creatureTypeId: 'pikeman', count: 6 } } },
  { hex: at(8, 6), object: { type: 'dwelling', creatureTypeId: 'archer', ownerId: null, spriteId: 'dwelling-archer', guard: { creatureTypeId: 'archer', count: 6 } } },
  { hex: at(21, 15), object: { type: 'dwelling', creatureTypeId: 'wolf', ownerId: null, spriteId: 'dwelling-wolf', guard: { creatureTypeId: 'wolf', count: 6 } } },
  { hex: at(5, 13), object: { type: 'dwelling', creatureTypeId: 'orc', ownerId: null, spriteId: 'dwelling-orc', guard: { creatureTypeId: 'orc', count: 5 } } },
  { hex: at(24, 8), object: { type: 'dwelling', creatureTypeId: 'griffin', ownerId: null, spriteId: 'dwelling-griffin', guard: { creatureTypeId: 'griffin', count: 4 } } },
  { hex: at(10, 4), object: { type: 'dwelling', creatureTypeId: 'ogre', ownerId: null, spriteId: 'dwelling-ogre', guard: { creatureTypeId: 'ogre', count: 4 } } },
  { hex: at(19, 17), object: { type: 'dwelling', creatureTypeId: 'skeleton', ownerId: null, spriteId: 'dwelling-skeleton', guard: { creatureTypeId: 'skeleton', count: 5 } } },
  { hex: at(13, 10), object: { type: 'dwelling', creatureTypeId: 'troll', ownerId: null, spriteId: 'dwelling-troll', guard: { creatureTypeId: 'troll', count: 4 } } },
  { hex: at(16, 11), object: { type: 'dwelling', creatureTypeId: 'dragon', ownerId: null, spriteId: 'dwelling-dragon', guard: { creatureTypeId: 'dragon', count: 2 } } },

  // Wandering monsters (no dwelling — one-time XP + tile clear, not
  // recruitable). Was 2, now 6, spanning easy to very hard.
  { hex: at(4, 19), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'peasant', count: 12 } } },
  { hex: at(25, 2), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'pikeman', count: 8 } } },
  { hex: at(9, 9), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'wolf', count: 6 } } },
  { hex: at(20, 12), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'skeleton', count: 8 } } },
  { hex: at(12, 15), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'ogre', count: 6 } } },
  { hex: at(17, 6), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'dragon', count: 3 } } },

  // Treasures — was 2 (gold only), now 6, varied resources.
  { hex: at(6, 4), object: { type: 'treasure', resource: 'gold', amount: 500, spriteId: 'treasure' } },
  { hex: at(23, 17), object: { type: 'treasure', resource: 'gold', amount: 500, spriteId: 'treasure' } },
  { hex: at(10, 12), object: { type: 'treasure', resource: 'wood', amount: 300, spriteId: 'treasure' } },
  { hex: at(19, 9), object: { type: 'treasure', resource: 'ore', amount: 300, spriteId: 'treasure' } },
  { hex: at(3, 17), object: { type: 'treasure', resource: 'ore', amount: 300, spriteId: 'treasure' } },
  { hex: at(26, 4), object: { type: 'treasure', resource: 'wood', amount: 300, spriteId: 'treasure' } },
];
