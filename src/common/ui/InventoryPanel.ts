import Phaser from 'phaser';
import type { InventorySystem } from '../systems/InventorySystem';
import { ITEMS } from '../data/items';

const SLOT_SIZE = 44;
const SLOT_GAP  = 6;
const INV_COLS  = 8;
const INV_ROWS  = 3;

export class InventoryPanel {
  private scene: Phaser.Scene;
  private invContainer!:   Phaser.GameObjects.Container;
  private invSlotBgs:      Phaser.GameObjects.Rectangle[] = [];
  private invSlotEmojis:   Phaser.GameObjects.Text[]      = [];
  private invSlotQtys:     Phaser.GameObjects.Text[]      = [];
  private invSlotNames:    Phaser.GameObjects.Text[]      = [];
  private invGoldText!:    Phaser.GameObjects.Text;
  private invInfoText!:    Phaser.GameObjects.Text;
  private useBtn!:         Phaser.GameObjects.Text;
  private _isOpen          = false;
  private _inventoryRef:   InventorySystem | null = null;
  private invSelectedSlot: number | null = null;

  /** Fired when the player clicks "Dùng" on a food item. */
  onUse?: (slotIndex: number) => void;

  constructor(scene: Phaser.Scene, W: number, H: number) {
    this.scene = scene;
    this.build(W, H);
  }

  get isOpen(): boolean { return this._isOpen; }

  toggle(inventory: InventorySystem): void {
    this._inventoryRef = inventory;
    if (this._isOpen) {
      this.close();
    } else {
      this.refresh(inventory);
      this.openPanel();
    }
  }

  private openPanel(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.invContainer.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.invContainer, alpha: 1, duration: 180 });
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.invSelectedSlot = null;
    this.useBtn?.setVisible(false);
    this.scene.tweens.add({
      targets: this.invContainer,
      alpha: 0,
      duration: 150,
      onComplete: () => this.invContainer.setVisible(false),
    });
  }

  refresh(inventory: InventorySystem): void {
    const slots = inventory.getAllSlots();
    for (let i = 0; i < slots.length; i++) {
      const slot  = slots[i];
      const isSel = this.invSelectedSlot === i;
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

  private handleSlotClick(i: number): void {
    const inv = this._inventoryRef;
    if (!inv) return;

    if (this.invSelectedSlot === null) {
      if (inv.getSlot(i)) {
        this.invSelectedSlot = i;
        this.refresh(inv);
        this.updateUseBtn(i, inv);
      }
    } else if (this.invSelectedSlot === i) {
      this.invSelectedSlot = null;
      this.useBtn?.setVisible(false);
      this.refresh(inv);
    } else {
      inv.swapSlots(this.invSelectedSlot, i);
      this.invSelectedSlot = null;
      this.useBtn?.setVisible(false);
      this.refresh(inv);
    }
  }

  private updateUseBtn(slotIndex: number, inv: InventorySystem): void {
    const slot = inv.getSlot(slotIndex);
    if (slot && ITEMS[slot.item.id]?.staminaRestore) {
      this.useBtn.setText(`🍽 Dùng  ${slot.item.emoji}  ${slot.item.name}`);
      this.useBtn.setVisible(true);
      // Re-bind click so we always capture the latest slotIndex
      this.useBtn.off('pointerdown');
      this.useBtn.on('pointerdown', () => {
        this.onUse?.(slotIndex);
        this.invSelectedSlot = null;
        this.useBtn.setVisible(false);
        if (this._inventoryRef) this.refresh(this._inventoryRef);
      });
    } else {
      this.useBtn.setVisible(false);
    }
  }

  private build(W: number, H: number): void {
    const TOTAL  = INV_COLS * INV_ROWS;
    const STEP   = SLOT_SIZE + SLOT_GAP;
    const GRID_W = INV_COLS * STEP - SLOT_GAP;
    const BOX_W  = GRID_W + 40;
    const BOX_H  = 316;
    const CX = W / 2;
    const CY = H / 2;
    const BT = CY - BOX_H / 2;
    const originX = CX - GRID_W / 2;

    const y_title   = BT + 22;
    const y_hbLbl   = BT + 46;
    const y_hbSep   = BT + 65;
    const y_hbRow   = BT + 74;
    const y_midSep  = BT + 128;
    const y_bpLbl   = BT + 140;
    const y_bpRow0  = BT + 159;
    const y_bpRow1  = y_bpRow0 + STEP;
    const y_info    = y_bpRow1 + SLOT_SIZE + 12;
    const y_gold    = y_info + 18;
    const y_hint    = y_gold + 18;

    const overlay = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0);
    const box = this.scene.add.rectangle(CX, CY, BOX_W, BOX_H, 0x0d1f0d, 0.96)
      .setStrokeStyle(2, 0x4a9a3a, 1);

    const title = this.scene.add.text(CX, y_title, '🎒 TÚI ĐỒ', {
      fontSize: '16px', color: '#ffe066', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const hbLabel = this.scene.add.text(originX, y_hbLbl,
      '🖥  Thanh hiển thị  (hiện trên màn hình)', {
        fontSize: '10px', color: '#aaffaa',
      });
    const hbSep = this.scene.add.rectangle(CX, y_hbSep, GRID_W, 1, 0x4a9a3a, 0.6);
    const hbBg  = this.scene.add.rectangle(originX - 4, y_hbRow - 4,
      GRID_W + 8, SLOT_SIZE + 8, 0x0a2a10, 0.35).setOrigin(0);

    const midSep  = this.scene.add.rectangle(CX, y_midSep, GRID_W, 1, 0x334433, 0.5);
    const bpLabel = this.scene.add.text(originX, y_bpLbl, '🎒  Ba lô  (không hiện trên màn hình)', {
      fontSize: '10px', color: '#88cc88',
    });

    this.invInfoText = this.scene.add.text(CX, y_info, '', {
      fontSize: '12px', color: '#ffe066',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.useBtn = this.scene.add.text(CX, y_info + 18, '', {
      fontSize: '12px', color: '#80ff80',
      backgroundColor: '#0a3a1a',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.useBtn.setBackgroundColor('#1a6a2a').setColor('#ffffff'))
      .on('pointerout',  () => this.useBtn.setBackgroundColor('#0a3a1a').setColor('#80ff80'));
    this.invGoldText = this.scene.add.text(CX, y_gold, '💰 0 G', {
      fontSize: '12px', color: '#ffe066',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    const hint = this.scene.add.text(CX, y_hint,
      'Click chọn  →  Click đích để di chuyển   |   I / ESC: đóng', {
        fontSize: '9px', color: '#ffffff44',
      }).setOrigin(0.5);

    const gridObjs: Phaser.GameObjects.GameObject[] = [];

    for (let i = 0; i < TOTAL; i++) {
      const col     = i % INV_COLS;
      const section = Math.floor(i / INV_COLS);
      const sx = originX + col * STEP;
      const sy = section === 0 ? y_hbRow : (section === 1 ? y_bpRow0 : y_bpRow1);

      const bg = this.scene.add.rectangle(sx, sy, SLOT_SIZE, SLOT_SIZE, 0x0a1a0a, 0.7)
        .setOrigin(0)
        .setStrokeStyle(1, 0x334433, 0.5)
        .setInteractive()
        .on('pointerdown', () => this.handleSlotClick(i))
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

      const emoji = this.scene.add.text(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2, '', {
        fontSize: '22px',
      }).setOrigin(0.5);
      this.invSlotEmojis.push(emoji);

      const qty = this.scene.add.text(sx + SLOT_SIZE - 3, sy + SLOT_SIZE - 3, '', {
        fontSize: '10px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 1);
      this.invSlotQtys.push(qty);

      const name = this.scene.add.text(0, -9999, '', { fontSize: '8px' });
      this.invSlotNames.push(name);

      gridObjs.push(bg, emoji, qty, name);
    }

    this.invContainer = this.scene.add.container(0, 0, [
      overlay, box, title,
      hbLabel, hbSep, hbBg,
      midSep, bpLabel,
      this.invInfoText, this.useBtn, this.invGoldText, hint,
      ...gridObjs,
    ]);
    this.invContainer.setVisible(false);
    this.invContainer.setDepth(90);
  }
}
