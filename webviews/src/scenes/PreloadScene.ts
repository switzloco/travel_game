/**
 * PreloadScene — loads every audio cue (and shows a progress bar) AFTER the
 * BootScene gesture has unlocked audio. We deliberately preload here rather than
 * in BootScene so the very first frame is instant and the unlock gesture is the
 * only thing standing between the user and the title.
 */
import Phaser from 'phaser';

import { ALL_CUE_KEYS, audioPath } from '../config/AudioCues.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const { width, height } = this.scale;

    // Add and scale background image to cover the canvas (seamless transition from BootScene)
    const bg = this.add.image(width / 2, height / 2, 'title_bg');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);

    // Dark glassmorphic overlay for maximum progress bar contrast
    this.add.rectangle(width / 2, height / 2, width, height, 0x080f1a, 0.65);

    const barBg = this.add
      .rectangle(width / 2, height / 2, 420, 26, 0x1b2138)
      .setStrokeStyle(2, 0x3a4570);
    const bar = this.add
      .rectangle(barBg.x - 206, height / 2, 0, 18, 0xffd166)
      .setOrigin(0, 0.5);

    this.add
      .text(width / 2, height / 2 - 40, 'Loading cues…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#8b93b8',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      bar.width = 412 * p;
    });

    // Load top-down explorer sprites
    this.load.image('player', 'player.png');
    this.load.image('npc_staff', 'npc_staff.png');
    this.load.image('npc_vendor', 'npc_vendor.png');
    this.load.image('npc_traveler', 'npc_traveler.png');
    this.load.image('npc_guard', 'npc_guard.png');
    this.load.image('speech_bubble', 'speech_bubble.png');
    this.load.image('arrow', 'arrow.png');
    this.load.image('airport_corridor', 'airport_corridor.png');

    // Every cue is keyed by its filename stem (see AudioCues.ts). MP3 ships as
    // silent placeholders today; real Tagalog VO drops in with no code change.
    for (const key of ALL_CUE_KEYS) {
      this.load.audio(key, audioPath(key));
    }
  }

  create(): void {
    this.scene.start('AirportExplorer');
  }
}
