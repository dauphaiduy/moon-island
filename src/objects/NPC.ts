import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import type { NpcDef } from '../types/npc';

const WANDER_INTERVAL_MS = 3000;
const WANDER_RADIUS      = 3;    // tiles
const MOVE_SPEED         = 60;
const INTERACT_DIST      = TILE_SIZE * 1.8;

export class NPC extends Phaser.GameObjects.Container {
  readonly def: NpcDef;

  private sprite!:     Phaser.GameObjects.Rectangle;
  private nameLabel!:  Phaser.GameObjects.Text;
  private bubble!:     Phaser.GameObjects.Text; // "!" or "🛒"
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private homeX:       number;
  private homeY:       number;

  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    const px = def.spawnX * TILE_SIZE + TILE_SIZE / 2;
    const py = def.spawnY * TILE_SIZE + TILE_SIZE / 2;
    super(scene, px, py);

    this.def   = def;
    this.homeX = px;
    this.homeY = py;

    this.buildVisuals(scene);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setCollideWorldBounds(true);
    this.body.setSize(TILE_SIZE - 8, TILE_SIZE - 8);
    this.body.setImmovable(true);

    if (def.wanders) this.startWander(scene);
  }

  // ─── Visuals ─────────────────────────────────────────────────────────────────

  private buildVisuals(scene: Phaser.Scene): void {
    // Body placeholder (swap with sprite when you have NPC spritesheet)
    this.sprite = scene.add.rectangle(0, 0, TILE_SIZE - 4, TILE_SIZE - 4, this.def.color)
      .setStrokeStyle(1, 0x000000, 0.4);
    this.add(this.sprite);

    // Name label above head
    this.nameLabel = scene.add.text(0, -TILE_SIZE + 2, this.def.name, {
      fontSize:  '7px',
      color:     '#ffffff',
      backgroundColor: '#00000088',
      padding:   { x: 3, y: 1 },
    }).setOrigin(0.5, 1);
    this.add(this.nameLabel);

    // Interaction bubble
    const icon = this.def.shop ? '🛒' : this.def.quest ? '❗' : '';
    this.bubble = scene.add.text(TILE_SIZE / 2 - 2, -TILE_SIZE - 4, icon, {
      fontSize: '12px',
    }).setOrigin(0.5, 1).setVisible(icon !== '');
    this.add(this.bubble);
  }

  // ─── Wander AI ───────────────────────────────────────────────────────────────

  private startWander(scene: Phaser.Scene): void {
    this.wanderTimer = scene.time.addEvent({
      delay:    WANDER_INTERVAL_MS,
      loop:     true,
      callback: () => this.pickNewTarget(),
    });
  }

  private pickNewTarget(): void {
    const dx = Phaser.Math.Between(-WANDER_RADIUS, WANDER_RADIUS) * TILE_SIZE;
    const dy = Phaser.Math.Between(-WANDER_RADIUS, WANDER_RADIUS) * TILE_SIZE;
    const tx = Phaser.Math.Clamp(this.homeX + dx, TILE_SIZE, 9999);
    const ty = Phaser.Math.Clamp(this.homeY + dy, TILE_SIZE, 9999);

    const angle  = Phaser.Math.Angle.Between(this.x, this.y, tx, ty);
    const dist   = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);

    if (dist < 4) { this.body.setVelocity(0, 0); return; }

    this.body.setVelocity(
      Math.cos(angle) * MOVE_SPEED,
      Math.sin(angle) * MOVE_SPEED,
    );

    // Stop after reaching target (approx)
    const travelMs = (dist / MOVE_SPEED) * 1000;
    this.scene.time.delayedCall(travelMs, () => {
      if (this.body) this.body.setVelocity(0, 0);
    });
  }

  // ─── Interaction ─────────────────────────────────────────────────────────────

  isNearPlayer(playerX: number, playerY: number): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY) <= INTERACT_DIST;
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