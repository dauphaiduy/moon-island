# 🌙 Moon Island

A cozy 2D life-sim / farming & fishing game built with **Phaser 3**, **TypeScript**, and **Electron**.

![Game preview](public/assets/preview.png)

---

## 🎮 Gameplay

Explore a small island village, tend your farm, cast your fishing rod, chat with the locals, and gear up to venture into the dungeon.

### Core loops

| Activity | How to start |
|---|---|
| 🌱 Farming | Walk onto a farm tile, equip a hoe/watering can/seeds and press `E` |
| 🎣 Fishing | Stand on a water tile, equip a fishing rod and press `E` |
| 🛒 Shopping | Approach **Chú Hải** (seeds) or the **Tool Shop** (fishing rods) and press `E` |
| ⚔️ Dungeon | Approach the **Dungeon Entrance** and press `E`, then confirm |
| 💬 Talking | Walk up to a villager and press `E` |

---

## 🕹️ Controls

| Key | Action |
|---|---|
| `W A S D` / Arrow Keys | Move |
| `E` | Interact (talk / use tool / open shop) |
| `Tab` | Cycle active tool |
| `1–8` | Select hotbar slot |
| `I` | Open / close inventory |
| `Q` | Sell all sellable items |
| `ESC` | Pause menu |

---

## 👥 Villagers

| Character | Role |
|---|---|
| 👵 **Bà Lan** | Elder — roams the village, gives quests |
| 🧑‍🌾 **Chú Hải** | Merchant — sells seeds (wheat, carrot, tomato) |
| 🧒 **Em Minh** | Wandering villager |

Build friendship by chatting daily — higher friendship unlocks new dialog and hints.

---

## 🛠️ Dev Setup

**Prerequisites:** Node.js ≥ 18

```bash
npm install
npm run dev          # browser dev server (Vite)
npm run electron:preview   # run as Electron desktop app
```

### Build for distribution

```bash
npm run electron:build          # Linux AppImage / deb
npm run electron:build:win      # Windows installer
npm run electron:build:all      # both platforms
```

Output lands in `dist/`.

---

## 🗂️ Project Structure

```
src/
  scenes/          # Phaser scenes (Preload, Menu, Game, UI, Dungeon)
  game/            # GameSession orchestrator + subsystems wiring
  systems/         # Farming, Fishing, Inventory, DayNight, Dialog, Save
  objects/         # Player, NPC, ShopBuilding, DungeonEntrance
  ui/              # Panel components (PauseMenu, Inventory, Shop, ConfirmDialog)
  data/            # NPC definitions, item catalog
  types/           # Shared TypeScript interfaces
  constants/       # SceneKey, tile constants
public/
  assets/
    maps/          # Tiled JSON map files
    tilesets/      # Tileset images
```

---

## 💾 Save System

Progress is saved automatically at the start of each new day and can also be saved/loaded from the pause menu (`ESC`). Save data is stored locally via **electron-store**.

---

## 🔧 Tech Stack

| | |
|---|---|
| Engine | Phaser 3.90 |
| Language | TypeScript 5.9 |
| Bundler | Vite 8 |
| Desktop | Electron 41 |
| Physics | Phaser Arcade Physics |
