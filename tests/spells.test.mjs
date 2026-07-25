import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPELLS, getSpell } from '../js/spells.js';

const VALID_EFFECTS = new Set(['damage', 'heal', 'buff', 'debuff']);
const VALID_TARGETS = new Set(['singleEnemy', 'allEnemies', 'singleAlly', 'allAllies']);

test('every spell has a valid effect/target shape and a learn cost', () => {
  for (const spell of SPELLS) {
    assert.ok(VALID_EFFECTS.has(spell.effect), `${spell.id} has an invalid effect`);
    assert.ok(VALID_TARGETS.has(spell.target), `${spell.id} has an invalid target`);
    assert.ok(spell.manaCost > 0, `${spell.id} needs a positive manaCost`);
    assert.ok(Object.keys(spell.learnCost).length > 0, `${spell.id} needs a non-empty learnCost`);
    if (spell.effect === 'damage' || spell.effect === 'heal') {
      assert.ok(spell.power > 0, `${spell.id} needs a positive power`);
    }
    if (spell.effect === 'buff' || spell.effect === 'debuff') {
      assert.ok(['attack', 'defense', 'speed'].includes(spell.stat), `${spell.id} needs a valid stat`);
      assert.ok(typeof spell.amount === 'number' && spell.amount !== 0, `${spell.id} needs a non-zero amount`);
      assert.ok(spell.durationRounds > 0, `${spell.id} needs a positive durationRounds`);
    }
  }
});

test('spell ids are unique', () => {
  const ids = SPELLS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('getSpell returns the matching spell and throws for an unknown id', () => {
  assert.equal(getSpell('fireball').name, 'Fireball');
  assert.throws(() => getSpell('nope'));
});
