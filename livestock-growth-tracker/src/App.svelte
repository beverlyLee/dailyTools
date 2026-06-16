<script>
  import { onMount } from 'svelte'
  import { STORES, getAll } from './lib/db.js'
  import LivestockList from './components/LivestockList.svelte'
  import LivestockForm from './components/LivestockForm.svelte'
  import GrowthTracker from './components/GrowthTracker.svelte'
  import VaccineCenter from './components/VaccineCenter.svelte'
  import ReportCenter from './components/ReportCenter.svelte'
  import ValidationPanel from './components/ValidationPanel.svelte'

  let activeTab = 'livestock'
  let livestockList = []
  let selectedLivestock = null
  let showForm = false

  const tabs = [
    { id: 'livestock', label: '个体电子档案', icon: '🐷' },
    { id: 'growth', label: '生长模型对标', icon: '📈' },
    { id: 'vaccine', label: '免疫中心', icon: '💉' },
    { id: 'report', label: '报表中心', icon: '📊' },
    { id: 'validation', label: '系统验证', icon: '✅' }
  ]

  async function loadLivestock() {
    livestockList = await getAll(STORES.LIVESTOCK)
  }

  function selectLivestock(livestock) {
    selectedLivestock = livestock
    if (livestock) {
      activeTab = 'growth'
    }
  }

  function handleFormClose() {
    showForm = false
    loadLivestock()
  }

  function handleLivestockSaved() {
    showForm = false
    loadLivestock()
  }

  onMount(() => {
    loadLivestock()
  })
</script>

<div class="app-container">
  <header class="app-header">
    <div class="header-content">
      <h1>🐖 牲畜生长数字化管理系统</h1>
      <p class="subtitle">规模化养殖场精准管理 · FCR计算 · 生长预警</p>
    </div>
  </header>

  <nav class="tab-nav">
    {#each tabs as tab}
      <button
        class="tab-btn {activeTab === tab.id ? 'active' : ''}"
        on:click={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    {/each}
  </nav>

  <main class="main-content">
    {#if activeTab === 'livestock'}
      <div class="tab-content">
        <div class="content-header">
          <h2>个体电子档案管理</h2>
          <button class="btn btn-primary" on:click={() => showForm = true}>
            + 新建档案
          </button>
        </div>
        {#if showForm}
          <LivestockForm on:close={handleFormClose} on:saved={handleLivestockSaved} />
        {:else}
          <LivestockList
            {livestockList}
            on:select={(e) => selectLivestock(e.detail)}
            on:refresh={loadLivestock}
          />
        {/if}
      </div>
    {:else if activeTab === 'growth'}
      <div class="tab-content">
        <div class="content-header">
          <h2>生长模型对标</h2>
          <select
            class="livestock-select"
            bind:value={selectedLivestock}
            on:change={(e) => selectedLivestock = e.target.value ? livestockList.find(l => l.id == e.target.value) : null}
          >
            <option value={null}>-- 选择牲畜 --</option>
            {#each livestockList as l}
              <option value={l.id}>{l.earTag} - {l.breed}</option>
            {/each}
          </select>
        </div>
        <GrowthTracker livestock={selectedLivestock} />
      </div>
    {:else if activeTab === 'vaccine'}
      <div class="tab-content">
        <div class="content-header">
          <h2>免疫与接种管理</h2>
        </div>
        <VaccineCenter {livestockList} />
      </div>
    {:else if activeTab === 'report'}
      <div class="tab-content">
        <div class="content-header">
          <h2>生产报表中心</h2>
        </div>
        <ReportCenter {livestockList} />
      </div>
    {:else if activeTab === 'validation'}
      <div class="tab-content">
        <div class="content-header">
          <h2>系统验证</h2>
        </div>
        <ValidationPanel on:dataLoaded={loadLivestock} />
      </div>
    {/if}
  </main>
</div>

<style>
  .app-container {
    min-height: 100vh;
    background: var(--bg);
  }

  .app-header {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    padding: 24px 32px;
    box-shadow: var(--shadow);
  }

  .header-content h1 {
    font-size: 24px;
    margin-bottom: 4px;
  }

  .subtitle {
    opacity: 0.9;
    font-size: 14px;
  }

  .tab-nav {
    display: flex;
    background: var(--card-bg);
    padding: 0 24px;
    gap: 4px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-light);
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: var(--primary);
    background: rgba(46, 125, 50, 0.05);
  }

  .tab-btn.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    font-weight: 600;
  }

  .tab-icon {
    font-size: 18px;
  }

  .main-content {
    padding: 24px 32px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .content-header h2 {
    font-size: 20px;
    color: var(--text);
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
  }

  .livestock-select {
    padding: 10px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    background: var(--card-bg);
    min-width: 240px;
  }
</style>
