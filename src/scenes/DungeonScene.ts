import Phaser from 'phaser';
import { SceneKey, TextureKey, MapKey, TILE_SIZE } from '../constants';
import { Player } from '../objects/Player';

// dun.json tiles are 16 px; scale ×2 → 32 px to match the player sprite.
const MAP_SCALE = 1.5;

// Spawn position in tile coordinates (near the entrance door).
const SPAWN_TILE_X = 10;
const SPAWN_TILE_Y = 11;

/**
 * Zone types that dungeon tiles can belong to.
 * 'trap'   — hazard tiles (Traps layer)
 * 'pickup' — item/loot tiles (Pickups layer)
 * 'door'   — exit/entrance tiles (Doors layer)
 * 'none'   — wall, decoration, or passable floor with no special interaction
 */
export type DungeonZone = 'trap' | 'pickup' | 'door' | 'none';

/**
 * Per-layer configuration for the dungeon map.
 *  collides — whether this layer has physics tile bodies that block movement
 *  zone     — interaction zone type assigned to non-empty tiles in this layer;
 *             omit (or use 'none') for purely visual / structural layers
 */
const LAYER_CONFIG: Array<{ name: string; collides: boolean; zone?: DungeonZone }> = [
  { name: 'Floor',          collides: false                          },
  { name: 'Walls',          collides: true                           },
  { name: 'Walls sides',    collides: true                           },
  { name: 'Gargoyles',      collides: false                          },
  { name: 'Walls pillars',  collides: true                           },
  { name: 'Traps',          collides: false, zone: 'trap'            },
  { name: 'Pickups',        collides: false, zone: 'pickup'          },
  { name: 'Next Level',     collides: false, zone: 'pickup'          },
  { name: 'Miscs',          collides: false                          },
  { name: 'Doors',          collides: true,  zone: 'door'            },
];

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  private collideLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  /** All created layers, keyed by their config name — for future per-layer interaction. */
  private namedLayers = new Map<string, Phaser.Tilemaps.TilemapLayer>();
  /** Zone grid [tileY][tileX] built from LAYER_CONFIG.zone entries. */
  private zoneGrid: DungeonZone[][] = [];
  private tilePixels = 0; // raw tilemap tilewidth * MAP_SCALE
  private exitKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SceneKey.Dungeon });
  }

  create(): void {
    // Reset state on scene restart
    this.collideLayers = [];
    this.namedLayers.clear();
    this.zoneGrid = [];

    // ── Tilemap ────────────────────────────────────────────────────────────
    const map = this.make.tilemap({ key: MapKey.Dungeon });
    const tileset = map.addTilesetImage('spritefusion', TextureKey.DungeonTiles);

    if (!tileset) {
      console.error('[DungeonScene] Could not load dungeon tileset');
      return;
    }

    this.tilePixels = map.tileWidth * MAP_SCALE;

    for (const cfg of LAYER_CONFIG) {
      const layer = map.createLayer(cfg.name, tileset, 0, 0);
      if (!layer) {
        console.warn(`[DungeonScene] Layer "${cfg.name}" not found, skipping`);
        continue;
      }
      layer.setScale(MAP_SCALE);
      this.namedLayers.set(cfg.name, layer);

      if (cfg.collides) {
        layer.setCollisionByExclusion([-1]);
        this.collideLayers.push(layer);
      }
    }

    // Build zone grid so future systems can query getZone(tileX, tileY)
    this.buildZoneGrid(map);

    const mapW = map.widthInPixels  * MAP_SCALE;
    const mapH = map.heightInPixels * MAP_SCALE;
    this.physics.world.setBounds(0, 0, mapW, mapH);

    // ── Player ─────────────────────────────────────────────────────────────
    const spawnX = SPAWN_TILE_X * TILE_SIZE * MAP_SCALE / 2;
    const spawnY = SPAWN_TILE_Y * TILE_SIZE * MAP_SCALE / 2;
    this.player = new Player(this, spawnX, spawnY);

    for (const layer of this.collideLayers) {
      this.physics.add.collider(this.player, layer);
    }

    // ── Camera ─────────────────────────────────────────────────────────────
    this.cameras.main
      .setBounds(0, 0, mapW, mapH)
      .setZoom(2)
      .startFollow(this.player, true, 0.1, 0.1);

    // ── HUD overlay ────────────────────────────────────────────────────────
    const { width: W, height: H } = this.scale;
    this.add.text(W / 2, 10, '⚔️  Hầm Ngục', {
      fontSize: '14px', color: '#cc4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(10);

    this.add.text(W / 2, H - 6, 'ESC: quay lại làng', {
      fontSize: '10px', color: '#aaaaaa',
      backgroundColor: '#00000055',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);

    // ── Exit key ───────────────────────────────────────────────────────────
    this.exitKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  // ── Zone / layer helpers (for future interaction systems) ─────────────────

  /**
   * Returns the DungeonZone for a given tile coordinate.
   * Call with worldX/worldY: tileX = Math.floor(worldX / tilePixels), etc.
   */
  getZone(tileX: number, tileY: number): DungeonZone {
    return this.zoneGrid[tileY]?.[tileX] ?? 'none';
  }

  /** Returns the tile pixel size after scale — useful for world→tile conversion. */
  get tileSize(): number { return this.tilePixels; }

  /** Returns a named layer by its Tiled layer name, or undefined if not created. */
  getLayer(name: string): Phaser.Tilemaps.TilemapLayer | undefined {
    return this.namedLayers.get(name);
  }

  private buildZoneGrid(map: Phaser.Tilemaps.Tilemap): void {
    const mapW = map.width;
    const mapH = map.height;

    // Default every tile to 'none'
    for (let ty = 0; ty < mapH; ty++) {
      this.zoneGrid[ty] = new Array<DungeonZone>(mapW).fill('none');
    }

    for (const cfg of LAYER_CONFIG) {
      if (!cfg.zone) continue;
      if (!this.namedLayers.has(cfg.name)) continue;

      for (let ty = 0; ty < mapH; ty++) {
        for (let tx = 0; tx < mapW; tx++) {
          const tile = map.getTileAt(tx, ty, false, cfg.name);
          if (tile && tile.index !== -1) {
            this.zoneGrid[ty][tx] = cfg.zone;
          }
        }
      }
    }
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  update(_time: number, _delta: number): void {
    this.player.update();

    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.scene.start(SceneKey.Game); // starts GameScene and stops DungeonScene
    }
  }
}
