import type { ItemId, ItemDef } from '../types';

export const ITEMS: Record<ItemId, ItemDef> = {
  // ── Food (harvested crops) ──────────────────────────────────────────────────
  crop_wheat:   { id: 'crop_wheat',   name: 'Lúa mì',      emoji: '🌾', maxStack: 99, category: 'food', rarity: 'common',   sellPrice: 20  },
  crop_carrot:  { id: 'crop_carrot',  name: 'Cà rốt',      emoji: '🥕', maxStack: 99, category: 'food', rarity: 'common',   sellPrice: 35  },
  crop_tomato:  { id: 'crop_tomato',  name: 'Cà chua',     emoji: '🍅', maxStack: 99, category: 'food', rarity: 'uncommon', sellPrice: 50  },

  // ── Fish ────────────────────────────────────────────────────────────────────
  fish_carp:    { id: 'fish_carp',    name: 'Cá chép',     emoji: '🐟', maxStack: 30, category: 'fish', rarity: 'common',   sellPrice: 40  },
  fish_bass:    { id: 'fish_bass',    name: 'Cá rô',       emoji: '🐠', maxStack: 30, category: 'fish', rarity: 'uncommon', sellPrice: 55  },
  fish_catfish: { id: 'fish_catfish', name: 'Cá trê',      emoji: '🐡', maxStack: 30, category: 'fish', rarity: 'uncommon', sellPrice: 60  },
  fish_rare:    { id: 'fish_rare',    name: 'Cá vàng',     emoji: '✨', maxStack: 10, category: 'fish', rarity: 'rare',     sellPrice: 250, description: 'Một con cá vàng huyền thoại, rất khó bắt.' },

  // ── Seeds ───────────────────────────────────────────────────────────────────
  seed_wheat:   { id: 'seed_wheat',   name: 'Hạt lúa',     emoji: '🌱', maxStack: 99, category: 'seed', rarity: 'common',   sellPrice: 5   },
  seed_carrot:  { id: 'seed_carrot',  name: 'Hạt cà rốt',  emoji: '🌿', maxStack: 99, category: 'seed', rarity: 'common',   sellPrice: 8   },
  seed_tomato:  { id: 'seed_tomato',  name: 'Hạt cà chua', emoji: '🪴', maxStack: 99, category: 'seed', rarity: 'uncommon', sellPrice: 10  },

  // ── Tools (tier 1 = base) ────────────────────────────────────────────────
  tool_hoe:         { id: 'tool_hoe',         name: 'Cuốc',      emoji: '⛏️', maxStack: 1, category: 'tool', rarity: 'common', tier: 1, sellPrice: 0 },
  tool_wateringCan: { id: 'tool_wateringCan', name: 'Bình tưới', emoji: '🪣', maxStack: 1, category: 'tool', rarity: 'common', tier: 1, sellPrice: 0 },

  // ── Fishing Rods (tier 1 → 6) ───────────────────────────────────────────
  tool_fishingRod:            { id: 'tool_fishingRod',            name: 'Cần câu',              emoji: '🎣', maxStack: 1, category: 'tool', rarity: 'common',    tier: 1, sellPrice:    0, description: 'Cần câu cơ bản. Dành cho người mới bắt đầu.' },
  tool_fishingRod_wooden:     { id: 'tool_fishingRod_wooden',     name: 'Cần câu gỗ',           emoji: '🎣', maxStack: 1, category: 'tool', rarity: 'common',    tier: 2, sellPrice:   50, description: 'Làm từ gỗ tốt. Tăng nhẹ tốc độ kéo cá.' },
  tool_fishingRod_bronze:     { id: 'tool_fishingRod_bronze',     name: 'Cần câu đồng',         emoji: '🎣', maxStack: 1, category: 'tool', rarity: 'uncommon',  tier: 3, sellPrice:  150, description: 'Cần câu đồng chắc chắn. Tăng khả năng gặp cá hiếm.' },
  tool_fishingRod_silver:     { id: 'tool_fishingRod_silver',     name: 'Cần câu bạc',          emoji: '🎣', maxStack: 1, category: 'tool', rarity: 'rare',      tier: 4, sellPrice:  400, description: 'Cần câu bạc sáng bóng. Cá khó thoát hơn nhiều.' },
  tool_fishingRod_gold:       { id: 'tool_fishingRod_gold',       name: 'Cần câu vàng',         emoji: '✨', maxStack: 1, category: 'tool', rarity: 'epic',      tier: 5, sellPrice: 1000, description: 'Cần câu dát vàng. Tỉ lệ bắt cá quý cực cao.' },
  tool_fishingRod_legendary:  { id: 'tool_fishingRod_legendary',  name: 'Cần câu huyền thoại',  emoji: '💫', maxStack: 1, category: 'tool', rarity: 'legendary', tier: 6, sellPrice: 3000, description: 'Vũ khí của ngư dân huyền thoại. Không cá nào thoát được.' },
};

/** Maps fish display names (from FishingSystem) to their ItemId */
export const FISH_NAME_MAP: Record<string, ItemId> = {
  'Cá chép':       'fish_carp',
  'Cá rô':         'fish_bass',
  'Cá lóc':        'fish_catfish',
  'Cá trê':        'fish_catfish',
  'Cá vàng hiếm':  'fish_rare',
};
