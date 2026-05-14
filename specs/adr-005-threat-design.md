# ADR-005: Threat Audio Design

**Status:** Accepted  
**Date:** 2026-05-14  
**Deciders:** Christian Haegele

---

## Context

In a visual platformer, threats are perceived before they arrive — the player sees the enemy patrol, the gap in the floor, the rock falling from above. In a blind-first game, every threat must be learnable through audio before it is fatal. Death should feel avoidable in retrospect: "I heard that, I just didn't react in time." Never: "I had no idea that was there."

This ADR defines the audio design for every threat type and the principles governing all future threat additions.

## The Core Principle

**Every threat must have three audio states:**

1. **Distant** — barely audible directional hint. The player can choose to act or ignore.
2. **Approaching** — clear, recognisable audio cue. Time to act. The player should feel pressure.
3. **Contact** — sharp impact sound. Too late. The player knows exactly what hit them.

Death that skips state 1 or 2 is a design failure, not a difficulty feature.

## Threat Definitions

### Falling Debris

Borrowed from DINO (`DEBRIS_WARN_MS = 1800`). 1800ms is enough reaction time for a trained player.

**Audio encoding:**
- Warning sound begins 1800ms before impact
- **Stereo pan = X position relative to Rex** (pan left = lands to Rex's left; pan right = lands right)
- **Pitch = proximity to directly overhead** (high pitch = directly above Rex; low pitch = landing far away)
- Player moves horizontally to move the landing zone away from center pan
- Impact sound if debris hits floor (distinct from impact on Rex)

**Learnable skill:** The player learns to associate center pan + high pitch with "move NOW" and off-center pan with "safe, ignore." This is the game's primary reflex mechanic.

### Cave Crawler

Slow, predictable enemy. The entry-level threat. Designed to be mastered before harder types appear.

- **Timbre:** Low sawtooth rasp
- **BPM:** 80 — slow, regular footstep rhythm
- **Spatial:** Panned by position, volume by distance
- **Behavior:** Patrols a fixed segment, turns at walls
- **Tell:** Rhythm never changes. The player learns to count steps and predict turns.

### Bat Swarm

Fast, chaotic. Arrives quickly, leaves quickly. Punishes standing still.

- **Timbre:** High-frequency triangle flutter
- **BPM:** 200 — rapid, difficult to count
- **Spatial:** Fast pan movement reflects fast horizontal speed
- **Behavior:** Flies toward Rex, overshoots, circles back
- **Tell:** The flutter gets louder fast. Move before it arrives — don't wait for contact range.

### Shadow Wraith

The thesis statement for the thriller atmosphere. The hardest enemy. Introduced late (Level 9+).

- **Timbre:** Arrhythmic filtered noise — breath-like, almost below hearing threshold
- **BPM:** None. No footstep rhythm. No predictable pattern.
- **Spatial:** Very subtle pan. Easy to mistake for cave ambience.
- **Behavior:** Follows Rex slowly, always from the same direction until it isn't. Waits before attacking. Suppresses ambient audio before contact (the cave "goes quiet").
- **Tell:** The absence of sound. When the cave drone dims, the wraith is near.

Mara's response to the wraith: she goes quiet too. Her silence is the loudest warning she gives.

### The Void / Platform Edges

Not a creature — an environmental hazard. Falling off the platform kills Rex instantly.

- **Mechanic:** Reverb tail length encodes spatial openness. Tight, enclosed reverb = surrounded by walls. Long reverb tail = open space (edge or gap nearby).
- **No explicit warning sound.** The player learns reverb as a passive spatial signal.
- **Echolocation helps:** A ping near an edge returns fewer nearby reflections on the gap side.

This is the subtlest mechanic and the one that takes longest to learn. It is intentionally not explained in any tutorial — Mara hints at it once: *"Rex — the cave sounds different here. Can you feel it?"*

### Boss

Every 5 levels. Scaling difficulty.

- **Timbre:** Deep breathing oscillator, frequency drops as boss takes damage
- **Phase transition tell:** Breathing pattern changes at 50% HP — becomes faster, irregular
- **Attack tells:** Brief audio telegraph (low rumble) ~600ms before each attack
- **Death:** Breathing stops. Silence. Then Mara.

## The Priority Queue (ThreatBus)

Multiple simultaneous threats create audio saturation — the player hears noise, not information. ThreatBus enforces three priority levels:

| Priority | Contents | Behavior |
|---|---|---|
| CRITICAL | Impact-imminent (<300ms), direct contact | Preempts all other audio, Mara silent |
| TACTICAL | Echolocation results, Mara warnings, approaching threats | Plays between player actions, queued |
| AMBIENT | Enemy passive signatures, cave drone, crystals | Always-on background layer |

CRITICAL events are never queued — they fire immediately and interrupt everything. Only one CRITICAL event plays at a time. TACTICAL events are debounced: minimum 400ms between consecutive Mara voice lines. AMBIENT plays continuously and is mixed below TACTICAL/CRITICAL.

## Death as Tutorial

In a visual game the player can see what killed them. Here, they often cannot piece it together mid-game. Mara's post-death line carries this information explicitly and immediately. Death is educational, not punitive.

Mara's post-death narration must always include:
1. **What** killed Rex (debris, crawler, bat, wraith, void)
2. **Where** it came from (left, right, above, below)
3. **What the audio signal was** that the player missed or misread

Example: *"The wraith. It came from behind — you were listening right, but it had already crossed past you. When you heard nothing, that was the moment to move. Remember the nothing."*

This line is shown in the ARIA event log as well, so screen reader users who missed the audio receive it.
