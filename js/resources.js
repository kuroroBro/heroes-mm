// Content: the 7 classic resources and their mine daily yields. Originally
// lifted straight from HoMM3's own mine economy (2/day wood+ore, 1/day for
// the rest), but HoMM3 games routinely run 100+ turns — at that pace
// against this map's exactly one wood/ore mine total (not per hero), v1's
// 30-day limit made early Castle-building costs (BUILD_COST below) take
// longer to afford than the entire game lasts. Wood/ore bumped 5x so a
// single captured mine can actually fund a dwelling within the 30 days;
// the already-scarcer crystal/mercury/sulfur/gems (gating tiers 5-10,
// where gold — abundant via KEEP_GOLD_YIELD and the 1000/day gold mines —
// is the main cost) were already proportionate and are unchanged.
export const RESOURCES = ['gold', 'wood', 'ore', 'crystal', 'mercury', 'sulfur', 'gems'];

export const MINE_YIELD = {
  gold: 1000,
  wood: 10,
  ore: 10,
  crystal: 1,
  mercury: 1,
  sulfur: 1,
  gems: 1,
};

// Baseline gold a hero's own Keep produces every day just for being
// owned, same as HoMM3's Town Hall — on top of, not instead of, any gold
// mines actually captured.
export const KEEP_GOLD_YIELD = 500;

export function emptyResourcePool() {
  const pool = {};
  for (const r of RESOURCES) pool[r] = 0;
  return pool;
}
