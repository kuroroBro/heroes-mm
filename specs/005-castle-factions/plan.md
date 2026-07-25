# Implementation Plan: Castle Factions

**Spec**: [spec.md](./spec.md)
**Builds on**: `specs/002-castle-creatures/plan.md` (Castle rules engine,
unchanged and reused here), `specs/001-hex-heroes/plan.md` (hero-type
pattern being replaced, see Decision #1).

## Technical Context

| Aspect | Choice | Why |
| --- | --- | --- |
| Language/framework | Same as ever — vanilla ES2020 modules, no build step | In-place content/data expansion, not a new subsystem. |
| Creature count | 10 → 28 (4 factions × 7 tiers) | Per spec.md FR-1. |
| New/renamed content module | `js/heroTypes.js` → `js/factions.js` | `HeroType` and `Faction` are the same concept now (spec.md US-1) — renaming avoids two parallel data shapes for one idea. |
| Art | 11 new creatures generated via `image-gen`; 7 Enkantos creatures copied directly from `pinoy-board` | Confirmed style-compatible (see Decision #3) — direct reuse, zero generation cost, matching this project's existing hex-texture-reuse precedent. |
| Tests | Existing `tests/ai.test.mjs`/`tests/adventure.test.mjs`/`tests/castle.test.mjs` fixtures using `marshal`/`warlord`/`sentinel` ids need updating to `human`/`orc`/`undead`/`enkantos` | Id rename (Decision #1), not new test infrastructure. |

## Architecture changes

```
js/creatures.js          CHANGED — CREATURES grows 10 -> 28, every entry
                          gains factionId; tier is now per-faction (1-7)
js/factions.js            NEW (replaces js/heroTypes.js) — FACTIONS (was
                          HERO_TYPES), each entry gains `creatures:
                          CreatureTypeId[7]`; getFaction (was
                          getHeroType) keeps the same lookup-by-id shape
js/heroTypes.js           DELETED — superseded by js/factions.js
js/castle.js              CHANGED — BUILD_COST/RECRUIT_COST grow to 28
                          entries; new castleRosterFor(hero) helper
                          (spec.md FR-3)
js/adventure.js           CHANGED — createHero() imports from
                          factions.js instead of heroTypes.js (field
                          names/shape unchanged, just the import + the
                          id space it draws from)
js/ai.js                  CHANGED — chooseAiCastleActions scopes its
                          CREATURES loop to castleRosterFor(hero)
                          (spec.md FR-4) instead of the full list
js/mapObjects.js          CHANGED — dwelling list grows 10 -> 28 entries
                          (spec.md FR-5); map is already 30x22 (this
                          session's earlier map-size change), no further
                          resize needed
js/main.js                CHANGED — setup screen renders faction cards
                          (was hero-type cards) with a roster preview;
                          Castle screen renders castleRosterFor(hero)'s 7
                          rows plus a separate "Other" section for any
                          off-faction unlocks (spec.md FR-3)
images/creatures/*.png    NEW — 11 generated sprites (Human: Swordsman,
                          Cavalier; Orc: Goblin, Orc Chieftain, Behemoth;
                          Undead: Zombie, Ghost, Wraith, Vampire, Lich,
                          Bone Dragon), matching the existing 10's
                          painterly/transparent style
images/creatures/*.png    COPIED (not generated) — 7 Enkantos sprites
                          from pinoy-board's boardSprites/enemy/*.png
                          (Decision #3)
images/creatures/hero-enkantos.svg  NEW — 4th hero map-token sprite
                          (the existing 3 are reused/renamed, see
                          Decision #4)
tests/ai.test.mjs         CHANGED — fixtures using hero-type ids
                          (marshal/warlord/sentinel) move to faction ids;
                          new coverage for castleRosterFor scoping
tests/adventure.test.mjs  CHANGED — same id rename; createAdventure(...)
                          call sites across the whole suite
tests/castle.test.mjs     CHANGED — new coverage for castleRosterFor,
                          BUILD_COST/RECRUIT_COST completeness (all 28
                          keys present)
```

### Decision #1: Faction replaces hero type — one choice, not two

`spec.md`'s clarifying question on this was explicit: **replace** the
hero-type picker with a faction picker, not add a second setup step. This
plan treats `Faction` and `HeroType` as literally the same entity renamed
— `js/heroTypes.js` becomes `js/factions.js`, `HERO_TYPES` becomes
`FACTIONS`, `getHeroType` becomes `getFaction`, and every current
`HeroType` field (`id`, `name`, `attack`, `defense`, `startingArmy`,
`spriteId`) carries over unchanged, plus the new `creatures` array. This
is the minimal-surface-area version of the change: `createHero` in
`adventure.js` still does exactly what it does today (`getHeroType(id)` →
read `attack`/`defense`/`startingArmy`/`spriteId`), just importing from
the renamed module. `hero.heroTypeId` as a field name is kept as-is
(renaming it to `hero.factionId` everywhere it's read — `main.js`'s
game-over screen, the Map Inspector, save data shape — is a larger,
purely-cosmetic diff for zero behavior change; not worth it for this
feature. A future pass can rename it if it starts reading confusingly).

### Decision #2: The full 28-creature roster

Every reused creature keeps its **exact current stats verbatim** (spec.md
Non-goals) — only the 18 new creatures below are newly designed, using
`creaturePower() = attack + defense + hp*0.1` as the same yardstick the
game already uses (`ai.js`, Kingdom Score) to keep each faction's tier 1→7
curve smooth and land every faction's tier-7 capstone in roughly the same
40-55 power range the original Dragon (≈50) already established.

**Human** (Order/chivalry) — reused: Peasant, Pikeman, Archer, Griffin,
Dragon; new: Swordsman, Cavalier. Hero stats: Attack 2 / Defense 2 (exact
reuse of the old Marshal split). Starting army: Pikeman ×10, Archer ×6
(exact reuse of the old Marshal starting army).

| Tier | Creature | ATK | DEF | HP | DMG | SPD | Ranged | Growth/day | Power | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Peasant | 1 | 1 | 1 | 1-1 | 3 | No | 8 | 2.1 | reuse |
| 2 | Pikeman | 3 | 4 | 8 | 1-2 | 4 | No | 6 | 7.8 | reuse |
| 3 | Archer | 5 | 3 | 6 | 2-3 | 4 | Yes | 5 | 8.6 | reuse |
| 4 | Swordsman | 7 | 6 | 10 | 3-5 | 5 | No | 4 | 14.0 | new |
| 5 | Griffin | 9 | 9 | 18 | 3-6 | 9 | No | 3 | 19.8 | reuse |
| 6 | Cavalier | 13 | 11 | 60 | 6-10 | 7 | No | 2 | 30.0 | new |
| 7 | Dragon | 16 | 16 | 180 | 25-50 | 9 | No | 1 | 50.0 | reuse |

**Orc** (Stronghold/horde) — reused: Wolf, Orc, Ogre, Troll; new: Goblin,
Orc Chieftain, Behemoth. Hero stats: Attack 3 / Defense 1 (exact reuse of
the old Warlord split). Starting army: Wolf ×8, Orc ×4 (exact reuse of the
old Warlord starting army).

| Tier | Creature | ATK | DEF | HP | DMG | SPD | Ranged | Growth/day | Power | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Goblin | 2 | 1 | 5 | 1-2 | 4 | No | 9 | 3.5 | new |
| 2 | Wolf | 6 | 3 | 7 | 2-3 | 7 | No | 4 | 9.7 | reuse |
| 3 | Orc | 8 | 6 | 15 | 3-5 | 5 | Yes | 3 | 15.5 | reuse |
| 4 | Orc Chieftain | 9 | 7 | 30 | 4-6 | 5 | No | 3 | 19.0 | new |
| 5 | Ogre | 10 | 8 | 40 | 5-9 | 4 | No | 2 | 22.0 | reuse |
| 6 | Troll | 12 | 10 | 40 | 6-10 | 5 | No | 2 | 26.0 | reuse |
| 7 | Behemoth | 17 | 13 | 150 | 10-16 | 6 | No | 1 | 45.0 | new |

**Undead** (Necropolis) — reused: Skeleton; new: Zombie, Ghost, Wraith,
Vampire, Lich, Bone Dragon. Hero stats: Attack 1 / Defense 3 (exact reuse
of the old Sentinel split — thematically apt: undead durability). Starting
army: Zombie ×8, Ghost ×5.

| Tier | Creature | ATK | DEF | HP | DMG | SPD | Ranged | Growth/day | Power | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Skeleton | 6 | 6 | 6 | 1-3 | 4 | No | 6 | 12.6 | reuse |
| 2 | Zombie | 5 | 9 | 20 | 2-4 | 3 | No | 6 | 16.0 | new |
| 3 | Ghost | 9 | 7 | 22 | 3-5 | 7 | No | 5 | 18.2 | new |
| 4 | Wraith | 10 | 9 | 30 | 4-7 | 6 | No | 4 | 22.0 | new |
| 5 | Vampire | 12 | 10 | 50 | 5-9 | 6 | No | 3 | 27.0 | new |
| 6 | Lich | 13 | 12 | 80 | 6-11 | 4 | Yes | 2 | 33.0 | new |
| 7 | Bone Dragon | 18 | 16 | 210 | 20-35 | 8 | No | 1 | 55.0 | new |

Undead's tier-1 Skeleton (power 12.6) already sits well above Human/Orc's
tier-1 (2.1 / 3.5) — kept exactly as-is (Non-goals: no rebalancing reused
stats) rather than forced to match. Read as an intentional faction
identity (creepy-tough even at the bottom) rather than an error; the
growth-per-day column trends slightly lower across the whole Undead
column to compensate economically (fewer, tougher units).

**Enkantos** (Philippine folklore, `pinoy-board` reuse) — all 7 new to
`heroes-mm`, direct art/name reuse from `pinoy-board`. Hero stats: Attack
3 / Defense 0 (glass-cannon trickster identity — deliberately the one
faction without a stats precedent to reuse, see spec.md US-1). Starting
army: Santilmo ×10, Manananggal ×6.

| Tier | Creature | ATK | DEF | HP | DMG | SPD | Ranged | Growth/day | Power | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Duwende | 2 | 2 | 6 | 1-2 | 4 | No | 9 | 4.6 | pinoy-board |
| 2 | Santilmo | 6 | 3 | 8 | 2-4 | 6 | Yes | 6 | 9.8 | pinoy-board |
| 3 | Manananggal | 8 | 5 | 14 | 3-5 | 7 | Yes | 5 | 14.4 | pinoy-board |
| 4 | Tikbalang | 10 | 7 | 22 | 4-7 | 8 | No | 4 | 19.2 | pinoy-board |
| 5 | Aswang | 12 | 9 | 32 | 5-8 | 6 | No | 3 | 24.2 | pinoy-board |
| 6 | Kapre | 11 | 15 | 60 | 5-9 | 3 | No | 2 | 32.0 | pinoy-board |
| 7 | Bakunawa | 17 | 15 | 160 | 15-25 | 6 | No | 1 | 48.0 | pinoy-board |

Ordering/relative-power loosely follows `pinoy-board/app/src/game/combat/
enemies.ts`'s own `maxHp`/`attackPower` values for the same creatures
(Duwende weakest, Bakunawa strongest, Kapre tanky-slow, Manananggal
ranged-kite) rather than inventing unrelated stats.

### Decision #3: Enkantos art — direct copy, not regeneration

Checked `pinoy-board/app/src/assets/boardSprites/enemy/{duwende,santilmo,
manananggal,tikbalang,aswang,kapre,bakunawa}.png` directly (all 7 exist).
Visually confirmed (`tikbalang.png`) these are already full-body,
semi-realistic painterly renders on a transparent background — the exact
same visual language `heroes-mm`'s own creature sprites already use (this
session's earlier "full body sprite just like in pinoy-board" work).
Direct `cp` into `images/creatures/` is enough, matching the precedent
already set for `images/terrain/{grass-hex,stone-hex}.png` — no
`image-gen` cost for 7 of the 18 new creatures.

### Decision #4: Hero id/sprite migration

The 3 existing hero ids/sprites map directly onto 3 of the 4 factions —
no new art needed for them, just an id rename to match their faction
(`marshal` → `human`, `warlord` → `orc`, `sentinel` → `undead`;
`images/creatures/hero-marshal.svg` etc. get renamed alongside). Enkantos
needs one new hero map-token sprite (`hero-enkantos.svg`) generated to
match the existing 3's flat placeholder style (`scripts/
gen-placeholder-sprites.mjs`, per `README.md`'s existing art notes) —
not the painterly creature style, since hero tokens are a different
visual role.

### Decision #5: Map dwelling placement (28 creature types)

The 30x22 map (already sized this session) has room for all 28 as
dwellings, following the exact mirrored-pair placement approach already
used for this map (`mapObjects.js`'s own header comment, and the
throwaway-script-generated layout from the map-size change): each
faction's 7 dwellings placed as a cluster, mirrored `(col,row) ↔
(W-1-col, H-1-row)` against a same-size cluster from a different faction,
so no single faction's content is systematically closer to one Keep than
the other across a full game (a player might get lucky in one specific
match, but not structurally). Concretely: pair Human's 7 with Undead's 7,
and Orc's 7 with Enkantos' 7 (arbitrary but fixed pairing — every hex
still gets validated by the same collision/bounds-check throwaway script
used last time before being committed to `mapObjects.js`, given the
proven track record of that catching real coordinate bugs this session).
Existing mine/monster/treasure counts (14/6/6) are unchanged — this
feature only touches dwellings.

### Decision #6: Build/recruit cost table for the 18 new creatures

Same resource-cost convention already established
(`specs/002-castle-creatures/plan.md` Decision #3, revised by this
session's economy rebalance): recruit cost tracks `creaturePower()`
scaled against the *current* (already-doubled) `MINE_YIELD`/
`KEEP_GOLD_YIELD` figures, sized so a new creature's tier-appropriate cost
lands in the same ballpark as its power-equivalent reused neighbor in the
table above (e.g. Human's new Swordsman, power 14.0, priced close to
Orc's reused Orc, power 15.5 — recruit ≈250-280 gold, build ≈ 60-70 wood
+ 50-60 ore, both affordable in the same 5-20 day window the existing
rebalance targets). Exact per-creature numbers are implementation-time
content (tasks.md Phase 2), following this table's power column as the
sizing guide rather than being pre-committed here — matching how the
original 10's own cost table was hand-tabulated against `creaturePower()`,
not derived from a formula.
