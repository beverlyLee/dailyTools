<template>
    <view class="history-page">
        <view class="search-bar">
            <view class="search-input">
                <text class="search-icon">🔍</text>
                <input 
                    class="input-field" 
                    v-model="searchKeyword" 
                    placeholder="搜索翻译历史"
                    @confirm="doSearch"
                />
            </view>
        </view>

        <view class="filter-bar">
            <scroll-view class="filter-scroll" scroll-x>
                <view class="filter-list">
                    <view 
                        class="filter-item" 
                        :class="{ active: currentFilter === 'all' }"
                        @click="setFilter('all')"
                    >
                        <text class="filter-text">全部</text>
                    </view>
                    <view 
                        class="filter-item" 
                        :class="{ active: currentFilter === 'zh-en' }"
                        @click="setFilter('zh-en')"
                    >
                        <text class="filter-text">中英</text>
                    </view>
                    <view 
                        class="filter-item" 
                        :class="{ active: currentFilter === 'zh-ja' }"
                        @click="setFilter('zh-ja')"
                    >
                        <text class="filter-text">中日</text>
                    </view>
                    <view 
                        class="filter-item" 
                        :class="{ active: currentFilter === 'zh-ko' }"
                        @click="setFilter('zh-ko')"
                    >
                        <text class="filter-text">中韩</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <view class="history-list" v-if="historyList.length > 0">
            <view 
                class="history-item" 
                v-for="(item, index) in historyList" 
                :key="item.id || index"
                @click="viewDetail(item)"
            >
                <view class="item-header">
                    <view class="lang-pair">
                        <text class="lang-tag">{{ getLangName(item.source_language) }}</text>
                        <text class="arrow">→</text>
                        <text class="lang-tag target">{{ getLangName(item.target_language) }}</text>
                    </view>
                    <text class="time">{{ formatTime(item.created_at) }}</text>
                </view>
                <view class="item-content">
                    <view class="text-row">
                        <text class="text-label">原文:</text>
                        <text class="text-content source">{{ item.source_text }}</text>
                    </view>
                    <view class="text-row" v-if="item.translated_text">
                        <text class="text-label">译文:</text>
                        <text class="text-content target">{{ item.translated_text }}</text>
                    </view>
                </view>
                <view class="item-actions">
                    <view class="action-btn" @click.stop="copySource(item)">
                        <text class="action-icon">📋</text>
                        <text class="action-text">复制原文</text>
                    </view>
                    <view class="action-btn" @click.stop="copyTranslation(item)">
                        <text class="action-icon">📋</text>
                        <text class="action-text">复制译文</text>
                    </view>
                    <view class="action-btn" @click.stop="useTranslation(item)">
                        <text class="action-icon">🔄</text>
                        <text class="action-text">再翻译</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="empty-state" v-else-if="!loading">
            <view class="empty-icon">
                <text class="icon-text">📜</text>
            </view>
            <text class="empty-title">暂无翻译历史</text>
            <text class="empty-desc">您的翻译记录将显示在这里</text>
            <view class="empty-action" @click="goToTranslation">
                <text class="action-text">去翻译</text>
            </view>
        </view>

        <view class="loading-state" v-else>
            <text class="loading-text">加载中...</text>
        </view>
    </view>
</template>

<script>
import { translationApi } from '@/utils/request.js'

export default {
    data() {
        return {
            searchKeyword: '',
            currentFilter: 'all',
            historyList: [],
            loading: true,
            page: 1,
            pageSize: 20,
            hasMore: true
        }
    },
    onLoad() {
        this.loadHistory()
    },
    onPullDownRefresh() {
        this.page = 1
        this.hasMore = true
        this.loadHistory().then(() => {
            uni.stopPullDownRefresh()
        })
    },
    onReachBottom() {
        if (this.hasMore) {
            this.page++
            this.loadHistory(true)
        }
    },
    methods: {
        getLangName(code) {
            const langMap = {
                'zh': '中文',
                'en': '英文',
                'ja': '日语',
                'ko': '韩语'
            }
            return langMap[code] || code
        },
        formatTime(timeStr) {
            if (!timeStr) return ''
            const date = new Date(timeStr)
            const now = new Date()
            const diffMs = now - date
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)

            if (diffMins < 1) return '刚刚'
            if (diffMins < 60) return `${diffMins}分钟前`
            if (diffHours < 24) return `${diffHours}小时前`
            if (diffDays < 7) return `${diffDays}天前`
            
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
        },
        setFilter(filter) {
            this.currentFilter = filter
            this.page = 1
            this.hasMore = true
            this.historyList = []
            this.loadHistory()
        },
        doSearch() {
            this.page = 1
            this.hasMore = true
            this.historyList = []
            this.loadHistory()
        },
        async loadHistory(append = false) {
            this.loading = true
            
            try {
                const params = {
                    page: this.page,
                    page_size: this.pageSize
                }
                
                if (this.searchKeyword) {
                    params.keyword = this.searchKeyword
                }
                
                if (this.currentFilter !== 'all') {
                    const [source, target] = this.currentFilter.split('-')
                    params.source_language = source
                    params.target_language = target
                }
                
                const res = await translationApi.get('/translation/history', params)
                
                const items = res.items || res || []
                this.hasMore = items.length >= this.pageSize
                
                if (append) {
                    this.historyList = [...this.historyList, ...items]
                } else {
                    this.historyList = items
                }
            } catch (e) {
                console.log('加载翻译历史失败:', e)
                if (!append) {
                    this.historyList = this.getMockData()
                }
            } finally {
                this.loading = false
            }
        },
        getMockData() {
            return [
                {
                    id: 1,
                    source_language: 'zh',
                    target_language: 'en',
                    source_text: '我们很高兴能与贵公司建立业务关系。',
                    translated_text: 'We are very pleased to establish business relations with your company.',
                    created_at: new Date(Date.now() - 1800000).toISOString()
                },
                {
                    id: 2,
                    source_language: 'zh',
                    target_language: 'ja',
                    source_text: '请提供最新的产品目录和价格表。',
                    translated_text: '最新の製品カタログと価格表をご提供ください。',
                    created_at: new Date(Date.now() - 7200000).toISOString()
                },
                {
                    id: 3,
                    source_language: 'en',
                    target_language: 'zh',
                    source_text: 'Thank you for your quotation. We will review it and get back to you.',
                    translated_text: '感谢您的报价。我们将审核后回复您。',
                    created_at: new Date(Date.now() - 86400000).toISOString()
                }
            ]
        },
        viewDetail(item) {
            uni.showToast({ title: '查看详情功能开发中', icon: 'none' })
        },
        copySource(item) {
            uni.setClipboardData({
                data: item.source_text,
                success: () => {
                    uni.showToast({ title: '已复制原文', icon: 'success' })
                }
            })
        },
        copyTranslation(item) {
            if (!item.translated_text) {
                uni.showToast({ title: '没有译文可复制', icon: 'none' })
                return
            }
            uni.setClipboardData({
                data: item.translated_text,
                success: () => {
                    uni.showToast({ title: '已复制译文', icon: 'success' })
                }
            })
        },
        useTranslation(item) {
            uni.navigateTo({
                url: `/pages/translation/index?source=${item.source_language}&target=${item.target_language}&text=${encodeURIComponent(item.source_text)}`
            })
        },
        goToTranslation() {
            uni.switchTab({
                url: '/pages/translation/index'
            })
        }
    }
}
</script>

<style scoped>
.history-page {
    min-height: 100vh;
    background-color: #F5F5F5;
}

.search-bar {
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
}

.search-input {
    display: flex;
    align-items: center;
    padding: 20rpx 24rpx;
    background-color: #F5F7FA;
    border-radius: 40rpx;
}

.search-icon {
    font-size: 32rpx;
    margin-right: 16rpx;
}

.input-field {
    flex: 1;
    font-size: 28rpx;
    color: #333333;
}

.filter-bar {
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
    border-top: 1rpx solid #F5F5F5;
}

.filter-scroll {
    white-space: nowrap;
}

.filter-list {
    display: flex;
}

.filter-item {
    flex-shrink: 0;
    padding: 12rpx 28rpx;
    background-color: #F5F7FA;
    border-radius: 28rpx;
    margin-right: 16rpx;
}

.filter-item.active {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.filter-text {
    font-size: 26rpx;
    color: #666666;
}

.filter-item.active .filter-text {
    color: #FFFFFF;
}

.history-list {
    padding: 20rpx 30rpx;
}

.history-item {
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
}

.item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.lang-pair {
    display: flex;
    align-items: center;
}

.lang-tag {
    padding: 6rpx 16rpx;
    background-color: #E3F2FD;
    color: #1565C0;
    font-size: 22rpx;
    border-radius: 8rpx;
}

.lang-tag.target {
    background-color: #E8F5E9;
    color: #2E7D32;
}

.arrow {
    margin: 0 12rpx;
    font-size: 24rpx;
    color: #999999;
}

.time {
    font-size: 24rpx;
    color: #999999;
}

.item-content {
    padding: 20rpx;
    background-color: #FAFAFA;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
}

.text-row {
    display: flex;
    margin-bottom: 16rpx;
}

.text-row:last-child {
    margin-bottom: 0;
}

.text-label {
    font-size: 24rpx;
    color: #999999;
    margin-right: 12rpx;
    flex-shrink: 0;
}

.text-content {
    font-size: 28rpx;
    color: #333333;
    flex: 1;
    line-height: 1.6;
}

.text-content.target {
    color: #2E7D32;
}

.item-actions {
    display: flex;
    justify-content: space-around;
    padding-top: 20rpx;
    border-top: 1rpx solid #F5F5F5;
}

.action-btn {
    display: flex;
    align-items: center;
    flex-direction: column;
}

.action-icon {
    font-size: 36rpx;
    margin-bottom: 8rpx;
}

.action-text {
    font-size: 22rpx;
    color: #666666;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120rpx 30rpx;
}

.empty-icon {
    width: 160rpx;
    height: 160rpx;
    background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;
}

.icon-text {
    font-size: 72rpx;
}

.empty-title {
    font-size: 32rpx;
    font-weight: 500;
    color: #333333;
    margin-bottom: 16rpx;
}

.empty-desc {
    font-size: 26rpx;
    color: #999999;
    margin-bottom: 40rpx;
}

.empty-action {
    padding: 20rpx 60rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 40rpx;
}

.empty-action .action-text {
    font-size: 30rpx;
    color: #FFFFFF;
}

.loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80rpx;
}

.loading-text {
    font-size: 28rpx;
    color: #999999;
}
</style>
