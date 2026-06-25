# Audio generation (run locally)

The game ships with **silent placeholder** `.mp3` stubs so it builds and runs
out of the box. To get real Tagalog voice cues, generate them with
[`edge-tts`](https://github.com/rany2/edge-tts) (free, no API key, native
Filipino neural voices):

```bash
pip install -r tools/requirements.txt
python tools/generate_audio.py
```

This overwrites the stubs in `webviews/assets/audio/` with real audio. Filenames
are the contract shared with `webviews/src/config/AudioCues.ts` — **don't rename
them**, just regenerate.

> ⚠️ This must run on a machine with normal internet access. It cannot run inside
> the Claude Code web sandbox, whose egress policy blocks all TTS endpoints.

## Notes

- Default voice is `fil-PH-AngeloNeural`. Edit `VOICE` in `generate_audio.py` to
  use `fil-PH-BlessicaNeural` (female) instead.
- The syllable build-up cues (`dihan`, `tindihan`) are slowed via `rate` so the
  back-to-front Pimsleur drill is easy to follow.
- Feedback stings (`sfx_correct`, `sfx_wrong`, `sfx_panic`) are **not** voice —
  drop in your own short SFX `.mp3`s for those keys if you want audible feedback.
- After regenerating, rebuild the client: `npm run build:client`.
