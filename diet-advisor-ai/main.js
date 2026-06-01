class DietAdvisorApp {
    constructor() {
        this.staticFoodDatabase = null;
        this.dynamicFoodDatabase = null;
        this.healthRules = null;
        this.modelConfig = null;
        this.healthProfiler = null;
        this.mealAnalyzer = null;
        this.ruleEngine = null;
        this.bayesianNetwork = null;
        this.dietRecommender = null;
        this.imageRecognizer = null;
        this.llmFoodProvider = null;
        this.currentProfile = null;
        this.currentImageFile = null;
    }

    async init() {
        try {
            await this.loadData();
            this.initializeModules();
            this.loadConfigIntoUI();
            this.bindEvents();
            this.renderFoodDatabase();
            this.updateModelStatusBadge();
            this.showInitSuccess();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showInitError(error);
        }
    }

    getDefaultFoodDatabase() {
        console.warn('[DietAdvisorApp] 使用默认食物数据库（数据文件加载失败）');
        return {
            foods: [
                {
                    name: '米饭',
                    category: '主食',
                    aliases: ['白米饭', '白饭'],
                    serving: '100g',
                    calories: 130,
                    carbs: 28.6,
                    protein: 2.6,
                    fat: 0.3,
                    sugar: 0.1,
                    sodium: 1,
                    fiber: 0.4,
                    glycemicIndex: 73,
                    tags: ['高GI', '精制碳水'],
                    dietaryRestrictions: [],
                    healthWarnings: ['糖尿病', '肥胖']
                },
                {
                    name: '可乐',
                    category: '饮料',
                    aliases: ['可口可乐', '百事可乐'],
                    serving: '100ml',
                    calories: 42,
                    carbs: 10.6,
                    protein: 0,
                    fat: 0,
                    sugar: 10.6,
                    sodium: 15,
                    fiber: 0,
                    glycemicIndex: 90,
                    tags: ['高糖', '高热量', '高GI'],
                    dietaryRestrictions: [],
                    healthWarnings: ['糖尿病', '肥胖', '高血压']
                },
                {
                    name: '白开水',
                    category: '饮料',
                    aliases: ['温水', '凉水', '开水', '白水'],
                    serving: '100ml',
                    calories: 0,
                    carbs: 0,
                    protein: 0,
                    fat: 0,
                    sugar: 0,
                    sodium: 0,
                    fiber: 0,
                    glycemicIndex: 0,
                    tags: ['无热量', '健康饮料'],
                    dietaryRestrictions: [],
                    healthWarnings: []
                }
            ],
            mealPortionEstimates: {
                '一碗': '150g',
                '一杯': '250ml',
                '一瓶': '500ml',
                '一份': '100g'
            }
        };
    }

    getDefaultHealthRules() {
        console.warn('[DietAdvisorApp] 使用默认健康规则（数据文件加载失败）');
        return {
            conditionConfigs: {
                '糖尿病': {
                    sugarLimit: 10,
                    carbsLimit: 60,
                    giLimit: 70
                },
                '高血压': {
                    sodiumLimit: 600,
                    fatLimit: 20
                },
                '心脏病': {
                    fatLimit: 15,
                    sodiumLimit: 500
                },
                '肥胖': {
                    caloriesLimit: 600,
                    fatLimit: 25
                }
            },
            foodReplacementRules: [
                { from: '米饭', to: '糙米', reason: '糙米升糖指数更低，富含膳食纤维', conditions: ['糖尿病', '肥胖'] },
                { from: '可乐', to: '白开水', reason: '可乐含糖量过高，建议换成无糖饮品', conditions: ['糖尿病', '肥胖', '高血压'] }
            ],
            tagRules: {
                '高糖': ['糖尿病', '肥胖'],
                '高GI': ['糖尿病', '肥胖'],
                '高钠': ['高血压', '心脏病'],
                '高脂肪': ['肥胖', '心脏病']
            }
        };
    }

    async loadData() {
        console.log('[DietAdvisorApp] 开始加载数据...');
        
        let foodDbLoaded = false;
        let rulesLoaded = false;

        try {
            const foodDbResponse = await fetch('data/foodDatabase.json');
            if (foodDbResponse.ok) {
                const data = await foodDbResponse.json();
                if (data && Array.isArray(data.foods)) {
                    this.staticFoodDatabase = data;
                    foodDbLoaded = true;
                    console.log('[DietAdvisorApp] 食物数据库加载成功:', data.foods.length, '种食物');
                }
            }
        } catch (e) {
            console.warn('[DietAdvisorApp] 食物数据库加载失败:', e.message);
        }

        try {
            const rulesResponse = await fetch('data/healthRules.json');
            if (rulesResponse.ok) {
                const data = await rulesResponse.json();
                if (data && data.conditionProfiles) {
                    this.healthRules = data;
                    rulesLoaded = true;
                    console.log('[DietAdvisorApp] 健康规则加载成功:', 
                        Object.keys(data.conditionProfiles).length, '个条件配置');
                }
            }
        } catch (e) {
            console.warn('[DietAdvisorApp] 健康规则加载失败:', e.message);
        }

        if (!foodDbLoaded) {
            this.staticFoodDatabase = this.getDefaultFoodDatabase();
        }
        if (!rulesLoaded) {
            this.healthRules = this.getDefaultHealthRules();
        }

        this.dataLoadStatus = {
            foodDatabase: foodDbLoaded ? 'success' : 'fallback',
            healthRules: rulesLoaded ? 'success' : 'fallback'
        };

        console.log('[DietAdvisorApp] 数据加载完成:', this.dataLoadStatus);
    }

    showInitSuccess() {
        const fallback = this.dataLoadStatus?.foodDatabase === 'fallback' || 
                        this.dataLoadStatus?.healthRules === 'fallback';
        
        if (fallback) {
            console.log('Diet Advisor initialized with fallback data');
        } else {
            console.log('Diet Advisor initialized successfully');
        }
    }

    showInitError(error) {
        const container = document.getElementById('results-container');
        if (container) {
            container.innerHTML = `
                <div class="danger-alert" style="padding: 20px; text-align: center;">
                    <div class="alert-title" style="font-size: 1.2rem;">❌ 系统初始化失败</div>
                    <div class="alert-message" style="margin-top: 10px;">
                        <p>错误信息: ${error.message}</p>
                        <p style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;">
                            请确保：<br>
                            1. 在本地服务器上运行本应用（如 python3 -m http.server）<br>
                            2. data/foodDatabase.json 和 data/healthRules.json 文件存在
                        </p>
                    </div>
                </div>
            `;
        }
    }

    initializeModules() {
        this.modelConfig = new ModelConfig();
        this.dynamicFoodDatabase = new DynamicFoodDatabase(this.staticFoodDatabase);
        this.llmFoodProvider = new LLMFoodProvider(this.modelConfig);
        this.healthProfiler = new HealthProfiler(this.healthRules);
        this.mealAnalyzer = new MealAnalyzer(this.dynamicFoodDatabase, this.llmFoodProvider);
        this.ruleEngine = new RuleEngine(this.healthRules);
        this.bayesianNetwork = new SimpleBayesianNetwork();
        this.dietRecommender = new DietRecommender(
            this.healthRules,
            this.dynamicFoodDatabase.getAllDatabase(),
            this.ruleEngine,
            this.bayesianNetwork
        );
        this.imageRecognizer = new ImageRecognizer(this.modelConfig);

        console.log('[DietAdvisorApp] 模块初始化完成:', this.dynamicFoodDatabase.getStats());
    }

    loadConfigIntoUI() {
        const config = this.modelConfig.getConfig();
        
        if (document.getElementById('config-provider')) {
            document.getElementById('config-provider').value = config.provider || 'volcengine';
        }
        if (document.getElementById('config-api-key')) {
            document.getElementById('config-api-key').value = config.apiKey || '';
        }
        if (document.getElementById('config-endpoint')) {
            document.getElementById('config-endpoint').value = config.endpoint || 'https://ark.cn-beijing.volces.com/api/v3';
        }
        if (document.getElementById('config-model')) {
            document.getElementById('config-model').value = config.model || '';
        }
        if (document.getElementById('config-vision-enabled')) {
            document.getElementById('config-vision-enabled').checked = config.visionEnabled || false;
        }
        if (document.getElementById('config-vision-model')) {
            document.getElementById('config-vision-model').value = config.visionModel || '';
        }
        if (document.getElementById('config-temperature')) {
            document.getElementById('config-temperature').value = config.temperature || 0.3;
        }
        if (document.getElementById('config-max-tokens')) {
            document.getElementById('config-max-tokens').value = config.maxTokens || 2048;
        }

        this.toggleVisionFields(config.visionEnabled || false);
    }

    updateModelStatusBadge() {
        const badge = document.getElementById('model-status-badge');
        if (!badge) return;

        const isConfigured = this.modelConfig.isConfigured();
        badge.textContent = isConfigured ? '已配置' : '未配置';
        badge.className = `status-badge ${isConfigured ? 'status-configured' : 'status-unconfigured'}`;
    }

    toggleVisionFields(enabled) {
        const fields = document.getElementById('vision-config-fields');
        if (fields) {
            fields.style.display = enabled ? 'block' : 'none';
        }
    }

    bindEvents() {
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.handleAnalyze();
        });

        document.getElementById('quick-test-btn').addEventListener('click', () => {
            this.handleQuickTest();
        });

        document.getElementById('meal-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAnalyze();
            }
        });

        document.querySelectorAll('.example-tag').forEach(btn => {
            btn.addEventListener('click', () => {
                const meal = btn.dataset.meal;
                document.getElementById('meal-input').value = meal;
            });
        });

        document.getElementById('food-search').addEventListener('input', (e) => {
            const query = e.target.value;
            this.renderFoodDatabase(query);
        });

        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', () => this.updateProfilePreview());
        });

        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateProfilePreview());
        });

        this.bindTabEvents();
        this.bindImageEvents();
        this.bindModelConfigEvents();
    }

    bindTabEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                const tabName = e.target.dataset.tab;
                document.getElementById(`tab-${tabName}`).classList.add('active');
            });
        });

        document.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.config-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.config-tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                const tabName = e.target.dataset.configTab;
                document.getElementById(`config-tab-${tabName}`).classList.add('active');
            });
        });
    }

    bindImageEvents() {
        const imageInput = document.getElementById('image-input');
        const cameraInput = document.getElementById('camera-input');

        document.getElementById('upload-image-btn').addEventListener('click', () => {
            if (imageInput) imageInput.click();
        });

        document.getElementById('take-photo-btn').addEventListener('click', () => {
            if (cameraInput) cameraInput.click();
        });

        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleImageFile(e.target.files[0]);
                }
            });
        }

        if (cameraInput) {
            cameraInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleImageFile(e.target.files[0]);
                }
            });
        }

        const analyzeImageBtn = document.getElementById('analyze-image-btn');
        if (analyzeImageBtn) {
            analyzeImageBtn.addEventListener('click', () => {
                const mealText = document.getElementById('image-meal-input').value.trim();
                if (!mealText) {
                    this.showImageStatus('请等待图片识别完成', 'error');
                    return;
                }
                this.analyzeMealFromText(mealText);
            });
        }
    }

    bindModelConfigEvents() {
        const visionCheckbox = document.getElementById('config-vision-enabled');
        if (visionCheckbox) {
            visionCheckbox.addEventListener('change', (e) => {
                this.toggleVisionFields(e.target.checked);
            });
        }

        const saveBtn = document.getElementById('save-config-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveConfig());
        }

        const testBtn = document.getElementById('test-config-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.handleTestConfig());
        }
    }

    async handleImageFile(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showImageStatus('请选择图片文件', 'error');
            return;
        }

        this.currentImageFile = file;

        const previewContainer = document.getElementById('image-preview-container');
        const placeholder = previewContainer.querySelector('.image-placeholder');
        if (placeholder) placeholder.remove();

        let oldImg = previewContainer.querySelector('img');
        if (oldImg) oldImg.remove();

        const img = document.createElement('img');
        img.id = 'image-preview';
        img.src = URL.createObjectURL(file);
        previewContainer.appendChild(img);
        previewContainer.classList.add('has-image');

        const config = this.modelConfig.getConfig();
        console.log('[Debug] 当前配置:', {
            visionEnabled: config.visionEnabled,
            apiKey: config.apiKey ? '已设置' : '未设置',
            endpoint: config.endpoint,
            visionModel: config.visionModel
        });

        if (!config.visionEnabled) {
            this.showImageStatus(
                '请先在「模型配置 → 图片识别」中勾选"启用图片识别"，然后点击「保存配置」按钮', 
                'error'
            );
            return;
        }

        if (!config.apiKey || !config.apiKey.trim()) {
            this.showImageStatus(
                'API Key 未配置。请在「模型配置」中填入 API Key，然后点击「保存配置」', 
                'error'
            );
            return;
        }

        if (!config.visionModel || !config.visionModel.trim()) {
            this.showImageStatus(
                '视觉模型 ID 未配置。请在「模型配置 → 图片识别」中填入视觉模型 ID，然后点击「保存配置」', 
                'error'
            );
            return;
        }

        if (!config.endpoint || !config.endpoint.trim()) {
            this.showImageStatus(
                'Endpoint 未配置。请在「模型配置」中填入 Endpoint，然后点击「保存配置」', 
                'error'
            );
            return;
        }

        await this.recognizeImage(file);
    }

    async recognizeImage(file) {
        this.showImageStatus('正在分析图片，请稍候...', 'loading');

        try {
            const result = await this.imageRecognizer.recognizeFromImage(file);

            if (!result.success) {
                this.showImageStatus(result.error || '识别失败', 'error');
                return;
            }

            const imageMealInput = document.getElementById('image-meal-input');
            const resultContainer = document.getElementById('image-result-container');

            if (result.formattedInput) {
                imageMealInput.value = result.formattedInput;
                this.showImageStatus(`识别成功！识别到 ${result.parsedFoods.length} 种食物`, 'success');
            } else {
                imageMealInput.value = result.rawResponse || '';
                this.showImageStatus('识别完成，您可以修改识别结果后再分析', 'success');
            }

            resultContainer.style.display = 'block';

        } catch (error) {
            console.error('Image recognition error:', error);
            this.showImageStatus(`识别失败: ${error.message}`, 'error');
        }
    }

    showImageStatus(message, type) {
        const statusEl = document.getElementById('image-status');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `image-status ${type}`;
        statusEl.style.display = 'block';
    }

    handleSaveConfig() {
        const newConfig = {
            provider: document.getElementById('config-provider')?.value || 'volcengine',
            apiKey: document.getElementById('config-api-key')?.value || '',
            endpoint: document.getElementById('config-endpoint')?.value || 'https://ark.cn-beijing.volces.com/api/v3',
            model: document.getElementById('config-model')?.value || '',
            visionEnabled: document.getElementById('config-vision-enabled')?.checked || false,
            visionModel: document.getElementById('config-vision-model')?.value || '',
            temperature: parseFloat(document.getElementById('config-temperature')?.value) || 0.3,
            maxTokens: parseInt(document.getElementById('config-max-tokens')?.value) || 2048
        };

        console.log('[Debug] 保存配置:', newConfig);

        this.modelConfig.update(newConfig);
        this.updateModelStatusBadge();

        const savedConfig = this.modelConfig.getConfig();
        console.log('[Debug] 保存后配置:', savedConfig);

        const statusEl = document.getElementById('config-status');
        
        let msg = '✅ 配置已保存并生效！';
        if (savedConfig.visionEnabled) {
            if (savedConfig.visionModel) {
                msg += '<br><small>图片识别功能已启用，现在可以上传图片识别食物了</small>';
            } else {
                msg += '<br><small style="color:#ffc107;">⚠️ 已启用图片识别，但视觉模型 ID 未填写</small>';
            }
        }
        
        statusEl.innerHTML = msg;
        statusEl.className = 'config-status success';
        statusEl.style.display = 'block';

        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }

    async handleTestConfig() {
        const testConfig = {
            provider: document.getElementById('config-provider')?.value || 'volcengine',
            apiKey: document.getElementById('config-api-key')?.value || '',
            endpoint: document.getElementById('config-endpoint')?.value || 'https://ark.cn-beijing.volces.com/api/v3',
            model: document.getElementById('config-model')?.value || '',
            visionEnabled: document.getElementById('config-vision-enabled')?.checked || false,
            visionModel: document.getElementById('config-vision-model')?.value || '',
            temperature: parseFloat(document.getElementById('config-temperature')?.value) || 0.3,
            maxTokens: parseInt(document.getElementById('config-max-tokens')?.value) || 2048
        };

        const statusEl = document.getElementById('config-status');
        statusEl.textContent = '正在测试连接...';
        statusEl.className = 'config-status testing';
        statusEl.style.display = 'block';

        try {
            const result = await this.modelConfig.testConnection(testConfig);

            if (result.success) {
                statusEl.innerHTML = `✅ ${result.message}<br><small style="opacity:0.8">模型: ${result.model || testConfig.model} | 回复: "${result.reply}"</small>`;
                statusEl.className = 'config-status success';
            } else {
                statusEl.innerHTML = `❌ ${result.message}`;
                statusEl.className = 'config-status error';
            }
        } catch (error) {
            statusEl.textContent = `❌ 测试失败: ${error.message}`;
            statusEl.className = 'config-status error';
        }
    }

    getFormProfile() {
        const height = parseInt(document.getElementById('height').value) || null;
        const weight = parseInt(document.getElementById('weight').value) || null;
        const age = parseInt(document.getElementById('age').value) || null;
        
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        const gender = genderRadio ? genderRadio.value : null;

        const activity = document.getElementById('activity').value || 'moderate';

        const conditions = [];
        if (document.getElementById('condition-diabetes').checked) conditions.push('糖尿病');
        if (document.getElementById('condition-hypertension').checked) conditions.push('高血压');
        if (document.getElementById('condition-heart').checked) conditions.push('心脏病');
        if (document.getElementById('condition-obesity').checked) conditions.push('肥胖');

        return { heightCm: height, weightKg: weight, age, gender, activityLevel: activity, conditions };
    }

    updateProfilePreview() {
    }

    handleQuickTest() {
        document.getElementById('height').value = 175;
        document.getElementById('weight').value = 80;
        document.getElementById('age').value = 50;
        const maleRadio = document.querySelector('input[name="gender"][value="male"]');
        if (maleRadio) maleRadio.checked = true;
        document.getElementById('activity').value = 'sedentary';
        document.getElementById('condition-diabetes').checked = true;
        document.getElementById('meal-input').value = '米饭+可乐';

        setTimeout(() => this.handleAnalyze(), 100);
    }

    handleAnalyze() {
        const mealText = document.getElementById('meal-input').value.trim();

        if (!mealText) {
            this.showError('请输入餐食内容');
            return;
        }

        this.analyzeMealFromText(mealText);
    }

    async analyzeMealFromText(mealText) {
        const profileOptions = this.getFormProfile();
        
        if (profileOptions.conditions.length === 0 && !profileOptions.heightCm && !profileOptions.weightKg) {
            this.showError('请至少选择一项健康状况或输入身高体重');
            return;
        }

        try {
            this.currentProfile = this.healthProfiler.createProfile(profileOptions);

            let finalMealText = mealText;
            if (this.modelConfig.isConfigured()) {
                try {
                    const enhanced = await this.imageRecognizer.enhanceTextDescription(mealText);
                    if (enhanced.success && enhanced.enhanced !== mealText) {
                        finalMealText = enhanced.enhanced;
                    }
                } catch (e) {
                    console.log('Text enhancement failed, using original:', e);
                }
            }

            const useLLMFallback = this.modelConfig.isConfigured();
            let mealResult;
            
            if (useLLMFallback) {
                console.log('[DietAdvisorApp] 使用动态数据库+LLM回退模式');
                this.showAnalysisStatus('正在分析食物，如需从大模型获取未知食物信息可能需要几秒钟...');
                mealResult = await this.mealAnalyzer.analyzeWithLLM(finalMealText);
                
                if (mealResult.newFoods && mealResult.newFoods.length > 0) {
                    console.log('[DietAdvisorApp] 从大模型获取了新食物:', mealResult.newFoods);
                }
                
                if (mealResult.errors && mealResult.errors.length > 0) {
                    console.warn('[DietAdvisorApp] 部分食物无法识别:', mealResult.errors);
                }
            } else {
                console.log('[DietAdvisorApp] 使用静态数据库模式（无LLM回退）');
                mealResult = this.mealAnalyzer.analyze(finalMealText);
            }

            if (mealResult.matchedCount === 0) {
                const hint = useLLMFallback 
                    ? '请检查输入，或确保大模型配置正确。'
                    : '请检查输入，或配置大模型以支持识别更多食物。';
                this.showError(`无法识别餐食中的食物: "${mealText}"。${hint}`);
                return;
            }

            this.hideAnalysisStatus();

            const ruleEvaluation = this.ruleEngine.evaluateMeal(mealResult, this.currentProfile);

            const recommendations = this.dietRecommender.generateRecommendations(
                mealResult,
                this.currentProfile,
                ruleEvaluation
            );

            this.renderResults(mealResult, this.currentProfile);
            this.renderRecommendations(recommendations, ruleEvaluation, this.currentProfile);

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('分析过程中发生错误: ' + error.message);
        }
    }

    showAnalysisStatus(message) {
        let statusEl = document.getElementById('analysis-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'analysis-status';
            statusEl.className = 'info-alert';
            statusEl.style.cssText = 'margin: 10px 0; padding: 10px 15px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px; font-size: 0.9rem;';
            const resultsContainer = document.getElementById('results-container');
            resultsContainer.parentNode.insertBefore(statusEl, resultsContainer);
        }
        statusEl.innerHTML = `<strong>🔄</strong> ${message}`;
        statusEl.style.display = 'block';
    }

    hideAnalysisStatus() {
        const statusEl = document.getElementById('analysis-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    renderResults(mealResult, profile) {
        const container = document.getElementById('results-container');
        const agg = mealResult.aggregate;

        let html = '';

        if (profile.bmi || profile.conditions.length > 0) {
            html += '<div class="aggregate-summary">';
            html += '<h3>📊 您的健康画像</h3>';
            html += '<div class="aggregate-grid">';
            if (profile.bmi) {
                html += `<div class="nutrition-pill"><span class="label">BMI</span><span class="value">${profile.bmi}</span></div>`;
            }
            if (profile.bmiCategory) {
                html += `<div class="nutrition-pill"><span class="label">体重状态</span><span class="value">${profile.bmiCategory.label}</span></div>`;
            }
            if (profile.dailyCalories) {
                html += `<div class="nutrition-pill"><span class="label">推荐每日热量</span><span class="value">${profile.dailyCalories} kcal</span></div>`;
            }
            html += '</div>';
            
            if (profile.conditions.length > 0) {
                html += '<div style="margin-top:12px; font-size:0.9rem;">';
                html += '<span style="color:#555;">健康状况: </span>';
                html += profile.conditions.map(c => 
                    `<span class="tag tag-danger">${c}</span>`
                ).join(' ');
                html += '</div>';
            }
            html += '</div>';
        }

        html += '<div class="aggregate-summary">';
        html += '<h3>🍽️ 餐食营养总计</h3>';
        html += '<div class="aggregate-grid">';
        html += `<div class="nutrition-pill"><span class="label">热量</span><span class="value">${agg.calories} kcal</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">碳水化合物</span><span class="value">${agg.carbs} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">蛋白质</span><span class="value">${agg.protein} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">脂肪</span><span class="value">${agg.fat} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">糖分</span><span class="value">${agg.sugar} g</span></div>`;
        html += `<div class="nutrition-pill"><span class="label">钠</span><span class="value">${agg.sodium} mg</span></div>`;
        if (agg.avgGlycemicIndex > 0) {
            html += `<div class="nutrition-pill"><span class="label">平均 GI</span><span class="value">${agg.avgGlycemicIndex}</span></div>`;
        }
        html += '</div>';

        if (agg.ratios.carbs + agg.ratios.protein + agg.ratios.fat > 0) {
            html += '<div class="ratios-bar">';
            html += `<div class="ratio-carbs" style="width:${agg.ratios.carbs}%"></div>`;
            html += `<div class="ratio-protein" style="width:${agg.ratios.protein}%"></div>`;
            html += `<div class="ratio-fat" style="width:${agg.ratios.fat}%"></div>`;
            html += '</div>';
            html += '<div class="ratios-legend">';
            html += `<div class="ratio-item"><span class="ratio-color ratio-carbs"></span>碳水 ${agg.ratios.carbs}%</div>`;
            html += `<div class="ratio-item"><span class="ratio-color ratio-protein"></span>蛋白质 ${agg.ratios.protein}%</div>`;
            html += `<div class="ratio-item"><span class="ratio-color ratio-fat"></span>脂肪 ${agg.ratios.fat}%</div>`;
            html += '</div>';
        }
        html += '</div>';

        if (mealResult.newFoods && mealResult.newFoods.length > 0) {
            html += '<div style="margin: 12px 0; padding: 10px 15px; background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; font-size: 0.9rem;">';
            html += '✨ 新增识别食物：';
            html += mealResult.newFoods.map(nf => `<span style="font-weight:600;">${nf.name}</span>`).join('、');
            html += '（已保存到数据库，下次可直接识别）';
            html += '</div>';
        }

        html += '<h4 style="margin: 16px 0 12px; color:#555;">🔍 识别的食物</h4>';
        for (const item of mealResult.items) {
            const n = item.nutrition;
            const isDynamic = item.source === 'dynamic' || item.source === 'llm_new';
            const isLLMNew = item.source === 'llm_new';
            
            html += '<div class="food-item">';
            html += `<div class="food-item-header">`;
            html += `<span class="food-name">${item.name}`;
            if (isLLMNew) {
                html += ' <span style="font-size:0.75rem; padding:2px 6px; background:#4caf50; color:white; border-radius:10px;">新识别</span>';
            } else if (isDynamic) {
                html += ' <span style="font-size:0.75rem; padding:2px 6px; background:#2196f3; color:white; border-radius:10px;">已保存</span>';
            }
            html += '</span>';
            html += `<span class="food-amount">${item.amount}${item.unit}</span>`;
            html += '</div>';
            html += '<div class="food-nutrition">';
            html += `<div class="nutrition-pill"><span class="label">热量</span><span class="value">${n.calories.toFixed(0)} kcal</span></div>`;
            html += `<div class="nutrition-pill"><span class="label">碳水</span><span class="value">${n.carbs.toFixed(1)} g</span></div>`;
            html += `<div class="nutrition-pill"><span class="label">GI</span><span class="value">${n.glycemicIndex || '-'}</span></div>`;
            html += '</div>';

            if (item.food.tags && item.food.tags.length > 0) {
                html += '<div style="margin-top:8px;">';
                for (const tag of item.food.tags) {
                    const isDanger = ['高糖', '高GI', '高钠', '高脂肪', '高热量', '精制碳水'].includes(tag);
                    const isGood = ['低GI', '粗粮', '高纤维', '高蛋白', '低脂肪'].includes(tag);
                    const tagClass = isDanger ? 'tag-danger' : isGood ? 'tag-success' : '';
                    html += `<span class="tag ${tagClass}">${tag}</span>`;
                }
                html += '</div>';
            }
            html += '</div>';
        }

        if (mealResult.errors && mealResult.errors.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#ff9800;">⚠️ 未识别的食物</h4>';
            for (const err of mealResult.errors) {
                html += `<div style="padding:8px 12px; background:#fff8e1; border-left: 3px solid #ff9800; border-radius: 4px; margin-bottom: 8px;">`;
                html += `<strong>${err.name}</strong>: ${err.error}`;
                html += '</div>';
            }
        }

        container.innerHTML = html;
    }

    renderRecommendations(recommendations, ruleEvaluation, profile) {
        const container = document.getElementById('recommendations-container');
        let html = '';

        const assessment = recommendations.overallAssessment;
        const severityLabels = {
            'critical': { title: '⚠️ 严重风险', class: 'assessment-critical' },
            'high': { title: '⚠️ 较高风险', class: 'assessment-high' },
            'medium': { title: '⚡ 中度风险', class: 'assessment-medium' },
            'none': { title: '✅ 餐食良好', class: 'assessment-none' }
        };

        const label = severityLabels[assessment.severity] || severityLabels['none'];
        html += `<div class="assessment-header ${label.class}">`;
        html += `<div class="assessment-title">${label.title}</div>`;
        html += `<div class="assessment-stats">`;
        html += `${assessment.warningCount} 项警告 | ${assessment.replacementCount} 项建议替换`;
        html += `</div>`;
        html += '</div>';

        const hasRiceCokeIssue = recommendations.warnings.some(w => 
            (w.type === 'carbs' || w.type === 'sugar' || w.type === 'glycemicIndex' || w.tag) &&
            recommendations.replacements.some(r => r.from === '米饭' || r.from === '可乐')
        );

        if (hasRiceCokeIssue) {
            html += '<div class="danger-alert">';
            html += '<div class="alert-title">🚨 碳水化合物和糖分过高</div>';
            html += '<div class="alert-message">建议替换为粗粮和白开水。</div>';
            html += '</div>';
        }

        for (const warning of recommendations.warnings) {
            const isCritical = warning.type === 'sugar' || warning.type === 'glycemicIndex' || 
                              (warning.tag && ['高糖', '高GI'].includes(warning.tag));
            
            html += isCritical ? '<div class="danger-alert">' : '<div class="warning-alert">';
            html += `<div class="alert-title">${warning.condition}${isCritical ? ' - 需要注意' : ''}</div>`;
            html += `<div class="alert-message">${warning.message}</div>`;
            html += '</div>';
        }

        if (recommendations.forbiddenFoods.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#c62828;">🚫 建议避免</h4>';
            for (const food of recommendations.forbiddenFoods) {
                html += `<div class="danger-alert">`;
                html += `<div class="alert-title">${food.name}</div>`;
                html += `<div class="alert-message">${food.reason}</div>`;
                html += '</div>';
            }
        }

        if (recommendations.replacements.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#1565c0;">🔄 建议替换</h4>';
            for (const rep of recommendations.replacements) {
                html += '<div class="replacement-item">';
                html += `<span class="replacement-from">${rep.from}</span>`;
                html += '<span class="replacement-arrow">→</span>';
                html += `<span class="replacement-to">${rep.to}</span>`;
                html += `<span class="replacement-reason">${rep.reason}</span>`;
                html += '</div>';
            }
        }

        if (recommendations.suggestions.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#2e7d32;">💡 健康建议</h4>';
            for (const suggestion of recommendations.suggestions) {
                html += '<div class="suggestion-item">';
                html += '<span class="suggestion-icon">•</span>';
                html += `<span class="suggestion-text">${suggestion}</span>`;
                html += '</div>';
            }
        }

        if (recommendations.bayesianRisks && recommendations.bayesianRisks.recommendations.length > 0) {
            html += '<h4 style="margin: 16px 0 12px; color:#6a1b9a;">🔬 贝叶斯风险分析</h4>';
            for (const rec of recommendations.bayesianRisks.recommendations) {
                html += '<div class="info-alert">';
                html += `<div class="alert-message">${rec}</div>`;
                html += '</div>';
            }
        }

        if (recommendations.warnings.length === 0 && 
            recommendations.replacements.length === 0 &&
            recommendations.forbiddenFoods.length === 0) {
            html += '<div class="success-alert">';
            html += '<div class="alert-title">🎉 餐食评估通过</div>';
            html += '<div class="alert-message">您选择的餐食符合当前健康状况，继续保持健康饮食习惯！</div>';
            html += '</div>';
        }

        container.innerHTML = html;
    }

    renderFoodDatabase(query = '') {
        const container = document.getElementById('food-list');
        let foods = this.dynamicFoodDatabase ? this.dynamicFoodDatabase.getAllFoods() : [];

        if (query) {
            const q = query.toLowerCase();
            foods = foods.filter(f => 
                f.name.toLowerCase().includes(q) ||
                (f.aliases && f.aliases.some(a => a.toLowerCase().includes(q))) ||
                (f.tags && f.tags.some(t => t.toLowerCase().includes(q)))
            );
        }

        foods = foods.slice(0, 20);

        const stats = this.dynamicFoodDatabase ? this.dynamicFoodDatabase.getStats() : null;
        
        let headerHtml = '';
        if (stats) {
            headerHtml = '<div style="margin-bottom:12px; padding:8px 12px; background:#f5f5f5; border-radius:4px; font-size:0.85rem;">';
            headerHtml += `📊 数据库统计：静态 <strong>${stats.staticCount}</strong> 种 | 动态 <strong>${stats.dynamicCount}</strong> 种 | 总计 <strong>${stats.totalCount}</strong> 种`;
            if (stats.dynamicCount > 0) {
                headerHtml += ` <button id="clear-dynamic-btn" style="margin-left:10px; padding:2px 8px; font-size:0.8rem; background:#ff5722; color:white; border:none; border-radius:3px; cursor:pointer;">清空动态数据库</button>`;
            }
            headerHtml += '</div>';
        }

        if (foods.length === 0) {
            container.innerHTML = headerHtml + '<div class="placeholder" style="padding:20px;"><p>未找到匹配的食物</p></div>';
            return;
        }

        let html = headerHtml;
        for (const food of foods) {
            const isDynamic = this.dynamicFoodDatabase && this.dynamicFoodDatabase.isDynamicFood(food);
            
            html += '<div class="food-db-item" style="position:relative;">';
            if (isDynamic) {
                html += '<span style="position:absolute; top:5px; right:8px; font-size:0.7rem; padding:1px 6px; background:#2196f3; color:white; border-radius:8px;">动态</span>';
            }
            html += `<div class="name">${food.name}</div>`;
            html += '<div class="tags">';
            html += `${food.category} | ${food.calories}kcal/${food.serving}`;
            if (food.tags && food.tags.length > 0) {
                html += '<br>';
                for (const tag of food.tags) {
                    const isDanger = ['高糖', '高GI', '高钠', '高脂肪', '高热量'].includes(tag);
                    const isGood = ['低GI', '粗粮', '高纤维'].includes(tag);
                    const tagClass = isDanger ? 'tag-danger' : isGood ? 'tag-success' : '';
                    html += `<span class="tag ${tagClass}">${tag}</span>`;
                }
            }
            if (food.healthWarnings && food.healthWarnings.length > 0) {
                html += '<br><span style="color:#c62828; font-size:0.75rem;">⚠️ ';
                html += food.healthWarnings.join(', ') + '患者慎食';
                html += '</span>';
            }
            html += '</div>';
            html += '</div>';
        }

        container.innerHTML = html;

        setTimeout(() => {
            const clearBtn = document.getElementById('clear-dynamic-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    if (confirm('确定要清空所有动态添加的食物吗？此操作不可恢复。')) {
                        this.dynamicFoodDatabase.clearDynamicFoods();
                        this.renderFoodDatabase();
                        alert('动态数据库已清空');
                    }
                });
            }
        }, 0);
    }

    showError(message) {
        const container = document.getElementById('results-container');
        container.innerHTML = `
            <div class="danger-alert">
                <div class="alert-title">❌ 错误</div>
                <div class="alert-message">${message}</div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new DietAdvisorApp();
    app.init().catch(err => {
        console.error('Initialization error:', err);
    });
});
