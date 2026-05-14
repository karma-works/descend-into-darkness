# ADR-001: Blind-First Architecture

**Status:** Accepted  
**Date:** 2026-05-14  
**Deciders:** Christian Haegele

---

## Context

This game was conceived during a design interview about adapting the DINO platformer for totally blind players. DINO's own ADR-002 explicitly deprioritized totally blind users as out of scope, noting that serving them would require "fundamentally different mechanics (echolocation, audio-first levels, slower pacing), amounting to a different game."

That different game is this one.

The question was framed precisely: is this a *visual game with an accessibility layer*, or a *blind-first game that happens to share the Dino engine*? The answer is the former is dishonest and the latter is wrong — it shares no engine at all. It shares design DNA only: descend, survive, companion, shop, boss.

## Decision

Build the game from scratch, blind-first. Vision is not a fallback. Vision is not a secondary channel. The game is designed entirely around the assumption that the player cannot see the screen at all, has never seen it, and will never see it.

Every design decision — physics, level structure, threat timing, UI, narration — is made by asking "how does a blind player experience this?" first, not last.

## Consequences

**What this means in practice:**
- No canvas renderer as the primary output. The HTML document IS the game interface.
- No visual spatial reasoning. Position is communicated through audio, not pixels.
- No visual cues for danger, collectibles, or navigation. Every signal must have an audio equivalent that carries the full information content — not a supplemental description of a visual event, but the event itself expressed in sound.
- Reaction time constraints must be calibrated for audio perception, not visual perception. Visual reaction time is ~200ms; audio localization takes ~300–500ms to act on under stress.
- Sighted players can observe the game as a secondary audience (via visual status display), but they are not the design target.

**What this does not mean:**
- The game does not need to be slow. Real-time, punishing, cruel — these remain design goals.
- The game does not need to be simple. Complexity is encoded in audio, not removed.
- The game does not need WCAG AAA compliance for gameplay (see ADR-006).

## Rationale

A blind-first game built properly is a better accessibility story than any overlay. It is also a better game for blind players — because every mechanic was designed with them in mind, not retrofitted after the fact.

The name: **Descend into Darkness**. The title is not a metaphor. The cave gets darker as you descend. The player is also in darkness. The character's condition and the player's experience are unified. This is rare. Use it.
