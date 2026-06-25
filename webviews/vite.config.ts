import { defineConfig } from 'vite';

// Devvit serves the web view from a cross-origin sandbox, so every asset URL
// must be RELATIVE (base: './'). Absolute '/foo.png' paths fail to load inside
// the Reddit client iframe — this is the single most common Devvit asset bug.
export default defineConfig({
  root: __dirname,
  base: './',
  // Files in webviews/assets/ (audio cues, etc.) are copied verbatim to the
  // build root, so Phaser loads them as e.g. 'audio/dihan.mp3'.
  publicDir: 'assets',
  build: {
    // Output into dist/client at the project root — matches devvit.json `post.dir`.
    outDir: '../dist/client',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
  },
});
