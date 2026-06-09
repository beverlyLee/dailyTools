import { sutherlandHodgman, getPolygonBounds, getPolygonArea, getPolygonCentroid, createRectanglePolygon, pointInPolygon } from './src/utils/polygonClipping.js';
import { recommendCarpetSize, adjustCarpetPosition, findBestFitPosition } from './src/utils/sizeEngine.js';
import { createCarpetMaterial, getCarpetTypes } from './src/utils/materialGenerator.js';
import { checkCollision, createDoorSwingObstacle, createFurnitureLegObstacle, getObstaclePolygon, adjustCarpetToAvoidCollisions } from './src/utils/collisionDetector.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}

function approxEqual(a, b, epsilon = 0.001) {
  return Math.abs(a - b) < epsilon;
}

console.log('=== 多边形裁剪算法测试 (Sutherland-Hodgman) ===');

test('矩形裁剪 - 完全在内部', () => {
  const subject = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }
  ];
  const clip = [
    { x: -1, y: -1 }, { x: 2, y: -1 }, { x: 2, y: 2 }, { x: -1, y: 2 }
  ];
  const result = sutherlandHodgman(subject, clip);
  assert(result.length === 4, '应该有4个顶点');
  assert(approxEqual(getPolygonArea(result), 1), '面积应该约为1');
});

test('矩形裁剪 - 部分重叠', () => {
  const subject = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }
  ];
  const clip = [
    { x: 1, y: -1 }, { x: 3, y: -1 }, { x: 3, y: 3 }, { x: 1, y: 3 }
  ];
  const result = sutherlandHodgman(subject, clip);
  assert(result.length >= 4, '至少有4个顶点');
  const area = getPolygonArea(result);
  assert(approxEqual(area, 2, 0.01), `面积应该约为2，实际为${area}`);
});

test('矩形裁剪 - 完全在外部', () => {
  const subject = [
    { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 0, y: 6 }
  ];
  const clip = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }
  ];
  const result = sutherlandHodgman(subject, clip);
  assert(result.length < 3, '应该没有有效多边形');
});

console.log('\n=== 多边形工具函数测试 ===');

test('getPolygonBounds', () => {
  const poly = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 3 }, { x: 0, y: 3 }
  ];
  const bounds = getPolygonBounds(poly);
  assert(approxEqual(bounds.minX, 0), 'minX');
  assert(approxEqual(bounds.maxX, 2), 'maxX');
  assert(approxEqual(bounds.minY, 0), 'minY');
  assert(approxEqual(bounds.maxY, 3), 'maxY');
  assert(approxEqual(bounds.width, 2), 'width');
  assert(approxEqual(bounds.height, 3), 'height');
});

test('getPolygonArea - 矩形', () => {
  const poly = [
    { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 2 }, { x: 0, y: 2 }
  ];
  const area = getPolygonArea(poly);
  assert(approxEqual(area, 6), `面积应该是6，实际是${area}`);
});

test('getPolygonArea - 三角形', () => {
  const poly = [
    { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }
  ];
  const area = getPolygonArea(poly);
  assert(approxEqual(area, 6), `面积应该是6，实际是${area}`);
});

test('getPolygonCentroid', () => {
  const poly = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }
  ];
  const centroid = getPolygonCentroid(poly);
  assert(approxEqual(centroid.x, 1), '中心x应该是1');
  assert(approxEqual(centroid.y, 1), '中心y应该是1');
});

test('createRectanglePolygon', () => {
  const poly = createRectanglePolygon(0, 0, 4, 2);
  assert(poly.length === 4, '应该有4个顶点');
  const bounds = getPolygonBounds(poly);
  assert(approxEqual(bounds.width, 4), '宽度应该是4');
  assert(approxEqual(bounds.height, 2), '高度应该是2');
});

test('pointInPolygon - 内部点', () => {
  const poly = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }
  ];
  assert(pointInPolygon({ x: 1, y: 1 }, poly) === true, '内部点应该返回true');
});

test('pointInPolygon - 外部点', () => {
  const poly = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }
  ];
  assert(pointInPolygon({ x: 3, y: 1 }, poly) === false, '外部点应该返回false');
});

console.log('\n=== 尺寸适配引擎测试 ===');

test('推荐尺寸 - 矩形轮廓', () => {
  const contour = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 3 }, { x: 0, y: 3 }
  ];
  const result = recommendCarpetSize(contour, 'rectangle');
  assert(result.recommended, '应该有推荐尺寸');
  assert(result.allSizes.length > 0, '应该有多个候选尺寸');
  assert(result.recommended.score > 0, '匹配度应该大于0');
  assert(result.recommended.clippedPolygon.length >= 3, '裁剪后应该有至少3个顶点');
});

test('推荐尺寸 - 正方形', () => {
  const contour = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }
  ];
  const result = recommendCarpetSize(contour, 'square');
  assert(result.recommended.shape === 'square', '应该推荐正方形');
});

test('推荐尺寸 - 圆形', () => {
  const contour = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }
  ];
  const result = recommendCarpetSize(contour, 'circle');
  assert(result.recommended.shape === 'circle', '应该推荐圆形');
});

test('L型轮廓推荐', () => {
  const lShape = [
    { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 2, y: 2 },
    { x: 2, y: 4 }, { x: 0, y: 4 }
  ];
  const result = recommendCarpetSize(lShape, 'rectangle');
  assert(result.recommended, 'L型轮廓应该有推荐尺寸');
  assert(result.recommended.clippedPolygon.length >= 3, '裁剪后应该有有效多边形');
  const clippedArea = getPolygonArea(result.recommended.clippedPolygon);
  const contourArea = getPolygonArea(lShape);
  assert(clippedArea <= contourArea * 1.01, '裁剪后面积不应该超过轮廓面积');
});

console.log('\n=== 碰撞检测测试 ===');

test('创建门扇障碍物', () => {
  const door = createDoorSwingObstacle(0, 0, 1.0, Math.PI / 2, true);
  assert(door.type === 'door', '类型应该是door');
  assert(door.polygon.length >= 3, '应该有至少3个顶点');
  const poly = getObstaclePolygon(door);
  assert(poly.length >= 3, 'getObstaclePolygon应该返回有效多边形');
});

test('创建家具腿障碍物', () => {
  const leg = createFurnitureLegObstacle(1, 1, 0.05);
  assert(leg.type === 'furniture_leg', '类型应该是furniture_leg');
  assert(leg.polygon.length >= 8, '应该有多个顶点（近似圆）');
});

test('碰撞检测 - 有碰撞', () => {
  const carpet = [
    { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }
  ];
  const leg = createFurnitureLegObstacle(1, 1, 0.3);
  const result = checkCollision(carpet, [leg]);
  assert(result.hasCollision === true, '应该检测到碰撞');
  assert(result.totalCollidingArea > 0, '碰撞面积应该大于0');
});

test('碰撞检测 - 无碰撞', () => {
  const carpet = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }
  ];
  const leg = createFurnitureLegObstacle(5, 5, 0.1);
  const result = checkCollision(carpet, [leg]);
  assert(result.hasCollision === false, '不应该检测到碰撞');
});

test('碰撞检测 - 门路径', () => {
  const carpet = [
    { x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }
  ];
  const door = createDoorSwingObstacle(-2, 0, 1.5, Math.PI / 2, false);
  const result = checkCollision(carpet, [door]);
  assert(result.hasCollision === true, '地毯压在门路径上应该有碰撞');
});

test('调整地毯位置避免碰撞', () => {
  const contour = [
    { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }
  ];
  const carpet = createRectanglePolygon(2, 2, 2, 2);
  const leg = createFurnitureLegObstacle(2, 2, 0.3);
  const result = adjustCarpetToAvoidCollisions(carpet, [leg], contour, 20);
  assert(result.polygon.length >= 3, '调整后应该有有效多边形');
  const afterCollision = checkCollision(result.polygon, [leg]);
  console.log(`  调整前碰撞: ${checkCollision(carpet, [leg]).totalCollidingArea.toFixed(4)}`);
  console.log(`  调整后碰撞: ${afterCollision.totalCollidingArea.toFixed(4)}`);
});

console.log('\n=== 材质生成器测试 ===');

test('获取地毯类型列表', () => {
  const types = getCarpetTypes();
  assert(Array.isArray(types), '应该是数组');
  assert(types.length >= 3, '应该至少有3种类型');
  assert(types.some(t => t.id === 'wool'), '应该有羊毛类型');
  assert(types.some(t => t.id === 'nylon'), '应该有尼龙类型');
  assert(types.some(t => t.id === 'sisal'), '应该有剑麻类型');
});

test('创建羊毛材质', () => {
  const { material, pileHeight, config } = createCarpetMaterial('wool');
  assert(material, '应该返回材质');
  assert(pileHeight > 0, '绒毛高度应该大于0');
  assert(config.name === '羊毛', '名称应该是羊毛');
});

test('创建尼龙材质', () => {
  const { material, pileHeight } = createCarpetMaterial('nylon');
  assert(material, '应该返回材质');
  assert(pileHeight > 0, '绒毛高度应该大于0');
});

test('创建剑麻材质', () => {
  const { material, pileHeight } = createCarpetMaterial('sisal');
  assert(material, '应该返回材质');
  assert(pileHeight > 0, '绒毛高度应该大于0');
});

test('不同材质绒毛高度不同', () => {
  const wool = createCarpetMaterial('wool');
  const nylon = createCarpetMaterial('nylon');
  const sisal = createCarpetMaterial('sisal');
  assert(wool.pileHeight > nylon.pileHeight, '羊毛绒毛应该比尼龙高');
  assert(nylon.pileHeight > sisal.pileHeight || wool.pileHeight > sisal.pileHeight, '剑麻应该较短或有不同特性');
});

console.log('\n=== 综合场景测试：L型客厅短边 ===');

test('L型短边区域完美贴合', () => {
  const lRoom = [
    { x: -4, y: -3 },
    { x: 2, y: -3 },
    { x: 2, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: -4, y: 3 }
  ];
  
  const shortSide = [
    { x: 2.2, y: 0.2 },
    { x: 3.8, y: 0.2 },
    { x: 3.8, y: 2.8 },
    { x: 2.2, y: 2.8 }
  ];
  
  const obstacles = [
    createDoorSwingObstacle(-4, -2, 1.0, Math.PI / 2, false),
    createDoorSwingObstacle(-1, 3, 0.9, Math.PI / 2, true),
    createFurnitureLegObstacle(1, 1.5, 0.06),
    createFurnitureLegObstacle(2.5, 1.5, 0.06),
    createFurnitureLegObstacle(1, 0.5, 0.06),
    createFurnitureLegObstacle(2.5, 0.5, 0.06),
  ];
  
  const result = recommendCarpetSize(shortSide, 'rectangle');
  
  assert(result.recommended, '应该有推荐尺寸');
  assert(result.recommended.clippedPolygon.length >= 4, '裁剪后应该有至少4个顶点');
  
  const clippedArea = getPolygonArea(result.recommended.clippedPolygon);
  const carpetArea = result.recommended.scaledWidth * result.recommended.scaledHeight;
  const coverage = clippedArea / carpetArea;
  
  console.log(`  推荐尺寸: ${result.recommended.name}`);
  console.log(`  实际尺寸: ${result.recommended.scaledWidth.toFixed(2)}m × ${result.recommended.scaledHeight.toFixed(2)}m`);
  console.log(`  匹配度: ${(result.recommended.score * 100).toFixed(1)}%`);
  console.log(`  覆盖率: ${(coverage * 100).toFixed(1)}%`);
  
  const collResult = checkCollision(result.recommended.clippedPolygon, obstacles);
  console.log(`  碰撞情况: ${collResult.hasCollision ? '有碰撞' : '无碰撞'}`);
  if (collResult.hasCollision) {
    console.log(`  碰撞面积: ${collResult.totalCollidingArea.toFixed(4)} m²`);
    console.log(`  碰撞比例: ${(collResult.collisionRatio * 100).toFixed(2)}%`);
  }
  
  assert(coverage > 0.7, '覆盖率应该大于70%');
});

console.log('\n=== 测试结果 ===');
console.log(`通过: ${passed}, 失败: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
