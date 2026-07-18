import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key } from '../js/hexgrid.js';
import { aiSelectTarget, aiChooseBattleMove, aiChooseBattleAttack } from '../js/ai.js';
import { createBattle, moveStack, getStack } from '../js/battle.js';

function adventureFixture({ heroPos = { q: 0, r: 0 }, army, hexes, enemyPos = { q: 20, r: 20 } }) {
  const hexMap = new Map();
  for (const [hex, obj] of hexes) hexMap.set(key(hex), obj);
  return {
    heroes: {
      ai: { position: heroPos, army: army || [{ creatureTypeId: 'pikeman', count: 10 }] },
      player: { position: enemyPos, army: [{ creatureTypeId: 'pikeman', count: 5 }] },
    },
    hexes: hexMap,
  };
}

test('aiSelectTarget prefers the nearest unguarded capturable object', () => {
  const near = { q: 1, r: 0 };
  const far = { q: 5, r: 0 };
  const state = adventureFixture({
    hexes: [
      [near, { type: 'mine', resource: 'wood', ownerId: null }],
      [far, { type: 'mine', resource: 'ore', ownerId: null }],
    ],
  });
  const target = aiSelectTarget(state, 'ai');
  assert.deepEqual(target, near);
});

test('aiSelectTarget skips objects it already owns', () => {
  const owned = { q: 1, r: 0 };
  const unowned = { q: 3, r: 0 };
  const state = adventureFixture({
    hexes: [
      [owned, { type: 'mine', resource: 'wood', ownerId: 'ai' }],
      [unowned, { type: 'mine', resource: 'ore', ownerId: null }],
    ],
  });
  const target = aiSelectTarget(state, 'ai');
  assert.deepEqual(target, unowned);
});

test('aiSelectTarget picks a winnable guarded target when nothing free is available', () => {
  const weakGuard = { q: 2, r: 0 };
  const state = adventureFixture({
    army: [{ creatureTypeId: 'dragon', count: 10 }], // overwhelming power
    hexes: [
      [weakGuard, { type: 'mine', resource: 'gold', ownerId: null, guard: { creatureTypeId: 'peasant', count: 2 } }],
    ],
  });
  const target = aiSelectTarget(state, 'ai');
  assert.deepEqual(target, weakGuard);
});

test('aiSelectTarget refuses a guarded target it cannot beat', () => {
  const toughGuard = { q: 2, r: 0 };
  const enemyPos = { q: 9, r: 9 };
  const state = adventureFixture({
    army: [{ creatureTypeId: 'peasant', count: 1 }], // very weak
    enemyPos,
    hexes: [
      [toughGuard, { type: 'mine', resource: 'gold', ownerId: null, guard: { creatureTypeId: 'dragon', count: 5 } }],
    ],
  });
  const target = aiSelectTarget(state, 'ai');
  // Nothing free, nothing winnable -> falls back to the enemy hero.
  assert.deepEqual(target, enemyPos);
});

test('aiSelectTarget falls back to the enemy hero position when the map has nothing else', () => {
  const enemyPos = { q: 7, r: 7 };
  const state = adventureFixture({ hexes: [], enemyPos });
  const target = aiSelectTarget(state, 'ai');
  assert.deepEqual(target, enemyPos);
});

test('aiChooseBattleMove returns null for a ranged stack (no need to move to attack)', () => {
  const state = createBattle(
    [{ creatureTypeId: 'archer', count: 5 }],
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  const archer = state.stacks.find((s) => s.side === 'attacker');
  assert.equal(aiChooseBattleMove(state, archer.id), null);
});

test('aiChooseBattleMove returns null when already adjacent to an enemy', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 5 }],
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  const pikeman = state.stacks.find((s) => s.side === 'attacker');
  const peasant = state.stacks.find((s) => s.side === 'defender');
  peasant.position = { q: pikeman.position.q + 1, r: pikeman.position.r };
  assert.equal(aiChooseBattleMove(state, pikeman.id), null);
});

function hexDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

test('aiChooseBattleMove makes guaranteed progress toward a distant enemy (default formation, gap > Speed)', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 5 }], // speed 4
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  const pikeman = state.stacks.find((s) => s.side === 'attacker');
  const peasant = state.stacks.find((s) => s.side === 'defender');
  const startDist = hexDistance(pikeman.position, peasant.position);
  const decision = aiChooseBattleMove(state, pikeman.id);
  assert.ok(decision);
  assert.ok(hexDistance(decision.targetHex, peasant.position) < startDist);
});

test('aiChooseBattleMove reaches an adjacent hex outright when the gap fits within Speed', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 5 }], // speed 4
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  const pikeman = state.stacks.find((s) => s.side === 'attacker');
  const peasant = state.stacks.find((s) => s.side === 'defender');
  // Bring them within Speed range first.
  peasant.position = { q: pikeman.position.q + 3, r: pikeman.position.r };
  const decision = aiChooseBattleMove(state, pikeman.id);
  assert.ok(decision);
  assert.equal(hexDistance(decision.targetHex, peasant.position), 1);
});

test('aiChooseBattleAttack targets the enemy stack with the lowest remaining HP', () => {
  const state = createBattle(
    [{ creatureTypeId: 'archer', count: 5 }],
    [
      { creatureTypeId: 'peasant', count: 10 }, // 10 hp total
      { creatureTypeId: 'pikeman', count: 1 },  // 8 hp total
    ],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  const archer = state.stacks.find((s) => s.side === 'attacker');
  const weakest = state.stacks.find((s) => s.creatureTypeId === 'pikeman');
  const decision = aiChooseBattleAttack(state, archer.id);
  assert.equal(decision.targetId, weakest.id);
});

test('aiChooseBattleAttack returns null for a melee stack with no adjacent enemy', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 5 }],
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  const pikeman = state.stacks.find((s) => s.side === 'attacker');
  assert.equal(aiChooseBattleAttack(state, pikeman.id), null);
});
