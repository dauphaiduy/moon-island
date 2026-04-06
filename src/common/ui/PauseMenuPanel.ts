import Phaser from 'phaser';

export type PauseMenuAction = 'save' | 'load' | 'menu' | 'new';

export class PauseMenuPanel {
  private scene: Phaser.Scene;
  private pauseContainer!:    Phaser.GameObjects.Container;
  private confirmContainer!:  Phaser.GameObjects.Container;
  private controlsContainer!: Phaser.GameObjects.Container;
  private _isOpen = false;

  onAction?: (action: PauseMenuAction) => void;

  constructor(scene: Phaser.Scene, W: number, H: number) {
    this.scene = scene;
    this.buildPauseMenu(W, H);
    this.buildConfirmDialog(W, H);
    this.buildControlsPanel(W, H);
  }

  get isOpen(): boolean { return this._isOpen; }

  toggle(): void {
    this._isOpen ? this.close() : this.open();
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.pauseContainer.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.pauseContainer, alpha: 1, duration: 180 });
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.scene.tweens.add({
      targets: this.pauseContainer,
      alpha: 0,
      duration: 150,
      onComplete: () => this.pauseContainer.setVisible(false),
    });
  }

  private openConfirm(): void {
    this.confirmContainer.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.confirmContainer, alpha: 1, duration: 140 });
  }

  private closeConfirm(): void {
    this.scene.tweens.add({
      targets: this.confirmContainer,
      alpha: 0,
      duration: 120,
      onComplete: () => this.confirmContainer.setVisible(false),
    });
  }

  private openControls(): void {
    this.controlsContainer.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.controlsContainer, alpha: 1, duration: 140 });
  }

  private closeControls(): void {
    this.scene.tweens.add({
      targets: this.controlsContainer,
      alpha: 0,
      duration: 120,
      onComplete: () => this.controlsContainer.setVisible(false),
    });
  }

  private buildPauseMenu(W: number, H: number): void {
    const CX = W / 2;
    const CY = H / 2;
    const BOX_W = 260;
    const BOX_H = 360;

    const overlay = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0);
    const box = this.scene.add.rectangle(CX, CY, BOX_W, BOX_H, 0x1a2a0f, 0.95)
      .setStrokeStyle(2, 0x6abf3e, 1);
    const title = this.scene.add.text(CX, CY - BOX_H / 2 + 24, '⏸ Tạm dừng', {
      fontSize: '18px', color: '#ffe066',
      fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    const divider = this.scene.add.rectangle(CX, CY - BOX_H / 2 + 44, BOX_W - 40, 1, 0x6abf3e, 0.5);

    const mainItems: { label: string; action: PauseMenuAction }[] = [
      { label: '💾  Lưu game',  action: 'save' },
      { label: '📂  Tải game',  action: 'load' },
      { label: '🏠  Về menu',   action: 'menu' },
    ];

    const buttons = mainItems.map((item, i) => {
      const btnY = CY - 52 + i * 52;
      const btn = this.scene.add.text(CX, btnY-30, item.label, {
        fontSize: '15px', color: '#d0f0a0',
        backgroundColor: '#2a4a1a',
        padding: { x: 24, y: 10 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover',  () => btn.setColor('#ffffff').setBackgroundColor('#3d6e22'))
        .on('pointerout',   () => btn.setColor('#d0f0a0').setBackgroundColor('#2a4a1a'))
        .on('pointerdown',  () => {
          this.close();
          this.onAction?.(item.action);
        });
      return btn;
    });

    // FAQ
    // const ctrlSep = this.scene.add.rectangle(CX, CY + 102, BOX_W - 60, 1, 0x4a9eff, 0.25);
    const ctrlBtn = this.scene.add.text(CX, CY + 88, '🎮  Điều khiển / FAQ', {
      fontSize: '13px', color: '#aaddff',
      backgroundColor: '#0a1a3a',
      padding: { x: 20, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => ctrlBtn.setColor('#ffffff').setBackgroundColor('#1a3a6e'))
      .on('pointerout',   () => ctrlBtn.setColor('#aaddff').setBackgroundColor('#0a1a3a'))
      .on('pointerdown',  () => this.openControls());

    // Delete Save button
    // const sep = this.scene.add.rectangle(CX, CY + 150, BOX_W - 60, 1, 0xff4444, 0.35);
    const newBtn = this.scene.add.text(CX, CY + 136, '🗑️  Xóa & Chơi mới', {
      fontSize: '13px', color: '#ff9999',
      backgroundColor: '#3a1010',
      padding: { x: 20, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => newBtn.setColor('#ffffff').setBackgroundColor('#6e1a1a'))
      .on('pointerout',   () => newBtn.setColor('#ff9999').setBackgroundColor('#3a1010'))
      .on('pointerdown',  () => this.openConfirm());



    const hint = this.scene.add.text(CX, CY + BOX_H / 2 - 12, 'ESC đóng', {
      fontSize: '10px', color: '#ffffff55',
    }).setOrigin(0.5);

    this.pauseContainer = this.scene.add.container(0, 0, [overlay, box, title, divider, /*sep, ctrlSep,*/ hint, ...buttons, newBtn, ctrlBtn]);
    this.pauseContainer.setVisible(false).setAlpha(0);
    this.pauseContainer.setDepth(100);
  }

  private buildConfirmDialog(W: number, H: number): void {
    const CX = W / 2;
    const CY = H / 2;
    const BW = 280;
    const BH = 150;

    const backdrop = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.4).setOrigin(0);
    const box = this.scene.add.rectangle(CX, CY, BW, BH, 0x2a0a0a, 0.97)
      .setStrokeStyle(2, 0xff4444, 1);
    const msg = this.scene.add.text(CX, CY - 34, '⚠️  Xóa toàn bộ tiến trình?\nKhông thể hoàn tác!', {
      fontSize: '13px', color: '#ffcccc', align: 'center',
    }).setOrigin(0.5);

    const yesBtn = this.scene.add.text(CX - 54, CY + 34, '✔ Xác nhận', {
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
        this.close();
        this.onAction?.('new');
      });

    const noBtn = this.scene.add.text(CX + 54, CY + 34, '✖ Hủy', {
      fontSize: '13px', color: '#d0f0a0',
      backgroundColor: '#2a4a1a',
      padding: { x: 14, y: 8 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => noBtn.setColor('#ffffff').setBackgroundColor('#3d6e22'))
      .on('pointerout',   () => noBtn.setColor('#d0f0a0').setBackgroundColor('#2a4a1a'))
      .on('pointerdown',  () => this.closeConfirm());

    this.confirmContainer = this.scene.add.container(0, 0, [backdrop, box, msg, yesBtn, noBtn]);
    this.confirmContainer.setVisible(false);
    this.confirmContainer.setDepth(110);
  }

  private buildControlsPanel(W: number, H: number): void {
    const CX = W / 2;
    const CY = H / 2;
    const BW  = 360;
    const BH  = 380;
    const BT  = CY - BH / 2;
    const BL  = CX - BW / 2;

    const backdrop = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0);
    const box = this.scene.add.rectangle(CX, CY, BW, BH, 0x0a1a30, 0.97)
      .setStrokeStyle(2, 0x4a9eff, 1);

    const title = this.scene.add.text(CX, BT + 22, '🎮  Phím tắt & Hỏi đáp', {
      fontSize: '15px', color: '#ffe066', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    const titleDiv = this.scene.add.rectangle(CX, BT + 42, BW - 40, 1, 0x4a9eff, 0.4);

    const controls: { key: string; desc: string }[] = [
      { key: 'W A S D / ↑ ↓ ← →', desc: 'Di chuyển'                   },
      { key: 'E',                   desc: 'Tương tác / Dùng vật phẩm'  },
      { key: 'Tab',                 desc: 'Đổi công cụ'                 },
      { key: '1 – 8',               desc: 'Chọn ô hotbar'              },
      { key: 'I',                   desc: 'Mở / đóng túi đồ'           },
      { key: 'P',                   desc: 'Mở / đóng chỉ số nhân vật'  },
      // { key: 'Q',                   desc: 'Bán toàn bộ túi đồ'         },
      { key: 'N',                   desc: 'Bỏ qua 1 giờ (debug)'       },
      { key: 'F5',                  desc: 'Lưu game nhanh'             },
      { key: 'ESC',                 desc: 'Tạm dừng / Đóng panel'      },
    ];

    const ROW_H    = 24;
    const ROW_GAP  = 4;
    const KEY_X    = BL + 20;
    const DESC_X   = BL + 200;
    const START_Y  = BT + 56;

    const rows: Phaser.GameObjects.GameObject[] = [];
    controls.forEach((c, i) => {
      const ry  = START_Y + i * (ROW_H + ROW_GAP);
      const bg  = this.scene.add.rectangle(BL + 12, ry, BW - 24, ROW_H, i % 2 === 0 ? 0x0d2040 : 0x0a1830, 0.7).setOrigin(0);
      const kTx = this.scene.add.text(KEY_X + 4, ry + ROW_H / 2, c.key, {
        fontSize: '11px', color: '#ffe066', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const sep = this.scene.add.text(DESC_X - 16, ry + ROW_H / 2, '→', {
        fontSize: '10px', color: '#4a9eff',
      }).setOrigin(0, 0.5);
      const dTx = this.scene.add.text(DESC_X, ry + ROW_H / 2, c.desc, {
        fontSize: '11px', color: '#d0eeff',
      }).setOrigin(0, 0.5);
      rows.push(bg, kTx, sep, dTx);
    });

    const closeBtn = this.scene.add.text(CX, CY + BH / 2 - 18, '✖  Đóng', {
      fontSize: '12px', color: '#aaddff',
      backgroundColor: '#0a1a3a',
      padding: { x: 18, y: 7 },
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setColor('#ffffff').setBackgroundColor('#1a3a6e'))
      .on('pointerout',  () => closeBtn.setColor('#aaddff').setBackgroundColor('#0a1a3a'))
      .on('pointerdown', () => this.closeControls());

    this.controlsContainer = this.scene.add.container(0, 0, [
      backdrop, box, title, titleDiv,
      ...rows,
      closeBtn,
    ]);
    this.controlsContainer.setVisible(false);
    this.controlsContainer.setDepth(110);
  }
}
