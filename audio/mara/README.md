# Mara voice assets

Generated Mara voice files live in this directory and are deployed as static
assets.

Regenerate them with Piper:

```bash
PIPER_PYTHON=/path/to/python \
PIPER_DATA_DIR=/path/to/piper-voices \
FFMPEG_BIN=/path/to/ffmpeg \
bun run voice:generate
```

The default voice is `en_US-hfc_female-medium`. The generator reads
`public/audio/mara/script.json`, emits temporary WAV files, then writes Ogg Vorbis
files into this directory. Existing files are skipped unless `FORCE_VOICE=1` is set.
The `"..."` silence line is rendered as a short silent Ogg instead of going through
Piper.

Recommended export settings:

- Format: Ogg Vorbis first, MP3 fallback only if browser support requires it.
- Loudness: normalize around -16 LUFS integrated.
- Trim: remove leading and trailing silence.
- Routing: dry centered voice, no baked-in spatial panning.

The game falls back to browser TTS for any authored line that fails to load, and
for all dynamic tactical lines.
