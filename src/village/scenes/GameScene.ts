import Phaser from 'phaser';
import { SceneKey } from '../../constants';
import { GameSession } from '../game/GameSession';

export class GameScene extends Phaser.Scene {
  private session!: GameSession;

  constructor() {
    super({ key: SceneKey.Game });
  }

  create(): void {
    this.session = new GameSession(this);
    this.session.create();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session.destroy();
      // Stop the UI overlay so it doesn't linger when returning to the menu
      if (this.scene.isActive(SceneKey.UI)) {
        this.scene.stop(SceneKey.UI);
      }
    });
  }

  update(_time: number, delta: number): void {
    this.session.update(delta);
  }
}