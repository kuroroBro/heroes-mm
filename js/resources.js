// Content: the 7 classic resources and their mine daily yields. Originally
// lifted straight from HoMM3's own mine economy (2/day wood+ore, 1/day for
// the rest), but HoMM3 games routinely run 100+ turns — at that pace
// against this map's exactly one mine of each non-gold resource (not per
// hero), v1's 30-day limit made Castle-building costs (BUILD_COST below)
// take longer to afford than the entire game lasts. Every non-gold yield
// has since been scaled up off that original baseline (wood/ore 5x to
// match BUILD_COST's biggest sinks, then every non-gold resource — wood/
// ore included — 2x more on top of that) so a single captured mine funds
// a dwelling well inside the 30 days, with real time left to use it.
export const RESOURCES = ['gold', 'wood', 'ore', 'crystal', 'mercury', 'sulfur', 'gems'];

export const MINE_YIELD = {
  gold: 1000,
  wood: 20,
  ore: 20,
  crystal: 2,
  mercury: 2,
  sulfur: 2,
  gems: 2,
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
