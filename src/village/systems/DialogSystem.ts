import Phaser from 'phaser';
import type { NPC } from '../objects/NPC';
import type { InventorySystem } from '../../common/systems/InventorySystem';
import { ITEMS } from '../../common/data/items';

type DialogMode = 'dialog' | 'shop' | 'quest' | 'quest_complete' | 'closed';

export class DialogSystem {
  private scene:     Phaser.Scene;
  private inventory: InventorySystem;

  // State
  private mode:         DialogMode = 'closed';
  private currentNpc:   NPC | null = null;
  private dialogIndex   = 0;
  private completedQuests = new Set<string>();

  // UI elements
  private panel!:      Phaser.GameObjects.Rectangle;
  private nameText!:   Phaser.GameObjects.Text;
  private bodyText!:   Phaser.GameObjects.Text;
  private hintText!:   Phaser.GameObjects.Text;
  private shopItems:   Phaser.GameObjects.Text[] = [];
  private container!:  Phaser.GameObjects.Container;

  onGoldSpend?: (amount: number) => void;

  constructor(scene: Phaser.Scene, inventory: InventorySystem) {
    this.scene     = scene;
    this.inventory = inventory;
    this.buildUI();
    this.close();
  }

  // ─── UI construction ─────────────────────────────────────────────────────────

  private buildUI(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const PW = W - 40;
    const PH = 130;
    const PX = 20;
    const PY = H - PH - 60; // above hotbar

    this.container = this.scene.add.container(0, 0).setDepth(200).setScrollFactor(0);

    this.panel = this.scene.add.rectangle(PX, PY, PW, PH, 0x1a1a2e, 0.92)
      .setOrigin(0).setStrokeStyle(2, 0x4a9eff, 0.8);
    this.container.add(this.panel);

    this.nameText = this.scene.add.text(PX + 14, PY + 12, '', {
      fontSize: '14px', color: '#4a9eff', fontStyle: 'bold',
    });
    this.container.add(this.nameText);

    this.bodyText = this.scene.add.text(PX + 14, PY + 36, '', {
      fontSize: '13px', color: '#ffffff',
      wordWrap: { width: PW - 28 },
      lineSpacing: 4,
    });
    this.container.add(this.bodyText);

    this.hintText = this.scene.add.text(PX + PW - 14, PY + PH - 12, '', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(1, 1);
    this.container.add(this.hintText);
  }

  // ─── Open / close ────────────────────────────────────────────────────────────

  open(npc: NPC): void {
    this.currentNpc  = npc;
    this.dialogIndex = 0;
    this.clearShopItems();
    npc.tryDailyChat();

    // Decide mode
    if (npc.def.quest && !this.completedQuests.has(npc.def.quest.id)) {
      const q    = npc.def.quest;
      const have = this.inventory.count(q.goal.itemId);
      this.mode  = have >= q.goal.qty ? 'quest_complete' : 'quest';
    } else if (npc.def.shop) {
      this.mode = 'shop';
    } else {
      this.mode = 'dialog';
    }

    this.container.setVisible(true);
    this.render();
  }

  close(): void {
    this.mode       = 'closed';
    this.currentNpc = null;
    this.clearShopItems();
    this.container?.setVisible(false);
  }

  get isOpen(): boolean { return this.mode !== 'closed'; }

  getCompletedQuests(): string[] {
    return [...this.completedQuests];
  }

  loadCompletedQuests(ids: string[]): void {
    this.completedQuests = new Set(ids);
  }

  // ─── Advance / interact ──────────────────────────────────────────────────────

  /** Call when player presses E while dialog is open */
  advance(): void {
    if (!this.currentNpc) return;

    switch (this.mode) {
      case 'dialog':
        this.dialogIndex = (this.dialogIndex + 1) % this.currentNpc.activeDialog.length;
        if (this.dialogIndex === 0) { this.close(); return; }
        break;

      case 'quest':
        // Show quest info then move to dialog
        this.mode = 'dialog';
        break;

      case 'quest_complete': {
        const q = this.currentNpc.def.quest!;
        this.inventory.removeByIdAndQty(q.goal.itemId, q.goal.qty);
        this.onGoldSpend?.(-q.reward.gold); // negative = earn
        this.currentNpc.gainFriendship(3);
        this.completedQuests.add(q.id);
        this.mode = 'dialog';
        this.bodyText.setText(q.reward.dialog);
        this.hintText.setText('[E] Đóng');
        return;
      }

      case 'shop':
        // Shop is navigated with number keys — E closes
        this.close();
        return;
    }

    this.render();
  }

  /** Buy item at shop slot index (0-based). Returns true if success. */
  buyShopItem(index: number): boolean {
    if (this.mode !== 'shop' || !this.currentNpc?.def.shop) return false;
    const item = this.currentNpc.def.shop[index];
    if (!item) return false;

    const canBuy = (this.inventory.gold ?? 0) >= item.price;  // gold checked externally via onGoldSpend
    if (!canBuy) return false;

    this.inventory.add(item.itemId, 1);
    this.onGoldSpend?.(item.price);
    this.render(); // refresh stock display
    return true;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  private render(): void {
    const npc = this.currentNpc!;
    this.nameText.setText(`${npc.def.emoji}  ${npc.def.name}`);
    this.clearShopItems();

    switch (this.mode) {
      case 'dialog':
        this.bodyText.setText(npc.activeDialog[this.dialogIndex].text);
        this.hintText.setText('[E] Tiếp tục');
        break;

      case 'quest': {
        const q = npc.def.quest!;
        const have = this.inventory.count(q.goal.itemId);
        const def  = ITEMS[q.goal.itemId];
        this.bodyText.setText(
          `📋 ${q.title}\n${q.description}\n` +
          `Tiến độ: ${have}/${q.goal.qty} ${def.emoji}${def.name}`,
        );
        this.hintText.setText('[E] Đồng ý');
        break;
      }

      case 'quest_complete': {
        const q   = npc.def.quest!;
        const def = ITEMS[q.goal.itemId];
        this.bodyText.setText(
          `✅ Đã đủ ${q.goal.qty} ${def.emoji}${def.name}!\n` +
          `Phần thưởng: 💰${q.reward.gold}G`,
        );
        this.hintText.setText('[E] Nhận thưởng');
        break;
      }

      case 'shop': {
        const shop = npc.def.shop!;
        this.bodyText.setText('');
        const PY = this.scene.scale.height - 130 - 60;
        shop.forEach((item, i) => {
          const def  = ITEMS[item.itemId];
          const text = this.scene.add.text(
            40, PY + 36 + i * 24,
            `[${i + 1}] ${def.emoji} ${def.name}  —  💰${item.price}G`,
            { fontSize: '12px', color: '#ffffff' },
          ).setScrollFactor(0).setDepth(201);
          this.shopItems.push(text);
        });
        this.hintText.setText('[1/2/3] Mua  |  [E] Đóng');
        break;
      }
    }
  }

  private clearShopItems(): void {
    for (const t of this.shopItems) t.destroy();
    this.shopItems = [];
  }
}