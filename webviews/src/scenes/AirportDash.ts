/**
 * AirportDash — the main gameplay scene for Level 1.
 *
 * A rhythmic "social survival" sim: the player navigates NAIA airport purely by
 * reacting to spoken Tagalog cues before the Social Panic Meter fills. This scene
 * is deliberately AUDIO-FIRST — cue playback drives every decision; on-screen text
 * is minimal scaffolding/feedback only.
 *
 * It scaffolds the three Pimsleur-Lesson-1 mechanics as modular methods:
 *   1) startSyllableBuild()  — back-to-front rhythmic taps (dihan→tindihan→naiintindihan)
 *   2) startBinaryChoice()   — Naiintindihan vs Hindi, with the "Hati" phonetic trap
 *   3) startKontiSlider()     — stop the cursor in the polite "Konti lang" sweet spot
 *
 * HARD RULES honored here:
 *   - update() contains NO network calls; all panic/rhythm/input math is local.
 *   - The server is hit exactly once, on loss (postFail) or clear (postScore).
 *   - Audio is assumed unlocked by BootScene; we re-check and bail to a safe
 *     overlay if it somehow isn't.
 */
import Phaser from 'phaser';

import type { FailPayload, FailPhase, TargetWord } from '../../../shared/types.js';
import {
  CHOICE_CUES,
  FEEDBACK_CUES,
  KONTI_CUE,
  SYLLABLE_CUES,
  type ChoiceCue,
} from '../config/AudioCues.js';
import { postFail, postScore } from '../net/api.js';
import { PanicMeter } from '../ui/PanicMeter.js';

/** Which mini-mechanic is currently active. */
type Phase = 'idle' | 'syllable_build' | 'binary_choice' | 'konti_slider' | 'over';

/** How many successful mechanics make a winning relay. */
const ROUNDS_TO_CLEAR = 6;

/** Panic tuning (all values are "panic points", meter is 0..100). */
const PANIC = {
  /** Passive social pressure per second while a round is live. */
  rampPerSecond: 4,
  /** Reward for a correct, on-time reaction. */
  rewardCorrect: -14,
  /** Penalty for a wrong button / missed window / trap. */
  penaltyWrong: 22,
  /** Distance (cm) credited per cleared mechanic — feeds the community relay. */
  cmPerRound: 35,
} as const;

export class AirportDash extends Phaser.Scene {
  private panic = 0;
  private comboStreak = 0;
  private bestCombo = 0;
  private distanceCm = 0;
  private round = 0;
  private phase: Phase = 'idle';

  /** The cue the player is currently being judged on (for the fail payload). */
  private currentWord: TargetWord = 'naiintindihan';

  /** Set true the moment we resolve the run, so the server is hit only once. */
  private resolved = false;

  private meter!: PanicMeter;
  private hint!: Phaser.GameObjects.Text;

  /** Live listeners/timers for the active mechanic, torn down on each transition. */
  private activeCleanups: Array<() => void> = [];

  constructor() {
    super('AirportDash');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101935');

    this.meter = new PanicMeter(this, this.scale.width / 2 - 160, 40);

    this.hint = this.add
      .text(this.scale.width / 2, this.scale.height * 0.78, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#8b93b8',
        align: 'center',
        wordWrap: { width: this.scale.width - 60 },
      })
      .setOrigin(0.5);

    // Safety net: BootScene should have unlocked audio. If not, pause and wait.
    if (this.sound.locked) {
      this.showLockedOverlay();
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.beginRelay());
      return;
    }

    this.beginRelay();
  }

  /**
   * Local-only per-frame update: applies passive panic ramp and repaints the
   * meter. NEVER touches the network (see class header contract).
   */
  override update(_time: number, delta: number): void {
    if (this.phase === 'idle' || this.phase === 'over') return;

    this.changePanic((PANIC.rampPerSecond * delta) / 1000);
    if (this.panic >= 100 && !this.resolved) {
      this.fail(this.currentWord, this.phaseToFailPhase());
    }
  }

  /* ----------------------------------------------------------------------- */
  /*  Relay flow                                                              */
  /* ----------------------------------------------------------------------- */

  private beginRelay(): void {
    this.panic = 30; // start mid-tense; mechanic 1 (syllables) lets you breathe.
    this.meter.setValue(this.panic);
    this.nextRound();
  }

  /** Advance the relay: pick the next mechanic, or declare victory. */
  private nextRound(): void {
    this.teardownActive();
    if (this.resolved) return;

    if (this.round >= ROUNDS_TO_CLEAR) {
      this.clear();
      return;
    }
    this.round += 1;

    // Round 1 always eases the player in with the syllable build-up; after that
    // we alternate the two reactive mechanics.
    if (this.round === 1) {
      this.startSyllableBuild();
    } else if (this.round % 2 === 0) {
      this.startBinaryChoice();
    } else {
      this.startKontiSlider();
    }
  }

  /** Called by a mechanic when the player nails it. */
  private succeedRound(): void {
    this.changePanic(PANIC.rewardCorrect);
    this.comboStreak += 1;
    this.bestCombo = Math.max(this.bestCombo, this.comboStreak);
    this.distanceCm += PANIC.cmPerRound;
    this.playFeedback(FEEDBACK_CUES.correct.key);
    this.time.delayedCall(450, () => this.nextRound());
  }

  /** Called by a mechanic on a wrong/late/trapped input. */
  private failRound(word: TargetWord, phase: FailPhase): void {
    this.currentWord = word;
    this.comboStreak = 0;
    this.changePanic(PANIC.penaltyWrong);
    this.playFeedback(FEEDBACK_CUES.wrong.key);
    if (this.panic >= 100) {
      this.fail(word, phase);
    } else {
      // Survivable mistake — same mechanic gets retried via nextRound's pointer.
      this.round -= 1;
      this.time.delayedCall(500, () => this.nextRound());
    }
  }

  /* ----------------------------------------------------------------------- */
  /*  MECHANIC 1 — Syllable Build-up (rhythmic, back-to-front)                */
  /* ----------------------------------------------------------------------- */

  private startSyllableBuild(): void {
    this.phase = 'syllable_build';
    this.currentWord = 'naiintindihan';
    this.setHint('Tap on every syllable beat…');

    const beatGap = 850; // ms between syllable cues — the rhythm to match.
    const tapWindow = 320; // ms tolerance around each beat.
    let beatIndex = 0;
    let awaitingTap = false;
    let hitsNeeded = SYLLABLE_CUES.length;

    const onTap = () => {
      if (!awaitingTap) {
        // Tapped off-beat — small social misstep.
        this.changePanic(6);
        return;
      }
      awaitingTap = false;
      hitsNeeded -= 1;
      this.changePanic(-6);
      this.flash(0x37d67a);
      if (hitsNeeded === 0) {
        this.succeedRound();
      }
    };
    this.input.on('pointerdown', onTap);
    this.registerCleanup(() => this.input.off('pointerdown', onTap));

    // Schedule each syllable cue; open a tap window right after it plays.
    SYLLABLE_CUES.forEach((cue, i) => {
      const timer = this.time.delayedCall(i * beatGap, () => {
        this.sound.play(cue.key);
        beatIndex = i;
        awaitingTap = true;
        const closeWindow = this.time.delayedCall(tapWindow, () => {
          if (awaitingTap) {
            // Missed the beat entirely.
            awaitingTap = false;
            this.changePanic(8);
          }
        });
        this.registerCleanup(() => closeWindow.remove());
      });
      this.registerCleanup(() => timer.remove());
    });
    void beatIndex;
  }

  /* ----------------------------------------------------------------------- */
  /*  MECHANIC 2 — Binary Audio Choice (Naiintindihan vs Hindi, +Hati trap)  */
  /* ----------------------------------------------------------------------- */

  private startBinaryChoice(): void {
    this.phase = 'binary_choice';
    const cue = Phaser.Utils.Array.GetRandom(CHOICE_CUES) as ChoiceCue;
    this.currentWord = cue.word;
    this.setHint('Listen — hit the word you heard. (Some are traps!)');

    const left = this.makeButton(this.scale.width / 2 - 110, this.scale.height / 2, 'NAIINTINDIHAN', 0x4f8cff);
    const right = this.makeButton(this.scale.width / 2 + 110, this.scale.height / 2, 'HINDI', 0xff7a59);

    let answered = false;
    const decisionWindow = 1500; // ms to react before it counts as a freeze.

    const answer = (choice: 'naiintindihan' | 'hindi') => {
      if (answered) return;
      answered = true;
      if (cue.answer === choice) {
        this.succeedRound();
      } else {
        // Wrong button — or they pressed at all on the "Hati" trap.
        this.failRound(cue.word, 'binary_choice');
      }
    };

    left.zone.on('pointerdown', () => answer('naiintindihan'));
    right.zone.on('pointerdown', () => answer('hindi'));
    this.registerCleanup(() => {
      left.destroy();
      right.destroy();
    });

    // Play the cue, then open the decision window. For the "Hati" distractor the
    // CORRECT play is to NOT press anything — waiting it out is a success.
    this.sound.play(cue.key);
    const window = this.time.delayedCall(decisionWindow, () => {
      if (answered) return;
      answered = true;
      if (cue.answer === 'none') {
        this.succeedRound(); // correctly ignored the trap
      } else {
        this.failRound(cue.word, 'binary_choice'); // froze on a real cue
      }
    });
    this.registerCleanup(() => window.remove());
  }

  /* ----------------------------------------------------------------------- */
  /*  MECHANIC 3 — "Konti Lang" Slider (stop in the polite sweet spot)       */
  /* ----------------------------------------------------------------------- */

  private startKontiSlider(): void {
    this.phase = 'konti_slider';
    this.currentWord = 'konti_lang';
    this.setHint('Say "just a little"… stop the marker in the green.');

    const barW = 360;
    const barX = this.scale.width / 2 - barW / 2;
    const barY = this.scale.height / 2;

    this.add.rectangle(this.scale.width / 2, barY, barW, 26, 0x1b2138).setStrokeStyle(2, 0x3a4570);

    // The "polite sweet spot": a narrow zone the player must stop inside.
    const spotW = 54;
    const spotCenter = barX + barW * Phaser.Math.FloatBetween(0.35, 0.65);
    const sweet = this.add.rectangle(spotCenter, barY, spotW, 22, 0x37d67a).setAlpha(0.5);

    const cursor = this.add.rectangle(barX, barY, 8, 34, 0xffd166);

    // The cursor sweeps back and forth, synced to the cue length/feel.
    const sweep = this.tweens.add({
      targets: cursor,
      x: barX + barW,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.registerCleanup(() => sweep.remove());

    this.sound.play(KONTI_CUE.key);

    let stopped = false;
    const onStop = () => {
      if (stopped) return;
      stopped = true;
      sweep.pause();
      const dist = Math.abs(cursor.x - spotCenter);
      if (dist <= spotW / 2) {
        this.succeedRound();
      } else {
        this.failRound('konti_lang', 'konti_slider');
      }
    };
    this.input.on('pointerdown', onStop);
    this.registerCleanup(() => {
      this.input.off('pointerdown', onStop);
      sweet.destroy();
      cursor.destroy();
    });
  }

  /* ----------------------------------------------------------------------- */
  /*  Resolution — the ONLY places that touch the network                    */
  /* ----------------------------------------------------------------------- */

  private fail(word: TargetWord, phase: FailPhase): void {
    if (this.resolved) return;
    this.resolved = true;
    this.phase = 'over';
    this.teardownActive();
    this.panic = 100;
    this.meter.setValue(100);
    this.playFeedback(FEEDBACK_CUES.panic.key);
    this.setHint('😱 SOCIAL PANIC! You froze at immigration.');

    const payload: FailPayload = {
      failedWord: word,
      phase,
      distanceCm: Math.round(this.distanceCm),
    };
    // Single, post-session server hit (never in update()). Best-effort.
    postFail(payload)
      .then((res) => {
        if (res.banterComment) this.setHint(`😱 ${res.banterComment}`);
      })
      .catch((err) => console.error('postFail failed:', err));

    this.offerRestart();
  }

  private clear(): void {
    if (this.resolved) return;
    this.resolved = true;
    this.phase = 'over';
    this.teardownActive();
    this.setHint('🎉 You made it through NAIA. Salamat!');

    postScore({ distanceCm: Math.round(this.distanceCm), bestCombo: this.bestCombo }).catch((err) =>
      console.error('postScore failed:', err),
    );

    this.offerRestart();
  }

  private offerRestart(): void {
    const btn = this.add
      .text(this.scale.width / 2, this.scale.height * 0.6, '↻ Try again', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffd166',
        backgroundColor: '#1b2138',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.once('pointerup', () => this.scene.restart());
  }

  /* ----------------------------------------------------------------------- */
  /*  Helpers                                                                 */
  /* ----------------------------------------------------------------------- */

  private changePanic(delta: number): void {
    this.panic = Phaser.Math.Clamp(this.panic + delta, 0, 100);
    this.meter.setValue(this.panic);
  }

  private setHint(text: string): void {
    this.hint.setText(text);
  }

  /** Play a feedback sting if it exists in the cache (placeholders are silent). */
  private playFeedback(key: string): void {
    if (this.cache.audio.exists(key)) this.sound.play(key);
  }

  private flash(color: number): void {
    const fx = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, color, 0.18);
    this.tweens.add({ targets: fx, alpha: 0, duration: 220, onComplete: () => fx.destroy() });
  }

  /** A simple labeled button = an interactive zone + rectangle + text. */
  private makeButton(x: number, y: number, label: string, color: number) {
    const rect = this.add.rectangle(x, y, 180, 70, color).setStrokeStyle(3, 0xffffff, 0.25);
    const txt = this.add
      .text(x, y, label, { fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const zone = this.add.zone(x, y, 180, 70).setInteractive({ useHandCursor: true });
    return {
      zone,
      destroy: () => {
        rect.destroy();
        txt.destroy();
        zone.destroy();
      },
    };
  }

  private showLockedOverlay(): void {
    this.setHint('Tap anywhere to enable sound…');
  }

  private phaseToFailPhase(): FailPhase {
    return this.phase === 'over' || this.phase === 'idle' ? 'binary_choice' : this.phase;
  }

  /** Register a teardown fn for the active mechanic so transitions are clean. */
  private registerCleanup(fn: () => void): void {
    this.activeCleanups.push(fn);
  }

  private teardownActive(): void {
    for (const fn of this.activeCleanups.splice(0)) {
      try {
        fn();
      } catch {
        /* ignore individual teardown errors */
      }
    }
  }
}
