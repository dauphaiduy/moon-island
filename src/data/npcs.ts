import type { NpcDef } from '../types/npc';

export const NPC_DEFS: NpcDef[] = [
  // ── Bà Lan — dân làng / quest giver ────────────────────────────────────────
  {
    id:      'ba_lan',
    name:    'Bà Lan',
    emoji:   '👵',
    color:   0xe8a87c,
    spawnX:  6,
    spawnY:  6,
    wanders: true,
    dialog: [
      { text: 'Chào cháu! Dạo này ruộng nương thế nào rồi?' },
      { text: 'Trời hôm nay đẹp quá, thích hợp để ra đồng lắm đấy.' },
      { text: 'Cháu nhớ tưới cây đúng giờ nhé, cây khát nước tội lắm!' },
    ],
    friendshipDialogs: [
      {
        minFriendship: 3,
        lines: [
          { text: 'Cháu tốt bụng lắm, bà thấy làng mình may mắn có cháu.' },
          { text: 'Hôm nay bà làm bánh, để bà dành phần cho cháu nhé!' },
        ],
      },
      {
        minFriendship: 7,
        lines: [
          { text: 'Bà coi cháu như cháu ruột rồi đó. Nhớ ghé thăm bà thường xuyên nhé!' },
          { text: 'Biết không, khu vườn phía đông có giống cà chua đặc biệt, bà sẽ chỉ cho cháu.' },
        ],
      },
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
    spawnX:  14,
    spawnY:  6,
    wanders: false,
    dialog: [
      { text: 'Chào bạn! Tôi có đủ thứ giống cây và dụng cụ đây.' },
      { text: 'Nhấn E để xem hàng của tôi nhé!' },
      { text: 'Hàng hôm nay tươi lắm, giá tốt lắm đó!' },
    ],
    friendshipDialogs: [
      {
        minFriendship: 4,
        lines: [
          { text: 'Khách quen thì tôi bán giá ưu đãi hơn đó, cứ ghé hoài nhé!' },
          { text: 'Hôm nay tôi nhập thêm hạt cà chua loại ngon, mời bạn xem!' },
        ],
      },
    ],
    shop: [
      { itemId: 'seed_wheat',  price: 5,  stock: -1 },
      { itemId: 'seed_carrot', price: 8,  stock: -1 },
      { itemId: 'seed_tomato', price: 10,  stock: -1 },
    ],
  },

  // ── Em Minh — dân làng di chuyển ───────────────────────────────────────────
  {
    id:      'em_minh',
    name:    'Em Minh',
    emoji:   '🧒',
    color:   0x90ee90,
    spawnX:  20,
    spawnY:  11,
    wanders: true,
    dialog: [
      { text: 'Ê, anh/chị! Hôm qua em câu được con cá to lắm!' },
      { text: 'Nghe nói ban đêm ở ao có cá quý, anh/chị thử xem!' },
      { text: 'Em đang tập trồng cà rốt, khó lắm anh/chị ơi...' },
    ],
    friendshipDialogs: [
      {
        minFriendship: 2,
        lines: [
          { text: 'Anh/chị là người bạn câu cá tốt nhất của em!' },
          { text: 'Em có bí quyết: cá cắn mồi nhiều nhất vào sáng sớm hoặc chiều tối đó!' },
        ],
      },
      {
        minFriendship: 6,
        lines: [
          { text: 'Anh/chị ơi, em biết chỗ có cá vàng hiếm! Nhưng chỉ xuất hiện khi trời đẹp thôi.' },
          { text: 'Em coi anh/chị như anh/chị ruột luôn rồi!' },
        ],
      },
    ],
  },
];