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
    this.add.text(W / 2, H - 4, 'Tab: công cụ  |  E: tương tác  |  Q: bán tất cả  |  N: skip giờ', {
      fontSize: '10px', color: '#ffffff55',
    }).setOrigin(0.5, 1);
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
}