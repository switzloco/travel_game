/**
 * Witty failure-comment generator — the heart of the Reddit "hook".
 *
 * When a player panics, the server auto-posts one of these lines as a comment on
 * the game post to spark community banter. Crucially this is DATA-DRIVEN (a fixed
 * table of human-written quips keyed by the failed word), NOT free-form LLM text:
 * the hackathon explicitly bans generated "AI slop", and a curated table keeps the
 * voice consistent and on-theme (NAIA airport social-survival comedy).
 */
import type { FailPayload, TargetWord } from '../../shared/types.js';

/** A small bank of quips per failed word. `{u}` and `{d}` are interpolated. */
const BANTER: Record<TargetWord, string[]> = {
  naiintindihan: [
    'u/{u} confidently shouted "Naiintindihan!" then understood absolutely nothing. Still at the gate. 🛂',
    'u/{u} claimed to understand the immigration officer. They did not. {d}cm into the relay and stuck.',
  ],
  hindi: [
    'u/{u} froze on a simple "Hindi". The vendor took that as a yes and now they own three balikbayan boxes. 📦',
    'u/{u} forgot how to say no in Tagalog and got talked into extra baggage fees. {d}cm reached.',
  ],
  konti_lang: [
    'u/{u} could not land "Konti lang" and accidentally ordered the entire lechon. RIP their luggage allowance. 🐷',
    'u/{u} missed the polite sweet spot and over-committed. The tindera is thrilled. {d}cm and out.',
  ],
  ingles: [
    'u/{u} panicked and insisted they only speak English. At NAIA. To a fellow Filipino. The secondhand embarrassment is global. 🇵🇭',
    'u/{u} demanded "Ingles!" and got a 20-minute lecture instead. Relay halted at {d}cm.',
  ],
  hati: [
    'u/{u} fell for the classic "Hati" trap and split their sandwich with a stranger instead of saying no. 🥪',
    'u/{u} heard "Hati", smashed the wrong button, and is now in a 50/50 partnership they did not agree to. {d}cm.',
  ],
};

/** A deterministic-ish pick so we get variety without needing extra state. */
function pick(options: string[], seed: number): string {
  // options is always non-empty by construction of the BANTER table.
  const index = Math.abs(Math.floor(seed)) % options.length;
  return options[index] ?? options[0]!;
}

/**
 * Build the comment body for a failure. `username` is the failing player; the
 * server passes it in (the app account itself authors the comment).
 */
export function buildBanter(payload: FailPayload, username: string): string {
  const options = BANTER[payload.failedWord] ?? BANTER.hindi;
  const line = pick(options, payload.distanceCm + payload.failedWord.length);
  return line
    .replaceAll('{u}', username)
    .replaceAll('{d}', String(Math.max(0, Math.round(payload.distanceCm))));
}
