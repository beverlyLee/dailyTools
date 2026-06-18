<script>
  import FeedingSchedule from './components/FeedingSchedule.svelte'
  import WeatherPanel from './components/WeatherPanel.svelte'
  import FCRCalculator from './components/FCRCalculator.svelte'

  let activeTab = 'schedule'

  const tabs = [
    { id: 'schedule', name: '投饲日程', icon: '⏰' },
    { id: 'weather', name: '气象联动', icon: '🌤️' },
    { id: 'fcr', name: '饵料核算', icon: '📊' },
  ]
</script>

<div class="app">
  <header class="app-header">
    <div class="header-content">
      <h1 class="app-title">
        <span class="title-icon">🐟</span>
        水产投喂智能调度工具
      </h1>
      <p class="app-subtitle">智能投喂 · 科学养殖 · 降本增效</p>
    </div>
  </header>

  <nav class="tabs">
    {#each tabs as tab (tab.id)}
      <button 
        class="tab-btn"
        class:active={activeTab === tab.id}
        on:click={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-name">{tab.name}</span>
      </button>
    {/each}
  </nav>

  <main class="app-main">
    <div class="content-wrapper">
      {#if activeTab === 'schedule'}
        <FeedingSchedule />
      {:else if activeTab === 'weather'}
        <WeatherPanel />
      {:else if activeTab === 'fcr'}
        <FCRCalculator />
      {/if}
    </div>
  </main>

  <footer class="app-footer">
    <p>水产投喂智能调度系统 v1.0</p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #e8f4ea 0%, #d8f3dc 50%, #b7e4c7 100%);
  }

  .app-header {
    background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%);
    color: white;
    padding: 32px 24px;
    text-align: center;
  }

  .header-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .app-title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .title-icon {
    font-size: 36px;
  }

  .app-subtitle {
    margin: 8px 0 0 0;
    font-size: 15px;
    opacity: 0.9;
  }

  .tabs {
    display: flex;
    justify-content: center;
    gap: 8px;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .tab-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 28px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #666;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    background: #f0fff4;
    color: #2d6a4f;
  }

  .tab-btn.active {
    background: #2d6a4f;
    color: white;
  }

  .tab-icon {
    font-size: 24px;
  }

  .tab-name {
    font-weight: 500;
  }

  .app-main {
    flex: 1;
    padding: 24px;
    display: flex;
    justify-content: center;
  }

  .content-wrapper {
    width: 100%;
    max-width: 600px;
  }

  .app-footer {
    text-align: center;
    padding: 20px;
    color: #666;
    font-size: 13px;
  }

  .app-footer p {
    margin: 0;
  }

  @media (max-width: 600px) {
    .app-title {
      font-size: 22px;
    }

    .tab-btn {
      padding: 10px 18px;
    }

    .content-wrapper {
      max-width: 100%;
    }
  }
</style>
