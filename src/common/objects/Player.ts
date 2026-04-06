import Phaser from 'phaser';
import { PLAYER_SPEED, TILE_SIZE } from '../../constants';
import { TextureKey } from '../../constants';
import type { Direction } from '../../types';

// Spritesheet layout — player.png (128×128, 4 cols × 4 rows, 32×32 per frame)
// row 0 = walk down  | row 1 = walk left
// row 2 = walk right | row 3 = walk up
const ANIM_CONFIG: Record<Direction, { row: number; frames: number }> = {
  down:  { row: 0, frames: 4 },
  left:  { row: 1, frames: 4 },
  right: { row: 0, frames: 4 },
  up:    { row: 3, frames: 4 },
};

const FRAME_RATE = 8; // frames per second while walking

export class Player extends Phaser.GameObjects.Container {
  private _direction: Direction = 'down';
  private _isMoving = false;
  private _isDoingAction = false;
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
    Player.createFarmingAnims(scene);
    this.sprite.play('idle-down');
  }

  // ─── Static: register walk / idle animations once per scene ───────────────────

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

  // ─── Static: register farming action animations once per scene ───────────

  static createFarmingAnims(scene: Phaser.Scene): void {
    if (scene.anims.exists('farm-hoe-right')) return;

    const COLS = 4;
    const FRAME_RATE_ACTION = 8;
    const actions: Array<['hoe' | 'water' | 'plant' | 'fishing', number]> = [
      ['hoe',     0],
      ['water',   1],
      ['plant',   2],
      ['fishing', 3],
    ];
    const sides: Array<['right' | 'left', string]> = [
      ['right', TextureKey.PlayerFarmingRight],
      ['left',  TextureKey.PlayerFarmingLeft],
    ];

    for (const [action, row] of actions) {
      for (const [side, textureKey] of sides) {
        // Left sprite is a horizontal flip of right, so frames run in reverse order
        const frameList = side === 'left'
          ? [row*COLS+3, row*COLS+2, row*COLS+1, row*COLS+0].map(f => ({ key: textureKey, frame: f }))
          : scene.anims.generateFrameNumbers(textureKey, { start: row * COLS, end: row * COLS + 3 });

        scene.anims.create({
          key: `farm-${action}-${side}`,
          frames: frameList,
          frameRate: FRAME_RATE_ACTION,
          repeat: 0,
        });
      }
    }
  }

  // ─── Play a one-shot farming action animation then return to idle ─────────

  playAction(action: 'hoe' | 'water' | 'plant' | 'fishing'): void {
    if (this._isDoingAction) return;
    this._isDoingAction = true;
    const side = this._direction === 'left' ? 'left' : 'right';
    this.sprite.play(`farm-${action}-${side}`);
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (action === 'fishing') {
        // Hold on the last frame — stay locked until stopFishing() is called
        // Left frames are reversed, so the last played frame is col 0 (not col 3)
        const lastFrame = side === 'left' ? 3 * 4 + 0 : 3 * 4 + 3;
        this.sprite.setFrame(lastFrame);
        return;
      }
      this._isDoingAction = false;
      this.sprite.play(`idle-${this._direction}`);
    });
  }

  /** Release the held fishing pose and return to idle. */
  stopFishing(): void {
    this._isDoingAction = false;
    this.sprite.play(`idle-${this._direction}`);
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
    if (this._isDoingAction) return;
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