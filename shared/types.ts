/**
 * Shared contract between the Phaser client (webviews/) and the Hono server (src/).
 *
 * This is the single source of truth for every JSON payload that crosses the
 * client <-> server boundary. Both sides import from here so the shapes can
 * never silently drift apart.
 */

/**
 * The Pimsleur Lesson 1 target vocabulary plus the phonetic-trap distractor.
 * These string keys are the contract that ties together:
 *   - webviews/src/config/AudioCues.ts (which audio file plays)
 *   - tools/generate_audio.py          (which .mp3 is generated)
 *   - src/core/banter.ts               (which failure comment is written)
 */
export type TargetWord =
  | 'naiintindihan' // "I understand"
  | 'hindi' // "no / not"
  | 'konti_lang' // "just a little bit"
  | 'ingles' // "English"
  | 'hati'; // DISTRACTOR — phonetic trap for "hindi"

/** Which mini-mechanic the player was in when they failed (for banter flavor). */
export type FailPhase = 'syllable_build' | 'binary_choice' | 'konti_slider';

/** POST /api/fail — fired once when the Social Panic Meter maxes out. */
export interface FailPayload {
  /** The cue the player got wrong (drives the witty auto-comment). */
  failedWord: TargetWord;
  /** Which mechanic they choked on. */
  phase: FailPhase;
  /** How far they relayed before panicking, in centimeters (the "distance" gag). */
  distanceCm: number;
}

/** POST /api/score — fired once on a successful level clear. */
export interface ScorePayload {
  distanceCm: number;
  /** Longest in-run combo of correct audio reactions. */
  bestCombo: number;
}

/** Returned by /api/fail and GET /api/streak so the HUD can show the community number. */
export interface StreakResponse {
  /** Global community relay distance, summed across every player, in centimeters. */
  globalDistanceCm: number;
  /** Total number of recorded panics community-wide. */
  totalPanics: number;
  /** The comment the server posted in response to this failure, if any. */
  banterComment?: string;
}

/** Generic server error envelope. */
export interface ApiError {
  error: string;
}
