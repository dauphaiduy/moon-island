import Phaser from 'phaser';
import { SceneKey, TextureKey, MapKey, TILE_SIZE } from '../../constants';
import { Player } from '../../common/Player';
import { ITEMS } from '../../common/items';
import { DungeonLoot } from '../systems/DungeonLoot';
import { TreasurePanel, type TreasureLootEntry } from '../ui/TreasurePanel';

// dun.json tiles are 16 px; scale ×2 → 32 px to match the player sprite.
const MAP_SCALE = 2;

// Spawn position in tile coordinates (near the entrance door).
const SPAWN_TILE_X = 10;
const SPAWN_TILE_Y = 11;

/**
 * Default loot inside every unopened treasure chest.
 * In the future this can be keyed by tile position for varied rewards.
 */
const TREASURE_CONTENTS: TreasureLootEntry[] = [
  { item: ITEMS['weapon_sword_wood'], qty: 1 },
];

/**
 * Zone types that dungeon tiles can belong to.
 * 'trap'   — hazard tiles (Traps layer)
 * 'treasure' — item/loot tiles (Pickups layer)
 * 'door'   — exit/entrance tiles (Doors layer)
 * 'level_up' — tiles that trigger level progression (Next Level layer)
 * 'none'   — wall, decoration, or passable floor with no special interaction
 */
export type DungeonZone = 'trap' | 'treasure' | 'door' | 'level_up' | 'none';

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
  { name: 'Pickups',        collides: true, zone: 'treasure'        },
  { name: 'Next Level',     collides: false, zone: 'level_up'        },
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
  /** Tile keys ("tileX,tileY") that have already been looted. */
  private lootedTiles = new Set<string>();
  private treasurePanel!: TreasurePanel;
  private notifText!: Phaser.GameObjects.Text;
  private notifTimer: Phaser.Time.TimerEvent | null = null;
  private exitKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SceneKey.Dungeon });
  }

  create(): void {
    // Reset state on scene restart
    this.collideLayers = [];
    this.namedLayers.clear();
    this.zoneGrid = [];
    this.lootedTiles.clear();

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

    // ── Notification bar ───────────────────────────────────────────────────
    this.notifText = this.add.text(W / 4, H - 30, '', {
      fontSize: '12px', color: '#ffffff',
      backgroundColor: '#00000099',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(15).setAlpha(0);

    // ── Treasure panel ─────────────────────────────────────────────────────
    this.treasurePanel = new TreasurePanel(this);

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
      if (this.treasurePanel.isOpen) {
        this.treasurePanel.close();
      } else {
        this.scene.start(SceneKey.Game); // starts GameScene and stops DungeonScene
      }
      return;
    }

    if (this.player.interactJustPressed && !this.treasurePanel.isOpen) {
      this.handleInteract();
    }
  }

  // ── Interaction ───────────────────────────────────────────────────────────

  private handleInteract(): void {
    // World → tile conversion uses the scaled tile size
    const tileX = Math.floor(this.player.x / this.tilePixels);
    const tileY = Math.floor(this.player.y / this.tilePixels);

    // Check current tile + facing tile
    const FACING_OFFSET: Record<string, [number, number]> = {
      up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
    };
    const [dx, dy] = FACING_OFFSET[this.player.direction] ?? [0, 0];

    const candidates = [
      { tx: tileX,      ty: tileY      },
      { tx: tileX + dx, ty: tileY + dy },
    ];

    for (const { tx, ty } of candidates) {
      if (this.getZone(tx, ty) === 'treasure') {
        const key = `${tx},${ty}`;
        if (this.lootedTiles.has(key)) {
          this.notify('📦 Rương này đã được mở rồi.');
          return;
        }
        this.treasurePanel.open(TREASURE_CONTENTS, (loot) => {
          this.lootedTiles.add(key);
          for (const { item, qty } of loot) {
            DungeonLoot.add(item.id, qty);
          }
          this.notify('🎁 Đã lấy đồ! Quay về làng để nhận vào túi.');
        });
        return;
      }
    }
  }

  private notify(message: string): void {
    this.notifTimer?.remove();
    this.notifText.setText(message).setAlpha(1);
    this.notifTimer = this.time.delayedCall(2800, () => {
      this.tweens.add({ targets: this.notifText, alpha: 0, duration: 400 });
    });
  }
}
