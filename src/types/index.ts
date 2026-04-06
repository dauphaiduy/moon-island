export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TilePosition {
  tileX: number;
  tileY: number;
}

export type CropType = 'wheat' | 'carrot' | 'tomato';

export interface FarmTile extends TilePosition {
  state: 'tilled' | 'seeded' | 'grown';
  cropType?: CropType;      // set when a seed is planted
  watered:   boolean;       // must be watered each day for growth to progress
  growthStage: number;
  growthTimer: number;
}

export interface FishingState {
  isActive: boolean;
  isCasting: boolean;
  isBiting: boolean;
  catchProgress: number;
}

export interface PlayerData {
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  tool: 'hoe' | 'wateringCan' | 'fishingRod' | 'none';
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type ItemId =
  | 'crop_wheat'
  | 'crop_carrot'
  | 'crop_tomato'
  | 'fish_carp'
  | 'fish_bass'
  | 'fish_catfish'
  | 'fish_rare'
  | 'seed_wheat'
  | 'seed_carrot'
  | 'seed_tomato'
  | 'tool_hoe'
  | 'tool_wateringCan'
  | 'tool_fishingRod'
  | 'tool_fishingRod_wooden'
  | 'tool_fishingRod_bronze'
  | 'tool_fishingRod_silver'
  | 'tool_fishingRod_gold'
  | 'tool_fishingRod_legendary'
  // ── Swords ──────────────────────────────────────────────────────────────
  | 'weapon_sword_wood'
  | 'weapon_sword_iron'
  | 'weapon_sword_steel'
  | 'weapon_sword_gold'
  | 'weapon_sword_legendary'
  // ── Foods ───────────────────────────────────────────────────────────────
  | 'food_bread'
  | 'food_riceball'
  | 'food_porridge';

// Item categories — add more as the game grows
export type ItemCategory = 'seed' | 'food' | 'fish' | 'tool' | 'weapon' | 'material';

// Rarity tiers — drive drop rates, shop pricing, UI badge colours
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemDef {
  id:           ItemId;
  name:         string;       // tên tiếng Việt
  emoji:        string;       // icon hiển thị
  maxStack:     number;       // số lượng tối đa mỗi slot
  category:     ItemCategory;
  rarity:       ItemRarity;
  sellPrice:    number;
  tier?:        number;       // tool upgrade level (1 = base, 2 = iron, …)
  xp?:          number;       // XP granted to player on harvest / catch
  description?: string;       // flavor text shown in inventory tooltip
  staminaRestore?: number;    // stamina restored when this food item is consumed
}

export interface InventorySlot {
  item: ItemDef;
  qty: number;
}