import type { ItemId, ItemDef } from '../types';

export const ITEMS: Record<ItemId, ItemDef> = {
  crop_wheat:   { id: 'crop_wheat',   name: 'Lúa mì',      emoji: '🌾', maxStack: 99, category: 'crop', sellPrice: 20  },
  crop_carrot:  { id: 'crop_carrot',  name: 'Cà rốt',      emoji: '🥕', maxStack: 99, category: 'crop', sellPrice: 35  },
  crop_tomato:  { id: 'crop_tomato',  name: 'Cà chua',     emoji: '🍅', maxStack: 99, category: 'crop', sellPrice: 50  },
  fish_carp:    { id: 'fish_carp',    name: 'Cá chép',     emoji: '🐟', maxStack: 30, category: 'fish', sellPrice: 40  },
  fish_bass:    { id: 'fish_bass',    name: 'Cá rô',       emoji: '🐠', maxStack: 30, category: 'fish', sellPrice: 55  },
  fish_catfish: { id: 'fish_catfish', name: 'Cá trê',      emoji: '🐡', maxStack: 30, category: 'fish', sellPrice: 60  },
  fish_rare:    { id: 'fish_rare',    name: 'Cá vàng',     emoji: '✨', maxStack: 10, category: 'fish', sellPrice: 250 },
  seed_wheat:   { id: 'seed_wheat',   name: 'Hạt lúa',     emoji: '🌱', maxStack: 99, category: 'seed', sellPrice: 5   },
  seed_carrot:  { id: 'seed_carrot',  name: 'Hạt cà rốt',  emoji: '🌿', maxStack: 99, category: 'seed', sellPrice: 8   },
  seed_tomato:  { id: 'seed_tomato',  name: 'Hạt cà chua', emoji: '🪴', maxStack: 99, category: 'seed', sellPrice: 10  },
  tool_hoe:         { id: 'tool_hoe',         name: 'Cuốc',      emoji: '⛏️', maxStack: 1, category: 'tool', sellPrice: 0 },
  tool_wateringCan: { id: 'tool_wateringCan', name: 'Bình tưới', emoji: '🪣', maxStack: 1, category: 'tool', sellPrice: 0 },
  tool_fishingRod:  { id: 'tool_fishingRod',  name: 'Cần câu',   emoji: '🎣', maxStack: 1, category: 'tool', sellPrice: 0 },
};

/** Maps fish display names (from FishingSystem) to their ItemId */
export const FISH_NAME_MAP: Record<string, ItemId> = {
  'Cá chép':       'fish_carp',
  'Cá rô':         'fish_bass',
  'Cá lóc':        'fish_catfish',
  'Cá trê':        'fish_catfish',
  'Cá vàng hiếm':  'fish_rare',
};
