import Phaser from 'phaser';
import { FISHING } from '../constants';
import type { FishingState } from '../types';

export class FishingSystem {
  private state: FishingState = {
    isActive:      false,
    isCasting:     false,
    isBiting:      false,
    catchProgress: 0,
  };

  private castTimer: Phaser.Time.TimerEvent | null = null;
  private biteTimer: Phaser.Time.TimerEvent | null = null;
  private scene: Phaser.Scene;

  // Callbacks — set these from GameScene
  onCatch?: (fish: string) => void;
  onMiss?:  () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isActive(): boolean { return this.state.isActive; }
  get isBiting(): boolean { return this.state.isBiting; }

  /** Start casting — call when player presses interact near water */
  cast(): void {
    if (this.state.isActive) return;

    this.state = { isActive: true, isCasting: true, isBiting: false, catchProgress: 0 };

    this.castTimer = this.scene.time.delayedCall(FISHING.CAST_TIME_MS, () => {
      this.state.isCasting = false;
      this.waitForBite();
    });
  }

  private waitForBite(): void {
    const delay = Phaser.Math.Between(1000, 4000);
    this.biteTimer = this.scene.time.delayedCall(delay, () => {
      this.state.isBiting = true;

      // Miss window
      this.scene.time.delayedCall(FISHING.BITE_WINDOW_MS, () => {
        if (this.state.isBiting) {
          this.state.isBiting = false;
          this.onMiss?.();
          this.reset();
        }
      });
    });
  }

  /** Call when player presses interact while isBiting */
  reel(): void {
    if (!this.state.isBiting) return;

    const fish = this.randomFish();
    this.onCatch?.(fish);
    this.reset();
  }

  cancel(): void {
    this.reset();
  }

  private reset(): void {
    this.castTimer?.remove();
    this.biteTimer?.remove();
    this.castTimer = null;
    this.biteTimer = null;
    this.state = { isActive: false, isCasting: false, isBiting: false, catchProgress: 0 };
  }

  private randomFish(): string {
    const fish = ['Cá chép', 'Cá rô', 'Cá lóc', 'Cá trê', 'Cá vàng hiếm'];
    return fish[Math.floor(Math.random() * fish.length)];
  }

  /** Returns status text for UI */
  getStatusText(): string {
    if (!this.state.isActive)  return '';
    if (this.state.isCasting)  return '🎣 Đang thả câu...';
    if (this.state.isBiting)   return '⚡ CÁ CẮN! Nhấn E!';
    return '⏳ Đang chờ cá...';
  }
}
