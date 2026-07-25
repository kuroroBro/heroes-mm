import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key } from '../js/hexgrid.js';
import {
  aiSelectTarget, aiChooseBattleMove, aiChooseBattleAttack, chooseAiCastleActions, chooseAiSpell,
  chooseAiCatapultTarget,
} from '../js/ai.js';
import { createBattle, moveStack, getStack, SIEGE_WALL_COLUMN } from '../js/battle.js';
import { initCastle, unlock } from '../js/castle.js';
import { emptyResourcePool } from '../js/resources.js';

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

function castleFixture(resources) {
  return {
    heroes: {
      ai: { resources: { ...emptyResourcePool(), ...resources }, army: [], castle: initCastle(), spellbook: new Set() },
    },
  };
}

test('chooseAiCastleActions builds the cheapest affordable not-yet-unlocked tier, at most one per day', () => {
  // Affords peasant (200 wood), pikeman (400 wood + 200 ore), and archer
  // (800 wood + 400 ore) all at once — only the lowest tier should build.
  const state = castleFixture({ wood: 5000, ore: 5000 });
  chooseAiCastleActions(state, 'ai');
  const hero = state.heroes.ai;
  assert.equal(hero.castle.unlocked.size, 1);
  assert.ok(hero.castle.unlocked.has('peasant'));
});

test('chooseAiCastleActions recruits greedily, lowest tier first, from its pool', () => {
  const state = castleFixture({ gold: 10000 });
  const hero = state.heroes.ai;
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 10;
  unlock(hero, 'pikeman');
  hero.castle.pool.pikeman = 10;
  chooseAiCastleActions(state, 'ai');
  assert.ok(hero.army.some((s) => s.creatureTypeId === 'peasant' && s.count === 10));
  assert.ok(hero.army.some((s) => s.creatureTypeId === 'pikeman' && s.count === 10));
});

test('chooseAiCastleActions is a no-op with no resources and nothing unlocked', () => {
  const state = castleFixture({});
  chooseAiCastleActions(state, 'ai');
  const hero = state.heroes.ai;
  assert.equal(hero.castle.unlocked.size, 0);
  assert.equal(hero.army.length, 0);
});

test('chooseAiCastleActions also learns the cheapest affordable not-yet-known spell', () => {
  const state = castleFixture({ gold: 100000, crystal: 100 });
  chooseAiCastleActions(state, 'ai');
  assert.ok(state.heroes.ai.spellbook.has('magicArrow'));
});

// ---------------------------------------------------------------------
// Siege targeting
// ---------------------------------------------------------------------

test('aiSelectTarget raids the enemy Keep when nothing free/winnable exists', () => {
  const keepHex = { q: 3, r: 0 };
  const enemyAwayPos = { q: 20, r: 20 };
  const state = adventureFixture({
    army: [{ creatureTypeId: 'dragon', count: 5 }],
    enemyPos: enemyAwayPos,
    hexes: [[keepHex, { type: 'keep', ownerId: 'player' }]],
  });
  const target = aiSelectTarget(state, 'ai');
  assert.deepEqual(target, keepHex);
});

test('aiSelectTarget still raids an away enemy Keep even with a very weak army — it has no defense to weigh', () => {
  const keepHex = { q: 3, r: 0 };
  const enemyAwayPos = { q: 20, r: 20 };
  const state = adventureFixture({
    army: [{ creatureTypeId: 'peasant', count: 1 }],
    enemyPos: enemyAwayPos,
    hexes: [[keepHex, { type: 'keep', ownerId: 'player' }]],
  });
  const target = aiSelectTarget(state, 'ai');
  assert.deepEqual(target, keepHex);
});

// ---------------------------------------------------------------------
// Battle spellcasting
// ---------------------------------------------------------------------

test('chooseAiSpell casts Fireball when 2+ enemy stacks are alive and it is known+affordable', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'peasant', count: 5 }, { creatureTypeId: 'ogre', count: 1 }],
    { attack: 0, defense: 0, mana: 50, spellsKnown: ['fireball', 'magicArrow'] },
    { attack: 0, defense: 0 },
  );
  assert.deepEqual(chooseAiSpell(state, 'attacker'), { spellId: 'fireball' });
});

test('chooseAiSpell casts Magic Arrow on the weakest enemy with only one enemy stack alive', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0, mana: 50, spellsKnown: ['magicArrow'] },
    { attack: 0, defense: 0 },
  );
  const defender = state.stacks.find((s) => s.side === 'defender');
  assert.deepEqual(chooseAiSpell(state, 'attacker'), { spellId: 'magicArrow', targetId: defender.id });
});

test('chooseAiSpell self-buffs when behind on army power and no damage spell is known', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 1 }], // speed 4, wins the tie -> acts first
    [{ creatureTypeId: 'ogre', count: 50 }],   // speed 4, overwhelming power
    { attack: 0, defense: 0, mana: 50, spellsKnown: ['bless'] },
    { attack: 0, defense: 0 },
  );
  assert.deepEqual(chooseAiSpell(state, 'attacker'), { spellId: 'bless' });
});

test('chooseAiSpell returns null when nothing is known or affordable', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0, mana: 0, spellsKnown: [] },
    { attack: 0, defense: 0 },
  );
  assert.equal(chooseAiSpell(state, 'attacker'), null);
});

// ---------------------------------------------------------------------
// Siege battlefield: AI wall passability & catapult targeting
// ---------------------------------------------------------------------

function siegeBattle() {
  return createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'ogre', count: 1 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
    undefined, { isSiege: true },
  );
}

test('aiChooseBattleMove never returns a standing wall hex, even when it is the straight-line direction to the enemy', () => {
  const state = siegeBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  attacker.position = { q: SIEGE_WALL_COLUMN - 1, r: 0 }; // adjacent to a wall hex
  defender.position = { q: SIEGE_WALL_COLUMN + 1, r: 0 }; // straight line crosses that wall hex
  const decision = aiChooseBattleMove(state, attacker.id);
  assert.ok(decision); // still makes progress, just not through the wall
  assert.notDeepEqual(decision.targetHex, { q: SIEGE_WALL_COLUMN, r: 0 });
});

test('chooseAiCatapultTarget targets the standing wall hex with the least remaining HP', () => {
  const state = siegeBattle();
  const weakHex = { q: SIEGE_WALL_COLUMN, r: 0 };
  state.walls.set(key(weakHex), 5); // every other wall hex is still at full WALL_HP
  const target = chooseAiCatapultTarget(state, 'attacker');
  assert.deepEqual(target, weakHex);
});

test('chooseAiCatapultTarget returns null for the defender side and for a non-siege battle', () => {
  const siege = siegeBattle();
  assert.equal(chooseAiCatapultTarget(siege, 'defender'), null);

  const openField = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'ogre', count: 1 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  assert.equal(chooseAiCatapultTarget(openField, 'attacker'), null);
});

test('chooseAiCatapultTarget returns null once every wall hex is destroyed', () => {
  const state = siegeBattle();
  state.walls.clear();
  assert.equal(chooseAiCatapultTarget(state, 'attacker'), null);
});
