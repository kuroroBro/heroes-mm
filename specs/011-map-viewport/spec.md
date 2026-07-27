# Feature Specification: Map Viewport (Camera, World View, AI-Follow)

**Feature branch**: `011-map-viewport`
**Status**: Implemented
**Created**: 2026-07-27
**Depends on**: `specs/010-map-size` (the x1/x2/x4 map sizes that made
this problem acute — a 60x44 x4 map squeezed to fit a phone screen was
the direct trigger for this feature)

## Overview

Requested directly: "The map is too small especially in mobile. Make a
plan to improve ux... zoom the map to fit a certain number of hex
example 15x15. Also a mechanism to see world view to see whole map. And
a highlight when enemy is moving to follow where they are going."

Previously the adventure map's SVG `viewBox` always covered the entire
map, stretched to fit the container width — readable at the original
15x11 map, but every hex became too small to see or reliably tap once
the map size options (specs/010) went up to 30x22/60x44. This feature
replaces that "shrink everything to fit" rendering with a real
camera: a fixed-size, pannable viewport window, a toggle to see the
whole map when needed, and a camera that follows AI heroes during End
Day so their movement is actually visible instead of happening off in
whatever corner the (previously fixed) view didn't show.

Presentation-layer only — no changes to adventure.js or any other
engine file, so all 194 pre-existing tests pass unchanged.

## User Stories

### US-1: Fixed-size, pannable zoomed-in viewport
As a player (especially on mobile), I want the map to show a
comfortably-sized window of hexes around my hero rather than the whole
map shrunk to fit my screen, and to be able to drag to look around, so
I can actually read and tap individual hexes.

**Acceptance criteria**
- The map SVG's viewBox is a fixed-size window (~11x9 hex columns/rows
  on phone-width screens, ~17x13 on desktop) rather than the full map
  bounds.
- Dragging the map (mouse or touch, via Pointer Events) pans the
  camera; a drag under an 8px threshold is still treated as an
  ordinary tap, so the existing tap-to-select/tap-again-to-confirm move
  flow is unaffected.
- The camera auto-recenters on the player's hero whenever they
  successfully move, and a 📍 Recenter button snaps back to the hero
  on demand.
- The camera never pans past the map's edges.

### US-2: World View — see the whole map
As a player, I want a way to see the entire map at once for
orientation, without that becoming the map's only/default view.

**Acceptance criteria**
- A 🗺️ World View button toggles a mode that renders the whole map at
  once (the same math the pre-this-feature map always used), with no
  permanent screen-space cost when it's off.
- Tapping any hex while in World View jumps the camera there and
  returns to the normal zoomed viewport, rather than arming a hero
  move.

### US-3: AI-turn camera follow + movement highlight
As a player, I want to actually see where each AI hero goes during End
Day, so their moves aren't invisible just because they happened outside
my hero's own neighborhood.

**Acceptance criteria**
- During End Day, the camera pans to each acting AI hero's new position
  as it moves, with a brief highlight pulse so it's clear something
  just happened there (not just an unexplained jump).
- Pacing between AI turns is slower only on ticks where the camera
  actually moved somewhere new; skipped/no-op ticks (eliminated hero,
  no movement left, no reachable target) stay fast.
- Once End Day fully resolves, the camera eases back to the player's
  own hero.

## Non-goals

- No pinch-to-zoom / variable zoom level — the viewport is a fixed size
  per screen breakpoint, not a user-adjustable zoom slider.
- No persistent minimap overlay — World View is a full-screen toggle
  reusing the existing whole-map rendering, not an always-visible corner
  thumbnail (confirmed with the user up front as the simpler, more
  mobile-screen-friendly option).
- No hex-by-hex path animation for AI movement — `moveHero` still
  applies a whole multi-hex move atomically, so the camera follow is a
  smooth pan to each move's *end* position, not a token visibly gliding
  tile-by-tile along the way.
