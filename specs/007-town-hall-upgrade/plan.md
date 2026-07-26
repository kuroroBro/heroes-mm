# Implementation Plan: Town Hall Upgrade

**Spec**: [spec.md](./spec.md)

## Decision #1: Data shape — a level counter on `hero.castle`, not a new top-level field

`hero.castle.townHallLevel` (starts at 0, `initCastle()`) sits alongside
the existing `unlocked`/`pool`/`built` fields rather than a new
`hero.townHall` — it's Castle-scoped state managed by the exact same
module (`js/castle.js`) as every other Castle upgrade, and needs no
fields the existing shape doesn't already imply (no per-creature
tracking, no map-hex tie-in the way dwellings have).

## Decision #2: Bonus/cost tables — 3 levels, gold-heavy costs, scaling bonus

```
Level:              0     1      2      3
Cumulative bonus:   0    +300   +700   +1200  gold/day
Upgrade cost:        —   800g+150wood  2500g+150ore+3crystal  5000g+5gems+5crystal
```

Costs follow every other Castle table's wood/ore-early,
gold+scarce-resource-later pattern (`js/castle.js`'s own long-standing
comment on `BUILD_COST`). Level 1 is deliberately affordable early
(comparable to a tier-2/3 dwelling) since gold is the resource every
other Castle sink leans on most, making early investment self-reinforcing
over a 30-day game; later levels cost more per unit of bonus (level 1:
+300 for 950 gold-equivalent value; level 3: +500 more for ~6300
gold-equivalent) so it doesn't dominate every other spending decision.

## Decision #3: Applied in `endDay`, additive with `KEEP_GOLD_YIELD`

```js
} else if (occupant.type === 'keep') {
  const hero = state.heroes[occupant.ownerId];
  hero.resources.gold += KEEP_GOLD_YIELD + townHallGoldBonus(hero);
}
```

Additive (not a replacement or multiplier) so `KEEP_GOLD_YIELD` stays a
meaningful standalone constant or comment fully independent of this
feature — reading `endDay` doesn't require both this feature *and*
resources.js's own history to make sense of the base number.

## Decision #4: AI priority — upgrade before dwelling build, once per day

`chooseAiCastleActions` (`js/ai.js`) tries `upgradeTownHall` first, then
falls through to its existing one-dwelling-build-per-day loop. Placed
first because a Town Hall level compounds for every remaining day of the
game, while a dwelling only starts producing creatures from that point
on — the earlier economy investment has a larger expected payoff over a
30-day game, so it's worth "spending" the AI's one action-per-resource-
pool-per-day budget on first when both are affordable the same day.

## Decision #5: Kingdom Score — 20 pts/level, folded into the existing "castle" component

`kingdomScoreBreakdown`'s `castle` field already summed
`unlocked.size * 15`; now also adds `townHallLevel * 20`. Kept as one
combined component (not a 4th score category) since both represent the
same underlying idea — permanent Castle investment — and the game-over
screen's breakdown line ("X mines + Y castle + Z army") stays accurate
without needing a UI change.

## Verification performed

- 6 new castle.test.mjs tests (fresh-hero baseline, afford/deny at
  various resource levels, deducts-and-advances-by-exactly-one,
  fails-outright-when-unaffordable, never-skips-a-level-with-resources-
  to-spare, denied once at TOWN_HALL_MAX_LEVEL) + 2 new adventure.test.mjs
  tests (endDay applies the bonus additively; kingdomScoreBreakdown
  reflects it). Full suite 175/175.
- Live Playwright verification: Castle screen row at levels 0/1/3
  (including the maxed state correctly hiding the Upgrade control and
  cost text), confirmed `endDay`'s actual gold delta matches the
  displayed total Keep yield at each level, and caught + fixed a real
  wording bug during that check — the upgrade line originally showed the
  *cumulative* next-level bonus ("+700 gold/day") in a spot that read
  like the upgrade itself grants +700, when it only adds +400 on top of
  an existing +300; fixed to show the incremental gain with the
  cumulative total in parentheses. Also corrected the row's `locked`
  (dimmed) styling to only apply at level 0 (nothing invested yet), not
  for every non-maxed level — a level-1/2 hall is already earning its
  bonus and shouldn't read as an incomplete/locked state the way an
  unbuilt dwelling does.
