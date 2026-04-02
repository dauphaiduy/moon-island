import Phaser from 'phaser';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';

export interface DayNightState {
  day:        number;       // ngày hiện tại (bắt đầu từ 1)
  hour:       number;       // 0–23
  minute:     number;       // 0–59
  timeOfDay:  TimeOfDay;
  tint:       number;       // hex color áp lên camera
  alpha:      number;       // độ tối overlay (0=sáng, 1=tối đen)
}

// ─── Config ───────────────────────────────────────────────────────────────────

// 1 game-minute = bao nhiêu ms thật (60 = 1 phút thật = 1 giờ game)
const MS_PER_GAME_MINUTE = 600; // 1 ngày game = 24*60*600ms = ~14.4 giây thật

// Keyframes: [hour, tintHex, overlayAlpha]
// Phaser.Display.Color.Interpolate dùng để nội suy giữa các mốc
const KEYFRAMES: { hour: number; tint: number; alpha: number; label: TimeOfDay }[] = [
  { hour:  0, tint: 0x0a0a2e, alpha: 0.72, label: 'night'     },
  { hour:  5, tint: 0x1a1a4e, alpha: 0.60, label: 'night'     },
  { hour:  6, tint: 0xf4845f, alpha: 0.20, label: 'dawn'      },
  { hour:  7, tint: 0xffd580, alpha: 0.05, label: 'morning'   },
  { hour: 10, tint: 0xffffff, alpha: 0.00, label: 'morning'   },
  { hour: 12, tint: 0xffffff, alpha: 0.00, label: 'noon'      },
  { hour: 14, tint: 0xfffde8, alpha: 0.00, label: 'afternoon' },
  { hour: 17, tint: 0xffc97a, alpha: 0.08, label: 'afternoon' },
  { hour: 19, tint: 0xe8724a, alpha: 0.25, label: 'dusk'      },
  { hour: 20, tint: 0x3a2060, alpha: 0.45, label: 'night'     },
  { hour: 22, tint: 0x0d0d2e, alpha: 0.65, label: 'night'     },
  { hour: 24, tint: 0x0a0a2e, alpha: 0.72, label: 'night'     }, // wrap = hour 0
];

// ─── DayNightSystem ───────────────────────────────────────────────────────────

export class DayNightSystem {
  private _day    = 1;
  private _minute = 0;          // total game minutes elapsed today (0–1439)
  private _accMs  = 0;          // ms accumulator

  // Callbacks
  onNewDay?: (day: number) => void;
  onTimeChange?: (state: DayNightState) => void;

  get state(): DayNightState {
    const totalMin = this._minute;
    const hour     = Math.floor(totalMin / 60);
    const minute   = totalMin % 60;
    const { tint, alpha, label } = this.interpolate(hour + minute / 60);
    return { day: this._day, hour, minute, timeOfDay: label, tint, alpha };
  }

  /** Call from GameScene.update() with delta in ms */
  update(delta: number): void {
    this._accMs += delta;

    if (this._accMs < MS_PER_GAME_MINUTE) return;

    const ticks = Math.floor(this._accMs / MS_PER_GAME_MINUTE);
    this._accMs %= MS_PER_GAME_MINUTE;

    const prevHour = Math.floor(this._minute / 60);
    this._minute  += ticks;

    if (this._minute >= 24 * 60) {
      this._minute -= 24 * 60;
      this._day++;
      this.onNewDay?.(this._day);
    }

    // Fire callback only when hour changes (avoid every-frame updates)
    const newHour = Math.floor(this._minute / 60);
    if (newHour !== prevHour) {
      this.onTimeChange?.(this.state);
    }
  }

  // Force a specific time (useful for testing)
  setTime(hour: number, minute = 0): void {
    this._minute = Math.max(0, Math.min(23 * 60 + 59, hour * 60 + minute));
    this.onTimeChange?.(this.state);
  }

  /** Restore day/time from a save file */
  loadState(day: number, totalMinute: number): void {
    this._day    = Math.max(1, day);
    this._minute = Math.max(0, Math.min(23 * 60 + 59, totalMinute));
    this._accMs  = 0;
    this.onTimeChange?.(this.state);
  }

  // ─── Interpolation ──────────────────────────────────────────────────────────

  private interpolate(decimalHour: number): { tint: number; alpha: number; label: TimeOfDay } {
    // Find surrounding keyframes
    let from = KEYFRAMES[KEYFRAMES.length - 2];
    let to   = KEYFRAMES[KEYFRAMES.length - 1];

    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (decimalHour >= KEYFRAMES[i].hour && decimalHour < KEYFRAMES[i + 1].hour) {
        from = KEYFRAMES[i];
        to   = KEYFRAMES[i + 1];
        break;
      }
    }

    const t = (decimalHour - from.hour) / (to.hour - from.hour);

    // Lerp tint color channel by channel
    const fc = Phaser.Display.Color.IntegerToColor(from.tint);
    const tc = Phaser.Display.Color.IntegerToColor(to.tint);
    const r  = Math.round(fc.red   + (tc.red   - fc.red)   * t);
    const g  = Math.round(fc.green + (tc.green - fc.green) * t);
    const b  = Math.round(fc.blue  + (tc.blue  - fc.blue)  * t);
    const tint = Phaser.Display.Color.GetColor(r, g, b);

    const alpha = from.alpha + (to.alpha - from.alpha) * t;

    // label: whichever keyframe we're closer to
    const label = t < 0.5 ? from.label : to.label;

    return { tint, alpha, label };
  }
}