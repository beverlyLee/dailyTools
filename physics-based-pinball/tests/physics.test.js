import Matter from 'matter-js';
import { PHYSICS_CONFIG } from '../src/config.js';

describe('物理参数配置测试', () => {
  
  test('球体物理参数配置正确', () => {
    expect(PHYSICS_CONFIG.ball.radius).toBe(12);
    expect(PHYSICS_CONFIG.ball.density).toBe(0.001);
    expect(PHYSICS_CONFIG.ball.friction).toBe(0.01);
    expect(PHYSICS_CONFIG.ball.frictionAir).toBe(0.001);
    expect(PHYSICS_CONFIG.ball.restitution).toBe(0.8);
  });

  test('缓冲器物理参数配置正确', () => {
    expect(PHYSICS_CONFIG.bumper.radius).toBe(30);
    expect(PHYSICS_CONFIG.bumper.restitution).toBe(1.2);
    expect(PHYSICS_CONFIG.bumper.points).toBe(100);
  });

  test('墙壁物理参数配置正确', () => {
    expect(PHYSICS_CONFIG.wall.thickness).toBe(20);
    expect(PHYSICS_CONFIG.wall.restitution).toBe(0.3);
    expect(PHYSICS_CONFIG.wall.friction).toBe(0.5);
  });

  test('弹板物理参数配置正确', () => {
    expect(PHYSICS_CONFIG.flipper.length).toBe(120);
    expect(PHYSICS_CONFIG.flipper.thickness).toBe(20);
    expect(PHYSICS_CONFIG.flipper.restitution).toBe(0.9);
  });

  test('目标物理参数配置正确', () => {
    expect(PHYSICS_CONFIG.goal.radius).toBe(25);
    expect(PHYSICS_CONFIG.goal.points).toBe(500);
  });
});

describe('Matter.js 物理引擎基本测试', () => {
  let Engine, World, Bodies, Body;

  beforeAll(() => {
    Engine = Matter.Engine;
    World = Matter.World;
    Bodies = Matter.Bodies;
    Body = Matter.Body;
  });

  test('创建球体刚体正确', () => {
    const engine = Engine.create();
    const world = engine.world;

    const ball = Bodies.circle(400, 300, PHYSICS_CONFIG.ball.radius, {
      density: PHYSICS_CONFIG.ball.density,
      friction: PHYSICS_CONFIG.ball.friction,
      frictionAir: PHYSICS_CONFIG.ball.frictionAir,
      restitution: PHYSICS_CONFIG.ball.restitution,
      label: 'ball'
    });

    World.add(world, ball);

    expect(ball.position.x).toBe(400);
    expect(ball.position.y).toBe(300);
    expect(ball.circleRadius).toBe(PHYSICS_CONFIG.ball.radius);
    expect(ball.density).toBe(PHYSICS_CONFIG.ball.density);
    expect(ball.friction).toBe(PHYSICS_CONFIG.ball.friction);
    expect(ball.frictionAir).toBe(PHYSICS_CONFIG.ball.frictionAir);
    expect(ball.restitution).toBe(PHYSICS_CONFIG.ball.restitution);
    expect(ball.label).toBe('ball');
  });

  test('创建静态缓冲器正确', () => {
    const engine = Engine.create();
    const world = engine.world;

    const bumper = Bodies.circle(300, 200, PHYSICS_CONFIG.bumper.radius, {
      isStatic: true,
      restitution: PHYSICS_CONFIG.bumper.restitution,
      label: 'bumper'
    });

    World.add(world, bumper);

    expect(bumper.isStatic).toBe(true);
    expect(bumper.restitution).toBe(PHYSICS_CONFIG.bumper.restitution);
    expect(bumper.label).toBe('bumper');
  });

  test('重力作用测试', () => {
    const engine = Engine.create({
      gravity: { x: 0, y: 1.5 }
    });
    const world = engine.world;

    const ball = Bodies.circle(400, 100, PHYSICS_CONFIG.ball.radius, {
      isStatic: false
    });

    World.add(world, ball);

    const initialY = ball.position.y;

    Engine.update(engine, 1000 / 60);

    expect(ball.position.y).toBeGreaterThan(initialY);
    expect(ball.velocity.y).toBeGreaterThan(0);
  });

  test('弹性碰撞测试', () => {
    const engine = Engine.create({
      gravity: { x: 0, y: 0 }
    });
    const world = engine.world;

    const ball = Bodies.circle(200, 300, PHYSICS_CONFIG.ball.radius, {
      restitution: PHYSICS_CONFIG.ball.restitution,
      velocity: { x: 5, y: 0 }
    });

    const staticWall = Bodies.rectangle(500, 300, 50, 400, {
      isStatic: true,
      restitution: 0.8
    });

    World.add(world, [ball, staticWall]);

    const initialVelocityX = ball.velocity.x;

    for (let i = 0; i < 100; i++) {
      Engine.update(engine, 1000 / 60);
    }

    expect(ball.velocity.x).toBeLessThan(0);
    expect(Math.abs(ball.velocity.x)).toBeCloseTo(initialVelocityX * 0.64, 0);
  });

  test('摩擦力测试', () => {
    const engine = Engine.create({
      gravity: { x: 0, y: 0 }
    });
    const world = engine.world;

    const ball = Bodies.circle(400, 300, PHYSICS_CONFIG.ball.radius, {
      friction: 0.1,
      frictionAir: 0.01,
      velocity: { x: 10, y: 0 }
    });

    World.add(world, ball);

    const initialVelocity = ball.velocity.x;

    for (let i = 0; i < 100; i++) {
      Engine.update(engine, 1000 / 60);
    }

    expect(Math.abs(ball.velocity.x)).toBeLessThan(initialVelocity);
  });

  test('刚体质量计算', () => {
    const ball = Bodies.circle(400, 300, PHYSICS_CONFIG.ball.radius, {
      density: PHYSICS_CONFIG.ball.density
    });

    const area = Math.PI * PHYSICS_CONFIG.ball.radius * PHYSICS_CONFIG.ball.radius;
    const expectedMass = area * PHYSICS_CONFIG.ball.density;

    expect(ball.mass).toBeCloseTo(expectedMass, 3);
  });

  test('约束创建测试', () => {
    const engine = Engine.create();
    const world = engine.world;

    const bodyA = Bodies.circle(300, 300, 20, { isStatic: true });
    const bodyB = Bodies.circle(400, 300, 20, { isStatic: false });

    const constraint = Matter.Constraint.create({
      bodyA: bodyA,
      bodyB: bodyB,
      length: 100,
      stiffness: 0.8
    });

    World.add(world, [bodyA, bodyB, constraint]);

    expect(constraint.bodyA).toBe(bodyA);
    expect(constraint.bodyB).toBe(bodyB);
    expect(constraint.length).toBe(100);
    expect(constraint.stiffness).toBe(0.8);
  });

  test('传感器碰撞检测', () => {
    const engine = Engine.create({
      gravity: { x: 0, y: 0 }
    });
    const world = engine.world;

    let collisionDetected = false;

    const ball = Bodies.circle(100, 300, PHYSICS_CONFIG.ball.radius, {
      label: 'ball',
      velocity: { x: 5, y: 0 }
    });

    const sensor = Bodies.circle(400, 300, PHYSICS_CONFIG.goal.radius, {
      isSensor: true,
      isStatic: true,
      label: 'goal'
    });

    World.add(world, [ball, sensor]);

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('ball') && labels.includes('goal')) {
          collisionDetected = true;
        }
      });
    });

    for (let i = 0; i < 100; i++) {
      Engine.update(engine, 1000 / 60);
    }

    expect(collisionDetected).toBe(true);
    expect(ball.velocity.x).toBeGreaterThan(0);
  });
});

describe('物理参数单位一致性测试', () => {
  
  test('所有距离参数应为正数', () => {
    expect(PHYSICS_CONFIG.ball.radius).toBeGreaterThan(0);
    expect(PHYSICS_CONFIG.bumper.radius).toBeGreaterThan(0);
    expect(PHYSICS_CONFIG.wall.thickness).toBeGreaterThan(0);
    expect(PHYSICS_CONFIG.flipper.length).toBeGreaterThan(0);
    expect(PHYSICS_CONFIG.flipper.thickness).toBeGreaterThan(0);
    expect(PHYSICS_CONFIG.goal.radius).toBeGreaterThan(0);
  });

  test('弹性系数范围合理', () => {
    expect(PHYSICS_CONFIG.ball.restitution).toBeGreaterThanOrEqual(0);
    expect(PHYSICS_CONFIG.ball.restitution).toBeLessThanOrEqual(2);
    expect(PHYSICS_CONFIG.bumper.restitution).toBeGreaterThanOrEqual(1);
    expect(PHYSICS_CONFIG.wall.restitution).toBeGreaterThanOrEqual(0);
    expect(PHYSICS_CONFIG.wall.restitution).toBeLessThanOrEqual(1);
  });

  test('摩擦力系数范围合理', () => {
    expect(PHYSICS_CONFIG.ball.friction).toBeGreaterThanOrEqual(0);
    expect(PHYSICS_CONFIG.ball.friction).toBeLessThanOrEqual(1);
    expect(PHYSICS_CONFIG.ball.frictionAir).toBeGreaterThanOrEqual(0);
    expect(PHYSICS_CONFIG.wall.friction).toBeGreaterThanOrEqual(0);
    expect(PHYSICS_CONFIG.wall.friction).toBeLessThanOrEqual(1);
  });

  test('密度系数范围合理', () => {
    expect(PHYSICS_CONFIG.ball.density).toBeGreaterThan(0);
    expect(PHYSICS_CONFIG.ball.density).toBeLessThan(1);
  });

  test('分数值应为正整数', () => {
    expect(PHYSICS_CONFIG.bumper.points).toBeGreaterThan(0);
    expect(PHYSICS_CONFIG.goal.points).toBeGreaterThan(0);
    expect(Number.isInteger(PHYSICS_CONFIG.bumper.points)).toBe(true);
    expect(Number.isInteger(PHYSICS_CONFIG.goal.points)).toBe(true);
  });
});
