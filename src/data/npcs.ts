import type { NpcDef } from '../types/npc';

export const NPC_DEFS: NpcDef[] = [
  // ── Bà Lan — dân làng / quest giver ────────────────────────────────────────
  {
    id:      'ba_lan',
    name:    'Bà Lan',
    emoji:   '👵',
    color:   0xe8a87c,
    spawnX:  18,
    spawnY:  8,
    wanders: true,
    dialog: [
      { text: 'Chào cháu! Dạo này ruộng nương thế nào rồi?' },
      { text: 'Trời hôm nay đẹp quá, thích hợp để ra đồng lắm đấy.' },
      { text: 'Cháu nhớ tưới cây đúng giờ nhé, cây khát nước tội lắm!' },
    ],
    quest: {
      id:          'ba_lan_wheat',
      title:       'Lúa mì cho bà',
      description: 'Bà Lan cần 5 lúa mì để làm bánh. Cháu giúp bà được không?',
      goal:        { itemId: 'crop_wheat', qty: 5 },
      reward:      { gold: 200, dialog: 'Cảm ơn cháu nhiều lắm! Bà biếu cháu ít tiền mua giống mới nhé.' },
    },
  },

  // ── Chú Hải — thương nhân / shop ───────────────────────────────────────────
  {
    id:      'chu_hai',
    name:    'Chú Hải',
    emoji:   '🧑‍🌾',
    color:   0x6a9edb,
    spawnX:  20,
    spawnY:  17,
    wanders: false,
    dialog: [
      { text: 'Chào bạn! Tôi có đủ thứ giống cây và dụng cụ đây.' },
      { text: 'Nhấn E để xem hàng của tôi nhé!' },
      { text: 'Hàng hôm nay tươi lắm, giá tốt lắm đó!' },
    ],
    shop: [
      { itemId: 'seed_wheat',  price: 30,  stock: -1 },
      { itemId: 'seed_carrot', price: 50,  stock: -1 },
      { itemId: 'seed_tomato', price: 80,  stock: -1 },
    ],
  },

  // ── Em Minh — dân làng di chuyển ───────────────────────────────────────────
  {
    id:      'em_minh',
    name:    'Em Minh',
    emoji:   '🧒',
    color:   0x90ee90,
    spawnX:  25,
    spawnY:  12,
    wanders: true,
    dialog: [
      { text: 'Ê, anh/chị! Hôm qua em câu được con cá to lắm!' },
      { text: 'Nghe nói ban đêm ở ao có cá quý, anh/chị thử xem!' },
      { text: 'Em đang tập trồng cà rốt, khó lắm anh/chị ơi...' },
    ],
  },
];