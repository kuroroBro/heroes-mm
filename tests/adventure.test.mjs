import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key } from '../js/hexgrid.js';
import {
  createAdventure, moveHero, endDay, kingdomScore, getPendingBattleArmies,
  resolveBattleOutcome, planMoveTowards, MOVEMENT_PER_DAY, DAY_LIMIT,
  MANA_MAX, HOME_TURF_DEFENSE_BONUS, SIEGE_LOOT_FRACTION, isSiegeBattle,
} from '../js/adventure.js';
import { KEEP_PLAYER, KEEP_AI } from '../js/mapObjects.js';
import { unlock, learnSpell, recruitCreatures, maxRecruitable } from '../js/castle.js';

function freshState() {
  return createAdventure('human', 'orc');
}

test('createAdventure places heroes at their home keeps with starting armies', () => {
  const state = freshState();
  assert.deepEqual(state.heroes.player.position, KEEP_PLAYER);
  assert.deepEqual(state.heroes.ai.position, KEEP_AI);
  assert.equal(state.heroes.player.movementLeft, MOVEMENT_PER_DAY);
  assert.ok(state.heroes.player.army.length > 0);
  assert.ok(state.heroes.ai.army.length > 0);
  assert.equal(state.day, 1);
  assert.equal(state.dayLimit, DAY_LIMIT);
  assert.equal(state.phase, 'playing');
});

test('moveHero onto an adjacent empty hex succeeds and spends movement', () => {
  const state = freshState();
  const start = state.heroes.player.position;
  const target = { q: start.q, r: start.r + 1 };
  const ok = moveHero(state, 'player', target);
  assert.ok(ok);
  assert.deepEqual(state.heroes.player.position, target);
  assert.equal(state.heroes.player.movementLeft, MOVEMENT_PER_DAY - 1);
});

test('moveHero fails when target is out of movement range', () => {
  const state = freshState();
  state.heroes.player.movementLeft = 1;
  const start = state.heroes.player.position;
  const farTarget = { q: start.q + 5, r: start.r };
  const ok = moveHero(state, 'player', farTarget);
  assert.equal(ok, false);
  assert.deepEqual(state.heroes.player.position, start);
});

test('moveHero fails outside playing phase', () => {
  const state = freshState();
  state.phase = 'battle';
  const start = state.heroes.player.position;
  const ok = moveHero(state, 'player', { q: start.q, r: start.r + 1 });
  assert.equal(ok, false);
});

test('moving onto an unguarded mine captures it immediately, no battle', () => {
  const state = freshState();
  // Sulfur mine at (4,9 offset) is unguarded per mapObjects.js.
  let sulfurHex = null;
  for (const [k, obj] of state.hexes) {
    if (obj.type === 'mine' && obj.resource === 'sulfur') {
      const [q, r] = k.split(',').map(Number);
      sulfurHex = { q, r };
    }
  }
  assert.ok(sulfurHex, 'fixture expects a sulfur mine on the map');
  state.heroes.player.position = sulfurHex;
  state.heroes.player.movementLeft = MOVEMENT_PER_DAY;
  const neighborTarget = { q: sulfurHex.q, r: sulfurHex.r }; // re-enter own hex trivially not useful; instead capture via direct assign
  // Directly verify capture logic by moving from an adjacent hex onto it.
  const adjacent = { q: sulfurHex.q - 1, r: sulfurHex.r };
  state.heroes.player.position = adjacent;
  const ok = moveHero(state, 'player', sulfurHex);
  assert.ok(ok);
  assert.equal(state.phase, 'playing');
  const captured = state.hexes.get(key(sulfurHex));
  assert.equal(captured.ownerId, 'player');
});

test('moving onto a guarded mine starts a battle instead of capturing', () => {
  const state = freshState();
  let woodHex = null;
  for (const [k, obj] of state.hexes) {
    if (obj.type === 'mine' && obj.resource === 'wood') {
      const [q, r] = k.split(',').map(Number);
      woodHex = { q, r };
    }
  }
  assert.ok(woodHex);
  const adjacent = { q: woodHex.q - 1, r: woodHex.r };
  state.heroes.player.position = adjacent;
  const beforePos = { ...state.heroes.player.position };
  const ok = moveHero(state, 'player', woodHex);
  assert.ok(ok);
  assert.equal(state.phase, 'battle');
  assert.equal(state.pendingBattle.defenderKind, 'guard');
  // Hero should NOT have relocated onto the guarded hex yet.
  assert.deepEqual(state.heroes.player.position, beforePos);
});

test('moving onto the enemy hero hex starts a hero-vs-hero battle', () => {
  const state = freshState();
  const aiPos = state.heroes.ai.position;
  const adjacent = { q: aiPos.q - 1, r: aiPos.r };
  state.heroes.player.position = adjacent;
  const ok = moveHero(state, 'player', aiPos);
  assert.ok(ok);
  assert.equal(state.phase, 'battle');
  assert.equal(state.pendingBattle.defenderKind, 'hero');
  assert.equal(state.pendingBattle.defenderOwner, 'ai');
});

test('getPendingBattleArmies exposes both sides with hero stat bonuses', () => {
  const state = freshState();
  const aiPos = state.heroes.ai.position;
  state.heroes.player.position = { q: aiPos.q - 1, r: aiPos.r };
  moveHero(state, 'player', aiPos);
  const armies = getPendingBattleArmies(state);
  assert.ok(armies.attackerArmy.length > 0);
  assert.ok(armies.defenderArmy.length > 0);
  assert.equal(armies.attackerBonus.attack, state.heroes.player.attack);
  assert.equal(armies.defenderBonus.attack, state.heroes.ai.attack);
});

test('resolveBattleOutcome: attacker defeats a neutral guard, captures the mine, gains XP', () => {
  const state = freshState();
  let oreHex = null;
  for (const [k, obj] of state.hexes) {
    if (obj.type === 'mine' && obj.resource === 'ore') {
      const [q, r] = k.split(',').map(Number);
      oreHex = { q, r };
    }
  }
  state.heroes.player.position = { q: oreHex.q - 1, r: oreHex.r };
  moveHero(state, 'player', oreHex);
  assert.equal(state.phase, 'battle');

  const survivors = [{ creatureTypeId: 'pikeman', count: 8 }];
  resolveBattleOutcome(state, 'attacker', survivors);

  assert.equal(state.phase, 'playing');
  assert.equal(state.pendingBattle, null);
  const mine = state.hexes.get(key(oreHex));
  assert.equal(mine.ownerId, 'player');
  assert.equal(mine.guard, null);
  assert.deepEqual(state.heroes.player.position, oreHex);
  assert.ok(state.heroes.player.xp > 0);
});

test('resolveBattleOutcome: capturing a dwelling unlocks its creature type in the Castle (no instant army merge)', () => {
  const state = freshState();
  let archerDwellingHex = null;
  for (const [k, obj] of state.hexes) {
    if (obj.type === 'dwelling' && obj.creatureTypeId === 'archer') {
      const [q, r] = k.split(',').map(Number);
      archerDwellingHex = { q, r };
    }
  }
  assert.ok(archerDwellingHex, 'fixture expects an archer dwelling on the map');
  state.heroes.player.position = { q: archerDwellingHex.q - 1, r: archerDwellingHex.r };
  moveHero(state, 'player', archerDwellingHex);
  assert.equal(state.phase, 'battle');

  resolveBattleOutcome(state, 'attacker', [{ creatureTypeId: 'pikeman', count: 8 }]);

  const dwelling = state.hexes.get(key(archerDwellingHex));
  assert.equal(dwelling.ownerId, 'player');
  assert.equal(state.heroes.player.castle.unlocked.has('archer'), true);
  assert.equal(state.heroes.player.castle.pool.archer, 0); // unlocked, not instantly granted
});

test('a dwelling changing hands never touches the previous owner\'s already-recruited army or pool', () => {
  const state = freshState();
  let archerDwellingHex = null;
  for (const [k, obj] of state.hexes) {
    if (obj.type === 'dwelling' && obj.creatureTypeId === 'archer') {
      const [q, r] = k.split(',').map(Number);
      archerDwellingHex = { q, r };
    }
  }
  assert.ok(archerDwellingHex, 'fixture expects an archer dwelling on the map');

  // Player clears the guard, captures the dwelling, and actually recruits
  // into their real field army (not just unlocking it).
  state.heroes.player.position = { q: archerDwellingHex.q - 1, r: archerDwellingHex.r };
  moveHero(state, 'player', archerDwellingHex);
  resolveBattleOutcome(state, 'attacker', [{ creatureTypeId: 'pikeman', count: 8 }]);
  state.heroes.player.resources.gold = 100000;
  state.heroes.player.castle.pool.archer = 8;
  recruitCreatures(state, 'player', 'archer', maxRecruitable(state.heroes.player, 'archer'));
  const playerArmyBefore = JSON.parse(JSON.stringify(state.heroes.player.army));
  assert.ok(playerArmyBefore.some((s) => s.creatureTypeId === 'archer' && s.count > 0));

  // Player's hero moves on, away from the dwelling — otherwise the AI
  // "capturing" it below would actually be a hero-vs-hero collision, not
  // a dwelling recapture.
  state.heroes.player.position = KEEP_PLAYER;

  // Later, the AI's hero walks onto that same now-unguarded dwelling and
  // claims it for itself — a legitimate, separate claim (contested map
  // economy), not something that should reach back into what the player
  // already recruited.
  const dwelling = state.hexes.get(key(archerDwellingHex));
  dwelling.guard = null;
  state.heroes.ai.position = { q: archerDwellingHex.q + 1, r: archerDwellingHex.r };
  state.heroes.ai.movementLeft = MOVEMENT_PER_DAY;
  const moved = moveHero(state, 'ai', archerDwellingHex);

  assert.ok(moved);
  assert.equal(dwelling.ownerId, 'ai');
  assert.equal(state.heroes.ai.castle.unlocked.has('archer'), true); // AI gets its own fresh claim
  assert.equal(state.heroes.ai.castle.pool.archer, 0); // starts at 0, not inherited from the player
  assert.deepEqual(state.heroes.player.army, playerArmyBefore); // untouched
});

test('resolveBattleOutcome: attacker loses to a neutral guard, respawns at home keep', () => {
  const state = freshState();
  let oreHex = null;
  for (const [k, obj] of state.hexes) {
    if (obj.type === 'mine' && obj.resource === 'ore') {
      const [q, r] = k.split(',').map(Number);
      oreHex = { q, r };
    }
  }
  state.heroes.player.position = { q: oreHex.q - 1, r: oreHex.r };
  moveHero(state, 'player', oreHex);

  const guardSurvivors = [{ creatureTypeId: 'peasant', count: 2 }];
  resolveBattleOutcome(state, 'defender', guardSurvivors);

  assert.equal(state.phase, 'playing');
  assert.deepEqual(state.heroes.player.position, KEEP_PLAYER);
  assert.equal(state.heroes.player.movementLeft, 0);
  assert.ok(state.heroes.player.army.length > 0); // fresh starting army restored
  const mine = state.hexes.get(key(oreHex));
  assert.equal(mine.ownerId, null); // never captured
  assert.equal(mine.guard.count, 2); // guard took losses but survives
});

test('resolveBattleOutcome: hero-vs-hero battle ends the game immediately', () => {
  const state = freshState();
  const aiPos = state.heroes.ai.position;
  state.heroes.player.position = { q: aiPos.q - 1, r: aiPos.r };
  moveHero(state, 'player', aiPos);

  resolveBattleOutcome(state, 'attacker', [{ creatureTypeId: 'pikeman', count: 4 }]);

  assert.equal(state.phase, 'gameover');
  assert.equal(state.winner, 'player');
  assert.equal(state.winReason, 'combat');
});

test('endDay refills movement and pays out owned mine income', () => {
  const state = freshState();
  let goldHex = null;
  for (const [k, obj] of state.hexes) {
    if (goldHex) break;
    if (obj.type === 'mine' && obj.resource === 'gold') {
      const [q, r] = k.split(',').map(Number);
      goldHex = { q, r };
      obj.ownerId = 'player';
    }
  }
  state.heroes.player.movementLeft = 0;
  unlock(state.heroes.player, 'peasant');
  const before = state.heroes.player.resources.gold;
  endDay(state);
  assert.equal(state.heroes.player.movementLeft, MOVEMENT_PER_DAY);
  // Mine income (1000) plus the player's own Keep's baseline income (500).
  assert.equal(state.heroes.player.resources.gold, before + 1000 + 500);
  assert.equal(state.heroes.player.castle.pool.peasant, 8); // growthPerDay accrues via endDay too
  assert.equal(state.day, 2);
});

test('endDay pays out baseline Keep gold income for both heroes, mine or no mine', () => {
  const state = freshState();
  const playerBefore = state.heroes.player.resources.gold;
  const aiBefore = state.heroes.ai.resources.gold;
  endDay(state);
  assert.equal(state.heroes.player.resources.gold, playerBefore + 500);
  assert.equal(state.heroes.ai.resources.gold, aiBefore + 500);
});

test('endDay refuses to run mid-battle', () => {
  const state = freshState();
  state.phase = 'battle';
  const ok = endDay(state);
  assert.equal(ok, false);
});

test('kingdomScore counts owned mines, dwellings, and army value', () => {
  const state = freshState();
  const score = kingdomScore(state, 'player');
  assert.ok(score > 0); // starting army alone contributes score
});

test('kingdomScore awards 15 points per unique unlocked creature type', () => {
  const state = freshState();
  const before = kingdomScore(state, 'player');
  unlock(state.heroes.player, 'dragon');
  assert.equal(kingdomScore(state, 'player') - before, 15);
  unlock(state.heroes.player, 'dragon'); // idempotent — no double count
  assert.equal(kingdomScore(state, 'player') - before, 15);
});

test('planMoveTowards returns the farthest reachable hex when the target is beyond today\'s movement', () => {
  const state = freshState();
  const start = state.heroes.player.position;
  const farTarget = state.heroes.ai.position; // opposite corner of the map, in-bounds
  const step = planMoveTowards(state, 'player', farTarget);
  assert.ok(step);
  assert.notDeepEqual(step, start);
  assert.notDeepEqual(step, farTarget); // too far to arrive in one day
});

test('planMoveTowards returns the target itself when it is within today\'s movement', () => {
  const state = freshState();
  const start = state.heroes.player.position;
  const nearTarget = { q: start.q, r: start.r + 2 };
  const step = planMoveTowards(state, 'player', nearTarget);
  assert.deepEqual(step, nearTarget);
});

test('planMoveTowards returns null when the hero has no movement left', () => {
  const state = freshState();
  state.heroes.player.movementLeft = 0;
  const step = planMoveTowards(state, 'player', { q: 5, r: 5 });
  assert.equal(step, null);
});

test('day-limit reached ends the game via Kingdom Score', () => {
  const state = freshState();
  state.day = state.dayLimit;
  // Give the player a decisive score advantage.
  for (const obj of state.hexes.values()) {
    if (obj.type === 'mine') obj.ownerId = 'player';
  }
  endDay(state);
  assert.equal(state.phase, 'gameover');
  assert.equal(state.winReason, 'score');
  assert.equal(state.winner, 'player');
});

// ---------------------------------------------------------------------
// Mana
// ---------------------------------------------------------------------

test('a fresh hero starts at 0 mana with manaMax set', () => {
  const state = freshState();
  assert.equal(state.heroes.player.mana, 0);
  assert.equal(state.heroes.player.manaMax, MANA_MAX);
});

test('endDay refills mana to manaMax', () => {
  const state = freshState();
  state.heroes.player.mana = 3;
  endDay(state);
  assert.equal(state.heroes.player.mana, MANA_MAX);
});

test('getPendingBattleArmies exposes the attacking hero\'s mana and known spells', () => {
  const state = freshState();
  state.heroes.player.resources.gold = 100000;
  state.heroes.player.resources.crystal = 100;
  learnSpell(state, 'player', 'magicArrow');
  state.heroes.player.mana = 25;
  const aiPos = state.heroes.ai.position;
  state.heroes.player.position = { q: aiPos.q - 1, r: aiPos.r };
  moveHero(state, 'player', aiPos);
  const armies = getPendingBattleArmies(state);
  assert.equal(armies.attackerBonus.mana, 25);
  assert.deepEqual(armies.attackerBonus.spellsKnown, ['magicArrow']);
});

// ---------------------------------------------------------------------
// Sieges
// ---------------------------------------------------------------------

test('walking onto the enemy Keep with their hero away resolves instantly: loot and move in, no battle', () => {
  const state = freshState();
  state.heroes.ai.resources.gold = 1000;
  state.heroes.ai.resources.wood = 50;
  state.heroes.ai.position = { q: KEEP_AI.q - 3, r: KEEP_AI.r }; // hero is away from home
  state.heroes.player.position = { q: KEEP_AI.q - 1, r: KEEP_AI.r };
  const ok = moveHero(state, 'player', KEEP_AI);
  assert.ok(ok);
  assert.equal(state.phase, 'playing'); // nothing defends an away hero's Keep — no battle
  assert.equal(state.pendingBattle, null);
  assert.deepEqual(state.heroes.player.position, KEEP_AI);
  assert.equal(state.heroes.ai.resources.gold, 1000 - Math.floor(1000 * SIEGE_LOOT_FRACTION));
  assert.equal(state.heroes.player.resources.gold, Math.floor(1000 * SIEGE_LOOT_FRACTION));
  assert.equal(state.heroes.ai.resources.wood, 50 - Math.floor(50 * SIEGE_LOOT_FRACTION));
  const keep = state.hexes.get(key(KEEP_AI));
  assert.equal(keep.ownerId, 'ai'); // never captured, spec.md US-5 Non-goals
});

test('a Castle raid never touches the defender\'s recruit pool — an army travels with its hero, not a garrison', () => {
  const state = freshState();
  unlock(state.heroes.ai, 'dragon');
  state.heroes.ai.castle.pool.dragon = 5;
  state.heroes.ai.position = { q: KEEP_AI.q - 3, r: KEEP_AI.r };
  state.heroes.player.position = { q: KEEP_AI.q - 1, r: KEEP_AI.r };
  moveHero(state, 'player', KEEP_AI);
  assert.equal(state.heroes.ai.castle.pool.dragon, 5);
});

test('walking onto the enemy hero standing on their own Keep is still the hero-vs-hero trigger', () => {
  const state = freshState();
  const aiPos = state.heroes.ai.position; // AI starts at home (KEEP_AI) on day 1
  state.heroes.player.position = { q: aiPos.q - 1, r: aiPos.r };
  const ok = moveHero(state, 'player', aiPos);
  assert.ok(ok);
  assert.equal(state.pendingBattle.defenderKind, 'hero');
});

test('home-turf bonus applies when a hero-vs-hero fight happens at the defender\'s own Keep', () => {
  const state = freshState();
  const aiPos = state.heroes.ai.position; // still home
  state.heroes.player.position = { q: aiPos.q - 1, r: aiPos.r };
  moveHero(state, 'player', aiPos);
  const armies = getPendingBattleArmies(state);
  assert.equal(armies.defenderBonus.defense, state.heroes.ai.defense + HOME_TURF_DEFENSE_BONUS);
});

test('home-turf bonus does not apply when heroes collide away from the Keep', () => {
  const state = freshState();
  const awayPos = { q: KEEP_AI.q - 4, r: KEEP_AI.r };
  state.heroes.ai.position = awayPos;
  state.heroes.player.position = { q: awayPos.q - 1, r: awayPos.r };
  moveHero(state, 'player', awayPos);
  const armies = getPendingBattleArmies(state);
  assert.equal(armies.defenderBonus.defense, state.heroes.ai.defense);
});

test('isSiegeBattle is false after raiding an away hero\'s undefended Keep (no battle ever starts)', () => {
  const state = freshState();
  state.heroes.ai.position = { q: KEEP_AI.q - 3, r: KEEP_AI.r };
  state.heroes.player.position = { q: KEEP_AI.q - 1, r: KEEP_AI.r };
  moveHero(state, 'player', KEEP_AI);
  assert.equal(isSiegeBattle(state), false);
});

test('isSiegeBattle is true for a hero-vs-hero fight at the defender\'s own Keep', () => {
  const state = freshState();
  const aiPos = state.heroes.ai.position; // still home
  state.heroes.player.position = { q: aiPos.q - 1, r: aiPos.r };
  moveHero(state, 'player', aiPos);
  assert.equal(isSiegeBattle(state), true);
});

test('isSiegeBattle is false for a hero-vs-hero fight away from the Keep, and for a plain guard fight', () => {
  const state = freshState();
  const awayPos = { q: KEEP_AI.q - 4, r: KEEP_AI.r };
  state.heroes.ai.position = awayPos;
  state.heroes.player.position = { q: awayPos.q - 1, r: awayPos.r };
  moveHero(state, 'player', awayPos);
  assert.equal(isSiegeBattle(state), false);

  const guardState = freshState();
  let woodHex = null;
  for (const [k, obj] of guardState.hexes) {
    if (obj.type === 'mine' && obj.resource === 'wood') {
      const [q, r] = k.split(',').map(Number);
      woodHex = { q, r };
    }
  }
  guardState.heroes.player.position = { q: woodHex.q - 1, r: woodHex.r };
  moveHero(guardState, 'player', woodHex);
  assert.equal(isSiegeBattle(guardState), false);
});

test('isSiegeBattle is false with no pending battle', () => {
  const state = freshState();
  assert.equal(isSiegeBattle(state), false);
});

test('resolveBattleOutcome syncs remaining battle mana back onto the surviving hero', () => {
  const state = freshState();
  const aiPos = state.heroes.ai.position;
  state.heroes.player.position = { q: aiPos.q - 1, r: aiPos.r };
  state.heroes.player.mana = 40;
  moveHero(state, 'player', aiPos);

  resolveBattleOutcome(state, 'attacker', [{ creatureTypeId: 'pikeman', count: 4 }], { attacker: 12 });
  assert.equal(state.heroes.player.mana, 12);
});

test('resolveBattleOutcome restores full mana when respawning from a lost guard fight', () => {
  const state = freshState();
  let oreHex = null;
  for (const [k, obj] of state.hexes) {
    if (obj.type === 'mine' && obj.resource === 'ore') {
      const [q, r] = k.split(',').map(Number);
      oreHex = { q, r };
    }
  }
  state.heroes.player.position = { q: oreHex.q - 1, r: oreHex.r };
  state.heroes.player.mana = 3;
  moveHero(state, 'player', oreHex);
  resolveBattleOutcome(state, 'defender', [{ creatureTypeId: 'peasant', count: 2 }]);
  assert.equal(state.heroes.player.mana, MANA_MAX);
});
