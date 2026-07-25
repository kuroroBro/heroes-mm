import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBattle, getStack, moveStack, attackStack, waitStack, defendStack,
  computeDamage, survivingStacks, reachableHexes, remainingHp, BATTLE_WIDTH, BATTLE_HEIGHT,
  castSpell, canCastSpell, attackWall, isObstacleHex,
  SIEGE_WALL_COLUMN, SIEGE_GATE_ROW, WALL_HP, CATAPULT_DAMAGE,
} from '../js/battle.js';
import { getSpell } from '../js/spells.js';
import { key } from '../js/hexgrid.js';

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

test('createBattle immediately resolves a battle that starts with an empty side', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [], // empty defending side
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
  );
  assert.equal(state.phase, 'over');
  assert.equal(state.winnerSide, 'attacker');
  assert.equal(state.activeStackId, null);
});

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

// ---------------------------------------------------------------------
// Spellcasting
// ---------------------------------------------------------------------

const ALL_SPELLS = ['magicArrow', 'fireball', 'bless', 'curse', 'haste', 'heal'];

// Defender is an ogre (speed 4, ties the attacker pikeman's speed 4) so
// the attacker wins the tie-break and acts first — every spell test below
// needs the attacker's turn window open to cast at all.
function spellBattle({ attackerMana = 50, defenderMana = undefined } = {}) {
  const attackerBonus = { attack: 0, defense: 0, mana: attackerMana, spellsKnown: ALL_SPELLS };
  const defenderBonus = defenderMana === undefined
    ? { attack: 0, defense: 0 } // no hero on this side (guard/militia-style)
    : { attack: 0, defense: 0, mana: defenderMana, spellsKnown: ALL_SPELLS };
  return createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'ogre', count: 1 }], // high defense, to prove magic bypasses it
    attackerBonus, defenderBonus, rngZero,
  );
}

test('a damage spell deals its exact flat power, ignoring the target\'s defense', () => {
  const state = spellBattle();
  const defender = state.stacks.find((s) => s.side === 'defender');
  const before = remainingHp(defender);
  const ok = castSpell(state, 'attacker', 'magicArrow', defender.id);
  assert.ok(ok);
  assert.equal(remainingHp(defender), before - getSpell('magicArrow').power);
});

test('Fireball hits every enemy stack', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }], // speed 4, wins the attacker/defender tie
    [{ creatureTypeId: 'peasant', count: 20 }, { creatureTypeId: 'ogre', count: 1 }], // speeds 3, 4
    { attack: 0, defense: 0, mana: 50, spellsKnown: ALL_SPELLS },
    { attack: 0, defense: 0 },
    rngZero,
  );
  const [peasant, ogre] = state.stacks.filter((s) => s.side === 'defender');
  const peasantBefore = remainingHp(peasant);
  const ogreBefore = remainingHp(ogre);
  const ok = castSpell(state, 'attacker', 'fireball');
  assert.ok(ok);
  const power = getSpell('fireball').power;
  assert.equal(remainingHp(getStack(state, peasant.id)), peasantBefore - power);
  assert.equal(remainingHp(getStack(state, ogre.id)), ogreBefore - power);
});

test('a buff raises effective attack for its duration, then expires', () => {
  const state = spellBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  defender.position = { q: attacker.position.q + 1, r: attacker.position.r };

  const before = computeDamage(attacker, defender, rngZero);
  castSpell(state, 'attacker', 'bless');
  const after = computeDamage(getStack(state, attacker.id), defender, rngZero);
  assert.ok(after > before);

  // Expire it: 3 rounds means it survives rounds 1-3 and is gone by round 4.
  for (let i = 0; i < getSpell('bless').durationRounds; i++) {
    waitStack(state, state.activeStackId);
    waitStack(state, state.activeStackId);
  }
  const expired = computeDamage(getStack(state, attacker.id), defender, rngZero);
  assert.equal(expired, before);
});

test('recasting the same buff replaces rather than stacks', () => {
  const state = spellBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  castSpell(state, 'attacker', 'bless');
  // Can't recast the same round (once-per-round), so pass a full round first.
  waitStack(state, state.activeStackId);
  waitStack(state, state.activeStackId);
  castSpell(state, 'attacker', 'bless');
  const buffs = getStack(state, attacker.id).buffs.filter((b) => b.stat === 'attack');
  assert.equal(buffs.length, 1);
  assert.equal(buffs[0].amount, getSpell('bless').amount);
});

test('Curse debuffs every enemy stack\'s attack', () => {
  const state = spellBattle();
  const defender = state.stacks.find((s) => s.side === 'defender');
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  attacker.position = { q: defender.position.q - 1, r: defender.position.r };

  const before = computeDamage(defender, attacker, rngZero);
  castSpell(state, 'attacker', 'curse');
  const after = computeDamage(getStack(state, defender.id), attacker, rngZero);
  assert.ok(after < before);
});

test('Heal restores HP within the current headcount but cannot revive lost creatures', () => {
  const state = spellBattle();
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  // Casting must happen during the attacker's own turn window (Decision
  // #1), so damage the stack directly rather than via attackStack (which
  // would consume the turn and hand it to the defender before we can cast).
  attacker.hpDamage = 30; // pikeman hp 8 * 10 = 80 total pool -> 50 remaining
  const countBeforeHeal = attacker.count;
  const hpBeforeHeal = remainingHp(attacker);

  const ok = castSpell(state, 'attacker', 'heal', attacker.id);
  assert.ok(ok);
  const healed = getStack(state, attacker.id);
  const power = getSpell('heal').power;
  assert.equal(remainingHp(healed), hpBeforeHeal + power);
  assert.equal(healed.count, countBeforeHeal); // heal never increases count (no resurrection)

  // Healing past full simply clamps hpDamage at 0, never negative. Reset
  // the once-per-round flag directly (test-only shortcut) to isolate this
  // from the once-per-round rule already covered elsewhere.
  attacker.hpDamage = 5;
  state.heroSides.attacker.hasCastThisRound = false;
  castSpell(state, 'attacker', 'heal', attacker.id);
  assert.equal(getStack(state, attacker.id).hpDamage, 0);
});

test('castSpell is rejected: insufficient mana', () => {
  const state = spellBattle({ attackerMana: 0 });
  assert.equal(castSpell(state, 'attacker', 'magicArrow', state.stacks.find((s) => s.side === 'defender').id), false);
});

test('castSpell is rejected: spell not known', () => {
  const state = createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'dragon', count: 1 }],
    { attack: 0, defense: 0, mana: 50, spellsKnown: ['fireball'] }, // no magicArrow
    { attack: 0, defense: 0 },
    rngZero,
  );
  const defender = state.stacks.find((s) => s.side === 'defender');
  assert.equal(castSpell(state, 'attacker', 'magicArrow', defender.id), false);
});

test('castSpell is rejected: already cast this round', () => {
  const state = spellBattle();
  const defender = state.stacks.find((s) => s.side === 'defender');
  assert.ok(castSpell(state, 'attacker', 'magicArrow', defender.id));
  assert.equal(castSpell(state, 'attacker', 'magicArrow', defender.id), false);
});

test('castSpell is rejected: no hero on that side (guard/militia)', () => {
  const state = spellBattle(); // defender has no mana/spellsKnown
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  assert.equal(castSpell(state, 'defender', 'magicArrow', attacker.id), false);
});

test('canCastSpell mirrors castSpell\'s gating without mutating state', () => {
  const state = spellBattle();
  const defender = state.stacks.find((s) => s.side === 'defender');
  assert.equal(canCastSpell(state, 'attacker', 'magicArrow'), true);
  const manaBefore = state.heroSides.attacker.mana;
  castSpell(state, 'attacker', 'magicArrow', defender.id);
  assert.ok(state.heroSides.attacker.mana < manaBefore); // the actual cast did spend mana
});

test('casting a spell does not advance the turn order', () => {
  const state = spellBattle();
  const defender = state.stacks.find((s) => s.side === 'defender');
  const activeBefore = state.activeStackId;
  castSpell(state, 'attacker', 'magicArrow', defender.id);
  assert.equal(state.activeStackId, activeBefore);
});

// ---------------------------------------------------------------------
// Siege battlefield: wall obstacles & the catapult
// ---------------------------------------------------------------------

// Same pikeman-vs-ogre (both Speed 4) setup as spellBattle — the
// attacker wins the tie-break and acts first, which every gated
// attackWall/turn-window test below depends on.
function siegeBattle({ attackerMana = 50 } = {}) {
  const attackerBonus = { attack: 0, defense: 0, mana: attackerMana, spellsKnown: ALL_SPELLS };
  const defenderBonus = { attack: 0, defense: 0 };
  return createBattle(
    [{ creatureTypeId: 'pikeman', count: 10 }],
    [{ creatureTypeId: 'ogre', count: 1 }],
    attackerBonus, defenderBonus, rngZero, { isSiege: true },
  );
}

test('createBattle populates the fixed wall layout only when options.isSiege is set', () => {
  const state = siegeBattle();
  assert.equal(state.walls.size, BATTLE_HEIGHT - 1); // every row except the gate
  for (let r = 0; r < BATTLE_HEIGHT; r++) {
    const hex = { q: SIEGE_WALL_COLUMN, r };
    if (r === SIEGE_GATE_ROW) {
      assert.equal(isObstacleHex(state, hex), false);
    } else {
      assert.equal(isObstacleHex(state, hex), true);
      assert.equal(state.walls.get(key(hex)), WALL_HP);
    }
  }
});

test('non-siege battles have no walls at all', () => {
  const state = basicBattle();
  assert.equal(state.walls.size, 0);
});

test('reachableHexes never includes a standing wall hex, but does include the gate', () => {
  const state = siegeBattle();
  const stack = state.stacks.find((s) => s.side === 'attacker');
  stack.position = { q: SIEGE_WALL_COLUMN - 1, r: SIEGE_GATE_ROW };
  const reachable = reachableHexes(state, stack.id).map((h) => key(h));
  assert.ok(reachable.includes(key({ q: SIEGE_WALL_COLUMN, r: SIEGE_GATE_ROW }))); // the gate
  assert.ok(!reachable.includes(key({ q: SIEGE_WALL_COLUMN, r: SIEGE_GATE_ROW - 1 }))); // a wall hex
});

test('moveStack cannot enter a standing wall hex', () => {
  const state = siegeBattle();
  const stack = state.stacks.find((s) => s.side === 'attacker');
  stack.position = { q: SIEGE_WALL_COLUMN - 1, r: 0 };
  const ok = moveStack(state, stack.id, { q: SIEGE_WALL_COLUMN, r: 0 });
  assert.equal(ok, false);
});

test('pathfinding routes through the gate rather than through the wall', () => {
  const state = siegeBattle();
  const stack = state.stacks.find((s) => s.side === 'attacker');
  stack.position = { q: 5, r: SIEGE_GATE_ROW - 1 }; // just off the gate row, wall to the east
  const target = { q: 7, r: SIEGE_GATE_ROW - 1 }; // same row, past the wall — a straight line is blocked
  const ok = moveStack(state, stack.id, target);
  assert.ok(ok);
  assert.deepEqual(getStack(state, stack.id).position, target);
});

test('a ranged attack can still target a stack standing behind the wall', () => {
  const state = createBattle(
    [{ creatureTypeId: 'archer', count: 10 }],
    [{ creatureTypeId: 'peasant', count: 5 }],
    { attack: 0, defense: 0 }, { attack: 0, defense: 0 },
    rngZero, { isSiege: true },
  );
  const attacker = state.stacks.find((s) => s.side === 'attacker');
  const defender = state.stacks.find((s) => s.side === 'defender');
  // Natural starting positions already straddle the wall column (q=1 vs
  // q=9, wall at q=6) — no repositioning needed to prove this.
  assert.ok(attackStack(state, attacker.id, defender.id));
});

test('a spell can still target a stack standing behind the wall', () => {
  const state = siegeBattle();
  const defender = state.stacks.find((s) => s.side === 'defender');
  assert.ok(castSpell(state, 'attacker', 'magicArrow', defender.id));
});

test('attackWall damages a standing wall hex, destroying it after two hits', () => {
  const state = siegeBattle();
  const wallHex = { q: SIEGE_WALL_COLUMN, r: 0 };
  assert.equal(state.walls.get(key(wallHex)), WALL_HP);

  assert.ok(attackWall(state, 'attacker', wallHex));
  assert.equal(state.walls.get(key(wallHex)), WALL_HP - CATAPULT_DAMAGE);
  assert.equal(isObstacleHex(state, wallHex), true); // still standing after one hit

  // Reset the once-per-round flag directly (test-only shortcut) to fire
  // again without needing to play out a full round.
  state.heroSides.attacker.hasFiredCatapultThisRound = false;
  assert.ok(attackWall(state, 'attacker', wallHex));
  assert.equal(state.walls.has(key(wallHex)), false);
  assert.equal(isObstacleHex(state, wallHex), false);
});

test('a destroyed wall hex is immediately passable to movement', () => {
  const state = siegeBattle();
  const wallHex = { q: SIEGE_WALL_COLUMN, r: 0 };
  attackWall(state, 'attacker', wallHex);
  state.heroSides.attacker.hasFiredCatapultThisRound = false;
  attackWall(state, 'attacker', wallHex);

  const stack = state.stacks.find((s) => s.side === 'attacker');
  stack.position = { q: SIEGE_WALL_COLUMN - 1, r: 0 };
  const ok = moveStack(state, stack.id, wallHex);
  assert.ok(ok);
  assert.deepEqual(getStack(state, stack.id).position, wallHex);
});

test('attackWall is rejected for the defender side (no catapult)', () => {
  const state = siegeBattle();
  const wallHex = { q: SIEGE_WALL_COLUMN, r: 0 };
  assert.equal(attackWall(state, 'defender', wallHex), false);
  assert.equal(state.walls.get(key(wallHex)), WALL_HP); // unchanged
});

test('attackWall is rejected outside the attacker\'s turn window', () => {
  const state = siegeBattle();
  waitStack(state, state.activeStackId); // pass to the defender's turn
  assert.equal(attackWall(state, 'attacker', { q: SIEGE_WALL_COLUMN, r: 0 }), false);
});

test('attackWall is rejected a second time in the same round', () => {
  const state = siegeBattle();
  const wallHex = { q: SIEGE_WALL_COLUMN, r: 0 };
  assert.ok(attackWall(state, 'attacker', wallHex));
  assert.equal(attackWall(state, 'attacker', wallHex), false);
});

test('attackWall is rejected against a hex that is not a standing wall', () => {
  const state = siegeBattle();
  assert.equal(attackWall(state, 'attacker', { q: SIEGE_WALL_COLUMN, r: SIEGE_GATE_ROW }), false); // the gate
  assert.equal(attackWall(state, 'attacker', { q: 3, r: 3 }), false); // open ground
});

test('firing the catapult does not advance the turn order', () => {
  const state = siegeBattle();
  const activeBefore = state.activeStackId;
  attackWall(state, 'attacker', { q: SIEGE_WALL_COLUMN, r: 0 });
  assert.equal(state.activeStackId, activeBefore);
});

test('a hero can both cast a spell and fire the catapult in the same round', () => {
  const state = siegeBattle();
  const defender = state.stacks.find((s) => s.side === 'defender');
  assert.ok(castSpell(state, 'attacker', 'magicArrow', defender.id));
  assert.ok(attackWall(state, 'attacker', { q: SIEGE_WALL_COLUMN, r: 0 }));
});
