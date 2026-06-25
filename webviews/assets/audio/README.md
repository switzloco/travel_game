# Audio cues

These `.mp3` files are **silent placeholders** so the game builds and runs end to
end before any real voice work exists. Each plays ~0.3s of silence.

To replace them with real Tagalog voice, run the generator (see `tools/README.md`):

```bash
pip install -r tools/requirements.txt
python tools/generate_audio.py
```

Filenames are the contract shared with `webviews/src/config/AudioCues.ts`:

| file | cue | meaning |
| --- | --- | --- |
| `dihan.mp3` / `tindihan.mp3` / `naiintindihan.mp3` | syllable build-up | "I understand" (back-to-front) |
| `hindi.mp3` | binary choice | "no / not" |
| `hati.mp3` | binary choice | "split" — phonetic **trap** for *hindi* |
| `konti_lang.mp3` | slider | "just a little bit" |
| `ingles.mp3` | bonus vocab | "English" |
| `sfx_correct/wrong/panic.mp3` | feedback stings | not voice — add your own SFX |
