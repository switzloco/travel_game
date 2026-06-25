/**
 * Centralized Redis key helpers + accessors for the global community state.
 *
 * Keeping every key string and access pattern in one module means the rest of
 * the server never hand-rolls a key, and the "Reddit hook" (a shared, growing
 * community streak) has exactly one source of truth.
 */
import { redis } from '@devvit/web/server';

import type { StreakResponse } from '../../shared/types.js';

/** All Redis keys live here so they can never be mistyped at a call site. */
const KEYS = {
  /** Running sum of every player's relay distance (the collaborative "hook"). */
  globalDistance: 'bayani:global:distanceCm',
  /** Count of every panic event community-wide. */
  totalPanics: 'bayani:global:panics',
  /** Sorted set of best per-user distances — the leaderboard. */
  leaderboard: 'bayani:leaderboard:level1',
} as const;

/**
 * Record a panic: bump the community panic counter and add the distance the
 * player managed to the global relay total. Returns the fresh community state.
 */
export async function recordPanic(distanceCm: number): Promise<StreakResponse> {
  const safeDistance = clampDistance(distanceCm);
  // incrBy is atomic, so concurrent failures from different users compose cleanly.
  const [globalDistanceCm, totalPanics] = await Promise.all([
    redis.incrBy(KEYS.globalDistance, safeDistance),
    redis.incrBy(KEYS.totalPanics, 1),
  ]);
  return { globalDistanceCm, totalPanics };
}

/** Read-only snapshot of the global community state for the HUD. */
export async function getCommunityState(): Promise<StreakResponse> {
  const [distance, panics] = await Promise.all([
    redis.get(KEYS.globalDistance),
    redis.get(KEYS.totalPanics),
  ]);
  return {
    globalDistanceCm: toInt(distance),
    totalPanics: toInt(panics),
  };
}

/**
 * Record a successful run on the leaderboard. zAdd keeps the member's score, so
 * we only overwrite when this run beat the player's previous best.
 */
export async function recordScore(userId: string, distanceCm: number): Promise<void> {
  const safeDistance = clampDistance(distanceCm);
  const previous = await redis.zScore(KEYS.leaderboard, userId);
  if (previous === undefined || safeDistance > previous) {
    await redis.zAdd(KEYS.leaderboard, { member: userId, score: safeDistance });
  }
  // A cleared level still contributes its distance to the community relay total.
  await redis.incrBy(KEYS.globalDistance, safeDistance);
}

/** Distances are gameplay-derived; guard against absurd / negative client values. */
function clampDistance(distanceCm: number): number {
  if (!Number.isFinite(distanceCm)) return 0;
  return Math.max(0, Math.min(Math.round(distanceCm), 100_000));
}

function toInt(value: string | undefined): number {
  const n = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}
