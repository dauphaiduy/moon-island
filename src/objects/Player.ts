import Phaser from 'phaser';
import { PLAYER_SPEED, TILE_SIZE } from '../constants';
import { TextureKey } from '../constants';
import type { Direction } from '../types';

// Spritesheet layout — player.png (128×128, 4 cols × 4 rows, 32×32 per frame)
// row 0 = walk down  | row 1 = walk left
// row 2 = walk right | row 3 = walk up
const ANIM_CONFIG: Record<Direction, { row: number; frames: number }> = {
  down:  { row: 0, frames: 4 },
  left:  { row: 1, frames: 4 },
  right: { row: 2, frames: 4 },
  up:    { row: 3, frames: 4 },
};

const FRAME_RATE = 8; // frames per second while walking

export class Player extends Phaser.GameObjects.Container {
  private _direction: Direction = 'down';
  private _isMoving = false;
  private sprite!: Phaser.GameObjects.Sprite;
  private keys!: {
    up:       Phaser.Input.Keyboard.Key;
    down:     Phaser.Input.Keyboard.Key;
    left:     Phaser.Input.Keyboard.Key;
    right:    Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
  };

  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.sprite = scene.add.sprite(0, 0, TextureKey.Player, 0);
    this.add(this.sprite);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Hitbox — smaller than the sprite so player can get close to objects
    this.body.setCollideWorldBounds(true);
    this.body.setSize(14, 14);
    this.body.setOffset(-7, -7);

    const kb = scene.input.keyboard!;
    this.keys = {
      up:       kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:     kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };

    Player.createAnims(scene);
    this.sprite.play('idle-down');
  }

  // ─── Static: register animations once per scene ────────────────────────────

  static createAnims(scene: Phaser.Scene): void {
    if (scene.anims.exists('walk-down')) return; // already registered

    const COLS = 4;

    for (const [dir, { row, frames }] of Object.entries(ANIM_CONFIG) as [Direction, typeof ANIM_CONFIG[Direction]][]) {
      // Walk animation
      scene.anims.create({
        key: `walk-${dir}`,
        frames: scene.anims.generateFrameNumbers(TextureKey.Player, {
          start: row * COLS,
          end:   row * COLS + frames - 1,
        }),
        frameRate: FRAME_RATE,
        repeat: -1,
      });

      // Idle animation — just the first frame of each direction
      scene.anims.create({
        key: `idle-${dir}`,
        frames: [{ key: TextureKey.Player, frame: row * COLS }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  // ─── Getters ────────────────────────────────────────────────────────────────

  get direction(): Direction { return this._direction; }
  get isMoving(): boolean    { return this._isMoving; }

  get tileX(): number { return Math.floor(this.x / TILE_SIZE); }
  get tileY(): number { return Math.floor(this.y / TILE_SIZE); }

  get facingTile(): { tileX: number; tileY: number } {
    const offsets: Record<Direction, [number, number]> = {
      up:    [0, -1],
      down:  [0,  1],
      left:  [-1, 0],
      right: [ 1, 0],
    };
    const [dx, dy] = offsets[this._direction];
    return { tileX: this.tileX + dx, tileY: this.tileY + dy };
  }

  get interactJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys.interact);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  update(): void {
    const vel = { x: 0, y: 0 };
    let newDir: Direction = this._direction;

    if (this.keys.left.isDown)       { vel.x = -PLAYER_SPEED; newDir = 'left'; }
    else if (this.keys.right.isDown) { vel.x =  PLAYER_SPEED; newDir = 'right'; }

    if (this.keys.up.isDown)         { vel.y = -PLAYER_SPEED; newDir = 'up'; }
    else if (this.keys.down.isDown)  { vel.y =  PLAYER_SPEED; newDir = 'down'; }

    // Normalize diagonal movement
    if (vel.x !== 0 && vel.y !== 0) {
      vel.x *= Math.SQRT1_2;
      vel.y *= Math.SQRT1_2;
    }

    this.body.setVelocity(vel.x, vel.y);

    const wasMoving  = this._isMoving;
    this._isMoving   = vel.x !== 0 || vel.y !== 0;
    const dirChanged = newDir !== this._direction;
    this._direction  = newDir;

    this.playAnim(wasMoving, dirChanged);
  }

  private playAnim(wasMoving: boolean, dirChanged: boolean): void {
    if (this._isMoving) {
      // Only restart the anim if direction changed or we just started moving
      if (dirChanged || !wasMoving) {
        this.sprite.play(`walk-${this._direction}`);
      }
    } else {
      // Just stopped — switch to idle facing same direction
      if (wasMoving) {
        this.sprite.play(`idle-${this._direction}`);
      }
    }
  }
}