// Content: the 7 classic resources and their mine daily yields (plan.md
// "Content values" — baseline lifted from HoMM3's own mine economy).

export const RESOURCES = ['gold', 'wood', 'ore', 'crystal', 'mercury', 'sulfur', 'gems'];

export const MINE_YIELD = {
  gold: 1000,
  wood: 2,
  ore: 2,
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
