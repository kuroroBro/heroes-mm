// Generic content-integrity checks across creatures/factions/castle costs/
// map dwellings/sprites — nothing specific to any one faction. Written
// alongside specs/006-sunborn-faction (the first faction added *after*
// specs/005 established the "N factions x 7 tiers" shape) since no such
// blanket check existed before: every previous content addition only got
// tests for its own specific new mechanics, never a sanity sweep over the
// whole roster. Would have caught, for example, the black-background
// attack-sprite bug from earlier this session automatically.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CREATURES, getCreature } from '../js/creatures.js';
import { FACTIONS, getFaction } from '../js/factions.js';
import { RECRUIT_COST, BUILD_COST } from '../js/castle.js';
import { MAP_OBJECTS, getMapLayout } from '../js/mapObjects.js';
import { spritePath } from '../js/sprites.js';
import { key, inRect } from '../js/hexgrid.js';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');

function resolveSprite(spriteId) {
  return path.join(REPO_ROOT, spritePath(spriteId));
}

test('every faction has exactly 7 creatures, tiers 1-7 with no gaps or dupes', () => {
  for (const faction of FACTIONS) {
    const own = CREATURES.filter((c) => c.factionId === faction.id);
    assert.equal(own.length, 7, `${faction.id} should have 7 creatures`);
    const tiers = own.map((c) => c.tier).sort((a, b) => a - b);
    assert.deepEqual(tiers, [1, 2, 3, 4, 5, 6, 7], `${faction.id} tiers should be exactly 1-7`);
  }
});

test('no duplicate creature ids across factions', () => {
  const ids = CREATURES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every creature has a RECRUIT_COST and BUILD_COST entry', () => {
  for (const creature of CREATURES) {
    assert.ok(RECRUIT_COST[creature.id], `missing RECRUIT_COST for ${creature.id}`);
    assert.ok(BUILD_COST[creature.id], `missing BUILD_COST for ${creature.id}`);
  }
});

test('every creature, hero, and dwelling sprite resolves to a real file on disk (never the fallback)', () => {
  for (const creature of CREATURES) {
    const p = spritePath(creature.spriteId);
    assert.ok(!p.includes('unknown.svg'), `${creature.id}'s spriteId ${creature.spriteId} falls back to unknown.svg`);
    assert.ok(existsSync(resolveSprite(creature.spriteId)), `${creature.id}'s sprite file is missing: ${p}`);

    const attackId = 'attack-' + creature.id;
    const attackPath = spritePath(attackId);
    assert.ok(!attackPath.includes('unknown.svg'), `${creature.id} has no dedicated attack sprite (falls back)`);
    assert.ok(existsSync(resolveSprite(attackId)), `${creature.id}'s attack sprite file is missing: ${attackPath}`);

    const dwellingId = 'dwelling-' + creature.id;
    const dwellingPath = spritePath(dwellingId);
    assert.ok(!dwellingPath.includes('unknown.svg'), `${creature.id} has no dedicated dwelling sprite (falls back)`);
    assert.ok(existsSync(resolveSprite(dwellingId)), `${creature.id}'s dwelling sprite file is missing: ${dwellingPath}`);
  }
  for (const faction of FACTIONS) {
    const p = spritePath(faction.spriteId);
    assert.ok(!p.includes('unknown.svg'), `${faction.id}'s hero spriteId ${faction.spriteId} falls back to unknown.svg`);
    assert.ok(existsSync(resolveSprite(faction.spriteId)), `${faction.id}'s hero sprite file is missing: ${p}`);
  }
});

test('every creature has exactly one map dwelling, and every dwelling points at a real creature', () => {
  const dwellings = MAP_OBJECTS.filter((o) => o.object.type === 'dwelling');
  const dwellingCreatureIds = dwellings.map((d) => d.object.creatureTypeId);
  assert.equal(new Set(dwellingCreatureIds).size, dwellingCreatureIds.length, 'no creature should have two dwellings');
  for (const creature of CREATURES) {
    assert.ok(dwellingCreatureIds.includes(creature.id), `${creature.id} has no map dwelling`);
  }
  for (const id of dwellingCreatureIds) {
    assert.doesNotThrow(() => getCreature(id), `dwelling references unknown creature ${id}`);
  }
});

test('every faction\'s starting army references real creatures it actually owns', () => {
  for (const faction of FACTIONS) {
    for (const stack of faction.startingArmy) {
      const creature = getCreature(stack.creatureTypeId);
      assert.equal(creature.factionId, faction.id, `${faction.id}'s starting army includes ${stack.creatureTypeId}, which belongs to ${creature.factionId}`);
      assert.ok(stack.count > 0);
    }
  }
});

test('getFaction throws for an unknown id, same as getCreature', () => {
  assert.throws(() => getFaction('nonexistent'));
});

// specs/010-map-size: x2/x4 layouts are hand-authored (a rescale + extra
// mines, generated and fairness-checked by a throwaway script — see
// mapObjects.js's own comment), but still deserve the same structural
// sanity sweep every other piece of map content gets.
for (const sizeId of ['x1', 'x2', 'x4']) {
  test(`${sizeId} map layout: every hex is in-bounds and unique, every guard/dwelling references a real creature`, () => {
    const layout = getMapLayout(sizeId);
    const seen = new Set();
    for (const { hex, object } of layout.objects) {
      assert.ok(inRect(hex, layout.width, layout.height), `${sizeId}: hex out of bounds for ${object.type}`);
      const k = key(hex);
      assert.ok(!seen.has(k), `${sizeId}: duplicate hex ${k}`);
      seen.add(k);
      if (object.creatureTypeId) assert.doesNotThrow(() => getCreature(object.creatureTypeId));
      if (object.guard) assert.doesNotThrow(() => getCreature(object.guard.creatureTypeId));
    }
  });
}
