import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyResourcePool } from '../js/resources.js';
import {
  initCastle, isUnlocked, unlock, accrueGrowth, canAffordBuild, buildDwelling,
  maxRecruitable, canAffordRecruit, recruitCreatures, BUILD_COST, RECRUIT_COST,
  knowsSpell, canAffordLearnSpell, learnSpell,
} from '../js/castle.js';
import { SPELLS } from '../js/spells.js';

function freshHero(overrides = {}) {
  return {
    resources: emptyResourcePool(),
    army: [],
    castle: initCastle(),
    spellbook: new Set(),
    ...overrides,
  };
}

test('a fresh hero has nothing unlocked', () => {
  const hero = freshHero();
  assert.equal(isUnlocked(hero, 'peasant'), false);
});

test('unlock is idempotent and initializes the pool at 0', () => {
  const hero = freshHero();
  unlock(hero, 'peasant');
  unlock(hero, 'peasant');
  assert.equal(isUnlocked(hero, 'peasant'), true);
  assert.equal(hero.castle.pool.peasant, 0);
});

test('accrueGrowth only grows unlocked tiers, capped at growthPerDay * 10', () => {
  const hero = freshHero();
  unlock(hero, 'peasant'); // growthPerDay 8
  for (let i = 0; i < 20; i++) accrueGrowth(hero);
  assert.equal(hero.castle.pool.peasant, 80); // 8 * 10 cap
  assert.equal(hero.castle.pool.dragon, undefined); // never unlocked, never grows
});

test('canAffordBuild is false once already unlocked, even with resources to spare', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), wood: 10000, ore: 10000 } });
  unlock(hero, 'peasant');
  assert.equal(canAffordBuild(hero, 'peasant'), false);
});

test('canAffordBuild is false when short on any required resource', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), wood: BUILD_COST.peasant.wood - 1 } });
  assert.equal(canAffordBuild(hero, 'peasant'), false);
});

test('buildDwelling deducts the full cost and unlocks the tier', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), wood: 500 } });
  const state = { heroes: { player: hero } };
  const ok = buildDwelling(state, 'player', 'peasant');
  assert.ok(ok);
  assert.equal(hero.resources.wood, 500 - BUILD_COST.peasant.wood);
  assert.equal(isUnlocked(hero, 'peasant'), true);
});

test('buildDwelling fails outright and changes nothing when unaffordable', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), wood: 1 } });
  const state = { heroes: { player: hero } };
  const ok = buildDwelling(state, 'player', 'peasant');
  assert.equal(ok, false);
  assert.equal(hero.resources.wood, 1);
  assert.equal(isUnlocked(hero, 'peasant'), false);
});

test('maxRecruitable is 0 when not unlocked, even with pool-like resources', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: 100000 } });
  assert.equal(maxRecruitable(hero, 'peasant'), 0);
});

test('maxRecruitable clamps to the smallest of pool, resources, and army room', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: RECRUIT_COST.peasant.gold * 3 } });
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 5; // pool is the binding constraint (< resource-affordable 3? no: gold affords 3, pool 5 -> min is 3)
  assert.equal(maxRecruitable(hero, 'peasant'), 3);
});

test('maxRecruitable is 0 when the army has no room (no matching stack, no free slot)', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: 100000 } });
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 10;
  hero.army = [
    { creatureTypeId: 'pikeman', count: 1 }, { creatureTypeId: 'archer', count: 1 },
    { creatureTypeId: 'wolf', count: 1 }, { creatureTypeId: 'orc', count: 1 },
    { creatureTypeId: 'griffin', count: 1 }, { creatureTypeId: 'ogre', count: 1 },
    { creatureTypeId: 'skeleton', count: 1 }, // 7 slots, all full, none match 'peasant'
  ];
  assert.equal(maxRecruitable(hero, 'peasant'), 0);
});

test('maxRecruitable is unbounded by army room when a matching stack already exists', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: RECRUIT_COST.peasant.gold * 100 } });
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 50;
  hero.army = [
    { creatureTypeId: 'peasant', count: 3 }, { creatureTypeId: 'pikeman', count: 1 },
    { creatureTypeId: 'archer', count: 1 }, { creatureTypeId: 'wolf', count: 1 },
    { creatureTypeId: 'orc', count: 1 }, { creatureTypeId: 'griffin', count: 1 },
    { creatureTypeId: 'ogre', count: 1 }, // full 7 slots, but one already matches
  ];
  assert.equal(maxRecruitable(hero, 'peasant'), 50);
});

test('recruitCreatures is all-or-nothing: rejects a count above what is affordable', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: RECRUIT_COST.peasant.gold } });
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 5;
  const state = { heroes: { player: hero } };
  const ok = recruitCreatures(state, 'player', 'peasant', 2); // can only afford 1
  assert.equal(ok, false);
  assert.equal(hero.resources.gold, RECRUIT_COST.peasant.gold);
  assert.equal(hero.castle.pool.peasant, 5);
  assert.equal(hero.army.length, 0);
});

test('recruitCreatures deducts resources, drains the pool, and merges into the army', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: RECRUIT_COST.peasant.gold * 4 } });
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 4;
  const state = { heroes: { player: hero } };
  const ok = recruitCreatures(state, 'player', 'peasant', 3);
  assert.ok(ok);
  assert.equal(hero.resources.gold, RECRUIT_COST.peasant.gold);
  assert.equal(hero.castle.pool.peasant, 1);
  assert.deepEqual(hero.army, [{ creatureTypeId: 'peasant', count: 3 }]);
});

test('recruitCreatures merges into an existing matching stack rather than a new one', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: RECRUIT_COST.peasant.gold * 10 } });
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 10;
  hero.army = [{ creatureTypeId: 'peasant', count: 5 }];
  const state = { heroes: { player: hero } };
  recruitCreatures(state, 'player', 'peasant', 2);
  assert.equal(hero.army.length, 1);
  assert.equal(hero.army[0].count, 7);
});

test('canAffordRecruit rejects a zero or negative count', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: 100000 } });
  unlock(hero, 'peasant');
  hero.castle.pool.peasant = 10;
  assert.equal(canAffordRecruit(hero, 'peasant', 0), false);
});

// ---------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------

test('a fresh hero knows no spells', () => {
  const hero = freshHero();
  assert.equal(knowsSpell(hero, 'magicArrow'), false);
});

test('canAffordLearnSpell is false once already known, even with resources to spare', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: 100000, crystal: 100 } });
  hero.spellbook.add('magicArrow');
  assert.equal(canAffordLearnSpell(hero, 'magicArrow'), false);
});

test('canAffordLearnSpell is false when short on any required resource', () => {
  const spell = SPELLS.find((s) => s.id === 'magicArrow');
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: spell.learnCost.gold } }); // no crystal
  assert.equal(canAffordLearnSpell(hero, 'magicArrow'), false);
});

test('learnSpell deducts the full cost and adds the spell to the spellbook', () => {
  const spell = SPELLS.find((s) => s.id === 'magicArrow');
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: 1000, crystal: 10 } });
  const state = { heroes: { player: hero } };
  const ok = learnSpell(state, 'player', 'magicArrow');
  assert.ok(ok);
  assert.equal(hero.resources.gold, 1000 - spell.learnCost.gold);
  assert.equal(hero.resources.crystal, 10 - spell.learnCost.crystal);
  assert.ok(knowsSpell(hero, 'magicArrow'));
});

test('learnSpell fails outright and changes nothing when unaffordable', () => {
  const hero = freshHero({ resources: { ...emptyResourcePool(), gold: 1 } });
  const state = { heroes: { player: hero } };
  const ok = learnSpell(state, 'player', 'magicArrow');
  assert.equal(ok, false);
  assert.equal(hero.resources.gold, 1);
  assert.equal(knowsSpell(hero, 'magicArrow'), false);
});

