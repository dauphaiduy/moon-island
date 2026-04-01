import Phaser from 'phaser';
import { SceneKey } from '../constants';
import type { UIScene } from '../scenes/UIScene';
import { ITEMS } from '../systems/InventorySystem';
import { bindRuntimeToUI } from './bindRuntimeToUI';
import { createGameRuntime, type GameRuntime } from './createGameRuntime';
import { TOOL_LABELS, TOOL_ORDER, type ToolId } from './gameTools';
import type { DialogSystem } from '../systems/DialogSystem';

export class GameSession {
  private readonly scene: Phaser.Scene;
  private readonly handleTabKey = () => this.cycleTool();
  private readonly handleSellKey = () => this.sellInventory();
  private readonly handleSkipHourKey = () => this.advanceHour();
  private readonly shopKeyHandlers = [0, 1, 2].map((index) => () => this.buyShopItem(index));
  private runtime!: GameRuntime;
  private ui!: UIScene;
  private dialog?: DialogSystem;
  private toolIndex = 0;

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
      keyboard.off('keydown-Q', this.handleSellKey);
      keyboard.off('keydown-N', this.handleSkipHourKey);

      this.shopKeyHandlers.forEach((handler, index) => {
        keyboard.off(`keydown-${index + 1}`, handler);
      });
    }

    this.scene.scale.off('resize', this.setupCamera, this);
  }

  update(delta: number): void {
    this.runtime.player.update();
    this.runtime.farming.update(delta);
    this.runtime.dayNight.update(delta);

    const nearby = this.findNearbyNpc();
    if (nearby) nearby.highlightBubble(this.scene);

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
    keyboard.on('keydown-Q', this.handleSellKey);
    keyboard.on('keydown-N', this.handleSkipHourKey);

    this.shopKeyHandlers.forEach((handler, index) => {
      keyboard.on(`keydown-${index + 1}`, handler);
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

    this.toolIndex = (this.toolIndex + 1) % TOOL_ORDER.length;
    const tool = this.currentTool;
    this.ui.setTool(TOOL_LABELS[tool]);
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

    const nearby = this.findNearbyNpc();
    if (nearby) {
      this.dialog?.open(nearby.def);
      return;
    }

    const { tileX, tileY } = this.runtime.player.facingTile;
    const zone = this.runtime.tilemap.getZone(tileX, tileY);

    switch (this.currentTool) {
      case 'hoe':
        if (zone === 'farm' && this.runtime.farming.till(tileX, tileY)) {
          this.ui.notify('🌱 Đã cày đất');
        }
        break;

      case 'wateringCan':
        if (zone !== 'farm') break;

        if (this.runtime.farming.plant(tileX, tileY)) {
          this.ui.notify('🌾 Đã gieo hạt');
          break;
        }

        if (!this.runtime.farming.harvest(tileX, tileY)) break;

        if (this.runtime.inventory.isFull()) {
          this.ui.notify('⚠️ Túi đồ đầy!', '#e67e22');
          break;
        }

        const cropId = this.runtime.inventory.addHarvest();
        const cropDef = ITEMS[cropId];
        this.ui.notify(`✅ Thu hoạch ${cropDef.emoji} ${cropDef.name}!`);
        break;

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
    return TOOL_ORDER[this.toolIndex];
  }
}