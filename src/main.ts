/**
 * Bayani Relay — Devvit Web backend entry point.
 *
 * In modern Devvit Web (0.13.x) the "custom post" IS the web view bundle declared
 * in devvit.json (`post.dir`). There is no Blocks `addCustomPostType` anymore.
 * The server's whole job is a small Hono HTTP app that the web view talks to via
 * relative `/api/*` calls, plus `/internal/*` endpoints invoked by menu actions.
 *
 * Architecture rules honored here (see README "Engineering Constraints"):
 *   - The client only hits this server on session events (win / loss / seed-post),
 *     never inside the Phaser frame loop.
 *   - All Reddit + Redis access happens server-side via the ambient request
 *     `context`; no tokens or secrets ever reach the client.
 */
import { getRequestListener } from '@hono/node-server';
import { context, createServer, getServerPort, reddit } from '@devvit/web/server';
import { Hono } from 'hono';

import type {
  ApiError,
  FailPayload,
  ScorePayload,
  StreakResponse,
} from '../shared/types.js';
import { buildBanter } from './core/banter.js';
import { getCommunityState, recordPanic, recordScore } from './core/redis.js';

const app = new Hono();

/* -------------------------------------------------------------------------- */
/*  Game API — called by the Phaser client (webviews/src/net/api.ts)          */
/* -------------------------------------------------------------------------- */

/**
 * The Reddit hook. Fired ONCE when a player's Social Panic Meter maxes out.
 * Updates the global community relay distance and auto-posts a witty comment
 * on the parent post to ignite community banter.
 */
app.post('/api/fail', async (c) => {
  const payload = await c.req.json<FailPayload>();

  // 1) Update the shared, collaborative community state (atomic in Redis).
  const community = await recordPanic(payload.distanceCm);

  // 2) Generate + submit the banter comment on the parent post (best-effort:
  //    a failed comment must never break the player's loss flow).
  let banterComment: string | undefined;
  const { postId } = context;
  if (postId) {
    try {
      const username = (await reddit.getCurrentUsername()) ?? 'a_lost_traveler';
      banterComment = buildBanter(payload, username);
      await reddit.submitComment({ id: postId, text: banterComment, runAs: 'APP' });
    } catch (err) {
      console.error('Failed to submit banter comment:', err);
      banterComment = undefined;
    }
  }

  const body: StreakResponse = { ...community, banterComment };
  return c.json(body);
});

/** Fired ONCE on a successful level clear — records the run on the leaderboard. */
app.post('/api/score', async (c) => {
  const payload = await c.req.json<ScorePayload>();
  const { userId } = context;
  if (userId) {
    await recordScore(userId, payload.distanceCm);
  }
  return c.json(await getCommunityState());
});

/** Read-only community state for the HUD's "global relay" counter. */
app.get('/api/streak', async (c) => {
  return c.json(await getCommunityState());
});

/* -------------------------------------------------------------------------- */
/*  Internal endpoints — invoked by devvit.json menu actions (mods only)      */
/* -------------------------------------------------------------------------- */

/**
 * Seed a new playable post. Wired to the "Create Bayani Relay game" menu item.
 * Returns a UiResponse so the Reddit client navigates the mod to the new post.
 */
app.post('/internal/menu/create-post', async (c) => {
  const { subredditName } = context;
  if (!subredditName) {
    const err: ApiError = { error: 'No subreddit in context' };
    return c.json(err, 400);
  }

  const post = await reddit.submitCustomPost({
    subredditName,
    title: 'Bayani Relay: Manila Airport Dash — can you survive immigration? 🛂',
  });

  return c.json({
    navigateTo: post.url,
    showToast: { text: 'Posted a fresh round of Manila Airport Dash!', appearance: 'success' },
  });
});

/* -------------------------------------------------------------------------- */
/*  Boot the Devvit server. createServer behaves like node:http's createServer;*/
/*  getRequestListener adapts Hono's fetch handler into a (req, res) listener.  */
/* -------------------------------------------------------------------------- */

const server = createServer(getRequestListener(app.fetch));
server.listen(getServerPort());
