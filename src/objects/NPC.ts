import Phaser from 'phaser';
import { TextureKey, TILE_SIZE } from '../constants';
import type { NpcDef } from '../types/npc';
import type { TimeOfDay } from '../systems/DayNightSystem';

const WANDER_INTERVAL_MS = 3000;
const WANDER_RADIUS      = 3;    // tiles
const MOVE_SPEED         = 55;
const INTERACT_DIST      = TILE_SIZE * 1.8;
const MAX_FRIENDSHIP     = 10;

// NPC spritesheet layout matches player.png: 4 cols × 4 rows, 32 × 32 per frame
// row 0 = walk down | row 1 = walk left | row 2 = walk right | row 3 = walk up
const NPC_ANIM_ROWS: Record<'down' | 'left' | 'right' | 'up', number> = {
  down: 0, left: 1, right: 2, up: 3,
};

type NpcDirection = 'down' | 'left' | 'right' | 'up';

export class NPC extends Phaser.GameObjects.Container {
  readonly def: NpcDef;

  private sprite!:     Phaser.GameObjects.Sprite;
  private nameLabel!:  Phaser.GameObjects.Text;
  private bubble!:     Phaser.GameObjects.Text;
  private heartLabel!: Phaser.GameObjects.Text;

  private wanderTimer:  Phaser.Time.TimerEvent | null = null;
  private isFrozen      = false;      // paused because player is nearby
  private isHome        = false;      // night-time, standing at spawn
  private direction:    NpcDirection = 'down';
  private homeX:        number;
  private homeY:        number;

  // Friendship
  private _friendship   = 0;
  private chattedToday  = false;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    const px = def.spawnX * TILE_SIZE + TILE_SIZE / 2;
    const py = def.spawnY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, px, py);

    this.def   = def;
    this.homeX = px;
    this.homeY = py;

    NPC.createAnims(scene);
    this.buildVisuals(scene);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(TILE_SIZE - 8, TILE_SIZE - 8);
    this.body.setImmovable(true);

    if (def.wanders) this.startWander(scene);
  }

  // ─── Static: register animations once per scene ──────────────────────────────

  static createAnims(scene: Phaser.Scene): void {
    if (scene.anims.exists('npc-idle-down')) return;
    const COLS = 4;
    for (const [dir, row] of Object.entries(NPC_ANIM_ROWS) as [NpcDirection, number][]) {
      scene.anims.create({
        key: `npc-walk-${dir}`,
        frames: scene.anims.generateFrameNumbers(TextureKey.NPC, {
          start: row * COLS,
          end:   row * COLS + COLS - 1,
        }),
        frameRate: 8,
        repeat: -1,
      });
      scene.anims.create({
        key: `npc-idle-${dir}`,
        frames: [{ key: TextureKey.NPC, frame: row * COLS }],
        frameRate: 1,
        repeat: 0,
      });
    }
  }

  // ─── Visuals ─────────────────────────────────────────────────────────────────

  private buildVisuals(scene: Phaser.Scene): void {
    this.sprite = scene.add.sprite(0, 0, TextureKey.NPC, 0);
    this.sprite.play('npc-idle-down');
    this.add(this.sprite);

    this.nameLabel = scene.add.text(0, -TILE_SIZE + 2, this.def.name, {
      fontSize: '7px', color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1);
    this.add(this.nameLabel);

    // Heart display (friendship level)
    this.heartLabel = scene.add.text(0, -TILE_SIZE - 10, '', {
      fontSize: '8px',
    }).setOrigin(0.5, 1).setVisible(false);
    this.add(this.heartLabel);

    // Interaction bubble
    const icon = this.def.shop ? '🛒' : this.def.quest ? '❗' : '';
    this.bubble = scene.add.text(TILE_SIZE / 2 - 2, -TILE_SIZE - 4, icon, {
      fontSize: '12px',
    }).setOrigin(0.5, 1).setVisible(icon !== '');
    this.add(this.bubble);
  }

  private playAnim(moving: boolean): void {
    const key = moving ? `npc-walk-${this.direction}` : `npc-idle-${this.direction}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────────

  update(playerX: number, playerY: number): void {
    const near = this.isNearPlayer(playerX, playerY);

    // Freeze/unfreeze when player enters or leaves proximity
    if (near && !this.isFrozen) {
      this.isFrozen = true;
      this.body.setVelocity(0, 0);
      this.faceToward(playerX, playerY);
      this.playAnim(false);
    } else if (!near && this.isFrozen) {
      this.isFrozen = false;
    }

    // Update direction from velocity when wandering
    if (!this.isFrozen && !this.isHome) {
      const vx = this.body.velocity.x;
      const vy = this.body.velocity.y;
      const moving = Math.abs(vx) > 1 || Math.abs(vy) > 1;
      if (moving) {
        if (Math.abs(vx) >= Math.abs(vy)) {
          this.direction = vx > 0 ? 'right' : 'left';
        } else {
          this.direction = vy > 0 ? 'down' : 'up';
        }
      }
      this.playAnim(moving);
    }
  }

  // ─── Wander AI ───────────────────────────────────────────────────────────────

  private startWander(scene: Phaser.Scene): void {
    this.wanderTimer = scene.time.addEvent({
      delay:    WANDER_INTERVAL_MS,
      loop:     true,
      callback: () => {
        if (!this.isFrozen && !this.isHome) this.pickNewTarget();
      },
    });
  }

  private pickNewTarget(): void {
    const dx = Phaser.Math.Between(-WANDER_RADIUS, WANDER_RADIUS) * TILE_SIZE;
    const dy = Phaser.Math.Between(-WANDER_RADIUS, WANDER_RADIUS) * TILE_SIZE;
    const tx = Phaser.Math.Clamp(this.homeX + dx, TILE_SIZE, 9999);
    const ty = Phaser.Math.Clamp(this.homeY + dy, TILE_SIZE, 9999);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (dist < 4) { this.body.setVelocity(0, 0); return; }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    this.body.setVelocity(Math.cos(angle) * MOVE_SPEED, Math.sin(angle) * MOVE_SPEED);

    const travelMs = (dist / MOVE_SPEED) * 1000;
    this.scene.time.delayedCall(travelMs, () => {
      if (this.body) this.body.setVelocity(0, 0);
    });
  }

  // ─── Daily schedule ──────────────────────────────────────────────────────────

  onTimeChange(timeOfDay: TimeOfDay): void {
    const isNight = timeOfDay === 'night';
    if (isNight && !this.isHome) {
      this.goHome();
    } else if (!isNight && this.isHome) {
      this.isHome = false;
    }
  }

  private goHome(): void {
    this.isHome = true;
    this.body.setVelocity(0, 0);
    this.setPosition(this.homeX, this.homeY);
    this.direction = 'down';
    this.playAnim(false);
  }

  onNewDay(): void {
    this.chattedToday = false;
    this.isHome       = false;
  }

  // ─── Friendship ───────────────────────────────────────────────────────────────

  get friendship(): number { return this._friendship; }

  gainFriendship(amount: number): void {
    this._friendship = Math.min(MAX_FRIENDSHIP, this._friendship + amount);
    this.updateHearts();
  }

  /** Called by DialogSystem when a chat is opened. Returns true on first chat of day (gains +1). */
  tryDailyChat(): boolean {
    if (this.chattedToday) return false;
    this.chattedToday = true;
    this.gainFriendship(1);
    return true;
  }

  /** Active dialog lines — uses highest unlocked friendship tier, or default */
  get activeDialog() {
    const tiers = this.def.friendshipDialogs;
    if (tiers && tiers.length > 0) {
      const best = [...tiers]
        .filter(t => this._friendship >= t.minFriendship)
        .sort((a, b) => b.minFriendship - a.minFriendship)[0];
      if (best) return best.lines;
    }
    return this.def.dialog;
  }

  private updateHearts(): void {
    if (this._friendship <= 0) { this.heartLabel.setVisible(false); return; }
    const full  = '❤️'.repeat(Math.min(this._friendship, 5));
    const empty = '🤍'.repeat(Math.max(0, 5 - this._friendship));
    this.heartLabel.setText(full + empty).setVisible(true);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  isNearPlayer(playerX: number, playerY: number): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) <= INTERACT_DIST;
  }

  private faceToward(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.direction = dx > 0 ? 'right' : 'left';
    } else {
      this.direction = dy > 0 ? 'down' : 'up';
    }
  }

  /** Pulse the bubble to hint player they can interact */
  highlightBubble(scene: Phaser.Scene): void {
    if (!this.bubble.visible) return;
    scene.tweens.add({
      targets:  this.bubble,
      y:        -TILE_SIZE - 8,
      duration: 400,
      yoyo:     true,
      ease:     'Sine.easeInOut',
    });
  }

  destroy(fromScene?: boolean): void {
    this.wanderTimer?.remove();
    super.destroy(fromScene);
  }
}