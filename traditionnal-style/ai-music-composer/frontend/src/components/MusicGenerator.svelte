<script>
  import { onMount, createEventDispatcher } from 'svelte'
  import { navigate } from 'svelte-routing'
  import { musicAPI, compositionAPI } from '../lib/api'

  const dispatch = createEventDispatcher()

  let keywords = ''
  let folkRatio = 0.5
  let modernRatio = 0.5
  let title = ''
  let isGenerating = false
  let error = ''
  let generatedResult = null
  let styleAnalysis = null

  const presetKeywords = [
    '赛博朋克+古筝',
    '春节+喜庆+锣鼓',
    '古风+笛子',
    '电子+二胡',
    '江湖+侠气',
    '宫廷+典雅'
  ]

  function normalizeRatios() {
    let combined = folkRatio + modernRatio
    if (combined > 1) {
      folkRatio = folkRatio / combined
      modernRatio = modernRatio / combined
    }
  }

  $: normalizeRatios()

  function applyPreset(preset) {
    keywords = preset
  }

  async function generateMusic() {
    if (!keywords.trim()) {
      error = '请输入关键词'
      return
    }

    isGenerating = true
    error = ''
    generatedResult = null
    styleAnalysis = null

    try {
      const result = await musicAPI.generate({
        keywords: keywords.trim(),
        folk_ratio: folkRatio,
        modern_ratio: modernRatio,
        duration: 30,
        title: title.trim() || undefined
      })

      if (result.status === 'completed') {
        generatedResult = result
        
        if (result.midi_data) {
          const analysis = await musicAPI.analyzeStyle(result.midi_data)
          styleAnalysis = analysis.analysis
        }
      } else if (result.status === 'processing') {
        error = '音乐生成中，请稍后查看任务状态'
      } else {
        error = result.message || '生成失败'
      }
    } catch (err) {
      error = err.message || '生成失败，请重试'
    } finally {
      isGenerating = false
    }
  }

  async function reprocessStyle() {
    if (!generatedResult?.midi_data) return

    try {
      const result = await musicAPI.processStyle({
        midi_data: generatedResult.midi_data,
        folk_ratio: folkRatio,
        modern_ratio: modernRatio
      })

      if (result.status === 'success') {
        generatedResult.midi_data = result.midi_data
        styleAnalysis = result.analysis
      }
    } catch (err) {
      error = err.message || '风格处理失败'
    }
  }

  function openEditor() {
    if (generatedResult?.composition_id) {
      navigate(`/editor/${generatedResult.composition_id}`)
    } else if (generatedResult?.midi_data) {
      localStorage.setItem('temp_midi_data', generatedResult.midi_data)
      navigate('/editor')
    }
  }

  async function exportMidi() {
    if (generatedResult?.composition_id) {
      const response = await musicAPI.exportMidi(generatedResult.composition_id)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'music'}.mid`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
</script>

<div class="music-generator">
  <div class="generator-header">
    <h1>🎵 生成国潮音乐</h1>
    <p>输入关键词，AI 为你创作独特的国潮音乐</p>
  </div>

  <div class="generator-content">
    <div class="generator-left">
      <div class="card">
        <div class="form-group">
          <label class="form-label">音乐关键词</label>
          <input
            type="text"
            class="form-input"
            bind:value={keywords}
            placeholder="例如：赛博朋克+古筝 或 春节+喜庆"
            on:keydown={(e) => e.key === 'Enter' && generateMusic()}
          />
          
          <div class="preset-tags">
            <span class="preset-label">快速选择：</span>
            {#each presetKeywords as preset}
              <button
                class="preset-tag"
                class:active={keywords === preset}
                on:click={() => applyPreset(preset)}
              >
                {preset}
              </button>
            {/each}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">标题（可选）</label>
          <input
            type="text"
            class="form-input"
            bind:value={title}
            placeholder="给你的音乐起个名字"
          />
        </div>

        <div class="divider" />

        <div class="style-controls">
          <h3>风格参数</h3>
          
          <div class="slider-container">
            <div class="slider-label">
              <span>🎻 民乐占比</span>
              <span class="slider-value">{Math.round(folkRatio * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={folkRatio}
            />
            <div class="slider-hint">
              <span>纯现代</span>
              <span>纯民乐</span>
            </div>
          </div>

          <div class="slider-container">
            <div class="slider-label">
              <span>⚡ 现代感</span>
              <span class="slider-value">{Math.round(modernRatio * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={modernRatio}
            />
            <div class="slider-hint">
              <span>传统</span>
              <span>电子</span>
            </div>
          </div>

          <div class="style-preview">
            <div class="style-bar">
              <div
                class="style-segment folk"
                style="width: {folkRatio * 100}%"
              />
              <div
                class="style-segment modern"
                style="width: {modernRatio * 100}%"
              />
            </div>
            <p class="style-desc">
              {#if folkRatio > 0.7}
                传统民乐风格
              {:else if modernRatio > 0.7}
                现代电子风格
              {:else}
                国潮融合风格
              {/if}
            </p>
          </div>
        </div>

        {#if error}
          <div class="error-message">
            {error}
          </div>
        {/if}

        <button
          class="btn btn-primary btn-full"
          on:click={generateMusic}
          disabled={isGenerating || !keywords.trim()}
        >
          {#if isGenerating}
            <span class="loading">
              <span class="spinner" />
              生成中...
            </span>
          {:else}
            ✨ 生成音乐
          {/if}
        </button>
      </div>
    </div>

    <div class="generator-right">
      {#if generatedResult}
        <div class="card result-card">
          <div class="result-header">
            <h2>🎉 生成成功</h2>
            {#if styleAnalysis}
              <span class="badge badge-success">{styleAnalysis.style_category}</span>
            {/if}
          </div>

          <div class="result-info">
            <div class="info-row">
              <span class="info-label">关键词：</span>
              <span class="info-value">{generatedResult.keywords}</span>
            </div>
            
            {#if styleAnalysis}
              <div class="info-row">
                <span class="info-label">音符数：</span>
                <span class="info-value">{styleAnalysis.total_notes}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">使用乐器：</span>
                <span class="info-value">
                  {styleAnalysis.instruments?.join(', ') || '未知'}
                </span>
              </div>
            {/if}
          </div>

          {#if generatedResult.midi_data}
            <div class="divider" />
            
            <div class="style-controls">
              <h3>重新调整风格</h3>
              
              <div class="slider-container">
                <div class="slider-label">
                  <span>民乐占比</span>
                  <span class="slider-value">{Math.round(folkRatio * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  bind:value={folkRatio}
                />
              </div>

              <div class="slider-container">
                <div class="slider-label">
                  <span>现代感</span>
                  <span class="slider-value">{Math.round(modernRatio * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  bind:value={modernRatio}
                />
              </div>

              <button class="btn btn-secondary btn-full" on:click={reprocessStyle}>
                🔄 重新处理风格
              </button>
            </div>
          {/if}

          <div class="result-actions">
            <button class="btn btn-primary" on:click={openEditor}>
              🎹 在编辑器中打开
            </button>
            
            {#if generatedResult.composition_id}
              <button class="btn btn-secondary" on:click={exportMidi}>
                💾 导出 MIDI
              </button>
            {/if}
          </div>
        </div>
      {:else}
        <div class="card empty-state">
          <div class="empty-icon">🎵</div>
          <h3>等待创作</h3>
          <p>输入关键词，调整风格参数，<br />然后点击「生成音乐」开始创作</p>
          
          <div class="tips">
            <h4>💡 提示</h4>
            <ul>
              <li>使用「+」组合不同风格</li>
              <li>尝试不同的民乐占比和现代感</li>
              <li>生成后可以在编辑器中微调</li>
            </ul>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .music-generator {
    max-width: 1200px;
    margin: 0 auto;
  }

  .generator-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .generator-header h1 {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .generator-header p {
    color: var(--text-light);
  }

  .generator-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .preset-tags {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .preset-label {
    font-size: 12px;
    color: var(--text-light);
  }

  .preset-tag {
    padding: 6px 12px;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    font-size: 12px;
    color: var(--text-color);
    transition: var(--transition);
  }

  .preset-tag:hover,
  .preset-tag.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .style-controls h3 {
    font-size: 16px;
    margin-bottom: 16px;
    color: var(--text-color);
  }

  .slider-hint {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-light);
    margin-top: 4px;
  }

  .style-preview {
    margin-top: 24px;
    padding: 16px;
    background: var(--bg-color);
    border-radius: var(--radius-md);
  }

  .style-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .style-segment {
    height: 100%;
  }

  .style-segment.folk {
    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  }

  .style-segment.modern {
    background: linear-gradient(90deg, var(--secondary-color), #4a90d9);
  }

  .style-desc {
    text-align: center;
    font-size: 14px;
    color: var(--text-light);
  }

  .btn-full {
    width: 100%;
  }

  .error-message {
    padding: 12px 16px;
    background: rgba(198, 40, 40, 0.1);
    border: 1px solid var(--error-color);
    border-radius: var(--radius-md);
    color: var(--error-color);
    font-size: 14px;
    margin-bottom: 16px;
  }

  .result-card {
    position: sticky;
    top: 84px;
  }

  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .result-header h2 {
    font-size: 20px;
  }

  .result-info {
    margin-bottom: 16px;
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    font-weight: 500;
    color: var(--text-light);
    white-space: nowrap;
  }

  .info-value {
    word-break: break-all;
  }

  .result-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }

  .result-actions .btn {
    flex: 1;
  }

  .empty-state {
    text-align: center;
    padding: 48px 24px;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h3 {
    margin-bottom: 8px;
    color: var(--text-color);
  }

  .empty-state p {
    color: var(--text-light);
    line-height: 1.6;
  }

  .tips {
    margin-top: 32px;
    text-align: left;
    padding: 16px;
    background: var(--bg-color);
    border-radius: var(--radius-md);
  }

  .tips h4 {
    font-size: 14px;
    margin-bottom: 8px;
    color: var(--text-color);
  }

  .tips ul {
    list-style: none;
    padding: 0;
  }

  .tips li {
    font-size: 13px;
    color: var(--text-light);
    padding: 4px 0;
  }

  @media (max-width: 768px) {
    .generator-content {
      grid-template-columns: 1fr;
    }

    .result-card {
      position: static;
    }

    .result-actions {
      flex-direction: column;
    }
  }
</style>
