# ADR-002: No Canvas — HTML Document as Game Interface

**Status:** Accepted  
**Date:** 2026-05-14  
**Deciders:** Christian Haegele

---

## Context

DINO renders everything — player, enemies, platforms, HUD, menus — onto an HTML5 Canvas element. Canvas content is invisible to screen readers. For DINO, this was a known limitation addressed by HTML overlays for menus. For Descend into Darkness, canvas rendering would mean rebuilding every visual element as a parallel audio event — brittle, leaky, and architecturally backwards.

## Decision

No `<canvas>` element. The HTML document is the game interface. Game state is managed in pure TypeScript data structures. Output channels are:

1. **Web Audio API** — the primary game sense (spatial audio, entity sounds, echolocation)
2. **Web Speech API** — Dr. Mara Voss's voice (TTS, diegetic narration)
3. **ARIA live regions** — discrete event log for screen reader users
4. **Visual status display** — a secondary, non-interactive HTML panel for sighted observers (depth, Mara's last spoken line)

The `<main role="application">` element is the game container. Keyboard focus lives there.

## Consequences

- No visual renderer to maintain, no canvas draw calls, no camera, no sprite animation.
- All "spatial" information is encoded in audio, not pixels.
- The game is testable with NVDA, VoiceOver, JAWS without any special tooling — it's just a web page.
- Sighted players see a minimal text interface (current depth, Mara's last line). This is intentional — the visual display is a window into the audio world, not the world itself.
- Bundle size is smaller (no renderer, no image assets, no sprite sheets).
- Level structure must be defined in data (terrain grids, entity positions as abstract coordinates) rather than pixel coordinates.
