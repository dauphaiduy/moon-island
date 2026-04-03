import Phaser from 'phaser';
import { SceneKey } from '../constants';
import type { UIScene } from '../scenes/UIScene';
import { ITEMS } from '../data/items';
import type { ItemId } from '../types';
import { TOOL_SHOP_CATALOG } from '../objects/ShopBuilding';
import { bindRuntimeToUI } from './bindRuntimeToUI';
import { createGameRuntime, type GameRuntime } from './createGameRuntime';
import type { ToolId } from './gameTools';
import type { DialogSystem } from '../systems/DialogSystem';
import { SaveSystem } from '../systems/SaveSystem';

export class GameSession {
  private readonly scene: Phaser.Scene;
  private readonly handleTabKey  = () => this.cycleTool();
  private readonly handleSellKey = () => this.sellInventory();
  private readonly handleSkipHourKey = () => this.advanceHour();
  private readonly handleSaveKey = () => { void this.saveGame(); };
  private readonly handleEscKey  = () => this.togglePauseMenu();
  private readonly handleInvKey  = () => this.toggleInventory();
  // Keys 1–8: select hotbar slot; keys 1–3 also buy shop items when dialog is open
  // Phaser maps digit row keys to KeyCode names: ONE, TWO, THREE, …, EIGHT
  private static readonly NUMBER_KEY_NAMES = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT'] as const;
  private readonly numberKeyHandlers = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => () => {
    if (this.dialog?.isOpen && n <= 3) { this.buyShopItem(n - 1); }
    else if (!this.dialog?.isOpen)    { this.runtime.inventory.setActiveSlot(n - 1); }
  });
  private runtime!: GameRuntime;
  private ui!: UIScene;
  private dialog?: DialogSystem;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    this.runtime = createGameRuntime(this.scene);
    this.setupCamera();
    this.launchUiScene();
    this.bindKeyboard();
    this.scene.scale.on('resize', this.setupCamera, this);
  }

  destroy(): void {
    const keyboard = this.scene.input.keyboard;
    if (keyboard) {
      keyboard.off('keydown-TAB', this.handleTabKey);
      keyboard.off('keydown-Q',   this.handleSellKey);
      keyboard.off('keydown-N',   this.handleSkipHourKey);
      keyboard.off('keydown-F5',  this.handleSaveKey);
      keyboard.off('keydown-ESC', this.handleEscKey);
      keyboard.off('keydown-I',   this.handleInvKey);

      this.numberKeyHandlers.forEach((handler, index) => {
        keyboard.off(`keydown-${GameSession.NUMBER_KEY_NAMES[index]}`, handler);
      });
    }

    this.scene.scale.off('resize', this.setupCamera, this);
  }

  update(delta: number): void {
    this.runtime.player.update();
    this.runtime.farming.update(delta);
    this.runtime.dayNight.update(delta);

    const px = this.runtime.player.x;
    const py = this.runtime.player.y;
    for (const npc of this.runtime.npcs) {
      npc.update(px, py);
    }

    const nearby = this.findNearbyNpc();
    if (nearby) nearby.highlightBubble(this.scene);

    if (this.runtime.boat.isNearPlayer(px, py)) {
      this.runtime.boat.highlightBubble(this.scene);
    } else {
      this.runtime.boat.hideBubble();
    }

    if (this.runtime.toolShop.isNearPlayer(px, py)) {
      this.runtime.toolShop.highlightBubble(this.scene);
    } else {
      this.runtime.toolShop.hideBubble();
    }

    if (this.runtime.player.interactJustPressed) {
      this.handleInteract();
    }

    this.ui?.setFishingStatus(this.runtime.fishing.getStatusText());
  }

  private launchUiScene(): void {
    this.scene.scene.launch(SceneKey.UI);
    this.ui = this.scene.scene.get(SceneKey.UI) as UIScene;

    const bindUi = () => {
      this.dialog = bindRuntimeToUI({
        scene: this.scene,
        runtime: this.runtime,
        ui: this.ui,
      });

      // Hook up pause-menu actions
      this.ui.onPauseAction = (action) => {
        if (action === 'save') { void this.saveGame(); return; }
        if (action === 'load') { void this.loadSaveFromMenu(); return; }
        if (action === 'new')  { void this.newGame(); return; }
        if (action === 'menu') {
          // Transition to MenuScene — GameScene's SHUTDOWN listener will stop UIScene
          this.scene.scene.start(SceneKey.Menu);
        }
      };
      // Shop buy callback
      this.ui.onShopBuy = (itemId, price) => {
        if (!this.runtime.inventory.adjustGold(-price)) {
          this.ui.notify('💸 Không đủ tiền!', '#e74c3c');
          return;
        }
        const leftover = this.runtime.inventory.add(itemId, 1);
        if (leftover > 0) {
          // Refund if inventory full
          this.runtime.inventory.adjustGold(price);
          this.ui.notify('⚠️ Túi đồ đầy!', '#e67e22');
          return;
        }
        this.ui.notify(`🛒 Đã mua ${ITEMS[itemId].emoji} ${ITEMS[itemId].name}!`);
      };

      // Shop sell callback
      this.ui.onShopSell = (slotIndex) => {
        const slot = this.runtime.inventory.getSlot(slotIndex);
        if (!slot) return;
        const earned = slot.item.sellPrice;
        this.runtime.inventory.remove(slotIndex, 1);
        this.runtime.inventory.adjustGold(earned);
        this.ui.notify(`💰 Bán ${slot.item.emoji} ${slot.item.name} được ${earned}G!`);
      };

      this.ui.onShopSellAll = (slotIndex) => {
        const slot = this.runtime.inventory.getSlot(slotIndex);
        if (!slot) return;
        const qty = slot.qty;
        const earned = slot.item.sellPrice * slot.qty;
        this.runtime.inventory.remove(slotIndex, slot.qty);
        this.runtime.inventory.adjustGold(earned);
        this.ui.notify(`💰 Bán ${qty}x ${slot.item.emoji} ${slot.item.name} được ${earned}G!`);
      };

      // Chain auto-save onto onNewDay (runs after bindRuntimeToUI's chain)
      const _prevNewDay = this.runtime.dayNight.onNewDay;
      this.runtime.dayNight.onNewDay = (day) => {
        _prevNewDay?.(day);
        void this.saveGame();
      };

      this.loadSave();
    };

    if (this.ui.scene.isActive()) {
      bindUi();
      return;
    }

    this.ui.events.once(Phaser.Scenes.Events.CREATE, bindUi);
  }

  private bindKeyboard(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-TAB', this.handleTabKey);
    keyboard.on('keydown-Q',   this.handleSellKey);
    keyboard.on('keydown-N',   this.handleSkipHourKey);
    keyboard.on('keydown-F5',  this.handleSaveKey);
    keyboard.on('keydown-ESC', this.handleEscKey);
    keyboard.on('keydown-I',   this.handleInvKey);

    this.numberKeyHandlers.forEach((handler, index) => {
      keyboard.on(`keydown-${GameSession.NUMBER_KEY_NAMES[index]}`, handler);
    });
  }

  private setupCamera(): void {
    this.scene.cameras.main
      .setBounds(0, 0, this.runtime.tilemap.widthInPixels, this.runtime.tilemap.heightInPixels)
      .setZoom(2)
      .startFollow(this.runtime.player, true, 0.1, 0.1);
  }

  private cycleTool(): void {
    if (this.dialog?.isOpen) return;
    const current = this.runtime.inventory.getActiveSlot();
    this.runtime.inventory.setActiveSlot((current + 1) % 8);
  }

  private sellInventory(): void {
    if (this.dialog?.isOpen) return;

    const earned = this.runtime.inventory.sellAll();
    if (earned > 0) this.ui.notify(`💰 Bán được ${earned.toLocaleString()}G!`);
    else this.ui.notify('Túi đồ trống!', '#888888');
  }

  private advanceHour(): void {
    const state = this.runtime.dayNight.state;
    this.runtime.dayNight.setTime((state.hour + 1) % 24);
  }

  private buyShopItem(index: number): void {
    if (!this.dialog?.isOpen) return;

    const bought = this.dialog.buyShopItem(index);
    if (bought) this.ui.notify('🛒 Đã mua!');
    else this.ui.notify('💸 Không đủ tiền!', '#e74c3c');
  }

  private handleInteract(): void {
    if (this.dialog?.isOpen) {
      this.dialog.advance();
      return;
    }

    // E also closes the shop panel
    if (this.ui.isShopPanelOpen) {
      this.ui.closeShopPanel();
      return;
    }

    // Tool Shop building interaction
    if (this.runtime.toolShop.isNearPlayer(this.runtime.player.x, this.runtime.player.y)) {
      this.ui.openShopPanel(TOOL_SHOP_CATALOG, this.runtime.inventory, 'Cửa hàng dụng cụ', '🔧');
      return;
    }

    const nearby = this.findNearbyNpc();
    if (nearby) {
      // Shop NPC — open the interactive shop panel instead of DialogSystem
      if (nearby.def.shop) {
        this.ui.openShopPanel(nearby.def.shop, this.runtime.inventory, nearby.def.name, nearby.def.emoji);
        return;
      }
      this.dialog?.open(nearby);
      return;
    }

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

  private findNearbyNpc() {
    return this.runtime.npcs.find((npc) => npc.isNearPlayer(this.runtime.player.x, this.runtime.player.y));
  }

  private get currentTool(): ToolId {
    const slot = this.runtime.inventory.getSlot(this.runtime.inventory.getActiveSlot());
    if (!slot) return 'none';
    const toolMap: Partial<Record<string, ToolId>> = {
      tool_hoe:                   'hoe',
      tool_wateringCan:           'wateringCan',
      tool_fishingRod:            'fishingRod',
      tool_fishingRod_wooden:     'fishingRod',
      tool_fishingRod_bronze:     'fishingRod',
      tool_fishingRod_silver:     'fishingRod',
      tool_fishingRod_gold:       'fishingRod',
      tool_fishingRod_legendary:  'fishingRod',
    };
    return toolMap[slot.item.id] ?? 'none';
  }

  private togglePauseMenu(): void {
    // Block ESC while dialog is open
    if (this.dialog?.isOpen) return;
    // ESC also closes shop panel if open
    if (this.ui.isShopPanelOpen) { this.ui.closeShopPanel(); return; }
    // ESC also closes inventory if open
    if (this.ui.isInventoryOpen) { this.ui.closeInventoryPanel(); return; }
    this.ui.togglePauseMenu();
  }

  private toggleInventory(): void {
    if (this.dialog?.isOpen) return;
    if (this.ui.isPauseMenuOpen) return;
    if (this.ui.isShopPanelOpen) return;
    this.ui.toggleInventoryPanel(this.runtime.inventory);
  }

  private loadSave(): void {
    void SaveSystem.load().then(data => {
      if (!data || !this.dialog) return;
      SaveSystem.apply(data, this.runtime, this.dialog);
      this.ui.notify('💾 Đã tải game!');
    });
  }

  private async newGame(): Promise<void> {
    await SaveSystem.deleteSave();
    // Restart GameScene fresh
    this.scene.scene.restart();
  }

  private async loadSaveFromMenu(): Promise<void> {
    const data = await SaveSystem.load();
    if (!data || !this.dialog) {
      this.ui.notify('❌ Không có file lưu!', '#e74c3c');
      return;
    }
    SaveSystem.apply(data, this.runtime, this.dialog);
    this.ui.notify('💾 Đã tải game!');
  }

  private async saveGame(): Promise<void> {
    if (!this.dialog) return;
    await SaveSystem.save(this.runtime, this.runtime.inventory.getActiveSlot(), this.dialog);
    this.ui.notify('💾 Đã lưu game!');
  }
}