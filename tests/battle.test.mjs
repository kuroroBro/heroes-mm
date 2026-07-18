import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBattle, getStack, moveStack, attackStack, waitStack, defendStack,
  computeDamage, survivingStacks, reachableHexes, remainingHp, BATTLE_WIDTH,
} from '../js/battle.js';

const rngZero = () => 0;
const rngMax = () => 0.9999;

function basicBattle(rng = rngZero) {
  return createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'peasant', count: 20 }],
    { attack: 0, defense: 0 },
    { attack: 0, defense: 0 },
    rng,
  );
}

test('createBattle places attacker stacks on the left, defender on the right', () => {
  const state = basicBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  assert.equal(attacker.position.q, 1);
  assert.equal(defender.position.q, BATTLE_WIDTH - 2);
});

test('turn order picks the highest-Speed surviving stack; attacker wins ties', () => {
  const state = createBattle(
    [{ creatureTypeId: 'wolf', count: 5 }],   // speed 7
    [{ creatureTypeId: 'griffin', count: 5 }], // speed 9
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  const active = getStack(state, state.activeStackId);
  assert.equal(active.side, 'defender'); // griffin (9) beats wolf (7)
});

test('computeDamage applies the attack/defense skew multiplier deterministically', () => {
  const attacker = { creatureTypeId: 'pikeman', count: 10, heroBonus: { attack: 0, defense: 0 } };
  const defender = { creatureTypeId: 'peasant', count: 5, heroBonus: { attack: 0, defense: 0 }, isDefending: false };
  // pikeman atk3 vs peasant def1: skew=2 -> multiplier 1.10; dmgMin=1 with rng=0 -> base=10
  const damage = computeDamage(attacker, defender, rngZero);
  assert.equal(damage, 11);
});

test('computeDamage never drops below 1', () => {
  const attacker = { creatureTypeId: 'peasant', count: 1, heroBonus: { attack: 0, defense: 0 } };
  const defender = { creatureTypeId: 'dragon', count: 1, heroBonus: { attack: 0, defense: 0 }, isDefending: false };
  const damage = computeDamage(attacker, defender, rngZero);
  assert.ok(damage >= 1);
});

test('moveStack relocates a stack within its Speed range', () => {
  const state = basicBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const target = { q: attacker.position.q + 2, r: attacker.position.r };
  const ok = moveStack(state, attacker.id, target);
  assert.ok(ok);
  assert.deepEqual(getStack(state, attacker.id).position, target);
});

test('moveStack fails onto a hex occupied by another surviving stack', () => {
  const state = basicBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  const ok = moveStack(state, attacker.id, defender.position);
  assert.equal(ok, false);
});

test('reachableHexes never includes an occupied hex', () => {
  const state = basicBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  const hexes = reachableHexes(state, attacker.id);
  assert.ok(!hexes.some((h) => h.q === defender.position.q && h.r === defender.position.r));
});

test('melee attack deals damage, reduces stack count, and triggers one retaliation', () => {
  const state = basicBattle(rngZero);
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  defender.position = { q: attacker.position.q + 1, r: attacker.position.r };

  const beforeAttackerCount = attacker.count;
  const ok = attackStack(state, attacker.id, defender.id);
  assert.ok(ok);

  const updatedDefender = getStack(state, defender.id);
  const updatedAttacker = getStack(state, attacker.id);
  assert.ok(updatedDefender.count < 20); // took casualties
  assert.ok(updatedAttacker.count <= beforeAttackerCount); // took retaliation damage
  assert.equal(updatedDefender.hasRetaliatedThisRound, true);
});

test('ranged attacker does not trigger retaliation even at range', () => {
  const state = createBattle(
    [{ creatureTypeId: 'archer', count: 10 }],
    [{ creatureTypeId: 'peasant', count: 20 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
    rngZero,
  );
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  // Left far apart (default formation) — ranged should still work.
  const beforeAttackerCount = attacker.count;
  attackStack(state, attacker.id, defender.id);
  const updatedAttacker = getStack(state, attacker.id);
  assert.equal(updatedAttacker.count, beforeAttackerCount); // no retaliation damage taken
});

test('melee attack fails when the target is not adjacent', () => {
  const state = basicBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  const ok = attackStack(state, attacker.id, defender.id); // far apart, melee
  assert.equal(ok, false);
});

test('waitStack and defendStack pass the turn to the next stack', () => {
  const state = basicBattle();
  const firstActive = state.activeStackId;
  waitStack(state, firstActive);
  assert.notEqual(state.activeStackId, firstActive);
});

test('defendStack raises effective defense for the next incoming attack', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'pikeman', count: 10 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
    rngZero,
  );
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  defender.position = { q: attacker.position.q + 1, r: attacker.position.r };
  defender.isDefending = true;

  const withDefend = computeDamage(attacker, defender, rngZero);
  defender.isDefending = false;
  const withoutDefend = computeDamage(attacker, defender, rngZero);
  assert.ok(withDefend < withoutDefend);
});

test('battle ends when one side has zero surviving stacks', () => {
  const state = createBattle(
    [{ creatureTypeId: 'dragon', count: 5 }],
    [{ creatureTypeId: 'peasant', count: 3 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
    rngMax,
  );
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  defender.position = { q: attacker.position.q + 1, r: attacker.position.r };

  attackStack(state, attacker.id, defender.id);
  assert.equal(state.phase, 'over');
  assert.equal(state.winnerSide, 'attacker');
});

test('two partial hits accumulate true damage, not phantom HP from count rounding', () => {
  // Ranged attacker (no retaliation) so only the defender's HP pool moves.
  const state = createBattle(
    [{ creatureTypeId: 'archer', count: 5 }],
    [{ creatureTypeId: 'pikeman', count: 10 }], // hp 8 each -> 80 total pool
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
    rngZero,
  );
  const archer = state.stacks.find((s) => s.side === 'attacker');
  const pikeman = state.stacks.find((s) => s.side === 'defender');

  // Hit 1: dmgRoll=2 (rng=0, dmgMin=2) * count 5 = 10 base; skew = atk5-def4
  // = +1 -> x1.05 -> round(10.5) = 11 true damage.
  attackStack(state, archer.id, pikeman.id);
  assert.equal(remainingHp(getStack(state, pikeman.id)), 80 - 11);

  // Let the defender's turn pass with no action, then attack again with
  // the same archer stack for a second identical 11-damage hit.
  waitStack(state, pikeman.id);
  attackStack(state, archer.id, pikeman.id);

  const afterSecondHit = getStack(state, pikeman.id);
  const trueRemaining = 80 - 11 - 11; // 58, tracked independently of rounding
  assert.equal(remainingHp(afterSecondHit), trueRemaining);
  assert.equal(afterSecondHit.count, Math.ceil(trueRemaining / 8));
});

test('survivingStacks returns only alive stacks in {creatureTypeId,count} shape', () => {
  const state = basicBattle();
  const survivors = survivingStacks(state, 'attacker');
  assert.deepEqual(survivors, [{ creatureTypeId: 'pikeman', count: 10 }]);
});

test('actions are rejected once the battle is over', () => {
  const state = createBattle(
    [{ creatureTypeId: 'dragon', count: 5 }],
    [{ creatureTypeId: 'peasant', count: 3 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
    rngMax,
  );
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  defender.position = { q: attacker.position.q + 1, r: attacker.position.r };
  attackStack(state, attacker.id, defender.id);
  assert.equal(state.phase, 'over');

  const ok = waitStack(state, attacker.id);
  assert.equal(ok, false);
});

test('actions are rejected when called for a stack that is not the active one', () => {
  const state = basicBattle();
  const notActive = state.stacks.find((s) => s.id !== state.activeStackId);
  const ok = waitStack(state, notActive.id);
  assert.equal(ok, false);
});
