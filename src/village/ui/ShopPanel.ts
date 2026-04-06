import Phaser from 'phaser';
import type { InventorySystem } from '../../common/systems/InventorySystem';
import type { ShopItem } from '../../types/npc';
import type { ItemId } from '../../types';
import { ITEMS } from '../../common/data/items';

export class ShopPanel {
  private scene: Phaser.Scene;
  private shopContainer!:    Phaser.GameObjects.Container;
  private shopRowContainer!: Phaser.GameObjects.Container;
  private shopTitleText!:    Phaser.GameObjects.Text;
  private shopGoldText!:     Phaser.GameObjects.Text;
  private shopTabBuy!:       Phaser.GameObjects.Text;
  private shopTabSell!:      Phaser.GameObjects.Text;
  private _isOpen        = false;
  private _tab: 'buy' | 'sell' = 'buy';
  private _catalog:  ShopItem[]          = [];
  private _invRef:   InventorySystem | null = null;
  private _rowX      = 0;
  private _rowStartY = 0;
  private _rowW      = 0;

  onBuy?:     (itemId: ItemId, price: number) => void;
  onSell?:    (slotIndex: number) => void;
  onSellAll?: (slotIndex: number) => void;

  constructor(scene: Phaser.Scene, W: number, H: number) {
    this.scene = scene;
    this.build(W, H);
  }

  get isOpen(): boolean { return this._isOpen; }

  open(catalog: ShopItem[], inventory: InventorySystem, npcName: string, npcEmoji: string): void {
    this._catalog = catalog;
    this._invRef  = inventory;
    this._tab     = 'buy';
    this.shopTitleText.setText(`${npcEmoji}  ${npcName}`);
    this.refreshRows();
    this._isOpen = true;
    this.shopContainer.setVisible(true).setAlpha(0);
    this.shopRowContainer.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: [this.shopContainer, this.shopRowContainer], alpha: 1, duration: 180 });
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.scene.tweens.add({
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

  private setTab(tab: 'buy' | 'sell'): void {
    if (this._tab === tab) return;
    this._tab = tab;
    this.refreshRows();
  }

  private refreshRows(): void {
    this.shopRowContainer.removeAll(true);

    const ROW_H   = 30;
    const ROW_GAP = 4;
    const rx      = this._rowX;
    const rw      = this._rowW;
    let   ry      = this._rowStartY;

    if (this._tab === 'buy') {
      this.shopTabBuy .setColor('#ffe066').setBackgroundColor('#1a3a5a');
      this.shopTabSell.setColor('#888888').setBackgroundColor('#1a1a1a');
    } else {
      this.shopTabBuy .setColor('#888888').setBackgroundColor('#1a1a1a');
      this.shopTabSell.setColor('#ffe066').setBackgroundColor('#2a3000');
    }

    if (this._invRef) {
      this.shopGoldText.setText(`💰 ${this._invRef.gold.toLocaleString()} G`);
    }

    if (this._tab === 'buy') {
      this._catalog.forEach((item, _i) => {
        ry = this._rowStartY + _i * (ROW_H + ROW_GAP);
        this.addBuyRow(rx, ry, rw, ROW_H, item);
      });

      if (this._catalog.length === 0) {
        const t = this.scene.add.text(rx + rw / 2, ry + 30, 'Không có hàng hôm nay', {
          fontSize: '12px', color: '#666666',
        }).setOrigin(0.5, 0);
        this.shopRowContainer.add(t);
      }
    } else {
      const inv = this._invRef;
      if (!inv) return;
      const slots = inv.getAllSlots();
      let row = 0;
      for (let si = 0; si < slots.length && row < 8; si++) {
        const slot = slots[si];
        if (!slot || slot.item.sellPrice <= 0) continue;
        this.addSellRow(rx, this._rowStartY + row * (ROW_H + ROW_GAP), rw, ROW_H, si, slot);
        row++;
      }

      if (row === 0) {
        const t = this.scene.add.text(rx + rw / 2, this._rowStartY + 30, 'Không có vật phẩm để bán', {
          fontSize: '12px', color: '#666666',
        }).setOrigin(0.5, 0);
        this.shopRowContainer.add(t);
      }
    }
  }

  private addBuyRow(rx: number, ry: number, rw: number, rh: number, item: ShopItem): void {
    const def = ITEMS[item.itemId];
    const bg  = this.scene.add.rectangle(rx, ry, rw, rh, 0x061830, 0.9).setOrigin(0)
      .setStrokeStyle(1, 0x1a4a8a, 0.7)
      .setInteractive()
      .on('pointerover', () => bg.setFillStyle(0x0e2a50, 0.95))
      .on('pointerout',  () => bg.setFillStyle(0x061830, 0.9));

    const emoji = this.scene.add.text(rx + 8,  ry + rh / 2, def.emoji, { fontSize: '18px' }).setOrigin(0, 0.5);
    const name  = this.scene.add.text(rx + 36, ry + rh / 2, def.name,  { fontSize: '13px', color: '#d0eeff' }).setOrigin(0, 0.5);
    const price = this.scene.add.text(rx + rw - 86, ry + rh / 2, `💰 ${item.price}G`, { fontSize: '12px', color: '#ffe066' }).setOrigin(0, 0.5);

    const btn = this.scene.add.text(rx + rw - 4, ry + rh / 2, 'Mua', {
      fontSize: '12px', color: '#80ff80',
      backgroundColor: '#0a3a1a',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setBackgroundColor('#1a6a2a').setColor('#ffffff'))
      .on('pointerout',  () => btn.setBackgroundColor('#0a3a1a').setColor('#80ff80'))
      .on('pointerdown', () => {
        this.onBuy?.(item.itemId, item.price);
        if (this._invRef) {
          this.shopGoldText.setText(`💰 ${this._invRef.gold.toLocaleString()} G`);
        }
      });

    this.shopRowContainer.add([bg, emoji, name, price, btn]);
  }

  private addSellRow(
    rx: number, ry: number, rw: number, rh: number,
    slotIndex: number,
    slot: { item: { emoji: string; name: string; sellPrice: number }; qty: number },
  ): void {
    const bg = this.scene.add.rectangle(rx, ry, rw, rh, 0x1a1000, 0.9).setOrigin(0)
      .setStrokeStyle(1, 0x5a3a00, 0.7)
      .setInteractive()
      .on('pointerover', () => bg.setFillStyle(0x2a1a00, 0.95))
      .on('pointerout',  () => bg.setFillStyle(0x1a1000, 0.9));

    const emoji   = this.scene.add.text(rx + 8,  ry + rh / 2, slot.item.emoji, { fontSize: '18px' }).setOrigin(0, 0.5);
    const nameQty = this.scene.add.text(rx + 34, ry + rh / 2,
      `${slot.item.name}${slot.qty > 1 ? ` ×${slot.qty}` : ''}`,
      { fontSize: '13px', color: '#ffe8cc' }).setOrigin(0, 0.5);
    const price   = this.scene.add.text(rx + rw - 105, ry + rh / 2, `💰 ${slot.item.sellPrice}G`, { fontSize: '12px', color: '#ffcc66' }).setOrigin(1, 0.5);

    const btn = this.scene.add.text(rx + rw - 60, ry + rh / 2, 'Bán', {
      fontSize: '11px', color: '#ffcc22',
      backgroundColor: '#3a2000',
      padding: { x: 6, y: 3 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => btn.setBackgroundColor('#6a3a00').setColor('#ffffff'))
      .on('pointerout',  () => btn.setBackgroundColor('#3a2000').setColor('#ffcc22'))
      .on('pointerdown', () => {
        this.onSell?.(slotIndex);
        this.refreshRows();
      });

    const sellAllBtn = this.scene.add.text(rx + rw - 4, ry + rh / 2, 'Tất cả', {
      fontSize: '11px', color: '#ffcc22',
      backgroundColor: '#3a2000',
      padding: { x: 6, y: 3 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerover', () => sellAllBtn.setBackgroundColor('#6a3a00').setColor('#ffffff'))
      .on('pointerout',  () => sellAllBtn.setBackgroundColor('#3a2000').setColor('#ffcc22'))
      .on('pointerdown', () => {
        this.onSellAll?.(slotIndex);
        this.refreshRows();
      });

    this.shopRowContainer.add([bg, emoji, nameQty, price, btn, sellAllBtn]);
  }

  private build(W: number, H: number): void {
    const CX    = W / 2;
    const CY    = H / 2;
    const BOX_W = 460;
    const BOX_H = 380;
    const BT    = CY - BOX_H / 2;
    const BL    = CX - BOX_W / 2;

    this._rowX      = BL + 20;
    this._rowStartY = BT + 102;
    this._rowW      = BOX_W - 40;

    const overlay = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0);
    const box     = this.scene.add.rectangle(CX, CY, BOX_W, BOX_H, 0x0a1020, 0.96)
      .setStrokeStyle(2, 0x4a9eff, 0.85);

    this.shopTitleText = this.scene.add.text(CX, BT + 18, '🛒', {
      fontSize: '15px', color: '#ffe066', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const topDiv = this.scene.add.rectangle(CX, BT + 38, BOX_W - 30, 1, 0x4a9eff, 0.4);

    const tabY = BT + 57;
    this.shopTabBuy = this.scene.add.text(CX - 58, tabY, '🛒  Mua', {
      fontSize: '13px', color: '#ffe066',
      backgroundColor: '#1a3a5a',
      padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setTab('buy'));

    this.shopTabSell = this.scene.add.text(CX + 58, tabY, '💰  Bán', {
      fontSize: '13px', color: '#888888',
      backgroundColor: '#1a1a1a',
      padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setTab('sell'));

    const tabDiv = this.scene.add.rectangle(CX, BT + 80, BOX_W - 30, 1, 0x4a9eff, 0.25);

    const closeBtn = this.scene.add.text(CX + BOX_W / 2 - 18, BT + 17, '✕', {
      fontSize: '13px', color: '#888888',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover',  () => closeBtn.setColor('#ffffff'))
      .on('pointerout',   () => closeBtn.setColor('#888888'))
      .on('pointerdown',  () => this.close());

    const footDiv = this.scene.add.rectangle(CX, BT + BOX_H - 50, BOX_W - 30, 1, 0x4a9eff, 0.25);
    this.shopGoldText = this.scene.add.text(CX, BT + BOX_H - 36, '💰 0 G', {
      fontSize: '13px', color: '#ffe066',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    const hint = this.scene.add.text(CX, BT + BOX_H - 14, 'Click để mua/bán  |  ESC đóng', {
      fontSize: '9px', color: '#ffffff33',
    }).setOrigin(0.5);

    this.shopContainer = this.scene.add.container(0, 0, [
      overlay, box, this.shopTitleText, topDiv,
      this.shopTabBuy, this.shopTabSell, tabDiv, closeBtn,
      footDiv, this.shopGoldText, hint,
    ]).setVisible(false).setAlpha(0).setDepth(100);

    this.shopRowContainer = this.scene.add.container(0, 0, [])
      .setVisible(false).setAlpha(0).setDepth(101);
  }
}
