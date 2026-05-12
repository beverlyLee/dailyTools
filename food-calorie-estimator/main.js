console.log('[App] 食物卡路里估算工具启动中...');

window.onerror = function(message, source, lineno, colno, error) {
    console.error('[App] 全局错误:', message, '行:', lineno);
    return true;
};

window.onunhandledrejection = function(event) {
    console.error('[App] 未处理的 Promise 拒绝:', event.reason);
    event.preventDefault();
};

class FoodCalorieApp {
    constructor() {
        console.log('[App] 初始化应用...');
        
        this.nutritionDB = null;
        this.volumeEstimator = null;
        this.segmenter = null;
        this.llmAnalyzer = null;
        this.currentImage = null;
        this.currentImageData = null;
        this.currentImageBase64 = null;
        this.isAnalyzing = false;
        this.analysisMode = 'color';
        this.analysisTimeout = 30000;
        
        this.containerSettings = {
            type: 'plate',
            size: 26,
            isEdible: false,
            edibleCalories: 150
        };
        
        this.llmConfig = {
            apiKey: '',
            model: 'gpt-4o-mini',
            provider: 'openai',
            baseUrl: ''
        };

        this.init();
    }

    init() {
        try {
            console.log('[App] 初始化组件...');
            
            this.nutritionDB = new NutritionDB();
            this.volumeEstimator = new VolumeEstimator(26, 3);
            this.segmenter = new FoodSegmenter(this.nutritionDB);
            this.llmAnalyzer = new LLMAnalyzer();
            
            console.log('[App] 组件初始化完成');
            
            this.loadSavedConfig();
            this.bindEvents();
            this.segmenter.loadModel();
            this.updateModelOptions();
            
            console.log('[App] 应用初始化完成');
            
        } catch (error) {
            console.error('[App] 初始化失败:', error);
            this.showError('应用初始化失败: ' + error.message);
        }
    }

    loadSavedConfig() {
        try {
            const savedProvider = localStorage.getItem('foodAnalyzer_provider');
            const savedModel = localStorage.getItem('foodAnalyzer_model');
            const savedApiKey = localStorage.getItem('foodAnalyzer_apiKey');
            const savedBaseUrl = localStorage.getItem('foodAnalyzer_baseUrl');
            const savedMode = localStorage.getItem('foodAnalyzer_mode');

            if (savedProvider) {
                this.llmConfig.provider = savedProvider;
                const el = document.getElementById('aiProvider');
                if (el) el.value = savedProvider;
            }
            if (savedModel) {
                this.llmConfig.model = savedModel;
                const el = document.getElementById('aiModel');
                if (el) el.value = savedModel;
            }
            if (savedApiKey) {
                this.llmConfig.apiKey = savedApiKey;
                const el = document.getElementById('apiKey');
                if (el) el.value = savedApiKey;
            }
            if (savedBaseUrl) {
                this.llmConfig.baseUrl = savedBaseUrl;
                const el = document.getElementById('customBaseUrl');
                if (el) el.value = savedBaseUrl;
            }
            if (savedMode) {
                this.analysisMode = savedMode;
                const el = document.querySelector(`input[name="analysisMode"][value="${savedMode}"]`);
                if (el) el.checked = true;
            }

            if (this.llmAnalyzer) {
                this.llmAnalyzer.setConfig({
                    apiKey: this.llmConfig.apiKey,
                    model: this.llmConfig.model,
                    provider: this.llmConfig.provider,
                    baseUrl: this.llmConfig.baseUrl
                });
            }
            
        } catch (error) {
            console.warn('[App] 加载配置失败:', error);
        }
    }

    updateModelOptions() {
        try {
            if (!this.llmAnalyzer) return;
            
            const providers = this.llmAnalyzer.getProviders();
            const providerSelect = document.getElementById('aiProvider');
            const modelSelect = document.getElementById('aiModel');
            const baseUrlInput = document.getElementById('customBaseUrl');

            if (!providerSelect || !modelSelect) return;

            const currentProvider = providerSelect.value;
            const providerInfo = providers[currentProvider];

            if (providerInfo) {
                modelSelect.innerHTML = '';
                providerInfo.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });

                if (baseUrlInput && !baseUrlInput.value && providerInfo.baseUrl) {
                    baseUrlInput.placeholder = providerInfo.baseUrl;
                }
            }
        } catch (error) {
            console.warn('[App] 更新模型选项失败:', error);
        }
    }

    bindEvents() {
        try {
            const uploadArea = document.getElementById('uploadArea');
            const fileInput = document.getElementById('fileInput');
            const analyzeBtn = document.getElementById('analyzeBtn');
            const resetBtn = document.getElementById('resetBtn');
            const containerType = document.getElementById('containerType');
            const containerSize = document.getElementById('containerSize');
            const foodThickness = document.getElementById('foodThickness');
            const containerEdible = document.getElementById('containerEdible');
            const edibleContainerCalories = document.getElementById('edibleContainerCalories');

            const aiProvider = document.getElementById('aiProvider');
            const aiModel = document.getElementById('aiModel');
            const apiKey = document.getElementById('apiKey');
            const customBaseUrl = document.getElementById('customBaseUrl');
            const toggleApiKey = document.getElementById('toggleApiKey');
            const saveApiKey = document.getElementById('saveApiKey');

            const modeAi = document.getElementById('modeAi');
            const modeColor = document.getElementById('modeColor');
            const modeHybrid = document.getElementById('modeHybrid');

            if (uploadArea && fileInput) {
                uploadArea.addEventListener('click', () => {
                    try { fileInput.click(); } catch (e) { console.warn(e); }
                });
                
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('drag-over');
                });

                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('drag-over');
                });

                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('drag-over');
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                        this.handleFile(files[0]);
                    }
                });

                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        this.handleFile(e.target.files[0]);
                    }
                });
            }

            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', () => {
                    if (!this.isAnalyzing) {
                        this.analyzeImage();
                    }
                });
            }
            
            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.reset());
            }

            if (containerType) {
                containerType.addEventListener('change', (e) => {
                    const type = e.target.value;
                    this.handleContainerTypeChange(type);
                });
            }

            if (containerSize) {
                containerSize.addEventListener('change', (e) => {
                    const value = parseFloat(e.target.value) || 26;
                    this.containerSettings.size = value;
                    this.volumeEstimator.setPlateDiameter(value);
                });
            }

            if (foodThickness) {
                foodThickness.addEventListener('change', (e) => {
                    const value = parseFloat(e.target.value) || 3;
                    this.volumeEstimator.setFoodThickness(value);
                });
            }

            if (containerEdible) {
                containerEdible.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    this.containerSettings.isEdible = isChecked;
                    this.updateEdibleLabel(isChecked);
                    this.toggleEdibleCaloriesInput(isChecked);
                });
            }

            if (edibleContainerCalories) {
                edibleContainerCalories.addEventListener('change', (e) => {
                    const value = parseFloat(e.target.value) || 150;
                    this.containerSettings.edibleCalories = value;
                });
            }

            if (aiProvider) {
                aiProvider.addEventListener('change', (e) => {
                    this.llmConfig.provider = e.target.value;
                    this.llmAnalyzer.setConfig({ provider: e.target.value });
                    this.updateModelOptions();
                    localStorage.setItem('foodAnalyzer_provider', e.target.value);
                });
            }

            if (aiModel) {
                aiModel.addEventListener('change', (e) => {
                    this.llmConfig.model = e.target.value;
                    this.llmAnalyzer.setConfig({ model: e.target.value });
                    localStorage.setItem('foodAnalyzer_model', e.target.value);
                });
            }

            if (apiKey) {
                apiKey.addEventListener('change', (e) => {
                    this.llmConfig.apiKey = e.target.value;
                });
            }

            if (customBaseUrl) {
                customBaseUrl.addEventListener('change', (e) => {
                    this.llmConfig.baseUrl = e.target.value;
                    this.llmAnalyzer.setConfig({ baseUrl: e.target.value });
                    localStorage.setItem('foodAnalyzer_baseUrl', e.target.value);
                });
            }

            if (toggleApiKey) {
                toggleApiKey.addEventListener('click', () => {
                    const input = document.getElementById('apiKey');
                    if (input) {
                        if (input.type === 'password') {
                            input.type = 'text';
                            toggleApiKey.textContent = '🙈';
                        } else {
                            input.type = 'password';
                            toggleApiKey.textContent = '👁️';
                        }
                    }
                });
            }

            if (saveApiKey) {
                saveApiKey.addEventListener('click', () => {
                    this.llmAnalyzer.setConfig({
                        apiKey: this.llmConfig.apiKey
                    });
                    localStorage.setItem('foodAnalyzer_apiKey', this.llmConfig.apiKey);
                    this.showToast('API Key 已保存到本地');
                });
            }

            if (modeAi) {
                modeAi.addEventListener('change', () => { 
                    this.analysisMode = 'ai'; 
                    localStorage.setItem('foodAnalyzer_mode', 'ai'); 
                });
            }
            if (modeColor) {
                modeColor.addEventListener('change', () => { 
                    this.analysisMode = 'color'; 
                    localStorage.setItem('foodAnalyzer_mode', 'color'); 
                });
            }
            if (modeHybrid) {
                modeHybrid.addEventListener('change', () => { 
                    this.analysisMode = 'hybrid'; 
                    localStorage.setItem('foodAnalyzer_mode', 'hybrid'); 
                });
            }

            console.log('[App] 事件绑定完成');
            
        } catch (error) {
            console.error('[App] 事件绑定失败:', error);
        }
    }

    handleContainerTypeChange(type) {
        try {
            this.containerSettings.type = type;
            const containerInfo = this.nutritionDB.getContainerInfo(type);

            const sizeUnit = document.getElementById('sizeUnit');
            const sizeHint = document.getElementById('sizeHint');
            const containerHint = document.getElementById('containerHint');
            const containerEdible = document.getElementById('containerEdible');
            const edibleLabel = document.getElementById('edibleLabel');
            const edibleHint = document.getElementById('edibleHint');
            const edibleContainerCalories = document.getElementById('edibleContainerCalories');
            const containerVolume = document.getElementById('containerVolume');
            const containerSizeInput = document.getElementById('containerSize');

            if (containerHint && sizeUnit && sizeHint) {
                containerHint.textContent = containerInfo.name;
                sizeUnit.textContent = containerInfo.sizeUnit;
                sizeHint.textContent = containerInfo.sizeHint;
            }

            if (containerSizeInput) {
                containerSizeInput.value = containerInfo.defaultSize;
                this.containerSettings.size = containerInfo.defaultSize;
                this.volumeEstimator.setPlateDiameter(containerInfo.defaultSize);
            }

            if (containerInfo.isEdible) {
                if (containerEdible) containerEdible.checked = true;
                this.containerSettings.isEdible = true;
                this.updateEdibleLabel(true);
                this.toggleEdibleCaloriesInput(true);
                
                if (containerInfo.defaultContainerCalories && edibleContainerCalories) {
                    edibleContainerCalories.value = containerInfo.defaultContainerCalories;
                    this.containerSettings.edibleCalories = containerInfo.defaultContainerCalories;
                }
                
                if (edibleHint) edibleHint.textContent = '甜筒底座/可食用容器的热量';
            } else {
                if (containerEdible) containerEdible.checked = false;
                this.containerSettings.isEdible = false;
                this.updateEdibleLabel(false);
                this.toggleEdibleCaloriesInput(false);
                if (edibleHint) edibleHint.textContent = '该餐具不可食用';
            }
        } catch (error) {
            console.warn('[App] 处理容器类型变更失败:', error);
        }
    }

    updateEdibleLabel(isEdible) {
        try {
            const edibleLabel = document.getElementById('edibleLabel');
            if (edibleLabel) {
                edibleLabel.textContent = isEdible ? '可食用（计入热量）' : '不可食用';
            }
        } catch (e) {}
    }

    toggleEdibleCaloriesInput(show) {
        try {
            const containerVolume = document.getElementById('containerVolume');
            if (containerVolume) {
                containerVolume.style.display = show ? 'block' : 'none';
            }
        } catch (e) {}
    }

    handleFile(file) {
        try {
            if (!file) return;
            
            if (!file.type || !file.type.startsWith('image/')) {
                alert('请上传图片文件');
                return;
            }

            console.log('[App] 处理图片:', file.name, file.size);

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const img = new Image();
                    img.onload = () => {
                        console.log('[App] 图片加载完成:', img.width, 'x', img.height);
                        this.currentImage = img;
                        this.currentImageBase64 = this.compressImageToBase64(img);
                        this.displayImage(img);
                        this.showPreview();
                    };
                    img.onerror = () => {
                        console.error('[App] 图片加载失败');
                        alert('图片加载失败，请重试');
                    };
                    img.src = e.target.result;
                } catch (error) {
                    console.error('[App] 处理图片数据失败:', error);
                    alert('处理图片失败');
                }
            };
            reader.onerror = () => {
                console.error('[App] 读取文件失败');
                alert('读取文件失败');
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('[App] 处理文件失败:', error);
            alert('处理文件失败: ' + error.message);
        }
    }

    compressImageToBase64(img, maxWidth = 1024, quality = 0.7) {
        try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = height * ratio;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64 = dataUrl.split(',')[1];
            console.log('[App] 图片压缩后大小:', Math.round(base64.length / 1024), 'KB');
            return base64;
        } catch (error) {
            console.warn('[App] 图片压缩失败:', error);
            return '';
        }
    }

    displayImage(img) {
        try {
            const canvas = document.getElementById('originalCanvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            const maxWidth = 400;
            const maxHeight = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = height * (maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = width * (maxHeight / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            this.currentImageData = ctx.getImageData(0, 0, width, height);
            console.log('[App] 图片显示完成:', width, 'x', height);
            
        } catch (error) {
            console.error('[App] 显示图片失败:', error);
        }
    }

    showPreview() {
        try {
            const previewSection = document.getElementById('previewSection');
            const actionSection = document.getElementById('actionSection');
            const resultsSection = document.getElementById('resultsSection');
            
            if (previewSection) previewSection.style.display = 'block';
            if (actionSection) actionSection.style.display = 'flex';
            if (resultsSection) resultsSection.style.display = 'none';
        } catch (e) {}
    }

    async analyzeImage() {
        if (this.isAnalyzing) {
            console.warn('[App] 正在分析中，请稍候...');
            return;
        }

        if (!this.currentImageData) {
            alert('请先上传图片');
            return;
        }

        console.log('[App] 开始分析图片，模式:', this.analysisMode);
        this.isAnalyzing = true;
        this.showLoading();

        try {
            let results;
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('分析超时，请尝试使用更小的图片或AI模式'));
                }, this.analysisTimeout);
            });

            const analysisPromise = this.performAnalysis();
            
            results = await Promise.race([analysisPromise, timeoutPromise]);
            
            this.displayResults(results);
            console.log('[App] 分析完成');

        } catch (error) {
            console.error('[App] 分析失败:', error);
            this.showError('分析失败: ' + error.message);
        } finally {
            this.isAnalyzing = false;
            this.hideLoading();
        }
    }

    async performAnalysis() {
        console.log('[App] 执行分析，模式:', this.analysisMode);
        
        if (this.analysisMode === 'ai') {
            return this.analyzeWithAI();
        } else if (this.analysisMode === 'hybrid') {
            return this.analyzeWithHybrid();
        } else {
            return this.analyzeWithColor();
        }
    }

    async analyzeWithAI() {
        if (!this.llmAnalyzer.isAvailable()) {
            console.log('[App] AI 模式但无 API Key，回退到颜色模式');
            return this.analyzeWithColor();
        }

        const loadingText = document.querySelector('#loadingSection p');
        if (loadingText) {
            loadingText.textContent = '🤖 AI 正在识别食物和餐具，请稍候...';
        }

        const llmResult = await this.llmAnalyzer.analyzeImage(this.currentImageBase64);
        
        if (loadingText) {
            loadingText.textContent = '正在计算热量...';
        }

        if (llmResult.container) {
            const containerType = document.getElementById('containerType');
            if (containerType && llmResult.container.type) {
                const option = containerType.querySelector(`option[value="${llmResult.container.type}"]`);
                if (option) {
                    containerType.value = llmResult.container.type;
                    this.handleContainerTypeChange(llmResult.container.type);
                }
            }
            if (llmResult.container.sizeCm) {
                const sizeInput = document.getElementById('containerSize');
                if (sizeInput) {
                    sizeInput.value = llmResult.container.sizeCm;
                    this.containerSettings.size = llmResult.container.sizeCm;
                    this.volumeEstimator.setPlateDiameter(llmResult.container.sizeCm);
                }
            }
            if (llmResult.container.isEdible !== undefined) {
                const edibleCheckbox = document.getElementById('containerEdible');
                if (edibleCheckbox) {
                    edibleCheckbox.checked = llmResult.container.isEdible;
                    this.containerSettings.isEdible = llmResult.container.isEdible;
                    this.updateEdibleLabel(llmResult.container.isEdible);
                    this.toggleEdibleCaloriesInput(llmResult.container.isEdible);
                }
            }
        }

        if (llmResult.foodThicknessCm) {
            const thicknessInput = document.getElementById('foodThickness');
            if (thicknessInput) {
                thicknessInput.value = llmResult.foodThicknessCm;
                this.volumeEstimator.setFoodThickness(llmResult.foodThicknessCm);
            }
        }

        const results = this.calculateCaloriesFromLLM(llmResult);
        results.analysisNotes = llmResult.analysisNotes;
        return results;
    }

    calculateCaloriesFromLLM(llmResult) {
        const results = [];
        let totalMinCalories = 0;
        let totalMaxCalories = 0;

        const foods = llmResult.foods || [];

        if (foods.length === 0) {
            return {
                foods: [],
                totalCalories: { min: 0, max: 0 },
                containerType: this.containerSettings.type,
                analysisNotes: llmResult.analysisNotes
            };
        }

        for (const food of foods) {
            const weightMin = food.weightMin || 50;
            const weightMax = food.weightMax || 150;
            
            const foodInfo = this.nutritionDB.getFoodInfo(food.type);
            
            const caloriesMin = (weightMin * foodInfo.caloriesPer100g.min) / 100;
            const caloriesMax = (weightMax * foodInfo.caloriesPer100g.max) / 100;

            results.push({
                foodType: food.type,
                foodInfo: {
                    ...foodInfo,
                    name: food.name || foodInfo.name,
                    description: food.description || foodInfo.description
                },
                volumeCm3: 0,
                areaCm2: 0,
                weight: {
                    min: weightMin,
                    max: weightMax
                },
                calories: {
                    min: Math.round(caloriesMin),
                    max: Math.round(caloriesMax)
                },
                confidence: food.confidence
            });

            totalMinCalories += caloriesMin;
            totalMaxCalories += caloriesMax;
        }

        if (this.containerSettings.isEdible) {
            const edibleCalories = this.containerSettings.edibleCalories;
            totalMinCalories += edibleCalories * 0.8;
            totalMaxCalories += edibleCalories * 1.2;
            
            results.unshift({
                foodType: 'edibleContainer',
                foodInfo: {
                    name: '可食用容器',
                    icon: '🍪',
                    description: this.getEdibleContainerDescription()
                },
                isContainer: true,
                volumeCm3: 0,
                areaCm2: 0,
                weight: {
                    min: Math.round(edibleCalories * 0.2),
                    max: Math.round(edibleCalories * 0.4)
                },
                calories: {
                    min: Math.round(edibleCalories * 0.8),
                    max: Math.round(edibleCalories * 1.2)
                }
            });
        }

        results.sort((a, b) => {
            if (a.isContainer) return -1;
            if (b.isContainer) return 1;
            return b.calories.max - a.calories.max;
        });

        return {
            foods: results,
            totalCalories: {
                min: Math.round(totalMinCalories),
                max: Math.round(totalMaxCalories)
            },
            containerType: this.containerSettings.type,
            analysisNotes: llmResult.analysisNotes
        };
    }

    async analyzeWithColor() {
        const loadingText = document.querySelector('#loadingSection p');
        if (loadingText) {
            loadingText.textContent = '🎨 颜色分析中...';
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        
        const segmentationResult = await this.segmenter.segment(this.currentImageData);

        if (loadingText) {
            loadingText.textContent = '正在估算体积和热量...';
        }

        const plateInfo = this.volumeEstimator.estimatePlateCenterAndRadius(this.currentImageData);
        
        const volumes = this.volumeEstimator.estimateVolumesFromRegions(
            segmentationResult.foodRegions,
            plateInfo,
            this.currentImageData.width * this.currentImageData.height
        );

        return this.calculateCalories(volumes);
    }

    async analyzeWithHybrid() {
        let colorResults = null;
        let aiResults = null;

        try {
            colorResults = await this.analyzeWithColor();
        } catch (e) {
            console.warn('[App] 颜色识别失败:', e);
        }

        if (this.llmAnalyzer.isAvailable()) {
            try {
                aiResults = await this.analyzeWithAI();
            } catch (e) {
                console.warn('[App] AI 识别失败:', e);
            }
        }

        if (aiResults && colorResults) {
            return this.mergeResults(colorResults, aiResults);
        } else if (aiResults) {
            return aiResults;
        } else if (colorResults) {
            return colorResults;
        } else {
            throw new Error('两种识别方式都失败了');
        }
    }

    mergeResults(colorResults, aiResults) {
        const mergedFoods = [];
        const seenTypes = new Set();

        if (aiResults.foods.length > 0) {
            for (const food of aiResults.foods) {
                mergedFoods.push(food);
                if (!food.isContainer) {
                    seenTypes.add(food.foodType);
                }
            }
        }

        for (const food of colorResults.foods) {
            if (!seenTypes.has(food.foodType) && !food.isContainer) {
                mergedFoods.push(food);
            }
        }

        mergedFoods.sort((a, b) => {
            if (a.isContainer) return -1;
            if (b.isContainer) return 1;
            return b.calories.max - a.calories.max;
        });

        const totalMin = mergedFoods.reduce((sum, f) => sum + f.calories.min, 0);
        const totalMax = mergedFoods.reduce((sum, f) => sum + f.calories.max, 0);

        return {
            foods: mergedFoods,
            totalCalories: { min: totalMin, max: totalMax },
            containerType: aiResults?.containerType || colorResults?.containerType,
            analysisNotes: '混合模式：结合了 AI 识别和颜色分割'
        };
    }

    calculateCalories(volumes) {
        const results = [];
        let totalMinCalories = 0;
        let totalMaxCalories = 0;

        for (const [foodType, volumeInfo] of Object.entries(volumes)) {
            if (volumeInfo.volumeCm3 <= 0) continue;
            
            const nutritionResult = this.nutritionDB.calculateCalories(
                volumeInfo.volumeCm3,
                foodType
            );
            
            results.push({
                foodType: foodType,
                foodInfo: nutritionResult.foodInfo,
                volumeCm3: Math.round(volumeInfo.volumeCm3),
                areaCm2: Math.round(volumeInfo.areaCm2),
                weight: nutritionResult.weight,
                calories: nutritionResult.calories
            });

            totalMinCalories += nutritionResult.calories.min;
            totalMaxCalories += nutritionResult.calories.max;
        }

        if (this.containerSettings.isEdible) {
            const edibleCalories = this.containerSettings.edibleCalories;
            totalMinCalories += edibleCalories * 0.8;
            totalMaxCalories += edibleCalories * 1.2;
            
            results.unshift({
                foodType: 'edibleContainer',
                foodInfo: {
                    name: '可食用容器',
                    icon: '🍪',
                    description: this.getEdibleContainerDescription()
                },
                isContainer: true,
                volumeCm3: 0,
                areaCm2: 0,
                weight: {
                    min: Math.round(edibleCalories * 0.2),
                    max: Math.round(edibleCalories * 0.4)
                },
                calories: {
                    min: Math.round(edibleCalories * 0.8),
                    max: Math.round(edibleCalories * 1.2)
                }
            });
        }

        results.sort((a, b) => {
            if (a.isContainer) return -1;
            if (b.isContainer) return 1;
            return b.calories.max - a.calories.max;
        });

        return {
            foods: results,
            totalCalories: {
                min: Math.round(totalMinCalories),
                max: Math.round(totalMaxCalories)
            },
            containerType: this.containerSettings.type
        };
    }

    getEdibleContainerDescription() {
        const type = this.containerSettings.type;
        const descriptions = {
            cone: '蛋筒/甜筒底座',
            custom: '可食用容器'
        };
        return descriptions[type] || '可食用容器';
    }

    displayResults(results) {
        try {
            const resultsSection = document.getElementById('resultsSection');
            const foodList = document.getElementById('foodList');
            const minCaloriesEl = document.getElementById('minCalories');
            const maxCaloriesEl = document.getElementById('maxCalories');
            
            if (minCaloriesEl) {
                minCaloriesEl.textContent = results.totalCalories.min;
            }
            if (maxCaloriesEl) {
                maxCaloriesEl.textContent = results.totalCalories.max;
            }

            if (foodList) {
                foodList.innerHTML = '';
                
                if (results.analysisNotes) {
                    const noteDiv = document.createElement('div');
                    noteDiv.className = 'analysis-note';
                    noteDiv.innerHTML = `<span class="note-icon">💡</span><span>${results.analysisNotes}</span>`;
                    foodList.appendChild(noteDiv);
                }
                
                if (results.foods.length === 0) {
                    foodList.innerHTML = '<p style="color: #666; text-align: center;">未能识别出食物区域，请尝试其他图片</p>';
                } else {
                    for (const food of results.foods) {
                        const item = document.createElement('div');
                        item.className = 'food-item' + (food.isContainer ? ' edible-container' : '');
                        
                        let confidenceBadge = '';
                        if (food.confidence !== undefined) {
                            const confidenceLevel = food.confidence > 0.8 ? 'high' : food.confidence > 0.5 ? 'medium' : 'low';
                            confidenceBadge = `<span class="confidence-badge ${confidenceLevel}">${Math.round(food.confidence * 100)}%</span>`;
                        }
                        
                        item.innerHTML = `
                            <div class="food-icon">${food.foodInfo.icon}</div>
                            <div class="food-info">
                                <div class="food-name">
                                    ${food.foodInfo.name}
                                    ${confidenceBadge}
                                    ${food.isContainer ? '<span class="container-badge">容器</span>' : ''}
                                </div>
                                <div class="food-details">
                                    ${food.isContainer ? 
                                        food.foodInfo.description :
                                        (food.volumeCm3 > 0 ? 
                                            `体积: ${food.volumeCm3}cm³ · 重量: ${food.weight.min}-${food.weight.max}g` :
                                            `重量: ${food.weight.min}-${food.weight.max}g`)
                                    }
                                </div>
                            </div>
                            <div class="food-calories">
                                ${food.calories.min}-${food.calories.max} 大卡
                            </div>
                        `;
                        foodList.appendChild(item);
                    }
                }
            }

            if (resultsSection) {
                resultsSection.style.display = 'block';
            }
            
        } catch (error) {
            console.error('[App] 显示结果失败:', error);
        }
    }

    showLoading() {
        try {
            const loadingSection = document.getElementById('loadingSection');
            const analyzeBtn = document.getElementById('analyzeBtn');
            const resultsSection = document.getElementById('resultsSection');
            
            if (loadingSection) loadingSection.style.display = 'block';
            if (analyzeBtn) analyzeBtn.disabled = true;
            if (resultsSection) resultsSection.style.display = 'none';
        } catch (e) {}
    }

    hideLoading() {
        try {
            const loadingSection = document.getElementById('loadingSection');
            const analyzeBtn = document.getElementById('analyzeBtn');
            const loadingText = document.querySelector('#loadingSection p');
            
            if (loadingSection) loadingSection.style.display = 'none';
            if (analyzeBtn) analyzeBtn.disabled = false;
            if (loadingText) loadingText.textContent = '正在分析图片，请稍候...';
        } catch (e) {}
    }

    reset() {
        try {
            this.currentImage = null;
            this.currentImageData = null;
            this.currentImageBase64 = null;
            this.isAnalyzing = false;
            
            const previewSection = document.getElementById('previewSection');
            const actionSection = document.getElementById('actionSection');
            const resultsSection = document.getElementById('resultsSection');
            const fileInput = document.getElementById('fileInput');
            
            if (previewSection) previewSection.style.display = 'none';
            if (actionSection) actionSection.style.display = 'none';
            if (resultsSection) resultsSection.style.display = 'none';
            if (fileInput) fileInput.value = '';
            
            const originalCanvas = document.getElementById('originalCanvas');
            const segmentationCanvas = document.getElementById('segmentationCanvas');
            if (originalCanvas) {
                originalCanvas.getContext('2d').clearRect(0, 0, originalCanvas.width, originalCanvas.height);
            }
            if (segmentationCanvas) {
                segmentationCanvas.getContext('2d').clearRect(0, 0, segmentationCanvas.width, segmentationCanvas.height);
            }
            
            console.log('[App] 已重置');
        } catch (error) {
            console.warn('[App] 重置时出错:', error);
        }
    }

    showToast(message) {
        try {
            let toast = document.getElementById('toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                document.body.appendChild(toast);
            }
            toast.textContent = message;
            toast.className = 'toast show';
            setTimeout(() => {
                if (toast) {
                    toast.className = 'toast';
                }
            }, 2000);
        } catch (e) {}
    }

    showError(message) {
        try {
            const existingError = document.getElementById('errorToast');
            if (existingError) {
                existingError.remove();
            }

            const errorDiv = document.createElement('div');
            errorDiv.id = 'errorToast';
            errorDiv.className = 'error-toast';
            errorDiv.innerHTML = `
                <span class="error-icon">⚠️</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.remove()">×</button>
            `;
            document.body.appendChild(errorDiv);

            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 8000);
        } catch (e) {}
    }
}

console.log('[App] 等待页面加载完成...');

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('[App] DOM 已加载，创建应用实例...');
        window.app = new FoodCalorieApp();
    } catch (error) {
        console.error('[App] 启动失败:', error);
        alert('应用启动失败，请刷新页面重试');
    }
});
