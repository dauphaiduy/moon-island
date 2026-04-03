import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';

/**
 * Tile coordinates for the "Dungeon" tilemap building.
 * The building spans tiles (22-24, 2-3). We anchor proximity
 * at the centre-bottom entrance row (ty=3) so the player approaches
 * from below.
 */
export const DUNGEON_TILE_X = 23;  // centre of 3-tile-wide building
export const DUNGEON_TILE_Y = 3;

const INTERACT_DIST = TILE_SIZE * 2.5;

/**
 * Invisible anchor placed at the entrance of the "Dungeon" tilemap building.
 * Provides proximity detection and a floating interaction bubble so the player
 * knows they can press E to enter the dungeon.
 */
export class DungeonEntrance extends Phaser.GameObjects.Container {
  private bubble!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const px = DUNGEON_TILE_X * TILE_SIZE + TILE_SIZE / 2;
    const py = DUNGEON_TILE_Y * TILE_SIZE;
    super(scene, px, py);

    this.buildVisuals(scene);
    scene.add.existing(this);
  }

  private buildVisuals(scene: Phaser.Scene): void {
    this.bubble = scene.add.text(0, -TILE_SIZE, '⚔️', {
      fontSize: '14px',
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
