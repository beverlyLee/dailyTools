<script>
  import { onMount } from 'svelte'
  import { navigate } from 'svelte-routing'
  import { compositionAPI } from '../lib/api'

  let compositions = []
  let isLoading = true
  let error = ''
  let showDeleteConfirm = null
  let searchQuery = ''

  $: filteredCompositions = compositions.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.keywords.toLowerCase().includes(searchQuery.toLowerCase())
  )

  onMount(async () => {
    await loadCompositions()
  })

  async function loadCompositions() {
    isLoading = true
    error = ''

    try {
      compositions = await compositionAPI.list()
    } catch (err) {
      error = err.message || '加载失败'
    } finally {
      isLoading = false
    }
  }

  function openEditor(composition) {
    navigate(`/editor/${composition.id}`)
  }

  async function shareComposition(composition) {
    try {
      const result = await compositionAPI.share(composition.id)
      const shareUrl = `${window.location.origin}/share/${result.share_token}`
      
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert(`分享链接已复制到剪贴板：${shareUrl}`)
      } catch {
        alert(`分享链接：${shareUrl}`)
      }
      
      composition.is_public = 1
      composition.share_token = result.share_token
    } catch (err) {
      error = err.message || '分享失败'
    }
  }

  async function unshareComposition(composition) {
    try {
      await compositionAPI.unshare(composition.id)
      composition.is_public = 0
    } catch (err) {
      error = err.message || '取消分享失败'
    }
  }

  async function forkComposition(composition) {
    try {
      const fork = await compositionAPI.fork(composition.id, `${composition.title} (副本)`)
      compositions.unshift(fork)
    } catch (err) {
      error = err.message || '创建副本失败'
    }
  }

  async function confirmDelete(composition) {
    showDeleteConfirm = composition
  }

  async function deleteComposition(composition) {
    try {
      await compositionAPI.delete(composition.id)
      compositions = compositions.filter(c => c.id !== composition.id)
      showDeleteConfirm = null
    } catch (err) {
      error = err.message || '删除失败'
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStyleBadge(folkRatio, modernRatio) {
    if (folkRatio > 0.7) return { label: '传统民乐', class: 'badge-warning' }
    if (modernRatio > 0.7) return { label: '现代电子', class: 'badge-primary' }
    return { label: '国潮融合', class: 'badge-success' }
  }
</script>

<div class="composition-library">
  <div class="library-header">
    <h1>📁 我的作品</h1>
    <div class="header-actions">
      <input
        type="text"
        class="form-input search-input"
        bind:value={searchQuery}
        placeholder="搜索作品..."
      />
      <button class="btn btn-primary" on:click={() => navigate('/generate')}>
        ✨ 新建作品
      </button>
    </div>
  </div>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if isLoading}
    <div class="loading-state">
      <span class="loading">
        <span class="spinner" />
        加载中...
      </span>
    </div>
  {:else if filteredCompositions.length === 0}
    <div class="empty-state card">
      <div class="empty-icon">🎵</div>
      <h3>还没有作品</h3>
      <p>
        {#if searchQuery}
          没有找到匹配的作品
        {:else}
          开始创作你的第一首国潮音乐吧！
        {/if}
      </p>
      {#if !searchQuery}
        <button class="btn btn-primary" on:click={() => navigate('/generate')}>
          开始创作
        </button>
      {/if}
    </div>
  {:else}
    <div class="compositions-grid">
      {#each filteredCompositions as composition}
        <div class="composition-card card">
          <div class="card-header">
            <h3 class="card-title" on:click={() => openEditor(composition)}>
              {composition.title}
            </h3>
            {#if composition.is_public}
              <span class="badge badge-success">已分享</span>
            {/if}
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="info-label">关键词：</span>
              <span class="info-value">{composition.keywords}</span>
            </div>

            <div class="info-row">
              <span class="info-label">风格：</span>
              {@const badge = getStyleBadge(composition.folk_ratio, composition.modern_ratio)}
              <span class="badge {badge.class}">{badge.label}</span>
            </div>

            <div class="style-preview">
              <div class="style-bar">
                <div
                  class="style-segment folk"
                  style="width: {composition.folk_ratio * 100}%"
                />
                <div
                  class="style-segment modern"
                  style="width: {composition.modern_ratio * 100}%"
                />
              </div>
              <div class="style-labels">
                <span>民乐 {Math.round(composition.folk_ratio * 100)}%</span>
                <span>现代 {Math.round(composition.modern_ratio * 100)}%</span>
              </div>
            </div>

            <div class="card-date">
              创建于 {formatDate(composition.created_at)}
            </div>
          </div>

          <div class="card-actions">
            <button
              class="btn btn-ghost btn-sm"
              on:click={() => openEditor(composition)}
            >
              🎹 编辑
            </button>

            {#if composition.is_public}
              <button
                class="btn btn-secondary btn-sm"
                on:click={() => unshareComposition(composition)}
              >
                🔒 取消分享
              </button>
            {:else}
              <button
                class="btn btn-secondary btn-sm"
                on:click={() => shareComposition(composition)}
              >
                🔗 分享
              </button>
            {/if}

            <button
              class="btn btn-secondary btn-sm"
              on:click={() => forkComposition(composition)}
            >
              📋 副本
            </button>

            <button
              class="btn btn-ghost btn-sm delete-btn"
              on:click={() => confirmDelete(composition)}
            >
              🗑️
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if showDeleteConfirm}
    <div class="modal-overlay" on:click={() => showDeleteConfirm = null}>
      <div class="modal" on:click|stopPropagation>
        <h3>确认删除</h3>
        <p>确定要删除「{showDeleteConfirm.title}」吗？</p>
        <p class="warning">此操作无法撤销。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" on:click={() => showDeleteConfirm = null}>
            取消
          </button>
          <button
            class="btn btn-danger"
            on:click={() => deleteComposition(showDeleteConfirm)}
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .composition-library {
    max-width: 1200px;
    margin: 0 auto;
  }

  .library-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .library-header h1 {
    font-size: 28px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .search-input {
    width: 250px;
  }

  .error-message {
    padding: 12px 16px;
    background: rgba(198, 40, 40, 0.1);
    border: 1px solid var(--error-color);
    border-radius: var(--radius-md);
    color: var(--error-color);
    margin-bottom: 16px;
  }

  .loading-state {
    text-align: center;
    padding: 48px;
  }

  .empty-state {
    text-align: center;
    padding: 48px;
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
    margin-bottom: 16px;
  }

  .compositions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .composition-card {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #2c1810 0%, #4a2c20 100%);
    color: white;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
  }

  .card-title:hover {
    color: var(--secondary-light);
  }

  .card-body {
    padding: 16px 20px;
    flex: 1;
  }

  .info-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
  }

  .info-label {
    font-weight: 500;
    color: var(--text-light);
    white-space: nowrap;
  }

  .info-value {
    word-break: break-word;
  }

  .style-preview {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .style-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
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

  .style-labels {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-light);
  }

  .card-date {
    font-size: 12px;
    color: var(--text-light);
    margin-top: 12px;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    padding: 12px 20px;
    background: var(--bg-color);
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
  }

  .delete-btn {
    margin-left: auto;
  }

  .delete-btn:hover {
    background: rgba(198, 40, 40, 0.1);
    color: var(--error-color);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: var(--radius-lg);
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow-lg);
  }

  .modal h3 {
    margin-bottom: 12px;
  }

  .modal p {
    color: var(--text-light);
    margin-bottom: 8px;
  }

  .modal .warning {
    color: var(--error-color);
    font-weight: 500;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
  }

  @media (max-width: 768px) {
    .library-header {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      flex-direction: column;
    }

    .search-input {
      width: 100%;
    }

    .compositions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
