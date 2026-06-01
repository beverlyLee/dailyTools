<script>
  import { onMount } from 'svelte'
  import MapVisualization from './components/MapVisualization.svelte'
  
  let cities = []
  let loading = true
  let error = null

  onMount(async () => {
    try {
      const response = await fetch('/api/cities')
      if (!response.ok) throw new Error('获取数据失败')
      cities = await response.json()
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  })
</script>

<div class="app">
  <header class="header">
    <div class="header-content">
      <h1>🏪 中国城市便利店发展指数</h1>
      <p class="subtitle">15分钟生活圈便利度可视化分析平台</p>
    </div>
  </header>

  <main class="main-content">
    <div class="map-section">
      {#if loading}
        <div class="loading">
          <div class="spinner"></div>
          <p>正在加载数据...</p>
        </div>
      {:else if error}
        <div class="error">
          <p>⚠️ {error}</p>
        </div>
      {:else}
        <MapVisualization {cities} />
      {/if}
    </div>

    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>🏆 城市排名</h2>
        <p class="sidebar-subtitle">按每万人便利店数量排序</p>
      </div>
      
      <div class="ranking-list">
        {#each cities.slice(0, 15) as city, i}
          <div class="ranking-item" class:top3={i < 3}>
            <span class="rank-number">{city.rank}</span>
            <div class="city-info">
              <span class="city-name">{city.city_name}</span>
              <span class="city-province">{city.province}</span>
            </div>
            <div class="density-info">
              <span class="density-value">{city.density_per_10k}</span>
              <span class="density-unit">/万人</span>
            </div>
          </div>
        {/each}
      </div>
      
      <div class="sidebar-footer">
        <p>数据来源：中国连锁经营协会</p>
      </div>
    </aside>
  </main>

  <footer class="footer">
    <p>© 2024 中国城市便利店发展指数可视化平台 | 数据更新时间：2024年</p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .header {
    background: rgba(255, 255, 255, 0.98);
    padding: 20px 40px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
  }

  .header h1 {
    font-size: 26px;
    color: #1a1a2e;
    margin-bottom: 6px;
    font-weight: 700;
  }

  .subtitle {
    font-size: 14px;
    color: #666;
  }

  .main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 24px;
    padding: 24px 40px;
    max-width: 1480px;
    margin: 0 auto;
    width: 100%;
  }

  .map-section {
    background: rgba(255, 255, 255, 0.98);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    padding: 24px;
    min-height: 600px;
    position: relative;
  }

  .loading, .error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #666;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .sidebar {
    background: rgba(255, 255, 255, 0.98);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    padding: 24px;
    height: fit-content;
  }

  .sidebar-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #f0f0f0;
  }

  .sidebar-header h2 {
    font-size: 20px;
    color: #1a1a2e;
    margin-bottom: 6px;
    font-weight: 700;
  }

  .sidebar-subtitle {
    font-size: 12px;
    color: #888;
  }

  .ranking-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 480px;
    overflow-y: auto;
    padding-right: 8px;
  }

  .ranking-list::-webkit-scrollbar {
    width: 4px;
  }

  .ranking-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  .ranking-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  .ranking-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    border-radius: 10px;
    background: #f8f9fa;
    transition: all 0.3s ease;
  }

  .ranking-item:hover {
    background: #e9ecef;
    transform: translateX(4px);
  }

  .ranking-item.top3 {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .rank-number {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #dee2e6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 15px;
    color: #495057;
  }

  .ranking-item.top3 .rank-number {
    background: rgba(255, 255, 255, 0.3);
    color: white;
  }

  .city-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .city-name {
    font-weight: 600;
    font-size: 15px;
  }

  .city-province {
    font-size: 11px;
    opacity: 0.7;
  }

  .density-info {
    text-align: right;
  }

  .density-value {
    font-weight: 700;
    font-size: 16px;
    display: block;
  }

  .density-unit {
    font-size: 10px;
    opacity: 0.7;
  }

  .sidebar-footer {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 2px solid #f0f0f0;
    text-align: center;
  }

  .sidebar-footer p {
    font-size: 11px;
    color: #999;
  }

  .footer {
    background: rgba(255, 255, 255, 0.95);
    padding: 16px 40px;
    text-align: center;
    color: #666;
    font-size: 12px;
  }
</style>
