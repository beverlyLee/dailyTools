<script>
  import { onMount, createEventDispatcher } from 'svelte'
  import { STORES, remove, getByIndex, getAll } from '../lib/db.js'
  import { calculateAgeDays, getStandardWeight, checkWarning, calculateDeviation, BREED_CONFIG } from '../lib/growthModel.js'

  export let livestockList = []
  let searchTerm = ''
  let filterBreed = ''

  const dispatch = createEventDispatcher()
  const breedOptions = Object.keys(BREED_CONFIG)

  $: filteredList = livestockList.filter(l => {
    const matchSearch = !searchTerm ||
      l.earTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.notes && l.notes.includes(searchTerm))
    const matchBreed = !filterBreed || l.breed === filterBreed
    return matchSearch && matchBreed
  })

  async function getLivestockStats(livestock) {
    const weights = await getByIndex(STORES.WEIGHT_RECORDS, 'livestockId', livestock.id)
    const sorted = weights.sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate))
    const latestWeight = sorted[0]
    const age = calculateAgeDays(livestock.birthDate)
    const standard = getStandardWeight(livestock.breed, age)
    const deviation = latestWeight ? calculateDeviation(latestWeight.weight, standard) : null
    const config = BREED_CONFIG[livestock.breed] || BREED_CONFIG['地方品种']
    const isWarning = deviation !== null && checkWarning(deviation, config.warningThreshold)

    return {
      currentWeight: latestWeight ? latestWeight.weight : null,
      age,
      standard,
      deviation,
      isWarning,
      recordCount: weights.length
    }
  }

  async function handleDelete(livestock) {
    if (!confirm(`确定删除 ${livestock.earTag} 的档案吗？相关记录也将被删除。`)) return

    const weights = await getByIndex(STORES.WEIGHT_RECORDS, 'livestockId', livestock.id)
    const feeds = await getByIndex(STORES.FEED_RECORDS, 'livestockId', livestock.id)
    const vaccines = await getByIndex(STORES.VACCINE_RECORDS, 'livestockId', livestock.id)

    for (const w of weights) await remove(STORES.WEIGHT_RECORDS, w.id)
    for (const f of feeds) await remove(STORES.FEED_RECORDS, f.id)
    for (const v of vaccines) await remove(STORES.VACCINE_RECORDS, v.id)

    await remove(STORES.LIVESTOCK, livestock.id)
    dispatch('refresh')
  }

  function selectLivestock(l) {
    dispatch('select', l)
  }

  async function loadStats() {
    for (const l of livestockList) {
      const stats = await getLivestockStats(l)
      l._currentWeight = stats.currentWeight
      l._age = stats.age
      l._standard = stats.standard
      l._deviation = stats.deviation
      l._warning = stats.isWarning
      l._recordCount = stats.recordCount
    }
    livestockList = [...livestockList]
  }

  onMount(() => {
    loadStats()
  })

  $: if (livestockList.length > 0) {
    loadStats()
  }
</script>

<div class="panel">
  <div class="filter-bar">
    <input
      type="text"
      class="search-input"
      placeholder="搜索耳标编号或备注..."
      bind:value={searchTerm}
    />
    <select class="filter-select" bind:value={filterBreed}>
      <option value="">全部品种</option>
      {#each breedOptions as breed}
        <option value={breed}>{breed}</option>
      {/each}
    </select>
    <span class="count-badge">共 {filteredList.length} 条记录</span>
  </div>

  {#if filteredList.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🐷</div>
      <p>暂无牲畜档案，请点击上方"新建档案"按钮添加</p>
    </div>
  {:else}
    <div class="livestock-grid">
      {#each filteredList as livestock (livestock.id)}
        <div class="livestock-card" class:warning={livestock._warning}>
          <div class="card-header">
            <div class="ear-tag">{livestock.earTag}</div>
            {#if livestock._warning}
              <span class="warning-badge">⚠ 生长预警</span>
            {/if}
          </div>
          <div class="card-body">
            <div class="info-row">
              <span class="label">品种</span>
              <span class="value">{livestock.breed}</span>
            </div>
            <div class="info-row">
              <span class="label">出生日期</span>
              <span class="value">{livestock.birthDate}</span>
            </div>
            <div class="info-row">
              <span class="label">日龄</span>
              <span class="value">{livestock._age || '-'} 天</span>
            </div>
            <div class="info-row">
              <span class="label">性别</span>
              <span class="value">{livestock.gender || '-'}</span>
            </div>
            {#if livestock._currentWeight !== null && livestock._currentWeight !== undefined}
              <div class="info-row">
                <span class="label">当前体重</span>
                <span class="value weight">{livestock._currentWeight.toFixed(2)} kg</span>
              </div>
              <div class="info-row">
                <span class="label">标准体重</span>
                <span class="value">{livestock._standard?.toFixed(2)} kg</span>
              </div>
              {#if livestock._deviation !== null}
                <div class="info-row deviation-row" class:negative={livestock._deviation < 0}>
                  <span class="label">偏离度</span>
                  <span class="value">{(livestock._deviation * 100).toFixed(1)}%</span>
                </div>
              {/if}
            {/if}
          </div>
          <div class="card-actions">
            <button class="btn-view" on:click={() => selectLivestock(livestock)}>查看详情</button>
            <button class="btn-delete" on:click={() => handleDelete(livestock)}>删除</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .panel {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 24px;
    box-shadow: var(--shadow);
  }

  .filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    align-items: center;
  }

  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
  }

  .filter-select {
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    background: var(--card-bg);
  }

  .count-badge {
    padding: 6px 12px;
    background: var(--primary);
    color: white;
    border-radius: 20px;
    font-size: 12px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-light);
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .livestock-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .livestock-card {
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.2s;
  }

  .livestock-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .livestock-card.warning {
    border-color: var(--danger);
    background: rgba(244, 67, 54, 0.03);
  }

  .card-header {
    background: var(--primary);
    color: white;
    padding: 14px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .livestock-card.warning .card-header {
    background: var(--danger);
  }

  .ear-tag {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0.5px;
  }

  .warning-badge {
    background: rgba(255, 255, 255, 0.25);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
  }

  .card-body {
    padding: 16px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
  }

  .label {
    color: var(--text-light);
  }

  .value {
    font-weight: 500;
    color: var(--text);
  }

  .value.weight {
    color: var(--primary);
    font-weight: 700;
  }

  .deviation-row.negative .value {
    color: var(--danger);
    font-weight: 700;
  }

  .card-actions {
    display: flex;
    border-top: 1px solid var(--border);
  }

  .btn-view, .btn-delete {
    flex: 1;
    padding: 12px;
    border: none;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-view {
    background: var(--primary-light);
    color: white;
  }

  .btn-view:hover {
    background: var(--primary);
  }

  .btn-delete {
    background: #fafafa;
    color: var(--danger);
    border-left: 1px solid var(--border);
  }

  .btn-delete:hover {
    background: #ffebee;
  }
</style>
