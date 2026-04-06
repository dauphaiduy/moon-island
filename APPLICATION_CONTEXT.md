# Application Context

## Overview

A 2D life-sim / farming game built with **Phaser 3 + TypeScript + Vite**, packaged as an Electron desktop app.
The world contains a village with farming, fishing, NPC interaction, and a shop — plus a dungeon (currently closed for rework).

---

## Runtime Stack

| Tool | Version |
|---|---|
| Phaser | `3.90.0` |
| TypeScript | `~5.9.3` |
| Vite | `^8.0.1` |
| Electron | latest |
| Physics | Arcade Physics |
| Pixel art | `pixelArt: true`, `roundPixels: true` |

---

## Folder Structure

```
src/
  main.ts                    # Phaser bootstrap
  style.css
  constants/index.ts          # SceneKey, TextureKey, MapKey, TILE_SIZE, game constants
  types/index.ts              # Shared interfaces: Direction, FarmTile, FishingState, ItemId, ItemDef, ...
  types/npc.ts                # NPC types, ShopItem

  scenes/                    # App-level scenes (used by both village and dungeon)
    PreloadScene.ts
    MenuScene.ts
    UIScene.ts                # Persistent HUD overlay (hotbar, clock, gold, XP bar, notification, panels)

  common/                    # Shared between village and dungeon
    createGameConfig.ts       # Phaser.Types.Core.GameConfig factory
    objects/Player.ts         # Player container: physics, walk/idle/farming animations, playAction/stopFishing
    data/items.ts             # ITEMS registry (ItemDef per ItemId), FISH_NAME_MAP
    systems/InventorySystem.ts
    systems/SaveSystem.ts     # Save/load via Electron IPC or localStorage fallback
    systems/XPSystem.ts       # Level 1–20, quadratic XP, onXPChange/onLevelUp callbacks
    ui/PauseMenuPanel.ts
    ui/InventoryPanel.ts
    ui/ConfirmDialog.ts

  village/
    scenes/GameScene.ts       # Scene lifecycle: creates GameSession, delegates update
    game/GameSession.ts       # Orchestrator: runtime + input + UI + save/load + hotkey wiring
    game/createGameRuntime.ts # Factory: builds all systems and objects → GameRuntime interface
    game/bindRuntimeToUI.ts   # Wires runtime callbacks → UIScene (fishing, day/night, inventory)
    game/InteractionHandler.ts# All E-key logic: dialog, shop, NPC, farming/fishing tile actions
    game/InputController.ts   # Keyboard bindings (Tab, E, S, F5, Esc, Ins, 1–9)
    game/gameTools.ts         # ToolId type, tool metadata, inventory-slot → tool mapping
    objects/NPC.ts
    objects/Boat.ts
    objects/ShopBuilding.ts
    objects/DungeonEntrance.ts
    systems/FarmingSystem.ts  # Till / plant / water / harvest; visual tile rendering
    systems/FishingSystem.ts  # Cast → wait → bite → reel/miss state machine
    systems/DayNightSystem.ts # In-game clock, time-of-day tint, new-day callback
    systems/TilemapLoader.ts  # Loads map.json + world.json, zone grid, colliders
    systems/DialogSystem.ts   # NPC conversation + quest progression
    ui/ShopPanel.ts
    data/npcs.ts              # NPC definitions (name, dialogue, shop catalog, friendship)

  dungeon/                   # Dungeon map — temporarily closed
    scenes/DungeonScene.ts   # Own Player + camera zoom=2, zone grid, TreasurePanel interaction
    systems/DungeonLoot.ts   # Static loot-buffer (awarded items carried back to village)
    ui/TreasurePanel.ts      # Chest loot popup (individual setScrollFactor — no Container)
```

---

## Boot Sequence

1. `src/main.ts` → `createGameConfig()` → `new Phaser.Game(config)`
2. Phaser starts scenes in order: `PreloadScene → MenuScene → GameScene + UIScene`
3. `PreloadScene` loads: village tilemap, dungeon tilemap, player spritesheet (`sprite_128x128.png`), farming spritesheets (`right_sprite_farming.png` / `left_sprite_farming.png`), NPC spritesheet
4. `MenuScene` shows title screen; click → `GameScene`
5. `GameScene.create()` → `new GameSession(scene).create()`
   - Builds `GameRuntime` (all systems + objects)
   - Launches `UIScene` as a parallel overlay
   - Creates `InteractionHandler` + `InputController`
   - Calls `bindRuntimeToUI()` to wire callbacks
6. `UIScene` runs on top of gameplay at all times, never stopped

---

## Key Systems

### Player (`common/objects/Player.ts`)
- `Container` with an inner `Sprite`
- Walk animations: `walk-{down|left|right|up}` from `TextureKey.Player`
- Idle animations: `idle-{down|left|right|up}`
- **Farming animations**: `farm-{hoe|water|plant|fishing}-{left|right}`
  - Right sprite: frames play in natural order (col 0→3)
  - Left sprite: frames play reversed (col 3→0) — horizontally flipped source image
- `playAction(action)` — one-shot farming anim; blocks walk during action
- `stopFishing()` — releases fishing hold pose, returns to idle

### XP System (`common/systems/XPSystem.ts`)
- Levels 1–20, quadratic scaling: `xpForStep(l) = floor(100 × l^1.4)`
- XP is stored in `ItemDef.xp` for crops and fish (not a separate table)
  - Crops: wheat=8, carrot=12, tomato=20
  - Fish: carp=15, bass=25, catfish=28, rare=60
  - Dungeon loot: 30 XP per item (`XP_GRANTS.DUNGEON_LOOT`)
- `onXPChange` callback → `UIScene.setXP()` refreshes HUD bar
- `onLevelUp` callback → `UIScene.notify()` shows level-up toast
- Persisted in save: `xp` + `level` fields (backward-compat `?? 0 / ?? 1`)

### Farming (`village/systems/FarmingSystem.ts`)
- Tool: `hoe` → till / harvest
- Tool: `wateringCan` → auto-plant from inventory if tilled with no seed; otherwise water
- Crops: wheat, carrot, tomato (3 growth stages, requires daily watering)
- XP granted on harvest only (till/plant/water grant none)

### Fishing (`village/systems/FishingSystem.ts`)
- `cast()` → wait → fish bites (random delay) → `reel()` within window or miss
- Player animation freezes on last fishing frame until `onCatch` or `onMiss` fires
- Fish names resolved to `ItemId` via `FISH_NAME_MAP` for XP + inventory lookup

### Day/Night (`village/systems/DayNightSystem.ts`)
- In-game time: 1 real second = 1 game minute; day = 1440 minutes
- `TimeOfDay`: dawn / morning / noon / afternoon / dusk / night
- Tint overlay driven by `DayNightSystem.onTimeChange` → `overlay.setFillStyle(tint, alpha)`
- `onNewDay` → reset crop watering + NPC daily flags + `notify`

### Save System (`common/systems/SaveSystem.ts`)
- `SaveData` includes: version, day, minute, playerX/Y, toolIndex, gold, xp, level, slots, farmTiles, npcFriendship, completedQuests
- Electron: uses `window.electronAPI.save/load`; falls back to `localStorage`
- `SaveSystem.apply(data, runtime)` silently restores all state (no callbacks fired)

### Inventory (`common/systems/InventorySystem.ts`)
- 8-slot hotbar, stackable items up to `ItemDef.maxStack`
- `addFish(name)` resolves fish display name → ItemId via `FISH_NAME_MAP`
- `gold` tracked separately; `adjustGold(delta)` for purchases

### Dungeon (`dungeon/` — temporarily closed)
- `DungeonEntrance.isNearPlayer()` currently shows "🚧 tạm đóng cửa" notification
- Original entry code is commented out in `InteractionHandler.ts` with `// TODO: re-enable when DungeonScene is ready`
- `DungeonScene`: uses its own local `Player`, camera zoom=2, zone grid
- `TreasurePanel`: each game object has `.setScrollFactor(0)` individually (Container does not propagate scroll factor in Phaser 3)

---

## UIScene HUD Layout

| Element | Position | Updates via |
|---|---|---|
| Tool indicator | top-left | `setTool(name)` |
| Clock | top-center | `setClock(state)` |
| Day label | top-center below clock | `setClock(state)` |
| Gold | top-right | `setGold(amount)` |
| Level badge `⭐ Lv. N` | top-right below gold | `setXP(...)` |
| XP bar (88px) | top-right | `setXP(...)` |
| XP hint text | top-right | `setXP(...)` |
| Fishing prompt | center-screen | `setFishingPrompt(msg)` |
| Notification toast | center-screen | `notify(msg, color?)` |
| Hotbar (8 slots) | bottom-center | `refreshHotbar(inventory)` |

**Panels** (toggle over HUD): `PauseMenuPanel`, `InventoryPanel`, `ShopPanel`, `ConfirmDialog`

---

## Items Registry (`common/data/items.ts`)

`ItemDef` fields: `id, name, emoji, maxStack, category, rarity, sellPrice, tier?, xp?, description?`

| Category | Examples |
|---|---|
| `food` | crop_wheat (8xp), crop_carrot (12xp), crop_tomato (20xp) |
| `fish` | fish_carp (15xp), fish_bass (25xp), fish_catfish (28xp), fish_rare (60xp) |
| `seed` | seed_wheat, seed_carrot, seed_tomato |
| `tool` | tool_hoe, tool_wateringCan, tool_fishingRod (tiers 1–6) |
| `weapon` | weapon_sword_wood → weapon_sword_legendary (tiers 1–5, dungeon) |

---

## Asset Files (`public/assets/`)

| File | Used for |
|---|---|
| `sprite_128x128.png` | Player walk/idle (4×4 frames, 32×32px) |
| `right_sprite_farming.png` | Farming/fishing animations facing right (4×4 frames) |
| `left_sprite_farming.png` | Same as right, horizontally flipped; frames played in reverse |
| `player.png` | NPC spritesheet |
| `maps/map.json` | Village Tiled map |
| `maps/world.json` | Tiled world file linking multiple maps |
| `maps/dun.json` | Dungeon Tiled map (16px tiles, displayed at ×2 scale) |
| `tilesets/` | Tileset PNG files |


- render a simple title screen
- show control hints
- start gameplay when the player clicks `[ Bắt đầu ]`

Current UX is intentionally minimal and functional.

### Game Scene

Defined in [src/scenes/GameScene.ts](/home/khanhduy/local/2d/my-phaser-game/src/scenes/GameScene.ts).

This scene is now a thin Phaser entry point. It delegates gameplay setup and update flow to `GameSession`.

`GameSession` is responsible for:

- creating the gameplay runtime via `createGameRuntime()`
- launching and binding `UIScene`
- wiring hotkeys and tool cycling
- routing world and NPC interactions
- updating player, farming, day/night, and fishing UI state

Current tool cycle:

- `none`
- `hoe`
- `wateringCan`
- `fishingRod`

Interaction behavior:

- `hoe` on a `farm` tile tills land
- `wateringCan` on a `farm` tile first tries to plant, then tries to harvest if the crop is mature
- `fishingRod` on a `water` tile starts fishing, reels when a fish bites, or cancels an active cast

### UI Scene

Defined in [src/scenes/UIScene.ts](/home/khanhduy/local/2d/my-phaser-game/src/scenes/UIScene.ts).

Responsibilities:

- display the current tool
- display fishing status text
- show timed notification banners for events such as catch, miss, till, plant, and harvest

This scene is a clean separation from gameplay logic and is currently used as a lightweight HUD layer.

## Core Gameplay Objects and Systems

### Player

Defined in [src/objects/Player.ts](/home/khanhduy/local/2d/my-phaser-game/src/objects/Player.ts).

Implementation notes:

- implemented as a `Phaser.GameObjects.Container`
- uses Arcade Physics for movement and collision
- movement keys are `W`, `A`, `S`, `D`
- interaction key is `E`
- tracks facing direction to determine the tile in front of the player
- normalizes diagonal movement speed

Current rendering state:

- the player now uses the `player.png` spritesheet loaded in preload
- directional walk and idle animations are created at runtime
- collision still uses a smaller arcade hitbox for smoother movement around props and NPCs

### Tilemap Loader

Defined in [src/systems/TilemapLoader.ts](/home/khanhduy/local/2d/my-phaser-game/src/systems/TilemapLoader.ts).

This system is central to the application because it does both map rendering and interaction zoning.

Responsibilities:

- load the world tilemap JSON and tileset image
- create `Ground`, `Decoration`, and `Collision` layers from Tiled data
- configure collision from the `Collision` layer
- build a `zoneGrid` from the Tiled `Zone` object layer
- expose helper APIs such as `getZone()` and `addCollider()`
- fall back to a procedurally drawn map if Tiled assets are missing or invalid

Zone types currently supported:

- `grass`
- `farm`
- `water`
- `path`
- `none`

Fallback behavior is important here: if the Tiled map or tileset cannot be loaded, the game still runs using generated colored rectangles, which keeps development unblocked.

### Farming System

Defined in [src/systems/FarmingSystem.ts](/home/khanhduy/local/2d/my-phaser-game/src/systems/FarmingSystem.ts).

This system stores farm state in memory using a `Map<string, FarmTile>` keyed by tile coordinates.

Supported actions:

- till a tile
- plant on a tilled tile
- advance crop growth over time
- harvest fully grown crops

Current implementation details:

- growth is stage-based
- each stage advances every `5000ms`
- max growth stage is `3`
- crops are rendered using simple graphics overlays instead of sprites

Important behavior detail:

- the watering can currently acts as both the planting action and the harvest trigger
- actual watering as a separate mechanic is not implemented yet

### Fishing System

Defined in [src/systems/FishingSystem.ts](/home/khanhduy/local/2d/my-phaser-game/src/systems/FishingSystem.ts).

This system manages a small state machine for fishing.

States represented in data:

- inactive
- casting
- waiting for bite
- biting

Flow:

1. player casts near water
2. cast delay runs for `1500ms`
3. a random wait begins before a fish bites
4. if the player reels in during the bite window, a random fish is caught
5. if the window expires, the fish is missed and the state resets

Current tuning constants:

- cast time: `1500ms`
- bite window: `2000ms`
- fish list: `Cá chép`, `Cá rô`, `Cá lóc`, `Cá trê`, `Cá vàng hiếm`

The `catchProgress` field exists in the model but is not currently used by gameplay.

## Shared Constants and Types

Constants are defined in [src/constants/index.ts](/home/khanhduy/local/2d/my-phaser-game/src/constants/index.ts).

Key values:

- tile size: `32`
- world size fallback: `40 x 30` tiles
- player speed: `160`
- farming and fishing timing values
- scene keys, texture keys, and map keys

Shared types are defined in [src/type/index.ts](/home/khanhduy/local/2d/my-phaser-game/src/type/index.ts).

Important domain types:

- `Direction`
- `TilePosition`
- `FarmTile`
- `FishingState`
- `PlayerData`

## World and Asset Context

### Map Data

The main world map is stored at [public/assets/maps/world.json](/home/khanhduy/local/2d/my-phaser-game/public/assets/maps/world.json).

Observed map characteristics:

- map size is `40 x 30` tiles
- the tilemap contains `Ground`, `Decoration`, and `Collision` tile layers
- the tilemap contains a `Zone` object layer used for interaction semantics

The Tiled workflow and asset expectations are documented in [TILEMAP.md](/home/khanhduy/local/2d/my-phaser-game/TILEMAP.md).

### Required/Expected Assets

Expected runtime assets include:

- `public/assets/maps/world.json`
- `public/assets/tilesets/farm_tiles.png`
- `public/assets/player.png`

Current resilience:

- missing or invalid tilemap setup falls back gracefully to procedural rendering
- missing player art is less resilient because `PreloadScene` still attempts to load the spritesheet directly

## Input Model

Current controls:

- move: `W`, `A`, `S`, `D`
- interact/use tool: `E`
- switch tool: `Tab`

The interaction model is tile-adjacent rather than collision-contact based. The player interacts with the tile directly in front of the current facing direction.

## Current Architecture Quality

The project already has a reasonable separation of concerns:

- scenes manage presentation and high-level orchestration
- systems manage domain mechanics such as farming, fishing, and map loading
- constants and types are centralized
- the UI overlay is isolated from the gameplay scene

Recent improvement:

- scene bootstrapping, gameplay composition, and UI wiring are now split into dedicated modules under `src/game`
- this creates a clearer seam for adding more systems such as quests, saves, stamina, combat, or economy without turning `GameScene` into a god object

This structure is now better positioned for feature growth than the earlier single-scene orchestration model.

## Current Gaps and Constraints

The application is functional as a prototype, but several parts are still placeholder-level.

Notable gaps:

- player sprite loading exists, but the player still renders as a rectangle
- no inventory, economy, stamina, or progression systems yet
- no save/load support
- no NPCs, quests, or dialogue systems
- no separate seed item or true watering mechanic
- fishing has no timing mini-game beyond the bite window
- `src/style.css` appears to be leftover Vite starter styling and is not part of the actual game boot flow

There is also a small design mismatch in the preload path:

- `PreloadScene` loads a player spritesheet as if art is ready
- `Player` still uses placeholder graphics and does not consume that asset yet

## Practical Extension Points

If this project is extended, the most natural next implementation areas are:

1. replace the placeholder player with a real sprite + animation state machine
2. split farming actions into till, seed, water, grow, and harvest phases
3. add an inventory and item/tool model
4. persist farm state and player position
5. expand the world with more zones and scene transitions
6. add sound, feedback, and progression loops

## Development Commands

Defined in [package.json](/home/khanhduy/local/2d/my-phaser-game/package.json).

- `npm run dev`: start the Vite development server
- `npm run build`: run TypeScript compile then Vite production build
- `npm run preview`: preview the production build locally

## Summary

This codebase is a Phaser-based farming game prototype with a clean foundational structure.

Its current strengths are:

- clear scene separation
- simple but workable farming/fishing systems
- tilemap-backed world semantics
- graceful fallback behavior for map rendering

Its current maturity level is best described as:

- a playable prototype with good architectural direction
- ready for feature expansion rather than rewrite