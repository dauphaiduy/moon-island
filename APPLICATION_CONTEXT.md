# Application Context

## Overview

This project is a small 2D farming and fishing game built with Phaser 3 and TypeScript, bundled with Vite.

## Architecture Update

The codebase has been restructured so future features can be added without continuing to grow a single orchestration scene.

Current scaling direction:

- Phaser boot configuration now lives in `src/game/createGameConfig.ts`
- main gameplay composition lives in `src/game/GameSession.ts`
- runtime construction lives in `src/game/createGameRuntime.ts`
- UI binding logic lives in `src/game/bindRuntimeToUI.ts`
- tool metadata lives in `src/game/gameTools.ts`

This keeps `GameScene` focused on scene lifecycle only, while gameplay wiring is handled in dedicated modules.

The current gameplay loop is centered on:

- moving a player around a tilemap world
- switching tools with `Tab`
- interacting with nearby tiles using `E`
- farming on `farm` zones
- fishing on `water` zones

The application is already structured into scenes, gameplay systems, and reusable constants/types, which makes it a good base for extending into a fuller life-sim or top-down adventure game.

## Runtime Stack

- Engine: Phaser `3.90.0`
- Language: TypeScript `~5.9.3`
- Bundler/dev server: Vite `^8.0.1`
- Physics: Phaser Arcade Physics
- Rendering style: pixel-art friendly with `pixelArt: true` and `roundPixels: true`

The game is started from [src/main.ts](/home/khanhduy/local/2d/my-phaser-game/src/main.ts) and mounted by [index.html](/home/khanhduy/local/2d/my-phaser-game/index.html).

## High-Level Flow

The application boot sequence is:

1. Vite loads [index.html](/home/khanhduy/local/2d/my-phaser-game/index.html).
2. The browser imports [src/main.ts](/home/khanhduy/local/2d/my-phaser-game/src/main.ts).
3. Phaser is initialized with four scenes in this order:
   - `PreloadScene`
   - `MenuScene`
   - `GameScene`
   - `UIScene`
4. `PreloadScene` loads the tilemap, tileset image, and player spritesheet.
5. `MenuScene` shows the title screen and starts the game on click.
6. `GameScene` creates a `GameSession`, which builds the runtime, attaches input, and launches the UI overlay scene.
7. `UIScene` renders persistent HUD and notifications on top of gameplay.

## Scene Responsibilities

### Preload Scene

Defined in [src/scenes/PreloadScene.ts](/home/khanhduy/local/2d/my-phaser-game/src/scenes/PreloadScene.ts).

Responsibilities:

- preload map data through `TilemapLoader.preload(this)`
- load `assets/player.png` as a spritesheet
- display a simple loading bar
- transition to the menu scene when loading completes

Important note:

- The code expects `public/assets/player.png` to exist.
- The current `Player` implementation consumes the spritesheet directly for idle and walk animations.

### Menu Scene

Defined in [src/scenes/MenuScene.ts](/home/khanhduy/local/2d/my-phaser-game/src/scenes/MenuScene.ts).

Responsibilities:

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