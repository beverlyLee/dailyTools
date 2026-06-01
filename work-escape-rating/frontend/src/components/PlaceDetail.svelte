<script>
    import { createEventDispatcher, onMount } from 'svelte';

    export let place;
    const dispatch = createEventDispatcher();

    function close() {
        dispatch('close');
    }

    function getRatingColor(rating) {
        if (rating.includes('S')) return 'from-rose-500 to-pink-600';
        if (rating.includes('A')) return 'from-emerald-500 to-teal-600';
        if (rating.includes('B')) return 'from-blue-500 to-cyan-600';
        return 'from-gray-500 to-slate-600';
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
</script>

<div class="detail-overlay" on:click={close}>
    <div class="detail-modal" on:click|stopPropagation>
        <button class="close-btn" on:click={close}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>

        <div class="detail-header">
            <img src={place.image_url} alt={place.name} class="detail-image" />
            <div class="detail-title-overlay">
                <h1 class="detail-name">{place.name}</h1>
                <p class="detail-address">
                    <span class="address-icon">📍</span>
                    {place.address}
                </p>
            </div>
        </div>

        <div class="detail-content">
            <!-- 评分卡片 -->
            <div class="score-cards">
                <div class="score-card office">
                    <div class="score-badge office">
                        <span class="score-value">{place.office_score.toFixed(1)}</span>
                        <span class="score-label">办公指数</span>
                    </div>
                    <div class="rating-badge {getRatingColor(place.office_rating)}">
                        {place.office_rating}
                    </div>
                </div>
                <div class="score-divider"></div>
                <div class="score-card escape">
                    <div class="score-badge escape">
                        <span class="score-value">{place.escape_score.toFixed(1)}</span>
                        <span class="score-label">摸鱼指数</span>
                    </div>
                    <div class="rating-badge {getRatingColor(place.escape_rating)}">
                        {place.escape_rating}
                    </div>
                </div>
            </div>

            <!-- 推荐语 -->
            <div class="recommendation-box">
                <p class="recommendation-text">{place.recommendation}</p>
            </div>

            <!-- 三项指标 -->
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-icon">📶</div>
                    <div class="metric-info">
                        <div class="metric-label">WiFi 速度</div>
                        <div class="metric-bar">
                            <div class="metric-fill wifi" style="width: {place.wifi_score * 100}%"></div>
                        </div>
                        <div class="metric-value">{(place.wifi_score * 10).toFixed(0)}/10</div>
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-icon">🔌</div>
                    <div class="metric-info">
                        <div class="metric-label">插座数量</div>
                        <div class="metric-bar">
                            <div class="metric-fill socket" style="width: {Math.min(place.socket_count * 10, 100)}%"></div>
                        </div>
                        <div class="metric-value">{place.socket_count} 个</div>
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-icon">🤫</div>
                    <div class="metric-info">
                        <div class="metric-label">安静程度</div>
                        <div class="metric-bar">
                            <div class="metric-fill quiet" style="width: {place.noise_level * 100}%"></div>
                        </div>
                        <div class="metric-value">{(place.noise_level * 10).toFixed(0)}/10</div>
                    </div>
                </div>
            </div>

            <!-- 插座位置地图 - 红框高亮 -->
            {#if place.socket_locations && place.socket_locations.length > 0}
                <div class="socket-map-section">
                    <div class="section-header">
                        <span class="section-icon">🗺️</span>
                        <h3 class="section-title">店内插座分布图</h3>
                        <span class="socket-count-badge">{place.socket_locations.length} 个充电点</span>
                    </div>
                    
                    <div class="socket-map-container">
                        <div class="socket-map">
                            <!-- 店铺平面图背景 -->
                            <div class="map-floor">
                                <!-- 入口标记 -->
                                <div class="map-marker entrance" style="left: 50%; top: 95%;">
                                    <span class="marker-icon">🚪</span>
                                    <span class="marker-label">入口</span>
                                </div>
                                
                                <!-- 吧台标记 -->
                                <div class="map-marker counter" style="left: 80%; top: 70%;">
                                    <span class="marker-icon">☕</span>
                                    <span class="marker-label">吧台</span>
                                </div>

                                <!-- 插座位置 - 红框脉冲高亮 -->
                                {#each place.socket_locations as socket, index}
                                    <div 
                                        class="socket-marker"
                                        style="left: {socket.x * 100}%; top: {socket.y * 100}%;"
                                        title={socket.description}
                                    >
                                        <div class="socket-pulse"></div>
                                        <div class="socket-pulse delay"></div>
                                        <div class="socket-dot">
                                            <span class="socket-icon">🔌</span>
                                        </div>
                                        <div class="socket-tooltip">
                                            <div class="tooltip-number">#{index + 1}</div>
                                            <div class="tooltip-text">{socket.description}</div>
                                        </div>
                                    </div>
                                {/each}

                                <!-- 网格背景 -->
                                <svg class="map-grid" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    {#each Array.from({length: 10}) as _, i}
                                        <line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="rgba(255,255,255,0.1)" />
                                        <line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="rgba(255,255,255,0.1)" />
                                    {/each}
                                </svg>
                            </div>
                        </div>

                        <!-- 插座列表 -->
                        <div class="socket-list">
                            <h4 class="socket-list-title">插座位置列表</h4>
                            <div class="socket-list-scroll">
                                {#each place.socket_locations as socket, index}
                                    <div class="socket-list-item">
                                        <div class="socket-index">{index + 1}</div>
                                        <div class="socket-info">
                                            <div class="socket-name">{socket.description}</div>
                                            <div class="socket-hint">推荐座位，充电方便</div>
                                        </div>
                                        <div class="socket-status available">
                                            <span class="status-dot"></span>
                                            可用
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- 插座秘籍 - 单独分区，支持滚动查看 -->
            <div class="socket-tips-section">
                <div class="section-header">
                    <span class="section-icon">💡</span>
                    <h3 class="section-title">网友亲测插座秘籍</h3>
                    <span class="tips-badge">实测有效</span>
                </div>

                <div class="socket-tips-container">
                    <div class="tips-scroll-area">
                        {#if place.socket_tips && place.socket_tips.length > 0}
                            {#each place.socket_tips as tip, index}
                                <div class="tip-card">
                                    <div class="tip-number">{index + 1}</div>
                                    <div class="tip-content">
                                        <p class="tip-text">{tip}</p>
                                        <div class="tip-meta">
                                            <span class="tip-author">📱 网友爆料</span>
                                            <span class="tip-verified">✓ 已验证</span>
                                        </div>
                                    </div>
                                    <div class="tip-action">
                                        <button class="useful-btn">
                                            <span>👍</span>
                                            <span>有用</span>
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        {:else}
                            <div class="no-tips">
                                <div class="no-tips-icon">🔌</div>
                                <p class="no-tips-text">暂无插座秘籍，欢迎补充爆料！</p>
                            </div>
                        {/if}
                    </div>
                </div>

                <button class="add-tip-btn">
                    <span>✨</span>
                    <span>分享你的插座发现</span>
                </button>
            </div>

            <!-- 营业时间和人均消费 -->
            <div class="info-row">
                <div class="info-item">
                    <span class="info-icon">🕐</span>
                    <span class="info-label">营业时间</span>
                    <span class="info-value">{place.opening_hours}</span>
                </div>
                <div class="info-item">
                    <span class="info-icon">💰</span>
                    <span class="info-label">人均消费</span>
                    <span class="info-value price-value">
                        {#if place.avg_price}
                            <span class="price-amount">¥{place.avg_price}</span>
                            <span class="price-unit">/人</span>
                        {:else}
                            {'¥'.repeat(place.price_level)}
                        {/if}
                    </span>
                </div>
            </div>

            <!-- 导航按钮 -->
            <div class="action-buttons">
                <button class="action-btn primary">
                    <span>🧭</span>
                    <span>导航前往</span>
                </button>
                <button class="action-btn secondary" on:click={scrollToTop}>
                    <span>⬆️</span>
                    <span>回到顶部</span>
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .detail-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
    }

    .detail-modal {
        background: white;
        border-radius: 24px;
        max-width: 700px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 10;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background: rgba(0, 0, 0, 0.7);
        transform: rotate(90deg);
    }

    .detail-header {
        position: relative;
        height: 280px;
        overflow: hidden;
    }

    .detail-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .detail-title-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 30px 24px 24px;
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        color: white;
    }

    .detail-name {
        margin: 0 0 8px;
        font-size: 28px;
        font-weight: 800;
    }

    .detail-address {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .address-icon {
        font-size: 16px;
    }

    .detail-content {
        padding: 24px;
    }

    .score-cards {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        margin-bottom: 20px;
    }

    .score-card {
        text-align: center;
        flex: 1;
    }

    .score-badge {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 0 auto 8px;
    }

    .score-badge.office {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
    }

    .score-badge.escape {
        background: linear-gradient(135deg, #ec4899, #be185d);
        box-shadow: 0 10px 30px rgba(236, 72, 153, 0.4);
    }

    .score-value {
        font-size: 32px;
        font-weight: 800;
        color: white;
        line-height: 1;
    }

    .score-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.9);
        margin-top: 4px;
    }

    .score-divider {
        width: 2px;
        height: 60px;
        background: linear-gradient(to bottom, #e5e7eb, #d1d5db, #e5e7eb);
    }

    .rating-badge {
        display: inline-block;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 700;
        color: white;
        background: linear-gradient(135deg, #6b7280, #4b5563);
    }

    .rating-badge.from-rose-500-to-pink-600 {
        background: linear-gradient(135deg, #f43f5e, #db2777);
    }

    .rating-badge.from-emerald-500-to-teal-600 {
        background: linear-gradient(135deg, #10b981, #0d9488);
    }

    .rating-badge.from-blue-500-to-cyan-600 {
        background: linear-gradient(135deg, #3b82f6, #0891b2);
    }

    .recommendation-box {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #bae6fd;
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 24px;
    }

    .recommendation-text {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #0369a1;
        text-align: center;
    }

    .metrics-grid {
        display: grid;
        gap: 16px;
        margin-bottom: 28px;
    }

    .metric-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 16px;
    }

    .metric-icon {
        font-size: 28px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .metric-info {
        flex: 1;
    }

    .metric-label {
        font-size: 13px;
        color: #64748b;
        margin-bottom: 6px;
    }

    .metric-bar {
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
    }

    .metric-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;
    }

    .metric-fill.wifi {
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
    }

    .metric-fill.socket {
        background: linear-gradient(90deg, #10b981, #34d399);
    }

    .metric-fill.quiet {
        background: linear-gradient(90deg, #8b5cf6, #a78bfa);
    }

    .metric-value {
        font-size: 12px;
        font-weight: 600;
        color: #1e293b;
    }

    /* 插座地图部分 */
    .socket-map-section {
        margin-bottom: 28px;
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
    }

    .section-icon {
        font-size: 24px;
    }

    .section-title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        flex: 1;
    }

    .socket-count-badge {
        padding: 4px 12px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        font-size: 12px;
        font-weight: 600;
        border-radius: 20px;
    }

    .tips-badge {
        padding: 4px 12px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        font-size: 12px;
        font-weight: 600;
        border-radius: 20px;
    }

    .socket-map-container {
        background: #f8fafc;
        border-radius: 16px;
        overflow: hidden;
    }

    .socket-map {
        padding: 20px;
    }

    .map-floor {
        position: relative;
        width: 100%;
        padding-top: 70%;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-radius: 16px;
        overflow: hidden;
    }

    .map-grid {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    .map-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 5;
    }

    .map-marker .marker-icon {
        font-size: 20px;
        display: block;
    }

    .map-marker .marker-label {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.7);
        white-space: nowrap;
    }

    /* 插座标记 - 脉冲动画 */
    .socket-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        z-index: 10;
        cursor: pointer;
    }

    .socket-pulse {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 3px solid #ef4444;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }

    .socket-pulse.delay {
        animation-delay: 0.5s;
    }

    @keyframes pulse-ring {
        0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
        }
    }

    .socket-dot {
        position: relative;
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
        z-index: 2;
    }

    .socket-icon {
        font-size: 16px;
    }

    .socket-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 8px 12px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s;
        margin-bottom: 8px;
        z-index: 20;
    }

    .socket-marker:hover .socket-tooltip {
        opacity: 1;
        visibility: visible;
    }

    .tooltip-number {
        font-size: 10px;
        font-weight: 700;
        color: #ef4444;
        margin-bottom: 2px;
    }

    .tooltip-text {
        font-size: 12px;
        font-weight: 600;
        color: #1e293b;
    }

    .socket-list {
        padding: 0 20px 20px;
    }

    .socket-list-title {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        color: #475569;
    }

    .socket-list-scroll {
        max-height: 180px;
        overflow-y: auto;
    }

    .socket-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: white;
        border-radius: 12px;
        margin-bottom: 8px;
    }

    .socket-list-item:last-child {
        margin-bottom: 0;
    }

    .socket-index {
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
    }

    .socket-info {
        flex: 1;
    }

    .socket-name {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 2px;
    }

    .socket-hint {
        font-size: 11px;
        color: #64748b;
    }

    .socket-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 600;
    }

    .socket-status.available {
        color: #10b981;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        animation: blink 2s infinite;
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    /* 插座秘籍部分 */
    .socket-tips-section {
        margin-bottom: 28px;
    }

    .socket-tips-container {
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        border-radius: 16px;
        overflow: hidden;
    }

    .tips-scroll-area {
        max-height: 320px;
        overflow-y: auto;
        padding: 16px;
    }

    .tip-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
        background: white;
        border-radius: 12px;
        margin-bottom: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .tip-card:last-child {
        margin-bottom: 0;
    }

    .tip-number {
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        flex-shrink: 0;
    }

    .tip-content {
        flex: 1;
        min-width: 0;
    }

    .tip-text {
        margin: 0 0 8px;
        font-size: 14px;
        color: #1e293b;
        line-height: 1.5;
        font-weight: 500;
    }

    .tip-meta {
        display: flex;
        gap: 12px;
        font-size: 11px;
    }

    .tip-author {
        color: #64748b;
    }

    .tip-verified {
        color: #10b981;
        font-weight: 600;
    }

    .tip-action {
        flex-shrink: 0;
    }

    .useful-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 8px 12px;
        background: #fef3c7;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .useful-btn:hover {
        background: #fde68a;
        transform: scale(1.05);
    }

    .useful-btn span:first-child {
        font-size: 16px;
    }

    .useful-btn span:last-child {
        font-size: 10px;
        color: #92400e;
        font-weight: 600;
    }

    .no-tips {
        text-align: center;
        padding: 30px 20px;
    }

    .no-tips-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
    }

    .no-tips-text {
        margin: 0;
        color: #92400e;
        font-size: 14px;
    }

    .add-tip-btn {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        border: none;
        border-radius: 0 0 16px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
    }

    .add-tip-btn:hover {
        background: linear-gradient(135deg, #d97706, #b45309);
    }

    .info-row {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
    }

    .info-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 16px;
    }

    .info-icon {
        font-size: 24px;
    }

    .info-label {
        font-size: 12px;
        color: #64748b;
    }

    .info-value {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
    }

    .price-value {
        display: flex;
        align-items: baseline;
        gap: 2px;
    }

    .price-amount {
        font-size: 20px;
        color: #10b981;
        font-weight: 800;
    }

    .price-unit {
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
    }

    .action-buttons {
        display: flex;
        gap: 12px;
    }

    .action-btn {
        flex: 1;
        padding: 16px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        border: none;
    }

    .action-btn.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    .action-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .action-btn.secondary {
        background: #f1f5f9;
        color: #475569;
    }

    .action-btn.secondary:hover {
        background: #e2e8f0;
    }
</style>
