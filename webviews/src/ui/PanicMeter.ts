/**
 * Social Panic Meter — a self-contained, reusable HUD object.
 *
 * Holds NO game logic of its own beyond rendering: AirportDash owns the panic
 * value and calls setValue(). Kept as a Container so it can be positioned/scaled
 * as one unit and dropped into any scene.
 */
import Phaser from 'phaser';

const WIDTH = 480;
const HEIGHT = 38;

export class PanicMeter extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private value = 0; // 0..100

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bg = scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1b2138).setOrigin(0, 0.5);
    this.bg.setStrokeStyle(3, 0x3a4570);

    // Fill is left-anchored so width maps directly to the panic percentage.
    this.fill = scene.add.rectangle(0, 0, 0, HEIGHT - 8, 0x37d67a).setOrigin(0, 0.5);
    this.fill.x = 4;

    this.label = scene.add
      .text(WIDTH / 2, 0, 'PANIC', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#cfd6f6',
      })
      .setOrigin(0.5);

    this.add([this.bg, this.fill, this.label]);
    scene.add.existing(this);
  }

  /** Update the rendered meter. `value` is clamped to 0..100. */
  setValue(value: number): void {
    this.value = Phaser.Math.Clamp(value, 0, 100);
    const usableWidth = WIDTH - 8;
    this.fill.width = (this.value / 100) * usableWidth;
    this.fill.fillColor = this.colorFor(this.value);
  }

  get current(): number {
    return this.value;
  }

  /** Green -> amber -> red as panic climbs, so the cue is readable at a glance. */
  private colorFor(value: number): number {
    if (value >= 80) return 0xff3b3b;
    if (value >= 50) return 0xffb13b;
    return 0x37d67a;
  }
}
