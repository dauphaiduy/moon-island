import Phaser from 'phaser';
import { SceneKey } from '../constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKey.Menu });
  }

  preload(): void { 
    this.load.image('bg', 'assets/bg.png');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.image(0, 0, 'bg').setOrigin(0);

    this.add.rectangle(width / 2, height / 2, 400, 200, 0x000000, 0.5).setOrigin(0.5);
      
    this.add.text(width / 2, height / 2 - 60, '🌾 Farm Game', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#1a3a00',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 20, 'Trồng trọt • Câu cá • Khám phá', {
      fontSize: '14px',
      color: '#d4f7b0',
      stroke: '#1a3a00',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const startBtn = this.add.text(width / 2, height / 2 + 40, '[ Bắt đầu ]', {
      fontSize: '22px',
      color: '#ffe066',
      stroke: '#3a2000',
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => startBtn.setColor('#ffffff'))
      .on('pointerout',  () => startBtn.setColor('#ffe066'))
      .on('pointerdown', () => this.scene.start(SceneKey.Game));

    this.add.text(width / 2, height - 30, 'Di chuyển: WASD  |  Tương tác: E', {
      fontSize: '12px',
      color: '#cce8ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
  }
}
