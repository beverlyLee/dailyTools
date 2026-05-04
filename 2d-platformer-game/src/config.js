export const GAME_CONFIG = {
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  }
};

export const PLAYER_CONFIG = {
  speed: 200,
  jumpForce: -350,
  gravity: 300,
  friction: 10,
  airControl: 0.8,
  maxFallSpeed: 500,
  canDoubleJump: true,
  doubleJumpForce: -300
};

export const TILEMAP_CONFIG = {
  tileWidth: 32,
  tileHeight: 32,
  layers: {
    background: 'background',
    platforms: 'platforms',
    collectibles: 'collectibles',
    hazards: 'hazards'
  }
};

export const SAVE_CONFIG = {
  localStorageKey: 'platformer-game-save',
  currentVersion: 1
};
