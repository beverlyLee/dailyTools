<script>
  import { onMount, onDestroy } from 'svelte'
  import dayjs from 'dayjs'
  import { fetchCurrentWeather } from '../utils/api.js'
  import { showWeatherDelayNotification } from '../utils/notification.js'

  let weatherData = null
  let feedingAdvice = null
  let loading = true
  let error = ''
  let refreshTimer = null
  let lastNotifiedDelay = ''

  async function loadWeather() {
    loading = true
    error = ''
    try {
      const data = await fetchCurrentWeather()
      if (data) {
        weatherData = data.weather
        feedingAdvice = data.feedingAdvice
        
        if (feedingAdvice.shouldDelay) {
          const delayKey = dayjs().format('YYYY-MM-DD-HH')
          if (lastNotifiedDelay !== delayKey) {
            showWeatherDelayNotification(feedingAdvice.reason)
            lastNotifiedDelay = delayKey
          }
        }
      } else {
        error = '获取天气数据失败'
      }
    } catch (e) {
      error = '获取天气数据失败'
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadWeather()
    refreshTimer = setInterval(loadWeather, 5 * 60 * 1000)
  })

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
  })

  $: updateTime = weatherData ? dayjs(weatherData.updateTime).format('HH:mm:ss') : ''
</script>

<div class="weather-panel">
  <div class="panel-header">
    <h2>🌤️ 气象联动策略</h2>
    <button class="btn-refresh" on:click={loadWeather} disabled={loading}>
      {loading ? '刷新中...' : '刷新'}
    </button>
  </div>

  {#if loading && !weatherData}
    <div class="loading">加载中...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if weatherData}
    <div class="weather-info">
      <div class="weather-main">
        <div class="weather-icon">{getWeatherIcon(weatherData.weatherCondition)}</div>
        <div class="weather-details">
          <div class="temperature">{weatherData.temperature}°C</div>
          <div class="condition">{weatherData.weatherCondition}</div>
        </div>
      </div>

      <div class="weather-grid">
        <div class="weather-item">
          <span class="label">湿度</span>
          <span class="value">{weatherData.humidity}%</span>
        </div>
        <div class="weather-item">
          <span class="label">气压</span>
          <span class="value" class:low={weatherData.pressure < 1000}>
            {weatherData.pressure} hPa
          </span>
        </div>
        <div class="weather-item">
          <span class="label">风速</span>
          <span class="value">{weatherData.windSpeed} m/s</span>
        </div>
        <div class="weather-item">
          <span class="label">溶氧</span>
          <span class="value" class:low={weatherData.dissolvedOxygen < 5}>
            {weatherData.dissolvedOxygen} mg/L
          </span>
        </div>
      </div>

      {#if feedingAdvice}
        <div class="feeding-advice" class:warning={feedingAdvice.shouldDelay}>
          <div class="advice-title">
            {feedingAdvice.shouldDelay ? '⚠️ 投喂建议' : '✅ 投喂建议'}
          </div>
          {#if feedingAdvice.shouldDelay}
            <div class="advice-reason">原因：{feedingAdvice.reason}</div>
          {/if}
          <div class="advice-suggestion">建议：{feedingAdvice.suggestion}</div>
          {#if feedingAdvice.shouldDelay}
            <div class="advice-action">
              <span class="action-badge">⏰ 自动推迟投喂</span>
            </div>
          {/if}
        </div>
      {/if}

      <div class="update-time">
        更新时间：{updateTime}
      </div>
    </div>
  {/if}
</div>

<script context="module">
  function getWeatherIcon(condition) {
    const icons = {
      '晴': '☀️',
      '多云': '⛅',
      '阴': '☁️',
      '小雨': '🌧️',
      '中雨': '🌧️',
      '雷阵雨': '⛈️',
    }
    return icons[condition] || '🌤️'
  }
</script>

<style>
  .weather-panel {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 20px;
    color: #1a1a2e;
  }

  .btn-refresh {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: #40916c;
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-refresh:hover {
    background: #2d6a4f;
  }

  .btn-refresh:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading, .error {
    text-align: center;
    padding: 40px;
    color: #666;
  }

  .error {
    color: #d00000;
  }

  .weather-info {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .weather-main {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .weather-icon {
    font-size: 64px;
  }

  .weather-details {
    flex: 1;
  }

  .temperature {
    font-size: 48px;
    font-weight: 700;
    color: #1a1a2e;
    line-height: 1;
  }

  .condition {
    font-size: 18px;
    color: #666;
    margin-top: 8px;
  }

  .weather-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .weather-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .label {
    font-size: 13px;
    color: #666;
  }

  .value {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a2e;
  }

  .value.low {
    color: #d00000;
  }

  .feeding-advice {
    padding: 16px;
    background: #f0fff4;
    border-radius: 8px;
    border-left: 4px solid #2d6a4f;
  }

  .feeding-advice.warning {
    background: #fff3cd;
    border-left-color: #ffc107;
  }

  .advice-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1a1a2e;
  }

  .advice-reason {
    font-size: 14px;
    color: #856404;
    margin-bottom: 6px;
  }

  .advice-suggestion {
    font-size: 14px;
    color: #333;
    line-height: 1.5;
  }

  .advice-action {
    margin-top: 12px;
  }

  .action-badge {
    display: inline-block;
    padding: 6px 12px;
    background: #dc3545;
    color: white;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
  }

  .update-time {
    font-size: 12px;
    color: #999;
    text-align: right;
  }
</style>
