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
import { Boat } from '../objects/Boat';
import { ShopBuilding } from '../objects/ShopBuilding';

export interface GameRuntime {
  player: Player;
  npcs: NPC[];
  boat: Boat;
  toolShop: ShopBuilding;
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

  // Give the player starter tools (slots 0–2) then seeds (slots 3–5)
  inventory.add('tool_hoe', 1);
  inventory.add('tool_wateringCan', 1);
  inventory.add('tool_fishingRod', 1);
  inventory.add('seed_wheat',  5);
  inventory.add('seed_carrot', 3);
  inventory.add('seed_tomato', 2);

  const npcs = NPC_DEFS.map((def) => {
    const npc = new NPC(scene, def);
    tilemap.addCollider(npc);
    scene.physics.add.collider(player, npc);
    return npc;
  });

  // Reset crop watering + NPC daily state at the start of each new in-game day
  dayNight.onNewDay = (_day) => {
    farming.onNewDay();
    for (const npc of npcs) npc.onNewDay();
  };
  dayNight.onTimeChange = (state) => {
    for (const npc of npcs) npc.onTimeChange(state.timeOfDay);
  };

  const overlay = scene.add.rectangle(
    0,
    0,
    tilemap.widthInPixels * 4,
    tilemap.heightInPixels * 4,
    0x000000,
    0,
  ).setDepth(100).setScrollFactor(0).setOrigin(0);

  tilemap.addCollider(player);

  const boat = new Boat(scene);
  const toolShop = new ShopBuilding(scene);

  return {
    player,
    npcs,
    boat,
    toolShop,
    farming,
    fishing,
    tilemap,
    inventory,
    dayNight,
    overlay,
  };
}