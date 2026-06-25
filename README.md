




HACKATHON & DEVVIT TECHNICAL SPECIFICATION
1. Hackathon Blueprint: Reddit "Games with a Hook"
Timeline: June 17, 2026 – July 15, 2026.

Core Directive: Build a community game, social experiment, or interactive experience embedded inside Reddit feeds using Devvit Web.

The "Hook" Requirement: Judges are heavily scoring games based on community interaction, daily retention, and asynchronous collaboration. The game must leverage Reddit’s native structure (turning the comment section into gameplay, creating collective streaks, or sparking community problem-solving).

Anti-Patterns (What NOT to build): Reddit has explicitly banned "AI slop", overdone generic trivia, literal "fishing" jokes, basic Wordle clones, space shooters, or games themed entirely around Reddit lore (Snoo, karma mechanics).

Target Engine: Phaser 3 (2D HTML5 game framework) integrated directly into the web view canvas via Reddit's official partnership template.

2. Devvit Web Architecture (Client-Server Split)
Devvit apps operate on a distinct client-server framework. Crucial Devvit Update (June 2026): Old "Blocks" visual layouts are entirely deprecated. Everything is now standardized on Devvit Web, wrapping your frontend canvas in an iframe Webview.

The Backend (Server)
Runtime Engine: Built using a specialized Hono framework router wrapped into the main Devvit entry point.

Data Persistence: Uses Devvit’s built-in Redis KV store (context.redis) for lightning-fast leaderboard data, global state tracking, and collaborative state management across different users.

Reddit API Bridges: Executed solely server-side via context.reddit. Can handle native tasks like submitting sticky comments (context.reddit.submitComment), updating user flairs, or triggering push notifications.

The Frontend (Client)
Tooling Stack: Driven by a Phaser 3 + TypeScript + Vite bundle.

Asset Management: Frontend assets (images, audio sprites) are packaged and processed via Vite. Because of Devvit’s unique cross-origin environment inside the Reddit client app, absolute URLs must be correctly resolved to avoid asset load failure.

Communication Layer: The Phaser client communicates with the Hono server asynchronously using two-way JSON message passing via window.parent.postMessage or standard fetch API hooks mapped to the Hono backend endpoints.

3. Engineering Constraints for Claude to Handle
When generating project files, ensure the following constraints are rigorously followed:

Browser Web Audio Policy: Modern browsers strictly block audio contexts from playing sound files until a user interacts with the canvas. The Phaser implementation must start with an explicit, high-contrast user gesture event (e.g., a "Tap to Start / Unmute" screen) to wake up the AudioContext legally before executing the rhythmic audio loops.

Network Latency vs. Game Loop Loop-Speed: Do not place remote REST API or server calls inside Phaser's high-frequency frame loop (update()). All audio processing, input tracking, rhythmic evaluation, and gameplay states must be computed deterministically in local TypeScript frontend execution. The server should only be hit upon session completion (win/loss triggers), player hand-offs, or milestones.

Reddit Automation Hooks: Upon a player failing a lesson segment, the game backend should automatically submit a custom comment to the parent post thread to generate immediate community banter and engagement loops.
