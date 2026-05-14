# ADR-004: Dr. Mara Voss — Diegetic AI Companion

**Status:** Accepted  
**Date:** 2026-05-14  
**Deciders:** Christian Haegele

---

## Context

The game requires a narration layer — post-death analysis, echolocation results, shop guidance, atmospheric commentary. Three options were evaluated:

**A. Diegetic character:** The AI is a person inside the game world. She has a name, a history, a personality, an arc. Her narration is in-world dialogue, not system messages.

**B. Non-diegetic assistant:** A voice outside the fiction. "You have 3 enemies nearby." Clinical, reliable, boring.

**C. Between-levels only:** AI runs outside real-time play. Minimal integration.

Option A is the correct answer. It is also the hardest. It is chosen.

## Decision

The companion is **Dr. Mara Voss**, paleontologist. She is real within the game world. Her narration is never "the system speaking to the player" — it is always Mara speaking to Rex (the dino, the player character).

### Character

Mara discovered Rex's fossil site six years ago. She chose not to publish — some things should not be in a journal. She and Rex have an arrangement: she translates the surface world for him, he takes her places no human has gone. This arrangement is about to fail them both.

**Personality:** Sharp, dry, precise. Her humor is a diagnostic tool — she makes jokes when she's afraid, so the jokes get darker as they descend. She never says "I'm scared." She says things like *"the acoustic profile of this chamber suggests something very large has been moving through here recently. Professionally speaking."* She is the most competent person in any room she enters. This cave is not a room.

### Arc

The arc is built on inversion: Mara begins as the guide (she has the torch, the maps, the expertise) and ends as the one being guided. Rex begins following her lead and ends carrying them both.

| Depth | State | Voice Character |
|---|---|---|
| Levels 1–4 "The Survey" | Confident, curious, scientific | Chatty, informative, light dry humor |
| Levels 5–8 "The Dark" | Torch dead, adapting, listening | More personal, less clinical, asks Rex questions |
| Levels 9–13 "The Descent" | Something is following them. She knows it. | Humor darker, silences longer, warns without explaining |
| Boss level "The Site" | She recognises what they've found. | Voice changes completely. No jokes. Direct. |

### Her Roles

Mara is simultaneously:
1. **Post-death narrator** — specific, never gentle, gives data. *"Rock, center impact, 800ms window. You stopped. Don't stop."*
2. **Echolocation announcer** — translates ping results into spatial language. *"Platform two steps right, gap directly ahead, crawler far left moving toward us."*
3. **Proactive threat caller** — calls threats as they cross into tactical range. *"It's getting closer. Left side."*
4. **Shop voice** — all merchant interaction is voiced through Mara. She has opinions about what Rex should buy.
5. **Ambient narrator** — rare, atmospheric one-liners that build the world. *"I can smell sulfur. We're deeper than any record I've found."*
6. **The silence** — when Mara goes quiet mid-level, it is a signal. She hears something she doesn't want to name yet.

### Implementation

Mara's voice is delivered via **Web Speech API (SpeechSynthesis)**. Her lines are written, not generated. An `arc` property on `MaraEngine` tracks current depth and emotional state; line selection draws from arc-appropriate pools.

**Priority:** Mara never speaks over a CRITICAL audio event (impact imminent, contact hit). She speaks in TACTICAL windows — between player actions. She does not narrate continuously. Silence is part of her character design.

**If Mara dies** — from enemy contact, as in DINO — the silence where her voice was is the most frightening sound in the game. The game does not play a death sound for her. It plays nothing.

### Rex

The player character is Rex, a dino. Rex does not speak. Rex expresses through action: echolocation pings, fire, movement, and survival. Mara speaks. Rex acts. The player is Rex.

Rex's echolocation ability is the mechanic that Mara eventually learns to rely on. In the deepest levels, she asks him to ping before she'll move. The game mechanics reflect the narrative reversal.
