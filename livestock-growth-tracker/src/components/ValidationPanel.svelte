<script>
  import { createEventDispatcher } from 'svelte'
  import { STORES, add, getAll, remove } from '../lib/db.js'
  import {
    generateMockLivestock,
    generateMockWeightRecords,
    generateMockFeedRecords,
    generateMockVaccineRecords,
    generateValidationData
  } from '../lib/mockData.js'
  import {
    calculateAgeDays,
    getStandardWeight,
    calculateFCRBetweenRecords,
    calculateDeviation,
    checkWarning,
    BREED_CONFIG
  } from '../lib/growthModel.js'

  const dispatch = createEventDispatcher()

  let isGenerating = false
  let isClearing = false
  let validationResults = []
  let showResults = false
  let livestockCount = 10
  let includeSlowGrowth = true

  async function generateMockData() {
    isGenerating = true
    try {
      const livestockList = generateMockLivestock(livestockCount)
      let slowCount = 0

      for (let i = 0; i < livestockList.length; i++) {
        const isSlow = includeSlowGrowth && (i % 3 === 0)
        if (isSlow) slowCount++

        const livestockId = await add(STORES.LIVESTOCK, livestockList[i])

        const weights = generateMockWeightRecords(
          livestockId,
          livestockList[i].birthDate,
          livestockList[i].breed,
          isSlow
        )
        for (const w of weights) {
          await add(STORES.WEIGHT_RECORDS, w)
        }

        const feeds = generateMockFeedRecords(livestockId, livestockList[i].birthDate, weights)
        for (const f of feeds) {
          await add(STORES.FEED_RECORDS, f)
        }

        const vaccines = generateMockVaccineRecords(livestockId, livestockList[i].birthDate, livestockList[i].breed)
        for (const v of vaccines) {
          await add(STORES.VACCINE_RECORDS, v)
        }
      }

      alert(`成功生成 ${livestockCount} 条模拟数据，其中 ${slowCount} 条为生长迟缓个体。`)
      dispatch('dataLoaded')
    } catch (err) {
      alert('生成失败: ' + err.message)
    } finally {
      isGenerating = false
    }
  }

  async function clearAllData() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return

    isClearing = true
    try {
      const livestock = await getAll(STORES.LIVESTOCK)
      const weights = await getAll(STORES.WEIGHT_RECORDS)
      const feeds = await getAll(STORES.FEED_RECORDS)
      const vaccines = await getAll(STORES.VACCINE_RECORDS)

      for (const l of livestock) await remove(STORES.LIVESTOCK, l.id)
      for (const w of weights) await remove(STORES.WEIGHT_RECORDS, w.id)
      for (const f of feeds) await remove(STORES.FEED_RECORDS, f.id)
      for (const v of vaccines) await remove(STORES.VACCINE_RECORDS, v.id)

      alert('所有数据已清空')
      dispatch('dataLoaded')
    } catch (err) {
      alert('清空失败: ' + err.message)
    } finally {
      isClearing = false
    }
  }

  async function runValidation() {
    showResults = false
    validationResults = []

    const livestock = await getAll(STORES.LIVESTOCK)
    const weights = await getAll(STORES.WEIGHT_RECORDS)
    const feeds = await getAll(STORES.FEED_RECORDS)

    if (livestock.length === 0 || weights.length < 2) {
      alert('数据不足，请先生成模拟数据或录入记录')
      return
    }

    for (const l of livestock) {
      const lWeights = weights
        .filter(r => r.livestockId === l.id)
        .sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))
      const lFeeds = feeds.filter(r => r.livestockId === l.id)

      const age = calculateAgeDays(l.birthDate)
      const config = BREED_CONFIG[l.breed] || BREED_CONFIG['地方品种']

      let fcrResult = null
      let latestWeight = null
      let deviation = null
      let isWarning = false

      if (lWeights.length > 0) {
        latestWeight = lWeights[lWeights.length - 1].weight
        const standardWeight = getStandardWeight(l.breed, calculateAgeDays(l.birthDate, lWeights[lWeights.length - 1].recordDate))
        deviation = calculateDeviation(latestWeight, standardWeight)
        isWarning = checkWarning(deviation, config.warningThreshold)
      }

      if (lWeights.length >= 2 && lFeeds.length > 0) {
        fcrResult = calculateFCRBetweenRecords(
          lWeights,
          lFeeds,
          lWeights[0].recordDate,
          lWeights[lWeights.length - 1].recordDate
        )
      }

      const fcrValid = fcrResult && fcrResult.fcr > 1.5 && fcrResult.fcr < 10
      const deviationValid = deviation !== null && !isNaN(deviation)
      const warningLogicValid = (deviation < -config.warningThreshold) === isWarning
      validationResults.push({
        earTag: l.earTag,
        breed: l.breed,
        age,
        latestWeight,
        deviation,
        isWarning,
        fcr: fcrResult?.fcr,
        standardFCR: config.standardFCR,
        dailyGain: fcrResult?.dailyGain,
        weightGain: fcrResult?.weightGain,
        totalFeed: fcrResult?.totalFeed,
        fcrValid,
        deviationValid,
        warningLogicValid,
        allPass: fcrValid && deviationValid && warningLogicValid
      })
    }

    showResults = true
  }

  $: if (validationResults.length > 0) {
    const passed = validationResults.filter(r => r.fcrValid && r.deviationValid && r.warningLogicValid).length
    const total = validationResults.length
    validationPassRate = total > 0 ? (passed / total * 100).toFixed(1) : 0
  }

  let validationPassRate = 0

  const testCases = generateValidationData()
</script>

<div class="validation-container">
  <div class="panel">
    <div class="panel-header">
      <h3>🎯 数据生成工具</h3>
    </div>
    <p class="panel-desc">快速生成模拟数据用于验证系统功能，包括牲畜档案、体重记录、饲料消耗和免疫记录。</p>

    <div class="options-row">
      <div class="option-item">
        <label for="v-count">生成数量:</label>
        <input id="v-count" type="number" min="1" max="100" bind:value={livestockCount} />
      </div>
      <div class="option-item">
        <label for="v-slow">
          <input id="v-slow" type="checkbox" bind:checked={includeSlowGrowth} />
          包含生长迟缓个体 (约1/3)
        </label>
      </div>
    </div>

    <div class="actions-row">
      <button
        class="btn btn-primary btn-large"
        on:click={generateMockData}
        disabled={isGenerating}
      >
        {isGenerating ? '生成中...' : '📊 生成模拟数据'}
      </button>
      <button
        class="btn btn-danger btn-large"
        on:click={clearAllData}
        disabled={isClearing}
      >
        {isClearing ? '清空中...' : '🗑️ 清空所有数据'}
      </button>
    </div>
  </div>

  <div class="panel">
    <div class="panel-header">
      <h3>✅ 系统验证</h3>
    </div>
    <p class="panel-desc">运行验证测试，检查系统是否准确计算FCR、识别生长偏离和触发预警。</p>

    <div class="test-cases">
      <h4>预设验证场景:</h4>
      <div class="cases-grid">
        {#each testCases as tc}
          <div class="case-card">
            <div class="case-name">{tc.name}</div>
            <div class="case-details">
              <span>品种: {tc.breed}</span>
              <span>日龄: {tc.ageDays}天</span>
              <span>预期FCR: {tc.expectedFCRRange[0]}-{tc.expectedFCRRange[1]}</span>
              <span>预期偏离: {(tc.deviationRange[0] * 100).toFixed(0)}% ~ {(tc.deviationRange[1] * 100).toFixed(0)}%</span>
              <span>预警: {tc.shouldWarning ? '是' : '否'}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="actions-row">
      <button class="btn btn-success btn-large" on:click={runValidation}>
        🔍 运行验证测试
      </button>
    </div>
  </div>

  {#if showResults && validationResults.length > 0}
    <div class="panel results-panel">
      <div class="panel-header">
        <h3>📋 验证结果</h3>
        <div class="summary-badge {validationPassRate >= 80 ? 'pass' : 'fail'}">
          通过率: {validationPassRate}%
        </div>
      </div>

      <div class="summary-stats">
        <div class="stat">
          <span class="stat-label">测试总数</span>
          <span class="stat-value">{validationResults.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">FCR计算有效</span>
          <span class="stat-value success">{validationResults.filter(r => r.fcrValid).length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">偏离度计算有效</span>
          <span class="stat-value success">{validationResults.filter(r => r.deviationValid).length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">预警逻辑正确</span>
          <span class="stat-value success">{validationResults.filter(r => r.warningLogicValid).length}</span>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>耳标</th>
              <th>品种</th>
              <th>日龄</th>
              <th>体重</th>
              <th>偏离度</th>
              <th>FCR</th>
              <th>标准FCR</th>
              <th>日增重</th>
              <th>预警</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {#each validationResults as r}
              <tr class={r.allPass ? 'pass-row' : 'fail-row'}>
                <td><strong>{r.earTag}</strong></td>
                <td>{r.breed}</td>
                <td>{r.age}天</td>
                <td>{r.latestWeight ? r.latestWeight.toFixed(1) + 'kg' : '--'}</td>
                <td class={r.deviation < -0.15 ? 'text-danger' : ''}>
                  {r.deviation !== null ? (r.deviation * 100).toFixed(1) + '%' : '--'}
                </td>
                <td class={r.fcr > r.standardFCR * 1.2 ? 'text-danger' : ''}>
                  {r.fcr ? r.fcr.toFixed(2) : '--'}
                </td>
                <td>{r.standardFCR}</td>
                <td>{r.dailyGain ? (r.dailyGain * 1000).toFixed(0) + 'g' : '--'}</td>
                <td>
                  {#if r.isWarning}
                    <span class="tag-danger">⚠ 触发</span>
                  {:else}
                    <span class="tag-success">正常</span>
                  {/if}
                </td>
                <td>
                  {#if r.allPass}
                    <span class="result-pass">✓ 通过</span>
                  {:else}
                    <span class="result-fail">✗ 异常</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .validation-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    margin-bottom: 12px;
  }

  .panel-header h3 {
    font-size: 16px;
    color: var(--text);
  }

  .panel-desc {
    color: var(--text-light);
    font-size: 14px;
    margin-bottom: 20px;
  }

  .options-row {
    display: flex;
    gap: 32px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .option-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }

  .option-item input[type="number"] {
    width: 80px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .option-item label {
    font-weight: 500;
  }

  .actions-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-dark);
  }

  .btn-success {
    background: #2e7d32;
    color: white;
  }

  .btn-success:hover {
    background: #1b5e20;
  }

  .btn-danger {
    background: var(--danger);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #d32f2f;
  }

  .btn-large {
    padding: 14px 32px;
    font-size: 15px;
  }

  .test-cases {
    margin: 20px 0;
  }

  .test-cases h4 {
    font-size: 14px;
    color: var(--text);
    margin-bottom: 12px;
  }

  .cases-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }

  .case-card {
    background: #f8f9fa;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px;
  }

  .case-name {
    font-weight: 600;
    color: var(--primary-dark);
    margin-bottom: 8px;
    font-size: 14px;
  }

  .case-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-light);
  }

  .results-panel {
    border: 2px solid var(--primary-light);
  }

  .summary-badge {
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 700;
  }

  .summary-badge.pass {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .summary-badge.fail {
    background: #ffebee;
    color: #c62828;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-light);
  }

  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
  }

  .stat-value.success {
    color: var(--primary);
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
  }

  .data-table tr.pass-row {
    background: #f1f8e9;
  }

  .data-table tr.fail-row {
    background: #ffebee;
  }

  .text-danger {
    color: var(--danger);
    font-weight: 600;
  }

  .tag-danger {
    background: #ffebee;
    color: #c62828;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
  }

  .tag-success {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
  }

  .result-pass {
    color: #2e7d32;
    font-weight: 700;
    font-size: 14px;
  }

  .result-fail {
    color: #c62828;
    font-weight: 700;
    font-size: 14px;
  }
</style>
