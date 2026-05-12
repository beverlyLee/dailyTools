import { UserProfile } from './UserProfile.js';
import { ContentFeature } from './ContentFeature.js';
import { RecommendationEngine } from './RecommendationEngine.js';
import { NewsFetcher } from './NewsFetcher.js';
import { AlgorithmConfig } from './AlgorithmConfig.js';

class NewsRecommenderApp {
    constructor() {
        this.algorithmConfig = new AlgorithmConfig();
        this.userProfile = new UserProfile(this.algorithmConfig);
        this.contentFeature = new ContentFeature();
        this.recommendationEngine = new RecommendationEngine(
            this.userProfile,
            this.contentFeature,
            this.algorithmConfig
        );
        this.newsFetcher = new NewsFetcher(this.algorithmConfig);
        
        this.currentView = 'home';
        this.currentNews = null;
        this.viewStartTime = null;
        this.categories = ['体育', '科技', '财经', '娱乐', '生活'];
        this.newsData = [];
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        console.log('[NewsRecommender] 初始化个性化新闻推荐引擎...');
        
        this.initElements();
        this.initAlgorithmConfigPanel();
        this.initApiConfigPanel();
        this.initEventListeners();
        
        this.algorithmConfig.onChange(() => {
            if (this.currentView === 'home') {
                this.renderHome();
            }
        });
        
        try {
            await this.loadNewsData();
            this.renderHome();
            this.updateProfilePanel();
            console.log('[NewsRecommender] 初始化完成');
        } catch (error) {
            console.error('[NewsRecommender] 初始化失败:', error);
            this.showError('加载新闻数据失败，请刷新页面重试');
        }
    }

    initAlgorithmConfigPanel() {
        const config = this.algorithmConfig.getAll();
        const configDesc = this.algorithmConfig.getConfigDescription();
        
        for (const key in configDesc) {
            const value = this.algorithmConfig.get(key);
            const slider = document.querySelector(`[data-config="${key}"]`);
            const valueDisplay = document.getElementById(`value-${key}`);
            
            if (slider) {
                slider.value = value;
            }
            if (valueDisplay) {
                valueDisplay.textContent = this.formatValue(value, key);
            }
        }
    }

    initApiConfigPanel() {
        const apiProvider = this.algorithmConfig.get('api.provider') || 'fallback';
        const apiKey = this.algorithmConfig.get('api.apiKey') || '';
        const apiEndpoint = this.algorithmConfig.get('api.apiEndpoint') || '';
        
        const providerSelect = document.getElementById('apiProvider');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const apiEndpointInput = document.getElementById('apiEndpointInput');
        
        if (providerSelect) {
            providerSelect.value = apiProvider;
            this.toggleApiInputs(apiProvider);
        }
        
        if (apiKeyInput) {
            apiKeyInput.value = apiKey;
        }
        
        if (apiEndpointInput) {
            apiEndpointInput.value = apiEndpoint;
        }
        
        this.updateApiStatus(apiProvider, apiKey);
    }

    toggleApiInputs(provider) {
        const apiKeyWrapper = document.getElementById('apiKeyInputWrapper');
        const apiEndpointWrapper = document.getElementById('apiEndpointInputWrapper');
        const apiKeyDesc = document.getElementById('apiKeyDesc');
        
        if (provider === 'fallback') {
            if (apiKeyWrapper) apiKeyWrapper.style.display = 'none';
            if (apiEndpointWrapper) apiEndpointWrapper.style.display = 'none';
        } else if (provider === 'custom') {
            if (apiKeyWrapper) apiKeyWrapper.style.display = 'block';
            if (apiEndpointWrapper) apiEndpointWrapper.style.display = 'block';
            if (apiKeyDesc) apiKeyDesc.textContent = '自定义API的密钥（可选）';
        } else {
            if (apiKeyWrapper) apiKeyWrapper.style.display = 'block';
            if (apiEndpointWrapper) apiEndpointWrapper.style.display = 'none';
            if (apiKeyDesc) {
                const providerNames = {
                    juhe: '聚合数据',
                    tianapi: '天行数据',
                    gnews: 'GNews'
                };
                apiKeyDesc.textContent = `请输入${providerNames[provider] || 'API'}的密钥`;
            }
        }
    }

    updateApiStatus(provider, apiKey) {
        const statusDot = document.querySelector('#apiStatus .status-dot');
        const statusText = document.querySelector('#apiStatus .status-text');
        
        if (!statusDot || !statusText) return;
        
        statusDot.classList.remove('status-online', 'status-offline', 'status-testing');
        
        if (provider === 'fallback') {
            statusDot.classList.add('status-online');
            statusText.textContent = '本地数据模式';
        } else if (apiKey) {
            statusDot.classList.add('status-online');
            statusText.textContent = '已配置';
        } else {
            statusDot.classList.add('status-offline');
            statusText.textContent = '未配置';
        }
    }

    formatValue(value, key) {
        if (key.includes('Boost') || key.includes('Multiplier')) {
            return value.toFixed(1);
        }
        if (key.includes('viewTime')) {
            return value.toFixed(1);
        }
        return value;
    }

    async loadNewsData() {
        this.isLoading = true;
        this.showLoading();
        
        try {
            this.newsData = await this.newsFetcher.fetchNews({
                category: 'all',
                limit: 100
            });
            console.log('[NewsRecommender] 加载了', this.newsData.length, '条新闻');
        } catch (error) {
            console.error('[NewsRecommender] 加载新闻失败:', error);
            throw error;
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    initElements() {
        this.appContainer = document.getElementById('app');
        this.homeView = document.getElementById('homeView');
        this.newsDetailView = document.getElementById('newsDetailView');
        this.recommendList = document.getElementById('recommendList');
        this.newsDetail = document.getElementById('newsDetail');
        this.categoryNav = document.getElementById('categoryNav');
        this.profilePanel = document.getElementById('profilePanel');
        this.resetBtn = document.getElementById('resetBtn');
        this.backBtn = document.getElementById('backBtn');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.configPanel = document.getElementById('configPanel');
        this.configResetBtn = document.getElementById('configResetBtn');
        this.apiProviderSelect = document.getElementById('apiProvider');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.apiEndpointInput = document.getElementById('apiEndpointInput');
        this.apiTestBtn = document.getElementById('apiTestBtn');
        this.apiTestResult = document.getElementById('apiTestResult');
        this.apiSaveBtn = document.getElementById('apiSaveBtn');
        this.toggleApiKeyBtn = document.getElementById('toggleApiKey');
    }

    initEventListeners() {
        this.categoryNav.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-item')) {
                const category = e.target.dataset.category;
                
                this.categoryNav.querySelectorAll('.category-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                
                if (category === 'all') {
                    this.renderHome();
                } else {
                    this.renderCategory(category);
                }
            }
        });

        this.recommendList.addEventListener('click', (e) => {
            const newsCard = e.target.closest('.news-card');
            if (newsCard) {
                const newsId = parseInt(newsCard.dataset.id, 10);
                const news = this.newsData.find(n => n.id === newsId);
                if (news) {
                    this.openNewsDetail(news);
                }
            }
        });

        this.resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置用户画像吗？这将清除所有浏览历史记录。')) {
                this.userProfile.resetProfile();
                this.updateProfilePanel();
                this.renderHome();
                console.log('[NewsRecommender] 用户画像已重置');
            }
        });

        this.backBtn.addEventListener('click', () => {
            this.closeNewsDetail();
        });

        this.configResetBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有算法参数为默认值吗？')) {
                this.algorithmConfig.reset();
                this.initAlgorithmConfigPanel();
                this.renderHome();
                console.log('[NewsRecommender] 算法配置已重置');
            }
        });

        const sliders = document.querySelectorAll('.config-slider');
        sliders.forEach(slider => {
            const configKey = slider.dataset.config;
            
            slider.addEventListener('input', (e) => {
                let value = parseFloat(e.target.value);
                const step = parseFloat(slider.step);
                if (step < 1) {
                    value = parseFloat(value.toFixed(1));
                }
                
                const valueDisplay = document.getElementById(`value-${configKey}`);
                if (valueDisplay) {
                    valueDisplay.textContent = this.formatValue(value, configKey);
                }
            });
            
            slider.addEventListener('change', (e) => {
                let value = parseFloat(e.target.value);
                const step = parseFloat(slider.step);
                if (step < 1) {
                    value = parseFloat(value.toFixed(1));
                }
                
                this.algorithmConfig.set(configKey, value);
                console.log(`[NewsRecommender] 参数更新: ${configKey} = ${value}`);
                this.renderHome();
            });
        });

        if (this.apiProviderSelect) {
            this.apiProviderSelect.addEventListener('change', (e) => {
                const provider = e.target.value;
                this.toggleApiInputs(provider);
                this.updateApiStatus(provider, this.apiKeyInput?.value || '');
            });
        }

        if (this.toggleApiKeyBtn) {
            this.toggleApiKeyBtn.addEventListener('click', () => {
                if (this.apiKeyInput) {
                    const isPassword = this.apiKeyInput.type === 'password';
                    this.apiKeyInput.type = isPassword ? 'text' : 'password';
                }
            });
        }

        if (this.apiTestBtn) {
            this.apiTestBtn.addEventListener('click', async () => {
                await this.testApiConnection();
            });
        }

        if (this.apiSaveBtn) {
            this.apiSaveBtn.addEventListener('click', async () => {
                await this.saveApiConfig();
            });
        }
    }

    async testApiConnection() {
        const provider = this.apiProviderSelect?.value || 'fallback';
        const apiKey = this.apiKeyInput?.value || '';
        const apiEndpoint = this.apiEndpointInput?.value || '';
        
        if (!this.apiTestBtn || !this.apiTestResult) return;
        
        this.apiTestBtn.disabled = true;
        this.apiTestBtn.textContent = '测试中...';
        
        const statusDot = document.querySelector('#apiStatus .status-dot');
        if (statusDot) {
            statusDot.classList.remove('status-online', 'status-offline');
            statusDot.classList.add('status-testing');
        }
        
        try {
            const result = await this.newsFetcher.testConnection(provider, apiKey, apiEndpoint);
            
            this.apiTestResult.textContent = result.message;
            this.apiTestResult.classList.remove('success', 'error');
            this.apiTestResult.classList.add(result.success ? 'success' : 'error');
            
            if (result.success) {
                this.updateApiStatus(provider, apiKey);
                if (result.newsCount) {
                    console.log('[NewsRecommender] API测试获取到', result.newsCount, '条新闻');
                }
            } else {
                const statusText = document.querySelector('#apiStatus .status-text');
                if (statusDot) {
                    statusDot.classList.remove('status-testing');
                    statusDot.classList.add('status-offline');
                }
                if (statusText) {
                    statusText.textContent = '连接失败';
                }
            }
        } catch (error) {
            this.apiTestResult.textContent = '测试失败: ' + (error.message || '未知错误');
            this.apiTestResult.classList.remove('success');
            this.apiTestResult.classList.add('error');
        } finally {
            this.apiTestBtn.disabled = false;
            this.apiTestBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                测试连接
            `;
        }
    }

    async saveApiConfig() {
        const provider = this.apiProviderSelect?.value || 'fallback';
        const apiKey = this.apiKeyInput?.value || '';
        const apiEndpoint = this.apiEndpointInput?.value || '';
        
        this.algorithmConfig.set('api.provider', provider);
        this.algorithmConfig.set('api.apiKey', apiKey);
        this.algorithmConfig.set('api.apiEndpoint', apiEndpoint);
        
        this.newsFetcher.setProvider(provider, apiKey, apiEndpoint);
        
        this.showLoading();
        
        try {
            await this.loadNewsData();
            this.renderHome();
            this.updateApiStatus(provider, apiKey);
            
            if (this.apiTestResult) {
                this.apiTestResult.textContent = '配置已保存并生效';
                this.apiTestResult.classList.remove('error');
                this.apiTestResult.classList.add('success');
            }
            
            console.log('[NewsRecommender] API配置已保存，provider:', provider);
        } catch (error) {
            console.error('[NewsRecommender] 重新加载新闻失败:', error);
            if (this.apiTestResult) {
                this.apiTestResult.textContent = '保存成功，但加载新闻失败，使用本地数据';
                this.apiTestResult.classList.remove('success');
                this.apiTestResult.classList.add('error');
            }
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    showError(message) {
        this.recommendList.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
            </div>
        `;
    }

    async renderHome() {
        this.currentView = 'home';
        this.showView('home');
        
        if (this.newsData.length === 0) {
            return;
        }
        
        const recommendations = this.recommendationEngine.getRecommendations(this.newsData, 20);
        const hasProfile = this.userProfile.getProfile().totalClicks > 0;
        
        console.log('[NewsRecommender] 当前用户画像:', this.userProfile.getProfile());
        console.log('[NewsRecommender] 推荐结果:', recommendations.slice(0, 10).map(r => ({
            title: r.news.title,
            score: r.finalScore.toFixed(1),
            tags: r.news.tags
        })));
        
        const topCategories = this.recommendationEngine.getTopCategoriesFromRecommendations(
            recommendations.slice(0, 10)
        );
        const topTags = this.recommendationEngine.getTopTagsFromRecommendations(
            recommendations.slice(0, 10),
            3
        );
        
        let subtitle = '开始阅读以建立你的兴趣画像';
        if (hasProfile) {
            const categoryText = topCategories.slice(0, 2).map(([cat, count]) => `${count}条${cat}`).join('、');
            const tagText = topTags.length > 0 ? topTags.map(([tag]) => tag).join('、') : '';
            
            if (tagText) {
                subtitle = `基于你的阅读偏好（前10条：${categoryText}，热门标签：${tagText}）`;
            } else {
                subtitle = `基于你的阅读偏好（前10条：${categoryText}）`;
            }
        }
        
        console.log('[NewsRecommender] 前10条统计:', { topCategories, topTags });
        
        this.recommendList.innerHTML = `
            <div class="section-header">
                <h2>${hasProfile ? '为你推荐' : '热门推荐'}</h2>
                <span class="subtitle">${subtitle}</span>
            </div>
            ${recommendations.map(item => this.renderNewsCard(item.news, item.finalScore)).join('')}
        `;
    }

    async renderCategory(category) {
        this.currentView = 'category';
        this.showView('home');
        
        const categoryNews = this.recommendationEngine.getNewsByCategory(this.newsData, category, 20);
        
        this.recommendList.innerHTML = `
            <div class="section-header">
                <h2>${category}新闻</h2>
                <span class="subtitle">共 ${categoryNews.length} 条</span>
            </div>
            ${categoryNews.map(news => this.renderNewsCard(news)).join('')}
        `;
    }

    renderNewsCard(news, score = null) {
        const categoryColors = {
            '体育': 'category-sports',
            '科技': 'category-tech',
            '财经': 'category-finance',
            '娱乐': 'category-entertainment',
            '生活': 'category-lifestyle'
        };
        
        const colorClass = categoryColors[news.category] || '';
        const scoreDisplay = score !== null && !isNaN(score) 
            ? `<span class="match-score">得分: ${score.toFixed(1)}</span>` 
            : '';
        
        return `
            <div class="news-card" data-id="${news.id}">
                <div class="news-card-header">
                    <span class="category-tag ${colorClass}">${news.category}</span>
                    ${scoreDisplay}
                    <span class="news-source">${news.source || '未知来源'}</span>
                </div>
                <h3 class="news-title">${news.title || '无标题'}</h3>
                <p class="news-summary">${(news.content || '').substring(0, 80)}...</p>
                <div class="news-tags">
                    ${(news.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
    }

    openNewsDetail(news) {
        if (!news || !news.id) {
            console.warn('[NewsRecommender] 无效的新闻数据');
            return;
        }
        
        this.currentView = 'detail';
        this.currentNews = news;
        this.viewStartTime = Date.now();
        
        console.log('[NewsRecommender] 点击新闻:', news.title, '标签:', news.tags);
        this.userProfile.recordClick(news);
        console.log('[NewsRecommender] 更新后画像:', this.userProfile.getProfile());
        this.updateProfilePanel();
        
        this.showView('detail');
        
        this.newsDetail.innerHTML = `
            <div class="detail-header">
                <span class="category-tag category-${this.getCategoryKey(news.category)}">${news.category}</span>
                <span class="news-source">${news.source || '未知来源'}</span>
                ${news.url ? `<a href="${news.url}" target="_blank" class="original-link">查看原文</a>` : ''}
            </div>
            <h1 class="detail-title">${news.title || '无标题'}</h1>
            <div class="detail-tags">
                ${(news.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="detail-content">
                <p>${news.content || '无内容'}</p>
                <p style="color: #666; font-size: 14px; margin-top: 20px; font-style: italic;">
                    阅读此新闻会影响你的推荐偏好。点击"返回"记录阅读时长并刷新推荐列表。
                </p>
            </div>
        `;
    }

    closeNewsDetail() {
        if (this.currentNews && this.viewStartTime) {
            const viewTime = Math.max(0, Math.round((Date.now() - this.viewStartTime) / 1000));
            this.userProfile.recordViewTime(this.currentNews, viewTime);
            console.log('[NewsRecommender] 记录阅读时长:', viewTime, '秒');
            this.updateProfilePanel();
        }
        
        this.currentNews = null;
        this.viewStartTime = null;
        
        this.renderHome();
    }

    updateProfilePanel() {
        const profile = this.userProfile.getProfile();
        const topInterests = this.userProfile.getTopInterests(5);
        
        const interestsHtml = topInterests.length > 0 
            ? topInterests.map(interest => {
                const maxScore = Math.max(...topInterests.map(i => i.score), 100);
                const displayScore = interest.score;
                const barWidth = Math.min((displayScore / maxScore) * 100, 100);
                
                return `
                    <div class="interest-item">
                        <span class="interest-name">${interest.name}</span>
                        <div class="interest-bar">
                            <div class="interest-bar-fill" style="width: ${barWidth}%"></div>
                        </div>
                        <span class="interest-score">${displayScore.toFixed(1)}</span>
                    </div>
                `;
            }).join('')
            : '<p class="empty-profile">暂无阅读记录，开始阅读以建立你的兴趣画像</p>';
        
        this.profilePanel.innerHTML = `
            <div class="profile-header">
                <h3>我的兴趣画像</h3>
                <span class="click-count">已阅读 ${profile.totalClicks} 篇</span>
            </div>
            <div class="interests-list">
                ${interestsHtml}
            </div>
        `;
    }

    showView(viewName) {
        if (viewName === 'home') {
            this.homeView.style.display = 'block';
            this.newsDetailView.style.display = 'none';
            this.backBtn.style.display = 'none';
        } else {
            this.homeView.style.display = 'none';
            this.newsDetailView.style.display = 'block';
            this.backBtn.style.display = 'flex';
        }
    }

    getCategoryKey(category) {
        const mapping = {
            '体育': 'sports',
            '科技': 'tech',
            '财经': 'finance',
            '娱乐': 'entertainment',
            '生活': 'lifestyle'
        };
        return mapping[category] || 'default';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[NewsRecommender] DOM 已加载，正在初始化...');
    window.newsApp = new NewsRecommenderApp();
});
