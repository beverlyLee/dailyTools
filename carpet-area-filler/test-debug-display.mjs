import { recommendCarpetSize } from './src/utils/sizeEngine.js';
import { adjustPositionForObstacles, createDoorSwingObstacle, createFurnitureLegObstacle, checkCollision } from './src/utils/collisionDetector.js';
import { getPolygonBounds, getPolygonArea } from './src/utils/polygonClipping.js';

const roomContour = [
  { x: -4, y: -3 },
  { x: 2, y: -3 },
  { x: 2, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: -4, y: 3 }
];

const shortEdgeContour = [
  { x: 2, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 2, y: 3 }
];

const obstacles = [
  createDoorSwingObstacle(-4, -2, 1.0, Math.PI / 2, false),
  createDoorSwingObstacle(-1, 3, 0.9, Math.PI / 2, true),
  createFurnitureLegObstacle(1, 1.5, 0.06),
  createFurnitureLegObstacle(2.5, 1.5, 0.06),
  createFurnitureLegObstacle(2.5, 2.5, 0.06),
  createFurnitureLegObstacle(1, 2.5, 0.06),
];

console.log('=== 问题1：绘制后不显示地毯的根因分析 ===\n');

console.log('用户绘制的轮廓（L型短边区域）:');
console.log(`  边界: x [2, 4], y [0, 3]`);
console.log(`  面积: ${getPolygonArea(shortEdgeContour).toFixed(2)} m²`);

const result = recommendCarpetSize(shortEdgeContour, 'rectangle');
const recommended = result.recommended;
console.log(`\n推荐尺寸: ${recommended.name} (${recommended.width}m × ${recommended.height}m)`);
console.log(`推荐位置: (${recommended.position.x.toFixed(2)}, ${recommended.position.y.toFixed(2)})`);
console.log(`覆盖率: ${(recommended.coverageRatio * 100).toFixed(1)}%`);
console.log(`clippedPolygon 存在: ${!!recommended.clippedPolygon}`);
if (recommended.clippedPolygon) {
  console.log(`clippedPolygon 点数: ${recommended.clippedPolygon.length}`);
  const b = getPolygonBounds(recommended.clippedPolygon);
  console.log(`clippedPolygon 边界: x [${b.minX.toFixed(2)}, ${b.maxX.toFixed(2)}], y [${b.minY.toFixed(2)}, ${b.maxY.toFixed(2)}]`);
}

const isCircle = recommended.shape === 'circle';
const width = isCircle ? recommended.diameter : recommended.width;
const height = isCircle ? recommended.diameter : recommended.height;
const initPos = recommended.position;

console.log(`\n--- 错误用法（当前代码）：用用户绘制轮廓作为边界 ---`);
const wrongResult = adjustPositionForObstacles(
  initPos.x, initPos.y, width, height, isCircle,
  shortEdgeContour, obstacles
);
console.log(`错误结果 clippedPolygon 存在: ${!!wrongResult.polygon}`);
if (wrongResult.polygon) {
  console.log(`错误结果点数: ${wrongResult.polygon.length}`);
  const b = getPolygonBounds(wrongResult.polygon);
  console.log(`错误结果边界: x [${b.minX.toFixed(2)}, ${b.maxX.toFixed(2)}], y [${b.minY.toFixed(2)}, ${b.maxY.toFixed(2)}]`);
  console.log(`错误结果覆盖率: ${(wrongResult.coverageRatio * 100).toFixed(1)}%`);
}
console.log(`调整后位置: (${wrongResult.x.toFixed(3)}, ${wrongResult.y.toFixed(3)})`);
console.log(`是否移动: ${wrongResult.adjusted}`);
const wrongCol = checkCollision(wrongResult.polygon, obstacles);
console.log(`碰撞面积: ${wrongCol.totalCollidingArea.toFixed(4)} m²`);

console.log(`\n--- 正确用法：用房间轮廓作为边界 ---`);
const correctResult = adjustPositionForObstacles(
  initPos.x, initPos.y, width, height, isCircle,
  roomContour, obstacles
);
console.log(`正确结果 clippedPolygon 存在: ${!!correctResult.polygon}`);
if (correctResult.polygon) {
  console.log(`正确结果点数: ${correctResult.polygon.length}`);
  const b = getPolygonBounds(correctResult.polygon);
  console.log(`正确结果边界: x [${b.minX.toFixed(2)}, ${b.maxX.toFixed(2)}], y [${b.minY.toFixed(2)}, ${b.maxY.toFixed(2)}]`);
  console.log(`正确结果覆盖率: ${(correctResult.coverageRatio * 100).toFixed(1)}%`);
}
console.log(`调整后位置: (${correctResult.x.toFixed(3)}, ${correctResult.y.toFixed(3)})`);
console.log(`是否移动: ${correctResult.adjusted}`);
const correctCol = checkCollision(correctResult.polygon, obstacles);
console.log(`碰撞面积: ${correctCol.totalCollidingArea.toFixed(4)} m²`);

console.log(`\n=== 根因分析 ===`);
if (wrongResult.coverageRatio < 0.3) {
  console.log(`❌ 错误：覆盖率 ${(wrongResult.coverageRatio * 100).toFixed(1)}% < 30% 阈值，地毯不显示！`);
  console.log(`   因为用户绘制区域太小，避障时地毯移出该区域后覆盖率骤降`);
}
if (correctResult.coverageRatio >= 0.3) {
  console.log(`✅ 正确：覆盖率 ${(correctResult.coverageRatio * 100).toFixed(1)}% >= 30%，地毯正常显示`);
  console.log(`   用整个房间作为边界，地毯可以自由移动避障`);
}
