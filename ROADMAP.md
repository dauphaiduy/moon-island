# My Valley — Stardew Valley Upgrade Roadmap

> Snapshot: April 2026

## Current State

| System | Status | Notes |
|--------|--------|-------|
| Farming (till/water/plant/harvest) | ✅ Done | 3 crop types |
| Fishing (cast/wait/reel) | ⚠️ Partial | No mini-game, `catchProgress` unused |
| Inventory (slots, hotbar, gold) | ✅ Done | No persistence |
| Day/Night cycle | ✅ Done | 24h, tint, callbacks |
| NPCs (wander, friendship, dialog, shop, quest) | ✅ Done | 3 NPCs |
| Boat | ⚠️ Visual only | No transport yet |
| Save / Load | ❌ Missing | |
| Second map | ❌ Missing | |
| Energy / Stamina | ❌ Missing | |
| Crafting | ❌ Missing | |
| Weather | ❌ Missing | |
| Seasonal crops | ❌ Missing | |

---

## Phase 1 — Core Feel & Polish

### 1.1 Hotbar active slot indicator
- UIScene hotbar doesn't show which slot is selected
- Highlight the active slot with a colored border/glow to match tool cycling

### 1.2 Stamina / Energy system
- Stardew: every action costs energy; rest restores it
- New `EnergySystem` — max 270 (like Stardew)
- Till / water / fish each cost energy; reaching 0 causes player to collapse (sleeps early)
- HUD bar displayed in UIScene
- Fully restored on sleep (new day)

### 1.3 Player sleep / end-of-day
- Walk to bed or press a key → "Ngủ đến ngày mai?" confirm prompt
- Skip to next day, restore full energy
- Triggers `dayNight.onNewDay` chain

### 1.4 Tool upgrade tiers
- Stardew: Copper → Steel → Gold → Iridium tools
- Add `level: 1 | 2 | 3 | 4` to each tool
- Higher level = larger AOE (hoe tills 1×1 → 3×3) or faster fishing bite window
- Upgrade via a new Blacksmith NPC or crafting

---

## Phase 2 — Farming Depth

### 2.1 Seasonal crops
- Crops only grow in their correct season (Spring / Summer / Fall / Winter)
- Add `season` to `DayNightSystem`; `CropDef` gets `seasons: Season[]`
- Crops die if left in the ground past their season
- HUD shows current season name

### 2.2 More crop types
- Add at least 3 more: Corn, Pumpkin, Blueberry (multi-harvest), Strawberry (re-grows)
- Register in `ITEMS`, `CropType`, and a new `data/crops.ts`

### 2.3 Fertilizer
- New consumable item applied to tilled soil before planting
- Reduces growth time by 50%
- Distinct soil tint when fertilized

### 2.4 Crop quality tiers
- Normal / Silver / Gold quality — affects sell price
- Random quality roll on harvest based on farming skill level
- Add `quality?: 'normal' | 'silver' | 'gold'` to `FarmTile`

### 2.5 Shipping bin / Sell box
- Stardew: items placed in the bin sell overnight (not instant)
- Add a `ShippingBin` object on the farm zone
- Interact with E to place hotbar crops into bin
- On `onNewDay`: bin contents convert to gold + summary notification

---

## Phase 3 — Fishing Depth

### 3.1 Fishing mini-game
- Stardew: bouncing bar that must stay over the fish indicator
- Simple version: a progress bar the player holds / taps E to keep over a moving fish target
- Replace the `catchProgress` stub field with real mechanic

### 3.2 Fish catalog
- Track which fish species have been caught: `FishingSystem.caught: Set<string>`
- Show a caught fish log in a new dialog panel or UIScene tab

### 3.3 Fish rarity + time/weather bonuses
- Rare fish (Cá vàng hiếm) only appear at night or during rain
- Each fish has a `rarity` weight; time-of-day and weather apply multipliers

### 3.4 Fishing rod cast direction
- Cast in the direction the player is facing
- Only valid if the facing tile is `water` zone

---

## Phase 4 — World Expansion (Boat)

### 4.1 Second map — Sea / Island
- New `map2.json` tilemap loaded in a second Phaser scene (`SeaScene`)
- Boat interaction → confirm prompt → screen fade → transition to sea map

### 4.2 Map transition system
- Generic `MapTransitionSystem`: source tile + target scene + landing tile
- Reusable for Boat → Sea, cave entrances, town gates, etc.
- Screen fade in/out during every transition

### 4.3 Sea map content
- Deeper / rarer fish exclusive to the sea
- 1–2 new NPCs only accessible via boat
- Return dock tile to travel back to the farm

---

## Phase 5 — NPC & Social Depth

### 5.1 Gift system
- Press G near an NPC to give them a held item
- Each `NpcDef` gets `lovesGifts`, `likesGifts`, `hatesGifts` arrays
- Loved gift → +10 friendship; liked → +5; hated → −5
- One gift per NPC per day

### 5.2 NPC schedules
- NPCs visit different map tiles at different hours
- Extend `onTimeChange` to move NPC to schedule-defined position
- Add `schedule: { hour: number; tileX: number; tileY: number }[]` to `NpcDef`

### 5.3 More NPCs
- Add 2–3 new characters with backstories
- At least one NPC exclusive to the sea map (unlocked via boat)

### 5.4 Heart events
- Scripted cutscene at friendship 5 and 10 (first time only)
- Triggered in `DialogSystem` when friendship crosses the threshold
- Full-screen dialog sequence (visual novel style)

---

## Phase 6 — Crafting & Economy

### 6.1 Crafting system
- New `CraftingSystem` with input → output recipes
- Examples: Wood×5 + Stone×3 → Fence; Wheat×3 → Bread (+energy restore)
- Open crafting menu with C key

### 6.2 Resource gathering
- Axe tool: chop trees → Wood item
- Pickaxe tool: break rocks → Stone / Ore items
- Resources stored in inventory, consumed in crafting

### 6.3 Upgraded shop stock
- Enforce `ShopItem.stock` (currently infinite, never decremented)
- Restock shop at the start of each day
- New items in Chú Hải's shop unlock as friendship grows

---

## Phase 7 — Progression & Save

### 7.1 Save / Load system
- Serialize: `PlayerData`, inventory, farming tiles, friendship scores, completed quests, day, season
- Save to `localStorage` (browser) or Electron file (desktop)
- Auto-save on sleep; load state at `MenuScene` start

### 7.2 Farming skill leveling
- Gain XP from tilling, watering, harvesting
- Skill level 1–10; each level unlocks crop quality improvement, AOE tile upgrades, new recipes

### 7.3 Fishing skill leveling
- Gain XP per fish caught; rarer fish = more XP
- Higher skill = longer bite window, better mini-game bar size, access to rarer fish

### 7.4 Year 2+ content gate
- Some NPC friendship events locked until Year 2
- New crop types unlock at farming level 5+
- Rare fish only catchable at fishing level 7+

---

## Phase 8 — Atmosphere & Sound

### 8.1 Weather system
- Daily random weather: Sunny / Rainy / Stormy
- Rain: blue overlay tint, auto-waters all tilled crops, shifts fish rarity weights
- Weather decided at `onNewDay`, shown in the day-start notification

### 8.2 Ambient sound / music
- Background music tracks per time-of-day (morning, afternoon, night)
- Sound effects: hoe thud, water splash, fish reel click, footstep on grass vs path
- Use `Phaser.Sound` with looping audio

### 8.3 Screen transitions & juice
- Screen shake on large/rare fish catch
- Particle burst on harvest
- Screen fade when sleeping, entering boat, or changing maps

---

## Quick Wins

> These can be done any time — small scope, high impact.

| # | Task | File(s) | Est. |
|---|------|---------|------|
| QW1 | Active hotbar slot highlight | `UIScene.ts` | ~30 min |
| QW2 | Boat → confirm prompt (no transport yet) | `GameSession.ts` | ~30 min |
| QW3 | Enforce shop stock (decrement on purchase) | `DialogSystem.ts` | ~20 min |
| QW4 | Fishing rod must face water to cast | `GameSession.ts` | ~20 min |
| QW5 | Season display in HUD | `UIScene.ts` + `DayNightSystem.ts` | ~1 hr |
| QW6 | `NpcState` type wired to actual NPC state | `NPC.ts` | ~15 min |

---

## Suggested Build Order

```
Phase 1 (polish)
  → Phase 2 (farming depth)
    → Phase 7.1 (save/load — protect player progress first)
      → Phase 3 (fishing depth)
        → Phase 4 (boat + second map)
          → Phase 5 (social depth)
            → Phase 6 (crafting)
              → Phase 8 (atmosphere)
```
