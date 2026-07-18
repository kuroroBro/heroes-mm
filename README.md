# ⚔️ Hex Heroes

A free, browser-based tribute to Heroes of Might & Magic — no build step,
no accounts, deployed to GitHub Pages. Move your hero across a hex
adventure map, capture resource mines and creature dwellings, and fight
tactical hex battles against an AI opponent.

## How to play

1. Pick a hero type (Marshal / Warlord / Sentinel — different starting
   army and Attack/Defense split), then **Start Game**. You and an AI
   opponent start at opposite corners of a 15×11 hex map.
2. Click a hex to move your hero there (pathfound automatically). Each hex
   costs 1 of your day's movement points (8/day).
3. Walking onto an **unguarded** mine or dwelling captures it instantly —
   mines add resources every day, dwellings add new creatures to your
   army. Walking onto a **guarded** mine/dwelling, a monster stack, or the
   enemy hero starts a tactical hex battle.
4. In battle, creature stacks act in Speed order on an 11×9 hex
   battlefield. On your stack's turn, move or attack (melee needs
   adjacency; ranged creatures can attack from anywhere), or Wait/Defend.
   Win and your surviving stacks return to the map with you. Lose your
   whole army and you respawn at your Keep with a fresh starting army —
   no permanent loss.
5. Click **End Day** when you're done moving — the AI takes its full turn,
   then a new day begins.
6. **Defeat the enemy hero's army** in direct combat to win instantly.
   Otherwise, the game ends at Day 30 and whoever has the higher Kingdom
   Score (mines + dwellings + army value) wins.

v1 is single-player (you vs. one AI hero) on one device — see the design
docs below for what's deliberately deferred (multiplayer, magic,
town-building, procedural maps, and more).

## Placeholder art

Every mine, dwelling, monster, creature, and hero token currently renders
as a hand-authored flat SVG placeholder (`images/objects/`,
`images/creatures/`, generated via `scripts/gen-placeholder-sprites.mjs`).
Swapping in real generated art later only means changing the lookup table
in `js/sprites.js` — no engine or UI changes needed.

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
node --test tests/*.test.mjs   # rules-engine unit tests (61 tests)
```

## Design docs (SDD)

This project was built spec-first. See
[`specs/001-hex-heroes/`](specs/001-hex-heroes/):
[spec.md](specs/001-hex-heroes/spec.md) (what & why) →
[plan.md](specs/001-hex-heroes/plan.md) (architecture, decisions, content
values) → [tasks.md](specs/001-hex-heroes/tasks.md) (work breakdown and
the deferred-features backlog).

Unlike this workspace's other party games, this one has no networking
yet — v1 is a single-device hero-vs-AI game. Multiplayer, following the
same host-authoritative PeerJS pattern as the sibling games, is a planned
(not abandoned) future round — see plan.md's Networking model.
