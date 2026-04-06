import Phaser from 'phaser';
import { SceneKey } from '../../constants';
import type { UIScene } from '../../scenes/UIScene';
import { ITEMS } from '../../common/data/items';
import { bindRuntimeToUI } from './bindRuntimeToUI';
import { createGameRuntime, type GameRuntime } from './createGameRuntime';
import type { DialogSystem } from '../systems/DialogSystem';
import { SaveSystem } from '../../common/systems/SaveSystem';
import { DungeonLoot } from '../../dungeon/systems/DungeonLoot';
import { InputController } from './InputController';
import { InteractionHandler } from './InteractionHandler';
import { XP_GRANTS } from '../../common/systems/XPSystem';

export class GameSession {
  private readonly scene: Phaser.Scene;
  private readonly input: InputController;
  private runtime!: GameRuntime;
  private ui!: UIScene;
  private interact!: InteractionHandler;
  private dialog?: DialogSystem;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.input = new InputController(scene);
  }

  create(): void {
    this.runtime  = createGameRuntime(this.scene);
    this.setupCamera();
    this.launchUiScene();                                      // sets this.ui
    this.interact = new InteractionHandler(this.runtime, this.ui);
    this.input.bind({
      cycleTool:       () => this.cycleTool(),
      sell:            () => this.sellInventory(),
      skipHour:        () => this.advanceHour(),
      save:            () => { void this.saveGame(); },
      togglePause:     () => this.togglePauseMenu(),
      toggleInventory: () => this.toggleInventory(),
      toggleStats:     () => this.toggleStatsPanel(),
      numberKey: (n) => {
        if (this.dialog?.isOpen && n <= 3) { this.buyShopItem(n - 1); }
        else if (!this.dialog?.isOpen)     { this.runtime.inventory.setActiveSlot(n - 1); }
      },
    });
    this.scene.scale.on('resize', this.setupCamera, this);
  }

  destroy(): void {
    this.input.destroy();
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

    const nearby = this.runtime.npcs.find((npc) => npc.isNearPlayer(px, py));
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

    if (this.runtime.dungeonEntrance.isNearPlayer(px, py)) {
      this.runtime.dungeonEntrance.highlightBubble(this.scene);
    } else {
      this.runtime.dungeonEntrance.hideBubble();
    }

    if (this.runtime.player.interactJustPressed) {
      this.interact.handle();
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
      this.interact.setDialog(this.dialog);

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
        const staminaRestore = ITEMS[itemId].staminaRestore;
        if (staminaRestore) {
          this.runtime.stats.addStamina(staminaRestore);
          this.ui.notify(`❤️ Phục hồi ${staminaRestore} thể lực!`);
        }
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
        // Restore stamina at the start of each new day
        this.runtime.stats.restoreStamina();
        void this.saveGame();
      };

      // XP bar updates
      this.runtime.xp.onXPChange = () => {
        this.ui.setXP(this.runtime.xp.level, this.runtime.xp.xp, this.runtime.xp.xpToNext, this.runtime.xp.progress);
      };
      this.runtime.xp.onLevelUp = (level) => {
        this.runtime.stats.addPoint();
        this.ui.notify(`🎉 Lên cấp ${level}! +1 điểm thuộc tính ✨`, '#ffcc00');
        this.ui.refreshStatsPanel(this.runtime.stats);
      };

      // Stats panel: spending a point
      this.ui.onStatSpend = (stat) => {
        const spent = this.runtime.stats.spendPoint(stat);
        if (!spent) { this.ui.notify('⚠️ Không có điểm!', '#e74c3c'); return; }
        this.ui.refreshStatsPanel(this.runtime.stats);
        const s = this.runtime.stats;
        this.ui.setStamina(s.currentStamina, s.maxStamina);
      };

      // Stamina bar updates
      this.runtime.stats.onStaminaChange = () => {
        const s = this.runtime.stats;
        this.ui.setStamina(s.currentStamina, s.maxStamina);
        this.ui.refreshStatsPanel(s);
      };

      this.loadSave();
    };

    if (this.ui.scene.isActive()) {
      // Defer by one tick so create() finishes assigning this.interact first
      this.scene.time.delayedCall(0, bindUi);
      return;
    }

    this.ui.events.once(Phaser.Scenes.Events.CREATE, bindUi);
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
    const { hour, day } = this.runtime.dayNight.state;
    const nextHour = (hour + 1) % 24;
    if (nextHour === 0) {
      // Wrap past midnight: advance the day counter, then fire onNewDay
      this.runtime.dayNight.loadState(day + 1, 0);
      this.runtime.dayNight.onNewDay?.(day + 1);
    } else {
      this.runtime.dayNight.setTime(nextHour);
    }
  }

  private buyShopItem(index: number): void {
    if (!this.dialog?.isOpen) return;

    const bought = this.dialog.buyShopItem(index);
    if (bought) this.ui.notify('🛒 Đã mua!');
    else this.ui.notify('💸 Không đủ tiền!', '#e74c3c');
  }

  private togglePauseMenu(): void {
    // Block ESC while dialog is open
    if (this.dialog?.isOpen) return;
    // ESC closes confirm dialog if open
    if (this.ui.isConfirmOpen) { this.ui.closeConfirm(); return; }
    // ESC also closes shop panel if open
    if (this.ui.isShopPanelOpen) { this.ui.closeShopPanel(); return; }
    // ESC also closes stats panel if open
    if (this.ui.isStatsPanelOpen) { this.ui.closeStatsPanel(); return; }
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

  private toggleStatsPanel(): void {
    if (this.dialog?.isOpen) return;
    if (this.ui.isPauseMenuOpen) return;
    if (this.ui.isShopPanelOpen) return;
    this.ui.toggleStatsPanel(this.runtime.stats);
  }

  private loadSave(): void {
    // Drain any loot collected in the dungeon before applying the save
    this.applyDungeonLoot();

    void SaveSystem.load().then(data => {
      if (!data || !this.dialog) return;
      SaveSystem.apply(data, this.runtime, this.dialog);
      // Refresh XP bar with loaded state (loadState doesn’t fire onXPChange)
      this.ui.setXP(this.runtime.xp.level, this.runtime.xp.xp, this.runtime.xp.xpToNext, this.runtime.xp.progress);      // Refresh stamina bar with loaded state
      const s = this.runtime.stats;
      this.ui.setStamina(s.currentStamina, s.maxStamina);
      this.ui.refreshStatsPanel(s);      this.ui.notify('💾 Đã tải game!');
    });
  }

  private applyDungeonLoot(): void {
    const loot = DungeonLoot.drain();
    for (const { itemId, qty } of loot) {
      const leftover = this.runtime.inventory.add(itemId, qty);
      const added = qty - leftover;
      if (added > 0) {
        this.runtime.xp.add(XP_GRANTS.DUNGEON_LOOT * added);
        this.ui.notify(`🎁 Nhận được ${ITEMS[itemId].emoji} ${ITEMS[itemId].name} từ hầm ngục!`);
      }
    }
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
    this.ui.setXP(this.runtime.xp.level, this.runtime.xp.xp, this.runtime.xp.xpToNext, this.runtime.xp.progress);
    const s = this.runtime.stats;
    this.ui.setStamina(s.currentStamina, s.maxStamina);
    this.ui.refreshStatsPanel(s);
    this.ui.notify('💾 Đã tải game!');
  }

  private async saveGame(): Promise<void> {
    if (!this.dialog) return;
    await SaveSystem.save(this.runtime, this.runtime.inventory.getActiveSlot(), this.dialog);
    this.ui.notify('💾 Đã lưu game!');
  }
}