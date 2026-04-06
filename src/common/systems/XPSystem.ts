export const MAX_LEVEL = 20;

/** XP required to advance from level `l` to `l+1` (quadratic-ish growth). */
const xpForStep = (l: number): number => Math.floor(100 * Math.pow(l, 1.4));

/** Cumulative XP needed to reach `targetLevel` from level 1. */
function cumulativeXP(targetLevel: number): number {
  let total = 0;
  for (let i = 1; i < targetLevel; i++) total += xpForStep(i);
  return total;
}

// ─── Dungeon loot XP (flat per item) ────────────────────────────────────────
export const XP_GRANTS = {
  DUNGEON_LOOT: 30,
} as const;

// ─── XPSystem ─────────────────────────────────────────────────────────────────

export class XPSystem {
  private _xp    = 0;
  private _level = 1;

  /** Fires after every successful xp.add() call, with final state. */
  onXPChange?: () => void;
  /** Fires in addition when a level-up occurs. */
  onLevelUp?: (newLevel: number) => void;

  get xp():    number { return this._xp; }
  get level(): number { return this._level; }

  /** Progress 0..1 through the current level band. Returns 1 at MAX_LEVEL. */
  get progress(): number {
    if (this._level >= MAX_LEVEL) return 1;
    const floor = cumulativeXP(this._level);
    const ceil  = cumulativeXP(this._level + 1);
    return (this._xp - floor) / (ceil - floor);
  }

  /** XP remaining until next level-up. 0 at MAX_LEVEL. */
  get xpToNext(): number {
    if (this._level >= MAX_LEVEL) return 0;
    return cumulativeXP(this._level + 1) - this._xp;
  }

  /** Add XP, advancing level(s) as needed. */
  add(amount: number): void {
    if (this._level >= MAX_LEVEL || amount <= 0) return;
    this._xp += amount;
    while (this._level < MAX_LEVEL && this._xp >= cumulativeXP(this._level + 1)) {
      this._level++;
      this.onLevelUp?.(this._level);
    }
    this.onXPChange?.();
  }

  /** Restore state from a save file (does NOT fire callbacks). */
  loadState(xp: number, level: number): void {
    this._xp    = Math.max(0, xp);
    this._level = Math.min(Math.max(1, level), MAX_LEVEL);
  }

  getState(): { xp: number; level: number } {
    return { xp: this._xp, level: this._level };
  }
}
