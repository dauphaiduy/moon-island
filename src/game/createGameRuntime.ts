import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { NPC_DEFS } from '../data/npcs';
import { NPC } from '../objects/NPC';
import { Player } from '../objects/Player';
import { DayNightSystem } from '../systems/DayNightSystem';
import { FarmingSystem } from '../systems/FarmingSystem';
import { FishingSystem } from '../systems/FishingSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { TilemapLoader } from '../systems/TilemapLoader';

export interface GameRuntime {
  player: Player;
  npcs: NPC[];
  farming: FarmingSystem;
  fishing: FishingSystem;
  tilemap: TilemapLoader;
  inventory: InventorySystem;
  dayNight: DayNightSystem;
  overlay: Phaser.GameObjects.Rectangle;
}

export function createGameRuntime(scene: Phaser.Scene): GameRuntime {
  const tilemap = new TilemapLoader(scene);
  tilemap.create();

  const player = new Player(scene, 10 * TILE_SIZE, 10 * TILE_SIZE);
  const farming = new FarmingSystem(scene);
  const fishing = new FishingSystem(scene);
  const inventory = new InventorySystem();
  const dayNight = new DayNightSystem();

  const npcs = NPC_DEFS.map((def) => {
    const npc = new NPC(scene, def);
    tilemap.addCollider(npc);
    scene.physics.add.collider(player, npc);
    return npc;
  });

  const overlay = scene.add.rectangle(
    0,
    0,
    tilemap.widthInPixels * 4,
    tilemap.heightInPixels * 4,
    0x000000,
    0,
  ).setDepth(100).setScrollFactor(0).setOrigin(0);

  tilemap.addCollider(player);

  return {
    player,
    npcs,
    farming,
    fishing,
    tilemap,
    inventory,
    dayNight,
    overlay,
  };
}