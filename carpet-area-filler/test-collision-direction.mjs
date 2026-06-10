import { createRectanglePolygon, getPolygonArea, getPolygonBounds } from './src/utils/polygonClipping.js';
import { createFurnitureLegObstacle, checkCollision, adjustPositionForObstacles } from './src/utils/collisionDetector.js';

console.log('=== 碰撞避免算法方向正确性验证 ===\n');

function testSingleStep() {
  console.log('测试1: 单障碍物单步移动验证');
  
  const contour = createRectanglePolygon(0, 0, 4, 4);
  const leg = createFurnitureLegObstacle(0.5, 0, 0.3);
  
  const initX = 0;
  const initY = 0;
  
  const initCollision = checkCollision(
    createRectanglePolygon(initX, initY, 2, 2),
    [leg]
  );
  console.log(`  初始位置: (${initX}, ${initY})`);
  console.log(`  初始碰撞面积: ${initCollision.totalCollidingArea.toFixed(4)} m²`);
  
  const result = adjustPositionForObstacles(
    initX, initY,
    2, 2, false,
    contour, [leg]
  );
  
  const finalCollision = checkCollision(result.polygon, [leg]);
  console.log(`  调整后位置: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);
  console.log(`  调整后碰撞面积: ${finalCollision.totalCollidingArea.toFixed(4)} m²`);
  console.log(`  是否移动: ${result.adjusted}`);
  console.log(`  碰撞减少: ${((initCollision.totalCollidingArea - finalCollision.totalCollidingArea) / initCollision.totalCollidingArea * 100).toFixed(1)}%`);
  
  if (finalCollision.totalCollidingArea < initCollision.totalCollidingArea * 0.5) {
    console.log('  ✅ 碰撞显著减少，方向正确');
  } else {
    console.log('  ❌ 碰撞减少不明显');
  }
  
  const dx = result.x - initX;
  const dy = result.y - initY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const legX = leg.position.x;
  const legY = leg.position.y;
  
  const initialDistToLeg = Math.sqrt((initX - legX) ** 2 + (initY - legY) ** 2);
  const finalDistToLeg = Math.sqrt((result.x - legX) ** 2 + (result.y - legY) ** 2);
  
  console.log(`  到障碍物的初始距离: ${initialDistToLeg.toFixed(3)}`);
  console.log(`  到障碍物的最终距离: ${finalDistToLeg.toFixed(3)}`);
  
  if (finalDistToLeg > initialDistToLeg) {
    console.log('  ✅ 地毯远离障碍物移动，方向正确');
  } else {
    console.log('  ❌ 方向错误，靠近了障碍物');
  }
}

function testMultipleObstacles() {
  console.log('\n测试2: 多障碍物综合避障');
  
  const contour = createRectanglePolygon(0, 0, 6, 4);
  
  const legs = [
    createFurnitureLegObstacle(-1, -0.5, 0.25),
    createFurnitureLegObstacle(1, -0.5, 0.25),
    createFurnitureLegObstacle(-1, 0.5, 0.25),
    createFurnitureLegObstacle(1, 0.5, 0.25),
  ];
  
  const initX = 0;
  const initY = 0;
  
  const initCollision = checkCollision(
    createRectanglePolygon(initX, initY, 3, 2),
    legs
  );
  console.log(`  初始碰撞面积: ${initCollision.totalCollidingArea.toFixed(4)} m²`);
  console.log(`  碰撞障碍物数量: ${initCollision.collisions.length}`);
  
  const result = adjustPositionForObstacles(
    initX, initY,
    3, 2, false,
    contour, legs
  );
  
  const finalCollision = checkCollision(result.polygon, legs);
  console.log(`  调整后位置: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);
  console.log(`  调整后碰撞面积: ${finalCollision.totalCollidingArea.toFixed(4)} m²`);
  console.log(`  碰撞障碍物数量: ${finalCollision.collisions.length}`);
  
  if (finalCollision.totalCollidingArea < initCollision.totalCollidingArea) {
    console.log('  ✅ 多障碍物避障有效');
  } else {
    console.log('  ❌ 多障碍物避障无效');
  }
}

function testCircleCarpet() {
  console.log('\n测试3: 圆形地毯避障');
  
  const contour = createRectanglePolygon(0, 0, 4, 4);
  const leg = createFurnitureLegObstacle(0.4, 0, 0.25);
  
  const initX = 0;
  const initY = 0;
  
  const result = adjustPositionForObstacles(
    initX, initY,
    2, 2, true,
    contour, [leg]
  );
  
  const finalCollision = checkCollision(result.polygon, [leg]);
  console.log(`  调整后位置: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);
  console.log(`  碰撞面积: ${finalCollision.totalCollidingArea.toFixed(4)} m²`);
  console.log(`  覆盖率: ${(result.coverageRatio * 100).toFixed(1)}%`);
  
  const bounds = getPolygonBounds(result.polygon);
  const width = bounds.width;
  const height = bounds.height;
  const aspect = width / height;
  console.log(`  裁剪后尺寸: ${width.toFixed(2)} × ${height.toFixed(2)}`);
  console.log(`  宽高比: ${aspect.toFixed(3)}`);
  
  if (result.adjusted) {
    console.log('  ✅ 圆形地毯位置调整成功');
  } else {
    console.log('  ℹ️  圆形地毯无需调整');
  }
}

function testEdgeCases() {
  console.log('\n测试4: 边界情况 - 无碰撞时不移动');
  
  const contour = createRectanglePolygon(0, 0, 6, 6);
  const leg = createFurnitureLegObstacle(5, 5, 0.2);
  
  const initX = 0;
  const initY = 0;
  
  const result = adjustPositionForObstacles(
    initX, initY,
    2, 2, false,
    contour, [leg]
  );
  
  console.log(`  初始位置: (${initX}, ${initY})`);
  console.log(`  调整后位置: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);
  console.log(`  是否移动: ${result.adjusted}`);
  console.log(`  有碰撞: ${result.hasCollision}`);
  
  if (!result.adjusted && !result.hasCollision) {
    console.log('  ✅ 无碰撞时位置保持不变');
  } else {
    console.log('  ⚠️  无碰撞时位置发生了变化');
  }
}

testSingleStep();
testMultipleObstacles();
testCircleCarpet();
testEdgeCases();

console.log('\n=== 验证完成 ===');
