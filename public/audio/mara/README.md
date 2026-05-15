# Mara voice assets

Drop pre-rendered Mara voice files in this directory and set the matching `src`
field in `src/MaraLines.ts`.

Recommended export settings:

- Format: Ogg Vorbis first, MP3 fallback only if browser support requires it.
- Loudness: normalize around -16 LUFS integrated.
- Trim: remove leading and trailing silence.
- Routing: dry centered voice, no baked-in spatial panning.

The game falls back to browser TTS for any authored line without a `src`, and for
all dynamic tactical lines.
