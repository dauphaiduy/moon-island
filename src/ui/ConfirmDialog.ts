import Phaser from 'phaser';

/**
 * A reusable modal confirmation dialog.
 * Usage:
 *   confirmDialog.open('Bạn có muốn vào Hầm Ngục không?', () => goToDungeon());
 *
 * The dialog is self-contained: it handles its own open/close animation
 * and calls the provided callback only when the player clicks "Xác nhận".
 */
export class ConfirmDialog {
  private readonly container: Phaser.GameObjects.Container;
  private readonly msgText: Phaser.GameObjects.Text;
  private onConfirm?: () => void;
  private _isOpen = false;

  get isOpen(): boolean { return this._isOpen; }

  constructor(scene: Phaser.Scene, W: number, H: number) {
    const CX = W / 2;
    const CY = H / 2;
    const BW = 320;
    const BH = 150;

    const backdrop = scene.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0);

    const box = scene.add.rectangle(CX, CY, BW, BH, 0x0a1a0a, 0.97)
      .setStrokeStyle(2, 0x4adc6a, 1);

    this.msgText = scene.add.text(CX, CY - 30, '', {
      fontSize: '13px', color: '#ccffcc', align: 'center',
      wordWrap: { width: BW - 40 },
    }).setOrigin(0.5);

    const yesBtn = scene.add.text(CX - 60, CY + 38, '✔  Vào thôi', {
      fontSize: '13px', color: '#80ff80',
      backgroundColor: '#0a3a1a',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover',  () => yesBtn.setColor('#ffffff').setBackgroundColor('#1a6a2a'))
      .on('pointerout',   () => yesBtn.setColor('#80ff80').setBackgroundColor('#0a3a1a'))
      .on('pointerdown',  () => {
        this.close();
        this.onConfirm?.();
      });

    const noBtn = scene.add.text(CX + 60, CY + 38, '✖  Hủy', {
      fontSize: '13px', color: '#ffaa66',
      backgroundColor: '#3a1a0a',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover',  () => noBtn.setColor('#ffffff').setBackgroundColor('#6a3a0a'))
      .on('pointerout',   () => noBtn.setColor('#ffaa66').setBackgroundColor('#3a1a0a'))
      .on('pointerdown',  () => this.close());

    this.container = scene.add.container(0, 0, [backdrop, box, this.msgText, yesBtn, noBtn]);
    this.container.setVisible(false).setDepth(120);
  }

  open(message: string, onConfirm: () => void): void {
    this._isOpen = true;
    this.onConfirm = onConfirm;
    this.msgText.setText(message);
    this.container.setVisible(true).setAlpha(0);
    this.container.scene.tweens.add({
      targets: this.container,
      alpha:   1,
      duration: 160,
    });
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.container.scene.tweens.add({
      targets:  this.container,
      alpha:    0,
      duration: 130,
      onComplete: () => this.container.setVisible(false),
    });
  }
}
