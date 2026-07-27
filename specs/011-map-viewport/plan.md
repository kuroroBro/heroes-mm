# Implementation Plan: Map Viewport

**Spec**: [spec.md](./spec.md)

## Decision #1: Confirmed the interaction patterns with the user before building

Two genuinely open UX questions were resolved via AskUserQuestion before
any code was written, since guessing wrong meant redesigning real
interaction code, not just tweaking numbers: World View is a
full-screen toggle overlay (not a persistent minimap — simpler, reuses
the existing whole-map render path, no permanent screen-space cost on a
phone), and the camera *does* pan to follow each AI hero's turn during
End Day (cinematic — accepted the tradeoff that this can mean a few
hops in sequence for a 2-3 AI game, in exchange for actually being able
to watch what happened).

## Decision #2: Camera state is a raw pixel point, not a hex coordinate

`cameraPixel = { x, y }` lives in the same coordinate space
`layoutHexes` already returns (relative to the full map's own top-left,
independent of hex size/screen size) — not a hex coord. This makes
drag-panning plain pixel arithmetic with no per-frame hex rounding, and
means jumping the camera to any hero/tapped hex is just one
`positions.get(key(hex))` lookup (`hexPixelPosition`), reused
identically for the initial default, 📍 Recenter, World View's
tap-to-jump, and US-3's AI-follow — one code path, four call sites.

## Decision #3: viewBox stays a fixed size; a persistent inner `<g>`'s `transform` carries the actual camera position

The map SVG's `viewBox` is always `0 0 winWidth winHeight` — a fixed
*window* size (either the zoomed viewport's hex-column dimensions, or
the full map's size while World View is open) — and never itself
changes to "point at" a different part of the map. Instead, one
`<g id="adv-map-camera">` wraps every hex tile/sprite/badge/hero token,
and its `transform="translate(-winX -winY)"` attribute is what actually
shifts which part of the map is visible within that fixed window.

This `<g>` is kept alive across renders (only its *contents* are wiped
and rebuilt each call, via `camG.innerHTML = ''`) rather than the old
`svg.innerHTML = ''` full-teardown approach — a freshly-created element
has no "previous value" for a CSS transition to animate from, so
persisting it is what makes `#adv-map-camera { transition: transform
320ms ease-out; }` (styles.css) turn a Recenter click or an AI-follow
pan into a smooth glide instead of a jump-cut. An active drag adds a
`.no-camera-transition` class (`transition: none`) so 1:1 finger-
tracking never visibly lags behind the pointer — programmatic camera
moves (Recenter, AI-follow, World View's tap-to-jump) are the only ones
that get the eased animation.

## Decision #4: Culling to the visible window (+ buffer), not just relying on SVG clipping

`renderAdventureMap` filters the hex list down to `visibleHexes` —
whatever falls within the current window plus an `ADV_HEX_SIZE * 3`
buffer — before building any DOM nodes, rather than rendering every hex
on the map and letting the SVG's own viewBox clip away what's off-
screen. This matters more now than it would have pre-specs/010: an x4
map has up to 2640 hexes, and drag-panning re-renders on every
animation frame, so keeping the per-render DOM rebuild cheap is a real
requirement, not just tidiness. `layoutHexes(rectHexes(...))` itself
(which only depends on `state.mapWidth`/`mapHeight`, never on hero/
content positions) is additionally cached per map size
(`fullMapLayout`) so that per-frame cost during a drag is just the
`visibleHexes` filter and the 3 render passes over a ~100-250-hex
window, not a fresh full-map sweep every frame.

## Decision #5: World View is a mode flag on the same render function, not a second code path

`worldViewActive` just changes what `renderAdventureMap` computes for
`winWidth`/`winHeight`/`winX`/`winY`/`visibleHexes` (full map bounds, no
culling) — it's the exact same "whole map" math the pre-this-feature
version of the function always used unconditionally, now gated behind a
flag instead of being the only mode. This kept US-2 low-risk: no new
rendering logic, just a branch at the top of a function that already
existed.

## Decision #6: Two real pointer-capture bugs found and fixed during verification

Both surfaced only under Playwright's synthetic pointer events, not
during code review, and both had the same root cause — capturing the
pointer too early/broadly:

- **Recenter/World View buttons stopped responding** — the map wrap's
  `pointerdown` handler called `wrap.setPointerCapture(e.pointerId)`
  unconditionally, including when the tap started on the 📍/🗺️ buttons
  (DOM children of the wrap, so their pointerdown bubbles up to it
  first). Capturing there redirects the button's own trailing click
  away from it. Fixed by skipping drag-tracking entirely when
  `e.target.closest('.map-control-btn')`.
- **Ordinary tap-to-move broke** — `setPointerCapture` was being called
  immediately on every `pointerdown`, including a plain tap with no
  movement at all, which retargets that tap's click away from whatever
  hex/token is actually underneath it. Fixed by moving the
  `setPointerCapture` call to the *pointermove* handler, at the exact
  moment a drag is confirmed (past `DRAG_THRESHOLD_PX`) — a tap that
  never crosses that threshold never captures anything, so its click
  reaches the real target normally.

A third, smaller bug from the same investigation: `suppressNextMapClick`
(set after a real drag, to swallow the browser's trailing click) was
only ever cleared by *consuming* it on the next hex click — meaning a
drag followed by clicking some other control (Recenter, a filter
button) before ever touching a hex again left it armed indefinitely,
ready to silently eat a much later, unrelated tap. Fixed by also
self-expiring it via `setTimeout(..., 350)`.

## Verification performed

- No engine changes; the pre-existing `node --test tests/*.test.mjs`
  suite (194 tests) passes unchanged — run as a regression check, not
  because this feature added new engine behavior to test.
- Live Playwright verification at both a phone-sized viewport (390x844)
  and desktop (1400x1000), on an x1 and an x4 game: confirmed the
  default view is a small hex window (not the whole map shrunk down),
  drag-panning moves the camera and is reflected in the `<g>`'s
  transform, 📍 Recenter and 🗺️ World View both work via a real
  synthesized click (not just `.click()` called directly on the DOM
  node — the pointer-capture bugs above only reproduced through actual
  pointerdown/move/up sequences), tapping inside World View jumps the
  camera and closes the toggle (button's `active` class correctly
  clears), ordinary tap-to-move still works after extensive panning/
  toggling, and a 2-AI End Day visibly changes the camera's transform
  mid-turn with a `.hero-just-moved` highlight present, landing back on
  the player once the day fully resolves.
