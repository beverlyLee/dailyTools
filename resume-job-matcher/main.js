import TextEmbedder from './TextEmbedder.js';
import CosineSimilarity from './CosineSimilarity.js';
import KeywordExtractor from './KeywordExtractor.js';

const sampleResume = `
张小明
高级前端工程师
联系方式: zhangxm@email.com | 138-0000-0000 | 北京

专业总结
拥有5年前端开发经验，精通React、Vue等主流框架，熟练掌握TypeScript，具有丰富的大型Web应用开发和性能优化经验。善于团队协作，具备良好的沟通能力和问题解决能力。

工作经历
高级前端工程师 | 某科技有限公司 | 2021.03 - 至今
- 主导公司核心业务系统的前端架构设计与开发，使用React + TypeScript技术栈
- 负责前端性能优化，将页面加载时间从5s降至1.5s，提升用户体验
- 制定前端代码规范，建立CI/CD流程，提高团队开发效率
- 指导初级工程师，进行代码审查和技术分享

前端工程师 | 某互联网公司 | 2019.07 - 2021.02
- 使用Vue.js开发电商平台的管理后台和用户端页面
- 参与移动端H5页面开发，适配多种设备
- 与后端团队配合，完成RESTful API的对接和调试

教育背景
计算机科学与技术 | 本科 | 某大学 | 2015.09 - 2019.06

专业技能
前端框架: React, Vue.js, Next.js
编程语言: JavaScript, TypeScript, HTML5, CSS3
构建工具: Webpack, Vite, Babel
样式方案: Sass, Less, Tailwind CSS
测试工具: Jest, Cypress
版本控制: Git, GitHub
其他: Node.js, Express, RESTful API, 响应式设计
`;

const sampleMatchingJob = `
职位名称: 高级前端工程师
公司: 某知名科技公司
工作地点: 北京

岗位职责:
1. 负责公司核心产品的前端架构设计与开发
2. 主导前端技术选型和性能优化工作
3. 参与制定前端技术规范和代码标准
4. 指导初级工程师，进行技术分享和代码审查
5. 与产品、设计、后端团队紧密协作，推动项目顺利进行

任职要求:
1. 本科及以上学历，计算机相关专业
2. 5年以上前端开发经验，有大型项目经验优先
3. 精通React或Vue等主流前端框架，理解其原理
4. 熟练掌握TypeScript，具备良好的代码风格
5. 熟悉HTML5、CSS3，了解浏览器原理和性能优化
6. 熟悉Webpack、Vite等构建工具
7. 了解Node.js和后端开发，熟悉RESTful API
8. 具备良好的沟通能力和团队协作精神
9. 有性能优化、代码规范制定经验者优先

技术栈:
- React, TypeScript, Next.js
- Webpack, Vite, Babel
- Tailwind CSS, Sass
- Jest, Cypress
- Git, GitHub
- Node.js, Express
`;

const sampleUnmatchingJob = `
职位名称: 高级Java后端工程师
公司: 某金融科技公司
工作地点: 上海

岗位职责:
1. 负责金融系统的后端架构设计与开发
2. 设计高并发、高可用的分布式系统
3. 参与数据库设计和优化
4. 与前端团队协作，提供RESTful API接口
5. 排查线上问题，优化系统性能

任职要求:
1. 本科及以上学历，计算机相关专业
2. 5年以上Java开发经验，有金融行业经验优先
3. 精通Java语言，熟悉JVM原理和性能调优
4. 熟练使用Spring Boot、Spring Cloud等框架
5. 熟悉MySQL、Redis、MongoDB等数据库
6. 了解微服务架构，有Dubbo或Spring Cloud经验
7. 熟悉Linux操作系统和Shell脚本
8. 具备良好的系统设计能力和问题排查能力
9. 了解Kafka、RabbitMQ等消息中间件

技术栈:
- Java, Spring Boot, Spring Cloud
- MySQL, PostgreSQL, Redis
- Kafka, RabbitMQ
- Docker, Kubernetes
- Maven, Gradle
- Linux, Shell
`;

function safeGetElement(id) {
    try {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`[安全警告] DOM 元素未找到: #${id}`);
        }
        return element;
    } catch (error) {
        console.error(`[错误] 获取 DOM 元素失败 #${id}:`, error);
        return null;
    }
}

function safeArray(value, defaultValue = []) {
    return Array.isArray(value) ? value : defaultValue;
}

function safeString(value, defaultValue = '') {
    return typeof value === 'string' ? value : defaultValue;
}

function safeNumber(value, defaultValue = 0) {
    return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
}

function safeObject(value, defaultValue = {}) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : defaultValue;
}

class ResumeJobMatcher {
    constructor() {
        console.log('[构造函数] 开始初始化 ResumeJobMatcher');
        
        this.textEmbedder = null;
        this.keywordExtractor = null;
        
        this.apiUrlInput = null;
        this.apiKeyInput = null;
        this.modelNameInput = null;
        this.encodingFormatSelect = null;
        this.resumeTextarea = null;
        this.jobTextarea = null;
        this.analyzeBtn = null;
        this.loading = null;
        this.resultSection = null;
        this.scoreCircle = null;
        this.scoreValue = null;
        this.scoreDescription = null;
        this.resumeKeywords = null;
        this.jobKeywords = null;
        this.missingKeywords = null;
        this.testConnectionBtn = null;
        this.connectionStatus = null;
        
        this.isInitialized = false;
        this.isAnalyzing = false;
        this.isTestingConnection = false;
        
        this.initialize();
    }

    initialize() {
        console.log('[initialize] 开始初始化应用');
        
        try {
            this.initElements();
            
            if (!this.checkCriticalElements()) {
                console.error('[initialize] 关键 DOM 元素缺失，应用无法正常工作');
                this.showError('页面初始化失败：关键元素缺失，请刷新页面重试');
                return;
            }

            this.initDependencies();
            
            this.loadSavedConfig();
            this.bindEvents();
            
            this.isInitialized = true;
            console.log('[initialize] 应用初始化完成');
        } catch (error) {
            console.error('[initialize] 应用初始化失败:', error);
            this.showError('应用初始化失败: ' + (error.message || '未知错误'));
        }
    }

    initElements() {
        console.log('[initElements] 开始初始化 DOM 元素');
        
        this.apiUrlInput = safeGetElement('api-url');
        this.apiKeyInput = safeGetElement('api-key');
        this.modelNameInput = safeGetElement('model-name');
        this.encodingFormatSelect = safeGetElement('encoding-format');
        this.resumeTextarea = safeGetElement('resume-text');
        this.jobTextarea = safeGetElement('job-text');
        this.analyzeBtn = safeGetElement('analyze-btn');
        this.loading = safeGetElement('loading');
        this.resultSection = safeGetElement('result-section');
        this.scoreCircle = safeGetElement('score-circle');
        this.scoreValue = safeGetElement('score-value');
        this.scoreDescription = safeGetElement('score-description');
        this.resumeKeywords = safeGetElement('resume-keywords');
        this.jobKeywords = safeGetElement('job-keywords');
        this.missingKeywords = safeGetElement('missing-keywords');
        this.testConnectionBtn = safeGetElement('test-connection-btn');
        this.connectionStatus = safeGetElement('connection-status');
        
        console.log('[initElements] DOM 元素初始化完成');
    }

    checkCriticalElements() {
        const criticalElements = [
            { name: 'apiUrlInput', element: this.apiUrlInput },
            { name: 'apiKeyInput', element: this.apiKeyInput },
            { name: 'modelNameInput', element: this.modelNameInput },
            { name: 'encodingFormatSelect', element: this.encodingFormatSelect },
            { name: 'resumeTextarea', element: this.resumeTextarea },
            { name: 'jobTextarea', element: this.jobTextarea },
            { name: 'analyzeBtn', element: this.analyzeBtn }
        ];
        
        const missing = criticalElements.filter(item => !item.element);
        if (missing.length > 0) {
            console.error('[checkCriticalElements] 缺失的关键元素:', missing.map(m => m.name));
            return false;
        }
        
        console.log('[checkCriticalElements] 所有关键元素已就绪');
        return true;
    }

    initDependencies() {
        console.log('[initDependencies] 开始初始化依赖');
        
        try {
            this.textEmbedder = new TextEmbedder();
            this.keywordExtractor = new KeywordExtractor();
            console.log('[initDependencies] 依赖初始化完成');
        } catch (error) {
            console.error('[initDependencies] 依赖初始化失败:', error);
            throw new Error('依赖初始化失败: ' + (error.message || '未知错误'));
        }
    }

    loadSavedConfig() {
        console.log('[loadSavedConfig] 开始加载保存的配置');
        
        try {
            if (typeof localStorage === 'undefined') {
                console.warn('[loadSavedConfig] localStorage 不可用');
                return;
            }

            const savedApiUrl = safeString(localStorage.getItem('volc_api_url'));
            const savedApiKey = safeString(localStorage.getItem('volc_api_key'));
            const savedModelName = safeString(localStorage.getItem('volc_model_name'));
            const savedEncodingFormat = safeString(localStorage.getItem('volc_encoding_format'));
            
            if (savedApiUrl && this.apiUrlInput) {
                this.apiUrlInput.value = savedApiUrl;
                console.log('[loadSavedConfig] 已恢复 API 地址:', savedApiUrl);
            }
            if (savedApiKey && this.apiKeyInput) {
                this.apiKeyInput.value = savedApiKey;
                console.log('[loadSavedConfig] 已恢复 API Key');
            }
            if (savedModelName && this.modelNameInput) {
                this.modelNameInput.value = savedModelName;
                console.log('[loadSavedConfig] 已恢复模型名称:', savedModelName);
            }
            if (savedEncodingFormat && this.encodingFormatSelect) {
                this.encodingFormatSelect.value = savedEncodingFormat;
                console.log('[loadSavedConfig] 已恢复编码格式:', savedEncodingFormat);
            }
        } catch (error) {
            console.warn('[loadSavedConfig] 加载配置失败:', error);
        }
    }

    saveConfig() {
        console.log('[saveConfig] 开始保存配置');
        
        try {
            if (typeof localStorage === 'undefined') {
                return;
            }

            const apiUrl = this.apiUrlInput ? safeString(this.apiUrlInput.value).trim() : '';
            const apiKey = this.apiKeyInput ? safeString(this.apiKeyInput.value).trim() : '';
            const modelName = this.modelNameInput ? safeString(this.modelNameInput.value).trim() : '';
            const encodingFormat = this.encodingFormatSelect ? safeString(this.encodingFormatSelect.value).trim() : '';
            
            if (apiUrl) {
                localStorage.setItem('volc_api_url', apiUrl);
            }
            if (apiKey) {
                localStorage.setItem('volc_api_key', apiKey);
            }
            if (modelName) {
                localStorage.setItem('volc_model_name', modelName);
            }
            if (encodingFormat) {
                localStorage.setItem('volc_encoding_format', encodingFormat);
            }
            console.log('[saveConfig] 配置保存完成');
        } catch (error) {
            console.warn('[saveConfig] 保存配置失败:', error);
        }
    }

    bindEvents() {
        console.log('[bindEvents] 开始绑定事件');
        
        try {
            const loadSampleResumeBtn = safeGetElement('load-sample-resume');
            if (loadSampleResumeBtn && this.resumeTextarea) {
                loadSampleResumeBtn.addEventListener('click', () => {
                    console.log('[事件] 点击加载示例简历');
                    if (this.resumeTextarea) {
                        this.resumeTextarea.value = sampleResume;
                    }
                });
            }

            const loadSampleJobMatchingBtn = safeGetElement('load-sample-job-matching');
            if (loadSampleJobMatchingBtn && this.jobTextarea) {
                loadSampleJobMatchingBtn.addEventListener('click', () => {
                    console.log('[事件] 点击加载匹配 JD');
                    if (this.jobTextarea) {
                        this.jobTextarea.value = sampleMatchingJob;
                    }
                });
            }

            const loadSampleJobUnmatchingBtn = safeGetElement('load-sample-job-unmatching');
            if (loadSampleJobUnmatchingBtn && this.jobTextarea) {
                loadSampleJobUnmatchingBtn.addEventListener('click', () => {
                    console.log('[事件] 点击加载不匹配 JD');
                    if (this.jobTextarea) {
                        this.jobTextarea.value = sampleUnmatchingJob;
                    }
                });
            }

            if (this.analyzeBtn) {
                this.analyzeBtn.addEventListener('click', () => {
                    console.log('[事件] 点击开始分析');
                    this.analyze();
                });
            }

            if (this.testConnectionBtn) {
                this.testConnectionBtn.addEventListener('click', () => {
                    console.log('[事件] 点击测试连接');
                    this.testConnection();
                });
            }
            
            console.log('[bindEvents] 事件绑定完成');
        } catch (error) {
            console.error('[bindEvents] 事件绑定失败:', error);
        }
    }

    async analyze() {
        console.log('[analyze] ========== 开始分析 ==========');
        
        if (this.isAnalyzing) {
            console.log('[analyze] 正在分析中，忽略重复请求');
            return;
        }
        
        if (!this.isInitialized) {
            console.error('[analyze] 应用尚未初始化完成');
            this.showError('应用尚未初始化完成，请稍候再试');
            return;
        }

        this.isAnalyzing = true;

        const apiUrl = this.apiUrlInput ? safeString(this.apiUrlInput.value).trim() : '';
        const apiKey = this.apiKeyInput ? safeString(this.apiKeyInput.value).trim() : '';
        const modelName = this.modelNameInput ? safeString(this.modelNameInput.value).trim() : '';
        const encodingFormat = this.encodingFormatSelect ? safeString(this.encodingFormatSelect.value).trim() : '';
        const resumeText = this.resumeTextarea ? safeString(this.resumeTextarea.value).trim() : '';
        const jobText = this.jobTextarea ? safeString(this.jobTextarea.value).trim() : '';

        console.log('[analyze] 输入校验开始');
        if (!apiUrl) {
            this.showError('请输入 API 地址');
            this.isAnalyzing = false;
            return;
        }
        if (!apiKey) {
            this.showError('请输入火山引擎 API Key');
            this.isAnalyzing = false;
            return;
        }

        if (!modelName) {
            this.showError('请输入模型名称');
            this.isAnalyzing = false;
            return;
        }

        if (!encodingFormat) {
            this.showError('请选择编码格式');
            this.isAnalyzing = false;
            return;
        }

        if (!resumeText || !jobText) {
            this.showError('请输入简历内容和职位描述');
            this.isAnalyzing = false;
            return;
        }
        console.log('[analyze] 输入校验通过');

        this.saveConfig();

        if (this.textEmbedder) {
            this.textEmbedder.setApiUrl(apiUrl);
            this.textEmbedder.setApiKey(apiKey);
            this.textEmbedder.setModelName(modelName);
            this.textEmbedder.setEncodingFormat(encodingFormat);
        }

        if (this.analyzeBtn) {
            this.analyzeBtn.disabled = true;
        }
        if (this.loading) {
            this.loading.style.display = 'block';
        }
        if (this.resultSection) {
            this.resultSection.style.display = 'none';
        }

        let resumeKeywords = [];
        let jobKeywords = [];
        let missingKeywords = [];

        try {
            console.log('[analyze] 步骤 1: 获取 loading span');
            const loadingSpan = this.loading ? this.loading.querySelector('span') : null;
            
            if (loadingSpan) {
                loadingSpan.textContent = '正在配置火山引擎 API...';
            }

            console.log('[analyze] 步骤 2: 加载模型');
            if (this.textEmbedder) {
                await this.textEmbedder.loadModel();
            } else {
                throw new Error('TextEmbedder 未初始化');
            }

            if (loadingSpan) {
                loadingSpan.textContent = '正在调用火山引擎向量化 API...';
            }

            console.log('[analyze] 步骤 3: 调用向量化 API');
            const embeddingsResult = await this.textEmbedder.embedMultiple([
                resumeText,
                jobText
            ]);
            
            console.log('[analyze] 步骤 4: 验证向量化结果');
            const embeddings = safeArray(embeddingsResult);
            console.log('[analyze] 向量化结果长度:', embeddings.length);
            
            if (embeddings.length < 2) {
                throw new Error('向量化结果不完整，期望 2 个向量，实际收到 ' + embeddings.length + ' 个');
            }

            const resumeEmbedding = safeArray(embeddings[0]);
            const jobEmbedding = safeArray(embeddings[1]);
            
            console.log('[analyze] 简历向量长度:', resumeEmbedding.length);
            console.log('[analyze] JD 向量长度:', jobEmbedding.length);

            if (resumeEmbedding.length === 0 || jobEmbedding.length === 0) {
                throw new Error('向量化结果为空数组');
            }

            if (loadingSpan) {
                loadingSpan.textContent = '正在计算匹配度...';
            }

            console.log('[analyze] 步骤 5: 计算余弦相似度');
            const similarity = CosineSimilarity.calculate(resumeEmbedding, jobEmbedding);
            const percentage = CosineSimilarity.similarityToPercentage(similarity);
            const description = CosineSimilarity.getMatchDescription(percentage);
            const level = CosineSimilarity.getMatchLevel(percentage);
            
            console.log('[analyze] 匹配度:', percentage + '%');

            if (loadingSpan) {
                loadingSpan.textContent = '正在分析关键词...';
            }

            console.log('[analyze] 步骤 6: 提取关键词');
            if (this.keywordExtractor) {
                resumeKeywords = safeArray(this.keywordExtractor.extractKeywords(resumeText));
                jobKeywords = safeArray(this.keywordExtractor.extractKeywords(jobText));
                missingKeywords = safeArray(this.keywordExtractor.findMissingKeywords(resumeText, jobText));
            }
            
            console.log('[analyze] 简历关键词数量:', resumeKeywords.length);
            console.log('[analyze] JD 关键词数量:', jobKeywords.length);
            console.log('[analyze] 缺失关键词数量:', missingKeywords.length);

            console.log('[analyze] 步骤 7: 显示结果');
            this.displayResults(percentage, description, level, resumeKeywords, jobKeywords, missingKeywords);

            console.log('[analyze] ========== 分析完成 ==========');

        } catch (error) {
            console.error('[analyze] 分析过程出错:', error);
            console.error('[analyze] 错误堆栈:', error.stack);
            this.showError('分析过程中出现错误: ' + (error.message || '未知错误'));
        } finally {
            console.log('[analyze] 清理状态');
            this.isAnalyzing = false;
            if (this.analyzeBtn) {
                this.analyzeBtn.disabled = false;
            }
            if (this.loading) {
                this.loading.style.display = 'none';
            }
        }
    }

    displayResults(percentage, description, level, resumeKeywords, jobKeywords, missingKeywords) {
        console.log('[displayResults] 开始显示结果');
        
        try {
            const safePercentage = safeNumber(percentage, 0);
            const safeDescription = safeString(description, '未知');
            const safeLevel = safeString(level, 'medium');
            
            console.log('[displayResults] 安全值 - percentage:', safePercentage, 'level:', safeLevel);

            if (this.scoreCircle) {
                this.scoreCircle.className = 'score-circle ' + safeLevel;
            }
            if (this.scoreValue) {
                this.scoreValue.textContent = safePercentage + '%';
            }
            if (this.scoreDescription) {
                this.scoreDescription.textContent = safeDescription;
            }

            console.log('[displayResults] 渲染简历关键词');
            this.renderKeywords(this.resumeKeywords, safeArray(resumeKeywords));
            console.log('[displayResults] 渲染 JD 关键词');
            this.renderKeywords(this.jobKeywords, safeArray(jobKeywords));
            console.log('[displayResults] 渲染缺失关键词');
            this.renderKeywords(this.missingKeywords, safeArray(missingKeywords));

            if (this.resultSection) {
                this.resultSection.style.display = 'block';
            }
            
            console.log('[displayResults] 结果显示完成');
        } catch (error) {
            console.error('[displayResults] 显示结果失败:', error);
            this.showError('显示结果失败: ' + (error.message || '未知错误'));
        }
    }

    renderKeywords(container, keywords) {
        console.log('[renderKeywords] 开始渲染关键词，数量:', keywords.length);
        
        try {
            if (!container) {
                console.warn('[renderKeywords] 容器为空，跳过渲染');
                return;
            }

            container.innerHTML = '';
            
            const safeKeywords = safeArray(keywords);
            
            if (safeKeywords.length === 0) {
                console.log('[renderKeywords] 关键词为空，显示默认文本');
                const emptyTag = document.createElement('span');
                emptyTag.className = 'keyword-tag';
                emptyTag.textContent = '暂无关键词';
                container.appendChild(emptyTag);
                return;
            }

            let renderedCount = 0;
            for (const keyword of safeKeywords) {
                const safeKeyword = safeString(keyword);
                if (safeKeyword) {
                    const tag = document.createElement('span');
                    tag.className = 'keyword-tag';
                    tag.textContent = safeKeyword;
                    container.appendChild(tag);
                    renderedCount++;
                }
            }
            
            console.log('[renderKeywords] 实际渲染关键词数量:', renderedCount);
        } catch (error) {
            console.error('[renderKeywords] 渲染关键词失败:', error);
        }
    }

    showError(message) {
        console.error('[showError]', message);
        try {
            alert(message);
        } catch (e) {
            console.error('[showError] alert 失败:', e);
        }
    }

    updateConnectionStatus(status, message) {
        console.log('[updateConnectionStatus] 状态:', status, '消息:', message);
        
        if (!this.connectionStatus) {
            return;
        }

        this.connectionStatus.className = 'connection-status ' + status;
        this.connectionStatus.textContent = message;
    }

    async testConnection() {
        console.log('[testConnection] ========== 开始测试连接 ==========');
        
        if (this.isTestingConnection) {
            console.log('[testConnection] 正在测试中，忽略重复请求');
            return;
        }
        
        if (!this.isInitialized) {
            console.error('[testConnection] 应用尚未初始化完成');
            this.showError('应用尚未初始化完成，请稍候再试');
            return;
        }

        this.isTestingConnection = true;

        const apiUrl = this.apiUrlInput ? safeString(this.apiUrlInput.value).trim() : '';
        const apiKey = this.apiKeyInput ? safeString(this.apiKeyInput.value).trim() : '';
        const modelName = this.modelNameInput ? safeString(this.modelNameInput.value).trim() : '';
        const encodingFormat = this.encodingFormatSelect ? safeString(this.encodingFormatSelect.value).trim() : '';

        console.log('[testConnection] 输入校验开始');
        if (!apiUrl) {
            this.updateConnectionStatus('error', '请输入 API 地址');
            this.isTestingConnection = false;
            return;
        }
        if (!apiKey) {
            this.updateConnectionStatus('error', '请输入火山引擎 API Key');
            this.isTestingConnection = false;
            return;
        }

        if (!modelName) {
            this.updateConnectionStatus('error', '请输入模型名称');
            this.isTestingConnection = false;
            return;
        }

        if (!encodingFormat) {
            this.updateConnectionStatus('error', '请选择编码格式');
            this.isTestingConnection = false;
            return;
        }
        console.log('[testConnection] 输入校验通过');
        console.log('[testConnection] 配置详情:', { apiUrl, modelName, encodingFormat });

        this.saveConfig();

        if (this.testConnectionBtn) {
            this.testConnectionBtn.disabled = true;
            this.testConnectionBtn.textContent = '测试中...';
        }
        this.updateConnectionStatus('loading', `正在测试连接: ${apiUrl}...`);

        try {
            console.log('[testConnection] 步骤 1: 配置 TextEmbedder');
            
            if (!this.textEmbedder) {
                throw new Error('TextEmbedder 未初始化');
            }
            
            this.textEmbedder.setApiUrl(apiUrl);
            this.textEmbedder.setApiKey(apiKey);
            this.textEmbedder.setModelName(modelName);
            this.textEmbedder.setEncodingFormat(encodingFormat);

            console.log('[testConnection] 步骤 2: 发送测试请求');
            
            const testText = 'Hello, this is a test.';
            const embeddings = await this.textEmbedder.embed(testText);
            
            console.log('[testConnection] 步骤 3: 验证响应');
            
            if (Array.isArray(embeddings) && embeddings.length > 0) {
                console.log('[testConnection] 连接成功！向量维度:', embeddings.length);
                this.updateConnectionStatus('success', `✓ 连接成功！向量维度: ${embeddings.length}`);
            } else {
                throw new Error('API 返回格式错误');
            }

            console.log('[testConnection] ========== 测试完成 ==========');

        } catch (error) {
            console.error('[testConnection] 测试失败:', error);
            const errorMessage = error.message || '未知错误';
            this.updateConnectionStatus('error', `✗ 连接失败: ${errorMessage}`);
        } finally {
            console.log('[testConnection] 清理状态');
            this.isTestingConnection = false;
            if (this.testConnectionBtn) {
                this.testConnectionBtn.disabled = false;
                this.testConnectionBtn.textContent = '测试连接';
            }
        }
    }
}

console.log('[全局] 设置全局错误处理器');

window.addEventListener('error', (event) => {
    console.error('[全局错误] 捕获到未处理错误:', event.error || event.message);
    console.error('[全局错误] 错误详情:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
    if (event.error && event.error.stack) {
        console.error('[全局错误] 堆栈:', event.error.stack);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[全局错误] 未处理的 Promise 拒绝:', event.reason);
    if (event.reason && event.reason.stack) {
        console.error('[全局错误] 堆栈:', event.reason.stack);
    }
});

console.log('[全局] 等待 DOM 加载完成');

function startApp() {
    console.log('[全局] 启动应用');
    try {
        new ResumeJobMatcher();
        console.log('[全局] 应用实例创建成功');
    } catch (error) {
        console.error('[全局] 应用启动失败:', error);
        alert('应用启动失败: ' + (error.message || '未知错误'));
    }
}

if (document.readyState === 'loading') {
    console.log('[全局] DOM 仍在加载，等待 DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[全局] DOMContentLoaded 触发');
        startApp();
    });
} else {
    console.log('[全局] DOM 已加载完成，立即启动');
    startApp();
}
