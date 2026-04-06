import type { ItemId } from '../types';

export interface DungeonLootEntry {
  itemId: ItemId;
  qty: number;
}

/**
 * In-memory loot transfer buffer.
 * DungeonScene pushes collected items here; GameSession drains them on the
 * next load cycle so they land in the player's overworld inventory.
 */
const pending: DungeonLootEntry[] = [];

export const DungeonLoot = {
  add(itemId: ItemId, qty = 1): void {
    const existing = pending.find(e => e.itemId === itemId);
    if (existing) { existing.qty += qty; }
    else          { pending.push({ itemId, qty }); }
  },

  /** Remove and return all pending entries. */
  drain(): DungeonLootEntry[] {
    return pending.splice(0, pending.length);
  },

  get hasPending(): boolean { return pending.length > 0; },
};
