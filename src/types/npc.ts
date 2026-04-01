import type { ItemId } from './index';

export interface DialogLine {
  text: string;
  portrait?: string;  // key cho future portrait sprite
}

export interface ShopItem {
  itemId: ItemId;
  price:  number;     // giá mua (player mua từ shop)
  stock:  number;     // -1 = vô hạn
}

export interface QuestDef {
  id:          string;
  title:       string;
  description: string;
  goal:        { itemId: ItemId; qty: number };
  reward:      { gold: number; dialog: string };
}

export type NpcState = 'idle' | 'walking' | 'talking';

export interface NpcDef {
  id:       string;
  name:     string;
  emoji:    string;       // avatar nhanh
  color:    number;       // màu sprite placeholder
  spawnX:   number;       // tile X
  spawnY:   number;       // tile Y
  dialog:   DialogLine[]; // hội thoại mặc định (vòng lặp)
  shop?:    ShopItem[];   // nếu có → là merchant
  quest?:   QuestDef;     // nếu có → có nhiệm vụ
  wanders:  boolean;      // có đi lại không
}