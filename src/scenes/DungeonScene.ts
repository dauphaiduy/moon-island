import Phaser from 'phaser';
import { SceneKey } from '../constants';

/**
 * Placeholder dungeon scene.
 * Displays a dark screen with a "Return" button until the full dungeon
 * map and logic are implemented.
 */
export class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKey.Dungeon });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor('#0a0a0a');

    this.add.text(W / 2, H / 2 - 40, '⚔️  Hầm Ngục', {
      fontSize: '28px', color: '#cc4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2, '(đang xây dựng…)', {
      fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    const backBtn = this.add.text(W / 2, H / 2 + 60, '← Quay lại', {
      fontSize: '14px', color: '#80cc80',
      backgroundColor: '#0a2a0a',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerover',  () => backBtn.setColor('#ffffff').setBackgroundColor('#1a4a1a'))
      .on('pointerout',   () => backBtn.setColor('#80cc80').setBackgroundColor('#0a2a0a'))
      .on('pointerdown',  () => this.scene.start(SceneKey.Game));
  }
}
