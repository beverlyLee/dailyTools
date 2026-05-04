<script>
  import { onMount } from 'svelte'
  import { dataApi, analysisApi, authApi } from '../lib/api'
  import EvolutionChart from './EvolutionChart.svelte'
  import StatsCard from './StatsCard.svelte'
  import FeatureTrends from './FeatureTrends.svelte'
  import HistoryList from './HistoryList.svelte'

  let activeTab = 'overview'
  let loading = true
  let syncing = false
  let error = null
  let stats = null
  let evolutionData = null
  let history = []

  async function loadData() {
    loading = true
    error = null
    
    try {
      stats = await dataApi.getStats()
      
      if (stats.history_count > 0) {
        try {
          evolutionData = await analysisApi.getEvolution()
        } catch (e) {
          console.log('No evolution data available yet:', e.message)
        }
        
        history = await dataApi.getHistory(50)
      }
    } catch (e) {
      error = e.message
      console.error('Failed to load data:', e)
    } finally {
      loading = false
    }
  }

  async function handleSync(force = false) {
    syncing = true
    error = null
    
    try {
      const result = await dataApi.sync(force, true)
      console.log('Sync result:', result)
      await loadData()
    } catch (e) {
      error = e.message
      console.error('Sync failed:', e)
    } finally {
      syncing = false
    }
  }

  onMount(() => {
    loadData()
  })
</script>

{#if error}
  <div class="error">{error}</div>
{/if}

{#if loading}
  <div class="loading">
    <div class="spinner"></div>
  </div>
{:else}
  <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
    <div>
      <h2 style="margin: 0;">Welcome to your Music Dashboard</h2>
      {#if stats}
        <p style="color: var(--text-secondary); margin-top: 4px;">
          {stats.history_count} tracks analyzed &bull; {stats.features_count} audio features
        </p>
      {/if}
    </div>
    <div style="display: flex; gap: 12px;">
      <button 
        class="btn-secondary" 
        on:click={() => handleSync(false)}
        disabled={syncing}
      >
        {#if syncing}
          <span class="spinner" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 8px;"></span>
        {/if}
        Sync Data
      </button>
      <button 
        class="btn-primary" 
        on:click={() => handleSync(true)}
        disabled={syncing}
      >
        Force Refresh
      </button>
    </div>
  </div>

  {#if stats && stats.history_count === 0}
    <div class="card" style="text-align: center; padding: 60px;">
      <div style="font-size: 64px; margin-bottom: 20px;">🎧</div>
      <h2>No Data Yet</h2>
      <p style="color: var(--text-secondary); margin: 16px 0 32px;">
        Click "Sync Data" to import your listening history from Spotify.
      </p>
      <button class="btn-primary" on:click={() => handleSync(false)} disabled={syncing}>
        {#if syncing}
          Syncing...
        {:else}
          Sync Now
        {/if}
      </button>
    </div>
  {:else}
    <div class="nav-tabs">
      <button 
        class="nav-tab {activeTab === 'overview' ? 'active' : ''}"
        on:click={() => activeTab = 'overview'}
      >
        Overview
      </button>
      <button 
        class="nav-tab {activeTab === 'trends' ? 'active' : ''}"
        on:click={() => activeTab = 'trends'}
      >
        Feature Trends
      </button>
      <button 
        class="nav-tab {activeTab === 'history' ? 'active' : ''}"
        on:click={() => activeTab = 'history'}
      >
        Listening History
      </button>
    </div>

    {#if activeTab === 'overview'}
      {#if evolutionData}
        <div class="stats-grid">
          <StatsCard 
            label="Total Months Analyzed"
            value={evolutionData.total_months}
          />
          <StatsCard 
            label="Total Tracks"
            value={evolutionData.total_tracks}
          />
          <StatsCard 
            label="Time Range"
            value={`${evolutionData.time_range.start.year}/${evolutionData.time_range.start.month} - ${evolutionData.time_range.end.year}/${evolutionData.time_range.end.month}`}
          />
        </div>

        <div class="card">
          <h2>Evolution Over Time</h2>
          <EvolutionChart data={evolutionData.monthly_data} />
        </div>

        {#if evolutionData.overall_top_genres?.length > 0}
          <div class="card">
            <h2>Top Genres</h2>
            <div class="feature-grid">
              {#each evolutionData.overall_top_genres.slice(0, 5) as [genre, count]}
                <div class="feature-card">
                  <h3>{genre}</h3>
                  <div class="stat-value">{count}</div>
                  <div class="stat-label">plays</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <div class="card" style="text-align: center; padding: 40px;">
          <p style="color: var(--text-secondary);">
            Analyzing your music taste... Sync more data to see evolution trends.
          </p>
        </div>
      {/if}
    {/if}

    {#if activeTab === 'trends'}
      {#if evolutionData}
        <FeatureTrends evolutionData={evolutionData} />
      {:else}
        <div class="card" style="text-align: center; padding: 40px;">
          <p style="color: var(--text-secondary);">
            Need at least 2 months of data to show trends.
          </p>
        </div>
      {/if}
    {/if}

    {#if activeTab === 'history'}
      <HistoryList history={history} />
    {/if}
  {/if}
{/if}
