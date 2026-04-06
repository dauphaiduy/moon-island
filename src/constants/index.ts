export const TILE_SIZE = 32;

export const MAP_WIDTH = 29;   // tiles
export const MAP_HEIGHT = 16;  // tiles

export const PLAYER_SPEED = 170;

export const FARMING = {
  GROWTH_TIME_MS: 5000,   // ms per growth stage
  MAX_STAGES: 3,
} as const;

export const FISHING = {
  CAST_TIME_MS: 1500,
  BITE_WINDOW_MS: 2000,
  CATCH_SPEED: 0.02,
} as const;

export const SceneKey = {
  Preload: 'PreloadScene',
  Menu:    'MenuScene',
  Game:    'GameScene',
  UI:      'UIScene',
  Dungeon: 'DungeonScene',
} as const;
type SceneKey = typeof SceneKey[keyof typeof SceneKey];

export const TextureKey = {
  Tiles:              'tiles',
  Player:             'player',
  PlayerFarmingRight: 'player-farming-right',
  PlayerFarmingLeft:  'player-farming-left',
  NPC:                'npc',
  DungeonTiles:       'dungeon-tiles',
} as const;

export const MapKey = {
  World:   'world',
  Dungeon: 'dungeon',
} as const;
