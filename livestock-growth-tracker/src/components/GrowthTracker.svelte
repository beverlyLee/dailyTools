<script>
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte'
  import { STORES, add, getByIndex, remove } from '../lib/db.js'
  import {
    calculateAgeDays,
    getStandardWeight,
    generateGrowthCurve,
    calculateFCRBetweenRecords,
    checkWarning,
    calculateDeviation,
    calculateDailyGain,
    BREED_CONFIG
  } from '../lib/growthModel.js'
  import { generateGrowthReport } from '../lib/report.js'

  export let livestock = null

  const dispatch = createEventDispatcher()

  let weightRecords = []
  let feedRecords = []
  let curvePoints = []
  let fcrStats = null
  let age = 0
  let currentStandardWeight = 0
  let deviation = null
  let isWarning = false

  let showWeightForm = false
  let showFeedForm = false
  let newWeight = {
    recordDate: new Date().toISOString().split('T')[0],
    weight: ''
  }
  let newFeed = {
    recordDate: new Date().toISOString().split('T')[0],
    feedAmount: '',
    notes: ''
  }

  $: if (livestock) {
    age = calculateAgeDays(livestock.birthDate)
    currentStandardWeight = getStandardWeight(livestock.breed, age)
    curvePoints = generateGrowthCurve(livestock.breed, 0, Math.max(age, 200))
  }

  $: if (weightRecords.length >= 2 && feedRecords.length > 0) {
    const sortedWeights = [...weightRecords].sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))
    const firstW = sortedWeights[0]
    const lastW = sortedWeights[sortedWeights.length - 1]
    const daysBetween = calculateAgeDays(firstW.recordDate, lastW.recordDate)

    fcrStats = calculateFCRBetweenRecords(weightRecords, feedRecords, firstW.recordDate, lastW.recordDate)
    if (fcrStats) {
      const config = BREED_CONFIG[livestock?.breed] || BREED_CONFIG['地方品种']
      fcrStats.standardFCR = config.standardFCR
      deviation = calculateDeviation(lastW.weight, getStandardWeight(livestock.breed, calculateAgeDays(livestock.birthDate, lastW.recordDate)))
      fcrStats.deviation = deviation
      isWarning = checkWarning(deviation, config.warningThreshold)
      fcrStats.isWarning = isWarning
    }
  }

  $: sortedWeightRecords = (() => {
    if (!livestock) return []
    const config = BREED_CONFIG[livestock.breed] || BREED_CONFIG['地方品种']
    return [...weightRecords].sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate)).map(r => {
      const rAge = calculateAgeDays(livestock.birthDate, r.recordDate)
      const stdW = getStandardWeight(livestock.breed, rAge)
      const dev = calculateDeviation(r.weight, stdW)
      const isW = checkWarning(dev, config.warningThreshold)
      return {
        ...r,
        rAge,
        stdW,
        dev,
        isW
      }
    })
  })()

  async function loadData() {
    if (!livestock) return
    weightRecords = await getByIndex(STORES.WEIGHT_RECORDS, 'livestockId', livestock.id)
    feedRecords = await getByIndex(STORES.FEED_RECORDS, 'livestockId', livestock.id)
  }

  async function saveWeight() {
    if (!newWeight.weight) return
    await add(STORES.WEIGHT_RECORDS, {
      livestockId: livestock.id,
      recordDate: newWeight.recordDate,
      weight: parseFloat(newWeight.weight)
    })
    newWeight = { recordDate: new Date().toISOString().split('T')[0], weight: '' }
    showWeightForm = false
    await loadData()
  }

  async function saveFeed() {
    if (!newFeed.feedAmount) return
    await add(STORES.FEED_RECORDS, {
      livestockId: livestock.id,
      recordDate: newFeed.recordDate,
      feedAmount: parseFloat(newFeed.feedAmount),
      notes: newFeed.notes
    })
    newFeed = { recordDate: new Date().toISOString().split('T')[0], feedAmount: '', notes: '' }
    showFeedForm = false
    await loadData()
  }

  async function deleteWeight(id) {
    if (!confirm('确定删除该体重记录？')) return
    await remove(STORES.WEIGHT_RECORDS, id)
    await loadData()
  }

  async function deleteFeed(id) {
    if (!confirm('确定删除该饲料记录？')) return
    await remove(STORES.FEED_RECORDS, id)
    await loadData()
  }

  function exportReport() {
    if (!livestock || !fcrStats) {
      alert('数据不足，无法生成报表')
      return
    }
    generateGrowthReport(livestock, weightRecords, feedRecords, fcrStats)
  }

  onMount(() => {
    loadData()
  })

  $: if (livestock) {
    loadData()
  }

  let svgContainer
  let tooltipEl
  let tooltipData = null

  afterUpdate(() => {
    drawChart()
  })

  function handleSvgMouseMove(e) {
    if (!tooltipEl) return
    const rect = svgContainer.parentElement.getBoundingClientRect()
    const x = e.clientX - rect.left + 16
    const y = e.clientY - rect.top - 10
    tooltipEl.style.left = x + 'px'
    tooltipEl.style.top = y + 'px'
  }

  function showPointTooltip(rAge, r) {
    const stdW = getStandardWeight(livestock.breed, rAge)
    const dev = calculateDeviation(r.weight, stdW)
    const config = BREED_CONFIG[livestock?.breed] || BREED_CONFIG['地方品种']
    const isWarningPoint = checkWarning(dev, config.warningThreshold)
    tooltipData = {
      date: r.recordDate,
      age: rAge,
      actual: r.weight.toFixed(2),
      standard: stdW.toFixed(2),
      deviation: (dev * 100).toFixed(1),
      isWarning: isWarningPoint
    }
  }

  function hideTooltip() {
    tooltipData = null
  }

  function drawChart() {
    if (!svgContainer || curvePoints.length === 0) return

    const container = svgContainer.parentElement
    const width = container.clientWidth
    const height = 360
    const padding = { top: 30, right: 30, bottom: 50, left: 60 }

    const maxAge = Math.max(...curvePoints.map(p => p.age), age + 10)
    const maxWeight = Math.max(
      ...curvePoints.map(p => p.weight),
      ...weightRecords.map(r => r.weight),
      1
    ) * 1.1

    const xScale = (ageV) => padding.left + (ageV / maxAge) * (width - padding.left - padding.right)
    const yScale = (weightV) => height - padding.bottom - (weightV / maxWeight) * (height - padding.top - padding.bottom)

    let svg = ''

    svg += `<rect width="${width}" height="${height}" fill="white"/>`

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i * (height - padding.top - padding.bottom)) / 5
      const w = maxWeight - (i * maxWeight) / 5
      svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#eee" stroke-dasharray="3,3"/>`
      svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="#999" font-size="11">${w.toFixed(0)}</text>`
    }

    const xStep = Math.ceil(maxAge / 50) * 10 || 30
    for (let x = 0; x <= maxAge; x += xStep) {
      const xPos = xScale(x)
      svg += `<line x1="${xPos}" y1="${padding.top}" x2="${xPos}" y2="${height - padding.bottom}" stroke="#f5f5f5"/>`
      svg += `<text x="${xPos}" y="${height - padding.bottom + 20}" text-anchor="middle" fill="#999" font-size="11">${x}天</text>`
    }

    let standardPath = ''
    curvePoints.forEach((p, i) => {
      const x = xScale(p.age)
      const y = yScale(p.weight)
      standardPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
    })
    svg += `<path d="${standardPath}" fill="none" stroke="#4caf50" stroke-width="2.5" stroke-dasharray="6,3"/>`

    if (weightRecords.length > 0) {
      const sorted = [...weightRecords].sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))
      let actualPath = ''
      sorted.forEach((r, i) => {
        const rAge = calculateAgeDays(livestock.birthDate, r.recordDate)
        const x = xScale(rAge)
        const y = yScale(r.weight)
        actualPath += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`

        const stdW = getStandardWeight(livestock.breed, rAge)
        const dev = calculateDeviation(r.weight, stdW)
        const config = BREED_CONFIG[livestock?.breed] || BREED_CONFIG['地方品种']
        const pointWarning = checkWarning(dev, config.warningThreshold)

        if (pointWarning) {
          svg += `<circle cx="${x}" cy="${y}" r="12" fill="rgba(244,67,54,0.15)" stroke="none" data-point="${i}"/>`
          svg += `<polygon points="${x},${y - 10} ${x + 8},${y + 6} ${x - 8},${y + 6}" fill="#f44336" stroke="white" stroke-width="2" data-point="${i}"/>`
          svg += `<text x="${x}" y="${y - 16}" text-anchor="middle" fill="#f44336" font-size="10" font-weight="bold">⚠</text>`
        } else {
          svg += `<circle cx="${x}" cy="${y}" r="5" fill="#2196f3" stroke="white" stroke-width="2" data-point="${i}"/>`
        }
      })
      if (sorted.length >= 2) {
        svg += `<path d="${actualPath}" fill="none" stroke="#2196f3" stroke-width="2"/>`
      }
    }

    if (age > 0) {
      const xToday = xScale(age)
      svg += `<line x1="${xToday}" y1="${padding.top}" x2="${xToday}" y2="${height - padding.bottom}" stroke="#ff9800" stroke-width="1.5" stroke-dasharray="4,2"/>`
      svg += `<text x="${xToday}" y="${padding.top - 8}" text-anchor="middle" fill="#ff9800" font-size="11" font-weight="bold">今天 (${age}天)</text>`
    }

    svg += `<text x="${width / 2}" y="${height - 10}" text-anchor="middle" fill="#666" font-size="12">日龄 (天)</text>`
    svg += `<text transform="rotate(-90, 18, ${height / 2})" x="18" y="${height / 2}" text-anchor="middle" fill="#666" font-size="12">体重 (kg)</text>`

    svgContainer.innerHTML = svg
    svgContainer.setAttribute('viewBox', `0 0 ${width} ${height}`)

    svgContainer.querySelectorAll('[data-point]').forEach(el => {
      el.style.cursor = 'pointer'
      el.addEventListener('mouseenter', () => {
        const idx = parseInt(el.getAttribute('data-point'))
        const sorted = [...weightRecords].sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))
        if (sorted[idx]) {
          const rAge = calculateAgeDays(livestock.birthDate, sorted[idx].recordDate)
          showPointTooltip(rAge, sorted[idx])
        }
      })
      el.addEventListener('mouseleave', hideTooltip)
    })
  }
</script>

{#if !livestock}
  <div class="empty-state">
    <div class="empty-icon">📈</div>
    <p>请从档案列表中选择一只牲畜查看生长数据</p>
  </div>
{:else}
  <div class="growth-container">
    {#if isWarning}
      <div class="alert alert-danger">
        <strong>⚠ 生长预警</strong> 当前体重低于标准曲线超过阈值，请关注饲料与健康状况！
      </div>
    {/if}

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">当前日龄</div>
        <div class="stat-value">{age} 天</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">标准体重</div>
        <div class="stat-value">{currentStandardWeight.toFixed(2)} kg</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">最新实测</div>
        <div class="stat-value">
          {#if weightRecords.length > 0}
            {[...weightRecords].sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate))[0].weight.toFixed(2)} kg
          {:else}
            --
          {/if}
        </div>
      </div>
      <div class="stat-card {fcrStats?.isWarning ? 'warning' : ''}">
        <div class="stat-label">料肉比 (FCR)</div>
        <div class="stat-value">
          {#if fcrStats?.fcr}
            {fcrStats.fcr.toFixed(2)}
            <span class="stat-sub">标准: {fcrStats.standardFCR}</span>
          {:else}
            --
          {/if}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">日增重</div>
        <div class="stat-value">
          {#if fcrStats?.dailyGain}
            {(fcrStats.dailyGain * 1000).toFixed(1)} g
          {:else}
            --
          {/if}
        </div>
      </div>
      <div class="stat-card {deviation < -0.1 ? 'warning' : ''}">
        <div class="stat-label">曲线偏离度</div>
        <div class="stat-value">
          {#if deviation !== null}
            {(deviation * 100).toFixed(1)}%
          {:else}
            --
          {/if}
        </div>
      </div>
    </div>

    <div class="panel chart-panel">
      <div class="panel-header">
        <h3>Gompertz 生长曲线对标</h3>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-color" style="background:#4caf50"></span>标准曲线</span>
          <span class="legend-item"><span class="legend-color" style="background:#2196f3"></span>实测数据</span>
          <span class="legend-item"><span class="legend-color" style="background:#f44336"></span>预警点 (偏离超阈值)</span>
        </div>
      </div>
      <div class="chart-container">
        <svg bind:this={svgContainer} class="growth-chart" role="img" aria-label="生长曲线图" on:mousemove={handleSvgMouseMove}></svg>
        {#if tooltipData}
          <div class="chart-tooltip" bind:this={tooltipEl}>
            <div class="tip-date">{tooltipData.date}</div>
            <div class="tip-row"><span>日龄:</span><span>{tooltipData.age} 天</span></div>
            <div class="tip-row"><span>实测体重:</span><span class="tip-val">{tooltipData.actual} kg</span></div>
            <div class="tip-row"><span>标准体重:</span><span>{tooltipData.standard} kg</span></div>
            <div class="tip-row tip-deviation">
              <span>偏离差异:</span>
              <span class={tooltipData.isWarning ? 'text-danger' : (parseFloat(tooltipData.deviation) < 0 ? 'text-warning' : 'text-success')}>
                {tooltipData.deviation}%
              </span>
            </div>
            {#if tooltipData.isWarning}
              <div class="tip-warning">⚠ 触发生长预警</div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="records-section">
      <div class="panel">
        <div class="panel-header">
          <h3>体重记录 ({weightRecords.length})</h3>
          <button class="btn btn-primary btn-sm" on:click={() => showWeightForm = !showWeightForm}>
            {showWeightForm ? '取消' : '+ 录入体重'}
          </button>
        </div>

        {#if showWeightForm}
          <div class="inline-form">
            <label for="gw-date">日期:</label>
            <input id="gw-date" type="date" bind:value={newWeight.recordDate} />
            <label for="gw-weight">体重 (kg):</label>
            <input id="gw-weight" type="number" step="0.01" bind:value={newWeight.weight} />
            <button class="btn btn-primary" on:click={saveWeight}>保存</button>
          </div>
        {/if}

        <div class="record-list">
          {#if weightRecords.length === 0}
            <p class="empty-text">暂无体重记录</p>
          {:else}
            <table class="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>日龄</th>
                  <th>实测体重</th>
                  <th>标准体重</th>
                  <th>偏离度</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {#each sortedWeightRecords as r}
                  <tr class:warning-row={r.isW}>
                    <td>{r.recordDate}</td>
                    <td>{r.rAge}天</td>
                    <td class="strong">{r.weight.toFixed(2)} kg</td>
                    <td>{r.stdW.toFixed(2)} kg</td>
                    <td class={r.isW ? 'text-danger' : (r.dev < 0 ? 'text-warning' : 'text-success')}>
                      {(r.dev * 100).toFixed(1)}%
                    </td>
                    <td>
                      <button class="link-btn danger" on:click={() => deleteWeight(r.id)}>删除</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3>饲料消耗记录 ({feedRecords.length})</h3>
          <button class="btn btn-primary btn-sm" on:click={() => showFeedForm = !showFeedForm}>
            {showFeedForm ? '取消' : '+ 录入饲料'}
          </button>
        </div>

        {#if showFeedForm}
          <div class="inline-form">
            <label for="gf-date">日期:</label>
            <input id="gf-date" type="date" bind:value={newFeed.recordDate} />
            <label for="gf-amount">投喂量 (kg):</label>
            <input id="gf-amount" type="number" step="0.01" bind:value={newFeed.feedAmount} />
            <label for="gf-notes">备注:</label>
            <input id="gf-notes" type="text" bind:value={newFeed.notes} />
            <button class="btn btn-primary" on:click={saveFeed}>保存</button>
          </div>
        {/if}

        <div class="record-list">
          {#if feedRecords.length === 0}
            <p class="empty-text">暂无饲料记录</p>
          {:else}
            <table class="data-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>投喂量</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {#each [...feedRecords].sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate)) as r}
                  <tr>
                    <td>{r.recordDate}</td>
                    <td class="strong">{r.feedAmount.toFixed(2)} kg</td>
                    <td>{r.notes || '-'}</td>
                    <td>
                      <button class="link-btn danger" on:click={() => deleteFeed(r.id)}>删除</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <div class="total-feed">
              累计投喂: <strong>{feedRecords.reduce((s, r) => s + r.feedAmount, 0).toFixed(2)} kg</strong>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="action-bar">
      <button class="btn btn-primary btn-large" on:click={exportReport}>
        📄 导出 PDF 生产报表
      </button>
    </div>
  </div>
{/if}

<style>
  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: var(--text-light);
    background: var(--card-bg);
    border-radius: 12px;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .growth-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .alert {
    padding: 16px 20px;
    border-radius: 8px;
    font-size: 14px;
  }

  .alert-danger {
    background: #ffebee;
    color: #c62828;
    border: 1px solid #ffcdd2;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
  }

  .stat-card {
    background: var(--card-bg);
    padding: 20px;
    border-radius: 10px;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--primary);
  }

  .stat-card.warning {
    border-left-color: var(--danger);
    background: #fff8f8;
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-light);
    margin-bottom: 8px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
  }

  .stat-sub {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-light);
    margin-left: 6px;
  }

  .panel {
    background: var(--card-bg);
    border-radius: 10px;
    padding: 20px;
    box-shadow: var(--shadow);
  }

  .chart-panel {
    padding: 24px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .panel-header h3 {
    font-size: 16px;
    color: var(--text);
  }

  .chart-legend {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--text-light);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-color {
    width: 16px;
    height: 3px;
    border-radius: 2px;
  }

  .chart-container {
    width: 100%;
    overflow-x: auto;
    position: relative;
  }

  .growth-chart {
    width: 100%;
    height: 360px;
  }

  .chart-tooltip {
    position: absolute;
    background: rgba(33, 33, 33, 0.92);
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 12px;
    pointer-events: none;
    z-index: 100;
    min-width: 180px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  }

  .tip-date {
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.2);
  }

  .tip-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 2px 0;
  }

  .tip-row span:first-child {
    color: rgba(255,255,255,0.7);
  }

  .tip-val {
    font-weight: 700;
    color: #64b5f6;
  }

  .tip-deviation span:last-child {
    font-weight: 700;
  }

  .tip-warning {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid rgba(244,67,54,0.4);
    color: #ef5350;
    font-weight: 700;
    text-align: center;
  }

  .records-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 900px) {
    .records-section {
      grid-template-columns: 1fr;
    }
  }

  .inline-form {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    align-items: center;
  }

  .inline-form label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-light);
  }

  .inline-form input {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-dark);
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-large {
    padding: 14px 32px;
    font-size: 15px;
  }

  .record-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .empty-text {
    color: var(--text-light);
    text-align: center;
    padding: 30px;
    font-size: 14px;
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
  }

  .data-table th {
    background: #f8f9fa;
    font-weight: 600;
    color: var(--text-light);
  }

  .data-table tr:hover {
    background: #fafafa;
  }

  .data-table tr.warning-row {
    background: #fff5f5;
  }

  .strong {
    font-weight: 600;
  }

  .text-danger {
    color: var(--danger);
    font-weight: 600;
  }

  .text-warning {
    color: #ff9800;
  }

  .text-success {
    color: var(--primary);
  }

  .link-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    padding: 4px 8px;
  }

  .link-btn.danger {
    color: var(--danger);
  }

  .link-btn.danger:hover {
    text-decoration: underline;
  }

  .total-feed {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 2px solid var(--primary);
    text-align: right;
    font-size: 14px;
    color: var(--text-light);
  }

  .total-feed strong {
    color: var(--primary);
    font-size: 16px;
  }

  .action-bar {
    display: flex;
    justify-content: center;
    padding: 20px;
  }
</style>
