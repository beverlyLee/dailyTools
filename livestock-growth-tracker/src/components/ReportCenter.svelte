<script>
  import { onMount } from 'svelte'
  import { STORES, getByIndex, getAll } from '../lib/db.js'
  import {
    calculateAgeDays,
    getStandardWeight,
    calculateFCRBetweenRecords,
    calculateDeviation,
    checkWarning,
    calculateUniformity,
    calculateDailyGain,
    BREED_CONFIG
  } from '../lib/growthModel.js'
  import { generateGrowthReport, generateBatchReport } from '../lib/report.js'

  export let livestockList = []

  let weightRecords = []
  let feedRecords = []
  let summaryStats = null
  let livestockStats = []
  let reportDateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let reportDateTo = new Date().toISOString().split('T')[0]

  async function loadAllData() {
    weightRecords = await getAll(STORES.WEIGHT_RECORDS)
    feedRecords = await getAll(STORES.FEED_RECORDS)
    calculateStats()
  }

  function calculateStats() {
    const stats = []
    let totalWeight = 0
    let totalDailyGain = 0
    let totalFCR = 0
    let fcrCount = 0
    let warningCount = 0
    const allLatestWeights = []

    livestockList.forEach(l => {
      const lWeights = weightRecords
        .filter(r => r.livestockId === l.id)
        .sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))
      const lFeeds = feedRecords.filter(r => r.livestockId === l.id)

      const age = calculateAgeDays(l.birthDate)
      const standardWeight = getStandardWeight(l.breed, age)
      const config = BREED_CONFIG[l.breed] || BREED_CONFIG['地方品种']

      let currentWeight = null
      let deviation = null
      let fcr = null
      let dailyGain = null
      let isWarning = false
      let weightGain = 0

      if (lWeights.length > 0) {
        currentWeight = lWeights[lWeights.length - 1].weight
        allLatestWeights.push({ weight: currentWeight })
        deviation = calculateDeviation(currentWeight, standardWeight)
        isWarning = checkWarning(deviation, config.warningThreshold)
        if (isWarning) warningCount++
        totalWeight += currentWeight
      }

      if (lWeights.length >= 2) {
        const fcrResult = calculateFCRBetweenRecords(lWeights, lFeeds, reportDateFrom, reportDateTo)
        if (fcrResult) {
          fcr = fcrResult.fcr
          dailyGain = fcrResult.dailyGain
          weightGain = fcrResult.weightGain
          totalFCR += fcr
          totalDailyGain += dailyGain
          fcrCount++
        }
      }

      stats.push({
        ...l,
        age,
        currentWeight,
        standardWeight,
        deviation,
        fcr,
        dailyGain,
        weightGain,
        isWarning,
        status: isWarning ? '⚠ 生长迟缓' : (currentWeight ? '正常' : '无数据'),
        standardFCR: config.standardFCR
      })
    })

    const uniformity = calculateUniformity(allLatestWeights)

    summaryStats = {
      count: livestockList.length,
      avgWeight: stats.length > 0 && totalWeight > 0 ? totalWeight / allLatestWeights.length : 0,
      avgDailyGain: fcrCount > 0 ? totalDailyGain / fcrCount : 0,
      avgFCR: fcrCount > 0 ? totalFCR / fcrCount : 0,
      uniformity: uniformity?.uniformity || 0,
      cv: uniformity?.cv || 0,
      warningCount,
      stdDev: uniformity?.stdDev || 0,
      meanWeight: uniformity?.meanWeight || 0
    }

    livestockStats = stats.sort((a, b) => {
      if (a.isWarning && !b.isWarning) return -1
      if (!a.isWarning && b.isWarning) return 1
      return (b.deviation || 0) - (a.deviation || 0)
    })
  }

  function exportIndividual(livestock) {
    const lWeights = weightRecords.filter(r => r.livestockId === livestock.id)
    const lFeeds = feedRecords.filter(r => r.livestockId === livestock.id)

    if (lWeights.length < 2) {
      alert('该牲畜体重记录不足，无法生成完整报表')
      return
    }

    const fcrResult = calculateFCRBetweenRecords(lWeights, lFeeds, reportDateFrom, reportDateTo)
    generateGrowthReport(livestock, lWeights, lFeeds, fcrResult)
  }

  function exportBatch() {
    if (!summaryStats || summaryStats.count === 0) {
      alert('暂无数据可导出')
      return
    }
    generateBatchReport(livestockStats, summaryStats)
  }

  onMount(() => {
    loadAllData()
  })

  $: {
    if (livestockList.length > 0 && weightRecords.length > 0) {
      calculateStats()
    }
  }
</script>

<div class="report-container">
  <div class="date-filter">
    <label for="r-datefrom">起始日期:</label>
    <input id="r-datefrom" type="date" bind:value={reportDateFrom} on:change={calculateStats} />
    <label for="r-dateto">结束日期:</label>
    <input id="r-dateto" type="date" bind:value={reportDateTo} on:change={calculateStats} />
    <button class="btn btn-primary" on:click={exportBatch}>
      📄 导出群体汇总报表
    </button>
  </div>

  {#if summaryStats && summaryStats.count > 0}
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon">🐖</div>
        <div class="kpi-content">
          <div class="kpi-value">{summaryStats.count}</div>
          <div class="kpi-label">存栏总数</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">⚖️</div>
        <div class="kpi-content">
          <div class="kpi-value">{summaryStats.avgWeight.toFixed(1)}<span class="unit">kg</span></div>
          <div class="kpi-label">平均体重</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📈</div>
        <div class="kpi-content">
          <div class="kpi-value">{(summaryStats.avgDailyGain * 1000).toFixed(0)}<span class="unit">g</span></div>
          <div class="kpi-label">平均日增重</div>
        </div>
      </div>
      <div class="kpi-card {summaryStats.avgFCR > 3.0 ? 'warning' : ''}">
        <div class="kpi-icon">🥣</div>
        <div class="kpi-content">
          <div class="kpi-value">{summaryStats.avgFCR ? summaryStats.avgFCR.toFixed(2) : '--'}</div>
          <div class="kpi-label">平均料肉比 (FCR)</div>
        </div>
      </div>
      <div class="kpi-card {summaryStats.uniformity < 80 ? 'warning' : ''}">
        <div class="kpi-icon">📊</div>
        <div class="kpi-content">
          <div class="kpi-value">{summaryStats.uniformity.toFixed(1)}<span class="unit">%</span></div>
          <div class="kpi-label">群体均匀度</div>
        </div>
      </div>
      <div class="kpi-card {summaryStats.warningCount > 0 ? 'danger' : ''}">
        <div class="kpi-icon">⚠️</div>
        <div class="kpi-content">
          <div class="kpi-value">{summaryStats.warningCount}</div>
          <div class="kpi-label">生长迟缓预警</div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h3>群体均匀度分析</h3>
      </div>
      <div class="uniformity-bar">
        <div class="bar-track">
          <div class="bar-fill poor" style="width: 60%"></div>
          <div class="bar-fill good" style="left: 60%; width: 20%"></div>
          <div class="bar-fill excellent" style="left: 80%; width: 20%"></div>
        </div>
        <div class="bar-marker" style="left: {summaryStats.uniformity}%">
          <div class="marker-dot"></div>
          <div class="marker-label">{summaryStats.uniformity.toFixed(1)}%</div>
        </div>
        <div class="bar-labels">
          <span>差 (0-60%)</span>
          <span>良好 (60-80%)</span>
          <span>优秀 (80-100%)</span>
        </div>
      </div>
      <div class="uniformity-stats">
        <div class="stat-item">
          <span class="stat-label">平均体重:</span>
          <span class="stat-value">{summaryStats.meanWeight.toFixed(2)} kg</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">标准差:</span>
          <span class="stat-value">{summaryStats.stdDev.toFixed(2)} kg</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">变异系数 (CV):</span>
          <span class="stat-value">{summaryStats.cv.toFixed(2)}%</span>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h3>个体明细 ({livestockStats.length})</h3>
        <span class="hint">红色行为生长预警个体</span>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>耳标</th>
              <th>品种</th>
              <th>日龄</th>
              <th>当前体重</th>
              <th>标准体重</th>
              <th>偏离度</th>
              <th>日增重</th>
              <th>FCR</th>
              <th>标准FCR</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {#each livestockStats as s}
              <tr class:warning-row={s.isWarning}>
                <td><strong>{s.earTag}</strong></td>
                <td>{s.breed}</td>
                <td>{s.age}天</td>
                <td>{s.currentWeight ? s.currentWeight.toFixed(2) + ' kg' : '--'}</td>
                <td>{s.standardWeight.toFixed(2)} kg</td>
                <td class={s.isWarning ? 'text-danger' : (s.deviation && s.deviation < 0 ? 'text-warning' : 'text-success')}>
                  {s.deviation !== null ? (s.deviation * 100).toFixed(1) + '%' : '--'}
                </td>
                <td>{s.dailyGain ? (s.dailyGain * 1000).toFixed(0) + ' g' : '--'}</td>
                <td class={s.fcr && s.fcr > s.standardFCR * 1.1 ? 'text-danger' : ''}>
                  {s.fcr ? s.fcr.toFixed(2) : '--'}
                </td>
                <td>{s.standardFCR}</td>
                <td>
                  {#if s.isWarning}
                    <span class="status-tag danger">⚠ 预警</span>
                  {:else if s.currentWeight}
                    <span class="status-tag success">正常</span>
                  {:else}
                    <span class="status-tag">无数据</span>
                  {/if}
                </td>
                <td>
                  <button class="btn-link" on:click={() => exportIndividual(s)} disabled={!s.currentWeight}>
                    导出报表
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <p>暂无生产数据，请先录入牲畜档案和生长记录</p>
      <p class="hint-text">提示：可在"系统验证"页面一键生成模拟数据</p>
    </div>
  {/if}
</div>

<style>
  .report-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .date-filter {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--card-bg);
    padding: 16px 20px;
    border-radius: 10px;
    box-shadow: var(--shadow);
    flex-wrap: wrap;
  }

  .date-filter label {
    font-weight: 500;
    color: var(--text);
  }

  .date-filter input {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    margin-left: auto;
  }

  .btn-primary:hover {
    background: var(--primary-dark);
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .kpi-card {
    background: var(--card-bg);
    padding: 20px;
    border-radius: 10px;
    box-shadow: var(--shadow);
    display: flex;
    align-items: center;
    gap: 16px;
    border-left: 4px solid var(--primary);
  }

  .kpi-card.warning {
    border-left-color: var(--secondary);
  }

  .kpi-card.danger {
    border-left-color: var(--danger);
    background: #fff8f8;
  }

  .kpi-icon {
    font-size: 36px;
  }

  .kpi-content {
    flex: 1;
  }

  .kpi-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
  }

  .kpi-value .unit {
    font-size: 14px;
    font-weight: 400;
    color: var(--text-light);
    margin-left: 4px;
  }

  .kpi-label {
    font-size: 13px;
    color: var(--text-light);
    margin-top: 4px;
  }

  .panel {
    background: var(--card-bg);
    padding: 24px;
    border-radius: 10px;
    box-shadow: var(--shadow);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .panel-header h3 {
    font-size: 16px;
    color: var(--text);
  }

  .hint {
    font-size: 12px;
    color: var(--text-light);
  }

  .uniformity-bar {
    margin: 20px 0;
  }

  .bar-track {
    position: relative;
    height: 40px;
    background: #f5f5f5;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 40px;
  }

  .bar-fill {
    position: absolute;
    top: 0;
    height: 100%;
  }

  .bar-fill.poor { background: linear-gradient(90deg, #ffcdd2, #ffab91); }
  .bar-fill.good { background: linear-gradient(90deg, #ffe082, #fff59d); }
  .bar-fill.excellent { background: linear-gradient(90deg, #a5d6a7, #66bb6a); }

  .bar-marker {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    z-index: 10;
  }

  .marker-dot {
    width: 16px;
    height: 16px;
    background: var(--primary);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    margin: 12px auto 0;
  }

  .marker-label {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--primary-dark);
    text-align: center;
    white-space: nowrap;
  }

  .bar-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    font-size: 12px;
    color: var(--text-light);
  }

  .uniformity-stats {
    display: flex;
    gap: 32px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .stat-label {
    font-size: 13px;
    color: var(--text-light);
  }

  .stat-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .table-container {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table th, .data-table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  .data-table th {
    background: #f8f9fa;
    font-weight: 600;
    color: var(--text-light);
    position: sticky;
    top: 0;
  }

  .data-table tr:hover {
    background: #fafafa;
  }

  .data-table tr.warning-row {
    background: #fff5f5;
  }

  .text-danger {
    color: var(--danger);
    font-weight: 600;
  }

  .text-warning {
    color: var(--secondary);
  }

  .text-success {
    color: var(--primary);
  }

  .status-tag {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    background: #eee;
    color: #666;
  }

  .status-tag.success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .status-tag.danger {
    background: #ffebee;
    color: #c62828;
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--primary);
    cursor: pointer;
    font-size: 13px;
    padding: 4px 8px;
  }

  .btn-link:disabled {
    color: #ccc;
    cursor: not-allowed;
  }

  .btn-link:hover:not(:disabled) {
    text-decoration: underline;
  }

  .empty-state {
    text-align: center;
    padding: 80px 20px;
    background: var(--card-bg);
    border-radius: 10px;
    box-shadow: var(--shadow);
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-state p {
    color: var(--text-light);
    font-size: 15px;
  }

  .hint-text {
    font-size: 13px !important;
    margin-top: 8px;
    opacity: 0.8;
  }
</style>
