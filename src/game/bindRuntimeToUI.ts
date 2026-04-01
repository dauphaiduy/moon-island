import Phaser from 'phaser';
import type { UIScene } from '../scenes/UIScene';
import { DialogSystem } from '../systems/DialogSystem';
import type { GameRuntime } from './createGameRuntime';

interface BindRuntimeToUIParams {
  scene: Phaser.Scene;
  runtime: GameRuntime;
  ui: UIScene;
}

export function bindRuntimeToUI({ scene, runtime, ui }: BindRuntimeToUIParams): DialogSystem {
  runtime.inventory.onChange = () => {
    ui.refreshHotbar(runtime.inventory);
    ui.setGold(runtime.inventory.gold);
  };

  runtime.dayNight.onTimeChange = (state) => {
    runtime.overlay.setFillStyle(state.tint, state.alpha);
    ui.setClock(state);
  };
  runtime.dayNight.onNewDay = (day) => ui.notify(`🌅 Ngày ${day} bắt đầu!`);

  runtime.fishing.onCatch = (fish) => {
    const added = runtime.inventory.addFish(fish);
    if (added) ui.notify(`🐟 Bắt được: ${fish}!`);
    else ui.notify(`🐟 ${fish} - túi đồ đầy!`, '#e67e22');
  };
  runtime.fishing.onMiss = () => ui.notify('❌ Cá thoát mất!', '#e74c3c');

  runtime.dayNight.setTime(7);
  runtime.inventory.onChange?.();

  const dialog = new DialogSystem(ui, runtime.inventory);
  dialog.onGoldSpend = (amount) => {
    const ok = runtime.inventory.adjustGold(-amount);
    if (!ok) ui.notify('💸 Không đủ tiền!', '#e74c3c');
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    runtime.inventory.onChange = undefined;
    runtime.dayNight.onTimeChange = undefined;
    runtime.dayNight.onNewDay = undefined;
    runtime.fishing.onCatch = undefined;
    runtime.fishing.onMiss = undefined;
  });

  return dialog;
}