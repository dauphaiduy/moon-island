import Phaser from 'phaser';
import { SceneKey, TextureKey, MapKey, TILE_SIZE } from '../constants';
import { Player } from '../objects/Player';

// dun.json tiles are 16 px; scale ×2 → 32 px to match the player sprite.
const MAP_SCALE = 1.5;

// Layer names in dun.json that block movement.
const COLLIDE_LAYERS = ['Walls', 'Walls sides', 'Walls pillars', 'Doors'];

// Spawn position in tile coordinates (near the entrance door).
const SPAWN_TILE_X = 10;
const SPAWN_TILE_Y = 11;

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  private collideLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private exitKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SceneKey.Dungeon });
  }

  create(): void {
    // ── Tilemap ────────────────────────────────────────────────────────────
    const map = this.make.tilemap({ key: MapKey.Dungeon });
    const tileset = map.addTilesetImage('spritefusion', TextureKey.DungeonTiles);

    if (!tileset) {
      console.error('[DungeonScene] Could not load dungeon tileset');
      return;
    }

    const layerOrder = [
      'Floor',
      'Walls',
      'Walls sides',
      'Gargoyles',
      'Walls pillars',
      'Traps',
      'Pickups',
      'Miscs',
      'Doors',
    ];

    for (const name of layerOrder) {
      const layer = map.createLayer(name, tileset, 0, 0);
      if (!layer) {
        console.warn(`[DungeonScene] Layer "${name}" not found, skipping`);
        continue;
      }
      layer.setScale(MAP_SCALE);

      if (COLLIDE_LAYERS.includes(name)) {
        layer.setCollisionByExclusion([-1]);
        this.collideLayers.push(layer);
      }
    }

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

  update(_time: number, _delta: number): void {
    this.player.update();

    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.scene.start(SceneKey.Game); // starts GameScene and stops DungeonScene
    }
  }
}
