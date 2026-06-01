<script>
    export let fallback = null;
    let hasError = false;
    let errorInfo = '';

    function handleSlotError(error) {
        hasError = true;
        errorInfo = error?.message || '组件加载出错';
        console.error('ErrorBoundary:', errorInfo);
    }

    function reset() {
        hasError = false;
        errorInfo = '';
    }
</script>

{#if hasError}
    <div class="error-fallback">
        <div class="error-icon">⚠️</div>
        <h3 class="error-title">组件加载失败</h3>
        <p class="error-message">{errorInfo}</p>
        <button on:click={reset} class="retry-btn">
            重新加载
        </button>
    </div>
{:else}
    <slot />
{/if}

<style>
    .error-fallback {
        padding: 24px;
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 1px solid #fecaca;
        border-radius: 16px;
        text-align: center;
    }

    .error-icon {
        font-size: 40px;
        margin-bottom: 12px;
    }

    .error-title {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
        color: #991b1b;
    }

    .error-message {
        margin: 0 0 16px;
        font-size: 13px;
        color: #b91c1c;
    }

    .retry-btn {
        padding: 8px 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .retry-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
</style>
