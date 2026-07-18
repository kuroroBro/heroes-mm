// Pure hex-grid math shared by the adventure map and the tactical
// battlefield (plan.md Decision #1) — no DOM, no game rules. Uses axial
// coordinates {q, r} internally; pixel conversion is flat-top hex layout.

const DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export function key(hex) {
  return `${hex.q},${hex.r}`;
}

export function equals(a, b) {
  return a.q === b.q && a.r === b.r;
}

export function neighbors(hex) {
  return DIRECTIONS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

export function distance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// Every hex within `range` steps of `center` (including center itself).
export function hexesInRange(center, range) {
  const results = [];
  for (let dq = -range; dq <= range; dq++) {
    const rMin = Math.max(-range, -dq - range);
    const rMax = Math.min(range, -dq + range);
    for (let dr = rMin; dr <= rMax; dr++) {
      results.push({ q: center.q + dq, r: center.r + dr });
    }
  }
  return results;
}

// Dijkstra with uniform per-hex cost of 1 (every passable hex costs one
// movement point to enter). `isPassable(hex)` may reject occupied hexes;
// the goal hex itself is only reachable if isPassable(goal) is true.
// Returns { path: HexCoord[] (start..goal inclusive), cost } or null if
// unreachable within maxCost.
export function findPath(start, goal, isPassable, maxCost) {
  if (equals(start, goal)) return { path: [start], cost: 0 };

  const costSoFar = new Map([[key(start), 0]]);
  const cameFrom = new Map();
  const frontier = [start];

  while (frontier.length > 0) {
    frontier.sort((a, b) => costSoFar.get(key(a)) - costSoFar.get(key(b)));
    const current = frontier.shift();
    const currentCost = costSoFar.get(key(current));
    if (equals(current, goal)) break;
    if (currentCost >= maxCost) continue;

    for (const next of neighbors(current)) {
      const nextKey = key(next);
      if (!isPassable(next)) continue;
      const newCost = currentCost + 1;
      if (newCost > maxCost) continue;
      if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
        costSoFar.set(nextKey, newCost);
        cameFrom.set(nextKey, current);
        frontier.push(next);
      }
    }
  }

  const goalKey = key(goal);
  if (!costSoFar.has(goalKey)) return null;

  const path = [goal];
  let cur = goal;
  while (!equals(cur, start)) {
    cur = cameFrom.get(key(cur));
    path.unshift(cur);
  }
  return { path, cost: costSoFar.get(goalKey) };
}

// All hexes reachable from `start` within `maxCost`, respecting
// isPassable (start itself is always included regardless of passability).
export function reachable(start, isPassable, maxCost) {
  const costSoFar = new Map([[key(start), 0]]);
  const frontier = [start];

  while (frontier.length > 0) {
    const current = frontier.shift();
    const currentCost = costSoFar.get(key(current));
    if (currentCost >= maxCost) continue;

    for (const next of neighbors(current)) {
      if (!isPassable(next)) continue;
      const nextKey = key(next);
      const newCost = currentCost + 1;
      if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
        costSoFar.set(nextKey, newCost);
        frontier.push(next);
      }
    }
  }

  return [...costSoFar.keys()].map((k) => {
    const [q, r] = k.split(',').map(Number);
    return { q, r };
  });
}

// Flat-top hex axial -> pixel center, for a hex of the given `size`
// (center-to-corner radius).
export function axialToPixel(hex, size) {
  const x = size * (1.5 * hex.q);
  const y = size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

// A rectangular hex map's valid coordinate set, "offset" columns layout:
// column = q, row depends on q's parity so the map reads as a clean
// width x height rectangle on screen. Used by content/adventure map
// generation to enumerate all in-bounds hexes.
export function rectHexes(width, height) {
  const hexes = [];
  for (let col = 0; col < width; col++) {
    const qOffset = Math.floor(col / 2);
    for (let row = 0; row < height; row++) {
      hexes.push({ q: col, r: row - qOffset });
    }
  }
  return hexes;
}

export function inRect(hex, width, height) {
  const col = hex.q;
  if (col < 0 || col >= width) return false;
  const qOffset = Math.floor(col / 2);
  const row = hex.r + qOffset;
  return row >= 0 && row < height;
}
