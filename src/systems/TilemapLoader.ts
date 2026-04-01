import Phaser from 'phaser';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, TextureKey, MapKey } from '../constants';

export type ZoneType = 'grass' | 'farm' | 'water' | 'path' | 'none';

const TILE_ID = {
  EMPTY:    0,
  GRASS:    1,
  FARMLAND: 2,
  TREE:     5,
  PATH:     4,
  WATER:    9,
  WALL:     6,
} as const;

export class TilemapLoader {
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layerCollision: Phaser.Tilemaps.TilemapLayer | null = null;

  private zoneGrid: ZoneType[][] = [];

  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  static preload(scene: Phaser.Scene): void {
    scene.load.tilemapTiledJSON(MapKey.World, 'assets/maps/world.json');
    scene.load.image(TextureKey.Tiles, 'assets/tilesets/farm_tiles1.png');
  }

  create(): void {
    if (!this.tryCreateFromTiled()) {
      console.warn('[TilemapLoader] Falling back to procedural render');
      this.buildFallback();
    }
  }

  private tryCreateFromTiled(): boolean {
    // make.tilemap() does NOT throw on missing key — it returns a broken object.
    // Check the cache manually first.
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

    // addTilesetImage returns null when the image key wasn't loaded
    const tileset = map.addTilesetImage('farm_tiles', TextureKey.Tiles);
    if (!tileset) {
      console.warn(`[TilemapLoader] Tileset image "${TextureKey.Tiles}" not in texture cache`);
      return false;
    }

    // createLayer returns null when the layer name doesn't exist in the JSON
    const ground     = map.createLayer('Ground',     tileset, 0, 0);
    const decoration = map.createLayer('Decoration', tileset, 0, 0);
    const collision  = map.createLayer('Collision',  tileset, 0, 0);

    const missing = [['Ground', ground], ['Decoration', decoration], ['Collision', collision]]
      .filter(([, l]) => !l)
      .map(([name]) => name as string);

    if (missing.length > 0) {
      console.warn(`[TilemapLoader] Layer(s) missing in JSON: ${missing.join(', ')}`);
      return false;
    }

    // All checks passed — commit
    this.map = map;
    this.layerCollision = collision!;

    this.layerCollision.setVisible(false);
    this.layerCollision.setCollisionByExclusion([TILE_ID.EMPTY]);

    this.buildZoneGridFromObjects();

    this.scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    return true;
  }

  addCollider(
    object: Phaser.GameObjects.GameObject,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
  ): void {
    if (!this.layerCollision) return;
    this.scene.physics.add.collider(object, this.layerCollision, callback);
  }

  getZone(tileX: number, tileY: number): ZoneType {
    return this.zoneGrid[tileY]?.[tileX] ?? 'none';
  }

  get widthInPixels(): number  { return this.map?.widthInPixels  ?? MAP_WIDTH  * TILE_SIZE; }
  get heightInPixels(): number { return this.map?.heightInPixels ?? MAP_HEIGHT * TILE_SIZE; }

  private buildZoneGridFromObjects(): void {
    if (!this.map) return;

    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      this.zoneGrid[ty] = new Array<ZoneType>(MAP_WIDTH).fill('grass');
    }

    const objectLayer = this.map.getObjectLayer('Zone');
    if (!objectLayer) return;

    for (const obj of objectLayer.objects) {
      const zone = (obj.properties as Array<{ name: string; value: string }> | undefined)
        ?.find(p => p.name === 'zone')?.value as ZoneType | undefined;

      if (!zone) continue;

      const x0 = Math.floor((obj.x ?? 0) / TILE_SIZE);
      const y0 = Math.floor((obj.y ?? 0) / TILE_SIZE);
      const x1 = Math.floor(((obj.x ?? 0) + (obj.width  ?? 0)) / TILE_SIZE);
      const y1 = Math.floor(((obj.y ?? 0) + (obj.height ?? 0)) / TILE_SIZE);

      for (let ty = y0; ty < y1; ty++) {
        for (let tx = x0; tx < x1; tx++) {
          if (this.zoneGrid[ty]) this.zoneGrid[ty][tx] = zone;
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