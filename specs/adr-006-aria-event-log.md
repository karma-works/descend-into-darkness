# ADR-006: ARIA Event Log — Discrete Events, Not Real-Time State

**Status:** Accepted  
**Date:** 2026-05-14  
**Deciders:** Christian Haegele

---

## Context

The game's original brief included "WCAG 2.2 Level AAA compliance." During the design interview, this requirement was challenged and ultimately revised. This ADR records the decision and the reasoning.

## The WCAG AAA Problem for Real-Time Games

WCAG 2.2 Success Criterion 2.2.3 (No Timing, Level AAA) states: "Timing is not an essential part of the activity or function conveyed by the content." For a real-time platformer with falling debris, enemy attacks, and a physics system, timing is not incidental — timing IS the game.

No credible interpretation of WCAG AAA can accommodate a real-time reflex-based game. Claiming AAA compliance on Descend into Darkness would be dishonest.

**Decision: Target ARIA Authoring Practices Guide (APG) instead.**

The ARIA APG provides the correct framework for interactive applications, including games. The `role="application"` pattern, live region best practices, and keyboard interaction patterns in the APG are applicable and achievable. This is the compliance target.

## ARIA Architecture

### Live Region: Event Log (`role="log"`, `aria-live="polite"`)

A hidden `<div id="event-log" role="log" aria-live="polite">` receives discrete, non-time-critical game events:

- Checkpoint reached
- Crystal / treasure collected (with value)
- Level transition
- Enemy defeated
- Shop purchase confirmed
- Post-death narration (text version of Mara's spoken line)
- Mara's echolocation results (text backup)

**Critical constraint:** Events are appended as child `<p>` elements, never replacing the entire innerHTML. `aria-atomic="false"` ensures screen readers announce new items, not the whole log. Events are debounced — minimum 500ms between appends — to prevent screen reader queue saturation.

### Live Region: Mara Alerts (`role="alert"`, `aria-live="assertive"`)

A hidden `<div id="mara-alert" role="alert" aria-live="assertive">` receives CRITICAL-priority announcements only:

- Imminent debris impact direction
- Direct enemy contact warning
- Boss attack telegraph

`aria-atomic="true"` and `aria-live="assertive"` mean the screen reader interrupts whatever it's saying. This is used sparingly — assertive regions lose their power if overused.

### Game Container (`role="application"`)

`<main role="application">` tells assistive technology that keyboard interaction is managed by the application, not the browser. Arrow keys, Space, and F are consumed by the game; screen reader virtual cursor mode is suspended inside this element.

A visible focus target `<div id="focus-trap" tabindex="0">` carries the keyboard focus for the game. It has a descriptive `aria-label` listing active controls.

## What ARIA Does Not Do Here

ARIA live regions do **not** carry real-time game state. They do not announce:

- Rex's current position
- Enemy positions during movement
- Physics state (falling, jumping)
- Continuous proximity information

This information lives in the spatial audio layer (ADR-003). Attempting to mirror it in ARIA would flood the screen reader queue and produce a degraded experience worse than audio alone.

The rule: **ARIA carries events (things that happened once). Audio carries state (things that are happening now).**

## Keyboard Compliance

All game actions are reachable via keyboard, with no mouse or pointer requirement. This satisfies WCAG 2.1 (Keyboard) and APG keyboard interaction patterns.

| Action | Key |
|---|---|
| Move left | `A` or `←` |
| Move right | `D` or `→` |
| Jump | `Space` or `↑` |
| Fire | `F` |
| Echolocation ping | `Q` |
| Interact / Shop | `E` |
| Pause | `Escape` |
| Mute | `M` |

No action requires simultaneous key combinations beyond what a standard keyboard can produce with one hand.
