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
// KEEP_AI2/KEEP_AI3 (specs/009-multi-ai-opponents) — only ever placed on
// the map (adventure.js's createAdventure) when the setup screen's AI
// count actually calls for a 2nd/3rd AI; otherwise these hexes are just
// open ground, same as everywhere else on the map. Top-middle/
// bottom-middle, forming a left/right/top/bottom cross with the
// original 2 keeps — checked for fairness the same way every dwelling
// placement since specs/006 has been: total hex distance from all 4
// keep positions to every mine+dwelling on the map came out within ~6%
// of each other (855/855/822/872 across 56 pieces of content), close
// enough that no single starting corner is a structural advantage.
export const KEEP_AI2 = at(14, 0);
export const KEEP_AI3 = at(14, 21);

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

  // Yokai (specs/008-yokai-faction) — a 6th, again-unpaired faction (the
  // 2 existing "unpaired" ones, Sunborn and Yokai, don't mirror each
  // other either — each was independently placed to keep its *own* 7
  // dwellings balanced). Same brute-force-search approach as Sunborn:
  // candidate hexes in the top-right/bottom-left corners' remaining open
  // rows (avoiding every hex Sunborn/mines/monsters/treasures already
  // occupy), searched for the 7-position subset with zero difference
  // between total distance from KEEP_PLAYER and KEEP_AI (found one:
  // 111==111). Amaterasu and Kitsune (the two strongest) sit at the two
  // most individually-balanced positions of that subset, same rationale
  // as Phoenix/Cinder Wyvern above.
  { hex: at(16, 1), object: { type: 'dwelling', creatureTypeId: 'amaterasu', ownerId: null, spriteId: 'dwelling-amaterasu', guard: { creatureTypeId: 'amaterasu', count: 2 } } },
  { hex: at(19, 1), object: { type: 'dwelling', creatureTypeId: 'kitsune', ownerId: null, spriteId: 'dwelling-kitsune', guard: { creatureTypeId: 'kitsune', count: 3 } } },
  { hex: at(22, 1), object: { type: 'dwelling', creatureTypeId: 'orochi', ownerId: null, spriteId: 'dwelling-orochi', guard: { creatureTypeId: 'orochi', count: 4 } } },
  { hex: at(19, 8), object: { type: 'dwelling', creatureTypeId: 'onmyoji', ownerId: null, spriteId: 'dwelling-onmyoji', guard: { creatureTypeId: 'onmyoji', count: 5 } } },
  { hex: at(25, 1), object: { type: 'dwelling', creatureTypeId: 'oni', ownerId: null, spriteId: 'dwelling-oni', guard: { creatureTypeId: 'oni', count: 6 } } },
  { hex: at(4, 20), object: { type: 'dwelling', creatureTypeId: 'tengu', ownerId: null, spriteId: 'dwelling-tengu', guard: { creatureTypeId: 'tengu', count: 8 } } },
  { hex: at(1, 16), object: { type: 'dwelling', creatureTypeId: 'kappa', ownerId: null, spriteId: 'dwelling-kappa', guard: { creatureTypeId: 'kappa', count: 10 } } },

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

// --- Map size tiers (specs/010-map-size) ---------------------------------
// x1 (everything above) is the original, still-default map — completely
// unchanged, so the default game stays byte-identical to before this
// feature, same principle specs/009-multi-ai-opponents used for AI count.
// x2/x4 are new, larger layouts: every x1 hex (all 56 pieces of content,
// including the 2 always-placed keeps) is linearly rescaled into the
// bigger rectangle at the same *relative* position — preserving the
// existing left/right mirror (player<->ai) and top/bottom placement
// (ai2/ai3) — plus extra mine hexes scaled to the new area (14 extra for
// x2, 42 extra for x4 — i.e. (multiplier-1)*2 per resource type, so mine
// count itself scales with the map's own size multiplier), each guarded
// by a tier-1 or tier-2 creature (cycling through all 6 factions' own
// tier-1/2 units, not just Human peasant/pikeman, for variety) at the
// same 6/5 guard counts the original wood/ore/crystal/mercury mines
// already use — weak enough that the extra mines are an early, low-risk
// economy boost on a bigger map, not a new hard obstacle.
//
// Generated + fairness-checked by a throwaway script (same workflow as
// every map content addition since specs/006's plan.md): total hex
// distance from each of the 4 possible keeps to all mine/dwelling/
// monster/treasure content came out within ~4% of each other for both
// tiers (x2: 1687-1756; x4: 3246-3350) — tighter than the ~6% baseline
// already accepted for the x1 map's own 4-keep case — then hand-verified
// for zero out-of-bounds hexes and zero coordinate collisions before
// being written here.

export const MAP_WIDTH_X2 = 42;
export const MAP_HEIGHT_X2 = 31;
export const KEEP_PLAYER_X2 = at(3, 14);
export const KEEP_AI_X2 = at(38, 16);
export const KEEP_AI2_X2 = at(20, 0);
export const KEEP_AI3_X2 = at(20, 30);

export const MAP_OBJECTS_X2 = [
  { hex: at(3, 14), object: { type: 'keep', ownerId: 'player', spriteId: 'keep' } },
  { hex: at(38, 16), object: { type: 'keep', ownerId: 'ai', spriteId: 'keep' } },
  { hex: at(7, 11), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(34, 19), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(6, 21), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(35, 9), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(13, 3), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(28, 27), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(10, 27), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(31, 3), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(17, 1), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(24, 29), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(4, 4), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur' } },
  { hex: at(37, 26), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems' } },
  { hex: at(16, 26), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems' } },
  { hex: at(25, 4), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur' } },
  { hex: at(1, 0), object: { type: 'dwelling', creatureTypeId: 'peasant', ownerId: null, spriteId: 'dwelling-peasant', guard: { creatureTypeId: 'peasant', count: 10 } } },
  { hex: at(6, 0), object: { type: 'dwelling', creatureTypeId: 'pikeman', ownerId: null, spriteId: 'dwelling-pikeman', guard: { creatureTypeId: 'pikeman', count: 8 } } },
  { hex: at(10, 0), object: { type: 'dwelling', creatureTypeId: 'archer', ownerId: null, spriteId: 'dwelling-archer', guard: { creatureTypeId: 'archer', count: 6 } } },
  { hex: at(14, 0), object: { type: 'dwelling', creatureTypeId: 'swordsman', ownerId: null, spriteId: 'dwelling-swordsman', guard: { creatureTypeId: 'swordsman', count: 5 } } },
  { hex: at(18, 0), object: { type: 'dwelling', creatureTypeId: 'griffin', ownerId: null, spriteId: 'dwelling-griffin', guard: { creatureTypeId: 'griffin', count: 4 } } },
  { hex: at(1, 6), object: { type: 'dwelling', creatureTypeId: 'cavalier', ownerId: null, spriteId: 'dwelling-cavalier', guard: { creatureTypeId: 'cavalier', count: 3 } } },
  { hex: at(6, 6), object: { type: 'dwelling', creatureTypeId: 'dragon', ownerId: null, spriteId: 'dwelling-dragon', guard: { creatureTypeId: 'dragon', count: 2 } } },
  { hex: at(40, 30), object: { type: 'dwelling', creatureTypeId: 'skeleton', ownerId: null, spriteId: 'dwelling-skeleton', guard: { creatureTypeId: 'skeleton', count: 10 } } },
  { hex: at(35, 30), object: { type: 'dwelling', creatureTypeId: 'zombie', ownerId: null, spriteId: 'dwelling-zombie', guard: { creatureTypeId: 'zombie', count: 8 } } },
  { hex: at(31, 30), object: { type: 'dwelling', creatureTypeId: 'ghost', ownerId: null, spriteId: 'dwelling-ghost', guard: { creatureTypeId: 'ghost', count: 6 } } },
  { hex: at(27, 30), object: { type: 'dwelling', creatureTypeId: 'wraith', ownerId: null, spriteId: 'dwelling-wraith', guard: { creatureTypeId: 'wraith', count: 5 } } },
  { hex: at(23, 30), object: { type: 'dwelling', creatureTypeId: 'vampire', ownerId: null, spriteId: 'dwelling-vampire', guard: { creatureTypeId: 'vampire', count: 4 } } },
  { hex: at(40, 24), object: { type: 'dwelling', creatureTypeId: 'lich', ownerId: null, spriteId: 'dwelling-lich', guard: { creatureTypeId: 'lich', count: 3 } } },
  { hex: at(35, 24), object: { type: 'dwelling', creatureTypeId: 'bone-dragon', ownerId: null, spriteId: 'dwelling-bone-dragon', guard: { creatureTypeId: 'bone-dragon', count: 2 } } },
  { hex: at(10, 6), object: { type: 'dwelling', creatureTypeId: 'goblin', ownerId: null, spriteId: 'dwelling-goblin', guard: { creatureTypeId: 'goblin', count: 10 } } },
  { hex: at(14, 6), object: { type: 'dwelling', creatureTypeId: 'wolf', ownerId: null, spriteId: 'dwelling-wolf', guard: { creatureTypeId: 'wolf', count: 8 } } },
  { hex: at(18, 6), object: { type: 'dwelling', creatureTypeId: 'orc', ownerId: null, spriteId: 'dwelling-orc', guard: { creatureTypeId: 'orc', count: 6 } } },
  { hex: at(1, 11), object: { type: 'dwelling', creatureTypeId: 'orc-chieftain', ownerId: null, spriteId: 'dwelling-orc-chieftain', guard: { creatureTypeId: 'orc-chieftain', count: 5 } } },
  { hex: at(6, 11), object: { type: 'dwelling', creatureTypeId: 'ogre', ownerId: null, spriteId: 'dwelling-ogre', guard: { creatureTypeId: 'ogre', count: 4 } } },
  { hex: at(10, 11), object: { type: 'dwelling', creatureTypeId: 'troll', ownerId: null, spriteId: 'dwelling-troll', guard: { creatureTypeId: 'troll', count: 3 } } },
  { hex: at(14, 11), object: { type: 'dwelling', creatureTypeId: 'behemoth', ownerId: null, spriteId: 'dwelling-behemoth', guard: { creatureTypeId: 'behemoth', count: 2 } } },
  { hex: at(31, 24), object: { type: 'dwelling', creatureTypeId: 'duwende', ownerId: null, spriteId: 'dwelling-duwende', guard: { creatureTypeId: 'duwende', count: 10 } } },
  { hex: at(27, 24), object: { type: 'dwelling', creatureTypeId: 'santilmo', ownerId: null, spriteId: 'dwelling-santilmo', guard: { creatureTypeId: 'santilmo', count: 8 } } },
  { hex: at(23, 24), object: { type: 'dwelling', creatureTypeId: 'manananggal', ownerId: null, spriteId: 'dwelling-manananggal', guard: { creatureTypeId: 'manananggal', count: 6 } } },
  { hex: at(40, 19), object: { type: 'dwelling', creatureTypeId: 'tikbalang', ownerId: null, spriteId: 'dwelling-tikbalang', guard: { creatureTypeId: 'tikbalang', count: 5 } } },
  { hex: at(35, 19), object: { type: 'dwelling', creatureTypeId: 'aswang', ownerId: null, spriteId: 'dwelling-aswang', guard: { creatureTypeId: 'aswang', count: 4 } } },
  { hex: at(31, 19), object: { type: 'dwelling', creatureTypeId: 'kapre', ownerId: null, spriteId: 'dwelling-kapre', guard: { creatureTypeId: 'kapre', count: 3 } } },
  { hex: at(27, 19), object: { type: 'dwelling', creatureTypeId: 'bakunawa', ownerId: null, spriteId: 'dwelling-bakunawa', guard: { creatureTypeId: 'bakunawa', count: 2 } } },
  { hex: at(23, 0), object: { type: 'dwelling', creatureTypeId: 'phoenix', ownerId: null, spriteId: 'dwelling-phoenix', guard: { creatureTypeId: 'phoenix', count: 2 } } },
  { hex: at(27, 0), object: { type: 'dwelling', creatureTypeId: 'sun-priest', ownerId: null, spriteId: 'dwelling-sun-priest', guard: { creatureTypeId: 'sun-priest', count: 4 } } },
  { hex: at(31, 0), object: { type: 'dwelling', creatureTypeId: 'flame-dancer', ownerId: null, spriteId: 'dwelling-flame-dancer', guard: { creatureTypeId: 'flame-dancer', count: 6 } } },
  { hex: at(35, 0), object: { type: 'dwelling', creatureTypeId: 'spark', ownerId: null, spriteId: 'dwelling-spark', guard: { creatureTypeId: 'spark', count: 10 } } },
  { hex: at(18, 30), object: { type: 'dwelling', creatureTypeId: 'cinder-wyvern', ownerId: null, spriteId: 'dwelling-cinder-wyvern', guard: { creatureTypeId: 'cinder-wyvern', count: 3 } } },
  { hex: at(10, 30), object: { type: 'dwelling', creatureTypeId: 'ash-drake', ownerId: null, spriteId: 'dwelling-ash-drake', guard: { creatureTypeId: 'ash-drake', count: 5 } } },
  { hex: at(1, 30), object: { type: 'dwelling', creatureTypeId: 'salamander', ownerId: null, spriteId: 'dwelling-salamander', guard: { creatureTypeId: 'salamander', count: 8 } } },
  { hex: at(23, 1), object: { type: 'dwelling', creatureTypeId: 'amaterasu', ownerId: null, spriteId: 'dwelling-amaterasu', guard: { creatureTypeId: 'amaterasu', count: 2 } } },
  { hex: at(27, 1), object: { type: 'dwelling', creatureTypeId: 'kitsune', ownerId: null, spriteId: 'dwelling-kitsune', guard: { creatureTypeId: 'kitsune', count: 3 } } },
  { hex: at(31, 1), object: { type: 'dwelling', creatureTypeId: 'orochi', ownerId: null, spriteId: 'dwelling-orochi', guard: { creatureTypeId: 'orochi', count: 4 } } },
  { hex: at(27, 11), object: { type: 'dwelling', creatureTypeId: 'onmyoji', ownerId: null, spriteId: 'dwelling-onmyoji', guard: { creatureTypeId: 'onmyoji', count: 5 } } },
  { hex: at(35, 1), object: { type: 'dwelling', creatureTypeId: 'oni', ownerId: null, spriteId: 'dwelling-oni', guard: { creatureTypeId: 'oni', count: 6 } } },
  { hex: at(6, 29), object: { type: 'dwelling', creatureTypeId: 'tengu', ownerId: null, spriteId: 'dwelling-tengu', guard: { creatureTypeId: 'tengu', count: 8 } } },
  { hex: at(1, 23), object: { type: 'dwelling', creatureTypeId: 'kappa', ownerId: null, spriteId: 'dwelling-kappa', guard: { creatureTypeId: 'kappa', count: 10 } } },
  { hex: at(6, 27), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'peasant', count: 12 } } },
  { hex: at(35, 3), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'pikeman', count: 8 } } },
  { hex: at(13, 13), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'wolf', count: 6 } } },
  { hex: at(28, 17), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'skeleton', count: 8 } } },
  { hex: at(17, 21), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'ogre', count: 6 } } },
  { hex: at(24, 9), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'dragon', count: 3 } } },
  { hex: at(8, 6), object: { type: 'treasure', resource: 'gold', spriteId: 'treasure', amount: 500 } },
  { hex: at(33, 24), object: { type: 'treasure', resource: 'gold', spriteId: 'treasure', amount: 500 } },
  { hex: at(14, 17), object: { type: 'treasure', resource: 'wood', spriteId: 'treasure', amount: 300 } },
  { hex: at(27, 13), object: { type: 'treasure', resource: 'ore', spriteId: 'treasure', amount: 300 } },
  { hex: at(4, 24), object: { type: 'treasure', resource: 'ore', spriteId: 'treasure', amount: 300 } },
  { hex: at(37, 6), object: { type: 'treasure', resource: 'wood', spriteId: 'treasure', amount: 300 } },
  { hex: at(31, 2), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(10, 28), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(24, 27), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'goblin', count: 6 } } },
  { hex: at(17, 3), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'wolf', count: 5 } } },
  { hex: at(8, 18), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'skeleton', count: 6 } } },
  { hex: at(33, 12), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'zombie', count: 5 } } },
  { hex: at(24, 26), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'duwende', count: 6 } } },
  { hex: at(17, 4), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'santilmo', count: 5 } } },
  { hex: at(19, 5), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'spark', count: 6 } } },
  { hex: at(22, 25), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'salamander', count: 5 } } },
  { hex: at(31, 22), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'kappa', count: 6 } } },
  { hex: at(10, 8), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'tengu', count: 5 } } },
  { hex: at(8, 15), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(33, 15), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'pikeman', count: 5 } } },
];

export const MAP_WIDTH_X4 = 60;
export const MAP_HEIGHT_X4 = 44;
export const KEEP_PLAYER_X4 = at(4, 20);
export const KEEP_AI_X4 = at(55, 23);
export const KEEP_AI2_X4 = at(28, 0);
export const KEEP_AI3_X4 = at(28, 43);

export const MAP_OBJECTS_X4 = [
  { hex: at(4, 20), object: { type: 'keep', ownerId: 'player', spriteId: 'keep' } },
  { hex: at(55, 23), object: { type: 'keep', ownerId: 'ai', spriteId: 'keep' } },
  { hex: at(10, 16), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(49, 27), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold' } },
  { hex: at(8, 31), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(51, 12), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(18, 4), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(41, 39), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(14, 39), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(45, 4), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(24, 2), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(35, 41), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(6, 6), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur' } },
  { hex: at(53, 37), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems' } },
  { hex: at(22, 37), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems' } },
  { hex: at(37, 6), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur' } },
  { hex: at(2, 0), object: { type: 'dwelling', creatureTypeId: 'peasant', ownerId: null, spriteId: 'dwelling-peasant', guard: { creatureTypeId: 'peasant', count: 10 } } },
  { hex: at(8, 0), object: { type: 'dwelling', creatureTypeId: 'pikeman', ownerId: null, spriteId: 'dwelling-pikeman', guard: { creatureTypeId: 'pikeman', count: 8 } } },
  { hex: at(14, 0), object: { type: 'dwelling', creatureTypeId: 'archer', ownerId: null, spriteId: 'dwelling-archer', guard: { creatureTypeId: 'archer', count: 6 } } },
  { hex: at(20, 0), object: { type: 'dwelling', creatureTypeId: 'swordsman', ownerId: null, spriteId: 'dwelling-swordsman', guard: { creatureTypeId: 'swordsman', count: 5 } } },
  { hex: at(26, 0), object: { type: 'dwelling', creatureTypeId: 'griffin', ownerId: null, spriteId: 'dwelling-griffin', guard: { creatureTypeId: 'griffin', count: 4 } } },
  { hex: at(2, 8), object: { type: 'dwelling', creatureTypeId: 'cavalier', ownerId: null, spriteId: 'dwelling-cavalier', guard: { creatureTypeId: 'cavalier', count: 3 } } },
  { hex: at(8, 8), object: { type: 'dwelling', creatureTypeId: 'dragon', ownerId: null, spriteId: 'dwelling-dragon', guard: { creatureTypeId: 'dragon', count: 2 } } },
  { hex: at(57, 43), object: { type: 'dwelling', creatureTypeId: 'skeleton', ownerId: null, spriteId: 'dwelling-skeleton', guard: { creatureTypeId: 'skeleton', count: 10 } } },
  { hex: at(51, 43), object: { type: 'dwelling', creatureTypeId: 'zombie', ownerId: null, spriteId: 'dwelling-zombie', guard: { creatureTypeId: 'zombie', count: 8 } } },
  { hex: at(45, 43), object: { type: 'dwelling', creatureTypeId: 'ghost', ownerId: null, spriteId: 'dwelling-ghost', guard: { creatureTypeId: 'ghost', count: 6 } } },
  { hex: at(39, 43), object: { type: 'dwelling', creatureTypeId: 'wraith', ownerId: null, spriteId: 'dwelling-wraith', guard: { creatureTypeId: 'wraith', count: 5 } } },
  { hex: at(33, 43), object: { type: 'dwelling', creatureTypeId: 'vampire', ownerId: null, spriteId: 'dwelling-vampire', guard: { creatureTypeId: 'vampire', count: 4 } } },
  { hex: at(57, 35), object: { type: 'dwelling', creatureTypeId: 'lich', ownerId: null, spriteId: 'dwelling-lich', guard: { creatureTypeId: 'lich', count: 3 } } },
  { hex: at(51, 35), object: { type: 'dwelling', creatureTypeId: 'bone-dragon', ownerId: null, spriteId: 'dwelling-bone-dragon', guard: { creatureTypeId: 'bone-dragon', count: 2 } } },
  { hex: at(14, 8), object: { type: 'dwelling', creatureTypeId: 'goblin', ownerId: null, spriteId: 'dwelling-goblin', guard: { creatureTypeId: 'goblin', count: 10 } } },
  { hex: at(20, 8), object: { type: 'dwelling', creatureTypeId: 'wolf', ownerId: null, spriteId: 'dwelling-wolf', guard: { creatureTypeId: 'wolf', count: 8 } } },
  { hex: at(26, 8), object: { type: 'dwelling', creatureTypeId: 'orc', ownerId: null, spriteId: 'dwelling-orc', guard: { creatureTypeId: 'orc', count: 6 } } },
  { hex: at(2, 16), object: { type: 'dwelling', creatureTypeId: 'orc-chieftain', ownerId: null, spriteId: 'dwelling-orc-chieftain', guard: { creatureTypeId: 'orc-chieftain', count: 5 } } },
  { hex: at(8, 16), object: { type: 'dwelling', creatureTypeId: 'ogre', ownerId: null, spriteId: 'dwelling-ogre', guard: { creatureTypeId: 'ogre', count: 4 } } },
  { hex: at(14, 16), object: { type: 'dwelling', creatureTypeId: 'troll', ownerId: null, spriteId: 'dwelling-troll', guard: { creatureTypeId: 'troll', count: 3 } } },
  { hex: at(20, 16), object: { type: 'dwelling', creatureTypeId: 'behemoth', ownerId: null, spriteId: 'dwelling-behemoth', guard: { creatureTypeId: 'behemoth', count: 2 } } },
  { hex: at(45, 35), object: { type: 'dwelling', creatureTypeId: 'duwende', ownerId: null, spriteId: 'dwelling-duwende', guard: { creatureTypeId: 'duwende', count: 10 } } },
  { hex: at(39, 35), object: { type: 'dwelling', creatureTypeId: 'santilmo', ownerId: null, spriteId: 'dwelling-santilmo', guard: { creatureTypeId: 'santilmo', count: 8 } } },
  { hex: at(33, 35), object: { type: 'dwelling', creatureTypeId: 'manananggal', ownerId: null, spriteId: 'dwelling-manananggal', guard: { creatureTypeId: 'manananggal', count: 6 } } },
  { hex: at(57, 27), object: { type: 'dwelling', creatureTypeId: 'tikbalang', ownerId: null, spriteId: 'dwelling-tikbalang', guard: { creatureTypeId: 'tikbalang', count: 5 } } },
  { hex: at(51, 27), object: { type: 'dwelling', creatureTypeId: 'aswang', ownerId: null, spriteId: 'dwelling-aswang', guard: { creatureTypeId: 'aswang', count: 4 } } },
  { hex: at(45, 27), object: { type: 'dwelling', creatureTypeId: 'kapre', ownerId: null, spriteId: 'dwelling-kapre', guard: { creatureTypeId: 'kapre', count: 3 } } },
  { hex: at(39, 27), object: { type: 'dwelling', creatureTypeId: 'bakunawa', ownerId: null, spriteId: 'dwelling-bakunawa', guard: { creatureTypeId: 'bakunawa', count: 2 } } },
  { hex: at(33, 0), object: { type: 'dwelling', creatureTypeId: 'phoenix', ownerId: null, spriteId: 'dwelling-phoenix', guard: { creatureTypeId: 'phoenix', count: 2 } } },
  { hex: at(39, 0), object: { type: 'dwelling', creatureTypeId: 'sun-priest', ownerId: null, spriteId: 'dwelling-sun-priest', guard: { creatureTypeId: 'sun-priest', count: 4 } } },
  { hex: at(45, 0), object: { type: 'dwelling', creatureTypeId: 'flame-dancer', ownerId: null, spriteId: 'dwelling-flame-dancer', guard: { creatureTypeId: 'flame-dancer', count: 6 } } },
  { hex: at(51, 0), object: { type: 'dwelling', creatureTypeId: 'spark', ownerId: null, spriteId: 'dwelling-spark', guard: { creatureTypeId: 'spark', count: 10 } } },
  { hex: at(26, 43), object: { type: 'dwelling', creatureTypeId: 'cinder-wyvern', ownerId: null, spriteId: 'dwelling-cinder-wyvern', guard: { creatureTypeId: 'cinder-wyvern', count: 3 } } },
  { hex: at(14, 43), object: { type: 'dwelling', creatureTypeId: 'ash-drake', ownerId: null, spriteId: 'dwelling-ash-drake', guard: { creatureTypeId: 'ash-drake', count: 5 } } },
  { hex: at(2, 43), object: { type: 'dwelling', creatureTypeId: 'salamander', ownerId: null, spriteId: 'dwelling-salamander', guard: { creatureTypeId: 'salamander', count: 8 } } },
  { hex: at(33, 2), object: { type: 'dwelling', creatureTypeId: 'amaterasu', ownerId: null, spriteId: 'dwelling-amaterasu', guard: { creatureTypeId: 'amaterasu', count: 2 } } },
  { hex: at(39, 2), object: { type: 'dwelling', creatureTypeId: 'kitsune', ownerId: null, spriteId: 'dwelling-kitsune', guard: { creatureTypeId: 'kitsune', count: 3 } } },
  { hex: at(45, 2), object: { type: 'dwelling', creatureTypeId: 'orochi', ownerId: null, spriteId: 'dwelling-orochi', guard: { creatureTypeId: 'orochi', count: 4 } } },
  { hex: at(39, 16), object: { type: 'dwelling', creatureTypeId: 'onmyoji', ownerId: null, spriteId: 'dwelling-onmyoji', guard: { creatureTypeId: 'onmyoji', count: 5 } } },
  { hex: at(51, 2), object: { type: 'dwelling', creatureTypeId: 'oni', ownerId: null, spriteId: 'dwelling-oni', guard: { creatureTypeId: 'oni', count: 6 } } },
  { hex: at(8, 41), object: { type: 'dwelling', creatureTypeId: 'tengu', ownerId: null, spriteId: 'dwelling-tengu', guard: { creatureTypeId: 'tengu', count: 8 } } },
  { hex: at(2, 33), object: { type: 'dwelling', creatureTypeId: 'kappa', ownerId: null, spriteId: 'dwelling-kappa', guard: { creatureTypeId: 'kappa', count: 10 } } },
  { hex: at(8, 39), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'peasant', count: 12 } } },
  { hex: at(51, 4), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'pikeman', count: 8 } } },
  { hex: at(18, 18), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'wolf', count: 6 } } },
  { hex: at(41, 25), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'skeleton', count: 8 } } },
  { hex: at(24, 31), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'ogre', count: 6 } } },
  { hex: at(35, 12), object: { type: 'monster', spriteId: 'monster', guard: { creatureTypeId: 'dragon', count: 3 } } },
  { hex: at(12, 8), object: { type: 'treasure', resource: 'gold', spriteId: 'treasure', amount: 500 } },
  { hex: at(47, 35), object: { type: 'treasure', resource: 'gold', spriteId: 'treasure', amount: 500 } },
  { hex: at(20, 25), object: { type: 'treasure', resource: 'wood', spriteId: 'treasure', amount: 300 } },
  { hex: at(39, 18), object: { type: 'treasure', resource: 'ore', spriteId: 'treasure', amount: 300 } },
  { hex: at(6, 35), object: { type: 'treasure', resource: 'ore', spriteId: 'treasure', amount: 300 } },
  { hex: at(53, 8), object: { type: 'treasure', resource: 'wood', spriteId: 'treasure', amount: 300 } },
  { hex: at(36, 34), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(23, 9), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(26, 23), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'goblin', count: 6 } } },
  { hex: at(33, 20), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'wolf', count: 5 } } },
  { hex: at(14, 21), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'skeleton', count: 6 } } },
  { hex: at(45, 22), object: { type: 'mine', resource: 'gold', ownerId: null, spriteId: 'mine-gold', guard: { creatureTypeId: 'zombie', count: 5 } } },
  { hex: at(39, 40), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'duwende', count: 6 } } },
  { hex: at(20, 3), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'santilmo', count: 5 } } },
  { hex: at(45, 7), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'spark', count: 6 } } },
  { hex: at(14, 36), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'salamander', count: 5 } } },
  { hex: at(19, 12), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'kappa', count: 6 } } },
  { hex: at(40, 31), object: { type: 'mine', resource: 'wood', ownerId: null, spriteId: 'mine-wood', guard: { creatureTypeId: 'tengu', count: 5 } } },
  { hex: at(14, 27), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(45, 16), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(15, 5), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'goblin', count: 6 } } },
  { hex: at(44, 38), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'wolf', count: 5 } } },
  { hex: at(52, 39), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'skeleton', count: 6 } } },
  { hex: at(7, 4), object: { type: 'mine', resource: 'ore', ownerId: null, spriteId: 'mine-ore', guard: { creatureTypeId: 'zombie', count: 5 } } },
  { hex: at(31, 31), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'duwende', count: 6 } } },
  { hex: at(28, 12), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'santilmo', count: 5 } } },
  { hex: at(31, 5), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'spark', count: 6 } } },
  { hex: at(28, 38), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'salamander', count: 5 } } },
  { hex: at(11, 13), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'kappa', count: 6 } } },
  { hex: at(48, 30), object: { type: 'mine', resource: 'crystal', ownerId: null, spriteId: 'mine-crystal', guard: { creatureTypeId: 'tengu', count: 5 } } },
  { hex: at(24, 42), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(35, 1), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(4, 1), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'goblin', count: 6 } } },
  { hex: at(55, 42), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'wolf', count: 5 } } },
  { hex: at(9, 25), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'skeleton', count: 6 } } },
  { hex: at(50, 18), object: { type: 'mine', resource: 'mercury', ownerId: null, spriteId: 'mine-mercury', guard: { creatureTypeId: 'zombie', count: 5 } } },
  { hex: at(49, 8), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'duwende', count: 6 } } },
  { hex: at(10, 35), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'santilmo', count: 5 } } },
  { hex: at(54, 32), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'spark', count: 6 } } },
  { hex: at(5, 11), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'salamander', count: 5 } } },
  { hex: at(23, 4), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'kappa', count: 6 } } },
  { hex: at(36, 39), object: { type: 'mine', resource: 'sulfur', ownerId: null, spriteId: 'mine-sulfur', guard: { creatureTypeId: 'tengu', count: 5 } } },
  { hex: at(44, 29), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'peasant', count: 6 } } },
  { hex: at(15, 14), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'pikeman', count: 5 } } },
  { hex: at(33, 1), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'goblin', count: 6 } } },
  { hex: at(26, 42), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'wolf', count: 5 } } },
  { hex: at(20, 40), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'skeleton', count: 6 } } },
  { hex: at(39, 3), object: { type: 'mine', resource: 'gems', ownerId: null, spriteId: 'mine-gems', guard: { creatureTypeId: 'zombie', count: 5 } } },
];

// Looked up by map-size id ('x1' | 'x2' | 'x4', default 'x1') — adventure.js's
// createAdventure reads this instead of importing the raw exports above
// directly, so picking a size is a single lookup rather than scattering
// conditionals through the engine.
export function getMapLayout(sizeId) {
  if (sizeId === 'x2') {
    return { width: MAP_WIDTH_X2, height: MAP_HEIGHT_X2, objects: MAP_OBJECTS_X2, keepPlayer: KEEP_PLAYER_X2, keepAi: KEEP_AI_X2, keepAi2: KEEP_AI2_X2, keepAi3: KEEP_AI3_X2 };
  }
  if (sizeId === 'x4') {
    return { width: MAP_WIDTH_X4, height: MAP_HEIGHT_X4, objects: MAP_OBJECTS_X4, keepPlayer: KEEP_PLAYER_X4, keepAi: KEEP_AI_X4, keepAi2: KEEP_AI2_X4, keepAi3: KEEP_AI3_X4 };
  }
  return { width: MAP_WIDTH, height: MAP_HEIGHT, objects: MAP_OBJECTS, keepPlayer: KEEP_PLAYER, keepAi: KEEP_AI, keepAi2: KEEP_AI2, keepAi3: KEEP_AI3 };
}
