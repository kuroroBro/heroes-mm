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

  // Dwellings — all 28 creature types now (specs/005-castle-factions),
  // one per creature, each guarded by its own creature type at a count
  // that scales down by tier (T1=10 ... T7=2, weaker-individually tiers
  // get bigger guard mobs). Placed as mirrored pairs, same (col,row) <->
  // (W-1-col,H-1-row) pattern as the rest of this map: Human <-> Undead,
  // Orc <-> Enkantos — every hex validated for bounds/collisions by a
  // throwaway generator script before being hand-written here (same
  // approach that caught real coordinate bugs in this map's own history).
  { hex: at(1, 0), object: { type: 'dwelling', creatureTypeId: 'peasant', ownerId: null, spriteId: 'dwelling-peasant', guard: { creatureTypeId: 'peasant', count: 10 } } },
  { hex: at(4, 0), object: { type: 'dwelling', creatureTypeId: 'pikeman', ownerId: null, spriteId: 'dwelling-pikeman', guard: { creatureTypeId: 'pikeman', count: 8 } } },
  { hex: at(7, 0), object: { type: 'dwelling', creatureTypeId: 'archer', ownerId: null, spriteId: 'dwelling-archer', guard: { creatureTypeId: 'archer', count: 6 } } },
  { hex: at(10, 0), object: { type: 'dwelling', creatureTypeId: 'swordsman', ownerId: null, spriteId: 'dwelling-swordsman', guard: { creatureTypeId: 'swordsman', count: 5 } } },
  { hex: at(13, 0), object: { type: 'dwelling', creatureTypeId: 'griffin', ownerId: null, spriteId: 'dwelling-griffin', guard: { creatureTypeId: 'griffin', count: 4 } } },
  { hex: at(1, 4), object: { type: 'dwelling', creatureTypeId: 'cavalier', ownerId: null, spriteId: 'dwelling-cavalier', guard: { creatureTypeId: 'cavalier', count: 3 } } },
  { hex: at(4, 4), object: { type: 'dwelling', creatureTypeId: 'dragon', ownerId: null, spriteId: 'dwelling-dragon', guard: { creatureTypeId: 'dragon', count: 2 } } },

  { hex: at(28, 21), object: { type: 'dwelling', creatureTypeId: 'skeleton', ownerId: null, spriteId: 'dwelling-skeleton', guard: { creatureTypeId: 'skeleton', count: 10 } } },
  { hex: at(25, 21), object: { type: 'dwelling', creatureTypeId: 'zombie', ownerId: null, spriteId: 'dwelling-zombie', guard: { creatureTypeId: 'zombie', count: 8 } } },
  { hex: at(22, 21), object: { type: 'dwelling', creatureTypeId: 'ghost', ownerId: null, spriteId: 'dwelling-ghost', guard: { creatureTypeId: 'ghost', count: 6 } } },
  { hex: at(19, 21), object: { type: 'dwelling', creatureTypeId: 'wraith', ownerId: null, spriteId: 'dwelling-wraith', guard: { creatureTypeId: 'wraith', count: 5 } } },
  { hex: at(16, 21), object: { type: 'dwelling', creatureTypeId: 'vampire', ownerId: null, spriteId: 'dwelling-vampire', guard: { creatureTypeId: 'vampire', count: 4 } } },
  { hex: at(28, 17), object: { type: 'dwelling', creatureTypeId: 'lich', ownerId: null, spriteId: 'dwelling-lich', guard: { creatureTypeId: 'lich', count: 3 } } },
  { hex: at(25, 17), object: { type: 'dwelling', creatureTypeId: 'bone-dragon', ownerId: null, spriteId: 'dwelling-bone-dragon', guard: { creatureTypeId: 'bone-dragon', count: 2 } } },

  { hex: at(7, 4), object: { type: 'dwelling', creatureTypeId: 'goblin', ownerId: null, spriteId: 'dwelling-goblin', guard: { creatureTypeId: 'goblin', count: 10 } } },
  { hex: at(10, 4), object: { type: 'dwelling', creatureTypeId: 'wolf', ownerId: null, spriteId: 'dwelling-wolf', guard: { creatureTypeId: 'wolf', count: 8 } } },
  { hex: at(13, 4), object: { type: 'dwelling', creatureTypeId: 'orc', ownerId: null, spriteId: 'dwelling-orc', guard: { creatureTypeId: 'orc', count: 6 } } },
  { hex: at(1, 8), object: { type: 'dwelling', creatureTypeId: 'orc-chieftain', ownerId: null, spriteId: 'dwelling-orc-chieftain', guard: { creatureTypeId: 'orc-chieftain', count: 5 } } },
  { hex: at(4, 8), object: { type: 'dwelling', creatureTypeId: 'ogre', ownerId: null, spriteId: 'dwelling-ogre', guard: { creatureTypeId: 'ogre', count: 4 } } },
  { hex: at(7, 8), object: { type: 'dwelling', creatureTypeId: 'troll', ownerId: null, spriteId: 'dwelling-troll', guard: { creatureTypeId: 'troll', count: 3 } } },
  { hex: at(10, 8), object: { type: 'dwelling', creatureTypeId: 'behemoth', ownerId: null, spriteId: 'dwelling-behemoth', guard: { creatureTypeId: 'behemoth', count: 2 } } },

  { hex: at(22, 17), object: { type: 'dwelling', creatureTypeId: 'duwende', ownerId: null, spriteId: 'dwelling-duwende', guard: { creatureTypeId: 'duwende', count: 10 } } },
  { hex: at(19, 17), object: { type: 'dwelling', creatureTypeId: 'santilmo', ownerId: null, spriteId: 'dwelling-santilmo', guard: { creatureTypeId: 'santilmo', count: 8 } } },
  { hex: at(16, 17), object: { type: 'dwelling', creatureTypeId: 'manananggal', ownerId: null, spriteId: 'dwelling-manananggal', guard: { creatureTypeId: 'manananggal', count: 6 } } },
  { hex: at(28, 13), object: { type: 'dwelling', creatureTypeId: 'tikbalang', ownerId: null, spriteId: 'dwelling-tikbalang', guard: { creatureTypeId: 'tikbalang', count: 5 } } },
  { hex: at(25, 13), object: { type: 'dwelling', creatureTypeId: 'aswang', ownerId: null, spriteId: 'dwelling-aswang', guard: { creatureTypeId: 'aswang', count: 4 } } },
  { hex: at(22, 13), object: { type: 'dwelling', creatureTypeId: 'kapre', ownerId: null, spriteId: 'dwelling-kapre', guard: { creatureTypeId: 'kapre', count: 3 } } },
  { hex: at(19, 13), object: { type: 'dwelling', creatureTypeId: 'bakunawa', ownerId: null, spriteId: 'dwelling-bakunawa', guard: { creatureTypeId: 'bakunawa', count: 2 } } },

  // Sunborn (specs/006-sunborn-faction) — a 5th, unpaired faction, so it
  // can't mirror creature-for-creature against a partner the way the 4
  // above do. Instead its own 7 dwellings are split across the map's two
  // *other* empty corners (top-right/bottom-left, themselves each other's
  // 180°-rotation mirror under this map's own (col,row)<->(W-1-col,H-1-
  // row) symmetry) — 4 in top-right, 3 in bottom-left. Positions chosen
  // by brute-force search over candidate cols/rows for the 7-of-14 subset
  // whose total hex distance from KEEP_PLAYER exactly equals its total
  // from KEEP_AI (matches the existing 28 dwellings' own 416==416
  // baseline); Phoenix and Cinder Wyvern (the two strongest, most
  // strategically important) additionally sit at the two individually-
  // perfectly-balanced positions (equal distance from both keeps) so the
  // single most valuable dwelling isn't just aggregately fair but
  // individually so.
  { hex: at(16, 0), object: { type: 'dwelling', creatureTypeId: 'phoenix', ownerId: null, spriteId: 'dwelling-phoenix', guard: { creatureTypeId: 'phoenix', count: 2 } } },
  { hex: at(19, 0), object: { type: 'dwelling', creatureTypeId: 'sun-priest', ownerId: null, spriteId: 'dwelling-sun-priest', guard: { creatureTypeId: 'sun-priest', count: 4 } } },
  { hex: at(22, 0), object: { type: 'dwelling', creatureTypeId: 'flame-dancer', ownerId: null, spriteId: 'dwelling-flame-dancer', guard: { creatureTypeId: 'flame-dancer', count: 6 } } },
  { hex: at(25, 0), object: { type: 'dwelling', creatureTypeId: 'spark', ownerId: null, spriteId: 'dwelling-spark', guard: { creatureTypeId: 'spark', count: 10 } } },
  { hex: at(13, 21), object: { type: 'dwelling', creatureTypeId: 'cinder-wyvern', ownerId: null, spriteId: 'dwelling-cinder-wyvern', guard: { creatureTypeId: 'cinder-wyvern', count: 3 } } },
  { hex: at(7, 21), object: { type: 'dwelling', creatureTypeId: 'ash-drake', ownerId: null, spriteId: 'dwelling-ash-drake', guard: { creatureTypeId: 'ash-drake', count: 5 } } },
  { hex: at(1, 21), object: { type: 'dwelling', creatureTypeId: 'salamander', ownerId: null, spriteId: 'dwelling-salamander', guard: { creatureTypeId: 'salamander', count: 8 } } },

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
