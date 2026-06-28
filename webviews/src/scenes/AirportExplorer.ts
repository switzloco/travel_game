import Phaser from 'phaser';

import { EXPLORER_CUES } from '../config/AudioCues.js';
import { NPC_ENCOUNTERS, type NPCEncounter } from '../config/NPCEncounters.js';
import { postScore } from '../net/api.js';
import { TouchJoystick } from '../ui/TouchJoystick.js';

export class AirportExplorer extends Phaser.Scene {
  // Player state
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerX = 360;
  private playerY = 980;
  private playerSpeed = 5.5;
  private movingLeft = false;

  // Scene elements
  private joystick!: TouchJoystick;
  private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private hintText!: Phaser.GameObjects.Text;
  private instructionArrow!: Phaser.GameObjects.Sprite;
  private interactionBox!: Phaser.GameObjects.Rectangle;
  private bgWidth = 720;
  private worldHeight = 1080;

  // Tweens and logic states
  private bobTween: Phaser.Tweens.Tween | null = null;
  private activeNPC: NPCEncounter | null = null;
  private hasInteractedWithActive = false;
  private isExploring = true;
  private scorePosted = false;

  // NPC sprites tracking for distance checks
  private npcSprites: Array<{ config: NPCEncounter; sprite: Phaser.GameObjects.Sprite; bubble: Phaser.GameObjects.Sprite }> = [];

  constructor() {
    super('AirportExplorer');
  }

  create(): void {
    const { width, height } = this.scale;

    // 1. Add and scale airport corridor background
    const bg = this.add.image(0, 0, 'airport_corridor').setOrigin(0, 0);
    const bgScale = width / bg.width; // width is 720
    bg.setScale(bgScale);
    this.bgWidth = 720;
    this.worldHeight = Math.max(height, bg.height * bgScale);

    // Limit player movement bounds
    this.cameras.main.setBounds(0, 0, 720, this.worldHeight);

    // 2. Add NPCs along the corridor
    NPC_ENCOUNTERS.forEach((npc) => {
      const npcSprite = this.add.sprite(npc.x, npc.y, npc.spriteKey)
        .setOrigin(0.5, 0.5);
      
      const npcScale = 110 / npcSprite.height;
      npcSprite.setScale(npcScale);

      // Add a floating speech bubble above each NPC
      const bubble = this.add.sprite(npc.x, npc.y - 70, 'speech_bubble')
        .setOrigin(0.5, 0.5);
      const bubbleScale = 50 / bubble.height;
      bubble.setScale(bubbleScale).setAlpha(0.85);

      // Simple bobbing float animation for speech bubble
      this.tweens.add({
        targets: bubble,
        y: '-=12',
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });

      this.npcSprites.push({ config: npc, sprite: npcSprite, bubble });
    });

    // 3. Add Player traveler
    this.playerSprite = this.add.sprite(this.playerX, this.playerY, 'player')
      .setOrigin(0.5, 0.5);
    const playerScale = 110 / this.playerSprite.height;
    this.playerSprite.setScale(playerScale);

    // Camera follow player smoothly
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);

    // 4. Directional indicators (arrow pointing direction for NPC instructions)
    this.instructionArrow = this.add.sprite(width / 2, height * 0.35, 'arrow')
      .setOrigin(0.5)
      .setScrollFactor(0); // fixed on UI camera layer
    const arrowScale = 120 / this.instructionArrow.height;
    this.instructionArrow.setScale(arrowScale).setAlpha(0);

    // 5. Instruction dialogue box (bottom)
    this.interactionBox = this.add.rectangle(width / 2, height * 0.85, width - 80, 140, 0x1b2138, 0.85)
      .setStrokeStyle(3, 0xffd166)
      .setAlpha(0)
      .setScrollFactor(0);

    this.hintText = this.add.text(width / 2, height * 0.85, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '26px',
      color: '#ffd166',
      align: 'center',
      fontStyle: 'bold',
      wordWrap: { width: width - 120 },
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0);

    // 6. Setup controls
    if (this.input.keyboard) {
      this.cursorKeys = this.input.keyboard.createCursorKeys();
    }
    
    // Joystick for mobile (placed in bottom-left)
    this.joystick = new TouchJoystick(this, 120, height - 120);

    // Start prompt instruction
    this.showHint('Walk down the terminal and listen to airport staff directions!', 4000);
  }

  override update(_time: number, _delta: number): void {
    if (!this.isExploring) return;

    this.handleMovement();
    this.checkNPCProximity();
    this.checkGoalReached();
  }

  private handleMovement(): void {
    // If speaking with an NPC, block player movement
    if (this.activeNPC && !this.hasInteractedWithActive) return;

    let dx = 0;
    let dy = 0;

    // Keyboard controls
    if (this.cursorKeys) {
      if (this.cursorKeys.left?.isDown) dx = -1;
      else if (this.cursorKeys.right?.isDown) dx = 1;

      if (this.cursorKeys.up?.isDown) dy = -1;
      else if (this.cursorKeys.down?.isDown) dy = 1;
    }

    // Touch Joystick controls (takes precedence if active)
    if (this.joystick.isActive) {
      dx = this.joystick.dirX;
      dy = this.joystick.dirY;
    }

    // Apply movement
    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving) {
      this.playerX += dx * this.playerSpeed;
      this.playerY += dy * this.playerSpeed;

      // Keep player inside walkable bounds
      this.playerX = Phaser.Math.Clamp(this.playerX, 60, 660);
      this.playerY = Phaser.Math.Clamp(this.playerY, 100, this.worldHeight - 60);

      this.playerSprite.setPosition(this.playerX, this.playerY);

      // Flip sprite based on direction
      if (dx < 0 && !this.movingLeft) {
        this.movingLeft = true;
        this.playerSprite.setFlipX(true);
      } else if (dx > 0 && this.movingLeft) {
        this.movingLeft = false;
        this.playerSprite.setFlipX(false);
      }

      // Play bob walking animation
      if (!this.bobTween) {
        this.bobTween = this.tweens.add({
          targets: this.playerSprite,
          y: this.playerY - 8,
          duration: 160,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      } else {
        // Adjust baseline y coordinate for bobbing tween dynamically
        this.bobTween.updateTo('y', this.playerY - 8, true);
      }
    } else {
      if (this.bobTween) {
        this.bobTween.stop();
        this.bobTween = null;
        this.playerSprite.setY(this.playerY);
      }
    }
  }

  private checkNPCProximity(): void {
    let closestNPC: NPCEncounter | null = null;
    let minDistance = 120; // proximity threshold in pixels

    this.npcSprites.forEach(({ config }) => {
      const dist = Phaser.Math.Distance.Between(this.playerX, this.playerY, config.x, config.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestNPC = config;
      }
    });

    if (closestNPC && this.activeNPC !== closestNPC) {
      // Entered new NPC interaction range
      this.activeNPC = closestNPC;
      this.hasInteractedWithActive = false;
      this.triggerInteraction(closestNPC);
    } else if (!closestNPC && this.activeNPC) {
      // Left the NPC range
      this.activeNPC = null;
      this.hideInteractionUI();
    }
  }

  private triggerInteraction(npc: NPCEncounter): void {
    // Stop walk bobbing
    if (this.bobTween) {
      this.bobTween.stop();
      this.bobTween = null;
      this.playerSprite.setY(this.playerY);
    }

    // Play the Tagalog voice audio cue
    if (this.cache.audio.exists(npc.cueKey)) {
      this.sound.play(npc.cueKey);
    }

    // Show direction arrow visual cue
    if (npc.pointDirection) {
      this.instructionArrow.setAlpha(0.95);
      // Reset rotation
      this.instructionArrow.setAngle(0);
      switch (npc.pointDirection) {
        case 'left':
          this.instructionArrow.setAngle(180);
          break;
        case 'up':
          this.instructionArrow.setAngle(-90);
          break;
        case 'down':
          this.instructionArrow.setAngle(90);
          break;
        case 'right':
        default:
          this.instructionArrow.setAngle(0);
          break;
      }

      // Gentle arrow pulse animation
      this.tweens.add({
        targets: this.instructionArrow,
        scale: 1.4,
        duration: 350,
        yoyo: true,
        repeat: 3,
        ease: 'Quad.easeInOut',
      });
    }

    // Show dialogue box at bottom
    this.interactionBox.setAlpha(0.9);
    this.hintText.setText(`📢 ${npc.englishGloss}\nTap to continue...`).setAlpha(1);

    // Set pointer listener to let user clear interaction
    this.input.once('pointerdown', () => {
      this.hasInteractedWithActive = true;
      this.hideInteractionUI();
    });
  }

  private hideInteractionUI(): void {
    this.instructionArrow.setAlpha(0);
    this.interactionBox.setAlpha(0);
    this.hintText.setAlpha(0);
  }

  private checkGoalReached(): void {
    // Win zone is top of the screen (Y <= 150)
    if (this.playerY <= 150 && this.isExploring) {
      this.isExploring = false;
      this.clearGame();
    }
  }

  private clearGame(): void {
    if (this.bobTween) {
      this.bobTween.stop();
      this.bobTween = null;
    }

    this.sound.play('salamat');

    const { width, height } = this.scale;

    // Show beautiful success beach background cover
    const successBg = this.add.image(width / 2, height / 2, 'success_bg').setScrollFactor(0);
    const scaleX = width / successBg.width;
    const scaleY = height / successBg.height;
    successBg.setScale(Math.max(scaleX, scaleY));

    // Dark beach glass overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x080f1a, 0.45).setScrollFactor(0);

    // Hide joystick UI
    this.joystick.setVisible(false);

    // Win message
    this.add.text(width / 2, height * 0.42, '🎉 DESTINATION REACHED!', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '44px',
      color: '#ffd166',
      fontStyle: 'bold',
      align: 'center',
    })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.add.text(width / 2, height * 0.5, 'Salamat! Enjoy your tropical getaway!', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      color: '#cfd6f6',
      align: 'center',
    })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // Submit best explore score (total corridor width)
    if (!this.scorePosted) {
      this.scorePosted = true;
      postScore({ distanceCm: Math.round(this.worldHeight / 10), bestCombo: 4 }).catch((err) =>
        console.error('postScore failed:', err),
      );
    }

    this.offerRestart();
  }

  private offerRestart(): void {
    const btn = this.add
      .text(this.scale.width / 2, this.scale.height * 0.65, '↻ Walk Again', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#ffd166',
        backgroundColor: '#1b2138',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0);

    btn.once('pointerup', () => {
      this.scene.restart();
    });
  }

  private showHint(msg: string, duration: number): void {
    const hint = this.add.text(this.scale.width / 2, this.scale.height * 0.15, msg, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#101935',
      padding: { x: 14, y: 8 },
      align: 'center',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0.9);

    this.time.delayedCall(duration, () => {
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 500,
        onComplete: () => hint.destroy(),
      });
    });
  }
}
