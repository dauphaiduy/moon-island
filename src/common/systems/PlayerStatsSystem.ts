export const STAMINA_BASE        = 100;
export const STAMINA_PER_POINT   = 10;

export const STAMINA_COSTS = {
  hoe:     5,
  water:   3,
  plant:   3,
  harvest: 5,
  fishing: 8,
} as const;

export type StaminaAction = keyof typeof STAMINA_COSTS;

export interface StatsState {
  points:         number;
  strength:       number;
  physical:       number;
  /** Invested stat points in stamina (each = +10 max stamina) */
  stamina:        number;
  currentStamina: number;
}

/**
 * Manages the player's stat points, derived stats, and current stamina.
 *
 * Points are awarded by XPSystem.onLevelUp (1 point per level-up) and
 * spent via spendPoint() in the Stats panel.
 *
 * Stamina is consumed by farming/fishing actions and fully restored at
 * the start of each in-game day.
 */
export class PlayerStatsSystem {
  private _points   = 0;
  private _strength = 0;
  private _physical = 0;
  /** Invested points that expand max stamina */
  private _stamina  = 0;
  private _currentStamina: number;

  /** Fired whenever currentStamina or maxStamina changes */
  onStaminaChange?: () => void;

  constructor() {
    this._currentStamina = STAMINA_BASE;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  get points():          number { return this._points; }
  get strength():        number { return this._strength; }
  get physical():        number { return this._physical; }
  /** Invested stat points in stamina */
  get investedStamina(): number { return this._stamina; }
  get maxStamina():      number { return STAMINA_BASE + this._stamina * STAMINA_PER_POINT; }
  get currentStamina():  number { return this._currentStamina; }

  // ─── Point management ─────────────────────────────────────────────────────

  /** Award one unspent point (called on level-up) */
  addPoint(): void {
    this._points += 1;
  }

  /**
   * Spend one point into a stat.
   * Returns false if no points are available.
   */
  spendPoint(stat: 'strength' | 'physical' | 'stamina'): boolean {
    if (this._points <= 0) return false;
    this._points -= 1;
    if (stat === 'strength') {
      this._strength += 1;
    } else if (stat === 'physical') {
      this._physical += 1;
    } else {
      this._stamina += 1;
      // Immediately extend current stamina by the bonus
      this._currentStamina = Math.min(this._currentStamina + STAMINA_PER_POINT, this.maxStamina);
      this.onStaminaChange?.();
    }
    return true;
  }

  // ─── Stamina actions ──────────────────────────────────────────────────────

  /**
   * Consume `cost` stamina.
   * Returns false (and does NOT deduct) when stamina is insufficient.
   */
  useStamina(cost: number): boolean {
    if (this._currentStamina < cost) return false;
    this._currentStamina -= cost;
    this.onStaminaChange?.();
    return true;
  }

  /** Fully restore stamina to max (called at start of each new in-game day) */
  restoreStamina(): void {
    this._currentStamina = this.maxStamina;
    this.onStaminaChange?.();
  }

  /** Restore `amount` stamina, capped at maxStamina (called when eating food) */
  addStamina(amount: number): void {
    this._currentStamina = Math.min(this._currentStamina + amount, this.maxStamina);
    this.onStaminaChange?.();
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  loadState(s: StatsState): void {
    this._points   = s.points;
    this._strength = s.strength;
    this._physical = s.physical;
    this._stamina  = s.stamina;
    this._currentStamina = Math.min(s.currentStamina, this.maxStamina);
  }

  getState(): StatsState {
    return {
      points:         this._points,
      strength:       this._strength,
      physical:       this._physical,
      stamina:        this._stamina,
      currentStamina: this._currentStamina,
    };
  }
}
