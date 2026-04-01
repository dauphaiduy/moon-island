import type { ItemId, ItemDef, InventorySlot } from '../types';

// ─── Item database ────────────────────────────────────────────────────────────

export const ITEMS: Record<ItemId, ItemDef> = {
  crop_wheat:   { id: 'crop_wheat',   name: 'Lúa mì',    emoji: '🌾', maxStack: 99, category: 'crop', sellPrice: 20  },
  crop_carrot:  { id: 'crop_carrot',  name: 'Cà rốt',    emoji: '🥕', maxStack: 99, category: 'crop', sellPrice: 35  },
  crop_tomato:  { id: 'crop_tomato',  name: 'Cà chua',   emoji: '🍅', maxStack: 99, category: 'crop', sellPrice: 50  },
  fish_carp:    { id: 'fish_carp',    name: 'Cá chép',   emoji: '🐟', maxStack: 30, category: 'fish', sellPrice: 40  },
  fish_bass:    { id: 'fish_bass',    name: 'Cá rô',     emoji: '🐠', maxStack: 30, category: 'fish', sellPrice: 55  },
  fish_catfish: { id: 'fish_catfish', name: 'Cá trê',    emoji: '🐡', maxStack: 30, category: 'fish', sellPrice: 60  },
  fish_rare:    { id: 'fish_rare',    name: 'Cá vàng',   emoji: '✨', maxStack: 10, category: 'fish', sellPrice: 250 },
  seed_wheat:   { id: 'seed_wheat',   name: 'Hạt lúa',   emoji: '🌱', maxStack: 99, category: 'seed', sellPrice: 5   },
  seed_carrot:  { id: 'seed_carrot',  name: 'Hạt cà rốt',emoji: '🌿', maxStack: 99, category: 'seed', sellPrice: 8   },
  seed_tomato:  { id: 'seed_tomato',  name: 'Hạt cà chua',emoji:'🪴', maxStack: 99, category: 'seed', sellPrice: 10  },
};

// Map fish name string (from FishingSystem) → ItemId
const FISH_NAME_MAP: Record<string, ItemId> = {
  'Cá chép':          'fish_carp',
  'Cá rô':            'fish_bass',
  'Cá lóc':           'fish_catfish',
  'Cá trê':           'fish_catfish',
  'Cá vàng hiếm':     'fish_rare',
};

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
}
