#!/usr/bin/env python3
"""Generate the Tagalog voice cues for Bayani Relay using Microsoft edge-tts.

Why this is a LOCAL script (not run in the build):
    The Claude Code sandbox blocks every cloud TTS endpoint by egress policy, so
    audio cannot be synthesized there. Run this on your own machine instead:

        pip install -r tools/requirements.txt
        python tools/generate_audio.py

    It writes one .mp3 per cue into webviews/assets/audio/, overwriting the silent
    placeholder stubs that ship in the repo. The filenames are the contract shared
    with webviews/src/config/AudioCues.ts — do not rename them.

edge-tts is free, needs no API key, and ships native Filipino neural voices.
Swap VOICE for fil-PH-BlessicaNeural (female) if you prefer.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:  # pragma: no cover - guidance for first-time setup
    sys.exit(
        "edge-tts is not installed.\n"
        "Run:  pip install -r tools/requirements.txt"
    )

# Default Filipino neural voice. Alternatives: 'fil-PH-BlessicaNeural'.
VOICE = "fil-PH-AngeloNeural"

OUT_DIR = Path(__file__).resolve().parent.parent / "webviews" / "assets" / "audio"

# (filename_stem, text_to_speak, rate). Keep keys in sync with AudioCues.ts.
# `rate` slows the syllable build-ups so learners can hear each part.
CUES: list[tuple[str, str, str]] = [
    # --- Mechanic 1: syllable build-up (back to front) ---
    ("dihan", "dihan", "-25%"),
    ("tindihan", "tindihan", "-15%"),
    ("naiintindihan", "Naiintindihan", "+0%"),
    # --- Mechanic 2: binary choice + distractor ---
    ("hindi", "Hindi", "+0%"),
    ("hati", "Hati", "+0%"),
    # --- Mechanic 3: konti lang slider ---
    ("konti_lang", "Konti lang", "+0%"),
    # --- Bonus vocabulary ---
    ("ingles", "Ingles", "+0%"),
]


async def synth_one(stem: str, text: str, rate: str) -> None:
    out_path = OUT_DIR / f"{stem}.mp3"
    communicate = edge_tts.Communicate(text, VOICE, rate=rate)
    await communicate.save(str(out_path))
    print(f"  [OK] {out_path.relative_to(OUT_DIR.parent.parent)}  ({text!r})")


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating {len(CUES)} cues with voice {VOICE} -> {OUT_DIR}")
    for stem, text, rate in CUES:
        await synth_one(stem, text, rate)
    print(
        "\nDone. Note: feedback stings (sfx_correct/sfx_wrong/sfx_panic) are NOT\n"
        "voice — add your own short .mp3 SFX for those keys if you want sound there."
    )


if __name__ == "__main__":
    asyncio.run(main())
