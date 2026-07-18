import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  key, equals, neighbors, distance, hexesInRange, findPath, reachable,
  axialToPixel, rectHexes, inRect,
} from '../js/hexgrid.js';

test('key/equals round-trip', () => {
  assert.equal(key({ q: 2, r: -3 }), '2,-3');
  assert.ok(equals({ q: 1, r: 1 }, { q: 1, r: 1 }));
  assert.ok(!equals({ q: 1, r: 1 }, { q: 1, r: 2 }));
});

test('neighbors returns 6 distinct adjacent hexes', () => {
  const n = neighbors({ q: 0, r: 0 });
  assert.equal(n.length, 6);
  const keys = new Set(n.map(key));
  assert.equal(keys.size, 6);
  for (const hex of n) assert.equal(distance({ q: 0, r: 0 }, hex), 1);
});

test('distance is symmetric and zero for the same hex', () => {
  const a = { q: 3, r: -1 };
  const b = { q: -2, r: 4 };
  assert.equal(distance(a, a), 0);
  assert.equal(distance(a, b), distance(b, a));
  assert.equal(distance({ q: 0, r: 0 }, { q: 2, r: 0 }), 2);
  assert.equal(distance({ q: 0, r: 0 }, { q: 2, r: -2 }), 2);
});

test('hexesInRange(center, 1) is center plus its 6 neighbors', () => {
  const hexes = hexesInRange({ q: 0, r: 0 }, 1);
  assert.equal(hexes.length, 7);
  assert.ok(hexes.some((h) => equals(h, { q: 0, r: 0 })));
});

test('hexesInRange(center, 2) has 19 hexes (1 + 6 + 12)', () => {
  assert.equal(hexesInRange({ q: 0, r: 0 }, 2).length, 19);
});

test('findPath finds the shortest path on an open grid', () => {
  const start = { q: 0, r: 0 };
  const goal = { q: 3, r: 0 };
  const result = findPath(start, goal, () => true, 10);
  assert.ok(result);
  assert.equal(result.cost, 3);
  assert.equal(result.path.length, 4);
  assert.ok(equals(result.path[0], start));
  assert.ok(equals(result.path[result.path.length - 1], goal));
});

test('findPath returns null when the goal is unreachable within maxCost', () => {
  const result = findPath({ q: 0, r: 0 }, { q: 5, r: 0 }, () => true, 3);
  assert.equal(result, null);
});

test('findPath returns null when the goal hex itself is not passable', () => {
  const blocked = new Set([key({ q: 2, r: 0 })]);
  const result = findPath({ q: 0, r: 0 }, { q: 2, r: 0 }, (h) => !blocked.has(key(h)), 10);
  assert.equal(result, null);
});

test('findPath routes around a blocked hex', () => {
  // Block the direct hex between start and goal; path must detour.
  const blocked = new Set([key({ q: 1, r: 0 })]);
  const isPassable = (h) => !blocked.has(key(h));
  const result = findPath({ q: 0, r: 0 }, { q: 2, r: 0 }, isPassable, 10);
  assert.ok(result);
  assert.ok(result.cost > 2); // longer than the direct 2-hex route
  for (const hex of result.path) assert.ok(isPassable(hex));
});

test('findPath start === goal costs 0', () => {
  const result = findPath({ q: 1, r: 1 }, { q: 1, r: 1 }, () => true, 5);
  assert.deepEqual(result, { path: [{ q: 1, r: 1 }], cost: 0 });
});

test('reachable includes start and respects maxCost/passability', () => {
  const hexes = reachable({ q: 0, r: 0 }, () => true, 1);
  assert.equal(hexes.length, 7); // center + 6 neighbors
  assert.ok(hexes.some((h) => equals(h, { q: 0, r: 0 })));
});

test('reachable never includes hexes blocked by isPassable', () => {
  const blocked = new Set([key({ q: 1, r: 0 })]);
  const hexes = reachable({ q: 0, r: 0 }, (h) => !blocked.has(key(h)), 3);
  assert.ok(!hexes.some((h) => equals(h, { q: 1, r: 0 })));
});

test('axialToPixel is deterministic and origin maps to (0,0)', () => {
  assert.deepEqual(axialToPixel({ q: 0, r: 0 }, 10), { x: 0, y: 0 });
  const p1 = axialToPixel({ q: 2, r: 1 }, 10);
  const p2 = axialToPixel({ q: 2, r: 1 }, 10);
  assert.deepEqual(p1, p2);
});

test('rectHexes produces width*height hexes, all inRect', () => {
  const hexes = rectHexes(5, 4);
  assert.equal(hexes.length, 20);
  for (const hex of hexes) assert.ok(inRect(hex, 5, 4));
});

test('inRect rejects hexes outside the rectangle', () => {
  assert.ok(!inRect({ q: -1, r: 0 }, 5, 4));
  assert.ok(!inRect({ q: 5, r: 0 }, 5, 4));
  assert.ok(!inRect({ q: 0, r: 99 }, 5, 4));
});
