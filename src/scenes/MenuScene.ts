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

    // this.spawnClouds(width, height);
    this.spawnFireflies(width, height);
    this.spawnLeaves(width, height);

    this.add.rectangle(width / 2, height / 2, 400, 200, 0x000000, 0.5).setOrigin(0.5);
      
    this.add.text(width / 2, height / 2 - 60, '🌑 Moon Island', {
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

    this.add.text(width / 2, height / 2 + 80, 'Di chuyển: WASD  |  Tương tác: E', {
      fontSize: '12px',
      color: '#cce8ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
  }

  // ── Animated background helpers ─────────────────────────────────────────

  private spawnFireflies(width: number, height: number): void {
    for (let i = 0; i < 22; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(height * 0.3, height);

      const dot = this.add.graphics();
      const size = Phaser.Math.Between(2, 4);
      dot.fillStyle(0xfff176, 1);
      dot.fillCircle(0, 0, size);
      dot.setPosition(x, y);
      dot.setDepth(2);

      // drift
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-60, 60),
        y: y + Phaser.Math.Between(-50, 50),
        duration: Phaser.Math.Between(3000, 6000),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 4000),
      });

      // twinkle
      this.tweens.add({
        targets: dot,
        alpha: { from: 0.1, to: 0.9 },
        scaleX: { from: 0.8, to: 1.6 },
        scaleY: { from: 0.8, to: 1.6 },
        duration: Phaser.Math.Between(800, 2000),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private spawnLeaves(width: number, height: number): void {
    for (let i = 0; i < 14; i++) {
      this.spawnOneLeaf(width, height, true);
    }
  }

  private spawnOneLeaf(width: number, height: number, randomY = false): void {
    const x = Phaser.Math.Between(0, width);
    const startY = randomY ? Phaser.Math.Between(-40, height) : -20;

    const leaf = this.add.graphics();
    leaf.fillStyle(Phaser.Math.RND.pick([0x7ec850, 0xa8d858, 0xf9c74f, 0xe07b39]), 1);
    leaf.fillEllipse(0, 0, 10, 6);
    leaf.setPosition(x, startY);
    leaf.setDepth(3);

    const fallDuration = Phaser.Math.Between(5000, 10000);
    const swayAmount  = Phaser.Math.Between(30, 80);

    this.tweens.add({
      targets: leaf,
      y: height + 30,
      x: x + Phaser.Math.RND.pick([-1, 1]) * swayAmount,
      angle: Phaser.Math.Between(-360, 360),
      alpha: { from: 0.8, to: 0.2 },
      duration: fallDuration,
      ease: 'Linear',
      onComplete: () => {
        leaf.destroy();
        this.spawnOneLeaf(width, height);
      },
    });
  }

  update(): void {
  }
}
