# Implementation Plan: Sunborn Faction

**Spec**: [spec.md](./spec.md)

## Decision #1: Roster — refined from the user's initial suggestion

The user supplied an initial 7-name list (Spark/Hatchling, Salamander/
Ember Guard, Flame Dancer, Ash Drake, Sun Priest, Cinder Wyvern, Phoenix)
and explicitly invited a better one. The escalation (tiny elemental →
lizard warrior → agile spirit → young drake → priest/caster → wyvern →
mythical firebird) was already sound and mirrors how the other 4 factions
mix humanoid and monster entries (Human's Peasant..Dragon, Undead's
Skeleton..Bone Dragon), so it was kept nearly verbatim — just picking one
name where two were offered (Salamander over "Ember Guard": a creature
name, matching every other tier-2 entry — Pikeman, Wolf, Zombie, Santilmo
— being either a creature or a person, not a generic unit-type label) and
dropping "/Hatchling" from Spark for the same reason.

Final roster (id, tier):
`spark`(1), `salamander`(2), `flame-dancer`(3), `ash-drake`(4),
`sun-priest`(5), `cinder-wyvern`(6), `phoenix`(7).

## Decision #2: Stats — interpolated across all 4 existing factions per tier

Rather than reusing any single faction's curve, each tier's attack/
defense/hp/speed/dmg/growthPerDay was set by eyeballing the tier-by-tier
average across Human/Orc/Undead/Enkantos (see `js/creatures.js`'s content
table for the exact per-faction numbers) and landing in that
neighborhood, then adjusting for flavor: Flame Dancer and Sun Priest are
`ranged: true` (throwing fire / holy bolts) the way Archer/Orc/Ghost's
tier-mates sometimes are; Phoenix specifically targets the same
`creaturePower()` neighborhood as the other 4 tier-7s (Dragon 50,
Behemoth 45, Bone Dragon 55, Bakunawa 48 → Phoenix 49.5) but leans harder
into attack (19) and speed (10, the fastest creature in the game) than
raw HP (165, lowest of the five tier-7s) — a fast glass-cannon flier
rather than another lumbering dragon, since two "big tough dragon" tier-7s
(Human's Dragon, Undead's Bone Dragon) already exist.

| Tier | Creature | ATK | DEF | HP | SPD | DMG | Ranged | Growth |
|---|---|---|---|---|---|---|---|---|
| 1 | Spark | 2 | 1 | 4 | 6 | 1-2 | No | 9 |
| 2 | Salamander | 6 | 4 | 9 | 5 | 2-3 | No | 6 |
| 3 | Flame Dancer | 8 | 4 | 12 | 7 | 3-4 | Yes | 5 |
| 4 | Ash Drake | 9 | 7 | 25 | 7 | 4-6 | No | 4 |
| 5 | Sun Priest | 10 | 8 | 30 | 5 | 5-8 | Yes | 3 |
| 6 | Cinder Wyvern | 13 | 11 | 65 | 7 | 7-11 | No | 2 |
| 7 | Phoenix | 19 | 14 | 165 | 10 | 18-30 | No | 1 |

## Decision #3: Costs — priced a step above Enkantos throughout

Same `RECRUIT_COST`/`BUILD_COST` shape and wood/ore-early, gold+scarce-
resource-later pattern every faction uses (`js/castle.js`'s own comment).
Sulfur and gems are Sunborn's characteristic scarce resources (brimstone/
light — fits a fire order better than Enkantos's crystal/mercury).
Deliberately priced a step above Enkantos's equivalent tier throughout
(e.g. Salamander 230 gold vs. Santilmo's 220) rather than matching or
undercutting it — the newest faction shouldn't be strictly better value
than existing ones at the same tier, which would make choosing an older
faction a trap.

## Decision #4: Hero stat split — (2 attack, 3 defense), distinct from all 4 existing combos

Existing splits: Human (2,2), Orc (3,1), Undead (1,3), Enkantos (3,0).
Sunborn's (2,3) is a new combination — defense-leaning but not as extreme
as Undead's, reading as "disciplined order" rather than "glass cannon"
(Enkantos already owns that extreme) or "generic balanced" (Human already
owns 2/2).

## Decision #5: Map placement — an unpaired 5th faction on an odd map

Every existing faction's 7 dwellings sit in one of two corners, 180°-
rotation-mirrored (`(col,row) <-> (W-1-col,H-1-row)`) against its partner
faction — Human↔Undead, Orc↔Enkantos — which is *why* the existing 28
dwellings' total hex distance from `KEEP_PLAYER` exactly equals their
total from `KEEP_AI` (416==416, verified). Sunborn has no partner, and
its corner (top-left/bottom-right are both already full) doesn't exist —
but the map's other two corners (top-right, bottom-left) were both still
empty, and are themselves each other's 180°-rotation mirror under this
same map convention.

Rather than placing all 7 in one of those two empty corners (which turned
out to favor whichever Keep is closer to that corner by a lot — an
all-top-right placement was checked first and came out 135 vs. 94, a
~44% imbalance), the final placement splits 4 dwellings into top-right
and 3 into bottom-left, chosen by brute-force search over the 14
candidate positions (7 per corner) for the exact 7-of-14 subset whose
total distance from `KEEP_PLAYER` equals its total from `KEEP_AI` — found
one with **zero** difference (121==121 for that subset in isolation;
537==537 across the full 35-dwelling map including the other 4
factions' 28). Phoenix and Cinder Wyvern (the two strongest, most
strategically important) were additionally assigned to the two positions
that are *individually* equidistant from both keeps (not just part of an
aggregately-balanced set), so the single most valuable dwelling isn't
just fair on average but fair every time a specific player reaches for it
first.

Verified via a throwaway Node script (this map's own established
convention) checking every candidate hex for both `inRect` bounds and
collision against every existing `MAP_OBJECTS` entry before being
hand-written into `mapObjects.js`.

## Decision #6: Art — full completeness parity with the other 4 factions

22 real generated images (7 creature portraits, 1 hero token, 7 dwelling
icons, 7 attack-effect icons) via the `image-gen` skill, matching the
established per-asset-type style exactly: creature portraits and the hero
token are full-body painterly with true alpha transparency (same as
Griffin/Dragon/hero-human etc.); dwelling icons are flat cel-shaded 2D
icons on a solid `#241a10` background (same as dwelling-dragon.png's
volcanic-cave treatment — a natural fit for a fire faction); attack-effect
icons are dark-painterly weapon/limb close-ups on a transparent
background (same as attack-troll.png etc.). No placeholders shipped at
any point — unlike specs/005's initial pass (blocked on a Codex CLI
version mismatch, resolved mid-session), this feature's art generation
had Codex already at a working version throughout.

Two recurring generation snags, both worked around rather than accepted:
Codex's imagegen skill occasionally proposed a `gpt-image-1.5`/
`OPENAI_API_KEY` CLI fallback for assets with soft/translucent edges
(smoke, flame) instead of just proceeding with its own standard chroma-key
removal — fixed by explicitly instructing "standard chroma-key background
removal, do not ask about or use any CLI fallback" in the retry prompt.
One dwelling icon attempt failed outright on a `python: command not
found` error inside the skill's own tooling (should have been `python3`)
— fixed the same way, by calling it out explicitly in the retry prompt.

## Verification performed

- `tests/content.test.mjs` (new, generic across all 5 factions): every
  creature has exactly one dwelling, a cost-table entry, and real
  (non-fallback) sprite files for portrait/attack/dwelling; every
  faction has exactly 7 creatures tiers 1-7; no duplicate ids.
- Full suite (165 tests) green.
- Live Playwright verification: setup screen shows 5 cards with
  Sunborn's real hero art; Castle screen shows all 7 Sunborn rows with
  correct dwelling icons and build costs; adventure map renders all 7
  new dwellings at their planned positions; a live battle with all 7
  Sunborn creatures renders every portrait correctly and confirmed
  `attack-phoenix.png` actually flies on a real attack resolution.
