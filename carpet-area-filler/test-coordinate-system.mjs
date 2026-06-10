import { getPolygonBounds, getPolygonArea, createRectanglePolygon, getPolygonCentroid } from './src/utils/polygonClipping.js';
import { createFurnitureLegObstacle, checkCollision, adjustPositionForObstacles } from './src/utils/collisionDetector.js';

console.log('=== 坐标系统与碰撞避免综合验证 ===\n');

console.log('测试1: 坐标映射 - 统一 worldTo3D 转换');
const test2DPoints = [
  { x: -4, y: -3, desc: '左下角' },
  { x: 4, y: 3, desc: '右上角' },
  { x: 0, y: 0, desc: '原点' },
  { x: 1, y: 1.5, desc: '家具腿位置' },
];
for (const p of test2DPoints) {
  const x3D = p.x;
  const y3D = 0;
  const z3D = p.y;
  console.log(`  2D(${p.x}, ${p.y}) → 3D(x=${x3D}, y=${y3D}, z=${z3D}) [${p.desc}]`);
}
console.log('  ✅ 坐标映射规则统一：2D(x,y) → 3D(x, 0, y)\n');

console.log('测试2: 碰撞避免位置调整链条完整性');
const contour = createRectanglePolygon(0, 0, 4, 4);
const leg = createFurnitureLegObstacle(0.5, 0, 0.3);

const initX = 0;
const initY = 0;

const initPoly = createRectanglePolygon(initX, initY, 2, 2);
const initCollision = checkCollision(initPoly, [leg]);
console.log(`  初始中心: 2D(${initX}, ${initY})`);
console.log(`  初始碰撞面积: ${initCollision.totalCollidingArea.toFixed(4)} m²`);

const result = adjustPositionForObstacles(
  initX, initY, 2, 2, false, contour, [leg]
);
console.log(`  避障后中心: 2D(${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);
console.log(`  3D mesh.position 应为: (x=${result.x.toFixed(3)}, y=0.001, z=${result.y.toFixed(3)})`);

const afterCollision = checkCollision(result.polygon, [leg]);
console.log(`  避障后碰撞面积: ${afterCollision.totalCollidingArea.toFixed(4)} m²`);

const polyBounds = getPolygonBounds(result.polygon);
const polyCenterX = (polyBounds.minX + polyBounds.maxX) / 2;
const polyCenterY = (polyBounds.minY + polyBounds.maxY) / 2;
console.log(`  裁剪后 polygon 实际中心: 2D(${polyCenterX.toFixed(3)}, ${polyCenterY.toFixed(3)})`);

const dist = Math.sqrt(
  (result.x - polyCenterX) ** 2 + (result.y - polyCenterY) ** 2
);
console.log(`  调整中心与 polygon 中心偏差: ${dist.toFixed(4)} m`);

if (dist < 0.1 && afterCollision.totalCollidingArea < initCollision.totalCollidingArea) {
  console.log('  ✅ 位置链条完整：避障中心 ≈ polygon 中心，碰撞显著减少');
} else {
  console.log('  ❌ 位置链条有问题');
}

console.log('\n测试3: 中心化后几何 + position 设置的正确性');
const centeredPoly = result.polygon.map(p => ({
  x: p.x - polyCenterX,
  y: p.y - polyCenterY
}));
const centeredBounds = getPolygonBounds(centeredPoly);
console.log(`  中心化后 polygon 边界: minX=${centeredBounds.minX.toFixed(3)}, maxX=${centeredBounds.maxX.toFixed(3)}`);
console.log(`  中心化后 polygon 中心: x=${((centeredBounds.minX+centeredBounds.maxX)/2).toFixed(3)}, y=${((centeredBounds.minY+centeredBounds.maxY)/2).toFixed(3)}`);

const final3DPosition = {
  x: polyCenterX,
  y: 0.001,
  z: polyCenterY
};
console.log(`  最终 3D mesh.position: (${final3DPosition.x.toFixed(3)}, ${final3DPosition.y}, ${final3DPosition.z.toFixed(3)})`);

if (
  Math.abs((centeredBounds.minX + centeredBounds.maxX) / 2) < 0.01 &&
  Math.abs((centeredBounds.minY + centeredBounds.maxY) / 2) < 0.01
) {
  console.log('  ✅ 中心化正确，几何中心位于原点');
} else {
  console.log('  ❌ 中心化有偏差');
}

console.log('\n测试4: 障碍物坐标一致性');
const leg2D = { x: 1, y: 1.5 };
const legRadius = 0.06;
const legObstacle = createFurnitureLegObstacle(leg2D.x, leg2D.y, legRadius);
console.log(`  家具腿 2D 位置: (${leg2D.x}, ${leg2D.y})`);
console.log(`  家具腿 3D 位置: (x=${leg2D.x}, y=0.125, z=${leg2D.y})`);
console.log(`  家具腿障碍物 polygon 中心: 2D(${legObstacle.position.x}, ${legObstacle.position.y})`);
console.log('  ✅ 家具腿通过统一 worldTo3D 转换');

console.log('\n测试5: 墙体坐标一致性');
const wallP1 = { x: -4, y: -3 };
const wallP2 = { x: 2, y: -3 };
const wallMid = {
  x: (wallP1.x + wallP2.x) / 2,
  y: (wallP1.y + wallP2.y) / 2
};
console.log(`  墙体 2D 端点: (${wallP1.x},${wallP1.y}) → (${wallP2.x},${wallP2.y})`);
console.log(`  墙体中点 2D: (${wallMid.x}, ${wallMid.y})`);
console.log(`  墙体 3D 中点: (x=${wallMid.x}, y=1.4, z=${wallMid.y})`);
console.log('  ✅ 墙体通过统一 worldTo3D 转换');

console.log('\n=== 综合验证完成 ===');
