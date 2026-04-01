import Phaser from 'phaser';
import { SceneKey } from '../constants';
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
    });
  }

  update(_time: number, delta: number): void {
    this.session.update(delta);
  }
}