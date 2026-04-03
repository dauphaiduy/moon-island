import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import type { ShopItem } from '../types/npc';

/**
 * Tile coordinates for the "Shop - Tools" building.
 * The building spans tiles (17-18, 1-3). We anchor proximity
 * to the entrance row (ty=3) so the player approaches from below.
 */
export const TOOL_SHOP_TILE_X = 17;
export const TOOL_SHOP_TILE_Y = 3;

const INTERACT_DIST = TILE_SIZE * 2.5;

/** Items sold at the Tools Shop — fishing rod upgrade chain. */
export const TOOL_SHOP_CATALOG: ShopItem[] = [
  { itemId: 'tool_fishingRod_wooden',    price: 200,  stock: -1 },
  { itemId: 'tool_fishingRod_bronze',    price: 500,  stock: -1 },
  { itemId: 'tool_fishingRod_silver',    price: 1200, stock: -1 },
  { itemId: 'tool_fishingRod_gold',      price: 3000, stock: -1 },
  { itemId: 'tool_fishingRod_legendary', price: 8000, stock: -1 },
];

/**
 * Invisible anchor placed at the entrance of the "Shop - Tools" tilemap building.
 * Provides proximity detection and a floating interaction bubble so the player
 * knows they can press E to open the shop panel.
 */
export class ShopBuilding extends Phaser.GameObjects.Container {
  private bubble!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    // Centre horizontally across the 2-tile-wide building, anchor at entrance row
    const px = (TOOL_SHOP_TILE_X + 0.5) * TILE_SIZE;
    const py = TOOL_SHOP_TILE_Y * TILE_SIZE;
    super(scene, px, py);

    this.buildVisuals(scene);
    scene.add.existing(this);
  }

  private buildVisuals(scene: Phaser.Scene): void {
    this.bubble = scene.add.text(50, -TILE_SIZE, 'SHOP', {
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
