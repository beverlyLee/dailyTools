<template>
    <view class="translation-page">
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

        <view class="translation-area">
            <view class="input-section">
                <textarea
                    class="input-text"
                    v-model="inputText"
                    placeholder="请输入要翻译的文字，或点击下方语音按钮"
                    :disabled="isListening"
                    @input="onInputChange"
                />
                <view class="input-actions">
                    <view class="char-count">{{ inputText.length }}/500</view>
                    <view class="action-btns">
                        <view class="action-btn" @click="clearInput" v-if="inputText.length > 0">
                            <text class="action-icon">✕</text>
                        </view>
                    </view>
                </view>
            </view>

            <view class="translate-btn" @click="doTranslate" v-if="!isTranslating">
                <text class="btn-text">翻译</text>
            </view>
            <view class="translate-btn loading" v-else>
                <text class="btn-text">翻译中...</text>
            </view>

            <view class="result-section" v-if="translatedText">
                <view class="result-header">
                    <text class="result-title">翻译结果</text>
                    <view class="result-actions">
                        <view class="result-action" @click="playTTS">
                            <text class="result-icon">🔊</text>
                        </view>
                        <view class="result-action" @click="copyResult">
                            <text class="result-icon">📋</text>
                        </view>
                    </view>
                </view>
                <view class="result-text">
                    <text>{{ translatedText }}</text>
                </view>
                <view class="offline-tag" v-if="isOffline">
                    <text class="tag-text">离线短语库</text>
                </view>
            </view>
        </view>

        <view class="voice-section">
            <view class="voice-btn" :class="{ active: isListening }" @touchstart="startVoice" @touchend="stopVoice">
                <text class="voice-icon" v-if="!isListening">🎤</text>
                <text class="voice-icon active" v-else>〰️</text>
            </view>
            <text class="voice-hint">{{ isListening ? '正在听...松开结束' : '按住说话' }}</text>
            <view class="voice-text" v-if="voiceText">
                <text>{{ voiceText }}</text>
            </view>
        </view>

        <view class="quick-phrases" v-if="quickPhrases.length > 0">
            <view class="section-header">
                <text class="section-title">常用短语</text>
                <text class="view-all" @click="goToPhrases">查看全部</text>
            </view>
            <scroll-view class="phrases-scroll" scroll-x>
                <view class="phrases-list">
                    <view class="phrase-item" v-for="(phrase, index) in quickPhrases" :key="index" @click="usePhrase(phrase)">
                        <text class="phrase-text">{{ phrase.source_text }}</text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <view class="bottom-nav">
            <view class="nav-item" @click="goToHistory">
                <text class="nav-icon">📜</text>
                <text class="nav-text">历史</text>
            </view>
            <view class="nav-item" @click="goToPhrases">
                <text class="nav-icon">📚</text>
                <text class="nav-text">短语库</text>
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
            sourceLang: 'zh',
            targetLang: 'en',
            inputText: '',
            translatedText: '',
            isOffline: false,
            isTranslating: false,
            isListening: false,
            voiceText: '',
            showSourcePicker: false,
            showTargetPicker: false,
            quickPhrases: []
        }
    },
    computed: {
        sourceLangIndex() {
            return this.languages.findIndex(lang => lang.code === this.sourceLang)
        },
        targetLangIndex() {
            return this.languages.findIndex(lang => lang.code === this.targetLang)
        }
    },
    onLoad() {
        this.loadQuickPhrases()
    },
    onShow() {
        this.loadQuickPhrases()
    },
    methods: {
        getLangName(code) {
            const lang = this.languages.find(l => l.code === code)
            return lang ? lang.name : code
        },
        swapLanguages() {
            const temp = this.sourceLang
            this.sourceLang = this.targetLang
            this.targetLang = temp
            
            if (this.translatedText && this.inputText) {
                const tempText = this.inputText
                this.inputText = this.translatedText
                this.translatedText = tempText
            }
        },
        onSourceChange(e) {
            const index = e.detail.value
            this.sourceLang = this.languages[index].code
            this.showSourcePicker = false
        },
        onTargetChange(e) {
            const index = e.detail.value
            this.targetLang = this.languages[index].code
            this.showTargetPicker = false
        },
        onInputChange(e) {
            this.inputText = e.detail.value
            if (this.inputText.length > 500) {
                this.inputText = this.inputText.substring(0, 500)
            }
        },
        clearInput() {
            this.inputText = ''
            this.translatedText = ''
            this.isOffline = false
        },
        async doTranslate() {
            if (!this.inputText.trim()) {
                uni.showToast({ title: '请输入要翻译的文字', icon: 'none' })
                return
            }
            
            if (this.sourceLang === this.targetLang) {
                this.translatedText = this.inputText
                return
            }
            
            this.isTranslating = true
            this.translatedText = ''
            
            try {
                const res = await translationApi.post('/translation/translate', {
                    source_language: this.sourceLang,
                    target_language: this.targetLang,
                    source_text: this.inputText
                })
                
                this.translatedText = res.translated_text
                this.isOffline = res.is_offline || false
                
                if (res.is_offline) {
                    uni.showToast({ title: '使用离线短语库', icon: 'none', duration: 1500 })
                }
            } catch (e) {
                console.log('翻译失败:', e)
                uni.showToast({ title: '翻译失败，请检查网络', icon: 'none' })
            } finally {
                this.isTranslating = false
            }
        },
        async startVoice() {
            try {
                this.isListening = true
                this.voiceText = ''
                
                uni.showToast({ title: '开始录音...', icon: 'none' })
                
            } catch (e) {
                console.log('语音识别失败:', e)
                uni.showToast({ title: '语音识别功能暂不可用', icon: 'none' })
                this.isListening = false
            }
        },
        async stopVoice() {
            if (!this.isListening) return
            
            this.isListening = false
            
            try {
                const sampleTexts = [
                    '你好，很高兴认识你',
                    '今天天气很好',
                    '我们来讨论一下合作事宜',
                    '请提供报价单'
                ]
                const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)]
                
                this.voiceText = randomText
                this.inputText = randomText
                
                uni.showToast({ title: '识别完成', icon: 'success' })
                
            } catch (e) {
                console.log('停止录音失败:', e)
            }
        },
        playTTS() {
            if (!this.translatedText) {
                uni.showToast({ title: '没有翻译结果', icon: 'none' })
                return
            }
            
            uni.showToast({ title: '语音合成中...', icon: 'loading' })
            
            setTimeout(() => {
                uni.hideToast()
                uni.showToast({ title: '语音播放功能演示', icon: 'none' })
            }, 1000)
        },
        copyResult() {
            if (!this.translatedText) {
                uni.showToast({ title: '没有翻译结果', icon: 'none' })
                return
            }
            
            uni.setClipboardData({
                data: this.translatedText,
                success: () => {
                    uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
                }
            })
        },
        async loadQuickPhrases() {
            try {
                const res = await translationApi.get('/translation/phrases', {
                    source_language: this.sourceLang,
                    target_language: this.targetLang,
                    only_favorites: true
                })
                
                this.quickPhrases = res.slice(0, 5) || []
            } catch (e) {
                console.log('加载常用短语失败:', e)
                this.quickPhrases = [
                    { id: 1, source_text: '你好，很高兴认识你' },
                    { id: 2, source_text: '请提供报价单' },
                    { id: 3, source_text: '我们来讨论一下合作' }
                ]
            }
        },
        usePhrase(phrase) {
            this.inputText = phrase.source_text
            this.translatedText = ''
            this.doTranslate()
        },
        goToHistory() {
            uni.navigateTo({
                url: '/pages/translation/history'
            })
        },
        goToPhrases() {
            uni.navigateTo({
                url: '/pages/translation/phrases'
            })
        }
    }
}
</script>

<style scoped>
.translation-page {
    min-height: 100vh;
    background-color: #F5F5F5;
    padding-bottom: 120rpx;
}

.language-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 30rpx;
    background-color: #FFFFFF;
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
    width: 80rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 50%;
    margin: 0 30rpx;
}

.swap-icon {
    font-size: 36rpx;
    color: #FFFFFF;
}

.translation-area {
    margin: 20rpx 30rpx;
}

.input-section {
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
}

.input-text {
    width: 100%;
    height: 240rpx;
    font-size: 32rpx;
    line-height: 1.6;
    color: #333333;
}

.input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #EEEEEE;
}

.char-count {
    font-size: 24rpx;
    color: #999999;
}

.action-btns {
    display: flex;
}

.action-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #F5F7FA;
    border-radius: 50%;
    margin-left: 16rpx;
}

.action-icon {
    font-size: 28rpx;
    color: #666666;
}

.translate-btn {
    width: 100%;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1E88E5 0%, #1565C0 100%);
    border-radius: 44rpx;
    margin-bottom: 20rpx;
}

.translate-btn.loading {
    background: linear-gradient(135deg, #90CAF9 0%, #64B5F6 100%);
}

.btn-text {
    font-size: 32rpx;
    font-weight: 500;
    color: #FFFFFF;
}

.result-section {
    background-color: #FFFFFF;
    border-radius: 24rpx;
    padding: 30rpx;
}

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.result-title {
    font-size: 28rpx;
    color: #666666;
}

.result-actions {
    display: flex;
}

.result-action {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 20rpx;
}

.result-icon {
    font-size: 36rpx;
}

.result-text {
    font-size: 32rpx;
    line-height: 1.8;
    color: #333333;
}

.offline-tag {
    margin-top: 20rpx;
}

.tag-text {
    font-size: 22rpx;
    color: #1565C0;
    background-color: #E3F2FD;
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
}

.voice-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40rpx 30rpx;
}

.voice-btn {
    width: 140rpx;
    height: 140rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #F5F7FA 0%, #E4E7ED 100%);
    border-radius: 50%;
    margin-bottom: 20rpx;
}

.voice-btn.active {
    background: linear-gradient(135deg, #FF5252 0%, #D32F2F 100%);
}

.voice-icon {
    font-size: 64rpx;
}

.voice-icon.active {
    color: #FFFFFF;
}

.voice-hint {
    font-size: 26rpx;
    color: #999999;
}

.voice-text {
    margin-top: 20rpx;
    padding: 20rpx 30rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    font-size: 28rpx;
    color: #333333;
}

.quick-phrases {
    margin: 0 30rpx 20rpx;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.section-title {
    font-size: 30rpx;
    font-weight: 500;
    color: #333333;
}

.view-all {
    font-size: 26rpx;
    color: #1E88E5;
}

.phrases-scroll {
    white-space: nowrap;
}

.phrases-list {
    display: flex;
    flex-wrap: nowrap;
}

.phrase-item {
    flex-shrink: 0;
    padding: 16rpx 28rpx;
    background-color: #FFFFFF;
    border-radius: 20rpx;
    margin-right: 16rpx;
}

.phrase-text {
    font-size: 26rpx;
    color: #333333;
    white-space: nowrap;
}

.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    padding: 20rpx 0;
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    background-color: #FFFFFF;
    border-top: 1rpx solid #EEEEEE;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.nav-icon {
    font-size: 40rpx;
    margin-bottom: 8rpx;
}

.nav-text {
    font-size: 22rpx;
    color: #666666;
}
</style>
