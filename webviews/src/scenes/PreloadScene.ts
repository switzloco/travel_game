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

    const barBg = this.add
      .rectangle(width / 2, height / 2, 280, 18, 0x1b2138)
      .setStrokeStyle(2, 0x3a4570);
    const bar = this.add
      .rectangle(barBg.x - 137, height / 2, 0, 12, 0xffd166)
      .setOrigin(0, 0.5);

    this.add
      .text(width / 2, height / 2 - 30, 'Loading cues…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8b93b8',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      bar.width = 274 * p;
    });

    // Every cue is keyed by its filename stem (see AudioCues.ts). MP3 ships as
    // silent placeholders today; real Tagalog VO drops in with no code change.
    for (const key of ALL_CUE_KEYS) {
      this.load.audio(key, audioPath(key));
    }
  }

  create(): void {
    this.scene.start('AirportDash');
  }
}
