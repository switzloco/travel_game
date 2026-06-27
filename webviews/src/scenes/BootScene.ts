/**
 * BootScene — the mandatory "Tap to Start" gate.
 *
 * Browsers (and the Reddit in-app web view especially) BLOCK the Web Audio
 * AudioContext until a real user gesture occurs. Since this is an audio-first
 * game, we MUST NOT start any cue before that gesture. This scene shows one big
 * high-contrast button, and only on pointerup do we:
 *   1) resume/unlock the Phaser sound manager (which wakes the AudioContext), then
 *   2) hand off to PreloadScene -> AirportDash.
 *
 * Nothing else in the game is allowed to assume audio is unlocked until this runs.
 */
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b1020');

    this.add
      .text(width / 2, height * 0.32, 'BAYANI RELAY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '60px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.32 + 66, 'Manila Airport Dash', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#cfd6f6',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.52, '🔊 Headphones on. This game is all ears.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#8b93b8',
      })
      .setOrigin(0.5);

    // The single, deliberate user gesture that legally unlocks audio.
    const button = this.add
      .rectangle(width / 2, height * 0.68, 320, 80, 0x37d67a)
      .setStrokeStyle(3, 0x2bb866)
      .setInteractive({ useHandCursor: true });

    const buttonLabel = this.add
      .text(width / 2, height * 0.68, 'TAP TO START', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#08130c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Gentle pulse so it's obviously the thing to press.
    this.tweens.add({
      targets: [button, buttonLabel],
      scale: 1.05,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    button.on('pointerup', () => this.unlockAndStart());
  }

  private async unlockAndStart(): Promise<void> {
    // Phaser's sound manager wraps the AudioContext. unlock() / resume the
    // context inside the gesture handler so subsequent cue playback is allowed.
    const sound = this.sound as Phaser.Sound.WebAudioSoundManager;
    if (sound.context && sound.context.state === 'suspended') {
      try {
        await sound.context.resume();
      } catch {
        // Some platforms resume lazily on first play(); proceed regardless.
      }
    }
    this.sound.unlock();

    this.scene.start('PreloadScene');
  }
}
