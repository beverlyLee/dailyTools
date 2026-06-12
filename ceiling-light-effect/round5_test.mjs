import playwright from 'playwright';
import fs from 'fs';
import path from 'path';

const { chromium } = playwright;

const BASE_URL = 'http://localhost:3012';
const IMG_DIR = '/Users/liboyang/trae/dailyTools/ceiling-light-effect/img/round5';
const REPORT_PATH = path.join(IMG_DIR, 'test_report.json');

const results = {
  timestamp: new Date().toISOString(),
  round: 5,
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

async function getStatValue(page, id) {
  const text = await page.evaluate((statId) => {
    const el = document.getElementById(statId);
    return el ? el.textContent : null;
  }, id);
  return text;
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

(async () => {
  console.log('=== 第五轮验收测试开始 ===\n');
  fs.mkdirSync(IMG_DIR, { recursive: true });

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
    await sleep(4000);

    const title = await page.title();
    recordTest('页面加载', response.status() === 200 && title.includes('吊顶灯光'),
      `HTTP ${response.status()}, 标题: "${title}"`);
    await screenshot(page, '01_initial_state');
  } catch (e) {
    recordTest('页面加载', false, `加载失败: ${e.message}`);
    recordIssue('CRITICAL', `页面加载失败: ${e.message}`);
  }

  // ===== TEST 2: Initial Camera View - Pixel Analysis =====
  console.log('\n--- Test 2: 初始视角与场景呈现 ---');
  try {
    const pixelAnalysis = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'no canvas' };
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { error: 'no gl context' };

      const w = Math.min(canvas.width, 1280);
      const h = Math.min(canvas.height, 800);
      const pixels = new Uint8Array(w * h * 4);
      try {
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      } catch (e) {
        return { error: 'readPixels failed: ' + e.message };
      }

      let darkPixels = 0, midPixels = 0, brightPixels = 0, overexposed = 0;
      let totalR = 0, totalG = 0, totalB = 0;
      const total = w * h;

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalR += r; totalG += g; totalB += b;
        if (lum < 15) darkPixels++;
        else if (lum >= 250) overexposed++;
        else if (lum < 100) midPixels++;
        else brightPixels++;
      }

      return {
        darkRatio: (darkPixels / total * 100).toFixed(1),
        midRatio: (midPixels / total * 100).toFixed(1),
        brightRatio: (brightPixels / total * 100).toFixed(1),
        overexposedRatio: (overexposed / total * 100).toFixed(1),
        avgR: (totalR / total).toFixed(1),
        avgG: (totalG / total).toFixed(1),
        avgB: (totalB / total).toFixed(1),
        canvasW: w, canvasH: h
      };
    });

    console.log('像素分析结果:', JSON.stringify(pixelAnalysis, null, 2));

    if (pixelAnalysis && !pixelAnalysis.error) {
      const dark = parseFloat(pixelAnalysis.darkRatio);
      const over = parseFloat(pixelAnalysis.overexposedRatio);
      const roomVisible = dark < 40 && over < 40;

      recordTest('初始视角可见性', roomVisible,
        `暗像素:${pixelAnalysis.darkRatio}% 中间调:${pixelAnalysis.midRatio}% 亮像素:${pixelAnalysis.brightRatio}% 过曝:${pixelAnalysis.overexposedRatio}% 平均RGB(${pixelAnalysis.avgR},${pixelAnalysis.avgG},${pixelAnalysis.avgB})`);

      if (dark >= 40) {
        recordIssue('HIGH', `初始视角暗像素占比 ${pixelAnalysis.darkRatio}%，超过40%阈值，场景可见性差`);
      }
      if (over >= 40) {
        recordIssue('HIGH', `初始视角过曝像素占比 ${pixelAnalysis.overexposedRatio}%，超过40%阈值，画面曝光过度`);
      }
    } else {
      recordTest('初始视角可见性', false, '像素分析失败: ' + (pixelAnalysis?.error || '未知'));
    }
  } catch (e) {
    recordTest('初始视角', false, `分析失败: ${e.message}`);
  }

  // ===== TEST 3: White Lines Check =====
  console.log('\n--- Test 3: 白色斜杠白条检查 ---');
  try {
    const whiteCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return null;

      const w = Math.min(canvas.width, 1280);
      const h = Math.min(canvas.height, 800);
      const pixels = new Uint8Array(w * h * 4);
      try {
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      } catch (e) {
        return null;
      }

      let whiteTopPixels = 0;
      const topHalfStart = Math.floor(h * 0.4);
      const topHalfEnd = Math.floor(h * 0.85);
      let totalTopArea = 0;

      for (let y = topHalfStart; y < topHalfEnd; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalTopArea++;

          if (lum > 210 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
            whiteTopPixels++;
          }
        }
      }

      return {
        whiteTopRatio: (whiteTopPixels / Math.max(totalTopArea, 1) * 100).toFixed(2),
        whiteTopCount: whiteTopPixels
      };
    });

    if (whiteCheck) {
      const hasLines = parseFloat(whiteCheck.whiteTopRatio) > 0.8;
      recordTest('白色斜杠白条', !hasLines,
        `画面中上部高亮白线条像素占比: ${whiteCheck.whiteTopRatio}%`);
      if (hasLines) {
        recordIssue('HIGH', `画面中上部存在${whiteCheck.whiteTopRatio}%的高亮白色像素，疑似白色斜杠白条未去除`);
      }
    } else {
      recordTest('白色斜杠白条', false, '检查失败');
    }
  } catch (e) {
    recordTest('白色斜杠白条', false, `检查失败: ${e.message}`);
  }

  // ===== TEST 4: Default Stats =====
  console.log('\n--- Test 4: 默认统计数值 ---');
  try {
    await sleep(500);
    const indirect = await getStatValue(page, 'indirectContribution');
    const wallBright = await getStatValue(page, 'wallBrightness');
    const ugr = await getStatValue(page, 'ugrValue');

    const indirectNum = parseFloat(indirect);
    const wallBrightNum = parseFloat(wallBright);

    const brightnessOk = wallBrightNum >= 140 && wallBrightNum <= 170;
    const indirectOk = indirectNum >= 39 && indirectNum <= 41;

    recordTest('默认亮度校准(140-170)', brightnessOk,
      `墙面亮度: ${wallBright} (目标: 140-170 lux)`);
    if (!brightnessOk) {
      recordIssue('MEDIUM', `默认亮度 ${wallBright} 不在目标范围 140-170 lux 内`);
    }

    recordTest('默认间接光比例(39-41)', indirectOk,
      `间接光照: ${indirect} (目标: 39-41%)`);
    if (!indirectOk) {
      recordIssue('MEDIUM', `默认间接光比例 ${indirect} 不在目标范围 39-41% 内`);
    }

    recordTest('UGR值', !isNaN(parseFloat(ugr)),
      `眩光指数UGR: ${ugr}`);
  } catch (e) {
    recordTest('默认统计数值', false, `读取失败: ${e.message}`);
  }

  // ===== TEST 5: 0-Bounce =====
  console.log('\n--- Test 5: 0次反弹间接光照 ---');
  try {
    await setSliderValue(page, 'bounceCount', 0);
    await sleep(2000);
    await screenshot(page, '05_zero_bounce');

    const indirect0 = await getStatValue(page, 'indirectContribution');
    const wallBright0 = await getStatValue(page, 'wallBrightness');
    const indirectNum0 = parseFloat(indirect0);

    const isNearZero = indirectNum0 <= 5;
    recordTest('0次反弹间接光', isNearZero,
      `0次反弹: 间接光=${indirect0}, 亮度=${wallBright0} (期望间接光 ≤5%)`);
    if (!isNearZero) {
      recordIssue('HIGH', `0次反弹时间接光为 ${indirect0}，应为接近0%`);
    }
  } catch (e) {
    recordTest('0次反弹', false, `失败: ${e.message}`);
  }

  // ===== TEST 6: Bounce Progression =====
  console.log('\n--- Test 6: 反弹次数递增 ---');
  try {
    const bounceData = [];
    for (let b = 0; b <= 4; b++) {
      await setSliderValue(page, 'bounceCount', b);
      await sleep(1200);
      const ind = await getStatValue(page, 'indirectContribution');
      const wb = await getStatValue(page, 'wallBrightness');
      bounceData.push({ bounce: b, indirect: parseFloat(ind), wallBright: parseFloat(wb) });
    }
    console.log('  反弹数据:', JSON.stringify(bounceData));

    const hasGradualIncrease = bounceData[1].indirect > 5 &&
      bounceData[2].indirect > bounceData[1].indirect &&
      bounceData[3].indirect >= bounceData[2].indirect;

    recordTest('反弹递增曲线合理', hasGradualIncrease,
      bounceData.map(r => `${r.bounce}次=${r.indirect}%`).join(' → '));

    if (!hasGradualIncrease) {
      recordIssue('MEDIUM', '反弹次数递增曲线不合理：1次反弹过高或后续反弹无增长');
    }
  } catch (e) {
    recordTest('反弹递增', false, `失败: ${e.message}`);
  }

  // Reset to 2 bounces
  await setSliderValue(page, 'bounceCount', 2);
  await sleep(1000);

  // ===== TEST 7: Wall Wash Intensity =====
  console.log('\n--- Test 7: 洗墙强度调节 ---');
  try {
    await setSliderValue(page, 'wallWashIntensity', 0);
    await sleep(2000);
    await screenshot(page, '07_wash_0');
    const wb0 = parseFloat(await getStatValue(page, 'wallBrightness'));

    await setSliderValue(page, 'wallWashIntensity', 2);
    await sleep(2000);
    await screenshot(page, '07_wash_2');
    const wb2 = parseFloat(await getStatValue(page, 'wallBrightness'));

    const ratio = wb0 > 0 ? (wb2 / wb0) : 0;
    const hasEffect = ratio >= 1.3 || ratio <= 0.77;

    recordTest('洗墙强度有效', hasEffect,
      `强度0→亮度${wb0}lux, 强度2→亮度${wb2}lux, 比值${ratio.toFixed(2)}x (目标变化≥30%)`);
    if (!hasEffect) {
      recordIssue('HIGH', `洗墙强度调节几乎无效：0→2时亮度变化${(Math.abs(ratio-1)*100).toFixed(0)}%，期望≥30%`);
    }
  } catch (e) {
    recordTest('洗墙强度', false, `失败: ${e.message}`);
  }

  // ===== TEST 8: Beam Angle =====
  console.log('\n--- Test 8: 光束角度调节 ---');
  try {
    await setSliderValue(page, 'wallWashIntensity', 1);
    await sleep(500);

    await setSliderValue(page, 'beamAngle', 10);
    await sleep(2000);
    await screenshot(page, '08_beam_10');
    const ba10 = parseFloat(await getStatValue(page, 'wallBrightness'));

    await setSliderValue(page, 'beamAngle', 90);
    await sleep(2000);
    await screenshot(page, '08_beam_90');
    const ba90 = parseFloat(await getStatValue(page, 'wallBrightness'));

    const ratio = ba10 > 0 ? (ba90 / ba10) : 0;
    const hasEffect = Math.abs(ratio - 1) > 0.05;

    recordTest('光束角有效', hasEffect,
      `10°→${ba10}lux, 90°→${ba90}lux, 比值${ratio.toFixed(2)}x`);
    if (!hasEffect) {
      recordIssue('MEDIUM', `光束角度调节无明显效果`);
    }
  } catch (e) {
    recordTest('光束角', false, `失败: ${e.message}`);
  }

  // ===== TEST 9: Halo Spread =====
  console.log('\n--- Test 9: 光晕扩散调节 ---');
  try {
    await setSliderValue(page, 'beamAngle', 45);
    await sleep(500);

    await setSliderValue(page, 'haloSpread', 0.1);
    await sleep(1500);
    const hs01 = parseFloat(await getStatValue(page, 'wallBrightness'));

    await setSliderValue(page, 'haloSpread', 2);
    await sleep(1500);
    const hs2 = parseFloat(await getStatValue(page, 'wallBrightness'));

    const ratio = hs01 > 0 ? (hs2 / hs01) : 0;
    const hasEffect = Math.abs(ratio - 1) > 0.05;

    recordTest('光晕扩散有效', hasEffect,
      `0.1→${hs01}lux, 2.0→${hs2}lux, 比值${ratio.toFixed(2)}x`);
  } catch (e) {
    recordTest('光晕扩散', false, `失败: ${e.message}`);
  }

  // Reset
  await setSliderValue(page, 'haloSpread', 0.5);
  await sleep(300);

  // ===== TEST 10: Multi-level Brightness =====
  console.log('\n--- Test 10: 多档位亮度校准 ---');
  try {
    const data = [];
    for (const lv of [100, 300, 500, 800, 1000]) {
      await setSliderValue(page, 'intensity', lv);
      await sleep(1000);
      const wb = parseFloat(await getStatValue(page, 'wallBrightness'));
      const ind = parseFloat(await getStatValue(page, 'indirectContribution'));
      data.push({ lv, wb, ind });
    }
    console.log('  亮度档位:', JSON.stringify(data));

    const d500 = data.find(d => d.lv === 500);
    const wbOk = d500.wb >= 140 && d500.wb <= 170;
    const indOk = d500.ind >= 39 && d500.ind <= 41;

    recordTest('500cd/m²亮度范围', wbOk, `${d500.wb} lux (目标140-170)`);
    recordTest('500cd/m²间接光范围', indOk, `${d500.ind}% (目标39-41)`);
  } catch (e) {
    recordTest('多档位校准', false, `失败: ${e.message}`);
  }

  await setSliderValue(page, 'intensity', 500);
  await sleep(500);

  // ===== TEST 11: Light Type Switch =====
  console.log('\n--- Test 11: 光源类型切换 ---');
  try {
    await page.click('#tubeLightBtn');
    await sleep(2000);
    await screenshot(page, '11_tube_light');
    const b1 = await getStatValue(page, 'indirectContribution');

    await page.click('#areaLightBtn');
    await sleep(1500);
    const b2 = await getStatValue(page, 'indirectContribution');

    recordTest('光源切换', !isNaN(parseFloat(b1)) && !isNaN(parseFloat(b2)),
      `管光间接=${b1}, 面光间接=${b2}`);
  } catch (e) {
    recordTest('光源切换', false, `失败: ${e.message}`);
  }

  // ===== TEST 12: View Buttons =====
  console.log('\n--- Test 12: 视图切换 ---');
  try {
    await page.click('#viewFrontBtn');
    await sleep(1500);
    await screenshot(page, '12_front_view');

    await page.click('#viewSideBtn');
    await sleep(1500);
    await screenshot(page, '12_side_view');

    await page.click('#viewIsoBtn');
    await sleep(2000);
    await screenshot(page, '12_iso_view');
    recordTest('视图按钮', true, '正视/侧视/轴测均响应');
  } catch (e) {
    recordTest('视图按钮', false, `失败: ${e.message}`);
  }

  // ===== TEST 13: Ceiling Params =====
  console.log('\n--- Test 13: 吊顶参数调节 ---');
  try {
    await setSliderValue(page, 'roomWidth', 12);
    await setSliderValue(page, 'roomHeight', 3.5);
    await sleep(2500);
    const wb = parseFloat(await getStatValue(page, 'wallBrightness'));
    await screenshot(page, '13_large_room');
    recordTest('吊顶参数', wb > 0, `大房间亮度: ${wb} lux`);
  } catch (e) {
    recordTest('吊顶参数', false, `失败: ${e.message}`);
  }

  // ===== TEST 14: High Intensity Glare =====
  console.log('\n--- Test 14: 高亮度眩光触发 ---');
  try {
    await setSliderValue(page, 'intensity', 2000);
    await sleep(2000);
    const glareOn = await page.evaluate(() => {
      const el = document.getElementById('glareWarning');
      return el && !el.classList.contains('hidden');
    });
    const ugr = parseFloat(await getStatValue(page, 'ugrValue'));
    recordTest('高亮度眩光', ugr > 0,
      `亮度2000时UGR=${ugr}, 警告显示=${glareOn}`);
  } catch (e) {
    recordTest('高亮度眩光', false, `失败: ${e.message}`);
  }

  // Final reset
  await setSliderValue(page, 'intensity', 500);
  await setSliderValue(page, 'roomWidth', 8);
  await setSliderValue(page, 'roomHeight', 2.8);
  await setSliderValue(page, 'bounceCount', 2);
  await setSliderValue(page, 'wallWashIntensity', 1);
  await sleep(2000);
  await screenshot(page, '15_final_state');

  // ===== Summary =====
  console.log('\n--- 控制台错误检查 ---');
  if (consoleErrors.length > 0) {
    recordIssue('MEDIUM', `控制台错误(${consoleErrors.length}): ${consoleErrors.slice(0, 5).join(' | ')}`);
    console.log('控制台错误:', consoleErrors);
  } else {
    console.log('✅ 无控制台错误');
  }
  if (consoleWarnings.length > 0) {
    console.log(`控制台警告(${consoleWarnings.length}):`, consoleWarnings.slice(0, 3));
  }

  const passed = results.tests.filter(t => t.passed).length;
  const total = results.tests.length;
  const critical = results.issues.filter(i => i.severity === 'CRITICAL').length;
  const high = results.issues.filter(i => i.severity === 'HIGH').length;
  const medium = results.issues.filter(i => i.severity === 'MEDIUM').length;

  results.summary = {
    totalTests: total, passedTests: passed, failedTests: total - passed,
    criticalIssues: critical, highIssues: high, mediumIssues: medium,
    consoleErrors: consoleErrors.length, consoleWarnings: consoleWarnings.length
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n=== 报告已保存: ${REPORT_PATH} ===`);
  console.log(`通过 ${passed}/${total}, 严重:${critical}, 高:${high}, 中:${medium}`);

  await browser.close();
})();
