import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, TextureKey, MapKey } from '../constants';

export type ZoneType = 'grass' | 'farm' | 'water' | 'path' | 'none';

// Describes how each map layer participates in collision and zone detection.
// - collides: true  → ALL non-empty tiles in this layer block movement
//                     (use setCollision(true) — the "collider" flag is a layer property, not per-tile)
// - zone           → non-blocking layers contribute this zone type to the ground grid
//
// Source: each layer's "collider" property in map.json, adjusted for gameplay intent:
//   Cliff / Rocks              → hard walls, block all directions
//   Buildings                  → solid structures, block all directions
//   Bridge (vertical/horizontal) → walkable surface — collision OFF so player can cross
//   Stairs                     → passage through cliff — collision OFF so player can climb
//   Everything else            → ground / visual decoration, fully walkable
const LAYER_CONFIG: Array<{ name: string; collides: boolean; zone?: ZoneType }> = [
  { name: 'Background',          collides: false},
  { name: 'water',               collides: true, zone: 'water'  },
  { name: 'Sand',                collides: false, zone: 'grass'  },
  { name: 'Cliff',               collides: true               },
  { name: 'Rocks',               collides: false               },
  { name: 'Grass',               collides: false, zone: 'farm' },
  { name: 'Bridge - vertical',   collides: false, zone: 'path'  },
  { name: 'Bridge - horizontal', collides: false, zone: 'path'  },
  { name: 'Stairs',              collides: false, zone: 'grass'  },
  { name: 'Shadows',             collides: false               },
  { name: 'Buildings',           collides: true               },
  { name: 'Shop - Weapon',       collides: true               },
  { name: 'Dungeon',             collides: true               },
  { name: 'Trees front',         collides: false               },
  { name: 'Miscs',               collides: false               },
];

export class TilemapLoader {
  private map: Phaser.Tilemaps.Tilemap | null = null;
  /** Layers that block movement — used for physics colliders. */
  private collideLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  /** All created layers keyed by config entry — used for zone grid building. */
  private namedLayers = new Map<string, Phaser.Tilemaps.TilemapLayer>();

  private zoneGrid: ZoneType[][] = [];

  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  static preload(scene: Phaser.Scene): void {
    scene.load.tilemapTiledJSON(MapKey.World, 'assets/maps/map.json');
    scene.load.image(TextureKey.Tiles, 'assets/tilesets/spritesheet.png');
  }

  create(): void {
    if (!this.tryCreateFromTiled()) {
      console.warn('[TilemapLoader] Falling back to procedural render');
      this.buildFallback();
    }
  }

  private tryCreateFromTiled(): boolean {
    const cache = this.scene.cache.tilemap;
    if (!cache.exists(MapKey.World)) {
      console.warn(`[TilemapLoader] Key "${MapKey.World}" not in tilemap cache`);
      return false;
    }

    let map: Phaser.Tilemaps.Tilemap;
    try {
      map = this.scene.make.tilemap({ key: MapKey.World });
    } catch (e) {
      console.warn('[TilemapLoader] make.tilemap() threw:', e);
      return false;
    }

    const tileset = map.addTilesetImage('spritefusion', TextureKey.Tiles);
    if (!tileset) {
      console.warn(`[TilemapLoader] Tileset image "${TextureKey.Tiles}" not in texture cache`);
      return false;
    }

    // Tiles in map.json are 64px; scale to 0.5 so they render at 32px — matching the player.
    const SCALE = 0.5;

    for (const cfg of LAYER_CONFIG) {
      const layer = map.createLayer(cfg.name, tileset, 0, 0);
      if (!layer) {
        console.warn(`[TilemapLoader] Layer "${cfg.name}" not found, skipping`);
        continue;
      }
      layer.setScale(SCALE);

      if (cfg.collides) {
        // Block all non-empty tiles in this layer.
        // The map's "collider" flag is per-layer, not per-tile, so we exclude only empty (index -1).
        layer.setCollisionByExclusion([-1]);
        this.collideLayers.push(layer);
      }

      this.namedLayers.set(cfg.name, layer);
    }

    if (this.namedLayers.size === 0) {
      console.warn('[TilemapLoader] No layers created');
      return false;
    }

    this.map = map;
    this.buildZoneGridFromLayers();
    this.scene.physics.world.setBounds(0, 0, map.widthInPixels * SCALE, map.heightInPixels * SCALE);
    return true;
  }

  addCollider(
    object: Phaser.GameObjects.GameObject,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): void {
    for (const layer of this.collideLayers) {
      this.scene.physics.add.collider(object, layer, callback);
    }
  }

  getZone(tileX: number, tileY: number): ZoneType {
    return this.zoneGrid[tileY]?.[tileX] ?? 'none';
  }

  get widthInPixels(): number  { return (this.map?.widthInPixels  ?? MAP_WIDTH  * TILE_SIZE * 2) * 0.5; }
  get heightInPixels(): number { return (this.map?.heightInPixels ?? MAP_HEIGHT * TILE_SIZE * 2) * 0.5; }

  private buildZoneGridFromLayers(): void {
    if (!this.map) return;

    const mapW = this.map.width;
    const mapH = this.map.height;

    // Default every tile to 'none'; ground layers will fill in walkable zones.
    for (let ty = 0; ty < mapH; ty++) {
      this.zoneGrid[ty] = new Array<ZoneType>(mapW).fill('none');
    }

    // Walk all layers in order; each tile writes its zone (or 'none' for blocking layers
    // that have no explicit zone). Later layers override earlier ones.
    for (const cfg of LAYER_CONFIG) {
      if (!cfg.zone && !cfg.collides) continue;         // visual-only layer, skip
      if (!this.namedLayers.has(cfg.name)) continue;

      // Blocking layers without an explicit zone make tiles impassable ('none').
      // Blocking layers WITH a zone (e.g. water) keep their zone so game systems
      // (e.g. fishing) can detect them even though the player cannot walk there.
      const zoneValue: ZoneType = cfg.zone ?? 'none';

      for (let ty = 0; ty < mapH; ty++) {
        for (let tx = 0; tx < mapW; tx++) {
          const tile = this.map.getTileAt(tx, ty, false, cfg.name);
          if (tile && tile.index !== -1) {
            this.zoneGrid[ty][tx] = zoneValue;
          }
        }
      }
    }
  }

  private buildFallback(): void {
    const COLORS: Record<ZoneType, number> = {
      grass: 0x4a7c59,
      farm:  0x8b6914,
      water: 0x1e6091,
      path:  0xb5a585,
      none:  0x222222,
    };

    const gfx = this.scene.add.graphics();

    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      this.zoneGrid[ty] = [];
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const zone = this.inferZone(tx, ty);
        this.zoneGrid[ty][tx] = zone;

        gfx.fillStyle(COLORS[zone], 1);
        gfx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        gfx.lineStyle(0.3, 0x000000, 0.15);
        gfx.strokeRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    this.scene.physics.world.setBounds(
      0, 0,
      MAP_WIDTH  * TILE_SIZE,
      MAP_HEIGHT * TILE_SIZE,
    );
  }

  private inferZone(tx: number, ty: number): ZoneType {
    if (tx >= MAP_WIDTH - 8)                          return 'water';
    if (tx >= 2 && tx <= 14 && ty >= 2 && ty <= 12)  return 'farm';
    if (ty === 14 || tx === 16)                       return 'path';
    return 'grass';
  }
}