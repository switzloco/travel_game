/**
 * Declarative audio-cue table — the single source of truth for every sound the
 * game plays. The `key` is also the .mp3 filename (without extension) under
 * webviews/assets/audio/, which keeps three things in lockstep:
 *   - Phaser's loader (PreloadScene)
 *   - tools/generate_audio.py (which synthesizes each file)
 *   - the silent placeholder stubs committed to the repo
 *
 * The game is audio-FIRST: gameplay is driven by which cue is playing, not by
 * on-screen text. `text` here is only a developer reference / accessibility label.
 */
import type { TargetWord } from '../../../shared/types.js';

export interface AudioCue {
  /** Filename stem under assets/audio/ AND the Phaser texture/sound key. */
  key: string;
  /** Tagalog phrase (developer reference only — not the gameplay driver). */
  text: string;
  /** English gloss for dev readability. */
  gloss: string;
}

/** Path Phaser uses to load a cue (relative — required by Devvit's sandbox). */
export const audioPath = (key: string): string => `audio/${key}.mp3`;

/**
 * MECHANIC 1 — Syllable Build-up.
 * Played back-to-front so the player assembles the word rhythmically:
 *   dihan -> tindihan -> naiintindihan
 */
export const SYLLABLE_CUES: AudioCue[] = [
  { key: 'dihan', text: '...dihan', gloss: 'tail syllables' },
  { key: 'tindihan', text: '...tindihan', gloss: 'mid build' },
  { key: 'naiintindihan', text: 'Naiintindihan', gloss: 'I understand' },
];

/**
 * MECHANIC 2 — Binary Audio Choice.
 * The player hears one of these and must hit the matching button. `hati` is the
 * phonetic-trap distractor: it sounds like "hindi" but must NOT be answered.
 */
export interface ChoiceCue extends AudioCue {
  word: TargetWord;
  /** Which button is correct, or 'none' for the distractor trap. */
  answer: 'naiintindihan' | 'hindi' | 'none';
}

export const CHOICE_CUES: ChoiceCue[] = [
  { key: 'naiintindihan', word: 'naiintindihan', text: 'Naiintindihan', gloss: 'I understand', answer: 'naiintindihan' },
  { key: 'hindi', word: 'hindi', text: 'Hindi', gloss: 'no / not', answer: 'hindi' },
  { key: 'hati', word: 'hati', text: 'Hati', gloss: 'split (TRAP!)', answer: 'none' },
];

/** MECHANIC 3 — Konti Lang slider cue ("just a little bit"). */
export const KONTI_CUE: AudioCue = {
  key: 'konti_lang',
  text: 'Konti lang',
  gloss: 'just a little bit',
};

/** Misc prompt / feedback cues (UI stings, not vocabulary). */
export const FEEDBACK_CUES = {
  correct: { key: 'sfx_correct', text: '(ding)', gloss: 'success sting' },
  wrong: { key: 'sfx_wrong', text: '(buzz)', gloss: 'failure sting' },
  panic: { key: 'sfx_panic', text: '(alarm)', gloss: 'panic spike' },
} as const satisfies Record<string, AudioCue>;

/** Flat list of every cue key the loader must preload. */
export const ALL_CUE_KEYS: string[] = [
  ...new Set([
    ...SYLLABLE_CUES.map((c) => c.key),
    ...CHOICE_CUES.map((c) => c.key),
    KONTI_CUE.key,
    ...Object.values(FEEDBACK_CUES).map((c) => c.key),
  ]),
];
