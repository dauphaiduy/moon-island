import Phaser from 'phaser';

const NUMBER_KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'] as const;

export interface InputCallbacks {
  cycleTool:       () => void;
  sell:            () => void;
  skipHour:        () => void;
  save:            () => void;
  togglePause:     () => void;
  toggleInventory: () => void;
  toggleStats:     () => void;
  /** Called with the 1-based key number (1–8). */
  numberKey:       (n: number) => void;
}

/**
 * Manages keyboard listener registration and cleanup for GameSession.
 * Construct once, call bind() to attach listeners, destroy() to remove them.
 */
export class InputController {
  private readonly scene: Phaser.Scene;
  private callbacks?: InputCallbacks;
  private numberHandlers: (() => void)[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  bind(callbacks: InputCallbacks): void {
    this.callbacks = callbacks;
    const kb = this.scene.input.keyboard;
    if (!kb) return;

    kb.on('keydown-TAB', callbacks.cycleTool);
    // kb.on('keydown-Q',   callbacks.sell);
    kb.on('keydown-N',   callbacks.skipHour);
    kb.on('keydown-F5',  callbacks.save);
    kb.on('keydown-ESC', callbacks.togglePause);
    kb.on('keydown-I',   callbacks.toggleInventory);
    kb.on('keydown-P',   callbacks.toggleStats);

    this.numberHandlers = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
      const handler = () => callbacks.numberKey(n);
      kb.on(`keydown-${NUMBER_KEY_NAMES[n - 1]}`, handler);
      return handler;
    });
  }

  destroy(): void {
    const kb = this.scene.input.keyboard;
    if (!kb || !this.callbacks) return;

    kb.off('keydown-TAB', this.callbacks.cycleTool);
    // kb.off('keydown-Q',   this.callbacks.sell);
    kb.off('keydown-N',   this.callbacks.skipHour);
    kb.off('keydown-F5',  this.callbacks.save);
    kb.off('keydown-ESC', this.callbacks.togglePause);
    kb.off('keydown-I',   this.callbacks.toggleInventory);
    kb.off('keydown-P',   this.callbacks.toggleStats);

    this.numberHandlers.forEach((handler, index) => {
      kb.off(`keydown-${NUMBER_KEY_NAMES[index]}`, handler);
    });
    this.numberHandlers = [];
  }
}
