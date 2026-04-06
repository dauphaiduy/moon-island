import Phaser from 'phaser';
import { TILE_SIZE } from '../../constants';

/** Tile coordinate of the boat — left side of Bridge - vertical at x=14 */
export const BOAT_TILE_X = 13;
export const BOAT_TILE_Y = 13;

const INTERACT_DIST = TILE_SIZE * 2;

export class Boat extends Phaser.GameObjects.Container {
  private bubble!: Phaser.GameObjects.Text;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene) {
    const px = BOAT_TILE_X * TILE_SIZE + TILE_SIZE / 2;
    const py = BOAT_TILE_Y * TILE_SIZE + TILE_SIZE / 2;
    super(scene, px, py);

    this.buildVisuals(scene);
    this.setDepth(2);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body — boat doesn't move
    this.body.setSize(TILE_SIZE, TILE_SIZE / 2);
  }

  private buildVisuals(scene: Phaser.Scene): void {
    // Hull — wide flat shape
    const hull = scene.add.rectangle(0, 6, TILE_SIZE - 2, 10, 0x7b4f2e);
    this.add(hull);

    // Deck stripe on top of hull
    const deck = scene.add.rectangle(0, 1, TILE_SIZE - 8, 6, 0xa0632a);
    this.add(deck);

    // Small cabin / raised box on the deck
    const cabin = scene.add.rectangle(2, -4, 10, 8, 0xc8854a);
    this.add(cabin);

    // Interaction bubble — shown when player is nearby
    this.bubble = scene.add.text(0, -(TILE_SIZE / 2) - 2, '⛵', {
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
      y:        -(TILE_SIZE / 2) - 6,
      duration: 400,
      yoyo:     true,
      ease:     'Sine.easeInOut',
    });
  }

  hideBubble(): void {
    this.bubble.setVisible(false);
  }
}
