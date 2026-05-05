<template>
    <view class="phrases-page">
        <view class="category-tabs">
            <scroll-view class="tabs-scroll" scroll-x>
                <view class="tabs-list">
                    <view 
                        class="tab-item" 
                        :class="{ active: currentCategory === 'all' }"
                        @click="selectCategory('all')"
                    >
                        <text class="tab-text">全部</text>
                        <text class="tab-count" v-if="currentCategory === 'all'"> ({{ totalCount }})</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentCategory === 'greeting' }"
                        @click="selectCategory('greeting')"
                    >
                        <text class="tab-text">问候语</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentCategory === 'business' }"
                        @click="selectCategory('business')"
                    >
                        <text class="tab-text">商务用语</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentCategory === 'trade' }"
                        @click="selectCategory('trade')"
                    >
                        <text class="tab-text">贸易术语</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentCategory === 'favorite' }"
                        @click="selectCategory('favorite')"
                    >
                        <text class="tab-text">我的收藏</text>
                    </view>
                    <view 
                        class="tab-item" 
                        :class="{ active: currentCategory === 'custom' }"
                        @click="selectCategory('custom')"
                    >
                        <text class="tab-text">自定义</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <view class="language-selector">
            <view class="lang-select" @click="showSourcePicker = true">
                <text class="lang-text">{{ getLangName(sourceLang) }}</text>
                <text class="arrow">▼</text>
            </view>
            <view class="swap-btn" @click="swapLanguages">
                <text class="swap-icon">⇄</text>
            </view>
            <view class="lang-select" @click="showTargetPicker = true">
                <text class="lang-text">{{ getLangName(targetLang) }}</text>
                <text class="arrow">▼</text>
            </view>
        </view>

        <view class="phrases-list" v-if="phrases.length > 0">
            <view 
                class="phrase-card" 
                v-for="(phrase, index) in phrases" 
                :key="phrase.id || index"
            >
                <view class="card-header">
                    <view class="category-tag" :class="phrase.category">
                        <text class="tag-text">{{ getCategoryName(phrase.category) }}</text>
                    </view>
                    <view class="favorite-btn" @click="toggleFavorite(phrase)">
                        <text class="heart-icon">{{ phrase.is_favorite ? '❤️' : '🤍' }}</text>
                    </view>
                </view>
                <view class="card-content">
                    <view class="source-section">
                        <view class="lang-label">
                            <text class="lang-name">{{ getLangName(sourceLang) }}</text>
                        </view>
                        <text class="phrase-text">{{ getSourceText(phrase) }}</text>
                    </view>
                    <view class="divider-line"></view>
                    <view class="target-section">
                        <view class="lang-label">
                            <text class="lang-name">{{ getLangName(targetLang) }}</text>
                        </view>
                        <text class="phrase-text translated">{{ getTargetText(phrase) }}</text>
                    </view>
                </view>
                <view class="card-actions">
                    <view class="action-btn" @click="playSource(phrase)">
                        <text class="action-icon">🔊</text>
                        <text class="action-text">播放原文</text>
                    </view>
                    <view class="action-btn" @click="playTarget(phrase)">
                        <text class="action-icon">🔊</text>
                        <text class="action-text">播放译文</text>
                    </view>
                    <view class="action-btn" @click="usePhrase(phrase)">
                        <text class="action-icon">📝</text>
                        <text class="action-text">使用</text>
                    </view>
                    <view class="action-btn" @click="copyPhrase(phrase)">
                        <text class="action-icon">📋</text>
                        <text class="action-text">复制</text>
                    </view>
                </view>
            </view>
        </view>

        <view class="empty-state" v-else-if="!loading">
            <view class="empty-icon">
                <text class="icon-text">📚</text>
            </view>
            <text class="empty-title">暂无短语</text>
            <text class="empty-desc">{{ getEmptyDesc() }}</text>
            <view class="empty-action" @click="showAddPhrase = true" v-if="currentCategory === 'custom'">
                <text class="action-text">添加自定义短语</text>
            </view>
        </view>

        <view class="loading-state" v-else>
            <text class="loading-text">加载中...</text>
        </view>

        <view class="add-fab" @click="showAddPhrase = true">
            <text class="fab-icon">+</text>
        </view>

        <view class="add-modal" v-if="showAddPhrase" @click="closeAddModal">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">添加自定义短语</text>
                    <view class="close-btn" @click="closeAddModal">
                        <text class="close-icon">✕</text>
                    </view>
                </view>
                <view class="modal-body">
                    <view class="form-item">
                        <text class="form-label">原文 ({{ getLangName(newPhrase.source_language) }})</text>
                        <textarea 
                            class="form-textarea" 
                            v-model="newPhrase.source_text"
                            placeholder="请输入原文"
                        />
                    </view>
                    <view class="form-item">
                        <text class="form-label">译文 ({{ getLangName(newPhrase.target_language) }})</text>
                        <textarea 
                            class="form-textarea" 
                            v-model="newPhrase.target_text"
                            placeholder="请输入译文"
                        />
                    </view>
                    <view class="form-item">
                        <text class="form-label">分类</text>
                        <picker 
                            :value="categoryIndex" 
                            :range="categoryOptions" 
                            range-key="name"
                            @change="onCategoryChange"
                        >
                            <view class="picker-view">
                                <text class="picker-text">{{ currentCategoryName }}</text>
                                <text class="picker-arrow">▼</text>
                            </view>
                        </picker>
                    </view>
                </view>
                <view class="modal-footer">
                    <view class="cancel-btn" @click="closeAddModal">
                        <text class="btn-text">取消</text>
                    </view>
                    <view class="confirm-btn" @click="saveNewPhrase">
                        <text class="btn-text">保存</text>
                    </view>
                </view>
            </view>
        </view>

        <picker :value="sourceLangIndex" :range="languages" range-key="name" @change="onSourceChange" v-if="showSourcePicker">
            <view style="display: none;"></view>
        </picker>
        <picker :value="targetLangIndex" :range="languages" range-key="name" @change="onTargetChange" v-if="showTargetPicker">
            <view style="display: none;"></view>
        </picker>
    </view>
</template>

<script>
import { translationApi } from '@/utils/request.js'

export default {
    data() {
        return {
            languages: [
                { code: 'zh', name: '中文' },
                { code: 'en', name: '英文' },
                { code: 'ja', name: '日语' },
                { code: 'ko', name: '韩语' }
            ],
            categories: [
                { code: 'greeting', name: '问候语' },
                { code: 'business', name: '商务用语' },
                { code: 'trade', name: '贸易术语' }
            ],
            categoryOptions: [
                { code: 'greeting', name: '问候语' },
                { code: 'business', name: '商务用语' },
                { code: 'trade', name: '贸易术语' },
                { code: 'custom', name: '自定义' }
            ],
            currentCategory: 'all',
            sourceLang: 'zh',
            targetLang: 'en',
            phrases: [],
            loading: true,
            showSourcePicker: false,
            showTargetPicker: false,
            showAddPhrase: false,
            newPhrase: {
                source_language: 'zh',
                target_language: 'en',
                source_text: '',
                target_text: '',
                category: 'custom'
            }
        }
    },
    computed: {
        sourceLangIndex() {
            return this.languages.findIndex(lang => lang.code === this.sourceLang)
        },
        targetLangIndex() {
            return this.languages.findIndex(lang => lang.code === this.targetLang)
        },
        totalCount() {
            return this.phrases.length
        },
        categoryIndex() {
            return this.categoryOptions.findIndex(cat => cat.code === this.newPhrase.category)
        },
        currentCategoryName() {
            const cat = this.categoryOptions.find(c => c.code === this.newPhrase.category)
            return cat ? cat.name : '自定义'
        }
    },
    onLoad() {
        this.loadPhrases()
    },
    onShow() {
        this.loadPhrases()
    },
    methods: {
        getLangName(code) {
            const lang = this.languages.find(l => l.code === code)
            return lang ? lang.name : code
        },
        getCategoryName(code) {
            const map = {
                'greeting': '问候语',
                'business': '商务用语',
                'trade': '贸易术语',
                'custom': '自定义',
                'favorite': '收藏'
            }
            return map[code] || code
        },
        getEmptyDesc() {
            if (this.currentCategory === 'favorite') {
                return '您还没有收藏任何短语，点击❤️即可收藏'
            }
            if (this.currentCategory === 'custom') {
                return '您还没有添加自定义短语，点击下方按钮添加'
            }
            return '该分类下暂无短语'
        },
        getSourceText(phrase) {
            if (this.sourceLang === 'zh') {
                return phrase.source_text || phrase.zh_text || ''
            }
            if (this.sourceLang === 'en') {
                return phrase.en_text || phrase.target_text || ''
            }
            if (this.sourceLang === 'ja') {
                return phrase.ja_text || phrase.source_text || ''
            }
            if (this.sourceLang === 'ko') {
                return phrase.ko_text || phrase.source_text || ''
            }
            return phrase.source_text || ''
        },
        getTargetText(phrase) {
            if (this.targetLang === 'zh') {
                return phrase.source_text || phrase.zh_text || ''
            }
            if (this.targetLang === 'en') {
                return phrase.en_text || phrase.target_text || ''
            }
            if (this.targetLang === 'ja') {
                return phrase.ja_text || ''
            }
            if (this.targetLang === 'ko') {
                return phrase.ko_text || ''
            }
            return phrase.target_text || ''
        },
        selectCategory(category) {
            this.currentCategory = category
            this.loadPhrases()
        },
        swapLanguages() {
            const temp = this.sourceLang
            this.sourceLang = this.targetLang
            this.targetLang = temp
            this.loadPhrases()
        },
        onSourceChange(e) {
            const index = e.detail.value
            this.sourceLang = this.languages[index].code
            this.showSourcePicker = false
            this.newPhrase.source_language = this.sourceLang
        },
        onTargetChange(e) {
            const index = e.detail.value
            this.targetLang = this.languages[index].code
            this.showTargetPicker = false
            this.newPhrase.target_language = this.targetLang
        },
        onCategoryChange(e) {
            const index = e.detail.value
            this.newPhrase.category = this.categoryOptions[index].code
        },
        async loadPhrases() {
            this.loading = true
            
            try {
                const params = {
                    source_language: this.sourceLang,
                    target_language: this.targetLang
                }
                
                if (this.currentCategory !== 'all') {
                    params.category = this.currentCategory
                }
                
                if (this.currentCategory === 'favorite') {
                    params.only_favorites = true
                }
                
                const res = await translationApi.get('/translation/phrases', params)
                this.phrases = res || []
            } catch (e) {
                console.log('加载短语失败:', e)
                this.phrases = this.getMockPhrases()
            } finally {
                this.loading = false
            }
        },
        getMockPhrases() {
            const mockData = {
                greeting: [
                    {
                        id: 1,
                        category: 'greeting',
                        zh_text: '您好，很高兴认识您。',
                        en_text: 'Hello, nice to meet you.',
                        ja_text: 'こんにちは、お会いできて光栄です。',
                        ko_text: '안녕하세요, 만나서 반갑습니다.',
                        is_favorite: true
                    },
                    {
                        id: 2,
                        category: 'greeting',
                        zh_text: '请问您贵姓？',
                        en_text: 'May I have your name, please?',
                        ja_text: 'お名前を教えていただけますか？',
                        ko_text: '성함이 어떻게 되십니까?',
                        is_favorite: false
                    }
                ],
                business: [
                    {
                        id: 3,
                        category: 'business',
                        zh_text: '我们希望与贵公司建立长期合作关系。',
                        en_text: 'We hope to establish a long-term cooperation with your company.',
                        ja_text: '貴社と長期的な提携関係を構築したいと考えています。',
                        ko_text: '귀사와 장기적인 협력 관계를 맺기를 희망합니다.',
                        is_favorite: true
                    },
                    {
                        id: 4,
                        category: 'business',
                        zh_text: '请提供产品报价单。',
                        en_text: 'Please provide a quotation for the products.',
                        ja_text: '製品の見積もりをご提供ください。',
                        ko_text: '제품 견적서를 제공해 주십시오.',
                        is_favorite: false
                    }
                ],
                trade: [
                    {
                        id: 5,
                        category: 'trade',
                        zh_text: 'FOB上海价，付款方式为信用证。',
                        en_text: 'FOB Shanghai, payment by letter of credit.',
                        ja_text: 'FOB上海、支払い方法はL/Cです。',
                        ko_text: 'FOB 상해, 지급 방식은 신용장입니다.',
                        is_favorite: false
                    },
                    {
                        id: 6,
                        category: 'trade',
                        zh_text: '样品将在三个工作日内寄出。',
                        en_text: 'Samples will be sent within three working days.',
                        ja_text: 'サンプルは3営業日以内に発送いたします。',
                        ko_text: '샘플은 3영업일 이내에 발송될 예정입니다.',
                        is_favorite: true
                    }
                ]
            }
            
            let result = []
            if (this.currentCategory === 'all') {
                result = [...mockData.greeting, ...mockData.business, ...mockData.trade]
            } else if (this.currentCategory === 'favorite') {
                result = [...mockData.greeting, ...mockData.business, ...mockData.trade].filter(p => p.is_favorite)
            } else {
                result = mockData[this.currentCategory] || []
            }
            
            return result
        },
        toggleFavorite(phrase) {
            phrase.is_favorite = !phrase.is_favorite
            uni.showToast({
                title: phrase.is_favorite ? '已收藏' : '已取消收藏',
                icon: 'success'
            })
        },
        playSource(phrase) {
            uni.showToast({ title: '语音播放功能演示', icon: 'none', duration: 1500 })
        },
        playTarget(phrase) {
            uni.showToast({ title: '语音播放功能演示', icon: 'none', duration: 1500 })
        },
        usePhrase(phrase) {
            const text = this.getSourceText(phrase)
            uni.navigateTo({
                url: `/pages/translation/index?source=${this.sourceLang}&target=${this.targetLang}&text=${encodeURIComponent(text)}`
            })
        },
        copyPhrase(phrase) {
            const source = this.getSourceText(phrase)
            const target = this.getTargetText(phrase)
            const fullText = `${source}\n${target}`
            
            uni.setClipboardData({
                data: fullText,
                success: () => {
                    uni.showToast({ title: '已复制', icon: 'success' })
                }
            })
        },
        closeAddModal() {
            this.showAddPhrase = false
            this.newPhrase = {
                source_language: this.sourceLang,
                target_language: this.targetLang,
                source_text: '',
                target_text: '',
                category: 'custom'
            }
        },
        async saveNewPhrase() {
            if (!this.newPhrase.source_text.trim() || !this.newPhrase.target_text.trim()) {
                uni.showToast({ title: '请填写原文和译文', icon: 'none' })
                return
            }
            
            try {
                await translationApi.post('/translation/phrases', this.newPhrase)
                uni.showToast({ title: '添加成功', icon: 'success' })
                this.closeAddModal()
                this.loadPhrases()
            } catch (e) {
                console.log('添加短语失败:', e)
                const newPhrase = {
                    id: Date.now(),
                    ...this.newPhrase,
                    source_text: this.newPhrase.source_text,
                    target_text: this.newPhrase.target_text,
                    zh_text: this.newPhrase.source_language === 'zh' ? this.newPhrase.source_text : '',
                    en_text: this.newPhrase.source_language === 'en' ? this.newPhrase.source_text : '',
                    is_favorite: false
                }
                this.phrases.unshift(newPhrase)
                uni.showToast({ title: '添加成功', icon: 'success' })
                this.closeAddModal()
            }
        }
    }
}
</script>

<style scoped>
.phrases-page {
    min-height: 100vh;
    background-color: #F5F5F5;
    padding-bottom: 120rpx;
}

.category-tabs {
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
}

.tabs-scroll {
    white-space: nowrap;
}

.tabs-list {
    display: flex;
}

.tab-item {
    flex-shrink: 0;
    padding: 16rpx 28rpx;
    background-color: #F5F7FA;
    border-radius: 28rpx;
    margin-right: 16rpx;
    display: flex;
    align-items: center;
}

.tab-item.active {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.tab-text {
    font-size: 26rpx;
    color: #666666;
}

.tab-item.active .tab-text {
    color: #FFFFFF;
}

.tab-count {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.8);
}

.language-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30rpx;
    background-color: #FFFFFF;
    margin-top: 20rpx;
}

.lang-select {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
}

.lang-text {
    font-size: 30rpx;
    color: #333333;
    margin-right: 8rpx;
}

.arrow {
    font-size: 20rpx;
    color: #999999;
}

.swap-btn {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 50%;
    margin: 0 24rpx;
}

.swap-icon {
    font-size: 32rpx;
    color: #FFFFFF;
}

.phrases-list {
    padding: 20rpx 30rpx;
}

.phrase-card {
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.category-tag {
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
}

.category-tag.greeting {
    background-color: #E3F2FD;
    color: #1565C0;
}

.category-tag.business {
    background-color: #FFF3E0;
    color: #E65100;
}

.category-tag.trade {
    background-color: #E8F5E9;
    color: #2E7D32;
}

.category-tag.custom {
    background-color: #F3E5F5;
    color: #6A1B9A;
}

.tag-text {
    font-size: 22rpx;
}

.favorite-btn {
    padding: 8rpx;
}

.heart-icon {
    font-size: 36rpx;
}

.card-content {
    padding: 24rpx;
    background-color: #FAFAFA;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
}

.source-section,
.target-section {
    padding: 8rpx 0;
}

.lang-label {
    margin-bottom: 12rpx;
}

.lang-name {
    font-size: 22rpx;
    color: #999999;
    background-color: #EFEFEF;
    padding: 4rpx 12rpx;
    border-radius: 4rpx;
}

.phrase-text {
    font-size: 30rpx;
    color: #333333;
    line-height: 1.8;
}

.phrase-text.translated {
    color: #2E7D32;
}

.divider-line {
    height: 1rpx;
    background-color: #E0E0E0;
    margin: 16rpx 0;
}

.card-actions {
    display: flex;
    justify-content: space-around;
    padding-top: 20rpx;
    border-top: 1rpx solid #F5F5F5;
}

.action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
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
    background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
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
    text-align: center;
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

.add-fab {
    position: fixed;
    bottom: 40rpx;
    right: 40rpx;
    width: 100rpx;
    height: 100rpx;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 24rpx rgba(30, 136, 229, 0.4);
}

.fab-icon {
    font-size: 48rpx;
    color: #FFFFFF;
    font-weight: 300;
}

.add-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    z-index: 1000;
}

.modal-content {
    width: 100%;
    background-color: #FFFFFF;
    border-radius: 32rpx 32rpx 0 0;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #F5F5F5;
}

.modal-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
}

.close-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-icon {
    font-size: 36rpx;
    color: #999999;
}

.modal-body {
    padding: 30rpx;
}

.form-item {
    margin-bottom: 30rpx;
}

.form-label {
    display: block;
    font-size: 28rpx;
    color: #666666;
    margin-bottom: 16rpx;
}

.form-textarea {
    width: 100%;
    height: 160rpx;
    padding: 20rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #333333;
}

.picker-view {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 24rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
}

.picker-text {
    font-size: 28rpx;
    color: #333333;
}

.picker-arrow {
    font-size: 20rpx;
    color: #999999;
}

.modal-footer {
    display: flex;
    padding: 30rpx;
    padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
    border-top: 1rpx solid #F5F5F5;
}

.cancel-btn,
.confirm-btn {
    flex: 1;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 44rpx;
}

.cancel-btn {
    background-color: #F5F7FA;
    margin-right: 20rpx;
}

.confirm-btn {
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
}

.cancel-btn .btn-text {
    font-size: 30rpx;
    color: #666666;
}

.confirm-btn .btn-text {
    font-size: 30rpx;
    color: #FFFFFF;
}
</style>
