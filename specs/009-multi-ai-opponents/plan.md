# Implementation Plan: Multi-AI Opponents

**Spec**: [spec.md](./spec.md)

## Decision #1: Scope — up to 3 AI (4 heroes total), confirmed with the user upfront

Given how large a change this is (touching the core data model, movement/
collision, battle triggering, scoring, both win conditions, the AI turn
loop, and most of the adventure-map/battle-screen rendering), the AI
count ceiling was confirmed directly with the user before implementation
rather than guessed: up to 3 AI opponents (4 heroes total) — a reasonable
ceiling given the map is fixed-size, giving every hero a home corner with
clean symmetric keep/mine placement, without the map-fairness problem
getting combinatorially much harder the way 5+ heroes would.

## Decision #2: Data model — additive, not a rename

`state.heroes` keeps `'player'`/`'ai'` exactly as before and only gains
optional `'ai2'`/`'ai3'` keys when configured. `state.owners` (every
hero in this game) and `state.aiOwners` (just the AI subset, in order)
are new fixed arrays computed once in `createAdventure`. This was the
key decision that kept the change tractable: rather than renaming/
restructuring the existing 2-hero shape (which would have broken every
one of the 175 pre-existing tests and every hardcoded `'player'`/`'ai'`
string throughout the codebase), every existing reference to
`state.heroes.ai`/`'ai'` unchanged still means exactly what it always
meant — "the first (and, in the still-default 1-AI case, only) AI."

`createAdventure(playerHeroTypeId, aiHeroTypeIdOrIds, options)` accepts
either a single string (wrapped into a 1-element array internally) or an
array of 1-3 ids — every existing call site (all 175 pre-existing tests,
`main.js`'s old single-AI call) needed zero changes.

## Decision #3: `otherOwner()` → `otherLivingOwners()`, and most call sites needed no generalization at all

The original `otherOwner(owner)` ("the other one of exactly 2") only
had 2 real call sites once traced through: `isPassableForMove`/
`moveHero`'s hero-collision check (genuinely needs "is *any* other
living hero standing here", replaced with `otherLivingOwners(state,
owner).find(...)`) and `resolveBattleOutcome`'s hero-vs-hero branch,
which turned out not to need it at all — `pendingBattle` already names
both `attackerOwner`/`defenderOwner` explicitly, so the loser can be
computed directly from those two (`loserOwner = winnerOwner ===
attackerOwner ? defenderOwner : attackerOwner`) without any global
"who's the other owner" concept. Battles themselves stay strictly
pairwise no matter how many total heroes exist — only *which* hex a
given hero's move collides with needed real multi-hero awareness.

## Decision #4: Elimination + "last one standing" win condition

A hero reaching `defeatsToWin` total defeats is marked `eliminated`
(frozen in place: no more AI turns, excluded from
`otherLivingOwners` so no one can collide with them or contest their
Keep/hex again) rather than unconditionally ending the game. The game
only ends in combat once `state.owners.filter(not eliminated).length
<= 1`. With exactly 2 total heroes this reduces to the original
"immediately ends the game" behavior exactly, since eliminating the
only other hero always leaves exactly 1 remaining.

The Day-30 Kingdom Score fallback generalizes the same way: score every
*living* hero, the single highest scorer wins, 2+ tied for the lead is
a draw (a direct generalization of the original 2-way tie rule).

## Decision #5: AI turn loop — index through `aiOwners`, not a single hardcoded owner

`continueAiDay`/`finishAiDay` (main.js) now track `currentAiTurnIndex`
into `adventureState.aiOwners`, driving each active AI through its full
day's movement in turn (recursing via the same `setTimeout` chain as
before) before advancing to the next index; `finishAiDay` runs
`chooseAiCastleActions` once per non-eliminated AI instead of once for
`'ai'`. An AI that attacks the *player* still hands off to an
interactive battle (`proceedAfterBattle` resumes `continueAiDay()`
afterward at the same index, since that AI may still have movement
left); an AI that attacks another AI (or a neutral guard) auto-resolves
instantly via the renamed `autoResolveBattle` (previously
`autoResolveNeutralBattle` — the name predated it ever handling
AI-vs-AI hero fights, only neutral guards).

## Decision #6: AI targeting — nearest living rival, not full multi-rival threat assessment

`aiSelectTarget`'s "the enemy" (for siege-targeting and the
higher-stakes hero-engage power margin) is now whichever living rival
is currently geographically nearest, computed once per call. This was a
deliberate scope decision: every other fallback in that function
already picks the nearest reachable option of its own kind (nearest
free mine, nearest winnable guard, etc.), so picking the nearest *rival*
to focus on is consistent with the rest of the function's design,
rather than building a full "which of 3 rivals is the biggest threat"
system.

## Decision #7: Map — 2 new keep positions, fairness-checked the same way every dwelling placement since specs/006 has been

`KEEP_AI2`/`KEEP_AI3` sit at the map's top-middle/bottom-middle edges,
forming a left/right/top/bottom cross with the original 2 (which sit at
the left/right-middle edges) — deliberately *not* added to the static
`MAP_OBJECTS` list (unlike every dwelling before them), since they
should only exist on the map at all when that AI slot is actually used;
`createAdventure` inserts the keep hex dynamically when `aiOwners`
calls for it. Checked for fairness via the same distance-sum approach
specs/006/008 established: total hex distance from all 4 candidate keep
positions to every mine+dwelling on the map came out within ~6% of each
other (855/855/822/872 across 56 pieces of content) — close enough that
no starting corner is a structural advantage, without needing (or
attempting) the much harder combinatorial problem of *exact* 4-way
equal fairness the way the original 2-keep layout achieves exactly.

## Decision #8: UI — per-owner colors/labels, not a redesign

New `--owner-ai2`/`--owner-ai3` CSS variables (purple/green, alongside
the existing player-blue/ai-red) and matching `.owner-ai2`/`.owner-ai3`/
`.turn-ai2`/`.turn-ai3` classes — the existing per-hex/per-stack
rendering code already builds these class names dynamically from
whatever owner id it's given (`` `owner-${owner}` ``), so most of the
map/battle rendering needed zero JS changes once the CSS existed.
Narration (`battleOwnerLabel`/`battleOwnerPossessive`) collapses to the
exact original "You"/"The AI" phrasing whenever there's only 1 AI in
the game, and becomes "AI 2"/"AI 3"-style once there's more — so
default single-AI games read identically to before this feature, and
multi-AI games never say "the AI" ambiguously.

## Verification performed

- 10 new adventure.test.mjs tests (array vs. string createAdventure,
  keep placement, collision picks the *specific* rival standing on a
  hex, elimination-without-ending-the-game vs. last-one-standing,
  eliminated heroes stop blocking movement, Day-30 scoring among 3+
  including exclusion of eliminated heroes and 2-way ties) + 2 new
  ai.test.mjs tests (nearest-rival targeting, ignoring an eliminated
  rival even if nearer). Full suite 187/187 (177 pre-existing + 10 new
  — the pre-existing count grew from 175 to 177 as unrelated fixes
  landed in the same window, all still green).
- Live Playwright verification of the real UI flow end-to-end: setup
  screen's new control through to a live 4-hero game — all 4 heroes
  render with distinct colors/labels on the map, the defeats pill lists
  all 3 AI separately, clicking End Day runs all 3 AI's full turns with
  no errors and the day correctly advances, and the Day-30 final-battle
  offer correctly identifies and names the single highest-scoring AI as
  the rival to challenge (verified against a 4-hero score spread where
  a 3rd hero, not the 2-hero-default "the AI", is the actual leader).
