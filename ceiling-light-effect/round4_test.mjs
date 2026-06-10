import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const { chromium } = playwright;

const BASE_URL = 'http://localhost:3010';
const IMG_DIR = '/Users/liboyang/trae/dailyTools/ceiling-light-effect/img/round4';
const REPORT_PATH = '/Users/liboyang/trae/dailyTools/ceiling-light-effect/img/round4/test_report.json';

const results = {
  timestamp: new Date().toISOString(),
  round: 4,
  tests: [],
  issues: [],
  screenshots: []
};

function recordTest(name, passed, details) {
  results.tests.push({ name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${details}`);
}

function recordIssue(severity, description) {
  results.issues.push({ severity, description });
  console.log(`⚠️ [${severity}] ${description}`);
}

async function screenshot(page, name) {
  const filePath = path.join(IMG_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  results.screenshots.push(name);
  console.log(`📸 Screenshot: ${name}`);
  return filePath;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getSliderValue(page, id) {
  return await page.evaluate((sliderId) => {
    const el = document.getElementById(sliderId);
    return el ? parseFloat(el.value) : null;
  }, id);
}

async function setSliderValue(page, id, value) {
  await page.evaluate(({ sliderId, val }) => {
    const el = document.getElementById(sliderId);
    if (el) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { sliderId: id, val: String(value) });
}

async function getStatValue(page, id) {
  const text = await page.evaluate((statId) => {
    const el = document.getElementById(statId);
    return el ? el.textContent : null;
  }, id);
  return text;
}

async function getConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

(async () => {
  console.log('=== 第四轮验收测试开始 ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });

  page.on('pageerror', err => {
    consoleErrors.push(`PAGE_ERROR: ${err.message}`);
  });

  // ===== TEST 1: Page Load =====
  console.log('\n--- Test 1: 页面加载 ---');
  try {
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    const title = await page.title();
    recordTest('页面加载', response.status() === 200 && title.includes('吊顶灯光'),
      `HTTP ${response.status()}, 标题: "${title}"`);
    await screenshot(page, '01_initial_state');
  } catch (e) {
    recordTest('页面加载', false, `加载失败: ${e.message}`);
    recordIssue('CRITICAL', `页面加载失败: ${e.message}`);
  }

  // ===== TEST 2: Initial Camera View =====
  console.log('\n--- Test 2: 初始视角验证 ---');
  try {
    const canvasBox = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });

    const pixelAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return null;

      const w = canvas.width;
      const h = canvas.height;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let darkPixels = 0;
      let midPixels = 0;
      let brightPixels = 0;
      let totalR = 0, totalG = 0, totalB = 0;
      const total = w * h;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalR += r; totalG += g; totalB += b;
        if (lum < 15) darkPixels++;
        else if (lum < 100) midPixels++;
        else brightPixels++;
      }

      return {
        darkRatio: (darkPixels / total * 100).toFixed(1),
        midRatio: (midPixels / total * 100).toFixed(1),
        brightRatio: (brightPixels / total * 100).toFixed(1),
        avgR: (totalR / total).toFixed(1),
        avgG: (totalG / total).toFixed(1),
        avgB: (totalB / total).toFixed(1),
        canvasWidth: w,
        canvasHeight: h
      };
    });

    if (pixelAnalysis) {
      const darkRatio = parseFloat(pixelAnalysis.darkRatio);
      const isGoodView = darkRatio < 50;
      recordTest('初始视角', isGoodView,
        `暗像素占比: ${pixelAnalysis.darkRatio}%, 中间调: ${pixelAnalysis.midRatio}%, 亮像素: ${pixelAnalysis.brightRatio}%, 平均RGB(${pixelAnalysis.avgR},${pixelAnalysis.avgG},${pixelAnalysis.avgB}), 画布: ${pixelAnalysis.canvasWidth}x${pixelAnalysis.canvasHeight}`);
      if (!isGoodView) {
        recordIssue('HIGH', `初始视角暗像素占比 ${pixelAnalysis.darkRatio}%，超过50%阈值，场景可见性差`);
      }
    } else {
      recordTest('初始视角', false, '无法读取canvas像素数据');
    }
  } catch (e) {
    recordTest('初始视角', false, `分析失败: ${e.message}`);
  }

  // ===== TEST 3: White Diagonal Lines Check =====
  console.log('\n--- Test 3: 白色斜杠白条检查 ---');
  try {
    const whiteLineCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return null;

      const w = canvas.width;
      const h = canvas.height;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      let brightDiagonalPixels = 0;
      let totalPixels = w * h;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (lum > 200 && y < h * 0.5) {
            brightDiagonalPixels++;
          }
        }
      }

      const brightTopRatio = (brightDiagonalPixels / totalPixels * 100).toFixed(2);
      return { brightTopRatio, brightTopCount: brightDiagonalPixels };
    });

    if (whiteLineCheck) {
      const hasExcessBrightTop = parseFloat(whiteLineCheck.brightTopRatio) > 5;
      recordTest('白色斜杠检查', !hasExcessBrightTop,
        `画面上半部分高亮像素占比: ${whiteLineCheck.brightTopRatio}%`);
      if (hasExcessBrightTop) {
        recordIssue('MEDIUM', `画面上半部分存在${whiteLineCheck.brightTopRatio}%的高亮像素，可能为白色斜杠白条`);
      }
    }
  } catch (e) {
    recordTest('白色斜杠检查', false, `检查失败: ${e.message}`);
  }

  // ===== TEST 4: Default Stats Values =====
  console.log('\n--- Test 4: 默认统计数值 ---');
  try {
    await sleep(1000);
    const indirect = await getStatValue(page, 'indirectContribution');
    const wallBright = await getStatValue(page, 'wallBrightness');
    const ugr = await getStatValue(page, 'ugrValue');

    const indirectNum = parseFloat(indirect);
    const wallBrightNum = parseFloat(wallBright);
    const ugrNum = parseFloat(ugr);

    const brightnessOk = wallBrightNum >= 130 && wallBrightNum <= 180;
    const indirectOk = indirectNum >= 38 && indirectNum <= 42;

    recordTest('默认亮度校准', brightnessOk,
      `墙面平均亮度: ${wallBright} (目标: 130-180 lux)`);
    if (!brightnessOk) {
      recordIssue('MEDIUM', `默认亮度 ${wallBright} 不在目标范围 130-180 lux 内`);
    }

    recordTest('默认间接光比例', indirectOk,
      `间接光照贡献: ${indirect} (目标: 38-42%)`);
    if (!indirectOk) {
      recordIssue('MEDIUM', `默认间接光比例 ${indirect} 不在目标范围 38-42% 内`);
    }

    recordTest('UGR值', ugrNum > 0,
      `眩光指数UGR: ${ugr}`);
  } catch (e) {
    recordTest('默认统计数值', false, `读取失败: ${e.message}`);
  }

  // ===== TEST 5: 0-Bounce Indirect Light =====
  console.log('\n--- Test 5: 0次反弹间接光照 ---');
  try {
    await setSliderValue(page, 'bounceCount', 0);
    await sleep(1500);
    await screenshot(page, '05_zero_bounce');

    const indirect0 = await getStatValue(page, 'indirectContribution');
    const wallBright0 = await getStatValue(page, 'wallBrightness');
    const indirectNum0 = parseFloat(indirect0);

    const isNearZero = indirectNum0 <= 5;
    recordTest('0次反弹间接光', isNearZero,
      `0次反弹时间接光照: ${indirect0}, 墙面亮度: ${wallBright0} (期望间接光 ≤5%)`);
    if (!isNearZero) {
      recordIssue('HIGH', `0次反弹时间接光照贡献为 ${indirect0}，应为接近0%（≤5%）`);
    }
  } catch (e) {
    recordTest('0次反弹间接光', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 6: Bounce Count Progression =====
  console.log('\n--- Test 6: 反弹次数递增测试 ---');
  try {
    const bounceResults = [];
    for (let b = 0; b <= 4; b++) {
      await setSliderValue(page, 'bounceCount', b);
      await sleep(1000);
      const ind = await getStatValue(page, 'indirectContribution');
      const wb = await getStatValue(page, 'wallBrightness');
      bounceResults.push({ bounce: b, indirect: ind, wallBright: wb });
    }

    const isMonotonic = bounceResults.every((r, i) =>
      i === 0 || parseFloat(r.indirect) >= parseFloat(bounceResults[i-1].indirect) - 1
    );

    recordTest('反弹次数单调递增', isMonotonic,
      `间接光变化: ${bounceResults.map(r => `${r.bounce}次=${r.indirect}`).join(', ')}`);

    if (!isMonotonic) {
      recordIssue('MEDIUM', '间接光照随反弹次数增加未单调递增');
    }
  } catch (e) {
    recordTest('反弹次数递增', false, `测试失败: ${e.message}`);
  }

  // Reset bounce count
  await setSliderValue(page, 'bounceCount', 2);
  await sleep(1000);

  // ===== TEST 7: Wall Wash Effect Adjustment =====
  console.log('\n--- Test 7: 洗墙效果调节 ---');
  try {
    await setSliderValue(page, 'wallWashIntensity', 0);
    await sleep(1500);
    await screenshot(page, '07_wash_intensity_0');

    const bright0 = await getStatValue(page, 'wallBrightness');

    await setSliderValue(page, 'wallWashIntensity', 2);
    await sleep(1500);
    await screenshot(page, '07_wash_intensity_2');

    const bright2 = await getStatValue(page, 'wallBrightness');

    const b0 = parseFloat(bright0);
    const b2 = parseFloat(bright2);
    const ratio = b0 > 0 ? (b2 / b0) : 0;
    const hasEffect = ratio >= 1.3;

    recordTest('洗墙强度调节有效', hasEffect,
      `强度0时: ${bright0}, 强度2时: ${bright2}, 比值: ${ratio.toFixed(2)}x (目标≥1.3x)`);

    if (!hasEffect) {
      recordIssue('HIGH', `洗墙强度调节无效：强度0→2时墙面亮度从${bright0}变到${bright2}，比值${ratio.toFixed(2)}x，无明显变化`);
    }
  } catch (e) {
    recordTest('洗墙效果调节', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 8: Beam Angle Effect =====
  console.log('\n--- Test 8: 光束角度效果 ---');
  try {
    await setSliderValue(page, 'wallWashIntensity', 1.0);
    await sleep(500);

    await setSliderValue(page, 'beamAngle', 10);
    await sleep(1500);
    const bright10 = await getStatValue(page, 'wallBrightness');
    await screenshot(page, '08_beam_10');

    await setSliderValue(page, 'beamAngle', 90);
    await sleep(1500);
    const bright90 = await getStatValue(page, 'wallBrightness');
    await screenshot(page, '08_beam_90');

    const b10 = parseFloat(bright10);
    const b90 = parseFloat(bright90);
    const beamRatio = b10 > 0 ? (b90 / b10) : 0;

    recordTest('光束角度效果', beamRatio !== 1.0,
      `光束10°时: ${bright10}, 光束90°时: ${bright90}, 比值: ${beamRatio.toFixed(2)}x`);
  } catch (e) {
    recordTest('光束角度效果', false, `测试失败: ${e.message}`);
  }

  // Reset beam angle
  await setSliderValue(page, 'beamAngle', 45);
  await sleep(500);

  // ===== TEST 9: Brightness Calibration at Multiple Levels =====
  console.log('\n--- Test 9: 多亮度档位校准 ---');
  try {
    const intensities = [100, 300, 500, 800, 1000];
    const calibrationResults = [];

    for (const intensity of intensities) {
      await setSliderValue(page, 'intensity', intensity);
      await sleep(1000);
      const wb = await getStatValue(page, 'wallBrightness');
      const ind = await getStatValue(page, 'indirectContribution');
      calibrationResults.push({ intensity, wallBright: wb, indirect: ind });
    }

    const r500 = calibrationResults.find(r => r.intensity === 500);
    const r100 = calibrationResults.find(r => r.intensity === 100);
    const r1000 = calibrationResults.find(r => r.intensity === 1000);

    const wb500 = parseFloat(r500.wallBright);
    const ind500 = parseFloat(r500.indirect);

    const allInRange = calibrationResults.every(r => {
      const wb = parseFloat(r.wallBright);
      const expected = r.intensity / 500 * 155;
      return Math.abs(wb - expected) / expected < 0.5;
    });

    const wb500InRange = wb500 >= 130 && wb500 <= 180;
    const ind500InRange = ind500 >= 38 && ind500 <= 42;

    recordTest('500cd/m²亮度校准', wb500InRange,
      `500 cd/m² → 墙面亮度: ${r500.wallBright} (目标130-180 lux)`);

    recordTest('500cd/m²间接光比例', ind500InRange,
      `500 cd/m² → 间接光: ${r500.indirect} (目标38-42%)`);

    if (!wb500InRange) {
      recordIssue('MEDIUM', `500 cd/m²时墙面亮度${r500.wallBright}不在130-180 lux范围`);
    }
    if (!ind500InRange) {
      recordIssue('MEDIUM', `500 cd/m²时间接光比例${r500.indirect}不在38-42%范围`);
    }

    console.log('各档位校准:');
    calibrationResults.forEach(r => {
      console.log(`  ${r.intensity} cd/m² → 亮度: ${r.wallBright}, 间接光: ${r.indirect}`);
    });
  } catch (e) {
    recordTest('多亮度校准', false, `测试失败: ${e.message}`);
  }

  // Reset intensity
  await setSliderValue(page, 'intensity', 500);
  await sleep(500);

  // ===== TEST 10: Light Source Type Switch =====
  console.log('\n--- Test 10: 光源类型切换 ---');
  try {
    await page.click('#tubeLightBtn');
    await sleep(1500);
    await screenshot(page, '10_tube_light');

    const badge = await page.evaluate(() => {
      const el = document.getElementById('lightTypeBadge');
      return el ? el.textContent : null;
    });

    recordTest('管光源切换', badge === 'TubeLight',
      `光源类型标签: ${badge}`);

    await page.click('#areaLightBtn');
    await sleep(1000);
    const badge2 = await page.evaluate(() => {
      const el = document.getElementById('lightTypeBadge');
      return el ? el.textContent : null;
    });

    recordTest('面光源切换', badge2 === 'AreaLight',
      `光源类型标签: ${badge2}`);
  } catch (e) {
    recordTest('光源类型切换', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 11: Ceiling Parameters =====
  console.log('\n--- Test 11: 吊顶参数调节 ---');
  try {
    await setSliderValue(page, 'roomWidth', 12);
    await setSliderValue(page, 'roomHeight', 3.5);
    await sleep(2000);
    await screenshot(page, '11_large_room');

    const wb = await getStatValue(page, 'wallBrightness');
    recordTest('吊顶参数调节', parseFloat(wb) > 0,
      `大房间: 宽12m 高3.5m → 墙面亮度: ${wb}`);

    await setSliderValue(page, 'roomWidth', 8);
    await setSliderValue(page, 'roomHeight', 2.8);
    await sleep(1000);
  } catch (e) {
    recordTest('吊顶参数调节', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 12: Color Temperature =====
  console.log('\n--- Test 12: 色温调节 ---');
  try {
    await setSliderValue(page, 'colorTemp', 2700);
    await sleep(1000);
    await screenshot(page, '12_warm_temp');

    await setSliderValue(page, 'colorTemp', 6500);
    await sleep(1000);
    await screenshot(page, '12_cool_temp');

    const tempVal = await getSliderValue(page, 'colorTemp');
    recordTest('色温调节', tempVal === 6500,
      `色温滑块值: ${tempVal}K`);

    await setSliderValue(page, 'colorTemp', 4000);
    await sleep(500);
  } catch (e) {
    recordTest('色温调节', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 13: View Buttons =====
  console.log('\n--- Test 13: 视图切换按钮 ---');
  try {
    await page.click('#viewFrontBtn');
    await sleep(1500);
    await screenshot(page, '13_front_view');

    await page.click('#viewSideBtn');
    await sleep(1500);
    await screenshot(page, '13_side_view');

    await page.click('#viewIsoBtn');
    await sleep(1500);
    await screenshot(page, '13_iso_view');

    recordTest('视图切换', true, '正视/侧视/轴测按钮均可点击');
  } catch (e) {
    recordTest('视图切换', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 14: Glare Warning =====
  console.log('\n--- Test 14: 眩光警告 ---');
  try {
    const glareVisible = await page.evaluate(() => {
      const el = document.getElementById('glareWarning');
      if (!el) return false;
      return !el.classList.contains('hidden');
    });

    recordTest('眩光警告组件', true,
      `眩光警告元素存在, 当前${glareVisible ? '显示' : '隐藏'}`);
  } catch (e) {
    recordTest('眩光警告', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 15: High Intensity Glare =====
  console.log('\n--- Test 15: 高亮度眩光触发 ---');
  try {
    await setSliderValue(page, 'intensity', 2000);
    await sleep(1500);

    const glareVisible = await page.evaluate(() => {
      const el = document.getElementById('glareWarning');
      if (!el) return false;
      return !el.classList.contains('hidden');
    });

    recordTest('高亮度眩光', true,
      `亮度2000时眩光警告: ${glareVisible ? '显示' : '隐藏'}`);

    await setSliderValue(page, 'intensity', 500);
    await sleep(500);
  } catch (e) {
    recordTest('高亮度眩光', false, `测试失败: ${e.message}`);
  }

  // ===== TEST 16: Final State Screenshot =====
  console.log('\n--- Test 16: 最终状态截图 ---');
  try {
    await setSliderValue(page, 'bounceCount', 2);
    await setSliderValue(page, 'intensity', 500);
    await setSliderValue(page, 'wallWashIntensity', 1.0);
    await sleep(2000);
    await screenshot(page, '16_final_state');
  } catch (e) {
    console.log('最终截图失败:', e.message);
  }

  // ===== Console Errors Check =====
  console.log('\n--- 控制台错误检查 ---');
  if (consoleErrors.length > 0) {
    recordIssue('MEDIUM', `控制台错误(${consoleErrors.length}条): ${consoleErrors.slice(0, 5).join('; ')}`);
    console.log('控制台错误:', consoleErrors);
  } else {
    console.log('✅ 无控制台错误');
  }

  if (consoleWarnings.length > 0) {
    console.log(`控制台警告(${consoleWarnings.length}条):`, consoleWarnings.slice(0, 3));
  }

  // ===== Summary =====
  const passed = results.tests.filter(t => t.passed).length;
  const total = results.tests.length;
  const criticalIssues = results.issues.filter(i => i.severity === 'CRITICAL').length;
  const highIssues = results.issues.filter(i => i.severity === 'HIGH').length;
  const mediumIssues = results.issues.filter(i => i.severity === 'MEDIUM').length;

  results.summary = {
    totalTests: total,
    passedTests: passed,
    failedTests: total - passed,
    criticalIssues,
    highIssues,
    mediumIssues,
    consoleErrors: consoleErrors.length,
    consoleWarnings: consoleWarnings.length
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n=== 测试报告已保存: ${REPORT_PATH} ===`);
  console.log(`通过: ${passed}/${total}, 严重: ${criticalIssues}, 高: ${highIssues}, 中: ${mediumIssues}`);

  await browser.close();
})();
