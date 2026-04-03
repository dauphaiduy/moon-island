import Phaser from 'phaser';
import { SceneKey } from '../constants';
import type { InventorySystem } from '../systems/InventorySystem';
import type { DayNightState, TimeOfDay } from '../systems/DayNightSystem';
import type { ShopItem } from '../types/npc';
import type { ItemId } from '../types';
import { ITEMS } from '../data/items';

const SLOT_SIZE   = 44;
const SLOT_GAP    = 6;
const HOTBAR_COLS = 8;
const HOTBAR_W    = HOTBAR_COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;

// Full inventory grid
const INV_COLS = 8;
const INV_ROWS = 3;  // 24 slots total

const TIME_LABELS: Record<TimeOfDay, string> = {
  dawn:      '🌅 Bình minh',
  morning:   '☀️ Sáng',
  noon:      '🌞 Trưa',
  afternoon: '🌤️ Chiều',
  dusk:      '🌇 Hoàng hôn',
  night:     '🌙 Đêm',
};

export type PauseMenuAction = 'save' | 'load' | 'menu' | 'new';

export class UIScene extends Phaser.Scene {
  private toolText!:    Phaser.GameObjects.Text;
  private fishingText!: Phaser.GameObjects.Text;
  private notifText!:   Phaser.GameObjects.Text;
  private goldText!:    Phaser.GameObjects.Text;
  private clockText!:   Phaser.GameObjects.Text;
  private dayText!:     Phaser.GameObjects.Text;
  private notifTimer:   Phaser.Time.TimerEvent | null = null;

  private hotbarBgs:    Phaser.GameObjects.Rectangle[] = [];
  private hotbarEmojis: Phaser.GameObjects.Text[]      = [];
  private hotbarQtys:   Phaser.GameObjects.Text[]      = [];

  // ── Pause menu ──────────────────────────────────────────────────────
  private pauseContainer!:   Phaser.GameObjects.Container;
  private confirmContainer!: Phaser.GameObjects.Container;
  private isPauseOpen = false;
  onPauseAction?: (action: PauseMenuAction) => void;

  // ── Inventory panel ──────────────────────────────────────────────
  private invContainer!:   Phaser.GameObjects.Container;
  private invSlotBgs:      Phaser.GameObjects.Rectangle[] = [];
  private invSlotEmojis:   Phaser.GameObjects.Text[]      = [];
  private invSlotQtys:     Phaser.GameObjects.Text[]      = [];
  private invSlotNames:    Phaser.GameObjects.Text[]      = [];  // placeholder, kept for compat
  private invGoldText!:    Phaser.GameObjects.Text;
  private invInfoText!:    Phaser.GameObjects.Text;
  private isInvOpen        = false;
  private _inventoryRef:   InventorySystem | null = null;
  private invSelectedSlot: number | null = null;

  // ── Shop panel ────────────────────────────────────────────────────
  private shopContainer!:    Phaser.GameObjects.Container;
  private shopRowContainer!: Phaser.GameObjects.Container;
  private shopTitleText!:    Phaser.GameObjects.Text;
  private shopGoldText!:     Phaser.GameObjects.Text;
  private shopTabBuy!:       Phaser.GameObjects.Text;
  private shopTabSell!:      Phaser.GameObjects.Text;
  private _isShopOpen     = false;
  private _shopTab: 'buy' | 'sell' = 'buy';
  private _shopCatalog:  ShopItem[]          = [];
  private _shopInvRef:   InventorySystem | null = null;
  private _shopRowX      = 0;
  private _shopRowStartY = 0;
  private _shopRowW      = 0;
  onShopBuy?: (itemId: ItemId, price: number) => void;
  onShopSell?: (slotIndex: number) => void;
  onShopSellAll?: (slotIndex: number) => void;

  constructor() {
    super({ key: SceneKey.UI });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Tool (top-left) ──────────────────────────────────────────────────────
    this.toolText = this.add.text(12, 12, 'Công cụ: [Không có]', {
      fontSize: '13px', color: '#ffffff',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 4 },
    });

    // ── Clock (top-center) ───────────────────────────────────────────────────
    this.clockText = this.add.text(W / 2, 10, '07:00', {
      fontSize: '18px', color: '#ffffff',
      backgroundColor: '#00000077',
      padding: { x: 10, y: 4 },
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.dayText = this.add.text(W / 2, 38, '☀️ Sáng  —  Ngày 1', {
      fontSize: '11px', color: '#ffffffbb',
      backgroundColor: '#00000055',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 0);

    // ── Gold (top-right) ─────────────────────────────────────────────────────
    this.goldText = this.add.text(W - 12, 12, '💰 0G', {
      fontSize: '13px', color: '#ffe066',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 4 },
    }).setOrigin(1, 0);

    // ── Fishing status ───────────────────────────────────────────────────────
    this.fishingText = this.add.text(W / 2, 64, '', {
      fontSize: '15px', color: '#ffe066',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0);

    // ── Notification ─────────────────────────────────────────────────────────
    this.notifText = this.add.text(W / 2, H - 90, '', {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#27ae6099',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setAlpha(0);

    // ── Hotbar ───────────────────────────────────────────────────────────────
    const hotbarX = (W - HOTBAR_W) / 2;
    const hotbarY = H - SLOT_SIZE - 10;
    this.buildHotbar(hotbarX, hotbarY);

    // ── Hint ─────────────────────────────────────────────────────────────────
    this.add.text(W / 2, H - 4, 'Tab: công cụ  |  E: tương tác  |  I: túI đồ  |  Q: bán tất cả  |  ESC: menu', {
      fontSize: '10px', color: '#ffffff55',
    }).setOrigin(0.5, 1);

    // ── Pause menu (hidden by default) ───────────────────────────────────────
    this.buildPauseMenu(W, H);

    // ── Inventory panel (hidden by default) ──────────────────────────────
    this.buildInventoryPanel(W, H);
    // ── Shop panel (hidden by default) ───────────────────────────────
    this.buildShopPanel(W, H);  }

  // ─── Hotbar ──────────────────────────────────────────────────────────────────

  private buildHotbar(ox: number, oy: number): void {
    for (let i = 0; i < HOTBAR_COLS; i++) {
      const x = ox + i * (SLOT_SIZE + SLOT_GAP);

      const bg = this.add.rectangle(x, oy, SLOT_SIZE, SLOT_SIZE, 0x000000, 0.55)
        .setOrigin(0).setStrokeStyle(1.5, 0xffffff, 0.3);
      this.hotbarBgs.push(bg);

      const emoji = this.add.text(x + SLOT_SIZE / 2, oy + SLOT_SIZE / 2, '', {
        fontSize: '22px',
      }).setOrigin(0.5);
      this.hotbarEmojis.push(emoji);

      const qty = this.add.text(x + SLOT_SIZE - 4, oy + SLOT_SIZE - 4, '', {
        fontSize: '11px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 1);
      this.hotbarQtys.push(qty);
    }
  }

  refreshHotbar(inventory: InventorySystem): void {
    const slots  = inventory.getHotbar();
    const active = inventory.getActiveSlot();
    for (let i = 0; i < HOTBAR_COLS; i++) {
      const slot     = slots[i];
      const isActive = i === active;
      if (slot) {
        this.hotbarEmojis[i].setText(slot.item.emoji);
        this.hotbarQtys[i].setText(slot.qty > 1 ? String(slot.qty) : '');
        this.hotbarBgs[i]
          .setFillStyle(isActive ? 0x2a2200 : 0x1a3a1a, 0.85)
          .setStrokeStyle(isActive ? 2 : 1.5, isActive ? 0xffe066 : 0x4a9a3a, 0.9);
      } else {
        this.hotbarEmojis[i].setText('');
        this.hotbarQtys[i].setText('');
        this.hotbarBgs[i]
          .setFillStyle(isActive ? 0x2a2200 : 0x000000, isActive ? 0.65 : 0.55)
          .setStrokeStyle(isActive ? 2 : 1.5, isActive ? 0xffe066 : 0xffffff, isActive ? 0.8 : 0.3);
      }
    }
    // Keep tool text in sync with active slot
    const activeSlot = slots[active];
    this.setTool(activeSlot ? activeSlot.item.name : 'Không có');
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  setClock(state: DayNightState): void {
    const h = String(state.hour).padStart(2, '0');
    const m = String(state.minute).padStart(2, '0');
    this.clockText.setText(`${h}:${m}`);
    this.dayText.setText(`${TIME_LABELS[state.timeOfDay]}  —  Ngày ${state.day}`);

    // Clock color shifts with time of day
    const colors: Record<TimeOfDay, string> = {
      dawn:      '#ffb347',
      morning:   '#ffffff',
      noon:      '#fffde0',
      afternoon: '#ffe0a0',
      dusk:      '#ff9966',
      night:     '#aaaaff',
    };
    this.clockText.setColor(colors[state.timeOfDay]);
  }

  setTool(name: string): void {
    this.toolText.setText(`Công cụ: [${name}]`);
  }

  setGold(amount: number): void {
    this.goldText.setText(`💰 ${amount.toLocaleString()}G`);
  }

  setFishingStatus(text: string): void {
    this.fishingText.setText(text);
  }

  notify(message: string, color = '#27ae60'): void {
    this.notifTimer?.remove();
    this.notifText.setText(message).setBackgroundColor(color + '99').setAlpha(1);
    this.notifTimer = this.time.delayedCall(2500, () => {
      this.tweens.add({ targets: this.notifText, alpha: 0, duration: 400 });
    });
  }

  get isPauseMenuOpen(): boolean {
    return this.isPauseOpen;
  }

  get isInventoryOpen(): boolean {
    return this.isInvOpen;
  }

  get isShopPanelOpen(): boolean {
    return this._isShopOpen;
  }

  toggleInventoryPanel(inventory: InventorySystem): void {
    this._inventoryRef = inventory;
    if (this.isInvOpen) {
      this.closeInventoryPanel();
    } else {
      this.refreshInventoryPanel(inventory);
      this.openInventoryPanel();
    }
  }

  private openInventoryPanel(): void {
    if (this.isInvOpen) return;
    this.isInvOpen = true;
    this.invContainer.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.invContainer, alpha: 1, duration: 180 });
  }

  closeInventoryPanel(): void {
    if (!this.isInvOpen) return;
    this.isInvOpen = false;
    this.invSelectedSlot = null;
    this.tweens.add({
      targets: this.invContainer,
      alpha: 0,
      duration: 150,
      onComplete: () => this.invContainer.setVisible(false),
    });
  }

  refreshInventoryPanel(inventory: InventorySystem): void {
    const slots = inventory.getAllSlots();
    for (let i = 0; i < slots.length; i++) {
      const slot   = slots[i];
      const isSel  = this.invSelectedSlot === i;
      if (slot) {
        this.invSlotEmojis[i].setText(slot.item.emoji);
        this.invSlotQtys[i].setText(slot.qty > 1 ? `x${slot.qty}` : '');
        this.invSlotBgs[i]
          .setFillStyle(isSel ? 0x2a4a1a : 0x1a3a1a, isSel ? 0.95 : 0.85)
          .setStrokeStyle(isSel ? 2.5 : 1.5, isSel ? 0xffee00 : 0x4a9a3a, 1);
      } else {
        this.invSlotEmojis[i].setText('');
        this.invSlotQtys[i].setText('');
        this.invSlotBgs[i]
          .setFillStyle(isSel ? 0x1a2a0a : 0x0a1a0a, isSel ? 0.85 : 0.7)
          .setStrokeStyle(isSel ? 2.5 : 1, isSel ? 0xffee00 : 0x334433, isSel ? 1 : 0.5);
      }
    }
    this.invGoldText.setText(`💰 ${inventory.gold.toLocaleString()} G`);
    this.invInfoText?.setText('');
  }

  togglePauseMenu(): void {
    this.isPauseOpen ? this.closePauseMenu() : this.openPauseMenu();
  }

  private openPauseMenu(): void {
    if (this.isPauseOpen) return;
    this.isPauseOpen = true;
    this.pauseContainer.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.pauseContainer, alpha: 1, duration: 180 });
  }

  closePauseMenu(): void {
    if (!this.isPauseOpen) return;
    this.isPauseOpen = false;
    this.tweens.add({
      targets: this.pauseContainer,
      alpha: 0,
      duration: 150,
      onComplete: () => this.pauseContainer.setVisible(false),
    });
  }

  private buildPauseMenu(W: number, H: number): void {
    const CX = W / 2;
    const CY = H / 2;
    const BOX_W = 260;
    const BOX_H = 282;  // taller to fit 4 buttons

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0);

    const box = this.add.rectangle(CX, CY, BOX_W, BOX_H, 0x1a2a0f, 0.95)
      .setStrokeStyle(2, 0x6abf3e, 1);

    const title = this.add.text(CX, CY - BOX_H / 2 + 24, '⏸ Tạm dừng', {
      fontSize: '18px', color: '#ffe066',
      fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const divider = this.add.rectangle(CX, CY - BOX_H / 2 + 44, BOX_W - 40, 1, 0x6abf3e, 0.5);

    const mainItems: { label: string; action: PauseMenuAction }[] = [
      { label: '💾  Lưu game',  action: 'save' },
      { label: '📂  Tải game',  action: 'load' },
      { label: '🏠  Về menu',   action: 'menu' },
    ];

    const buttons = mainItems.map((item, i) => {
      const btnY = CY - 52 + i * 52;
      const btn = this.add.text(CX, btnY, item.label, {
        fontSize: '15px', color: '#d0f0a0',
        backgroundColor: '#2a4a1a',
        padding: { x: 24, y: 10 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover',  () => btn.setColor('#ffffff').setBackgroundColor('#3d6e22'))
        .on('pointerout',   () => btn.setColor('#d0f0a0').setBackgroundColor('#2a4a1a'))
        .on('pointerdown',  () => {
          this.closePauseMenu();
          this.onPauseAction?.(item.action);
        });
      return btn;
    });

    // Separator line before the danger button
    const sep = this.add.rectangle(CX, CY + 102, BOX_W - 60, 1, 0xff4444, 0.35);

    // "New game" danger button
    const newBtn = this.add.text(CX, CY + 118, '🗑️  Xóa & Chơi mới', {
      fontSize: '13px', color: '#ff9999',
      backgroundColor: '#3a1010',
      padding: { x: 20, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => newBtn.setColor('#ffffff').setBackgroundColor('#6e1a1a'))
      .on('pointerout',   () => newBtn.setColor('#ff9999').setBackgroundColor('#3a1010'))
      .on('pointerdown',  () => this.openConfirm());

    const hint = this.add.text(CX, CY + BOX_H / 2 - 12, 'ESC đóng', {
      fontSize: '10px', color: '#ffffff55',
    }).setOrigin(0.5);

    this.pauseContainer = this.add.container(0, 0, [overlay, box, title, divider, sep, hint, ...buttons, newBtn]);
    this.pauseContainer.setVisible(false).setAlpha(0);
    this.pauseContainer.setDepth(100);

    // Build the confirm dialog (hidden by default, depth above pause menu)
    this.buildConfirmDialog(W, H);
  }

  private buildInventoryPanel(W: number, H: number): void {
    const TOTAL  = INV_COLS * INV_ROWS;  // 24
    const STEP   = SLOT_SIZE + SLOT_GAP;  // 50
    const GRID_W = INV_COLS * STEP - SLOT_GAP;  // 394
    const BOX_W  = GRID_W + 40;   // 434
    const BOX_H  = 316;
    const CX = W / 2;
    const CY = H / 2;
    const BT = CY - BOX_H / 2;   // absolute box top
    const originX = CX - GRID_W / 2;

    // ── Absolute Y anchors ──────────────────────────────────────────
    const y_title   = BT + 22;
    const y_hbLbl   = BT + 46;
    const y_hbSep   = BT + 65;
    const y_hbRow   = BT + 74;   // hotbar slot origin
    const y_midSep  = BT + 128;  // y_hbRow + 44 + 10
    const y_bpLbl   = BT + 140;
    const y_bpRow0  = BT + 159;  // backpack row 0
    const y_bpRow1  = y_bpRow0 + STEP;  // backpack row 1
    const y_info    = y_bpRow1 + SLOT_SIZE + 12;
    const y_gold    = y_info + 18;
    const y_hint    = y_gold + 18;

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0);
    const box = this.add.rectangle(CX, CY, BOX_W, BOX_H, 0x0d1f0d, 0.96)
      .setStrokeStyle(2, 0x4a9a3a, 1);

    const title = this.add.text(CX, y_title, '🎒 TÚI ĐỒ', {
      fontSize: '16px', color: '#ffe066', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // ── Hotbar section ──────────────────────────────────────────────
    const hbLabel = this.add.text(originX, y_hbLbl,
      '🖥  Thanh hiển thị  (hiện trên màn hình)', {
        fontSize: '10px', color: '#aaffaa',
      });
    const hbSep = this.add.rectangle(CX, y_hbSep, GRID_W, 1, 0x4a9a3a, 0.6);
    // subtle tinted backdrop behind hotbar row
    const hbBg = this.add.rectangle(originX - 4, y_hbRow - 4,
      GRID_W + 8, SLOT_SIZE + 8, 0x0a2a10, 0.35).setOrigin(0);

    // ── Backpack section ────────────────────────────────────────────
    const midSep = this.add.rectangle(CX, y_midSep, GRID_W, 1, 0x334433, 0.5);
    const bpLabel = this.add.text(originX, y_bpLbl, '🎒  Ba lô  (không hiện trên màn hình)', {
      fontSize: '10px', color: '#88cc88',
    });

    // ── Footer ──────────────────────────────────────────────────────
    this.invInfoText = this.add.text(CX, y_info, '', {
      fontSize: '12px', color: '#ffe066',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.invGoldText = this.add.text(CX, y_gold, '💰 0 G', {
      fontSize: '12px', color: '#ffe066',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    const hint = this.add.text(CX, y_hint,
      'Click chọn  →  Click đích để di chuyển   |   I / ESC: đóng', {
        fontSize: '9px', color: '#ffffff44',
      }).setOrigin(0.5);

    // ── Slot grid ───────────────────────────────────────────────────
    const gridObjs: Phaser.GameObjects.GameObject[] = [];

    for (let i = 0; i < TOTAL; i++) {
      const col     = i % INV_COLS;
      const section = Math.floor(i / INV_COLS);  // 0=hotbar 1=bp0 2=bp1
      const sx = originX + col * STEP;
      const sy = section === 0 ? y_hbRow : (section === 1 ? y_bpRow0 : y_bpRow1);

      const bg = this.add.rectangle(sx, sy, SLOT_SIZE, SLOT_SIZE, 0x0a1a0a, 0.7)
        .setOrigin(0)
        .setStrokeStyle(1, 0x334433, 0.5)
        .setInteractive()
        .on('pointerdown', () => this.handleInvSlotClick(i))
        .on('pointerover', () => {
          const slot = this._inventoryRef?.getSlot(i);
          if (slot) {
            this.invInfoText.setText(
              `${slot.item.emoji} ${slot.item.name}  •  Giá bán: ${slot.item.sellPrice}G  •  Số lượng: ${slot.qty}`,
            );
          }
          if (this.invSelectedSlot !== i) {
            bg.setStrokeStyle(1.5, 0x88cc88, 1);
          }
        })
        .on('pointerout', () => {
          if (this.invInfoText) this.invInfoText.setText('');
          if (this.invSelectedSlot !== i) {
            const hasItem = !!this._inventoryRef?.getSlot(i);
            bg.setStrokeStyle(hasItem ? 1.5 : 1, hasItem ? 0x4a9a3a : 0x334433, hasItem ? 0.8 : 0.5);
          }
        });
      this.invSlotBgs.push(bg);

      const emoji = this.add.text(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2, '', {
        fontSize: '22px',
      }).setOrigin(0.5);
      this.invSlotEmojis.push(emoji);

      const qty = this.add.text(sx + SLOT_SIZE - 3, sy + SLOT_SIZE - 3, '', {
        fontSize: '10px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 1);
      this.invSlotQtys.push(qty);

      // placeholder — not rendered (invInfoText used instead)
      const name = this.add.text(0, -9999, '', { fontSize: '8px' });
      this.invSlotNames.push(name);

      gridObjs.push(bg, emoji, qty, name);
    }

    this.invContainer = this.add.container(0, 0, [
      overlay, box, title,
      hbLabel, hbSep, hbBg,
      midSep, bpLabel,
      this.invInfoText, this.invGoldText, hint,
      ...gridObjs,
    ]);
    this.invContainer.setVisible(false);
    this.invContainer.setDepth(90);
  }

  private handleInvSlotClick(i: number): void {
    const inv = this._inventoryRef;
    if (!inv) return;

    if (this.invSelectedSlot === null) {
      // Only allow picking up a slot that has an item
      if (inv.getSlot(i)) {
        this.invSelectedSlot = i;
        this.refreshInventoryPanel(inv);
      }
    } else if (this.invSelectedSlot === i) {
      // Click same slot again → deselect
      this.invSelectedSlot = null;
      this.refreshInventoryPanel(inv);
    } else {
      // Swap the two slots (works for empty destination too)
      inv.swapSlots(this.invSelectedSlot, i);
      this.invSelectedSlot = null;
      this.refreshInventoryPanel(inv);
    }
  }

  private buildConfirmDialog(W: number, H: number): void {
    const CX = W / 2;
    const CY = H / 2;
    const BW = 280;
    const BH = 150;

    const backdrop = this.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0);
    const box = this.add.rectangle(CX, CY, BW, BH, 0x2a0a0a, 0.97)
      .setStrokeStyle(2, 0xff4444, 1);
    const msg = this.add.text(CX, CY - 34, '⚠️  Xóa toàn bộ tiến trình?\nKhông thể hoàn tác!', {
      fontSize: '13px', color: '#ffcccc', align: 'center',
    }).setOrigin(0.5);

    const yesBtn = this.add.text(CX - 54, CY + 34, '✔ Xác nhận', {
      fontSize: '13px', color: '#ff9999',
      backgroundColor: '#5a1010',
      padding: { x: 14, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => yesBtn.setColor('#ffffff').setBackgroundColor('#8a1a1a'))
      .on('pointerout',   () => yesBtn.setColor('#ff9999').setBackgroundColor('#5a1010'))
      .on('pointerdown',  () => {
        this.closeConfirm();
        this.closePauseMenu();
        this.onPauseAction?.('new');
      });

    const noBtn = this.add.text(CX + 54, CY + 34, '✖ Hủy', {
      fontSize: '13px', color: '#d0f0a0',
      backgroundColor: '#2a4a1a',
      padding: { x: 14, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => noBtn.setColor('#ffffff').setBackgroundColor('#3d6e22'))
      .on('pointerout',   () => noBtn.setColor('#d0f0a0').setBackgroundColor('#2a4a1a'))
      .on('pointerdown',  () => this.closeConfirm());

    this.confirmContainer = this.add.container(0, 0, [backdrop, box, msg, yesBtn, noBtn]);
    this.confirmContainer.setVisible(false);
    this.confirmContainer.setDepth(110);
  }

  private openConfirm(): void {
    this.confirmContainer.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.confirmContainer, alpha: 1, duration: 140 });
  }

  private closeConfirm(): void {
    this.tweens.add({
      targets: this.confirmContainer,
      alpha: 0,
      duration: 120,
      onComplete: () => this.confirmContainer.setVisible(false),
    });
  }

  // ─── Shop panel ───────────────────────────────────────────────────────────────

  private buildShopPanel(W: number, H: number): void {
    const CX    = W / 2;
    const CY    = H / 2;
    const BOX_W = 460;
    const BOX_H = 380;
    const BT    = CY - BOX_H / 2;
    const BL    = CX - BOX_W / 2;

    // Store row geometry for refreshShopRows
    this._shopRowX      = BL + 20;
    this._shopRowStartY = BT + 102;
    this._shopRowW      = BOX_W - 40;

    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0);
    const box     = this.add.rectangle(CX, CY, BOX_W, BOX_H, 0x0a1020, 0.96)
      .setStrokeStyle(2, 0x4a9eff, 0.85);

    this.shopTitleText = this.add.text(CX, BT + 18, '🛒', {
      fontSize: '15px', color: '#ffe066', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const topDiv = this.add.rectangle(CX, BT + 38, BOX_W - 30, 1, 0x4a9eff, 0.4);

    // Tab buttons
    const tabY = BT + 57;
    this.shopTabBuy = this.add.text(CX - 58, tabY, '🛒  Mua', {
      fontSize: '13px', color: '#ffe066',
      backgroundColor: '#1a3a5a',
      padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setShopTab('buy'));

    this.shopTabSell = this.add.text(CX + 58, tabY, '💰  Bán', {
      fontSize: '13px', color: '#888888',
      backgroundColor: '#1a1a1a',
      padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setShopTab('sell'));

    const tabDiv = this.add.rectangle(CX, BT + 80, BOX_W - 30, 1, 0x4a9eff, 0.25);

    // Close button
    const closeBtn = this.add.text(CX + BOX_W / 2 - 18, BT + 17, '✕', {
      fontSize: '13px', color: '#888888',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover',  () => closeBtn.setColor('#ffffff'))
      .on('pointerout',   () => closeBtn.setColor('#888888'))
      .on('pointerdown',  () => this.closeShopPanel());

    // Footer
    const footDiv = this.add.rectangle(CX, BT + BOX_H - 50, BOX_W - 30, 1, 0x4a9eff, 0.25);
    this.shopGoldText = this.add.text(CX, BT + BOX_H - 36, '💰 0 G', {
      fontSize: '13px', color: '#ffe066',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    const hint = this.add.text(CX, BT + BOX_H - 14, 'Click để mua/bán  |  ESC đóng', {
      fontSize: '9px', color: '#ffffff33',
    }).setOrigin(0.5);

    this.shopContainer = this.add.container(0, 0, [
      overlay, box, this.shopTitleText, topDiv,
      this.shopTabBuy, this.shopTabSell, tabDiv, closeBtn,
      footDiv, this.shopGoldText, hint,
    ]).setVisible(false).setAlpha(0).setDepth(100);

    this.shopRowContainer = this.add.container(0, 0, [])
      .setVisible(false).setAlpha(0).setDepth(101);
  }

  openShopPanel(catalog: ShopItem[], inventory: InventorySystem, npcName: string, npcEmoji: string): void {
    this._shopCatalog = catalog;
    this._shopInvRef  = inventory;
    this._shopTab     = 'buy';
    this.shopTitleText.setText(`${npcEmoji}  ${npcName}`);
    this.refreshShopRows();
    this._isShopOpen = true;
    this.shopContainer.setVisible(true).setAlpha(0);
    this.shopRowContainer.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: [this.shopContainer, this.shopRowContainer], alpha: 1, duration: 180 });
  }

  closeShopPanel(): void {
    if (!this._isShopOpen) return;
    this._isShopOpen = false;
    this.tweens.add({
      targets: [this.shopContainer, this.shopRowContainer],
      alpha:   0,
      duration: 150,
      onComplete: () => {
        this.shopContainer.setVisible(false);
        this.shopRowContainer.setVisible(false);
        this.shopRowContainer.removeAll(true);
      },
    });
  }

  private setShopTab(tab: 'buy' | 'sell'): void {
    if (this._shopTab === tab) return;
    this._shopTab = tab;
    this.refreshShopRows();
  }

  private refreshShopRows(): void {
    this.shopRowContainer.removeAll(true);

    const ROW_H   = 30;
    const ROW_GAP = 4;
    const rx      = this._shopRowX;
    const rw      = this._shopRowW;
    let   ry      = this._shopRowStartY;

    // Update tab highlights
    if (this._shopTab === 'buy') {
      this.shopTabBuy .setColor('#ffe066').setBackgroundColor('#1a3a5a');
      this.shopTabSell.setColor('#888888').setBackgroundColor('#1a1a1a');
    } else {
      this.shopTabBuy .setColor('#888888').setBackgroundColor('#1a1a1a');
      this.shopTabSell.setColor('#ffe066').setBackgroundColor('#2a3000');
    }

    if (this._isShopOpen || this._shopInvRef) {
      if (this._shopInvRef) {
        this.shopGoldText.setText(`💰 ${this._shopInvRef.gold.toLocaleString()} G`);
      }
    }

    if (this._shopTab === 'buy') {
      this._shopCatalog.forEach((item, _i) => {
        ry = this._shopRowStartY + _i * (ROW_H + ROW_GAP);
        this.addShopBuyRow(rx, ry, rw, ROW_H, item);
      });

      if (this._shopCatalog.length === 0) {
        const t = this.add.text(rx + rw / 2, ry + 30, 'Không có hàng hôm nay', {
          fontSize: '12px', color: '#666666',
        }).setOrigin(0.5, 0);
        this.shopRowContainer.add(t);
      }
    } else {
      const inv = this._shopInvRef;
      if (!inv) return;
      const slots = inv.getAllSlots();
      let row = 0;
      for (let si = 0; si < slots.length && row < 8; si++) {
        const slot = slots[si];
        if (!slot || slot.item.sellPrice <= 0) continue;
        this.addShopSellRow(rx, this._shopRowStartY + row * (ROW_H + ROW_GAP), rw, ROW_H, si, slot);
        row++;
      }

      if (row === 0) {
        const t = this.add.text(rx + rw / 2, this._shopRowStartY + 30, 'Không có vật phẩm để bán', {
          fontSize: '12px', color: '#666666',
        }).setOrigin(0.5, 0);
        this.shopRowContainer.add(t);
      }
    }
  }

  private addShopBuyRow(
    rx: number, ry: number, rw: number, rh: number,
    item: ShopItem,
  ): void {
    const def  = ITEMS[item.itemId];
    const bg = this.add.rectangle(rx, ry, rw, rh, 0x061830, 0.9).setOrigin(0)
      .setStrokeStyle(1, 0x1a4a8a, 0.7)
      .setInteractive()
      .on('pointerover', () => bg.setFillStyle(0x0e2a50, 0.95))
      .on('pointerout',  () => bg.setFillStyle(0x061830, 0.9));

    const emoji = this.add.text(rx + 8,  ry + rh / 2, def.emoji, { fontSize: '18px' }).setOrigin(0, 0.5);
    const name  = this.add.text(rx + 36, ry + rh / 2, def.name,  { fontSize: '13px', color: '#d0eeff' }).setOrigin(0, 0.5);
    const price = this.add.text(rx + rw - 86, ry + rh / 2, `💰 ${item.price}G`, { fontSize: '12px', color: '#ffe066' }).setOrigin(0, 0.5);

    const btn = this.add.text(rx + rw - 4, ry + rh / 2, 'Mua', {
      fontSize: '12px', color: '#80ff80',
      backgroundColor: '#0a3a1a',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setBackgroundColor('#1a6a2a').setColor('#ffffff'))
      .on('pointerout',  () => btn.setBackgroundColor('#0a3a1a').setColor('#80ff80'))
      .on('pointerdown', () => {
        this.onShopBuy?.(item.itemId, item.price);
        if (this._shopInvRef) {
          this.shopGoldText.setText(`💰 ${this._shopInvRef.gold.toLocaleString()} G`);
        }
      });

    this.shopRowContainer.add([bg, emoji, name, price, btn]);
  }

  private addShopSellRow(
    rx: number, ry: number, rw: number, rh: number,
    slotIndex: number,
    slot: { item: { emoji: string; name: string; sellPrice: number }; qty: number },
  ): void {
    const bg = this.add.rectangle(rx, ry, rw, rh, 0x1a1000, 0.9).setOrigin(0)
      .setStrokeStyle(1, 0x5a3a00, 0.7)
      .setInteractive()
      .on('pointerover', () => bg.setFillStyle(0x2a1a00, 0.95))
      .on('pointerout',  () => bg.setFillStyle(0x1a1000, 0.9));

    const emoji   = this.add.text(rx + 8,  ry + rh / 2, slot.item.emoji, { fontSize: '18px' }).setOrigin(0, 0.5);
    const nameQty = this.add.text(rx + 34, ry + rh / 2,
      `${slot.item.name}${slot.qty > 1 ? ` ×${slot.qty}` : ''}`,
      { fontSize: '13px', color: '#ffe8cc' }).setOrigin(0, 0.5);
    const price   = this.add.text(rx + rw - 105, ry + rh / 2, `💰 ${slot.item.sellPrice}G`, { fontSize: '12px', color: '#ffcc66' }).setOrigin(1, 0.5);

    const btn = this.add.text(rx + rw - 60, ry + rh / 2, 'Bán', {
      fontSize: '11px', color: '#ffcc22',
      backgroundColor: '#3a2000',
      padding: { x: 6, y: 3 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setBackgroundColor('#6a3a00').setColor('#ffffff'))
      .on('pointerout',  () => btn.setBackgroundColor('#3a2000').setColor('#ffcc22'))
      .on('pointerdown', () => {
        this.onShopSell?.(slotIndex);
        this.refreshShopRows();
      });

    const sellAllBtn = this.add.text(rx + rw - 4, ry + rh / 2, 'Tất cả', {
      fontSize: '11px', color: '#ffcc22',
      backgroundColor: '#3a2000',
      padding: { x: 6, y: 3 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => sellAllBtn.setBackgroundColor('#6a3a00').setColor('#ffffff'))
      .on('pointerout',  () => sellAllBtn.setBackgroundColor('#3a2000').setColor('#ffcc22'))
      .on('pointerdown', () => {
        this.onShopSellAll?.(slotIndex);
        this.refreshShopRows();
      });

    this.shopRowContainer.add([bg, emoji, nameQty, price, btn, sellAllBtn]);
  }
}