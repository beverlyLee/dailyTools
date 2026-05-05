<script>
  import { onMount } from 'svelte'
  import katex from 'katex'

  let formulaInput = ''
  let showPreview = false
  let previewHtml = ''

  const templates = [
    { label: '分数', tex: '\\frac{a}{b}', example: '分数: a/b' },
    { label: '平方根', tex: '\\sqrt{x}', example: '√x' },
    { label: '指数', tex: 'x^{n}', example: 'xⁿ' },
    { label: '下标', tex: 'x_{n}', example: 'xₙ' },
    { label: '求和', tex: '\\sum_{i=1}^{n} x_i', example: '求和符号' },
    { label: '积分', tex: '\\int_{a}^{b} f(x) dx', example: '定积分' },
    { label: '极限', tex: '\\lim_{x \\to \\infty} f(x)', example: '极限' },
    { label: '导数', tex: '\\frac{dy}{dx}', example: '导数' },
    { label: '偏导数', tex: '\\frac{\\partial f}{\\partial x}', example: '偏导数' },
    { label: '希腊字母', tex: '\\alpha, \\beta, \\gamma, \\pi, \\theta', example: 'α, β, γ, π, θ' },
    { label: '集合', tex: 'A \\cup B, A \\cap B, A \\subset B', example: '并集、交集、子集' },
    { label: '向量', tex: '\\vec{v}, \\overrightarrow{AB}', example: '向量' },
    { label: '矩阵', tex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', example: '矩阵' },
    { label: '方程组', tex: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}', example: '方程组' },
    { label: '不等式', tex: 'a \\leq b, x \\geq 0, x \\neq y', example: '≤, ≥, ≠' },
  ]

  const commonSymbols = [
    { tex: '\\pm', display: '±' },
    { tex: '\\mp', display: '∓' },
    { tex: '\\times', display: '×' },
    { tex: '\\div', display: '÷' },
    { tex: '\\cdot', display: '·' },
    { tex: '\\leq', display: '≤' },
    { tex: '\\geq', display: '≥' },
    { tex: '\\neq', display: '≠' },
    { tex: '\\approx', display: '≈' },
    { tex: '\\infty', display: '∞' },
    { tex: '\\pi', display: 'π' },
    { tex: '\\theta', display: 'θ' },
    { tex: '\\alpha', display: 'α' },
    { tex: '\\beta', display: 'β' },
    { tex: '\\gamma', display: 'γ' },
    { tex: '\\delta', display: 'δ' },
    { tex: '\\lambda', display: 'λ' },
    { tex: '\\mu', display: 'μ' },
    { tex: '\\sigma', display: 'σ' },
    { tex: '\\sum', display: '∑' },
    { tex: '\\prod', display: '∏' },
    { tex: '\\int', display: '∫' },
    { tex: '\\cup', display: '∪' },
    { tex: '\\cap', display: '∩' },
  ]

  function updatePreview() {
    if (formulaInput.trim()) {
      try {
        previewHtml = katex.renderToString(formulaInput, {
          throwOnError: false,
          displayMode: true
        })
        showPreview = true
      } catch (e) {
        previewHtml = '<span style="color: #ef4444;">公式语法错误</span>'
        showPreview = true
      }
    } else {
      showPreview = false
    }
  }

  function insertTemplate(tex) {
    formulaInput = formulaInput ? formulaInput + ' ' + tex : tex
    updatePreview()
  }

  function insertSymbol(tex) {
    formulaInput = formulaInput + tex
    updatePreview()
  }

  function insertToWhiteboard() {
    if (!formulaInput.trim()) return
    
    try {
      const html = katex.renderToString(formulaInput, {
        throwOnError: false,
        displayMode: false
      })
      
      window.dispatchEvent(new CustomEvent('whiteboard-insert-formula', {
        detail: {
          formula: formulaInput,
          html: html
        }
      }))
      
      formulaInput = ''
      showPreview = false
    } catch (e) {
      console.error('Failed to render formula:', e)
    }
  }

  function clearInput() {
    formulaInput = ''
    showPreview = false
  }

  onMount(() => {
    updatePreview()
  })
</script>

<style>
  .formula-panel {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .input-section {
    margin-bottom: 16px;
  }

  .input-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }

  .formula-input {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    font-family: 'Courier New', monospace;
    resize: vertical;
    min-height: 60px;
    transition: border-color 0.2s;
  }

  .formula-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .action-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.primary {
    background: #3b82f6;
    color: white;
  }

  .action-btn.primary:hover {
    background: #2563eb;
  }

  .action-btn.secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .action-btn.secondary:hover {
    background: #d1d5db;
  }

  .preview-section {
    margin-bottom: 16px;
    padding: 16px;
    background: #f9fafb;
    border-radius: 8px;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-placeholder {
    color: #9ca3af;
    font-size: 13px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin: 16px 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }

  .templates-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }

  .template-btn {
    padding: 8px 6px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 11px;
    color: #374151;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .template-btn:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .symbols-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .symbol-btn {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 16px;
  }

  .symbol-btn:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .help-tip {
    margin-top: 16px;
    padding: 12px;
    background: #fffbeb;
    border-radius: 8px;
    border-left: 3px solid #f59e0b;
    font-size: 12px;
    color: #92400e;
    line-height: 1.5;
  }

  .help-tip a {
    color: #3b82f6;
    text-decoration: underline;
  }
</style>

<div class="formula-panel">
  <div class="input-section">
    <label class="input-label">LaTeX 公式输入</label>
    <textarea
      class="formula-input"
      bind:value={formulaInput}
      on:input={updatePreview}
      placeholder="例如: \frac{a}{b} 或 \sum_{i=1}^{n} x_i"
    />
    <div class="action-buttons">
      <button class="action-btn primary" on:click={insertToWhiteboard}>
        ✅ 插入到白板
      </button>
      <button class="action-btn secondary" on:click={clearInput}>
        🗑 清空
      </button>
    </div>
  </div>

  <div class="preview-section">
    {#if showPreview}
      <div class="katex-preview" {@html previewHtml}></div>
    {:else}
      <div class="preview-placeholder">输入公式后这里会显示预览</div>
    {/if}
  </div>

  <div class="section-title">常用模板</div>
  <div class="templates-grid">
    {#each templates as template}
      <button
        class="template-btn"
        on:click={() => insertTemplate(template.tex)}
        title={template.example}
      >
        {template.label}
      </button>
    {/each}
  </div>

  <div class="section-title">常用符号</div>
  <div class="symbols-grid">
    {#each commonSymbols as symbol}
      <button
        class="symbol-btn"
        on:click={() => insertSymbol(symbol.tex)}
        title={symbol.tex}
      >
        {symbol.display}
      </button>
    {/each}
  </div>

  <div class="help-tip">
    <strong>提示：</strong>使用 LaTeX 语法编写数学公式。
    例如：<code>\frac{1}{2}</code> 表示分数 ½，
    <code>\sqrt{x}</code> 表示 √x。
  </div>
</div>
