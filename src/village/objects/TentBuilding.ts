import Phaser from 'phaser';
import { TILE_SIZE } from '../../constants';

/**
 * Tile coordinates for the "Tent" building.
 * The tent spans tiles (10-11, 1-3). We anchor proximity
 * to the entrance row (ty=3) so the player approaches from below.
 */
export const TENT_TILE_X = 10;
export const TENT_TILE_Y = 3;

const INTERACT_DIST = TILE_SIZE * 1.5;

/**
 * Invisible anchor placed at the entrance of the Tent.
 * Provides proximity detection and a floating sleep bubble.
 */
export class TentBuilding extends Phaser.GameObjects.Container {
  private bubble!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    // Centre across the 2-tile-wide tent, anchor at entrance row
    const px = (TENT_TILE_X + 0.5) * TILE_SIZE;
    const py = TENT_TILE_Y * TILE_SIZE;
    super(scene, px, py);

    this.buildVisuals(scene);
    scene.add.existing(this);
  }

  private buildVisuals(scene: Phaser.Scene): void {
    this.bubble = scene.add.text(16, -TILE_SIZE, '💤 Ngủ [E]', {
      fontSize: '12px',
      color: '#c8e6ff',
      backgroundColor: '#1a1a3a',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setVisible(false);
    this.add(this.bubble);
  }

  isNearPlayer(playerX: number, playerY: number): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) <= INTERACT_DIST;
  }

  highlightBubble(scene: Phaser.Scene): void {
    this.bubble.setVisible(true);
    scene.tweens.add({
      targets:  this.bubble,
      y:        -TILE_SIZE - 4,
      duration: 400,
      yoyo:     true,
      ease:     'Sine.easeInOut',
    });
  }

  hideBubble(): void {
    this.bubble.setVisible(false);
  }
}
