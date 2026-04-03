import Phaser from 'phaser';

export type PauseMenuAction = 'save' | 'load' | 'menu' | 'new';

export class PauseMenuPanel {
  private scene: Phaser.Scene;
  private pauseContainer!:   Phaser.GameObjects.Container;
  private confirmContainer!: Phaser.GameObjects.Container;
  private _isOpen = false;

  onAction?: (action: PauseMenuAction) => void;

  constructor(scene: Phaser.Scene, W: number, H: number) {
    this.scene = scene;
    this.buildPauseMenu(W, H);
    this.buildConfirmDialog(W, H);
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

  private buildPauseMenu(W: number, H: number): void {
    const CX = W / 2;
    const CY = H / 2;
    const BOX_W = 260;
    const BOX_H = 282;

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
      const btn = this.scene.add.text(CX, btnY, item.label, {
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

    const sep = this.scene.add.rectangle(CX, CY + 102, BOX_W - 60, 1, 0xff4444, 0.35);
    const newBtn = this.scene.add.text(CX, CY + 118, '🗑️  Xóa & Chơi mới', {
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

    this.pauseContainer = this.scene.add.container(0, 0, [overlay, box, title, divider, sep, hint, ...buttons, newBtn]);
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
}
