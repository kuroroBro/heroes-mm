// Content: the fixed v1 adventure map layout (spec.md Non-goals — no
// procedural generation yet). 15x11 hexes, roughly mirrored between the
// two Keep corners so neither hero starts with a structural advantage
// (plan.md "Content values").

export const MAP_WIDTH = 15;
export const MAP_HEIGHT = 11;

// Column/row -> axial hex, matching hexgrid.js's rectHexes/inRect layout
// (r = row - floor(col/2)) so hand-placed content lines up with the
// engine's own coordinate system.
function at(col, row) {
  return { q: col, r: row - Math.floor(col / 2) };
}

export const KEEP_PLAYER = at(1, 5);
export const KEEP_AI = at(13, 5);

// type: 'mine' | 'dwelling' | 'monster' | 'keep' | 'treasure'
export const MAP_OBJECTS = [
  { hex: KEEP_PLAYER, object: { type: 'keep', ownerId: 'player', spriteId: 'keep' } },
  { hex: KEEP_AI, object: { type: 'keep', ownerId: 'ai', spriteId: 'keep' } },

  { hex: at(3, 2), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(11, 8), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(2, 8), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(12, 2), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(6, 1), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(8, 9), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(4, 9), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur' } },
  { hex: at(10, 1), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems' } },

  { hex: at(5, 5), object: { type: 'dwelling', creatureTypeId: 'archer', ownerId: null, spriteId: 'dwelling', guard: { creatureTypeId: 'archer', count: 6 }, garrison: 0 } },
  { hex: at(9, 5), object: { type: 'dwelling', creatureTypeId: 'orc', ownerId: null, spriteId: 'dwelling', guard: { creatureTypeId: 'orc', count: 5 }, garrison: 0 } },
  { hex: at(3, 6), object: { type: 'dwelling', creatureTypeId: 'ogre', ownerId: null, spriteId: 'dwelling', guard: { creatureTypeId: 'ogre', count: 4 }, garrison: 0 } },
  { hex: at(11, 4), object: { type: 'dwelling', creatureTypeId: 'troll', ownerId: null, spriteId: 'dwelling', guard: { creatureTypeId: 'troll', count: 4 }, garrison: 0 } },

  { hex: at(7, 3), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'wolf', count: 6 } } },
  { hex: at(7, 7), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'skeleton', count: 8 } } },

  { hex: at(5, 8), object: { type: 'treasure', resource: 'gold', amount: 500, spriteId: 'treasure' } },
  { hex: at(9, 3), object: { type: 'treasure', resource: 'gold', amount: 500, spriteId: 'treasure' } },
];
