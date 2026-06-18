<script>
  import { calculateFCR } from '../utils/api.js'

  let formData = {
    totalFeedAmount: 5000,
    estimatedYield: 3000,
    initialWeight: 0.1,
    stockCount: 10000,
    targetFCR: 1.8,
  }

  let result = null
  let loading = false
  let error = ''

  async function handleCalculate() {
    loading = true
    error = ''
    result = null
    
    try {
      const data = await calculateFCR(formData)
      if (data) {
        result = data
      } else {
        error = '计算失败，请检查输入数据'
      }
    } catch (e) {
      error = '计算失败，请稍后重试'
    } finally {
      loading = false
    }
  }

  $: totalInitialWeight = (formData.initialWeight * formData.stockCount / 1000).toFixed(2)
</script>

<div class="fcr-container">
  <div class="panel-header">
    <h2>📊 饵料系数核算</h2>
  </div>

  <div class="fcr-content">
    <div class="form-section">
      <h3>养殖数据录入</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label>累计投喂量 (kg)</label>
          <input 
            type="number" 
            bind:value={formData.totalFeedAmount}
            min="0"
            step="1"
          />
        </div>
        <div class="form-group">
          <label>预估出塘产量 (kg)</label>
          <input 
            type="number" 
            bind:value={formData.estimatedYield}
            min="0"
            step="1"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>放苗初始体重 (g/尾)</label>
          <input 
            type="number" 
            bind:value={formData.initialWeight}
            min="0"
            step="0.01"
          />
        </div>
        <div class="form-group">
          <label>放苗数量 (尾)</label>
          <input 
            type="number" 
            bind:value={formData.stockCount}
            min="0"
            step="1"
          />
        </div>
      </div>

      <div class="form-group">
        <label>目标饵料系数 (FCR)</label>
        <input 
          type="number" 
          bind:value={formData.targetFCR}
          min="0"
          step="0.1"
        />
      </div>

      <div class="info-box">
        <span>初始总重量：</span>
        <strong>{totalInitialWeight} kg</strong>
      </div>

      <button 
        class="btn-calculate" 
        on:click={handleCalculate}
        disabled={loading}
      >
        {loading ? '计算中...' : '计算饵料系数'}
      </button>
    </div>

    {#if error}
      <div class="error-box">{error}</div>
    {/if}

    {#if result}
      <div class="result-section">
        <h3>核算结果</h3>
        
        <div class="fcr-display" class:warning={result.isOverTarget}>
          <div class="fcr-label">饵料系数 (FCR)</div>
          <div class="fcr-value">{result.fcr}</div>
          <div class="fcr-target">目标：{result.targetFCR}</div>
        </div>

        <div class="result-grid">
          <div class="result-item">
            <span class="label">总投喂量</span>
            <span class="value">{formData.totalFeedAmount} kg</span>
          </div>
          <div class="result-item">
            <span class="label">总增重</span>
            <span class="value">{result.totalWeightGain} kg</span>
          </div>
          <div class="result-item">
            <span class="label">预估产量</span>
            <span class="value">{result.estimatedYield} kg</span>
          </div>
          {#if result.isOverTarget}
            <div class="result-item cost-saving">
              <span class="label">可节约成本</span>
              <span class="value">¥{result.feedCostSaving}</span>
            </div>
          {/if}
        </div>

        <div class="warning-box" class:warning={result.isOverTarget} class:normal={!result.isOverTarget}>
          <div class="warning-title">
            {result.isOverTarget ? '⚠️ 成本预警' : '✅ 状态良好'}
          </div>
          <div class="warning-text">{result.warning}</div>
        </div>

        {#if result.suggestions.length > 0}
          <div class="suggestions">
            <h4>改进建议</h4>
            <ul>
              {#each result.suggestions as suggestion, index}
                <li key={index}>{suggestion}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .fcr-container {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .panel-header h2 {
    margin: 0 0 20px 0;
    font-size: 20px;
    color: #1a1a2e;
  }

  .fcr-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .form-section h3,
  .result-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #1a1a2e;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
  }

  .form-group input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #2d6a4f;
  }

  .info-box {
    padding: 12px 16px;
    background: #f0fff4;
    border-radius: 6px;
    font-size: 14px;
    color: #333;
    margin-bottom: 16px;
  }

  .info-box strong {
    color: #2d6a4f;
  }

  .btn-calculate {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 8px;
    background: #2d6a4f;
    color: white;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-calculate:hover {
    background: #1b4332;
  }

  .btn-calculate:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-box {
    padding: 14px;
    background: #f8d7da;
    color: #721c24;
    border-radius: 8px;
    font-size: 14px;
  }

  .result-section {
    border-top: 1px solid #eee;
    padding-top: 24px;
  }

  .fcr-display {
    text-align: center;
    padding: 24px;
    background: #f0fff4;
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .fcr-display.warning {
    background: #fff3cd;
  }

  .fcr-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
  }

  .fcr-value {
    font-size: 48px;
    font-weight: 700;
    color: #2d6a4f;
    line-height: 1;
  }

  .fcr-display.warning .fcr-value {
    color: #dc3545;
  }

  .fcr-target {
    font-size: 13px;
    color: #999;
    margin-top: 8px;
  }

  .result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .result-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .result-item .label {
    font-size: 13px;
    color: #666;
  }

  .result-item .value {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a2e;
  }

  .result-item.cost-saving .value {
    color: #dc3545;
  }

  .warning-box {
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .warning-box.warning {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
  }

  .warning-box.normal {
    background: #f0fff4;
    border-left: 4px solid #2d6a4f;
  }

  .warning-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #1a1a2e;
  }

  .warning-text {
    font-size: 14px;
    color: #333;
  }

  .suggestions h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #1a1a2e;
  }

  .suggestions ul {
    margin: 0;
    padding-left: 20px;
  }

  .suggestions li {
    font-size: 14px;
    color: #555;
    line-height: 1.8;
  }
</style>
