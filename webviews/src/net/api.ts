/**
 * Thin fetch wrappers around the Hono backend.
 *
 * CRITICAL CONSTRAINT: none of these may be called from Phaser's update() loop.
 * They are only invoked on discrete session events (loss / win / HUD refresh).
 * All paths are relative '/api/*' so they resolve against the Devvit web-view
 * origin without any absolute-URL juggling.
 */
import type {
  FailPayload,
  ScorePayload,
  StreakResponse,
} from '../../../shared/types.js';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Report a panic (loss). Returns updated community state + the posted banter. */
export function postFail(payload: FailPayload): Promise<StreakResponse> {
  return postJson<StreakResponse>('/api/fail', payload);
}

/** Report a successful clear. */
export function postScore(payload: ScorePayload): Promise<StreakResponse> {
  return postJson<StreakResponse>('/api/score', payload);
}

/** Read current global community relay state for the HUD. */
export async function getStreak(): Promise<StreakResponse> {
  const res = await fetch('/api/streak');
  if (!res.ok) throw new Error(`/api/streak -> ${res.status}`);
  return (await res.json()) as StreakResponse;
}
