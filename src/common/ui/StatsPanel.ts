import Phaser from 'phaser';
import type { PlayerStatsSystem } from '../systems/PlayerStatsSystem';
import { STAMINA_BASE, STAMINA_PER_POINT } from '../systems/PlayerStatsSystem';

/**
 * Modal Stats panel — opened with the P key.
 * Shows the player's unspent points and lets them allocate into
 * strength, physical, or stamina.
 *
 * Call refresh(stats) whenever stats change to update displayed values.
 */
export class StatsPanel {
  private readonly container: Phaser.GameObjects.Container;
  private _isOpen = false;

  // Dynamic text refs
  private pointsBadge!: Phaser.GameObjects.Text;
  private strValue!:    Phaser.GameObjects.Text;
  private phyValue!:    Phaser.GameObjects.Text;
  private staValue!:    Phaser.GameObjects.Text;
  private strBtn!:      Phaser.GameObjects.Text;
  private phyBtn!:      Phaser.GameObjects.Text;
  private staBtn!:      Phaser.GameObjects.Text;
  private staminaBar!:  Phaser.GameObjects.Rectangle;
  private staminaText!: Phaser.GameObjects.Text;

  /**
   * Called when the player presses + on a stat row.
   * GameSession handles spending the point and calling refresh().
   */
  onSpend?: (stat: 'strength' | 'physical' | 'stamina') => void;

  get isOpen(): boolean { return this._isOpen; }

  constructor(scene: Phaser.Scene, W: number, H: number) {
    const CX   = W / 2;
    const CY   = H / 2;
    const BW   = 300;
    const BH   = 300;
    const LX   = CX - BW / 2 + 24;   // left content x
    const RX   = CX + BW / 2 - 24;   // right content x

    // ── Background ──────────────────────────────────────────────────────────
    const backdrop = scene.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0);
    const box      = scene.add.rectangle(CX, CY, BW, BH, 0x0a1a2a, 0.97)
      .setStrokeStyle(2, 0x4a9aff, 1);

    // ── Title ────────────────────────────────────────────────────────────────
    const title = scene.add.text(CX, CY - BH / 2 + 22, '🧑 Nhân vật', {
      fontSize: '16px', color: '#aaddff',
      fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const divider = scene.add.rectangle(CX, CY - BH / 2 + 42, BW - 32, 1, 0x4a9aff, 0.4);

    // ── Unspent points badge ─────────────────────────────────────────────────
    this.pointsBadge = scene.add.text(CX, CY - BH / 2 + 60, '🎯 Điểm chưa dùng: 0', {
      fontSize: '12px', color: '#ffe066',
      backgroundColor: '#22220066',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0);

    // ── Stat rows ────────────────────────────────────────────────────────────
    const ROW_Y_START = CY - BH / 2 + 96;
    const ROW_GAP     = 40;

    const statDefs: {
      label: string;
      key: 'strength' | 'physical' | 'stamina';
      desc: string;
    }[] = [
      { label: '⚔️  Sức mạnh',  key: 'strength', desc: '(hầm ngục)' },
      { label: '🛡️  Thể chất',  key: 'physical',  desc: '(hầm ngục)' },
      { label: '💪  Thể lực',   key: 'stamina',   desc: `(+${STAMINA_PER_POINT} max/điểm)` },
    ];

    const valueRefs:  Phaser.GameObjects.Text[] = [];
    const btnRefs:    Phaser.GameObjects.Text[] = [];
    const labelRefs:  Phaser.GameObjects.Text[] = [];
    const descRefs:   Phaser.GameObjects.Text[] = [];

    for (let i = 0; i < statDefs.length; i++) {
      const y   = ROW_Y_START + i * ROW_GAP;
      const def = statDefs[i];

      // Label + description — kept in arrays so they go into the container
      labelRefs.push(scene.add.text(LX, y, def.label, {
        fontSize: '13px', color: '#ccddff',
      }).setOrigin(0, 0.5));

      descRefs.push(scene.add.text(LX + 100, y + 10, def.desc, {
        fontSize: '9px', color: '#8899bb',
      }).setOrigin(0, 1));

      // Current value
      const val = scene.add.text(RX - 36, y, '0', {
        fontSize: '14px', color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
      valueRefs.push(val);

      // + button
      const btn = scene.add.text(RX, y, '[+]', {
        fontSize: '13px', color: '#80ff80',
        backgroundColor: '#0a3a1a',
        padding: { x: 6, y: 4 },
      }).setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover',  () => btn.setColor('#ffffff').setBackgroundColor('#1a6a2a'))
        .on('pointerout',   () => btn.setColor('#80ff80').setBackgroundColor('#0a3a1a'))
        .on('pointerdown',  () => this.onSpend?.(def.key));
      btnRefs.push(btn);
    }

    this.strValue = valueRefs[0];
    this.phyValue = valueRefs[1];
    this.staValue = valueRefs[2];
    this.strBtn   = btnRefs[0];
    this.phyBtn   = btnRefs[1];
    this.staBtn   = btnRefs[2];

    // ── Stamina bar ──────────────────────────────────────────────────────────
    const barY    = CY + BH / 2 - 52;
    const barW    = BW - 64;
    const barLX   = CX - barW / 2;

    const staminaLabel = scene.add.text(CX, barY - 14, 'Thể lực hiện tại', {
      fontSize: '10px', color: '#99bbdd',
    }).setOrigin(0.5, 1);

    const staminaBg = scene.add.rectangle(barLX + barW / 2, barY, barW, 14, 0x112233, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0x4a9aff, 0.6);

    this.staminaBar = scene.add.rectangle(barLX, barY - 6, 0, 12, 0x4499ff, 1)
      .setOrigin(0, 0);

    this.staminaText = scene.add.text(CX, barY + 12, `${STAMINA_BASE} / ${STAMINA_BASE}`, {
      fontSize: '10px', color: '#aaccee',
    }).setOrigin(0.5, 0);

    // ── Close hint ───────────────────────────────────────────────────────────
    const closeHint = scene.add.text(CX, CY + BH / 2 - 14, 'P / ESC: đóng', {
      fontSize: '9px', color: '#ffffff44',
    }).setOrigin(0.5, 1);

    // ── Assemble container — every object must be here to hide with the panel
    const items: Phaser.GameObjects.GameObject[] = [
      backdrop, box, title, divider, this.pointsBadge,
    ];
    for (let i = 0; i < statDefs.length; i++) {
      items.push(labelRefs[i], descRefs[i], valueRefs[i], btnRefs[i]);
    }
    items.push(staminaLabel, staminaBg, this.staminaBar, this.staminaText, closeHint);

    this.container = scene.add.container(0, 0, items);
    this.container.setVisible(false).setDepth(110);
  }

  toggle(): void {
    this._isOpen ? this.close() : this.open();
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.container.setVisible(true).setAlpha(0);
    this.container.scene.tweens.add({ targets: this.container, alpha: 1, duration: 180 });
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.container.scene.tweens.add({
      targets:  this.container,
      alpha:    0,
      duration: 150,
      onComplete: () => this.container.setVisible(false),
    });
  }

  /** Update all displayed values from the current stats state */
  refresh(stats: PlayerStatsSystem): void {
    const pts = stats.points;

    this.pointsBadge.setText(`🎯 Điểm chưa dùng: ${pts}`);
    this.pointsBadge.setColor(pts > 0 ? '#ffe066' : '#888888');

    this.strValue.setText(String(stats.strength));
    this.phyValue.setText(String(stats.physical));
    this.staValue.setText(String(stats.investedStamina));

    // Dim + buttons when no points available
    const btnColor = pts > 0 ? '#80ff80' : '#446644';
    this.strBtn.setColor(btnColor);
    this.phyBtn.setColor(btnColor);
    this.staBtn.setColor(btnColor);

    // Stamina bar
    const cur = stats.currentStamina;
    const max = stats.maxStamina;
    // The bar background is barW wide; staminaBar is an absolutely placed rect
    // We have to compute the fill width relative to BW - 64
    const barW = 300 - 64; // must match constructor BW
    const fill = max > 0 ? Math.round((cur / max) * barW) : 0;
    this.staminaBar.setSize(fill, 12);

    const pct = max > 0 ? cur / max : 0;
    const color = pct > 0.5 ? 0x4499ff : pct > 0.25 ? 0xffaa33 : 0xff4444;
    this.staminaBar.setFillStyle(color, 1);

    this.staminaText.setText(`${cur} / ${max}`);
  }
}
