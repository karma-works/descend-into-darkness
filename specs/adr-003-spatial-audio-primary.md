# ADR-003: Spatial Audio as the Primary Game Sense

**Status:** Accepted  
**Date:** 2026-05-14  
**Deciders:** Christian Haegele

---

## Context

Blind gaming research and existing blind-first games (A Blind Legend, Papa Sangre, AudioDoom) consistently show that spatial audio — not screen reader narration, not voice commands — is the correct primary modality for real-time blind gaming. Spatial audio operates at the same speed as the game. Narration has latency. Screen readers have queues. Audio has none of these constraints.

## Decision

Web Audio API with `PannerNode` per entity is the primary game sense. All gameplay-critical information is encoded in the audio layer. Narration and ARIA events are supplementary, never primary.

### Spatial Encoding Scheme

**Horizontal position (X):** Stereo pan. Entity to the player's left pans left; entity to the right pans right. Pan value maps linearly from player position: 0 = directly on player, ±1 = edge of hearing range (~800 game units).

**Vertical position (Y):** Pitch shift. Entities above the player have higher pitch. Entities below have lower pitch. This encodes platform height, falling debris trajectory, and jump arc feedback.

**Distance:** Volume (gain). Closer entities are louder. Volume drops with distance squared. Entities beyond 600 game units fade to inaudible.

**Echolocation:** Player-triggered. Press `Q` to emit a directional ping. The SpatialAudio engine fires a short click through the PannerNode for every nearby entity and terrain feature, each with appropriate pan/pitch/volume encoding. Results arrive within 100ms — the player builds a spatial model from the ping pattern. Echolocation has a 2-second cooldown to prevent abuse.

### Entity Audio Signatures

Each entity type has a distinct timbre to prevent confusion:

| Entity | Timbre | BPM | Notes |
|---|---|---|---|
| Cave Crawler | Low rasp, sawtooth | 80 | Predictable, slow |
| Bat Swarm | High flutter, triangle | 200 | Fast, chaotic |
| Shadow Wraith | Arrhythmic breath, filtered noise | — | No footstep rhythm. Silence warns. |
| Debris | Sharp crackle | — | 1800ms warning before impact |
| Merchant | Warm chord hum | — | Stationary, inviting |
| Crystal / Gem | Pure sine chime | — | Immediate, brief, pleasant |
| Boss | Deep breathing oscillator | — | Pitch degrades as boss takes damage |
| Exit | Rising harmonic beacon | — | Gets louder as player approaches |

### The Void / Edge Mechanic

Platform edges are encoded through environmental reverb changes. When the player is on a platform surrounded by cave walls, the convolver reverb is tight and enclosed. As they approach an edge or gap, the reverb tail lengthens — the sound "opens up." This is physically accurate echolocation behavior. Players learn to feel edges without explicit narration.

### Ambient Layer

The cave has a persistent ambient drone: low-frequency oscillator + filtered noise (identical philosophy to DINO's AudioManager). As depth increases, the drone pitch lowers and a second dissonant tone appears. At boss levels, the ambient becomes rhythmically irregular. The ambient is always present and is the player's baseline signal for "normal."

**Silence is the most dangerous sound.** When ambient audio cuts or drops, something has changed. The Shadow Wraith triggers ambient suppression before it attacks. This is the game's most powerful thriller mechanic.

## Consequences

- All game events must have a designed audio signature before the event is implemented. Audio is not added after gameplay is designed — it IS the gameplay design.
- Testing requires headphones. Stereo separation is non-negotiable; the game is unplayable in mono.
- The priority queue (ThreatBus) prevents audio channel saturation — see ADR-005.
- Mara's voice runs through a separate audio chain (Web Speech API → audio output), distinct from the Web Audio graph, to prevent panning/pitch effects contaminating her speech.
