# Implementation Plan: Yokai Faction

**Spec**: [spec.md](./spec.md)

## Decision #1: Roster and faction name — used as given, named after the mythology not a creature

Unlike specs/006 (Sunborn), the user's roster list was used verbatim —
no refinement was invited this time, and the escalation (small trickster
water-yokai → bird-yokai warrior-monk → ogre-demon → human sorcerer →
legendary serpent-dragon → fox spirit → sun goddess) was already sound.
The faction itself needed a name distinct from any single creature
(matching Human/Orc/Undead/Enkantos/Sunborn, none of which are named
after their own strongest creature) — "Yokai" (the umbrella term
Japanese folklore uses for supernatural creatures/spirits) fills that
role the same way "Enkantos" names Philippine folklore broadly rather
than picking one of its 7 creatures.

## Decision #2: Stats — interpolated across all 5 existing factions per tier

Same methodology as specs/006: each tier's attack/defense/hp/speed/dmg/
growthPerDay set by eyeballing the tier-by-tier average across Human/
Orc/Undead/Enkantos/Sunborn and landing in that neighborhood, adjusted
for flavor. Onmyoji and Kitsune are `ranged: true` (talisman magic /
kitsune-bi fox-fire); Amaterasu is also `ranged: true` (solar
radiance/mirror-light, distinguishing her from the game's other tier-7s,
which are all melee except Undead's ranged Lich at tier 6). Amaterasu's
`creaturePower()` (17+17+19=53) sits at the top of the existing tier-7
band (Dragon 50, Behemoth 45, Bone Dragon 55, Bakunawa 48, Phoenix
49.5) — fitting for a supreme deity — without being so far ahead that
it breaks the "no true global hierarchy, only within-faction tiers"
principle every prior faction has respected.

| Tier | Creature | ATK | DEF | HP | SPD | DMG | Ranged | Growth |
|---|---|---|---|---|---|---|---|---|
| 1 | Kappa | 3 | 3 | 6 | 4 | 1-3 | No | 9 |
| 2 | Tengu | 7 | 4 | 10 | 7 | 2-4 | No | 6 |
| 3 | Oni | 9 | 6 | 16 | 5 | 3-6 | No | 5 |
| 4 | Onmyoji | 9 | 7 | 24 | 5 | 4-7 | Yes | 4 |
| 5 | Orochi | 13 | 10 | 45 | 5 | 6-10 | No | 3 |
| 6 | Kitsune | 13 | 11 | 60 | 8 | 7-10 | Yes | 2 |
| 7 | Amaterasu | 17 | 17 | 190 | 8 | 20-32 | Yes | 1 |

## Decision #3: Costs — a step above Sunborn, crystal/gems as the resource theme

Same convention as every prior faction addition: priced a step above the
most-recently-added faction's equivalent tier (Sunborn) so the newest
faction never undercuts existing ones. Crystal and gems (mystical/
spiritual/treasure) fit an Onmyoji-and-kami order better than Sunborn's
sulfur (brimstone, a fire-faction fit that wouldn't make sense here).

## Decision #4: Hero stat split — (1 attack, 2 defense), a 6th distinct combination

Existing splits: Human (2,2), Orc (3,1), Undead (1,3), Enkantos (3,0),
Sunborn (2,3). Yokai's (1,2) is new — mild on both stats compared to
Sunborn's more defense-committed (2,3), reading as a "cunning over
combat" archetype fitting an Onmyoji-flavored order that leans on magic
more than raw stats.

## Decision #5: Map placement — same brute-force fairness search as Sunborn, independently

Yokai is again unpaired (6 factions is even, but Yokai and Sunborn don't
mirror *each other* either — each was independently placed to keep its
own 7 dwellings internally balanced, since they were added in separate
passes and re-litigating Sunborn's placement wasn't in scope). Used the
same search: candidate hexes in the top-right/bottom-left corners'
remaining open rows (avoiding every hex already occupied by mines/
monsters/treasures/Sunborn's dwellings), brute-forced for the 7-of-N
subset with zero difference between total distance from `KEEP_PLAYER`
and `KEEP_AI` — found one (111==111 for the new batch alone; 648==648
across all 42 dwellings including the other 5 factions' 35). Amaterasu
and Kitsune (the two strongest) additionally sit at the two
individually-most-balanced positions of that subset, same rationale as
Phoenix/Cinder Wyvern in specs/006.

## Decision #6: Amaterasu — dignified treatment of a real, active deity

Amaterasu is not a fictional invention; she is a central figure in Shinto,
an actively practiced religion. This project already established a
precedent for handling a genuine deity/mythological figure as a top-tier
creature respectfully: Enkantos's Bakunawa (specs/005), a real figure in
Philippine mythology tied to eclipse folklore. Followed the same
approach here — every generation prompt (creature portrait, dwelling
icon, attack effect) explicitly requested "serene, powerful, dignified,
reverent... an awe-inspiring benevolent deity, not menacing," and the
resulting art (radiant ceremonial robes, a solar halo, the sacred mirror
motif — Yata no Kagami) reads as majestic rather than either mocking or
frightening. Mechanically she has no special treatment beyond being the
strongest creature in her faction, same role every faction's tier-7
already plays.

## Verification performed

- Full suite 175/175 — the generic content.test.mjs written alongside
  specs/006 automatically validated all 7 new creatures (cost-table
  entries, real non-fallback sprites, exactly one dwelling each) with no
  new tests needed, confirming its value as a reusable regression guard.
- Live Playwright verification: setup screen shows 6 faction cards with
  real Yokai art, Castle screen shows all 7 rows in tier order, the
  adventure map renders all 7 new dwellings at their planned positions,
  a live battle with the full Yokai roster renders every portrait
  correctly, and confirmed `attack-amaterasu.png` actually flies on a
  real attack resolution.
- Collision/bounds/fairness re-verified against the actual committed
  `mapObjects.js` (not just the standalone search script) before
  shipping: 0 collisions, 0 out-of-bounds, 648==648.
