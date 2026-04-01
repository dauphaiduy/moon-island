import Phaser from 'phaser';
import { FARMING, TILE_SIZE } from '../constants';
import type { FarmTile } from '../types';

export class FarmingSystem {
  private tiles = new Map<string, FarmTile>();
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  private key(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }

  /** Called when player uses hoe on a tile */
  till(tileX: number, tileY: number): boolean {
    const k = this.key(tileX, tileY);
    if (this.tiles.has(k)) return false;

    this.tiles.set(k, {
      tileX, tileY,
      state: 'tilled',
      growthStage: 0,
      growthTimer: 0,
    });
    this.redraw();
    return true;
  }

  /** Called when player uses watering can / plants a seed */
  plant(tileX: number, tileY: number): boolean {
    const tile = this.tiles.get(this.key(tileX, tileY));
    if (!tile || tile.state !== 'tilled') return false;

    tile.state = 'seeded';
    this.redraw();
    return true;
  }

  update(delta: number): void {
    let changed = false;

    for (const tile of this.tiles.values()) {
      if (tile.state !== 'seeded' && tile.state !== 'grown') continue;
      if (tile.growthStage >= FARMING.MAX_STAGES) {
        tile.state = 'grown';
        continue;
      }

      tile.growthTimer += delta;
      if (tile.growthTimer >= FARMING.GROWTH_TIME_MS) {
        tile.growthTimer = 0;
        tile.growthStage++;
        changed = true;
      }
    }

    if (changed) this.redraw();
  }

  harvest(tileX: number, tileY: number): boolean {
    const k = this.key(tileX, tileY);
    const tile = this.tiles.get(k);
    if (!tile || tile.state !== 'grown' || tile.growthStage < FARMING.MAX_STAGES) return false;

    this.tiles.delete(k);
    this.redraw();
    return true;
  }

  private redraw(): void {
    this.graphics.clear();

    for (const tile of this.tiles.values()) {
      const px = tile.tileX * TILE_SIZE;
      const py = tile.tileY * TILE_SIZE;

      // Tilled soil
      this.graphics.fillStyle(0x8b5e3c, 0.6);
      this.graphics.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      if (tile.state === 'seeded' || tile.state === 'grown') {
        // Growth indicator — replace with sprites later
        const progress = tile.growthStage / FARMING.MAX_STAGES;
        const green = tile.growthStage >= FARMING.MAX_STAGES ? 0x27ae60 : 0x82c91e;
        this.graphics.fillStyle(green, 1);
        const size = 4 + progress * 12;
        this.graphics.fillCircle(
          px + TILE_SIZE / 2,
          py + TILE_SIZE / 2,
          size,
        );
      }
    }
  }
}
