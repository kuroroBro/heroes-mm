# ⚔️ Hex Heroes

A free, browser-based hex-map fantasy strategy game — no build step,
no accounts, deployed to GitHub Pages. Move your hero across a hex
adventure map, capture resource mines and creature dwellings, recruit an
army and learn spells at your Castle, besiege the enemy's own Castle, and
fight tactical hex battles against an AI opponent.

## How to play

1. Pick a faction (Human / Orc / Undead / Enkantos / Sunborn — different
   starting army and Attack/Defense split), then **Start Game**. You and
   an AI opponent start at opposite corners of a 15×11 hex map.
2. Click a hex to move your hero there (pathfound automatically). Each hex
   costs 1 of your day's movement points (8/day).
3. Walking onto an **unguarded** mine or dwelling captures it instantly —
   mines add resources every day, dwellings unlock that creature type at
   your **Castle**. Walking onto a **guarded** mine/dwelling, a monster
   stack, or the enemy hero starts a tactical hex battle instead.
4. Open the **Castle** (🏰 button, available anytime on your turn) to spend
   resources recruiting accrued creatures into your army or learning
   spells, or to build a dwelling outright — unlocking that creature type
   without ever finding or fighting for its map hex.
5. In battle, creature stacks act in Speed order on an 11×9 hex
   battlefield. On your stack's turn, move or attack (melee needs
   adjacency; ranged creatures can attack from anywhere), or Wait/Defend.
   Whenever it's your side's turn, you can also **cast a known spell** (🔮
   panel) by spending mana — casting is free and doesn't use up a stack's
   turn, but only once per round. Win and your surviving stacks return to
   the map with you. Lose your whole army and you respawn at your Keep
   with a fresh starting army and full mana — no permanent loss.
6. Walking onto the **enemy's Keep** always starts a fight: their hero if
   they're home (with a home-turf Defense bonus for them), or a **militia**
   drafted from their Castle's recruit pool if they're away. Win the raid
   and you loot 40% of their resources — their Castle itself is never
   captured; only defeating the enemy hero directly still wins the game.
   A siege battlefield has a **wall** with one open **gate** — standing
   wall hexes block movement (not ranged attacks or spells), and as the
   attacker you can **Fire Catapult** (once per round, free, no mana) to
   blast open a second gap anywhere along the wall.
7. Click **End Day** when you're done moving — the AI takes its full turn
   (including its own Castle building/recruiting/spell-learning), then a
   new day begins.
8. **Defeat the enemy hero's army** in direct combat to win instantly.
   Otherwise, the game ends at Day 30 and whoever has the higher Kingdom
   Score (mines + unlocked creature tiers + army value) wins.

v1 is single-player (you vs. one AI hero) on one device — see the design
docs below for what's deliberately deferred (multiplayer, procedural
maps, and more). Town-building/recruiting shipped in
[`specs/002-castle-creatures`](specs/002-castle-creatures/); castle
sieges and hero spells shipped in
[`specs/003-siege-and-spells`](specs/003-siege-and-spells/); the siege
wall/gate battlefield and catapult shipped in
[`specs/004-siege-battlefield`](specs/004-siege-battlefield/).

## Art

The Castle and all 10 dwellings are real generated art in a flat
cel-shaded icon style; all 10 creature sprites, the catapult, and the
wall-segment battlefield prop are real generated art in a full-body/
semi-realistic painterly style with true alpha transparency (matching the
visual treatment of this workspace's `pinoy-board` project); the siege
battle backdrop (`images/objects/castle-wall.png`) is a wide panoramic
painterly scene in that same style. All generated via the `image-gen`
skill, living in `images/objects/` and `images/creatures/`. The hex grid
ground itself (`images/terrain/grass-hex.png`, `stone-hex.png`) isn't
generated — those are *reused* straight from `pinoy-board`'s own
`battleground/` hex skins (same workspace, same author), applied as SVG
`<pattern>` fills on both the adventure map and the battlefield, with
semi-transparent tint overlays on top for movement/catapult-target
highlighting rather than separate texture files per state. Mines, the
keep, monster/treasure map icons, and the 3 hero tokens are still
hand-authored flat SVG placeholders (generated via
`scripts/gen-placeholder-sprites.mjs`). Either way, swapping art only
ever means changing the lookup table in `js/sprites.js` — no engine or UI
changes needed (spec.md FR-3).

`specs/005-castle-factions` added 18 more creatures (28 total, across 4
factions) plus a 4th hero token — all real art. The Enkantos faction's 7
creatures are copied directly from `pinoy-board`'s own
`boardSprites/enemy/` (Duwende, Santilmo, Manananggal, Tikbalang, Aswang,
Kapre, Bakunawa), same reuse pattern as the hex ground textures above and
confirmed to already match this project's full-body painterly style. The
other 11 creatures, the Enkantos hero token, and all 18 new dwelling
icons were generated via `image-gen` (an initial pass hit a hard Codex
CLI version mismatch and fell back to flat placeholder SVGs; a Codex
upgrade resolved it and everything was regenerated as real art — the
dwelling icons in a short follow-up pass once the placeholder look was
reported). 6 of Enkantos's 7 attack-effect icons also reuse pinoy-board
directly (`boardSprites/attack/enemy/`); every other creature (including
Santilmo) has its own dedicated generated attack-effect icon — no
creature falls back to the generic effect sprite anymore.

`specs/006-sunborn-faction` added a 5th faction, **Sunborn** — a
fire-and-light order with a Phoenix at tier 7 (35 creatures total now,
across 5 factions) — fully real art from the start (no placeholder
phase): 7 creature portraits, a hero token, 7 dwelling icons, and 7
attack-effect icons, all generated via `image-gen`.

## Deploying to GitHub Pages

The site is fully static — no build step.

1. In the repository, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
2. Push to `main`. The [deploy workflow](.github/workflows/deploy.yml) runs
   the engine tests and publishes the site to
   `https://<user>.github.io/<repo>/`.

## Local development

```bash
python3 -m http.server 8000   # any static server works
# open http://localhost:8000
node --test tests/*.test.mjs   # rules-engine unit tests (175 tests)
```

## Design docs (SDD)

This project was built spec-first. See
[`specs/001-hex-heroes/`](specs/001-hex-heroes/) for the core v1 loop
(spec → plan → tasks),
[`specs/002-castle-creatures/`](specs/002-castle-creatures/) for the
Castle build/recruit economy that superseded v1's passive-dwelling
Decision #3, and
[`specs/003-siege-and-spells/`](specs/003-siege-and-spells/) for castle
sieges and the hero spellbook/mana system, which together superseded
v1's "no magic" and 002's "no castle combat" Non-goals, and
[`specs/004-siege-battlefield/`](specs/004-siege-battlefield/) for the
siege-specific wall/gate battlefield obstacles (destructible walls, one
open gate, attacker catapult) shipped on top of that, and
[`specs/005-castle-factions/`](specs/005-castle-factions/) for splitting
the single shared 10-creature roster into 4 factions (Human, Orc, Undead,
Enkantos) of 7 creatures each, chosen at setup in place of the old
hero-type pick, and
[`specs/006-sunborn-faction/`](specs/006-sunborn-faction/) for the 5th
faction (Sunborn, a fire/light order with a Phoenix at tier 7) added on
top of that same shape, and
[`specs/007-town-hall-upgrade/`](specs/007-town-hall-upgrade/) for the
Castle's 3-level Town Hall gold-income upgrade.

Unlike this workspace's other party games, this one has no networking
yet — v1 is a single-device hero-vs-AI game. Multiplayer, following the
same host-authoritative PeerJS pattern as the sibling games, is a planned
(not abandoned) future round — see plan.md's Networking model.
