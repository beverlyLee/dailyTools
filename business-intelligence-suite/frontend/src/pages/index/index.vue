<template>
    <view class="home-page">
        <view class="header">
            <view class="header-content">
                <text class="title">商务智能系统</text>
                <text class="subtitle">跨境翻译 · 发票核验</text>
            </view>
        </view>

        <view class="quick-actions">
            <view class="section-title">快捷功能</view>
            <view class="actions-grid">
                <view class="action-item" @click="goToTranslation">
                    <view class="action-icon translate-icon">
                        <text class="icon-text">译</text>
                    </view>
                    <text class="action-text">实时翻译</text>
                </view>
                <view class="action-item" @click="goToPhrases">
                    <view class="action-icon phrases-icon">
                        <text class="icon-text">短</text>
                    </view>
                    <text class="action-text">商务短语</text>
                </view>
                <view class="action-item" @click="goToInvoiceUpload">
                    <view class="action-icon invoice-icon">
                        <text class="icon-text">票</text>
                    </view>
                    <text class="action-text">发票识别</text>
                </view>
                <view class="action-item" @click="goToInvoiceList">
                    <view class="action-icon list-icon">
                        <text class="icon-text">列</text>
                    </view>
                    <text class="action-text">发票列表</text>
                </view>
            </view>
        </view>

        <view class="stats-section">
            <view class="section-title">数据概览</view>
            <view class="stats-grid">
                <view class="stat-item">
                    <text class="stat-number">{{ stats.translationHistory }}</text>
                    <text class="stat-label">翻译记录</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">{{ stats.invoiceCount }}</text>
                    <text class="stat-label">发票数量</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">{{ stats.verifiedCount }}</text>
                    <text class="stat-label">已核验</text>
                </view>
                <view class="stat-item">
                    <text class="stat-number">{{ stats.reimbursedCount }}</text>
                    <text class="stat-label">已报销</text>
                </view>
            </view>
        </view>

        <view class="recent-section" v-if="recentTranslations.length > 0">
            <view class="section-header">
                <text class="section-title">最近翻译</text>
                <text class="view-all" @click="goToHistory">查看全部</text>
            </view>
            <view class="recent-list">
                <view class="recent-item" v-for="(item, index) in recentTranslations" :key="index">
                    <view class="recent-source">
                        <text class="lang-tag">{{ item.source_language }}</text>
                        <text class="recent-text">{{ item.source_text }}</text>
                    </view>
                    <view class="recent-target">
                        <text class="lang-tag">{{ item.target_language }}</text>
                        <text class="recent-text translated">{{ item.translated_text }}</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="features-section">
            <view class="section-title">核心功能</view>
            <view class="features-list">
                <view class="feature-item">
                    <view class="feature-icon">
                        <text class="feature-icon-text">🎤</text>
                    </view>
                    <view class="feature-content">
                        <text class="feature-title">实时语音翻译</text>
                        <text class="feature-desc">支持流式ASR语音识别，边说边转文字，低延迟体验</text>
                    </view>
                </view>
                <view class="feature-item">
                    <view class="feature-icon">
                        <text class="feature-icon-text">🌍</text>
                    </view>
                    <view class="feature-content">
                        <text class="feature-title">多语种互译</text>
                        <text class="feature-desc">支持中英、中日、中韩等多语种，商务术语优化</text>
                    </view>
                </view>
                <view class="feature-item">
                    <view class="feature-icon">
                        <text class="feature-icon-text">📷</text>
                    </view>
                    <view class="feature-content">
                        <text class="feature-title">智能OCR识别</text>
                        <text class="feature-desc">基于PaddleOCR，支持发票、火车票、机票等票据识别</text>
                    </view>
                </view>
                <view class="feature-item">
                    <view class="feature-icon">
                        <text class="feature-icon-text">✅</text>
                    </view>
                    <view class="feature-content">
                        <text class="feature-title">财税规则核验</text>
                        <text class="feature-desc">自动校验发票真伪、抬头匹配、防止重复报销</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import { translationApi, invoiceApi } from '@/utils/request.js'

export default {
    data() {
        return {
            stats: {
                translationHistory: 0,
                invoiceCount: 0,
                verifiedCount: 0,
                reimbursedCount: 0
            },
            recentTranslations: []
        }
    },
    onLoad() {
        this.loadData()
    },
    onShow() {
        this.loadData()
    },
    methods: {
        async loadData() {
            await Promise.all([
                this.loadTranslationHistory(),
                this.loadInvoiceStats()
            ])
        },
        async loadTranslationHistory() {
            try {
                const res = await translationApi.get('/translation/history', {
                    page: 1,
                    page_size: 3
                })
                this.recentTranslations = res.items || []
                this.stats.translationHistory = res.total || 0
            } catch (e) {
                console.log('获取翻译历史失败:', e)
                this.recentTranslations = []
            }
        },
        async loadInvoiceStats() {
            try {
                const res = await invoiceApi.get('/invoice/stats')
                this.stats.invoiceCount = res.total_invoices || 0
                this.stats.verifiedCount = res.verified || 0
                this.stats.reimbursedCount = res.reimbursed || 0
            } catch (e) {
                console.log('获取发票统计失败:', e)
            }
        },
        goToTranslation() {
            uni.switchTab({
                url: '/pages/translation/index'
            })
        },
        goToPhrases() {
            uni.navigateTo({
                url: '/pages/translation/phrases'
            })
        },
        goToHistory() {
            uni.navigateTo({
                url: '/pages/translation/history'
            })
        },
        goToInvoiceUpload() {
            uni.switchTab({
                url: '/pages/invoice/index'
            })
        },
        goToInvoiceList() {
            uni.navigateTo({
                url: '/pages/invoice/list'
            })
        }
    }
}
</script>

<style scoped>
.home-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #1E88E5 0%, #1565C0 30%, #F5F5F5 30%);
}

.header {
    padding: 60rpx 40rpx 80rpx;
}

.header-content {
    text-align: center;
}

.title {
    display: block;
    font-size: 48rpx;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 16rpx;
}

.subtitle {
    display: block;
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
}

.quick-actions {
    margin: -40rpx 30rpx 30rpx;
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.section-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 30rpx;
}

.actions-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
}

.action-item {
    width: 22%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.action-icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16rpx;
}

.translate-icon {
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
}

.phrases-icon {
    background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
}

.invoice-icon {
    background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}

.list-icon {
    background: linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%);
}

.icon-text {
    font-size: 40rpx;
    font-weight: 600;
}

.translate-icon .icon-text {
    color: #1565C0;
}

.phrases-icon .icon-text {
    color: #E65100;
}

.invoice-icon .icon-text {
    color: #2E7D32;
}

.list-icon .icon-text {
    color: #6A1B9A;
}

.action-text {
    font-size: 24rpx;
    color: #666666;
}

.stats-section {
    margin: 0 30rpx 30rpx;
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
}

.stats-grid {
    display: flex;
    flex-wrap: wrap;
}

.stat-item {
    width: 25%;
    text-align: center;
}

.stat-number {
    display: block;
    font-size: 44rpx;
    font-weight: 600;
    color: #1E88E5;
    margin-bottom: 8rpx;
}

.stat-label {
    display: block;
    font-size: 24rpx;
    color: #999999;
}

.recent-section {
    margin: 0 30rpx 30rpx;
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.view-all {
    font-size: 26rpx;
    color: #1E88E5;
}

.recent-list {
    border-top: 1rpx solid #EEEEEE;
    padding-top: 20rpx;
}

.recent-item {
    padding: 20rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.recent-item:last-child {
    border-bottom: none;
}

.recent-source,
.recent-target {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
}

.recent-target {
    margin-bottom: 0;
}

.lang-tag {
    padding: 4rpx 12rpx;
    background-color: #E3F2FD;
    color: #1565C0;
    font-size: 22rpx;
    border-radius: 6rpx;
    margin-right: 16rpx;
}

.recent-text {
    flex: 1;
    font-size: 28rpx;
    color: #333333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.recent-text.translated {
    color: #666666;
}

.features-section {
    margin: 0 30rpx 40rpx;
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
}

.features-list {
    display: flex;
    flex-direction: column;
}

.feature-item {
    display: flex;
    align-items: flex-start;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #F5F5F5;
}

.feature-item:last-child {
    border-bottom: none;
}

.feature-icon {
    width: 80rpx;
    height: 80rpx;
    background: linear-gradient(135deg, #F5F5F5 0%, #EEEEEE 100%);
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    flex-shrink: 0;
}

.feature-icon-text {
    font-size: 40rpx;
}

.feature-content {
    flex: 1;
}

.feature-title {
    display: block;
    font-size: 30rpx;
    font-weight: 500;
    color: #333333;
    margin-bottom: 8rpx;
}

.feature-desc {
    display: block;
    font-size: 24rpx;
    color: #999999;
    line-height: 1.5;
}
</style>
