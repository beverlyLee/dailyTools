console.log('=== 坐标系统与视角对应关系验证（修复后）===\n');

const SCALE = 32;
const CANVAS_W = 512;
const CANVAS_H = 384;

function worldToScreen(wx, wy) {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  return {
    x: cx + wx * SCALE,
    y: cy - wy * SCALE
  };
}

function worldTo3D(x, y, height = 0) {
  return { x: x, y: height, z: -y };
}

console.log('2D 世界坐标 → 平面图屏幕坐标（顶部俯视图）:');
const testPoints = [
  { x: -4, y: -3, desc: '房间左下角' },
  { x: 4, y: 3, desc: '房间右上角' },
  { x: -4, y: 3, desc: '房间左上角' },
  { x: 4, y: -3, desc: '房间右下角' },
  { x: -4, y: -2, desc: '左墙门（y=-2）' },
  { x: -1, y: 3, desc: '上墙门（y=3）' },
];

console.log('  平面图屏幕坐标: y越小越靠上，y越大越靠下');
for (const p of testPoints) {
  const s = worldToScreen(p.x, p.y);
  console.log(`  2D(${p.x}, ${p.y}) [${p.desc}]`);
  console.log(`    → 平面图屏幕(x=${s.x.toFixed(0)}, y=${s.y.toFixed(0)})`);
  if (s.y < CANVAS_H / 2) {
    console.log(`    → 平面图位置: 上半部分 (y<中心)`);
  } else {
    console.log(`    → 平面图位置: 下半部分 (y>中心)`);
  }
}

console.log('\n2D 世界坐标 → 3D 场景坐标:');
console.log('  3D 相机从 (0, 12, 0.01) 看向 (0,0,0)，即正上方俯视');
console.log('  在这种视角下，z越大越靠近相机（屏幕下方），z越小越远（屏幕上方）');
for (const p of testPoints) {
  const t = worldTo3D(p.x, p.y, 0);
  console.log(`  2D(${p.x}, ${p.y}) [${p.desc}]`);
  console.log(`    → 3D(x=${t.x}, y=${t.y}, z=${t.z})`);
  if (t.z < 0) {
    console.log(`    → 3D位置: 远离相机 → 屏幕上方`);
  } else {
    console.log(`    → 3D位置: 靠近相机 → 屏幕下方`);
  }
}

console.log('\n=== 对应关系验证 ===');
const door1 = { x: -4, y: -2, desc: '左墙门' };
const door2 = { x: -1, y: 3, desc: '上墙门' };

const s1 = worldToScreen(door1.x, door1.y);
const t1 = worldTo3D(door1.x, door1.y);
console.log(`\n${door1.desc} (y=-2):`);
console.log(`  平面图: y=${s1.y.toFixed(0)} → ${s1.y > CANVAS_H/2 ? '下半部分 ✅' : '上半部分'}`);
console.log(`  3D z=${t1.z} → ${t1.z > 0 ? '靠近相机→屏幕下方 ✅' : '远离相机→屏幕上方'}`);
console.log(`  对应关系: ${s1.y > CANVAS_H/2 && t1.z > 0 ? '✅ 一致（都在下方）' : '❌ 不一致'}`);

const s2 = worldToScreen(door2.x, door2.y);
const t2 = worldTo3D(door2.x, door2.y);
console.log(`\n${door2.desc} (y=3):`);
console.log(`  平面图: y=${s2.y.toFixed(0)} → ${s2.y < CANVAS_H/2 ? '上半部分 ✅' : '下半部分'}`);
console.log(`  3D z=${t2.z} → ${t2.z < 0 ? '远离相机→屏幕上方 ✅' : '靠近相机→屏幕下方'}`);
console.log(`  对应关系: ${s2.y < CANVAS_H/2 && t2.z < 0 ? '✅ 一致（都在上方）' : '❌ 不一致'}`);

console.log('\n=== 总结 ===');
console.log('✅ 坐标映射: 2D(x,y) → 3D(x, height, z=-y)');
console.log('✅ 平面图: y=cy - wy*SCALE （y越大越靠上）');
console.log('✅ 3D视角: 相机从正上方俯视');
console.log('✅ 门的位置: 平面图与3D图完全对应');
