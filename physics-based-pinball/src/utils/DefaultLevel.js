export const DefaultLevel = {
  name: '默认关卡',
  version: '1.0',
  createdAt: new Date().toISOString(),
  bumpers: [
    { x: 300, y: 300, radius: 30, points: 100 },
    { x: 500, y: 300, radius: 30, points: 100 },
    { x: 400, y: 200, radius: 30, points: 100 },
    { x: 250, y: 450, radius: 30, points: 100 },
    { x: 550, y: 450, radius: 30, points: 100 },
    { x: 400, y: 350, radius: 30, points: 100 }
  ],
  walls: [
    { x: 200, y: 550, width: 150, height: 15, angle: 0.4 },
    { x: 600, y: 550, width: 150, height: 15, angle: -0.4 },
    { x: 400, y: 150, width: 200, height: 15, angle: 0 }
  ],
  flippers: [
    { x: 300, y: 900, side: 'left', length: 120 },
    { x: 500, y: 900, side: 'right', length: 120 }
  ],
  goals: [
    { x: 400, y: 100, radius: 25, points: 500 }
  ]
};
