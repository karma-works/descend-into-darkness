# Descend into Darkness

**A blind-first audio platformer. Descend. Survive. Listen.**

> Rex the dinosaur and Dr. Mara Voss descend into a cave that gets darker with every level.  
> The darkness is not a bug. It is the game. You navigate by sound.

**[▶ Play Live Demo](https://karma-works.github.io/descend-into-darkness/)**

---

## A message to blind players

**This game was built for you first.**

I'm a sighted developer who became fascinated by the question: what would a platformer feel like if sound was the only sense that mattered? Not "accessible" in the sense of a checkbox — but genuinely designed from the ground up for players who can't see the screen at all.

This is my first attempt at a game for blind players. I'm sure I got things wrong. I'm eager to learn.

**If you try this game — even for five minutes — I would be grateful to hear from you:**

- What worked? What felt right?
- What was confusing or impossible?
- What would make it genuinely enjoyable to play?
- What assistive tools are you using? (Screen reader, braille display, headphones, speakers?)
- Is the spatial audio encoding useful, or does it feel arbitrary?
- Does Dr. Mara Voss's narration help or get in the way?

There is no wrong answer. You are not a test case. You are shaping what this game becomes.

**[Open a feedback issue →](https://github.com/karma-works/descend-into-darkness/issues/new?labels=blind-player-feedback&title=Blind+player+feedback)**  
Or email: christian@haegele.dev

I read everything.

---

## What this game is

**Descend into Darkness** is a real-time audio platformer. There is no visual gameplay — the game is played entirely through sound. A screen is not required to play.

You are **Rex**, a dinosaur descending into an ancient cave. Your companion **Dr. Mara Voss**, a paleontologist, descends with you. She translates. She warns. She slowly loses the torch.

Each level is deeper, darker, and more hostile. Mara gets quieter. The cave gets stranger. Something has been following you since Level 9.

### What you hear

- **Spatial audio** — every entity (enemy, debris, crystal, exit) has a distinct sound positioned in stereo space. Left means left. Right means right. High pitch means above you. Low pitch means below.
- **Echolocation** — press `Q` to emit a directional ping. The cave responds with the position of everything nearby.
- **Dr. Mara Voss** — she speaks warnings, reads the space after your echolocation ping, narrates your death, guides you through the shop. Her voice changes as you go deeper.
- **Silence** — the most dangerous sound in the game.

---

## Controls

| Action | Key |
|---|---|
| Move left | `A` or `←` |
| Move right | `D` or `→` |
| Jump | `Space` or `↑` |
| Spit fire | `F` |
| Echolocation ping | `Q` |
| Talk to Merchant | `E` |
| Pause | `Escape` |
| Mute | `M` |

**Recommended: headphones.** Stereo separation is how the game communicates spatial information. Mono speakers significantly reduce playability.

---

## Enemies

| Enemy | Sound | Behaviour |
|---|---|---|
| Cave Crawler | Low rasping, 80 BPM | Slow patrol. Predictable. Learn the rhythm. |
| Bat Swarm | High flutter, 200 BPM | Fast, chaotic. Move before it reaches you. |
| Shadow Wraith | Arrhythmic breath, near-silent | No footsteps. No pattern. When the cave goes quiet — move. |

---

## Dr. Mara Voss

Paleontologist. She found Rex's fossil site six years ago and chose not to publish. Some things should not be in a journal.

She begins the descent with a torch, maps, and confidence. The torch dies at Level 5. The maps end at Level 8. At Level 9, she stops explaining what she hears and starts just whispering directions.

Her humor gets darker as you go deeper. She never says she's scared. Listen for what she doesn't say.

---

## Difficulty Curve

| Depth | New threat | Mara's mood |
|---|---|---|
| 1–2 | Falling debris only | Talkative, teaching |
| 3–4 | Cave Crawlers | Scientific, precise |
| **5** | **Boss 1** | *"I've seen this before. In the fossil record."* |
| 6–8 | Bat Swarms | Urgent, clipped |
| 9 | Shadow Wraith first appears | Goes quiet |
| **10** | **Boss 2** | Changed. Something shifted. |
| 11+ | Elite variants, near-instant debris | Mostly silent. Occasional dark humor. |

---

## Accessibility

This game targets the **ARIA Authoring Practices Guide** for assistive technology compatibility. It deliberately does not claim WCAG 2.2 Level AAA — real-time games are structurally incompatible with Success Criterion 2.2.3 (No Timing), and claiming otherwise would be dishonest.

**What is implemented:**
- `role="application"` with full keyboard-only navigation
- `role="log"` ARIA live region for discrete game events (checkpoint, treasure, death narration)
- `role="alert"` ARIA live region for critical warnings
- All controls reachable via keyboard, no mouse required
- Web Speech API (SpeechSynthesis) for Mara's voice
- Web Audio API spatial encoding for gameplay information
- No canvas — the HTML document is the game interface

**Screen readers tested:** VoiceOver (macOS), NVDA (Windows)  
**Note:** For real-time gameplay, Web Audio spatial audio is the primary information channel. Screen reader live regions carry discrete events (things that happened once), not continuous state. This is by design — continuous state in live regions floods the screen reader queue.

---

## Tech Stack

| | |
|---|---|
| **Runtime / Bundler** | [Bun](https://bun.sh/) |
| **Language** | TypeScript (strict) |
| **Audio** | Web Audio API (procedural, no asset files) |
| **Voice** | Web Speech API (SpeechSynthesis — Mara's voice) |
| **UI** | HTML5 + ARIA (no canvas) |
| **Persistence** | `localStorage` (depth record) |

---

## Getting Started

```bash
# Install Bun (if needed)
curl -fsSL https://bun.sh/install | bash

# Start dev server (http://localhost:3000)
bun run dev

# Typecheck
bun run typecheck

# Production build → public/bundle.js
bun run build
```

**Requires headphones for the intended experience.**

---

## Project Structure

```
descend-into-darkness/
├── public/
│   ├── index.html        HTML shell — ARIA structure, no canvas
│   └── bundle.js         Built output (generated)
├── src/
│   ├── main.ts           Entry point
│   ├── constants.ts      Tuning values
│   ├── types.ts          Shared interfaces & enums
│   ├── Input.ts          Keyboard handler
│   ├── ThreatBus.ts      Priority queue for audio events
│   ├── SpatialAudio.ts   Web Audio API — spatial positioning, echolocation
│   ├── MaraEngine.ts     Dr. Mara Voss — arc-aware TTS narration
│   ├── ARIALog.ts        Discrete event announcer
│   ├── Level.ts          Procedural cave level generator
│   ├── Physics.ts        Real-time physics
│   ├── Game.ts           Game loop and state machine
│   └── entities/
│       ├── Rex.ts        Player character
│       ├── Debris.ts     Falling cave rock
│       ├── Enemy.ts      Crawler / Bat / Wraith
│       ├── Crystal.ts    Collectible gem
│       ├── Merchant.ts   Shop NPC
│       └── Boss.ts       Boss — breathing arc, phase 2
├── specs/
│   ├── adr-001-blind-first-architecture.md
│   ├── adr-002-no-canvas.md
│   ├── adr-003-spatial-audio-primary.md
│   ├── adr-004-mara-voss-companion.md
│   ├── adr-005-threat-design.md
│   ├── adr-006-aria-event-log.md
│   └── implementation-plan.md
├── server.ts
├── package.json
└── tsconfig.json
```

---

## Design Documents

- [ADR-001: Blind-first architecture](specs/adr-001-blind-first-architecture.md)
- [ADR-002: No canvas](specs/adr-002-no-canvas.md)
- [ADR-003: Spatial audio as primary sense](specs/adr-003-spatial-audio-primary.md)
- [ADR-004: Dr. Mara Voss](specs/adr-004-mara-voss-companion.md)
- [ADR-005: Threat design](specs/adr-005-threat-design.md)
- [ADR-006: ARIA event log](specs/adr-006-aria-event-log.md)
- [Implementation plan](specs/implementation-plan.md)

---

## License

[MIT](LICENSE) © 2026 karma-works
