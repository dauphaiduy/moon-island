export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TilePosition {
  tileX: number;
  tileY: number;
}

export interface FarmTile extends TilePosition {
  state: 'empty' | 'tilled' | 'seeded' | 'grown';
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
  | 'seed_tomato';

export interface ItemDef {
  id: ItemId;
  name: string;       // tên tiếng Việt
  emoji: string;      // icon hiển thị
  maxStack: number;   // số lượng tối đa mỗi slot
  category: 'crop' | 'fish' | 'seed';
  sellPrice: number;
}

export interface InventorySlot {
  item: ItemDef;
  qty: number;
}