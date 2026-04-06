import Phaser from 'phaser';
import type { ItemDef } from '../../types';
import type { ItemRarity } from '../../types';

export interface TreasureLootEntry {
  item: ItemDef;
  qty: number;
}

const RARITY_COLORS: Record<ItemRarity, string> = {
  common:    '#dddddd',
  uncommon:  '#80ff80',
  rare:      '#4a9fff',
  epic:      '#cc80ff',
  legendary: '#ffcc00',
};

/**
 * Dungeon-specific popup panel that shows the contents of a treasure chest.
 * Lives inside DungeonScene (not UIScene) — no Phaser scene dependency needed.
 */
export class TreasurePanel {
  private readonly scene: Phaser.Scene;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private _isOpen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isOpen(): boolean { return this._isOpen; }

  open(loot: TreasureLootEntry[], onTakeAll: (taken: TreasureLootEntry[]) => void): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.build(loot, onTakeAll);
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    for (const obj of this.objects) obj.destroy();
    this.objects = [];
  }

  /** Helper: add an object to the tracked list, pin it to screen space, and set depth. */
  private pin<T extends Phaser.GameObjects.GameObject & { setScrollFactor(x: number): T; setDepth(v: number): T }>(obj: T): T {
    obj.setScrollFactor(0).setDepth(20);
    this.objects.push(obj);
    return obj;
  }

  private build(loot: TreasureLootEntry[], onTakeAll: (taken: TreasureLootEntry[]) => void): void {
    const { width: W, height: H } = this.scene.scale;

    // ── Overlay ──────────────────────────────────────────────────────────────
    this.pin(
      this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.65)
        .setOrigin(0)
        .setInteractive() // block clicks from reaching the game world
    );

    // ── Panel box ────────────────────────────────────────────────────────────
    const panelW = 300;
    const rowH   = 48;
    const panelH = 120 + loot.length * rowH + 50;
    const px = W / 2 - panelW / 2;
    const py = H / 2 - panelH / 2;

    this.pin(
      this.scene.add.rectangle(px, py, panelW, panelH, 0x160800, 0.97)
        .setOrigin(0)
        .setStrokeStyle(2, 0xcc8833, 1)
    );

    // ── Header ───────────────────────────────────────────────────────────────
    this.pin(
      this.scene.add.text(W / 2, py + 18, '🎁  Rương Báu', {
        fontSize: '17px', color: '#ffe066', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 0)
    );

    this.pin(
      this.scene.add.text(W / 2, py + 46, 'Bạn tìm thấy những vật phẩm bên trong!', {
        fontSize: '10px', color: '#bb9955',
      }).setOrigin(0.5, 0)
    );

    // ── Loot rows ────────────────────────────────────────────────────────────
    loot.forEach((entry, i) => {
      const ry = py + 76 + i * rowH;

      this.pin(
        this.scene.add.rectangle(px + 10, ry, panelW - 20, rowH - 3, 0x2a1200, 0.9)
          .setOrigin(0)
          .setStrokeStyle(1, 0x7a5520, 0.7)
      );

      this.pin(
        this.scene.add.text(px + 22, ry + (rowH - 3) / 2, entry.item.emoji, {
          fontSize: '22px',
        }).setOrigin(0, 0.5)
      );

      this.pin(
        this.scene.add.text(px + 52, ry + 6, entry.item.name, {
          fontSize: '11px', color: RARITY_COLORS[entry.item.rarity], fontStyle: 'bold',
        })
      );

      this.pin(
        this.scene.add.text(px + 52, ry + 22, entry.item.description ?? '', {
          fontSize: '9px', color: '#999999',
          wordWrap: { width: panelW - 100 },
        })
      );

      this.pin(
        this.scene.add.text(px + panelW - 16, ry + (rowH - 6) / 2, `×${entry.qty}`, {
          fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(1, 0.5)
      );
    });

    // ── Buttons ───────────────────────────────────────────────────────────────
    const btnY = py + 82 + loot.length * rowH;

    const takeBtn = this.pin(
      this.scene.add.text(W / 2 - 60, btnY, '✔ Lấy tất cả', {
        fontSize: '13px', color: '#80ff80',
        backgroundColor: '#0a2a0a',
        padding: { x: 12, y: 7 },
      }).setOrigin(0.5, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => takeBtn.setColor('#ffffff').setBackgroundColor('#1a4a1a'))
        .on('pointerout',  () => takeBtn.setColor('#80ff80').setBackgroundColor('#0a2a0a'))
        .on('pointerdown', () => { onTakeAll(loot); this.close(); })
    );

    this.pin(
      this.scene.add.text(W / 2 + 60, btnY, '✖ Đóng', {
        fontSize: '13px', color: '#ff8080',
        backgroundColor: '#2a0a0a',
        padding: { x: 12, y: 7 },
      }).setOrigin(0.5, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#ffffff').setBackgroundColor('#4a1a1a'); })
        .on('pointerout',  function(this: Phaser.GameObjects.Text) { this.setColor('#ff8080').setBackgroundColor('#2a0a0a'); })
        .on('pointerdown', () => this.close())
    );
  }
}
