import Phaser from 'phaser';
import { SceneKey, TextureKey, MapKey } from '../constants';
import { TilemapLoader } from '../village/systems/TilemapLoader';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKey.Preload });
  }

  preload(): void {
    // ── Tilemap + tileset (overworld) ──────────────────────────────────────
    TilemapLoader.preload(this);

    // ── Dungeon map + tileset ──────────────────────────────────────────────
    this.load.tilemapTiledJSON(MapKey.Dungeon, 'assets/maps/dun.json');
    this.load.image(TextureKey.DungeonTiles, 'assets/tilesets/dun_spritesheet.png');

    // ── Player spritesheet ─────────────────────────────────────────────────
    // player.png: 128×128 px, 4 cols × 4 rows, each frame 32×32
    // row 0=down  row 1=left  row 2=right  row 3=up
    this.load.spritesheet(TextureKey.Player, 'assets/sprite_128x128.png', {
      frameWidth:  32,
      frameHeight: 32,
    });

    this.load.spritesheet(TextureKey.NPC, 'assets/player.png', {
      frameWidth:  32,
      frameHeight: 32,
    });


    // ── Loading bar ────────────────────────────────────────────────────────
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2 - 30, 'Đang tải...', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const bg  = this.add.rectangle(width / 2, height / 2, 300, 12)
      .setStrokeStyle(1, 0x444444);
    const bar = this.add.rectangle(
      width / 2 - 149, height / 2,
      0, 10, 0x4a9eff,
    ).setOrigin(0, 0.5);

    void bg;

    this.load.on('progress', (v: number) => { bar.width = 298 * v; });
  }

  create(): void {
    this.scene.start(SceneKey.Menu);
  }
}