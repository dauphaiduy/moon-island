import Phaser from 'phaser';
import { FARMING, TILE_SIZE } from '../../constants';
import type { CropType, FarmTile, ItemId } from '../../types';

// Which seed produces which crop
const SEED_TO_CROP: Partial<Record<ItemId, ItemId>> = {
  seed_wheat:  'crop_wheat',
  seed_carrot: 'crop_carrot',
  seed_tomato: 'crop_tomato',
};

// Derive the short crop type name from a seed ItemId
const SEED_TO_CROP_TYPE: Partial<Record<ItemId, CropType>> = {
  seed_wheat:  'wheat',
  seed_carrot: 'carrot',
  seed_tomato: 'tomato',
};

// Visual color per crop type at full growth
const MATURE_COLORS: Record<CropType, number> = {
  wheat:  0xf1c40f,
  carrot: 0xe67e22,
  tomato: 0xe74c3c,
};

export class FarmingSystem {
  private tiles = new Map<string, FarmTile>();
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  private key(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }

  /** Hoe on an empty farm zone tile → create tilled soil */
  till(tileX: number, tileY: number): boolean {
    const k = this.key(tileX, tileY);
    if (this.tiles.has(k)) return false;
    this.tiles.set(k, { tileX, tileY, state: 'tilled', watered: false, growthStage: 0, growthTimer: 0 });
    this.redraw();
    return true;
  }

  /**
   * WateringCan on a tilled or seeded tile → water it.
   * Grown tiles are ignored (no point watering ready crops).
   */
  water(tileX: number, tileY: number): boolean {
    const tile = this.tiles.get(this.key(tileX, tileY));
    if (!tile || tile.state === 'grown' || tile.watered) return false;
    tile.watered = true;
    this.redraw();
    return true;
  }

  /**
   * Plant a seed on a tilled tile (watering first not required — planting auto-waters).
   * Returns the crop ItemId that will be harvested, or null if planting failed.
   */
  plantSeed(tileX: number, tileY: number, seedId: ItemId): ItemId | null {
    const tile = this.tiles.get(this.key(tileX, tileY));
    if (!tile || tile.state !== 'tilled') return null;
    const cropType = SEED_TO_CROP_TYPE[seedId];
    if (!cropType) return null;

    tile.state    = 'seeded';
    tile.cropType = cropType;
    tile.watered  = true;   // auto-water on planting so growth starts today
    this.redraw();
    return SEED_TO_CROP[seedId]!;
  }

  /** Hoe on a fully grown tile → harvest. Returns ItemId of crop, or null. */
  harvest(tileX: number, tileY: number): ItemId | null {
    const k = this.key(tileX, tileY);
    const tile = this.tiles.get(k);
    if (!tile || tile.state !== 'grown') return null;
    const cropId: ItemId = `crop_${tile.cropType ?? 'wheat'}` as ItemId;
    this.tiles.delete(k);
    this.redraw();
    return cropId;
  }

  /** Growth ticks every frame — only advances when the tile is watered */
  update(delta: number): void {
    let changed = false;
    for (const tile of this.tiles.values()) {
      if (tile.state !== 'seeded' || !tile.watered) continue;
      if (tile.growthStage >= FARMING.MAX_STAGES) {
        tile.state = 'grown';
        changed = true;
        continue;
      }
      tile.growthTimer += delta;
      if (tile.growthTimer >= FARMING.GROWTH_TIME_MS) {
        tile.growthTimer = 0;
        tile.growthStage++;
        if (tile.growthStage >= FARMING.MAX_STAGES) tile.state = 'grown';
        changed = true;
      }
    }
    if (changed) this.redraw();
  }

  /** Reset watered flag on all tiles at the start of each new in-game day */
  onNewDay(): void {
    for (const tile of this.tiles.values()) {
      tile.watered = false;
    }
    this.redraw();
  }

  getTile(tileX: number, tileY: number): FarmTile | undefined {
    return this.tiles.get(this.key(tileX, tileY));
  }

  /** All active farm tiles — used for serialization */
  getAllTiles(): FarmTile[] {
    return [...this.tiles.values()];
  }

  /** Restore farm state from a save file */
  loadTiles(saved: FarmTile[]): void {
    this.tiles.clear();
    for (const t of saved) {
      this.tiles.set(this.key(t.tileX, t.tileY), { ...t });
    }
    this.redraw();
  }

  private redraw(): void {
    this.graphics.clear();

    for (const tile of this.tiles.values()) {
      const px = tile.tileX * TILE_SIZE;
      const py = tile.tileY * TILE_SIZE;

      // Tilled soil — darker when watered
      this.graphics.fillStyle(tile.watered ? 0x4a2c0a : 0x8b5e3c, 0.75);
      this.graphics.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      if (tile.state === 'seeded' || tile.state === 'grown') {
        const progress = tile.growthStage / FARMING.MAX_STAGES;
        const color = tile.state === 'grown'
          ? (MATURE_COLORS[tile.cropType ?? 'wheat'])
          : 0x82c91e;

        // Stem grows taller with each stage
        const stemW = 2;
        const stemH = 3 + Math.floor(progress * (TILE_SIZE * 0.55));
        this.graphics.fillStyle(0x4a7c2f, 1);
        this.graphics.fillRect(
          px + TILE_SIZE / 2 - stemW / 2,
          py + TILE_SIZE - 3 - stemH,
          stemW, stemH,
        );

        // Crop head — circle that fills in as growth progresses
        const headR = 2 + Math.floor(progress * (TILE_SIZE * 0.22));
        this.graphics.fillStyle(color, 1);
        this.graphics.fillCircle(px + TILE_SIZE / 2, py + TILE_SIZE - 3 - stemH, headR);
      }
    }
  }
}
