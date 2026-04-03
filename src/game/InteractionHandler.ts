import type { ItemId } from '../types';
import { ITEMS } from '../data/items';
import { SceneKey } from '../constants';
import { TOOL_SHOP_CATALOG } from '../objects/ShopBuilding';
import type { GameRuntime } from './createGameRuntime';
import type { UIScene } from '../scenes/UIScene';
import type { DialogSystem } from '../systems/DialogSystem';
import type { ToolId } from './gameTools';

/**
 * Handles all E-key interaction logic: dialog, shop, NPC, and tile-tool actions.
 * Constructed in GameSession.create(); setDialog() is called once the DialogSystem
 * becomes available (after UIScene finishes binding).
 */
export class InteractionHandler {
  private dialog?: DialogSystem;
  private readonly runtime: GameRuntime;
  private readonly ui: UIScene;

  constructor(runtime: GameRuntime, ui: UIScene) {
    this.runtime = runtime;
    this.ui      = ui;
  }

  setDialog(dialog: DialogSystem): void {
    this.dialog = dialog;
  }

  // ─── Main entry point ─────────────────────────────────────────────────────────

  handle(): void {
    // Advance dialog if it is open
    if (this.dialog?.isOpen) {
      this.dialog.advance();
      return;
    }

    // E also closes an open shop panel
    if (this.ui.isShopPanelOpen) {
      this.ui.closeShopPanel();
      return;
    }

    // E also closes an open confirm dialog
    if (this.ui.isConfirmOpen) {
      this.ui.closeConfirm();
      return;
    }

    // ── Dungeon entrance ─────────────────────────────────────────────────────────
    if (this.runtime.dungeonEntrance.isNearPlayer(this.runtime.player.x, this.runtime.player.y)) {
      this.ui.openConfirm(
        'Bạn có muốn vào Hầm Ngục không?',
        () => this.ui.startScene(SceneKey.Dungeon),
      );
      return;
    }

    // ── Shop building ──────────────────────────────────────────────────────────
    if (this.runtime.toolShop.isNearPlayer(this.runtime.player.x, this.runtime.player.y)) {
      this.ui.openShopPanel(TOOL_SHOP_CATALOG, this.runtime.inventory, 'Cửa hàng dụng cụ', '🔧');
      return;
    }

    // ── NPC interaction ────────────────────────────────────────────────────────
    const nearby = this.findNearbyNpc();
    if (nearby) {
      if (nearby.def.shop) {
        this.ui.openShopPanel(nearby.def.shop, this.runtime.inventory, nearby.def.name, nearby.def.emoji);
        return;
      }
      this.dialog?.open(nearby);
      return;
    }

    // ── Tile / tool interaction ────────────────────────────────────────────────
    const { tileX, tileY } = this.runtime.player.facingTile;
    const zone = this.runtime.tilemap.getZone(tileX, tileY);

    switch (this.currentTool) {
      case 'hoe': {
        if (zone !== 'farm') break;
        // Harvest fully grown crops first
        const harvested = this.runtime.farming.harvest(tileX, tileY);
        if (harvested) {
          if (this.runtime.inventory.isFull()) {
            this.ui.notify('⚠️ Túi đồ đầy!', '#e67e22');
            break;
          }
          this.runtime.inventory.add(harvested, 1);
          this.ui.notify(`✅ Thu hoạch ${ITEMS[harvested].emoji} ${ITEMS[harvested].name}!`);
          break;
        }
        // Otherwise till the soil
        if (this.runtime.farming.till(tileX, tileY)) {
          this.ui.notify('🌱 Đã cày đất');
        }
        break;
      }

      case 'wateringCan': {
        if (zone !== 'farm') break;
        const tile = this.runtime.farming.getTile(tileX, tileY);
        if (!tile) break;

        // On tilled soil: auto-plant first available seed (also waters automatically)
        if (tile.state === 'tilled') {
          const seedIds: ItemId[] = ['seed_wheat', 'seed_carrot', 'seed_tomato'];
          const seed = seedIds.find(id => this.runtime.inventory.count(id) > 0);
          if (seed) {
            const cropId = this.runtime.farming.plantSeed(tileX, tileY, seed);
            if (cropId) {
              this.runtime.inventory.removeByIdAndQty(seed, 1);
              this.ui.notify(`🌾 Đã gieo ${ITEMS[seed].emoji} ${ITEMS[seed].name}`);
              break;
            }
          }
          // No seeds — just water the soil
          if (this.runtime.farming.water(tileX, tileY)) {
            this.ui.notify('💧 Đã tưới đất');
          }
          break;
        }

        // On seeded soil: water to continue growth
        if (this.runtime.farming.water(tileX, tileY)) {
          this.ui.notify('💧 Đã tưới cây');
        } else if (tile.watered) {
          this.ui.notify('💧 Đã tưới rồi hôm nay');
        }
        break;
      }

      case 'fishingRod':
        if (!this.runtime.fishing.isActive && zone === 'water') {
          this.runtime.fishing.cast();
          break;
        }
        if (this.runtime.fishing.isBiting) {
          this.runtime.fishing.reel();
          break;
        }
        if (this.runtime.fishing.isActive) {
          this.runtime.fishing.cancel();
          this.ui.notify('Đã hủy câu', '#e67e22');
        }
        break;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private findNearbyNpc() {
    return this.runtime.npcs.find((npc) =>
      npc.isNearPlayer(this.runtime.player.x, this.runtime.player.y),
    );
  }

  private get currentTool(): ToolId {
    const slot = this.runtime.inventory.getSlot(this.runtime.inventory.getActiveSlot());
    if (!slot) return 'none';
    const toolMap: Partial<Record<string, ToolId>> = {
      tool_hoe:                  'hoe',
      tool_wateringCan:          'wateringCan',
      tool_fishingRod:           'fishingRod',
      tool_fishingRod_wooden:    'fishingRod',
      tool_fishingRod_bronze:    'fishingRod',
      tool_fishingRod_silver:    'fishingRod',
      tool_fishingRod_gold:      'fishingRod',
      tool_fishingRod_legendary: 'fishingRod',
    };
    return toolMap[slot.item.id] ?? 'none';
  }
}
