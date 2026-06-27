import Phaser from 'phaser';

export class TouchJoystick extends Phaser.GameObjects.Container {
  private readonly baseCircle: Phaser.GameObjects.Arc;
  private readonly thumbCircle: Phaser.GameObjects.Arc;
  private readonly maxDistance = 60;
  
  private vectorX = 0; // -1 .. 1
  private vectorY = 0; // -1 .. 1
  private activePointer: Phaser.Input.Pointer | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Joystick base (semi-transparent dark circle)
    this.baseCircle = scene.add.circle(0, 0, this.maxDistance, 0x1b2138, 0.4)
      .setStrokeStyle(3, 0xffd166, 0.6);

    // Joystick thumb handle (brighter circle)
    this.thumbCircle = scene.add.circle(0, 0, 26, 0xffd166, 0.8)
      .setStrokeStyle(2, 0xffffff, 0.8);

    this.add([this.baseCircle, this.thumbCircle]);
    scene.add.existing(this);

    // Make interactive for touch dragging
    const interactiveArea = scene.add.circle(x, y, this.maxDistance + 20, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    interactiveArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.activePointer = pointer;
      this.updateJoystick(pointer);
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer && this.activePointer.id === pointer.id) {
        this.updateJoystick(pointer);
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.activePointer && this.activePointer.id === pointer.id) {
        this.resetJoystick();
      }
    });

    // Make sure we clean up the interactive area if the joystick is destroyed
    this.once('destroy', () => {
      interactiveArea.destroy();
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.x;
    const dy = pointer.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this.vectorX = 0;
      this.vectorY = 0;
      this.thumbCircle.setPosition(0, 0);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDistance = Math.min(distance, this.maxDistance);

    const thumbX = clampedDistance * Math.cos(angle);
    const thumbY = clampedDistance * Math.sin(angle);

    this.thumbCircle.setPosition(thumbX, thumbY);

    // Normalize vectors between -1 and 1
    this.vectorX = thumbX / this.maxDistance;
    this.vectorY = thumbY / this.maxDistance;
  }

  private resetJoystick(): void {
    this.activePointer = null;
    this.vectorX = 0;
    this.vectorY = 0;
    this.thumbCircle.setPosition(0, 0);
  }

  /** Current horizontal movement vector (-1 to 1) */
  get dirX(): number {
    return this.vectorX;
  }

  /** Current vertical movement vector (-1 to 1) */
  get dirY(): number {
    return this.vectorY;
  }

  /** Whether the joystick is currently dragged/active */
  get isActive(): boolean {
    return this.activePointer !== null;
  }
}
