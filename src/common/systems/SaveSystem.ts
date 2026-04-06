import type { GameRuntime } from '../../village/game/createGameRuntime';
import type { DialogSystem } from '../../village/systems/DialogSystem';
import type { ItemId, CropType } from '../../types';

// ─── Save data shape ──────────────────────────────────────────────────────────

export interface FarmTileSave {
  tileX: number;
  tileY: number;
  state: 'tilled' | 'seeded' | 'grown';
  cropType?: string;
  watered: boolean;
  growthStage: number;
  growthTimer: number;
}

export interface InventorySlotSave {
  id: ItemId;
  qty: number;
}

export interface SaveData {
  version: 1;
  day: number;
  /** Total game minutes within the current day (0–1439) */
  minute: number;
  playerX: number;
  playerY: number;
  toolIndex: number;
  gold: number;
  xp: number;
  level: number;
  slots: (InventorySlotSave | null)[];
  farmTiles: FarmTileSave[];
  npcFriendship: Record<string, number>;
  completedQuests: string[];
}

// ─── Electron / localStorage bridge ──────────────────────────────────────────

declare global {
  interface Window {
    electronAPI?: {
      save: (data: SaveData) => Promise<void>;
      load: () => Promise<SaveData | null>;
      hasSave: () => Promise<boolean>;
      deleteSave: () => Promise<void>;
    };
  }
}

const LS_KEY = 'my-valley-save';

/** Write save data — uses Electron IPC when available, falls back to localStorage */
async function write(data: SaveData): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.save(data);
  } else {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }
}

/** Read save data — returns null if no save exists */
async function read(): Promise<SaveData | null> {
  if (window.electronAPI) {
    return window.electronAPI.load();
  }
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SaveData; } catch { return null; }
}

// ─── SaveSystem ───────────────────────────────────────────────────────────────

export class SaveSystem {
  /** Serialize runtime state + dialog state and persist it */
  static async save(
    runtime: GameRuntime,
    toolIndex: number,
    dialog: DialogSystem,
  ): Promise<void> {
    const dayState = runtime.dayNight.state;

    // Inventory slots
    const slots: (InventorySlotSave | null)[] = runtime.inventory
      .getAllSlots()
      .map(s => s ? { id: s.item.id, qty: s.qty } : null);

    // Farm tiles
    const farmTiles: FarmTileSave[] = runtime.farming.getAllTiles().map(t => ({
      tileX:       t.tileX,
      tileY:       t.tileY,
      state:       t.state,
      cropType:    t.cropType,
      watered:     t.watered,
      growthStage: t.growthStage,
      growthTimer: t.growthTimer,
    }));

    // NPC friendship
    const npcFriendship: Record<string, number> = {};
    for (const npc of runtime.npcs) {
      npcFriendship[npc.def.id] = npc.friendship;
    }

    const data: SaveData = {
      version: 1,
      day:      dayState.day,
      minute:   dayState.hour * 60 + dayState.minute,
      playerX:  runtime.player.x,
      playerY:  runtime.player.y,
      toolIndex,
      gold:     runtime.inventory.gold,
      xp:       runtime.xp.getState().xp,
      level:    runtime.xp.getState().level,
      slots,
      farmTiles,
      npcFriendship,
      completedQuests: dialog.getCompletedQuests(),
    };

    await write(data);
  }

  /** Load persisted save data (null = no save) */
  static load(): Promise<SaveData | null> {
    return read();
  }

  /** Delete the save file entirely */
  static async deleteSave(): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.deleteSave();
    } else {
      localStorage.removeItem(LS_KEY);
    }
  }

  /** Apply loaded data onto a freshly created runtime */
  static apply(data: SaveData, runtime: GameRuntime, dialog: DialogSystem): void {
    // XP / level
    runtime.xp.loadState(data.xp ?? 0, data.level ?? 1);

    // Day / time
    runtime.dayNight.loadState(data.day, data.minute);

    // Player position
    runtime.player.setPosition(data.playerX, data.playerY);

    // Inventory: gold + slots
    runtime.inventory.loadState(data.slots, data.gold);
    runtime.inventory.setActiveSlot(data.toolIndex);

    // Farm tiles (cast cropType back to CropType — it was serialised from a valid CropType)
    runtime.farming.loadTiles(
      data.farmTiles.map(t => ({ ...t, cropType: t.cropType as CropType | undefined })),
    );

    // NPC friendship
    for (const npc of runtime.npcs) {
      const saved = data.npcFriendship[npc.def.id];
      if (saved !== undefined) npc.setFriendship(saved);
    }

    // Completed quests
    dialog.loadCompletedQuests(data.completedQuests);
  }
}
