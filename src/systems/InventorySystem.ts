import type { ItemId, InventorySlot } from '../types';
import { ITEMS, FISH_NAME_MAP } from '../data/items';

export { ITEMS } from '../data/items';

// ─── InventorySystem ──────────────────────────────────────────────────────────

export class InventorySystem {
  static readonly MAX_SLOTS = 24;
  static readonly HOTBAR_SLOTS = 8;

  private slots: (InventorySlot | null)[] = Array(InventorySystem.MAX_SLOTS).fill(null);
  private _gold = 0;

  // Callbacks — set from GameScene / UIScene
  onChange?: () => void;

  get gold(): number { return this._gold; }

  // ─── Add / remove ───────────────────────────────────────────────────────────

  /** Add an item by ItemId. Returns leftover qty if inventory is full. */
  add(id: ItemId, qty = 1): number {
    const def = ITEMS[id];

    // Try to stack into existing slot first
    for (const slot of this.slots) {
      if (slot && slot.item.id === id && slot.qty < def.maxStack) {
        const space = def.maxStack - slot.qty;
        const toAdd = Math.min(qty, space);
        slot.qty += toAdd;
        qty -= toAdd;
        if (qty <= 0) { this.onChange?.(); return 0; }
      }
    }

    // Find empty slot
    while (qty > 0) {
      const emptyIdx = this.slots.findIndex(s => s === null);
      if (emptyIdx === -1) break; // full
      const toAdd = Math.min(qty, def.maxStack);
      this.slots[emptyIdx] = { item: def, qty: toAdd };
      qty -= toAdd;
    }

    this.onChange?.();
    return qty; // leftover (0 if all added)
  }

  /** Add a fish by its display name (from FishingSystem). */
  addFish(fishName: string): boolean {
    const id = FISH_NAME_MAP[fishName];
    if (!id) return false;
    return this.add(id) === 0;
  }

  /** Add a harvested crop (random type for now). */
  addHarvest(): ItemId {
    const crops: ItemId[] = ['crop_wheat', 'crop_carrot', 'crop_tomato'];
    const id = crops[Math.floor(Math.random() * crops.length)];
    this.add(id, Math.floor(Math.random() * 3) + 1);
    return id;
  }

  remove(slotIndex: number, qty = 1): boolean {
    const slot = this.slots[slotIndex];
    if (!slot || slot.qty < qty) return false;
    slot.qty -= qty;
    if (slot.qty <= 0) this.slots[slotIndex] = null;
    this.onChange?.();
    return true;
  }

  /** Sell everything — add gold. */
  sellAll(): number {
    let earned = 0;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot) {
        earned += slot.item.sellPrice * slot.qty;
        this.slots[i] = null;
      }
    }
    this._gold += earned;
    this.onChange?.();
    return earned;
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  getSlot(index: number): InventorySlot | null {
    return this.slots[index] ?? null;
  }

  getHotbar(): (InventorySlot | null)[] {
    return this.slots.slice(0, InventorySystem.HOTBAR_SLOTS);
  }

  getAllSlots(): (InventorySlot | null)[] {
    return [...this.slots];
  }

  isFull(): boolean {
    return this.slots.every(s => s !== null);
  }

  count(id: ItemId): number {
    return this.slots.reduce((sum, s) => sum + (s?.item.id === id ? s.qty : 0), 0);
  }


  /** Remove items by ItemId — used by quest system */
  removeByIdAndQty(id: ItemId, qty: number): boolean {
    let remaining = qty;
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const slot = this.slots[i];
      if (!slot || slot.item.id !== id) continue;
      const take = Math.min(slot.qty, remaining);
      slot.qty  -= take;
      remaining -= take;
      if (slot.qty <= 0) this.slots[i] = null;
    }
    this.onChange?.();
    return remaining === 0;
  }

  /** Add/subtract gold directly (positive = earn, negative = spend) */
  adjustGold(delta: number): boolean {
    if (this._gold + delta < 0) return false;
    this._gold += delta;
    this.onChange?.();
    return true;
  }

  /** Swap two slots (used by the inventory panel UI) */
  swapSlots(a: number, b: number): void {
    const tmp = this.slots[a];
    this.slots[a] = this.slots[b];
    this.slots[b] = tmp;
    this.onChange?.();
  }

  /** Restore inventory state from a save file */
  loadState(slots: ({ id: ItemId; qty: number } | null)[], gold: number): void {
    this.slots = Array(InventorySystem.MAX_SLOTS).fill(null);
    for (let i = 0; i < slots.length && i < InventorySystem.MAX_SLOTS; i++) {
      const s = slots[i];
      if (s && ITEMS[s.id]) {
        this.slots[i] = { item: ITEMS[s.id], qty: s.qty };
      }
    }
    this._gold = gold;
    this.onChange?.();
  }
}
