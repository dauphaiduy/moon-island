import Phaser from 'phaser';
import { SceneKey } from '../constants';
import type { InventorySystem } from '../systems/InventorySystem';
import type { DayNightState, TimeOfDay } from '../systems/DayNightSystem';

const SLOT_SIZE   = 44;
const SLOT_GAP    = 6;
const HOTBAR_COLS = 8;
const HOTBAR_W    = HOTBAR_COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;

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
    this.add.text(W / 2, H - 4, 'Tab: công cụ  |  E: tương tác  |  Q: bán tất cả  |  ESC: menu', {
      fontSize: '10px', color: '#ffffff55',
    }).setOrigin(0.5, 1);

    // ── Pause menu (hidden by default) ───────────────────────────────────────
    this.buildPauseMenu(W, H);
  }

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
    const slots = inventory.getHotbar();
    for (let i = 0; i < HOTBAR_COLS; i++) {
      const slot = slots[i];
      if (slot) {
        this.hotbarEmojis[i].setText(slot.item.emoji);
        this.hotbarQtys[i].setText(slot.qty > 1 ? String(slot.qty) : '');
        this.hotbarBgs[i].setFillStyle(0x1a3a1a, 0.75);
      } else {
        this.hotbarEmojis[i].setText('');
        this.hotbarQtys[i].setText('');
        this.hotbarBgs[i].setFillStyle(0x000000, 0.55);
      }
    }
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
}