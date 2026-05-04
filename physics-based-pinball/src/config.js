import Phaser from 'phaser';

export const GAME_CONFIG = {
  type: Phaser.CANVAS,
  width: 800,
  height: 1000,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  physics: {
    default: 'matter',
    matter: {
      enableSleeping: true,
      gravity: {
        y: 2.5
      },
      debug: false,
      plugins: {
        attractors: true
      }
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

export const PHYSICS_CONFIG = {
  ball: {
    radius: 12,
    density: 0.001,
    friction: 0.01,
    frictionAir: 0.001,
    restitution: 0.8
  },
  bumper: {
    radius: 30,
    restitution: 1.2,
    points: 100
  },
  wall: {
    thickness: 20,
    restitution: 0.3,
    friction: 0.5
  },
  flipper: {
    length: 120,
    thickness: 20,
    restitution: 0.9,
    pivotOffset: 40,
    angleMin: -0.5,
    angleMax: 0.5
  },
  goal: {
    radius: 25,
    points: 500
  },
  launcher: {
    power: 0.015,
    maxPower: 0.025
  }
};

export const GAME_STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  EDITOR: 'editor',
  GAME_OVER: 'game_over'
};
