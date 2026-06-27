/**
 * Phaser game bootstrap.
 *
 * Scene order matters: BootScene MUST run first because it owns the mandatory
 * "Tap to Start" gesture that unlocks the Web Audio context — nothing audio-
 * related is allowed before it. Then PreloadScene loads cues, then AirportDash
 * runs the actual game.
 */
import Phaser from 'phaser';

import { AirportExplorer } from './scenes/AirportExplorer.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#0b1020',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Portrait-ish canvas that fits comfortably inside a Reddit post web view.
    width: 720,
    height: 1080,
  },
  audio: {
    // We manage unlock explicitly in BootScene; Phaser still respects the gesture.
    disableWebAudio: false,
  },
  scene: [BootScene, PreloadScene, AirportExplorer],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
